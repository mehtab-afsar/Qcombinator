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
import { postArtifactFeedEvent } from '@/lib/feed/auto-events';
import { ClaudeError } from '@/lib/claude';
import { llmChat, llmStream } from '@/lib/llm/provider';
import { routedText } from '@/lib/llm/router';
import { getToolsForAgent } from '@/lib/llm/tools';
import { executeTool } from '@/lib/tools/executor';
import { getAgentContext, formatContextForPrompt } from '@/lib/agents/context';
import { orchestrate } from '@/lib/agents/orchestrator';
import { critiqueArtifact, patchArtifact } from '@/lib/agents/critique';
import { getFounderProfileContext, type FounderProfileResult } from '@/lib/agents/founder-context';
import { evaluateArtifactIndependently } from '@/lib/agents/patel-evaluator';
import type { PatelScores, PatelConfidence } from '@/lib/constants/patel-indicators';
import { scoreFromArtifact } from '@/lib/qscore/artifact-scorer';
import { applyAgentScoreSignal } from '@/features/qscore/services/agent-signal';
import {
  FF_ARTIFACT_SELF_CRITIQUE,
  FF_CROSS_AGENT_ORCHESTRATION,
  FF_STREAMING_CHAT,
} from '@/lib/feature-flags';
import { getRelevantResources, formatResourcesForPrompt } from '@/features/knowledge/library';
import { withCircuitBreaker } from '@/lib/circuit-breaker';
import {
  getStartupState,
  updateStartupState,
  formatStartupStateForPrompt,
  extractStateFromArtifact,
  type StartupState,
} from '@/lib/agents/startup-state';
import { upsertAgentGoal, getAgentGoal, formatGoalForPrompt } from '@/lib/agents/agent-goals';
import { log } from '@/lib/logger'
import {
  getPendingDelegations,
  formatDelegationsForPrompt,
  markDelegationRunning,
  triggerProactiveDelegations,
} from '@/lib/agents/delegation';
import { GLOBAL_CONSTITUTION } from '@/lib/agents/constitution';
import { getAgentMemory } from '@/lib/agents/memory-loader';
import { updateAgentMemory } from '@/lib/agents/memory-updater';
import { summariseAndSaveSession } from '@/lib/agents/session-summarizer';
import { inferIterationAndAlignmentFromMessage } from '@/lib/agents/patel-indicator-updater';
import { buildPatelQuestionBank } from '@/lib/agents/patel-question-bank';

// ─── request schema ──────────────────────────────────────────────────────────
const chatRequestSchema = z.object({
  agentId:           z.string().min(1).max(64),
  message:           z.string().min(1).max(8000).refine(s => s.trim().length > 0, 'Message cannot be blank'),
  conversationHistory: z.array(
    z.object({ role: z.string(), content: z.string().max(8000) })
  ).max(100).optional(),
  userContext:       z.record(z.string(), z.unknown()).optional(),
  conversationId:    z.string().uuid().optional().nullable(),
  stream:            z.boolean().optional(),
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

// Fire-and-forget tool execution logger
function logToolExecution(
  supabaseAdmin: SupabaseClient,
  userId: string | undefined,
  agentId: string,
  toolName: string,
  startMs: number,
  status: 'success' | 'error' | 'timeout',
  errorMsg?: string,
  modelTier?: string,
) {
  void supabaseAdmin.from('tool_execution_logs').insert({
    user_id:    userId ?? null,
    agent_id:   agentId,
    tool_name:  toolName,
    status,
    latency_ms: Date.now() - startMs,
    error_msg:  errorMsg ?? null,
    model_tier: modelTier ?? null,
  });
}


async function fetchTavilyResearch(query: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    log.warn('TAVILY_API_KEY not configured — skipping research');
    return null;
  }

  return withCircuitBreaker('tavily', async () => {
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
      log.error('Tavily error:', response.statusText);
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
  }, null);
}

// ─── usage limits ────────────────────────────────────────────────────────────
// increment_usage_if_allowed RPC (see migration 20260512000003) atomically
// locks the subscription_usage row, handles reset-window expiry, checks the
// limit, and increments — all in one DB round-trip. This eliminates the
// TOCTOU race where two concurrent requests both pass the limit check before
// either one increments.
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

// Hunter.io lead enrichment — returns a formatted markdown table of contacts
async function executeLeadEnrich(domain: string): Promise<string> {
  const apiKey = process.env.HUNTER_API_KEY;
  if (!apiKey) {
    return '*Lead enrichment requires a Hunter.io API key. Set `HUNTER_API_KEY` in your environment.*';
  }

  const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*/,'').trim();
  if (!cleanDomain) return '*No domain provided for lead enrichment.*';

  return withCircuitBreaker('hunter_io', async () => {
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
  }, `*Hunter.io is temporarily unavailable. Please try again in a few minutes.*`);
}

// ─── data-tool executors (return formatted strings for observe loop) ──────────

async function executeCreateDeal(
  ctx: Record<string, unknown>,
  userId: string | undefined,
  supabaseAdmin: SupabaseClient,
  agentId: string,
): Promise<string> {
  const company      = (ctx.company as string) || '';
  const contactName  = (ctx.contact_name as string) || undefined;
  const contactEmail = (ctx.contact_email as string) || undefined;
  const contactTitle = (ctx.contact_title as string) || undefined;
  const dealValue    = typeof ctx.value === 'number' ? ctx.value : undefined;
  const stage        = (ctx.stage as string) || 'lead';
  const notes        = (ctx.notes as string) || undefined;

  if (!company || !userId) return 'Deal not created — missing company name or unauthenticated.';

  const { data: deal } = await supabaseAdmin
    .from('deals')
    .insert({
      user_id: userId, company,
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

  if (!deal) return `Failed to create deal for ${company}.`;

  void supabaseAdmin.from('agent_activity').insert({
    user_id: userId, agent_id: agentId, action_type: 'deal_created',
    description: `Added ${company} to pipeline as ${stage}`,
    metadata: { deal_id: deal.id, company, stage, value: dealValue },
  });

  return [
    `Deal created: **${company}**`,
    dealValue ? `Value: $${dealValue.toLocaleString()}` : null,
    `Stage: ${stage}`,
    contactEmail ? `Contact: ${contactName || contactEmail}` : null,
  ].filter(Boolean).join(' · ');
}

async function executeApolloSearch(ctx: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return '*Apollo.io API key not configured. Set `APOLLO_API_KEY` to enable lead search.*';

  return withCircuitBreaker('apollo_io', async () => {
    const payload: Record<string, unknown> = { page: 1, per_page: (ctx.per_page as number) ?? 25 };
    if (ctx.job_titles)  payload.person_titles = ctx.job_titles;
    if (ctx.industries)  payload.organization_industry_tag_values = ctx.industries;
    if (ctx.locations)   payload.person_locations = ctx.locations;
    if (ctx.keywords)    payload.q_keywords = ctx.keywords;
    if (ctx.employee_count_min || ctx.employee_count_max) {
      payload.organization_num_employees_ranges = [
        `${ctx.employee_count_min ?? 1},${ctx.employee_count_max ?? 10000}`
      ];
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    clearTimeout(timer);

    if (!res.ok) return `Apollo search failed: ${res.status} ${res.statusText}`;

    const data = await res.json() as { people?: Array<Record<string, unknown>> };
    const people = data.people ?? [];
    if (people.length === 0) return 'No leads found matching those criteria. Try broadening the search.';

    const lines = people.slice(0, 20).map((p: Record<string, unknown>) => {
      const name    = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
      const title   = (p.title as string) || '—';
      const company = (p.organization as Record<string, unknown>)?.name as string || '—';
      const email   = (p.email as string) || '—';
      const li      = (p.linkedin_url as string) || '—';
      return `• ${name} | ${title} | ${company} | ${email} | ${li}`;
    });

    return `Found ${people.length} leads:\n${lines.join('\n')}`;
  }, '*Apollo.io is temporarily unavailable. Please try again shortly.*');
}

async function executePosthogQuery(ctx: Record<string, unknown>): Promise<string> {
  const apiKey     = process.env.POSTHOG_API_KEY;
  const projectId  = process.env.POSTHOG_PROJECT_ID;
  if (!apiKey || !projectId) return '*PostHog not configured. Set `POSTHOG_API_KEY` and `POSTHOG_PROJECT_ID`.*';

  const queryType = (ctx.query_type as string) || 'active_users';
  const dateFrom  = (ctx.date_range as string) || '-30d';

  return withCircuitBreaker('posthog', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const base = `https://app.posthog.com/api/projects/${projectId}`;
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

    let result = '';

    if (queryType === 'retention') {
      const res = await fetch(`${base}/insights/retention/`, {
        method: 'POST', headers, signal: controller.signal,
        body: JSON.stringify({ date_from: dateFrom, period: 'Week', target_event: { id: '$pageview', name: '$pageview', type: 'events' } }),
      });
      clearTimeout(timer);
      if (!res.ok) return `PostHog retention query failed: ${res.status}`;
      const data = await res.json() as { result?: Array<{ date: string; values: Array<{ count: number }> }> };
      const rows = (data.result ?? []).slice(0, 8);
      if (rows.length === 0) return 'No retention data available.';
      result = 'Retention cohorts:\n' + rows.map(r =>
        `Week of ${r.date}: ${r.values.map((v, i) => `Day${i * 7}: ${v.count}`).join(', ')}`
      ).join('\n');
    } else {
      const res = await fetch(`${base}/insights/trend/`, {
        method: 'POST', headers, signal: controller.signal,
        body: JSON.stringify({ date_from: dateFrom, events: [{ id: '$pageview', name: '$pageview', type: 'events' }], interval: 'week' }),
      });
      clearTimeout(timer);
      if (!res.ok) return `PostHog trends query failed: ${res.status}`;
      const data = await res.json() as { result?: Array<{ label: string; data: number[]; days: string[] }> };
      const series = (data.result ?? [])[0];
      if (!series) return 'No trend data available.';
      const points = series.days.slice(-6).map((d, i) => `${d}: ${series.data[series.data.length - 6 + i] ?? 0}`);
      result = `${queryType} trend (last 6 weeks):\n${points.join('\n')}`;
    }

    return result || 'Query returned no data.';
  }, '*PostHog is temporarily unavailable. Please try again shortly.*');
}

async function executeCalendlyLink(ctx: Record<string, unknown>): Promise<string> {
  const apiKey   = process.env.CALENDLY_API_KEY;
  const userUri  = process.env.CALENDLY_USER_URI;
  if (!apiKey || !userUri) return '*Calendly not configured. Set `CALENDLY_API_KEY` and `CALENDLY_USER_URI`.*';

  return withCircuitBreaker('calendly', async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&count=20`, {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return `Calendly API error: ${res.status}`;

    const data = await res.json() as { collection?: Array<{ scheduling_url: string; name: string; duration: number; slug: string }> };
    const types = data.collection ?? [];
    const meetingType = (ctx.meeting_type as string) || 'demo';
    const wantDuration = (ctx.duration_minutes as number) || 30;

    const match = types.find(e =>
      e.slug?.toLowerCase().includes(meetingType) || e.name?.toLowerCase().includes(meetingType)
    ) ?? types.find(e => e.duration === wantDuration) ?? types[0];

    if (!match) return 'No matching Calendly event types found.';

    return `Calendly booking link generated:\n**${match.name}** (${match.duration} min)\n${match.scheduling_url}`;
  }, '*Calendly is temporarily unavailable. Please try again shortly.*');
}

// ─── execution tool handlers ─────────────────────────────────────────────────

async function executeSendOutreachSequence(
  ctx: Record<string, unknown>,
  userId: string | undefined,
  supabaseAdmin: SupabaseClient,
  agentId: string,
): Promise<string> {
  if (!userId) return 'Cannot send emails — user not authenticated.';
  const contacts = (ctx.contacts as Array<{ name: string; email: string; company?: string }>) ?? [];
  const steps    = (ctx.sequence_steps as Array<{ subject: string; body: string }>) ?? [];
  if (contacts.length === 0) return 'No contacts provided. Run apollo_search first to find leads.';
  if (steps.length === 0)    return 'No sequence steps provided. Generate an outreach_sequence artifact first.';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/agents/outreach/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({ contacts, steps, agentId }),
  });
  if (!res.ok) return `Outreach send failed: ${res.status} ${res.statusText}`;
  const data = await res.json() as { sent?: number; failed?: number; pipelineAdded?: number };

  void supabaseAdmin.from('agent_activity').insert({
    user_id: userId, agent_id: agentId, action_type: 'outreach_sent',
    description: `Sent outreach to ${data.sent ?? 0} contacts`,
    metadata: { sent: data.sent, failed: data.failed, pipeline_added: data.pipelineAdded },
  });

  return `Outreach sent: **${data.sent ?? 0} emails dispatched**, ${data.failed ?? 0} failed, ${data.pipelineAdded ?? 0} contacts added to pipeline.`;
}

async function executeBulkEnrichPipeline(
  ctx: Record<string, unknown>,
  userId: string | undefined,
  supabaseAdmin: SupabaseClient,
  agentId: string,
): Promise<string> {
  if (!userId) return 'Cannot enrich pipeline — user not authenticated.';
  const apiKey = process.env.APOLLO_API_KEY;
  if (!apiKey) return '*Apollo.io API key not configured.*';

  const payload: Record<string, unknown> = { page: 1, per_page: (ctx.per_page as number) ?? 50 };
  if (ctx.job_titles)  payload.person_titles = ctx.job_titles;
  if (ctx.industries)  payload.organization_industry_tag_values = ctx.industries;
  if (ctx.locations)   payload.person_locations = ctx.locations;
  if (ctx.keywords)    payload.q_keywords = ctx.keywords;
  if (ctx.employee_count_min || ctx.employee_count_max) {
    payload.organization_num_employees_ranges = [`${ctx.employee_count_min ?? 1},${ctx.employee_count_max ?? 10000}`];
  }

  const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey },
    body: JSON.stringify(payload),
  });
  if (!res.ok) return `Apollo search failed: ${res.status}`;

  const data = await res.json() as { people?: Array<Record<string, unknown>> };
  const people = data.people ?? [];
  if (people.length === 0) return 'No leads found. Try broadening the search criteria.';

  const rows = people.map((p: Record<string, unknown>) => ({
    user_id: userId,
    company: ((p.organization as Record<string, unknown>)?.name as string) || 'Unknown',
    contact_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
    contact_email: (p.email as string) || null,
    contact_title: (p.title as string) || null,
    stage: 'lead',
    source: `${agentId}_bulk_enrich`,
  }));

  const { error } = await supabaseAdmin.from('deals').insert(rows);
  if (error) return `Pipeline insert failed: ${error.message}`;

  void supabaseAdmin.from('agent_activity').insert({
    user_id: userId, agent_id: agentId, action_type: 'pipeline_enriched',
    description: `Bulk added ${rows.length} leads from Apollo`,
    metadata: { count: rows.length },
  });

  return `Pipeline enriched: **${rows.length} leads added** from Apollo search.`;
}

async function executeScheduleFollowup(
  ctx: Record<string, unknown>,
  userId: string | undefined,
  supabaseAdmin: SupabaseClient,
  agentId: string,
): Promise<string> {
  if (!userId) return 'Cannot schedule follow-up — user not authenticated.';
  const actionType  = (ctx.action_type as string) || 'followup_check';
  const daysFromNow = (ctx.days_from_now as number) || 3;
  const payload     = (ctx.payload as Record<string, unknown>) || {};

  const executeAt = new Date();
  executeAt.setDate(executeAt.getDate() + daysFromNow);

  const { error } = await supabaseAdmin.from('scheduled_actions').insert({
    user_id: userId, agent_id: agentId, action_type: actionType,
    payload, execute_at: executeAt.toISOString(), status: 'pending',
  });
  if (error) return `Failed to schedule follow-up: ${error.message}`;

  void supabaseAdmin.from('agent_activity').insert({
    user_id: userId, agent_id: agentId, action_type: 'followup_scheduled',
    description: `Scheduled ${actionType} for Day +${daysFromNow}`,
    metadata: { action_type: actionType, execute_at: executeAt.toISOString() },
  });

  return `Follow-up scheduled: **${actionType}** set for ${executeAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Day +${daysFromNow}).`;
}

async function executeInitiateVoiceCall(
  ctx: Record<string, unknown>,
  userId: string | undefined,
  supabaseAdmin: SupabaseClient,
  agentId: string,
): Promise<string> {
  if (!userId) return 'Cannot initiate call — user not authenticated.';
  const phoneNumber = (ctx.phone_number as string) || '';
  if (!phoneNumber) return 'No phone number provided. Please supply a phone number in E.164 format.';

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${baseUrl}/api/agents/susi/vapi`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
    body: JSON.stringify({
      phone_number: phoneNumber,
      lead_name: ctx.lead_name ?? '',
      company:   ctx.company ?? '',
      context:   ctx.context ?? '',
      agentId,
    }),
  });
  if (!res.ok) return `Voice call failed: ${res.status} ${res.statusText}`;
  const data = await res.json() as { callId?: string; status?: string };

  void supabaseAdmin.from('agent_activity').insert({
    user_id: userId, agent_id: agentId, action_type: 'voice_call_initiated',
    description: `AI SDR call initiated to ${ctx.lead_name ?? phoneNumber}`,
    metadata: { phone_number: phoneNumber, call_id: data.callId, company: ctx.company },
  });

  return `Voice call initiated: AI SDR dialing **${ctx.lead_name ?? phoneNumber}**${ctx.company ? ` at ${ctx.company}` : ''}. Call ID: ${data.callId ?? 'pending'}.`;
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

    const rawBody = await request.json();
    const parsed = chatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }
    const { agentId, message, conversationHistory, userContext, conversationId: existingConversationId, stream: wantStream } = parsed.data;

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

    // Use dedicated system prompt if available, fall back to built one
    // Constitution is prepended first — it cannot be overridden by agent-specific instructions below it
    let systemPrompt = GLOBAL_CONSTITUTION + '\n\n' + (AGENT_SYSTEM_PROMPTS[agentId] ?? buildAgentSystemPrompt(agent, userContext)) + '\n<<<CACHE_BREAK>>>'

    // ── Source citations — collected during context loading, emitted as first SSE event ──
    type SourceItem = { label: string; type: 'profile' | 'memory' | 'artifact' | 'cross_agent' }
    const sourcesUsed: SourceItem[] = []

    // ── Agent memory + cross-agent context (registry-driven, fail-open) ──────
    let startupState: StartupState | null = null;
    // Declared here so artifact generation (outside if(userId)) can access them
    let patelRawScores: PatelScores | undefined
    let patelRawConfidence: PatelConfidence | undefined
    if (userId) {
      // Run context loading + orchestration + founder profile + startup state in parallel.
      // Orchestration is capped at 2s — it makes sub-agent LLM calls that can take 5-10s
      // and would otherwise block time-to-first-token for every message.
      const orchFallback = { subAgentResults: [] as Awaited<ReturnType<typeof orchestrate>>['subAgentResults'], contextInjection: '', subCallsUsed: 0 };
      const orchWithTimeout = FF_CROSS_AGENT_ORCHESTRATION
        ? Promise.race([
            orchestrate(agentId, userId, message, supabaseAdmin),
            new Promise<typeof orchFallback>(r => setTimeout(() => r(orchFallback), 2000)),
          ])
        : Promise.resolve(orchFallback);

      const parallelTasks: [
        Promise<Awaited<ReturnType<typeof getAgentContext>>>,
        Promise<typeof orchFallback>,
        Promise<FounderProfileResult>,
        Promise<StartupState | null>,
      ] = [
        getAgentContext(agentId, userId, supabaseAdmin, message),
        orchWithTimeout,
        getFounderProfileContext(userId, supabaseAdmin, agentId),
        getStartupState(userId, supabaseAdmin),
      ];
      const [ctxResult, orchResult, founderCtxResult, stateResult] = await Promise.allSettled(parallelTasks);

      // Inject founder profile first — agents should see it before artifact memory
      if (founderCtxResult.status === 'fulfilled' && founderCtxResult.value) {
        systemPrompt += founderCtxResult.value.block;
      }

      // Extract raw Patel diagnostic scores for artifact prompt grounding (Patel sessions only)
      patelRawScores = founderCtxResult.status === 'fulfilled' ? founderCtxResult.value?.rawScores : undefined
      patelRawConfidence = founderCtxResult.status === 'fulfilled' ? founderCtxResult.value?.rawConfidence : undefined
      if (agentId === 'patel' && !patelRawScores) {
        log.warn('patel_scores_missing', { userId, agentId })
      }

      // Fix 1: inject curated DIAGNOSTIC_QUESTIONS bank for active constraint dimension
      if (agentId === 'patel') {
        const qBank = buildPatelQuestionBank(patelRawScores, patelRawConfidence)
        if (qBank) systemPrompt += qBank
      }

      // Fix 2: inject questions already asked this session — prevents Patel from repeating
      if (agentId === 'patel' && (conversationHistory || []).length > 0) {
        const askedQuestions = (conversationHistory as Array<{ role: string; content: string }>)
          .filter(m => m.role === 'assistant')
          .flatMap(m => m.content.split('\n').filter(l => l.trim().endsWith('?') && l.trim().length > 20))
          .slice(-6)
        if (askedQuestions.length > 0) {
          systemPrompt += `\n\nQUESTIONS ALREADY ASKED THIS SESSION — do not repeat, do not rephrase:\n${askedQuestions.map(q => `- ${q.trim()}`).join('\n')}`
        }
      }

      // Inject shared startup state — gives every agent live facts from other agents
      if (stateResult.status === 'fulfilled') {
        startupState = stateResult.value;
        const stateBlock = formatStartupStateForPrompt(startupState);
        if (stateBlock) systemPrompt += stateBlock;
      }

      // Inject latest artifact from this conversation — lets the LLM accept "edit this" follow-ups
      if (existingConversationId) {
        try {
          const { data: latestArt } = await supabaseAdmin
            .from('agent_artifacts')
            .select('artifact_type, title, content')
            .eq('conversation_id', existingConversationId)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (latestArt) {
            const snippet = JSON.stringify(latestArt.content).slice(0, 3000)
            systemPrompt += `\n\n<latest_artifact type="${latestArt.artifact_type}" title="${latestArt.title}">
${snippet}
</latest_artifact>
When the founder asks to refine, edit, or update this document, call generate_artifact with the same artifact type — the conversation history already contains their requested changes.`
          }
        } catch { /* non-critical — never block the response */ }
      }

      // Load pending delegations + agent goal in parallel (non-blocking — never delays the response)
      const [delegationsResult, goalResult] = await Promise.allSettled([
        getPendingDelegations(agentId, userId, supabaseAdmin),
        startupState ? getAgentGoal(agentId, userId, supabaseAdmin) : Promise.resolve(null),
      ]);

      // Inject pending delegations (high-priority: injected before artifact memory)
      if (delegationsResult.status === 'fulfilled' && delegationsResult.value.length > 0) {
        systemPrompt += formatDelegationsForPrompt(delegationsResult.value);
        // Mark immediate-priority delegations as running
        for (const task of delegationsResult.value) {
          if (task.priority === 'immediate') void markDelegationRunning(task.id, supabaseAdmin);
        }
      }

      // Inject agent goal status (so the agent knows what it's optimising for)
      if (goalResult.status === 'fulfilled') {
        systemPrompt += formatGoalForPrompt(goalResult.value);
      }

      if (ctxResult.status === 'fulfilled') {
        systemPrompt += formatContextForPrompt(ctxResult.value);
      } else {
        log.warn('Agent context injection failed — proceeding without memory');
      }

      if (FF_CROSS_AGENT_ORCHESTRATION && orchResult.status === 'fulfilled' && orchResult.value.contextInjection) {
        systemPrompt += `\n\nCROSS-AGENT INTELLIGENCE — Context from other advisers:\n${orchResult.value.contextInjection}`;
        if (orchResult.value.subCallsUsed > 0) {
          void supabaseAdmin.from('agent_activity').insert({
            user_id: userId,
            agent_id: agentId,
            action_type: 'orchestration',
            description: `Orchestrated ${orchResult.value.subCallsUsed} sub-agent call(s) for richer context`,
            metadata: { subAgents: orchResult.value.subAgentResults.map(r => r.agentId) },
          });
        }
      }

      // Load relationship memory + last session summary in parallel (fail-open, never delays response)
      const [memoryResult, summaryResult] = await Promise.allSettled([
        getAgentMemory(agentId, userId, supabaseAdmin),
        existingConversationId
          ? supabaseAdmin.from('agent_conversations').select('summary').eq('id', existingConversationId).single()
          : Promise.resolve(null),
      ]);

      // Prepend relationship memory — the agent should know its history with this founder
      if (memoryResult.status === 'fulfilled' && memoryResult.value) {
        const { session_count, relationship_tier, key_facts } = memoryResult.value;
        systemPrompt = `YOU AND THIS FOUNDER:\nThis is session ${session_count} with this founder. Relationship: ${relationship_tier}.\n${key_facts ?? 'First session — no prior history.'}\n\n` + systemPrompt;
      }

      // Append last session summary so the agent picks up where it left off
      if (summaryResult.status === 'fulfilled' && summaryResult.value) {
        const summary = (summaryResult.value as { data?: { summary?: string | null } | null })?.data?.summary;
        if (summary) systemPrompt += `\n\nLAST SESSION SUMMARY:\n${summary}`;
      }

      // ── Build sources_used list for client-side citation chips ──────────────
      if (founderCtxResult.status === 'fulfilled' && founderCtxResult.value?.block?.trim())
        sourcesUsed.push({ label: 'Your Profile', type: 'profile' });
      if (memoryResult.status === 'fulfilled' && (memoryResult.value as { key_facts?: string | null } | null)?.key_facts?.trim())
        sourcesUsed.push({ label: 'Session Memory', type: 'memory' });
      if (ctxResult.status === 'fulfilled') {
        if (ctxResult.value.ownArtifacts.length > 0)
          sourcesUsed.push({ label: 'Your Deliverables', type: 'artifact' });
        const seenAgents = new Set<string>();
        for (const a of ctxResult.value.crossAgentArtifacts) {
          if (!seenAgents.has(a.agent_id)) {
            seenAgents.add(a.agent_id);
            sourcesUsed.push({ label: getAgentById(a.agent_id)?.name ?? a.agent_id, type: 'cross_agent' });
          }
        }
      }
    }

    // ── Knowledge library RAG injection ──────────────────────────────────────
    // Inject up to 2 curated resources relevant to the current message.
    // Only fires after the first 2 messages (avoid injecting before context is set).
    const userMsgCountForLibrary = (conversationHistory || []).filter((m: { role: string }) => m.role === 'user').length;
    if (userMsgCountForLibrary >= 1) {
      try {
        const resources = await getRelevantResources(supabaseAdmin, agentId, message, 2);
        systemPrompt += formatResourcesForPrompt(resources);
      } catch {
        // Non-critical — never block agent response
      }
    }

    // ── System prompt token budget guard ──────────────────────────────────
    // If the prompt grew too large, trim the MEMORY block to the 3 most recent entries.
    // Uses a split-based approach rather than string-splice to avoid corrupting surrounding sections.
    const SYSTEM_PROMPT_CHAR_LIMIT = 6000;
    function trimMemoryBlock(prompt: string, maxEntries = 3): { prompt: string; trimmed: boolean } {
      const MEMORY_HEADER = '\n\nMEMORY — What you have previously built'
      const NEXT_SECTION_RE = /\n\n[A-Z]/
      const start = prompt.indexOf(MEMORY_HEADER)
      if (start === -1) return { prompt, trimmed: false }
      const afterHeader = start + MEMORY_HEADER.length
      const nextMatch = prompt.slice(afterHeader).search(NEXT_SECTION_RE)
      const end = nextMatch !== -1 ? afterHeader + nextMatch : prompt.length
      const block = prompt.slice(start, end)
      const lines = block.split('\n').filter(l => l.startsWith('- '))
      if (lines.length <= maxEntries) return { prompt, trimmed: false }
      const kept = lines.slice(0, maxEntries).join('\n')
      const rebuilt = MEMORY_HEADER + '\n' + kept
      return { prompt: prompt.slice(0, start) + rebuilt + prompt.slice(end), trimmed: true }
    }
    if (systemPrompt.length > SYSTEM_PROMPT_CHAR_LIMIT) {
      const { prompt: trimmed, trimmed: wasTrimmed } = trimMemoryBlock(systemPrompt)
      systemPrompt = trimmed
      if (wasTrimmed) log.info('context_trim', { userId, agentId, promptLen: systemPrompt.length })
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

    // Build conversation context — token-budget slice keeps history under ~60k tokens
    // (rough heuristic: 1 token ≈ 4 chars) so we never exceed the model context window.
    function sliceHistoryByTokenBudget(
      history: Array<{ role: string; content: string }>,
      budgetTokens = 60_000
    ): Array<{ role: string; content: string }> {
      let total = 0
      const result: Array<{ role: string; content: string }> = []
      for (let i = history.length - 1; i >= 0; i--) {
        const est = Math.ceil((history[i].content?.length ?? 0) / 4)
        if (total + est > budgetTokens) break
        result.unshift(history[i])
        total += est
      }
      return result
    }
    const messages = [
      {
        role: "system" as const,
        content: systemPrompt + CONVERSATION_RULES,
      },
      ...sliceHistoryByTokenBudget(conversationHistory || []).map((msg: { role: string; content: string }) => ({
        role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: message,
      },
    ];

    // ── Pass 1: LLM chat call with native tool calling ─────────────────────
    const agentTools = getToolsForAgent(agentId);

    // ── Shared observe-loop constants (used by both streaming + non-streaming) ─
    const MAX_ITERATIONS = 5;
    const LOOP_TOOLS = new Set([
      'lead_enrich', 'web_research', 'apollo_search', 'posthog_query', 'calendly_link',
    ]);
    const EXEC_TOOLS = new Set([
      'send_outreach_sequence', 'initiate_voice_call', 'bulk_enrich_pipeline', 'schedule_followup', 'create_deal',
    ]);
    const TOOL_LABELS: Record<string, string> = {
      apollo_search:          'Searching Apollo for leads',
      posthog_query:          'Pulling analytics from PostHog',
      calendly_link:          'Generating booking link',
      lead_enrich:            'Enriching lead data',
      web_research:           'Researching the web',
      create_deal:            'Adding deal to pipeline',
      send_outreach_sequence: 'Sending outreach emails',
      bulk_enrich_pipeline:   'Enriching pipeline from Apollo',
      schedule_followup:      'Scheduling follow-up',
    };

    // ── Patel prerequisite chain ───────────────────────────────────────────────
    const PATEL_PREREQUISITE_CHAIN: Record<string, string[]> = {
      pains_gains_triggers:  ['icp_document'],
      buyer_journey:         ['icp_document', 'pains_gains_triggers'],
      positioning_messaging: ['icp_document', 'pains_gains_triggers', 'buyer_journey'],
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
      const completed = new Set((existing ?? []).map((r: { artifact_type: string }) => r.artifact_type))
      const missing = required.filter(r => !completed.has(r))
      if (missing.length > 0) {
        const missingNames = missing.map(m => PATEL_DELIVERABLE_NAMES[m] ?? m).join(' and ')
        return `Before building ${PATEL_DELIVERABLE_NAMES[requestedType]}, you need to complete: ${missingNames}. Complete those first — each deliverable builds directly on the previous one.`
      }
      // GAP 4: D2 quality gate — ICP specificity must be ≥ 3 to ground the demand model
      if (requestedType === 'pains_gains_triggers') {
        const specificity = patelRawScores?.['icp.specificity']
        if (!specificity || specificity < 3) {
          return `The ICP needs more precision before we can build the demand model. A generic ICP produces a generic pain map that won't drive real outreach.\n\nBefore D2: what's the specific job title, the exact company type, and the single constraint that makes this buyer act NOW? Sharpen that and I'll rebuild D1 first.`
        }
      }
      return null
    }

    async function generateArtifactJSON(prompt: string, maxTokens = 8000): Promise<Record<string, unknown>> {
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

          let loopMessages = [...messages];
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
                  if (toolName === 'lead_enrich') {
                    const { result } = await executeTool('lead_enrich', { domain: (toolCtx.domain as string) || '' }, userId, supabaseAdmin, async (a) => executeLeadEnrich((a as { domain: string }).domain), existingConversationId ?? undefined);
                    toolResult = result as string;
                  } else if (toolName === 'web_research') {
                    const { result } = await executeTool('web_research', { query: (toolCtx.query as string) || '' }, userId, supabaseAdmin, async (a) => fetchTavilyResearch((a as { query: string }).query), existingConversationId ?? undefined);
                    toolResult = result ? JSON.stringify(result) : 'No results found.';
                  } else if (toolName === 'apollo_search') {
                    toolResult = await executeApolloSearch(toolCtx);
                    logToolExecution(supabaseAdmin, userId, agentId, 'apollo_search', t0, 'success');
                  } else if (toolName === 'posthog_query') {
                    toolResult = await executePosthogQuery(toolCtx);
                    logToolExecution(supabaseAdmin, userId, agentId, 'posthog_query', t0, 'success');
                  } else if (toolName === 'calendly_link') {
                    toolResult = await executeCalendlyLink(toolCtx);
                    logToolExecution(supabaseAdmin, userId, agentId, 'calendly_link', t0, 'success');
                  }
                } catch (err) {
                  toolResult = `Tool failed: ${err instanceof Error ? err.message : 'unknown'}`;
                  logToolExecution(supabaseAdmin, userId, agentId, toolName, t0, 'error', toolResult);
                }
                clearInterval(loopToolHeartbeat)
                lastToolCallExecuted = true
                send({ type: 'tool_done', toolName, summary: toolResult.split('\n')[0].slice(0, 100) });
                loopMessages = [
                  ...loopMessages,
                  { role: 'assistant' as const, content: iterText || `[calling ${toolName}]` },
                  { role: 'user' as const, content: `[Tool result: ${toolName}]\n${toolResult}\n\nContinue helping the founder based on these results.` },
                ];
                continue;

              } else if (EXEC_TOOLS.has(toolName)) {
                send({ type: 'tool_start', toolName, label: TOOL_LABELS[toolName] ?? toolName });
                try {
                  let execResult = '';
                  if (toolName === 'create_deal') {
                    execResult = await executeCreateDeal(toolCtx, userId, supabaseAdmin, agentId);
                  } else if (toolName === 'send_outreach_sequence') {
                    execResult = await executeSendOutreachSequence(toolCtx, userId, supabaseAdmin, agentId);
                  } else if (toolName === 'initiate_voice_call') {
                    execResult = await executeInitiateVoiceCall(toolCtx, userId, supabaseAdmin, agentId);
                  } else if (toolName === 'bulk_enrich_pipeline') {
                    execResult = await executeBulkEnrichPipeline(toolCtx, userId, supabaseAdmin, agentId);
                  } else if (toolName === 'schedule_followup') {
                    execResult = await executeScheduleFollowup(toolCtx, userId, supabaseAdmin, agentId);
                  }
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
                  const parsedContent = await generateArtifactJSON(artifactPrompt);
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
                    if (saveErr) log.error('artifact insert failed:', { message: saveErr.message, code: saveErr.code });
                    artifactId = saved?.id ?? null;
                    streamArtifactId = artifactId;
                  }
                  // Await score nudge before scoreFromArtifact inserts its own qscore_history row
                  // for this artifact type — avoids tripping the idempotency guard in applyAgentScoreSignal
                  let scoreSignal: Awaited<ReturnType<typeof applyAgentScoreSignal>> = { boosted: false };
                  if (artifactId && userId) {
                    try { scoreSignal = await applyAgentScoreSignal(supabaseAdmin, userId, toolName); } catch { /* non-critical */ }
                  }
                  if (artifactId && userId) void scoreFromArtifact(userId, toolName, parsedContent, supabaseAdmin).catch(() => { /* fire-and-forget: non-critical */ });
                  if (artifactId && userId) void postArtifactFeedEvent(userId, toolName, artifactTitle, supabaseAdmin);
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
                    void (async () => { try { const critique = await critiqueArtifact(toolName, parsedContent); let fc = parsedContent; if (critique.needsPatch) fc = await patchArtifact(toolName, parsedContent, critique); await supabaseAdmin.from('agent_artifacts').update({ content: fc, critique_metadata: critique }).eq('id', artifactId!); } catch { /* non-critical */ } })();
                  }
                  // Write extracted facts to world model + refresh goal + trigger delegations
                  if (userId) {
                    const stateUpdates = extractStateFromArtifact(agentId, toolName, parsedContent);
                    if (Object.keys(stateUpdates).length > 0) {
                      void (async () => {
                        await updateStartupState(userId, stateUpdates, agentId, supabaseAdmin);
                        const freshState = await getStartupState(userId, supabaseAdmin);
                        if (freshState) void upsertAgentGoal(agentId, userId, freshState, supabaseAdmin);
                        void triggerProactiveDelegations(agentId, userId, startupState, stateUpdates, supabaseAdmin);
                      })();
                    }
                  }
                  clearInterval(heartbeat);
                  logToolExecution(supabaseAdmin, userId, agentId, toolName, t0A, 'success', undefined, 'standard');
                  send({ type: 'artifact', artifact: { id: artifactId, type: toolName, title: artifactTitle, content: parsedContent } });
                  if (scoreSignal.boosted) {
                    send({ type: 'score_signal', boosted: true, points: scoreSignal.pointsAdded, dimension: scoreSignal.dimensionLabel, newScore: scoreSignal.newOverall });
                  }
                  send({ type: 'tool_done', toolName, summary: `${artifactTitle} ready` });
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
          let finalConversationId = existingConversationId;
          if (userId) {
            try {
              if (!existingConversationId) {
                const { data: conv } = await supabaseAdmin
                  .from('agent_conversations')
                  .insert({ user_id: userId, agent_id: agentId, title: message.slice(0, 60), last_message_at: new Date().toISOString(), message_count: 1 })
                  .select('id')
                  .single();
                finalConversationId = conv?.id ?? null;
              } else {
                await supabaseAdmin
                  .from('agent_conversations')
                  .update({ last_message_at: new Date().toISOString(), message_count: (conversationHistory?.length ?? 0) + 2 })
                  .eq('id', existingConversationId);
              }
              if (finalConversationId) {
                if (streamArtifactId) {
                  await supabaseAdmin.from('agent_artifacts').update({ conversation_id: finalConversationId }).eq('id', streamArtifactId);
                }
                await supabaseAdmin.from('agent_messages').insert({ conversation_id: finalConversationId, role: 'user', content: message });
                await supabaseAdmin.from('agent_messages').insert({ conversation_id: finalConversationId, role: 'assistant', content: chatReply });
              }
            } catch (persistErr) {
              log.error('Conversation persistence failed', { conversationId: finalConversationId, userId, err: persistErr instanceof Error ? persistErr.message : persistErr })
              // Notify client so UI can surface a "not saved" warning
              send({ type: 'persist_error', conversationId: finalConversationId })
            }

            const allMsgs = [...(conversationHistory || []), { role: 'user', content: message }, { role: 'assistant', content: chatReply }];
            // fire-and-forget: session summary + memory updates are non-blocking enrichments;
            // the streaming response is already complete when these run
            if (finalConversationId) void summariseAndSaveSession(finalConversationId, allMsgs, supabaseAdmin).catch(() => {});
            void updateAgentMemory(userId, agentId, allMsgs, supabaseAdmin).catch(() => {});
            // GAP 1: infer P1.4 (iteration) and P1.5 (team alignment) from founder message
            if (agentId === 'patel' && patelRawScores?.['icp.specificity'] &&
                (!patelRawScores['icp.iteration'] || !patelRawScores['icp.team_alignment']) &&
                message.length > 20) {
              void inferIterationAndAlignmentFromMessage(userId, message, patelRawScores, supabaseAdmin)
            }
          }

          send({ type: 'done', agentId, conversationId: finalConversationId });
          controller.close();
        },
      });

      return new Response(sseStream, {
        headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
      });
    }

    let loopMessages = [...messages];
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
          if (toolName === 'lead_enrich') {
            const { result } = await executeTool(
              'lead_enrich', { domain: (toolCtx.domain as string) || '' },
              userId, supabaseAdmin,
              async (args) => executeLeadEnrich((args as { domain: string }).domain),
              existingConversationId ?? undefined,
            );
            toolResult = result as string;
          } else if (toolName === 'web_research') {
            const { result } = await executeTool(
              'web_research', { query: (toolCtx.query as string) || '' },
              userId, supabaseAdmin,
              async (args) => fetchTavilyResearch((args as { query: string }).query),
              existingConversationId ?? undefined,
            );
            toolResult = result ? JSON.stringify(result) : 'No results found.';
          } else if (toolName === 'apollo_search') {
            toolResult = await executeApolloSearch(toolCtx);
            logToolExecution(supabaseAdmin, userId, agentId, 'apollo_search', t0, 'success');
          } else if (toolName === 'posthog_query') {
            toolResult = await executePosthogQuery(toolCtx);
            logToolExecution(supabaseAdmin, userId, agentId, 'posthog_query', t0, 'success');
          } else if (toolName === 'calendly_link') {
            toolResult = await executeCalendlyLink(toolCtx);
            logToolExecution(supabaseAdmin, userId, agentId, 'calendly_link', t0, 'success');
          }
        } catch (err) {
          toolResult = `Tool failed: ${err instanceof Error ? err.message : 'unknown error'}`;
          logToolExecution(supabaseAdmin, userId, agentId, toolName, t0, 'error', toolResult);
        }

        // Capture any partial text the LLM emitted before the tool call
        if (llmResponse.text) chatReply = (chatReply ?? '') + llmResponse.text + '\n\n';

        // Re-inject tool result so LLM can reason about it
        loopMessages = [
          ...loopMessages,
          { role: 'assistant' as const, content: llmResponse.text || `[calling ${toolName}]` },
          {
            role: 'user' as const,
            content: `[Tool result: ${toolName}]\n${toolResult}\n\nContinue helping the founder based on these results.`,
          },
        ];
        continue; // loop — LLM will see the result and reason again
      }

      // ── Execution tools: execute action and break ────────────────────
      if (EXEC_TOOLS.has(toolName)) {
        const t0Exec = Date.now();
        try {
          let execResult = '';
          if (toolName === 'create_deal') {
            execResult = await executeCreateDeal(toolCtx, userId, supabaseAdmin, agentId);
          } else if (toolName === 'send_outreach_sequence') {
            execResult = await executeSendOutreachSequence(toolCtx, userId, supabaseAdmin, agentId);
          } else if (toolName === 'bulk_enrich_pipeline') {
            execResult = await executeBulkEnrichPipeline(toolCtx, userId, supabaseAdmin, agentId);
          } else if (toolName === 'schedule_followup') {
            execResult = await executeScheduleFollowup(toolCtx, userId, supabaseAdmin, agentId);
          }
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
        const parsedContent = await generateArtifactJSON(artifactPrompt);
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
          void scoreFromArtifact(userId, toolName, parsedContent, supabaseAdmin).catch(() => { /* fire-and-forget: non-critical score nudge */ });
          // Write extracted facts to world model + refresh goal + trigger delegations
          const stateUpdates = extractStateFromArtifact(agentId, toolName, parsedContent);
          if (Object.keys(stateUpdates).length > 0) {
            void (async () => {
              await updateStartupState(userId, stateUpdates, agentId, supabaseAdmin);
              const freshState = await getStartupState(userId, supabaseAdmin);
              if (freshState) void upsertAgentGoal(agentId, userId, freshState, supabaseAdmin);
              void triggerProactiveDelegations(agentId, userId, startupState, stateUpdates, supabaseAdmin);
            })();
          }
        }

        if (FF_ARTIFACT_SELF_CRITIQUE && artifactId && userId) {
          void (async () => {
            try {
              const critique = await critiqueArtifact(toolName, parsedContent);
              let finalContent = parsedContent;
              if (critique.needsPatch) finalContent = await patchArtifact(toolName, parsedContent, critique);
              await supabaseAdmin.from('agent_artifacts').update({
                content: finalContent, critique_metadata: critique,
              }).eq('id', artifactId!);
            } catch { /* non-critical */ }
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
        log.warn('Message persistence failed — response still returned to client');
      }

      // Async session summary + relationship memory update (fire-and-forget, Haiku)
      const allMsgs = [
        ...(conversationHistory || []),
        { role: 'user', content: message },
        { role: 'assistant', content: chatReply ?? '' },
      ];
      // fire-and-forget: session summary + memory updates enrich future context;
      // the JSON response is already prepared when these run
      if (conversationId) {
        void summariseAndSaveSession(conversationId, allMsgs, supabaseAdmin).catch(() => {});
      }
      void updateAgentMemory(userId, agentId, allMsgs, supabaseAdmin).catch(() => {});
      // GAP 1: infer P1.4 (iteration) and P1.5 (team alignment) from founder message
      if (agentId === 'patel' && patelRawScores?.['icp.specificity'] &&
          (!patelRawScores['icp.iteration'] || !patelRawScores['icp.team_alignment']) &&
          message.length > 20) {
        void inferIterationAndAlignmentFromMessage(userId, message, patelRawScores, supabaseAdmin)
      }
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
