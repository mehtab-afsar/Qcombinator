import { NextRequest, NextResponse } from 'next/server';
import { createClient as createUserClient } from '@/lib/supabase/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
} from '@/features/agents';
import { getArtifactPrompt } from '@/features/agents/patel/prompts/artifact-prompts';
import { callOpenRouter as sharedCallOpenRouter, OpenRouterError } from '@/lib/openrouter';
import { llmChat } from '@/lib/llm/provider';
import { getToolsForAgent } from '@/lib/llm/tools';
import { executeTool } from '@/lib/tools/executor';
import { getAgentContext, formatContextForPrompt } from '@/lib/agents/context';

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
};

// ─── helpers ─────────────────────────────────────────────────────────────────

// Fire-and-forget tool execution logger
function logToolExecution(
  supabaseAdmin: SupabaseClient,
  userId: string | undefined,
  agentId: string,
  toolName: string,
  startMs: number,
  status: 'success' | 'error' | 'timeout',
  errorMsg?: string
) {
  void supabaseAdmin.from('tool_execution_logs').insert({
    user_id:    userId ?? null,
    agent_id:   agentId,
    tool_name:  toolName,
    status,
    latency_ms: Date.now() - startMs,
    error_msg:  errorMsg ?? null,
  });
}

// Thin wrapper — delegates to shared lib (timeout + 429 retry + typed errors)
async function callOpenRouter(
  messages: Array<{ role: string; content: string }>,
  maxTokens: number = 500,
  temperature: number = 0.7
): Promise<string> {
  return sharedCallOpenRouter(
    messages as import('@/lib/openrouter').OpenRouterMessage[],
    { maxTokens, temperature }
  );
}


async function fetchTavilyResearch(query: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    console.warn('TAVILY_API_KEY not configured — skipping research');
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        max_results: 8,
        include_answer: true,
        include_raw_content: false,
      }),
    });
    clearTimeout(timer);

    if (!response.ok) {
      console.error('Tavily error:', response.statusText);
      return null;
    }

    const data = await response.json();
    return {
      answer: data.answer ?? null,
      results: (data.results || []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title,
        url: r.url,
        snippet: r.content?.slice(0, 400),
      })),
    };
  } catch (err) {
    console.error('Tavily fetch error:', err);
    return null;
  }
}

// ─── usage limits ────────────────────────────────────────────────────────────

const AGENT_CHAT_MONTHLY_LIMIT = 50;

interface UsageRow {
  id: string;
  usage_count: number;
  limit_count: number | null;
  reset_at: string | null;
}

async function checkUsageAllowed(
  userId: string,
  supabaseAdmin: SupabaseClient
): Promise<{ allowed: boolean; remaining: number; usageId: string | null }> {
  const { data: row } = await supabaseAdmin
    .from('subscription_usage')
    .select('id, usage_count, limit_count, reset_at')
    .eq('user_id', userId)
    .eq('feature', 'agent_chat')
    .single() as { data: UsageRow | null };

  // No row yet — create one with default monthly limit
  if (!row) {
    const resetAt = new Date();
    resetAt.setMonth(resetAt.getMonth() + 1);
    resetAt.setDate(1);
    resetAt.setHours(0, 0, 0, 0);

    const { data: inserted } = await supabaseAdmin
      .from('subscription_usage')
      .insert({
        user_id: userId,
        feature: 'agent_chat',
        usage_count: 0,
        limit_count: AGENT_CHAT_MONTHLY_LIMIT,
        reset_at: resetAt.toISOString(),
      })
      .select('id')
      .single();

    return { allowed: true, remaining: AGENT_CHAT_MONTHLY_LIMIT, usageId: (inserted as { id: string } | null)?.id ?? null };
  }

  // Check if reset window has passed
  if (row.reset_at && new Date(row.reset_at) <= new Date()) {
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);
    nextReset.setDate(1);
    nextReset.setHours(0, 0, 0, 0);

    await supabaseAdmin
      .from('subscription_usage')
      .update({ usage_count: 0, reset_at: nextReset.toISOString() })
      .eq('id', row.id);

    const limit = row.limit_count ?? AGENT_CHAT_MONTHLY_LIMIT;
    return { allowed: true, remaining: limit, usageId: row.id };
  }

  const limit = row.limit_count ?? AGENT_CHAT_MONTHLY_LIMIT;
  const remaining = Math.max(0, limit - row.usage_count);
  return { allowed: remaining > 0, remaining, usageId: row.id };
}

async function incrementUsage(usageId: string | null, supabaseAdmin: SupabaseClient) {
  if (!usageId) return;
  const { data } = await supabaseAdmin
    .from('subscription_usage')
    .select('usage_count')
    .eq('id', usageId)
    .single() as { data: { usage_count: number } | null };
  if (data) {
    await supabaseAdmin
      .from('subscription_usage')
      .update({ usage_count: data.usage_count + 1 })
      .eq('id', usageId);
  }
}

// Hunter.io lead enrichment — returns a formatted markdown table of contacts
async function executeLeadEnrich(domain: string): Promise<string> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return '*Lead enrichment requires a Hunter.io API key. Set `HUNTER_API_KEY` in your environment.*';
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*/,'').trim();
  if (!cleanDomain) return '*No domain provided for lead enrichment.*';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&limit=10&api_key=${apiKey}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);

    if (!res.ok) return `Could not enrich ${cleanDomain} — Hunter.io returned ${res.status}.`;

    const data = await res.json() as {
      data?: {
        organization?: string;
        emails?: Array<{ value: string; first_name?: string; last_name?: string; position?: string; confidence: number }>;
      };
      meta?: { results: number };
    };

    const emails = data.data?.emails ?? [];
    const leads = emails
      .filter(e => e.value && e.confidence >= 50)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 8);

    if (leads.length === 0) return `No high-confidence leads found at **${cleanDomain}**.`;

    const org = data.data?.organization ?? cleanDomain;
    let result = `**${leads.length} leads found at ${org} (${cleanDomain}):**\n\n`;
    result += '| Name | Email | Title | Confidence |\n|------|-------|-------|------------|\n';
    for (const lead of leads) {
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—';
      const title = lead.position || '—';
      result += `| ${name} | ${lead.value} | ${title} | ${lead.confidence}% |\n`;
    }
    return result;
  } catch {
    return `Error enriching ${cleanDomain}. Please verify the domain and try again.`;
  }
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Initialise admin client inside try-catch so missing env vars are handled gracefully
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // ── Server-side auth: never trust userId from the client body ──────────
    const userClient = await createUserClient();
    const { data: { user: authedUser } } = await userClient.auth.getUser();
    const userId: string | undefined = authedUser?.id;

    const { agentId, message, conversationHistory, userContext, conversationId: existingConversationId, stream: wantStream } = await request.json();

    if (!agentId || !message) {
      return NextResponse.json({ error: 'Agent ID and message are required' }, { status: 400 });
    }

    // Input length cap — prevents token budget blowout
    if (typeof message === 'string' && message.length > 8000) {
      return NextResponse.json(
        { error: 'Message too long (max 8,000 characters)' },
        { status: 400 }
      );
    }

    const agent = getAgentById(agentId);
    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // ── Usage limit check (fail-open: never block chat if usage table has issues) ─
    let usageId: string | null = null;
    if (userId) {
      try {
        const usage = await checkUsageAllowed(userId, supabaseAdmin);
        if (!usage.allowed) {
          return NextResponse.json({
            error: 'Monthly message limit reached',
            limitReached: true,
            remaining: 0,
          }, { status: 429 });
        }
        usageId = usage.usageId;
      } catch {
        // Usage check failed (table missing, FK error, etc.) — allow the message through
        console.warn('Usage check failed — allowing message through');
      }
    }

    void wantStream; // stream param accepted but not used — all agents use JSON path

    // Use dedicated system prompt if available, fall back to built one
    let systemPrompt = AGENT_SYSTEM_PROMPTS[agentId] ?? buildAgentSystemPrompt(agent, userContext);

    // ── Agent memory + cross-agent context (registry-driven, fail-open) ──────
    if (userId) {
      try {
        const ctx = await getAgentContext(agentId, userId, supabaseAdmin, message);
        systemPrompt += formatContextForPrompt(ctx);
      } catch {
        // Context injection failed — proceed without memory (non-fatal)
        console.warn('Agent context injection failed — proceeding without memory');
      }
    }

    // ── System prompt token budget guard ──────────────────────────────────
    // If the prompt grew too large (e.g., many artifacts), trim the MEMORY block
    // to keep only the 3 most recent own-artifacts entries.
    const SYSTEM_PROMPT_CHAR_LIMIT = 6000;
    if (systemPrompt.length > SYSTEM_PROMPT_CHAR_LIMIT) {
      const memoryStart = systemPrompt.indexOf('\n\nMEMORY — What you have previously built');
      if (memoryStart !== -1) {
        // Find end of the MEMORY block (next \n\n block or end of string)
        const memoryEnd = systemPrompt.indexOf('\n\nFOUNDER CONTEXT', memoryStart + 1);
        const memoryBlock = memoryEnd !== -1
          ? systemPrompt.slice(memoryStart, memoryEnd)
          : systemPrompt.slice(memoryStart);
        const lines = memoryBlock.split('\n').filter(l => l.startsWith('- '));
        if (lines.length > 3) {
          // Keep only the 3 most recent lines
          const trimmedBlock = memoryBlock.replace(
            lines.slice(3).join('\n'),
            ''
          );
          systemPrompt = memoryEnd !== -1
            ? systemPrompt.slice(0, memoryStart) + trimmedBlock + systemPrompt.slice(memoryEnd)
            : systemPrompt.slice(0, memoryStart) + trimmedBlock;
        }
      }
    }

    const CONVERSATION_RULES = `

CONVERSATION RULES:
- Ask ONE focused question at a time.
- Keep responses concise: 2–4 sentences for conversational replies; use structured formatting only when delivering a framework or plan the founder requested.
- When a founder gives a vague answer, push for specifics: numbers, examples, timelines.
- Be direct, warm, and occasionally sharp — never sycophantic.
- If you don't know their specific market or product, ask before advising.`;

    // Build conversation context
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt + CONVERSATION_RULES,
      },
      ...(conversationHistory || []).slice(-10).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // ── Pass 1: LLM chat call with native tool calling ─────────────────────
    // Programmatic "no tools in first 3 messages" enforcement
    const userMsgCount = (conversationHistory || []).filter((m: { role: string }) => m.role === 'user').length;
    const agentTools = userMsgCount >= 3 ? getToolsForAgent(agentId) : [];

    const llmResponse = await llmChat({
      messages,
      maxTokens: 900,
      temperature: 0.7,
      tools: agentTools.length > 0 ? agentTools : undefined,
    });

    if (!llmResponse.text && !llmResponse.toolCall) {
      throw new Error('No response from AI');
    }

    // ── Map native tool call to existing { type, context } shape ──────────
    let chatReply = llmResponse.text;
    let artifact = null;

    const DATA_TOOLS = ['lead_enrich', 'web_research', 'create_deal'];
    const toolCall: { type: string; context: Record<string, unknown> } | null = llmResponse.toolCall
      ? {
          type: llmResponse.toolCall.name,
          context: DATA_TOOLS.includes(llmResponse.toolCall.name)
            ? llmResponse.toolCall.args
            : (llmResponse.toolCall.args.context as Record<string, unknown>) ?? llmResponse.toolCall.args,
        }
      : null;

    if (toolCall) {

      try {
        if (toolCall.type === 'create_deal') {
          // ── Auto-create deal in Susi's pipeline ───────────────────────
          const company      = (toolCall.context.company as string) || '';
          const contactName  = (toolCall.context.contact_name as string) || undefined;
          const contactEmail = (toolCall.context.contact_email as string) || undefined;
          const contactTitle = (toolCall.context.contact_title as string) || undefined;
          const dealValue    = typeof toolCall.context.value === 'number' ? toolCall.context.value : undefined;
          const stage        = (toolCall.context.stage as string) || 'lead';
          const notes        = (toolCall.context.notes as string) || undefined;

          if (company && userId) {
            const t0Deal = Date.now();
            const { data: deal } = await supabaseAdmin
              .from('deals')
              .insert({
                user_id: userId,
                company,
                contact_name:  contactName  ?? null,
                contact_email: contactEmail ?? null,
                contact_title: contactTitle ?? null,
                stage: ['lead','qualified','proposal','negotiating','won','lost'].includes(stage) ? stage : 'lead',
                value: dealValue ?? null,
                notes: notes ?? null,
                source: 'susi_chat',
              })
              .select()
              .single();

            if (deal) {
              logToolExecution(supabaseAdmin, userId, agentId, 'create_deal', t0Deal, 'success');
              const parts = [
                `**Deal added to pipeline:** ${company}`,
                dealValue ? `$${dealValue.toLocaleString()}` : null,
                `Stage: ${stage}`,
                contactEmail ? `Contact: ${contactName || contactEmail}` : null,
              ].filter(Boolean).join(' · ');

              chatReply = chatReply ? `${chatReply}\n\n${parts}` : parts;

              void supabaseAdmin.from('agent_activity').insert({
                user_id: userId,
                agent_id: 'susi',
                action_type: 'deal_created',
                description: `Susi added ${company} to pipeline as ${stage}${dealValue ? ` — $${dealValue.toLocaleString()}` : ''}`,
                metadata: { deal_id: deal.id, company, stage, value: dealValue },
              });
            } else {
              logToolExecution(supabaseAdmin, userId, agentId, 'create_deal', t0Deal, 'error', 'insert returned null');
            }
          }

        } else if (toolCall.type === 'lead_enrich') {
          // ── Lead enrichment via Hunter.io (routed through universal executor) ─
          const domain = (toolCall.context.domain as string) || '';
          const { result: enriched } = await executeTool(
            'lead_enrich',
            { domain },
            userId,
            supabaseAdmin,
            async (args) => executeLeadEnrich((args as { domain: string }).domain),
            existingConversationId ?? undefined,
          );
          chatReply = chatReply ? `${chatReply}\n\n${enriched}` : enriched as string;

        } else if (toolCall.type === 'web_research') {
          // ── Live web research via Tavily + synthesis pass ─────────────
          const query = (toolCall.context.query as string) || '';
          const { result: research } = await executeTool(
            'web_research',
            { query },
            userId,
            supabaseAdmin,
            async (args) => fetchTavilyResearch((args as { query: string }).query),
            existingConversationId ?? undefined,
          );
          if (research) {
            const synthesis = await callOpenRouter(
              [
                { role: 'system', content: AGENT_SYSTEM_PROMPTS[agentId] ?? '' },
                {
                  role: 'user',
                  content: `Web search results for "${query}":\n${JSON.stringify(research, null, 2)}\n\nBased on these results, give the founder 3-5 specific, actionable competitive insights. Cite sources by name. Be concrete — mention real pricing, features, or customer sentiments from the data.`,
                },
              ],
              600,
              0.5
            );
            chatReply = chatReply ? `${chatReply}\n\n${synthesis}` : synthesis;
          }

        } else {
          // ── Artifact-generating tools (all 12 types) ──────────────────
          const t0Artifact = Date.now();
          let researchData: Record<string, unknown> | null = null;

          // Inject live Tavily data for competition-heavy artifact types
          if (toolCall.type === 'battle_card') {
            const competitor = (toolCall.context.competitor as string) || '';
            const product = (toolCall.context.ourProduct as string) || '';
            if (competitor) {
              researchData = await fetchTavilyResearch(
                `${competitor} company product pricing features reviews competitors vs ${product}`
              );
            }
          } else if (toolCall.type === 'competitive_matrix') {
            const competitors = (toolCall.context.competitors as string[]) || [];
            const product = (toolCall.context.product as string) || '';
            if (competitors.length > 0) {
              researchData = await fetchTavilyResearch(
                `${competitors.slice(0, 3).join(' vs ')} competitive analysis pricing features market position ${product}`
              );
            }
          }

          // ── Pass 2: dedicated artifact generation ──────────────────────
          const artifactPrompt = getArtifactPrompt(toolCall.type, toolCall.context, researchData);
          const artifactRaw = await callOpenRouter(
            [
              { role: 'system', content: artifactPrompt },
              { role: 'user', content: 'Generate the deliverable now. Return ONLY valid JSON, no markdown fences, no explanation text.' },
            ],
            3000,  // higher token limit for structured output
            0.4    // lower temperature for consistency
          );

          // Clean potential markdown fences from response
          const cleanJson = artifactRaw
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          const parsedContent = JSON.parse(cleanJson);
          const artifactTitle = parsedContent.title || toolCall.type.replace(/_/g, ' ');

          // Persist artifact to DB
          let artifactId = null;
          if (userId) {
            const convId = existingConversationId || null;
            const { data: saved } = await supabaseAdmin
              .from('agent_artifacts')
              .insert({
                conversation_id: convId,
                user_id: userId,
                agent_id: agentId,
                artifact_type: toolCall.type,
                title: artifactTitle,
                content: parsedContent,
              })
              .select('id')
              .single();
            artifactId = saved?.id ?? null;
          }

          artifact = {
            id: artifactId,
            type: toolCall.type,
            title: artifactTitle,
            content: parsedContent,
          };
          logToolExecution(supabaseAdmin, userId, agentId, toolCall.type, t0Artifact, 'success');
        }
      } catch (err) {
        // Tool execution failed — return clean chat reply without artifact
        console.error('Tool execution error:', err);
      }
    }

    // ── Persist messages to DB (fail-open — DB issues never break the response) ─
    let conversationId = existingConversationId;
    if (userId) {
      try {
        if (!conversationId) {
          const { data: conv } = await supabaseAdmin
            .from('agent_conversations')
            .insert({
              user_id: userId,
              agent_id: agentId,
              title: message.slice(0, 60),
              last_message_at: new Date().toISOString(),
              message_count: 1
            })
            .select('id')
            .single();
          conversationId = conv?.id;

          // Update artifact with conversation_id if we just created it
          if (artifact?.id && conversationId) {
            await supabaseAdmin
              .from('agent_artifacts')
              .update({ conversation_id: conversationId })
              .eq('id', artifact.id);
          }
        } else {
          await supabaseAdmin
            .from('agent_conversations')
            .update({
              last_message_at: new Date().toISOString(),
              message_count: (conversationHistory?.length ?? 0) + 2
            })
            .eq('id', conversationId);
        }

        if (conversationId) {
          await supabaseAdmin.from('agent_messages').insert({
            conversation_id: conversationId,
            role: 'user',
            content: message
          });
          await supabaseAdmin.from('agent_messages').insert({
            conversation_id: conversationId,
            role: 'assistant',
            content: chatReply
          });
        }
      } catch {
        // Persistence failed — the AI reply is still returned to the user
        console.warn('Message persistence failed — response still returned to client');
      }

      // Increment usage (also fail-open)
      if (usageId) {
        try { await incrementUsage(usageId, supabaseAdmin); } catch { /* non-critical */ }
      }
    }

    return NextResponse.json({
      response: chatReply,
      content: chatReply,
      agentId,
      conversationId,
      timestamp: new Date().toISOString(),
      ...(artifact ? { artifact } : {}),
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Agent chat error:', errMsg, error);

    let userMessage: string;
    let httpStatus = 500;

    if (error instanceof OpenRouterError) {
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
