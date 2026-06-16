export const maxDuration = 120; // allow up to 120s for artifact generation (multiple LLM calls)

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createUserClient, getAdminClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { getAgentById } from '@/features/agents/data/agents';
import type { Agent } from '@/features/agents/types/agent.types';
import {
  patelSystemPrompt,
  susiSystemPrompt,
  mayaSystemPrompt,
  felixSystemPrompt,
  leoSystemPrompt,
  harperSystemPrompt,
  novaSystemPrompt,
  atlasSystemPrompt,
  sageSystemPrompt,
  carterSystemPrompt,
  rileySystemPrompt,
} from '@/features/agents';
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts';
import { ClaudeError } from '@/lib/claude';
import { llmChat, llmStream } from '@/lib/llm/provider';
import { routedText } from '@/lib/llm/router';
import { getToolsForAgent, delegateToAgentTool } from '@/lib/llm/tools';
import { runLoopTool, runExecTool, logToolExecution, fetchTavilyResearch } from '@/lib/agents/engine/tool-runner';
import { buildChatContext } from '@/lib/agents/engine/context-builder';
import { compactHistoryIfNeeded } from '@/lib/agents/compact';
import type { ContentBlock } from '@/lib/llm/types';
import { runCritiqueLoop } from '@/lib/agents/critique';
import { evaluateArtifactIndependently } from '@/lib/agents/patel-evaluator';
import { scoreFromArtifact } from '@/lib/qscore/artifact-scorer';
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal';
import {
  FF_ARTIFACT_SELF_CRITIQUE,
  FF_COORDINATOR_WORKFLOW,
  FF_STREAMING_CHAT,
} from '@/lib/feature-flags';
import {
  getStartupState,
  updateStartupState,
  extractStateFromArtifact,
} from '@/lib/agents/startup-state';
import { upsertAgentGoal } from '@/lib/agents/agent-goals';
import { log } from '@/lib/logger'
import { triggerProactiveDelegations } from '@/lib/agents/delegation';
import { GLOBAL_CONSTITUTION } from '@/lib/agents/constitution';
import * as Sentry from '@sentry/nextjs';
import { trackArtifactGenerated, trackAgentMessageSent } from '@/lib/analytics';
import { updatePatelIndicatorsFromArtifact } from '@/lib/agents/patel-indicator-updater';
import { persistChatTurn } from '@/lib/agents/engine/chat-persistence';

// ─── request schema ──────────────────────────────────────────────────────────
const chatRequestSchema = z.object({
  agentId:           z.string().min(1).max(64),
  message:           z.string().min(1).max(50000).refine(s => s.trim().length > 0, 'Message cannot be blank'),
  conversationHistory: z.array(
    z.object({ role: z.string(), content: z.string().max(50000) })
  ).max(100).optional(),
  userContext:       z.record(z.string(), z.unknown()).optional(),
  conversationId:    z.string().uuid().optional().nullable(),
  stream:            z.boolean().optional(),
  clientBuiltTypes:  z.array(z.string()).optional(),
})

// ─── dedicated system prompt registry ────────────────────────────────────────

const AGENT_SYSTEM_PROMPTS: Record<string, string> = {
  patel:  patelSystemPrompt,
  susi:   susiSystemPrompt,
  maya:   mayaSystemPrompt,
  felix:  felixSystemPrompt,
  leo:    leoSystemPrompt,
  harper: harperSystemPrompt,
  nova:   novaSystemPrompt,
  atlas:  atlasSystemPrompt,
  sage:   sageSystemPrompt,
  carter: carterSystemPrompt,
  riley:  rileySystemPrompt,
};

// ─── helpers ─────────────────────────────────────────────────────────────────

// atomicCheckAndIncrementUsage: locks subscription_usage row, checks limit,
// and increments in one DB round-trip (no TOCTOU race).
async function atomicCheckAndIncrementUsage(
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<{ allowed: boolean; remaining: number }> {
  const { data, error } = await supabaseAdmin.rpc('increment_usage_if_allowed', {
    p_user_id: userId,
    p_feature: 'agent_chat',
  }) as { data: Array<{ allowed: boolean; remaining: number; usage_id: string }> | null; error: unknown }

  if (error) throw error
  const row = data?.[0]
  if (!row) throw new Error('increment_usage_if_allowed returned no row')
  return { allowed: row.allowed, remaining: row.remaining }
}

// ─── GET: load conversation history ──────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '40', 10), 100)

    const supabase = await createUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ messages: [], conversationId: null })
    if (!agentId) return NextResponse.json({ messages: [], conversationId: null })

    // Find specific conversation or fall back to most recent
    const specificId = searchParams.get('conversationId')
    const convQuery = supabase
      .from('agent_conversations')
      .select('id')
      .eq('user_id', user.id)
      .eq('agent_id', agentId)
    const { data: conv } = specificId
      ? await convQuery.eq('id', specificId).single()
      : await convQuery.order('last_message_at', { ascending: false }).limit(1).single()

    if (!conv) return NextResponse.json({ messages: [], conversationId: null })

    // Load messages newest-first then reverse for chronological order
    const { data: rows } = await supabase
      .from('agent_messages')
      .select('role, content')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    const messages = (rows ?? []).reverse()
    return NextResponse.json({ messages, conversationId: conv.id })
  } catch {
    return NextResponse.json({ messages: [], conversationId: null })
  }
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = getAdminClient();

    // ── Server-side auth: never trust userId from the client body ──────────
    const userClient = await createUserClient();
    const { data: { user: authedUser } } = await userClient.auth.getUser();
    const userId: string | undefined = authedUser?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const parsed = chatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    const { agentId, message, conversationHistory, userContext, conversationId: existingConversationId, stream: wantStream, clientBuiltTypes } = parsed.data;

    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // ── Usage limit check (fail-open: never block chat if usage table has issues) ─
    // atomicCheckAndIncrementUsage checks AND increments in a single locked
    // DB transaction — no separate increment needed after the LLM call.
    if (userId) {
      try {
        const usage = await atomicCheckAndIncrementUsage(userId, supabaseAdmin);
        if (!usage.allowed) {
          return NextResponse.json({
            error: 'Monthly message limit reached',
            limitReached: true,
            remaining: 0,
          }, { status: 429 });
        }
      } catch {
        // Usage check failed (table missing, FK error, etc.) — allow the message through
        log.warn('Usage check failed — allowing message through');
      }
    }

    // ── Build enriched system prompt + load all context in parallel ─────────
    const baseSystemPrompt = GLOBAL_CONSTITUTION + '\n\n' + (AGENT_SYSTEM_PROMPTS[agentId] ?? buildAgentSystemPrompt(agent, userContext)) + '\n<<<CACHE_BREAK>>>'
    const {
      systemPrompt: systemPromptBuilt,
      patelRawScores,
      patelRawConfidence,
      startupState,
      sourcesUsed,
      compressionInfo,
    } = await buildChatContext({
      agentId, userId, message,
      existingConversationId,
      conversationHistory: conversationHistory as Array<{ role: string; content: string }> | undefined,
      baseSystemPrompt,
      supabase: supabaseAdmin,
    })
    const systemPrompt = systemPromptBuilt

    // Track every agent message — fire-and-forget, never block
    if (userId) {
      const isFirst = !conversationHistory || conversationHistory.length === 0
      void Promise.resolve().then(() => trackAgentMessageSent(userId, { agentId, isFirstMessage: isFirst }))
    }

    const CONVERSATION_RULES = `

CONVERSATION RULES:
- Write in short, separated paragraphs — 1 to 3 sentences each, then a blank line. Never write one long unbroken block of text.
- Ask ONE focused question per message. Put the question on its own line at the end, after a blank line.
- No **bold labels**, no header stamps, no rigid end-of-message templates in conversational replies. Use formatting (headers, lists, bold) only when delivering a framework or analysis the founder asked for.
- Be direct and sharp. Say one thing well, then stop.
- When a founder gives a vague answer, push for specifics: numbers, names, examples.
- If you don't know their specific situation, ask before advising.
- NEVER use these phrases: "Great question", "I'd be happy to", "Let me break this down", "Absolutely!", "Certainly!", "Of course!", "I understand your concern", "I hope this helps", "That's a great point". These are chatbot phrases. You are a specialist advisor, not a customer service bot.`;

    // Compact conversation history if it's grown too long.
    // compactHistoryIfNeeded summarises the oldest portion with Haiku rather than
    // silently dropping messages — key decisions, metrics, and artifacts are preserved.
    const { messages: compactedHistory, compacted: wasCompacted } =
      await compactHistoryIfNeeded(conversationHistory || [])

    const messages = [
      {
        role: "system" as const,
        content: systemPrompt + CONVERSATION_RULES,
      },
      ...compactedHistory.map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // ── Pass 1: LLM chat call with native tool calling ─────────────────────
    // Inject delegate_to_agent for all agents when coordinator workflow is enabled
    const agentTools = FF_COORDINATOR_WORKFLOW
      ? [...getToolsForAgent(agentId), delegateToAgentTool]
      : getToolsForAgent(agentId);

    // ── Shared observe-loop constants (used by both streaming + non-streaming) ─
    // Dynamic cap: complex requests (build/plan/research) get more tool turns
    function getMaxIterations(aid: string, msg: string): number {
      const isComplex = /\b(playbook|strategy|plan|research|build|create|generate|full|complete|everything|end.to.end|all|comprehensive)\b/i.test(msg);
      if (aid === 'sage' || aid === 'atlas') return isComplex ? 12 : 8;
      if (aid === 'patel') return isComplex ? 10 : 6;
      if (aid === 'felix' || aid === 'nova') return isComplex ? 8 : 5;
      return isComplex ? 7 : 5;
    }
    const MAX_ITERATIONS = getMaxIterations(agentId, message);
    const LOOP_TOOLS = new Set([
      'lead_enrich', 'web_research', 'apollo_search', 'posthog_query', 'calendly_link',
      'delegate_to_agent',
    ]);
    const EXEC_TOOLS = new Set([
      'send_outreach_sequence', 'initiate_voice_call', 'vapi_call', 'bulk_enrich_pipeline', 'schedule_followup', 'create_deal',
    ]);
    // These exec tools require explicit founder confirmation before firing.
    // The SSE stream emits approval_required and pauses — the client stores
    // the pending action in pending_actions and the founder approves from the UI.
    const APPROVAL_REQUIRED_TOOLS = new Set([
      'send_outreach_sequence', 'bulk_enrich_pipeline',
    ]);
    const TOOL_LABELS: Record<string, string> = {
      apollo_search:          'Searching Apollo for leads',
      posthog_query:          'Pulling analytics from PostHog',
      calendly_link:          'Generating booking link',
      lead_enrich:            'Enriching lead data',
      web_research:           'Researching the web',
      create_deal:            'Adding deal to pipeline',
      vapi_call:              'Initiating AI sales call',
      send_outreach_sequence: 'Sending outreach emails',
      bulk_enrich_pipeline:   'Enriching pipeline from Apollo',
      schedule_followup:      'Scheduling follow-up',
      delegate_to_agent:      'Consulting specialist agent',
    };

    // ── Patel prerequisite chain ───────────────────────────────────────────────
    // Migration 20260604000003 dropped the CHECK constraint — all artifact types
    // (including pains_gains_triggers, buyer_journey, positioning_messaging) now
    // save correctly. Chain remains gated on icp_document as the logical prerequisite.
    const PATEL_PREREQUISITE_CHAIN: Record<string, string[]> = {
      pains_gains_triggers:  ['icp_document'],
      buyer_journey:         ['icp_document'],
      positioning_messaging: ['icp_document'],
    }
    const PATEL_DELIVERABLE_NAMES: Record<string, string> = {
      icp_document:          'D1 ICP Definition',
      pains_gains_triggers:  'D2 Pains, Gains & Triggers',
      buyer_journey:         'D3 Buyer Journey',
      positioning_messaging: 'D4 Positioning & Messaging',
    }

    async function checkPatelPrerequisites(requestedType: string): Promise<string | null> {
      if (agentId !== 'patel' || !userId) return null
      const required = PATEL_PREREQUISITE_CHAIN[requestedType]
      if (!required || required.length === 0) return null
      const { data: existing } = await supabaseAdmin
        .from('agent_artifacts')
        .select('artifact_type')
        .eq('user_id', userId)
        .in('artifact_type', required)
      // clientBuiltTypes: defensive client-side tracking of built artifact types.
      // Echoed back in every request so prerequisites can be checked without a DB
      // round-trip. Works as a fast path alongside the DB query.
      const completed = new Set([
        ...(existing ?? []).map((r: { artifact_type: string }) => r.artifact_type),
        ...(clientBuiltTypes ?? []),
      ])
      const missing = required.filter(r => !completed.has(r))
      if (missing.length > 0) {
        const missingNames = missing.map(m => PATEL_DELIVERABLE_NAMES[m] ?? m).join(' and ')
        return `Before building ${PATEL_DELIVERABLE_NAMES[requestedType]}, you need to complete: ${missingNames}. Complete those first — each deliverable builds directly on the previous one.`
      }
      // GAP 4: D2 quality gate — ICP specificity must be ≥ 3 to ground the demand model.
      // Fail-open: if patelRawScores is unavailable (table missing or query failed),
      // allow D2 to proceed rather than permanently blocking it.
      if (requestedType === 'pains_gains_triggers') {
        const specificity = patelRawScores?.['icp.specificity']
        if (specificity !== undefined && specificity !== null && specificity < 3) {
          return `The ICP needs more precision before we can build the demand model. A generic ICP produces a generic pain map that won't drive real outreach.\n\nBefore D2: what's the specific job title, the exact company type, and the single constraint that makes this buyer act NOW? Sharpen that and I'll rebuild D1 first.`
        }
      }
      return null
    }

    async function generateArtifactJSON(prompt: string, maxTokens = 5000): Promise<Record<string, unknown>> {
      const raw = await routedText('generation', [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Generate the deliverable now. Return ONLY valid JSON, no markdown fences, no explanation text.' },
      ], { maxTokens });
      const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      try {
        return JSON.parse(clean);
      } catch {
        const match = clean.match(/\{[\s\S]*\}/);
        if (match) {
          try { return JSON.parse(match[0]); } catch { /* fall through */ }
        }
        return { raw_output: clean, _parse_error: true };
      }
    }

    // ── SSE streaming path — full observe loop with tool activity events ───────
    if (wantStream && FF_STREAMING_CHAT) {
      const enc = new TextEncoder();
      const sseStream = new ReadableStream({
        async start(controller) {
          const send = (event: Record<string, unknown>) =>
            controller.enqueue(enc.encode(`data: ${JSON.stringify(event)}\n\n`));

          if (sourcesUsed.length > 0) send({ type: 'sources_used', sources: sourcesUsed });
          if (compressionInfo.applied) send({ type: 'context_compressed', droppedCount: compressionInfo.droppedCount });
          if (wasCompacted) send({ type: 'context_compressed', droppedCount: 0 });

          let loopMessages = [...messages] as Array<{ role: string; content: string | ContentBlock[] }>;
          let chatReply = '';
          let streamArtifactId: string | null = null;

          // Loop exit state tracking (A1)
          type LoopExit = 'clean' | 'exec_break' | 'artifact_break' | 'max_iter_unresolved'
          let loopState: LoopExit = 'clean'
          let lastToolCallName: string | null = null
          let lastToolCallExecuted = false

          try {
            for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
              let streamedToolCall: import('@/lib/llm/types').ToolCallResult | null = null;
              let iterText = '';

              // Stream this iteration's LLM response
              try {
                for await (const chunk of llmStream({
                  messages: loopMessages, maxTokens: agentTools.length > 0 ? 4000 : 900, temperature: 0.7,
                  tools: agentTools.length > 0 ? agentTools : undefined,
                  modelTier: 'capable',
                })) {
                  if (chunk.type === 'delta') {
                    send({ type: 'delta', text: chunk.text });
                    iterText += chunk.text;
                  } else if (chunk.type === 'done') {
                    streamedToolCall = chunk.toolCall;
                  }
                }
              } catch (err) {
                send({ type: 'error', message: err instanceof Error ? err.message : 'Stream failed' });
                controller.close();
                return;
              }

              // No tool call → final response, exit loop
              if (!streamedToolCall) { chatReply = iterText; break; }

              const toolName = streamedToolCall.name;
              const toolArgs = streamedToolCall.args;
              const toolCtx: Record<string, unknown> = LOOP_TOOLS.has(toolName)
                ? toolArgs
                : (toolArgs.context as Record<string, unknown>) ?? toolArgs;

              // Track that we've seen a tool call but haven't executed it yet
              lastToolCallName = toolName
              lastToolCallExecuted = false

              if (LOOP_TOOLS.has(toolName)) {
                send({ type: 'tool_start', toolName, label: TOOL_LABELS[toolName] ?? toolName });
                let toolResult = '';
                const t0 = Date.now();
                // A3: heartbeat to keep SSE alive during slow external API calls (10–15s each)
                const loopToolHeartbeat = setInterval(() => {
                  try { controller.enqueue(enc.encode(': ping\n\n')); }
                  catch (e) {
                    if (e instanceof TypeError) clearInterval(loopToolHeartbeat)
                    else log.warn('heartbeat_enqueue_error', { error: (e as Error).message })
                  }
                }, 8_000);
                try {
                  toolResult = await runLoopTool(toolName, toolCtx, { userId, supabaseAdmin, agentId, existingConversationId });
                  logToolExecution(supabaseAdmin, userId, agentId, toolName, t0, 'success');
                } catch (err) {
                  toolResult = `Tool failed: ${err instanceof Error ? err.message : 'unknown'}`;
                  logToolExecution(supabaseAdmin, userId, agentId, toolName, t0, 'error', toolResult);
                }
                clearInterval(loopToolHeartbeat)
                lastToolCallExecuted = true
                send({ type: 'tool_done', toolName, summary: toolResult.split('\n')[0].slice(0, 100) });
                // Use proper tool_result content blocks so Claude has full tool_use/tool_result pairing
                const toolCallId = streamedToolCall.id
                const assistantContent: ContentBlock[] = []
                if (iterText) assistantContent.push({ type: 'text', text: iterText })
                assistantContent.push({ type: 'tool_use', id: toolCallId, name: toolName, input: toolArgs })
                loopMessages = [
                  ...loopMessages,
                  { role: 'assistant' as const, content: assistantContent },
                  { role: 'user' as const, content: [{ type: 'tool_result', tool_use_id: toolCallId, content: toolResult }] },
                ];
                continue;

              } else if (EXEC_TOOLS.has(toolName)) {
                // Gate destructive actions behind founder approval
                if (APPROVAL_REQUIRED_TOOLS.has(toolName) && userId) {
                  try {
                    await supabaseAdmin.from('pending_actions').insert({
                      user_id:     userId,
                      agent_id:    agentId,
                      action_type: toolName,
                      payload:     toolCtx,
                      status:      'pending',
                    })
                  } catch { /* non-blocking — approval_required still fires */ }
                  send({
                    type:       'approval_required',
                    toolName,
                    label:      TOOL_LABELS[toolName] ?? toolName,
                    preview:    toolCtx,
                  } as Parameters<typeof send>[0])
                  send({ type: 'delta', text: `\n\nI've prepared the ${TOOL_LABELS[toolName]?.toLowerCase() ?? toolName} action and it's waiting for your approval. You can review and confirm it in the actions panel.` })
                  loopState = 'exec_break'
                  break
                }

                send({ type: 'tool_start', toolName, label: TOOL_LABELS[toolName] ?? toolName });
                try {
                  const execResult = await runExecTool(toolName, toolCtx, { userId, supabaseAdmin, agentId, existingConversationId });
                  lastToolCallExecuted = true
                  send({ type: 'tool_done', toolName, summary: execResult.slice(0, 100) });
                  send({ type: 'delta', text: `\n\n${execResult}` });
                } catch (err) { log.error(`${toolName} streaming:`, err); }
                loopState = 'exec_break'
                break;

              } else {
                // Artifact tool — check Patel prerequisites first
                const prereqError = await checkPatelPrerequisites(toolName)
                if (prereqError) {
                  send({ type: 'delta', text: prereqError })
                  break
                }

                const toolLabel = toolCtx.type as string || toolName;
                send({ type: 'tool_start', toolName, label: `Building ${toolLabel.replace(/_/g, ' ')}…` });
                const t0A = Date.now();
                // Send heartbeat every 10s to keep SSE connection alive during long LLM calls
                const heartbeat = setInterval(() => {
                  try { controller.enqueue(enc.encode(': ping\n\n')); } catch { /* stream closed */ }
                }, 10_000);
                try {
                  let researchData: Record<string, unknown> | null = null;
                  if (toolName === 'battle_card') {
                    const c = (toolCtx.competitor as string) || ''; const p = (toolCtx.ourProduct as string) || '';
                    if (c) researchData = await fetchTavilyResearch(`${c} product pricing features reviews vs ${p}`);
                  } else if (toolName === 'competitive_matrix') {
                    const cs = (toolCtx.competitors as string[]) || []; const p = (toolCtx.product as string) || '';
                    if (cs.length > 0) researchData = await fetchTavilyResearch(`${cs.slice(0, 3).join(' vs ')} competitive analysis ${p}`);
                  }
                  const artifactPrompt = getArtifactPrompt(toolName, toolCtx, researchData, patelRawScores, patelRawConfidence);
                  const parsedContent = await generateArtifactJSON(artifactPrompt, toolName === 'gtm_playbook' ? 7000 : 5000);
                  const artifactTitle = parsedContent.title as string || toolName.replace(/_/g, ' ');
                  let artifactId: string | null = null;
                  if (userId) {
                    const icpIdFromContent = toolName === 'icp_document' ? (parsedContent.icp_id as string | undefined) ?? null : null

                    // Check for existing version of same artifact type in this conversation
                    let nextVersion = 1
                    let resolvedIcpId: string | null = icpIdFromContent
                    if (existingConversationId) {
                      const { data: prev } = await supabaseAdmin
                        .from('agent_artifacts')
                        .select('version, icp_id')
                        .eq('conversation_id', existingConversationId)
                        .eq('artifact_type', toolName)
                        .order('version', { ascending: false })
                        .limit(1)
                        .maybeSingle()
                      if (prev) {
                        nextVersion = (prev.version ?? 1) + 1
                        if (prev.icp_id) resolvedIcpId = prev.icp_id
                      }
                    }

                    const baseInsert = {
                      conversation_id: existingConversationId ?? null,
                      user_id: userId, agent_id: agentId,
                      artifact_type: toolName, title: artifactTitle,
                      content: parsedContent, version: nextVersion,
                    }
                    let { data: saved, error: saveErr } = await supabaseAdmin
                      .from('agent_artifacts')
                      .insert({ ...baseInsert, ...(resolvedIcpId ? { icp_id: resolvedIcpId } : {}) })
                      .select('id').single();
                    // Retry without icp_id if column not yet migrated on remote DB
                    if (saveErr && resolvedIcpId) {
                      log.warn('artifact insert with icp_id failed, retrying without:', saveErr.message);
                      ({ data: saved, error: saveErr } = await supabaseAdmin.from('agent_artifacts').insert(baseInsert).select('id').single());
                    }
                    if (saveErr) {
                      log.error('artifact insert failed:', { message: saveErr.message, code: saveErr.code });
                      log.error('[artifact] DB save failed', { toolName, code: saveErr.code, message: saveErr.message, userId });
                      send({ type: 'debug_db_error', message: saveErr.message, code: saveErr.code, toolName });
                      // §PATEL_BUILT fallback removed — migration 20260604000003 drops the CHECK constraint
                      // that caused code 23514 failures. All artifact types now save correctly.
                    }
                    artifactId = saved?.id ?? null;
                    streamArtifactId = artifactId;
                  }
                  if (artifactId && userId) void scoreFromArtifact(userId, toolName, parsedContent, supabaseAdmin).catch(() => { /* fire-and-forget: non-critical */ });
                  if (artifactId && userId) void Promise.resolve().then(() => trackArtifactGenerated(userId, { agentId, artifactType: toolName }));
                  // Quality evaluator and self-critique run in background — don't block showing the artifact
                  if (artifactId && userId) {
                    void (async () => {
                      try {
                        const ev = await evaluateArtifactIndependently(toolName, parsedContent);
                        if (ev.qualityScore < 70 && ev.gaps.length > 0) {
                          const improved = await generateArtifactJSON(artifactPrompt + `\n\nFix: ${ev.gaps.slice(0, 3).join('; ')}. Return ONLY JSON.`);
                          await supabaseAdmin.from('agent_artifacts').update({ content: improved }).eq('id', artifactId!);
                        }
                      } catch { /* non-critical */ }
                    })();
                  }
                  if (FF_ARTIFACT_SELF_CRITIQUE && artifactId && userId) {
                    void (async () => {
                      try {
                        const { content: fc, critique, passesRun } = await runCritiqueLoop(toolName, parsedContent, 3);
                        await supabaseAdmin.from('agent_artifacts').update({ content: fc, critique_metadata: critique }).eq('id', artifactId!);
                        // Notify client if the artifact was actually improved beyond pass 1
                        if (passesRun > 1 || critique.needsPatch) {
                          try { send({ type: 'artifact_improved', artifactId, passesRun, overallRating: critique.overallRating }); } catch { /* stream closed */ }
                        }
                      } catch (err) {
                        log.warn('[critique] self-critique failed', { artifactId, err: (err as Error)?.message });
                      }
                    })();
                  }
                  // Write extracted facts to world model + refresh goal + trigger delegations
                  if (userId) {
                    const stateUpdates = extractStateFromArtifact(agentId, toolName, parsedContent);
                    if (Object.keys(stateUpdates).length > 0) {
                      void (async () => {
                        try {
                          await updateStartupState(userId, stateUpdates, agentId, supabaseAdmin);
                          const freshState = await getStartupState(userId, supabaseAdmin);
                          if (freshState) await upsertAgentGoal(agentId, userId, freshState, supabaseAdmin);
                          await triggerProactiveDelegations(agentId, userId, startupState, stateUpdates, supabaseAdmin);
                        } catch (err) {
                          log.warn('[state] startup state update chain failed', { userId, agentId, err: (err as Error)?.message });
                        }
                      })();
                    }
                  }
                  clearInterval(heartbeat);
                  logToolExecution(supabaseAdmin, userId, agentId, toolName, t0A, 'success', undefined, 'standard');
                  if (!artifactId) {
                    // DB insert failed — don't send a null-ID artifact card to the client.
                    // The debug_db_error SSE already fired above with the exact error.
                    log.error('Suppressing artifact SSE — artifactId is null after retries', { toolName, userId })
                    send({ type: 'tool_done', toolName, summary: `${artifactTitle} was generated but could not be saved. Please try again.` });
                  } else {
                  // Send artifact to client immediately — no longer gated behind the score signal.
                  send({ type: 'artifact', artifact: { id: artifactId, type: toolName, title: artifactTitle, content: parsedContent } });
                  send({ type: 'tool_done', toolName, summary: `${artifactTitle} ready` });
                  }
                  // Score signal fires in background; SSE send is best-effort (stream may already be done).
                  if (artifactId && userId) {
                    void applyAgentScoreSignal(supabaseAdmin, userId, toolName).then(sig => {
                      if (sig.boosted) {
                        try { send({ type: 'score_signal', boosted: true, points: sig.pointsAdded, dimension: sig.dimensionLabel, newScore: sig.newOverall }); } catch { /* stream already closed */ }
                      }
                    }).catch(() => { /* non-critical */ });
                    // Update Patel 20-indicator scores from the artifact content — fire-and-forget
                    if (agentId === 'patel') {
                      void updatePatelIndicatorsFromArtifact(userId, toolName, parsedContent, supabaseAdmin).catch(() => { /* non-critical */ });
                    }
                  }
                  // Stream a brief Patel commentary so chatReply is never empty
                  // For D1: ask the P1.4/P1.5 diagnostic questions if they're still unscored
                  try {
                    const needsIterationQ = agentId === 'patel' && !patelRawScores?.['icp.iteration']
                    const needsTeamQ = agentId === 'patel' && !patelRawScores?.['icp.team_alignment']
                    const commentaryContent = (toolName === 'icp_document' && (needsIterationQ || needsTeamQ))
                      ? `You are ${agent.name}. You just built "${artifactTitle}". Write 2 sentences: (1) name the primary persona and the ONE thing that makes them convert, (2) ask: "Two quick checks before the demand model — has your team seen this ICP, and have you tested it with any outbound yet, even informally?" Max 60 words. No fluff.`
                      : `You are ${agent.name}, a specialist advisor. You just built "${artifactTitle}" for this founder. Write exactly 2 sentences: one confirming the single most important finding from what was built, one stating the specific next action. Be direct and specific — reference the actual content. Max 50 words. No fluff phrases.`
                    const commentary = await routedText('generation', [
                      { role: 'system', content: commentaryContent },
                      { role: 'user', content: 'Summarise what was just built and the immediate next step.' },
                    ], { maxTokens: 120 });
                    if (commentary.trim()) {
                      send({ type: 'delta', text: commentary });
                      chatReply = commentary;
                    }
                  } catch { /* commentary is non-critical */ }
                } catch (err) {
                  clearInterval(heartbeat);
                  log.error('Artifact streaming error:', err);
                  send({ type: 'tool_done', toolName, summary: 'Generation failed' });
                }
                lastToolCallExecuted = true
                loopState = 'artifact_break'
                break;
              }
            }

            // A1: detect unresolved tool call at loop limit — emit fallback instead of silent blank
            if (loopState === 'clean' && lastToolCallName !== null && !lastToolCallExecuted) {
              loopState = 'max_iter_unresolved'
              const fallback = "\n\nI hit the limit on that — let me know which part to focus on and I'll go deeper there."
              send({ type: 'delta', text: fallback })
              chatReply += fallback
            }
          } catch (err) {
            send({ type: 'error', message: err instanceof Error ? err.message : 'Unexpected error' });
          }

          // ── Persist conversation + messages before sending done ────────────────
          let finalConversationId = existingConversationId ?? null;
          if (userId) {
            finalConversationId = await persistChatTurn({
              userId, agentId, message, chatReply: chatReply ?? '',
              existingConversationId, conversationHistory,
              artifactId: streamArtifactId, patelRawScores,
              supabase: supabaseAdmin,
              onPersistError: (cid) => send({ type: 'persist_error', conversationId: cid }),
            });
          }

          send({ type: 'done', agentId, conversationId: finalConversationId });
          controller.close();
        },
      });

      return new Response(sseStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    let loopMessages = [...messages] as Array<{ role: string; content: string | ContentBlock[] }>;
    let chatReply: string | undefined;
    let artifact = null;

    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      const llmResponse = await llmChat({
        messages: loopMessages,
        maxTokens: agentTools.length > 0 ? 4000 : 900,
        temperature: 0.7,
        tools: agentTools.length > 0 ? agentTools : undefined,
        modelTier: 'capable',
      });

      if (!llmResponse.text && !llmResponse.toolCall) throw new Error('No response from AI');

      // No tool call — this is the final text response, exit loop
      if (!llmResponse.toolCall) {
        chatReply = llmResponse.text ?? '';
        break;
      }

      const toolName = llmResponse.toolCall.name;
      const toolArgs = llmResponse.toolCall.args;
      const isDataTool = LOOP_TOOLS.has(toolName);
      const toolCtx: Record<string, unknown> = isDataTool
        ? toolArgs
        : (toolArgs.context as Record<string, unknown>) ?? toolArgs;

      // ── Data tools: execute → re-inject result → continue loop ────────
      if (LOOP_TOOLS.has(toolName)) {
        let toolResult = '';
        const t0 = Date.now();
        try {
          toolResult = await runLoopTool(toolName, toolCtx, { userId, supabaseAdmin, agentId, existingConversationId });
          logToolExecution(supabaseAdmin, userId, agentId, toolName, t0, 'success');
        } catch (err) {
          toolResult = `Tool failed: ${err instanceof Error ? err.message : 'unknown error'}`;
          logToolExecution(supabaseAdmin, userId, agentId, toolName, t0, 'error', toolResult);
        }

        // Capture any partial text the LLM emitted before the tool call
        if (llmResponse.text) chatReply = (chatReply ?? '') + llmResponse.text + '\n\n';

        // Re-inject tool result using proper tool_use/tool_result content blocks
        const nonStreamToolId = llmResponse.toolCall.id
        const nonStreamAssistantContent: ContentBlock[] = []
        if (llmResponse.text) nonStreamAssistantContent.push({ type: 'text', text: llmResponse.text })
        nonStreamAssistantContent.push({ type: 'tool_use', id: nonStreamToolId, name: toolName, input: toolArgs })
        loopMessages = [
          ...loopMessages,
          { role: 'assistant' as const, content: nonStreamAssistantContent },
          { role: 'user' as const, content: [{ type: 'tool_result', tool_use_id: nonStreamToolId, content: toolResult }] },
        ];
        continue; // loop — LLM will see the result and reason again
      }

      // ── Execution tools: execute action and break ────────────────────
      if (EXEC_TOOLS.has(toolName)) {
        const t0Exec = Date.now();
        try {
          const execResult = await runExecTool(toolName, toolCtx, { userId, supabaseAdmin, agentId, existingConversationId });
          logToolExecution(supabaseAdmin, userId, agentId, toolName, t0Exec, 'success');
          chatReply = llmResponse.text ? `${llmResponse.text}\n\n${execResult}` : execResult;
        } catch (err) {
          log.error(`${toolName} failed:`, err);
          chatReply = llmResponse.text ?? '';
        }
        break;
      }

      // ── Artifact-generating tools — run pipeline and break ─────────────
      const t0Artifact = Date.now();
      try {
        let researchData: Record<string, unknown> | null = null;
        if (toolName === 'battle_card') {
          const competitor = (toolCtx.competitor as string) || '';
          const product    = (toolCtx.ourProduct as string) || '';
          if (competitor) researchData = await fetchTavilyResearch(
            `${competitor} company product pricing features reviews competitors vs ${product}`
          );
        } else if (toolName === 'competitive_matrix') {
          const competitors = (toolCtx.competitors as string[]) || [];
          const product     = (toolCtx.product as string) || '';
          if (competitors.length > 0) researchData = await fetchTavilyResearch(
            `${competitors.slice(0, 3).join(' vs ')} competitive analysis pricing features market position ${product}`
          );
        }

        const artifactPrompt = getArtifactPrompt(toolName, toolCtx, researchData, patelRawScores, patelRawConfidence);
        const parsedContent = await generateArtifactJSON(artifactPrompt, toolName === 'gtm_playbook' ? 7000 : 5000);
        const artifactTitle = parsedContent.title as string || toolName.replace(/_/g, ' ');

        let artifactId: string | null = null;
        if (userId) {
          const icpIdVal = toolName === 'icp_document' ? (parsedContent.icp_id as string | undefined) ?? null : null
          const baseInsert = { conversation_id: existingConversationId ?? null, user_id: userId, agent_id: agentId, artifact_type: toolName, title: artifactTitle, content: parsedContent }
          let { data: saved, error: saveErr } = await supabaseAdmin.from('agent_artifacts').insert({ ...baseInsert, ...(icpIdVal ? { icp_id: icpIdVal } : {}) }).select('id').single();
          // Retry without icp_id if column not yet migrated on remote DB
          if (saveErr && icpIdVal) {
            log.warn('artifact insert with icp_id failed, retrying without:', saveErr.message);
            ({ data: saved, error: saveErr } = await supabaseAdmin.from('agent_artifacts').insert(baseInsert).select('id').single());
          }
          if (saveErr) log.error('artifact insert failed:', { message: saveErr.message, code: saveErr.code });
          artifactId = saved?.id ?? null;
        }
        // Quality evaluator runs in background — don't block the response
        if (artifactId) {
          void (async () => {
            try {
              const ev = await evaluateArtifactIndependently(toolName, parsedContent);
              if (ev.qualityScore < 70 && ev.gaps.length > 0) {
                const improvedPrompt = artifactPrompt + `\n\nFix: ${ev.gaps.slice(0, 3).join('; ')}. Return ONLY JSON.`;
                const improved = await generateArtifactJSON(improvedPrompt);
                await supabaseAdmin.from('agent_artifacts').update({ content: improved }).eq('id', artifactId!);
              }
            } catch { /* non-critical */ }
          })();
        }

        if (artifactId && userId) {
          void Promise.resolve().then(() => trackArtifactGenerated(userId, { agentId, artifactType: toolName }));
          // Q-Score boost — fire-and-forget so it doesn't block returning the artifact
          void applyAgentScoreSignal(supabaseAdmin, userId, toolName).catch(() => { /* non-critical */ });
          void scoreFromArtifact(userId, toolName, parsedContent, supabaseAdmin).catch(() => { /* fire-and-forget: non-critical score nudge */ });
          // Update Patel 20-indicator scores from the artifact content — fire-and-forget
          if (agentId === 'patel') {
            void updatePatelIndicatorsFromArtifact(userId, toolName, parsedContent, supabaseAdmin).catch(() => { /* non-critical */ });
          }
          // Write extracted facts to world model + refresh goal + trigger delegations
          const stateUpdates = extractStateFromArtifact(agentId, toolName, parsedContent);
          if (Object.keys(stateUpdates).length > 0) {
            void (async () => {
              try {
                await updateStartupState(userId, stateUpdates, agentId, supabaseAdmin);
                const freshState = await getStartupState(userId, supabaseAdmin);
                if (freshState) await upsertAgentGoal(agentId, userId, freshState, supabaseAdmin);
                await triggerProactiveDelegations(agentId, userId, startupState, stateUpdates, supabaseAdmin);
              } catch (err) {
                log.warn('[state] startup state update chain failed', { userId, agentId, err: (err as Error)?.message });
              }
            })();
          }
        }

        if (FF_ARTIFACT_SELF_CRITIQUE && artifactId && userId) {
          void (async () => {
            try {
              const { content: finalContent, critique, passesRun } = await runCritiqueLoop(toolName, parsedContent, 3);
              await supabaseAdmin.from('agent_artifacts').update({
                content: finalContent, critique_metadata: critique,
              }).eq('id', artifactId!);
              if (passesRun > 1 || critique.needsPatch) {
                log.info('[critique] artifact improved', { artifactId, passesRun, overallRating: critique.overallRating });
              }
            } catch (err) {
              log.warn('[critique] self-critique failed (non-streaming)', { artifactId, err: (err as Error)?.message });
            }
          })();
        }

        artifact = { id: artifactId, type: toolName, title: artifactTitle, content: parsedContent };
        chatReply = llmResponse.text ?? '';
        logToolExecution(supabaseAdmin, userId, agentId, toolName, t0Artifact, 'success', undefined, 'standard');
      } catch (err) {
        log.error('Artifact generation error:', err);
        chatReply = llmResponse.text ?? '';
      }
      break; // artifact tools always terminate the loop
    }

    if (!chatReply) chatReply = '';

    // ── Persist messages to DB (fail-open — DB issues never break the response) ─
    let conversationId = existingConversationId ?? null;
    if (userId) {
      conversationId = await persistChatTurn({
        userId, agentId, message, chatReply: chatReply ?? '',
        existingConversationId, conversationHistory,
        artifactId: artifact?.id ?? null, patelRawScores,
        supabase: supabaseAdmin,
        onPersistError: (cid) => log.error('[chat] message persistence failed (non-streaming)', { userId, agentId, conversationId: cid }),
      });
    }

    return NextResponse.json({
      content: chatReply,
      agentId,
      conversationId,
      timestamp: new Date().toISOString(),
      ...(artifact ? { artifact } : {}),
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    log.error('Agent chat error: ' + errMsg, error);
    Sentry.captureException(error);

    let userMessage: string;
    let httpStatus = 500;

    if (error instanceof ClaudeError) {
      if (error.isTimeout) {
        userMessage = "The AI took too long to respond. Please try again — shorter messages tend to be faster.";
        httpStatus = 504;
      } else if (error.statusCode === 429) {
        userMessage = "The AI service is currently busy. Please wait a moment and try again.";
        httpStatus = 429;
      } else if (error.statusCode === 402) {
        userMessage = "The AI service is temporarily unavailable due to account credits. The team has been notified. Please try again shortly.";
      } else {
        userMessage = "I'm having trouble connecting to the AI right now. Please try again in a moment.";
      }
    } else {
      const isCredits = errMsg.includes('insufficient credits') || errMsg.includes('Payment Required');
      userMessage = isCredits
        ? "The AI service is temporarily unavailable due to account credits. The team has been notified. Please try again shortly."
        : "I apologize, but I'm having trouble connecting right now. Please try again in a moment.";
    }

    return NextResponse.json({
      response: userMessage,
      agentId: '',
      timestamp: new Date().toISOString(),
      error: true,
      ...(process.env.NODE_ENV === 'development' ? { errorDetail: errMsg } : {}),
    }, { status: httpStatus });
  }
}

/**
 * Build specialized system prompt based on agent expertise and user context
 */
function buildAgentSystemPrompt(agent: Agent, userContext?: Record<string, unknown>): string {
  let contextSection = '';
  if (userContext) {
    contextSection = `\n\n**FOUNDER'S BUSINESS CONTEXT:**\n`;

    if (userContext.startupName) contextSection += `Startup: ${userContext.startupName}\n`;
    if (userContext.industry) contextSection += `Industry: ${userContext.industry}\n`;
    if (userContext.stage) contextSection += `Stage: ${userContext.stage}\n`;
    if (userContext.description) contextSection += `Business Description: ${userContext.description}\n`;

    if (userContext.assessment) {
      const assessment = userContext.assessment as Record<string, unknown>;
      const financial = assessment.financial as Record<string, number> | undefined;

      if (assessment.totalMarketSize) contextSection += `TAM: $${((assessment.totalMarketSize as number) / 1000000).toFixed(0)}M\n`;
      if (assessment.payingCustomers !== undefined) contextSection += `Paying Customers: ${assessment.payingCustomers}\n`;
      if (assessment.icpDescription) contextSection += `ICP: ${assessment.icpDescription}\n`;
      if (financial?.mrr) contextSection += `MRR: $${financial.mrr.toLocaleString()}\n`;
      if (financial?.monthlyBurn) contextSection += `Monthly Burn: $${financial.monthlyBurn.toLocaleString()}\n`;
      if (assessment.teamSize) contextSection += `Team Size: ${assessment.teamSize}\n`;
      if (assessment.founderStory) contextSection += `Founder Background: ${assessment.founderStory}\n`;
    }

    contextSection += `\n**IMPORTANT:** Use this context to give highly specific, personalized advice. Reference their actual business details, numbers, and situation. Don't give generic advice - make it actionable for THEIR specific business.\n`;
  }

  const basePrompt = `You are ${agent.name}, an expert AI advisor specializing in ${agent.specialty}.

Your personality:
- Direct and actionable - give specific, tactical advice
- Framework-driven - teach reusable mental models
- Data-informed - reference real metrics and benchmarks
- Empathetic but honest - supportive yet realistic about challenges

Your expertise focuses on helping early-stage startup founders with ${agent.specialty.toLowerCase()}.${contextSection}`;

  const specialtyContext: Record<string, string> = {
    'patel': `
You help founders:
- Define their Ideal Customer Profile (ICP) with precision
- Build repeatable go-to-market playbooks
- Test and optimize acquisition channels
- Calculate and improve Customer Acquisition Cost (CAC)
- Design GTM experiments and measure results`,

    'susi': `
You help founders:
- Build repeatable sales processes from scratch
- Qualify leads effectively (BANT, MEDDIC)
- Design outbound sequences that convert
- Handle objections and close deals
- Scale from founder-led sales to a sales team`,

    'maya': `
You help founders:
- Craft compelling brand narratives and positioning
- Build content strategies that generate demand
- Develop thought leadership on LinkedIn/Twitter
- Create content calendars and distribution plans
- Measure content ROI and iterate`,

    'felix': `
You help founders:
- Build financial models (3-statement, unit economics)
- Track key SaaS metrics (MRR, ARR, churn, LTV:CAC)
- Forecast revenue growth and burn rate
- Make data-driven decisions about fundraising vs bootstrapping
- Present financials to investors`,

    'leo': `
You help founders:
- Choose the right legal entity structure (C-Corp, LLC)
- Protect intellectual property (patents, trademarks, trade secrets)
- Draft founder agreements and equity splits
- Navigate compliance and regulations
- Review contracts (customer, vendor, employment)`,

    'harper': `
You help founders:
- Hire the right people at the right time
- Structure compensation (salary, equity, benefits)
- Build strong company culture from day one
- Design hiring processes that attract A-players
- Manage performance and give feedback`,

    'nova': `
You help founders:
- Find and validate product-market fit
- Prioritize features and build roadmaps
- Design customer validation experiments
- Measure PMF signals (retention, NPS, growth)
- Decide when to pivot vs persevere`,

    'atlas': `
You help founders:
- Map competitive landscape and identify gaps
- Develop unique positioning and differentiation
- Research market trends and opportunities
- Analyze competitor strategies (pricing, GTM, product)
- Find unfair advantages`,

    'sage': `
You help founders:
- Build 12-month strategic roadmaps
- Set and track OKRs (Objectives and Key Results)
- Evaluate big decisions (build vs buy, expand, pivot)
- Think long-term (3-5 year vision)
- Prepare for fundraising milestones`
  };

  return `${basePrompt}\n\n${specialtyContext[agent.id] || ''}

Important guidelines:
- Keep responses concise but actionable (200-400 words)
- Use bullet points and formatting for clarity
- Ask clarifying questions when needed
- Reference specific metrics, benchmarks, and examples
- End with a clear next step or question to continue the conversation

Remember: You're not just answering questions - you're teaching founders how to think about ${agent.specialty.toLowerCase()}.`;
}
