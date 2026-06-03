/**
 * Tool Runner — all LOOP_TOOLS and EXEC_TOOLS execution logic.
 *
 * Extracted from app/api/agents/chat/route.ts to reduce file size and
 * make tool behaviour independently testable.
 *
 * Two public exports:
 *   runLoopTool  — data-retrieval tools that loop back into the LLM
 *   runExecTool  — side-effect tools that break the loop after executing
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { executeTool } from '@/lib/tools/executor'
import { withCircuitBreaker } from '@/lib/circuit-breaker'
import { routedText } from '@/lib/llm/router'
import { log } from '@/lib/logger'

// Agent system prompts — used by delegate_to_agent to call target agent inline
import { patelSystemPrompt }  from '@/features/agents/patel/prompts/system-prompt'
import { susiSystemPrompt }   from '@/features/agents/susi/prompts/system-prompt'
import { mayaSystemPrompt }   from '@/features/agents/maya/prompts/system-prompt'
import { felixSystemPrompt }  from '@/features/agents/felix/prompts/system-prompt'
import { leoSystemPrompt }    from '@/features/agents/leo/prompts/system-prompt'
import { harperSystemPrompt } from '@/features/agents/harper/prompts/system-prompt'
import { novaSystemPrompt }   from '@/features/agents/nova/prompts/system-prompt'
import { atlasSystemPrompt }  from '@/features/agents/atlas/prompts/system-prompt'
import { sageSystemPrompt }   from '@/features/agents/sage/prompts/system-prompt'
import { carterSystemPrompt } from '@/features/agents/carter/prompts/system-prompt'
import { rileySystemPrompt }  from '@/features/agents/riley/prompts/system-prompt'

const AGENT_PROMPTS: Record<string, string> = {
  patel: patelSystemPrompt, susi: susiSystemPrompt, maya: mayaSystemPrompt,
  felix: felixSystemPrompt, leo: leoSystemPrompt,   harper: harperSystemPrompt,
  nova:  novaSystemPrompt,  atlas: atlasSystemPrompt, sage: sageSystemPrompt,
  carter: carterSystemPrompt, riley: rileySystemPrompt,
}

// ─── Context type passed to all runners ───────────────────────────────────────

export interface ToolRunContext {
  userId: string | undefined
  supabaseAdmin: SupabaseClient
  agentId: string
  existingConversationId: string | null | undefined
}

// ─── Logging helper ───────────────────────────────────────────────────────────

export function logToolExecution(
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
  })
}

// ─── Individual tool implementations ─────────────────────────────────────────

export async function fetchTavilyResearch(query: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) { log.warn('TAVILY_API_KEY not configured — skipping research'); return null }

  return withCircuitBreaker('tavily', async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({ api_key: apiKey, query, search_depth: 'advanced', max_results: 8, include_answer: true, include_raw_content: false }),
    })
    clearTimeout(timer)
    if (!res.ok) { log.error('Tavily error:', res.statusText); return null }
    const data = await res.json()
    return {
      answer: data.answer ?? null,
      results: (data.results || []).map((r: { title: string; url: string; content: string }) => ({
        title: r.title, url: r.url, snippet: r.content?.slice(0, 400),
      })),
    }
  }, null)
}

export async function executeLeadEnrich(domain: string): Promise<string> {
  const apiKey = process.env.HUNTER_API_KEY
  if (!apiKey) return '*Lead enrichment requires a Hunter.io API key. Set `HUNTER_API_KEY`.*'
  const cleanDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/.*/, '').trim()
  if (!cleanDomain) return '*No domain provided for lead enrichment.*'

  return withCircuitBreaker('hunter_io', async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(`https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(cleanDomain)}&limit=10&api_key=${apiKey}`, { signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return `Could not enrich ${cleanDomain} — Hunter.io returned ${res.status}.`
    const data = await res.json() as { data?: { organization?: string; emails?: Array<{ value: string; first_name?: string; last_name?: string; position?: string; confidence: number }> }; meta?: { results: number } }
    const emails = data.data?.emails ?? []
    const leads = emails.filter(e => e.value && e.confidence >= 50).sort((a, b) => b.confidence - a.confidence).slice(0, 8)
    if (leads.length === 0) return `No high-confidence leads found at **${cleanDomain}**.`
    const org = data.data?.organization ?? cleanDomain
    let result = `**${leads.length} leads found at ${org} (${cleanDomain}):**\n\n`
    result += '| Name | Email | Title | Confidence |\n|------|-------|-------|------------|\n'
    for (const lead of leads) {
      const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || '—'
      result += `| ${name} | ${lead.value} | ${lead.position || '—'} | ${lead.confidence}% |\n`
    }
    return result
  }, '*Hunter.io is temporarily unavailable. Please try again in a few minutes.*')
}

export async function executeApolloSearch(ctx: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) return '*Apollo.io API key not configured. Set `APOLLO_API_KEY` to enable lead search.*'

  return withCircuitBreaker('apollo_io', async () => {
    const payload: Record<string, unknown> = { page: 1, per_page: (ctx.per_page as number) ?? 25 }
    if (ctx.job_titles) payload.person_titles = ctx.job_titles
    if (ctx.industries) payload.organization_industry_tag_values = ctx.industries
    if (ctx.locations)  payload.person_locations = ctx.locations
    if (ctx.keywords)   payload.q_keywords = ctx.keywords
    if (ctx.employee_count_min || ctx.employee_count_max) {
      payload.organization_num_employees_ranges = [`${ctx.employee_count_min ?? 1},${ctx.employee_count_max ?? 10000}`]
    }
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    const res = await fetch('https://api.apollo.io/v1/mixed_people/search', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }, signal: ctrl.signal, body: JSON.stringify(payload),
    })
    clearTimeout(timer)
    if (!res.ok) return `Apollo search failed: ${res.status} ${res.statusText}`
    const data = await res.json() as { people?: Array<Record<string, unknown>> }
    const people = data.people ?? []
    if (people.length === 0) return 'No leads found matching those criteria. Try broadening the search.'
    const lines = people.slice(0, 20).map((p: Record<string, unknown>) => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Unknown'
      return `• ${name} | ${(p.title as string) || '—'} | ${((p.organization as Record<string, unknown>)?.name as string) || '—'} | ${(p.email as string) || '—'} | ${(p.linkedin_url as string) || '—'}`
    })
    return `Found ${people.length} leads:\n${lines.join('\n')}`
  }, '*Apollo.io is temporarily unavailable. Please try again shortly.*')
}

export async function executePosthogQuery(ctx: Record<string, unknown>): Promise<string> {
  const apiKey = process.env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID
  if (!apiKey || !projectId) return '*PostHog not configured. Set `POSTHOG_API_KEY` and `POSTHOG_PROJECT_ID`.*'
  const queryType = (ctx.query_type as string) || 'active_users'
  const dateFrom  = (ctx.date_range as string) || '-30d'

  return withCircuitBreaker('posthog', async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 15_000)
    const base = `https://app.posthog.com/api/projects/${projectId}`
    const headers = { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
    let result = ''
    if (queryType === 'retention') {
      const res = await fetch(`${base}/insights/retention/`, { method: 'POST', headers, signal: ctrl.signal, body: JSON.stringify({ date_from: dateFrom, period: 'Week', target_event: { id: '$pageview', name: '$pageview', type: 'events' } }) })
      clearTimeout(timer)
      if (!res.ok) return `PostHog retention query failed: ${res.status}`
      const data = await res.json() as { result?: Array<{ date: string; values: Array<{ count: number }> }> }
      const rows = (data.result ?? []).slice(0, 8)
      if (rows.length === 0) return 'No retention data available.'
      result = 'Retention cohorts:\n' + rows.map(r => `Week of ${r.date}: ${r.values.map((v, i) => `Day${i * 7}: ${v.count}`).join(', ')}`).join('\n')
    } else {
      const res = await fetch(`${base}/insights/trend/`, { method: 'POST', headers, signal: ctrl.signal, body: JSON.stringify({ date_from: dateFrom, events: [{ id: '$pageview', name: '$pageview', type: 'events' }], interval: 'week' }) })
      clearTimeout(timer)
      if (!res.ok) return `PostHog trends query failed: ${res.status}`
      const data = await res.json() as { result?: Array<{ label: string; data: number[]; days: string[] }> }
      const series = (data.result ?? [])[0]
      if (!series) return 'No trend data available.'
      const points = series.days.slice(-6).map((d, i) => `${d}: ${series.data[series.data.length - 6 + i] ?? 0}`)
      result = `${queryType} trend (last 6 weeks):\n${points.join('\n')}`
    }
    return result || 'Query returned no data.'
  }, '*PostHog is temporarily unavailable. Please try again shortly.*')
}

export async function executeCalendlyLink(ctx: Record<string, unknown>): Promise<string> {
  const apiKey  = process.env.CALENDLY_API_KEY
  const userUri = process.env.CALENDLY_USER_URI
  if (!apiKey || !userUri) return '*Calendly not configured. Set `CALENDLY_API_KEY` and `CALENDLY_USER_URI`.*'

  return withCircuitBreaker('calendly', async () => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 10_000)
    const res = await fetch(`https://api.calendly.com/event_types?user=${encodeURIComponent(userUri)}&count=20`, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal: ctrl.signal })
    clearTimeout(timer)
    if (!res.ok) return `Calendly API error: ${res.status}`
    const data = await res.json() as { collection?: Array<{ scheduling_url: string; name: string; duration: number; slug: string }> }
    const types = data.collection ?? []
    const meetingType = (ctx.meeting_type as string) || 'demo'
    const wantDuration = (ctx.duration_minutes as number) || 30
    const match = types.find(e => e.slug?.toLowerCase().includes(meetingType) || e.name?.toLowerCase().includes(meetingType)) ?? types.find(e => e.duration === wantDuration) ?? types[0]
    if (!match) return 'No matching Calendly event types found.'
    return `Calendly booking link generated:\n**${match.name}** (${match.duration} min)\n${match.scheduling_url}`
  }, '*Calendly is temporarily unavailable. Please try again shortly.*')
}

export async function executeDelegateToAgent(
  targetAgentId: string,
  task: string,
  context: string | undefined,
): Promise<string> {
  const targetPrompt = AGENT_PROMPTS[targetAgentId]
  if (!targetPrompt) return `Unknown agent: ${targetAgentId}`
  const userContent = [
    context ? `CONTEXT FROM REQUESTING AGENT:\n${context}` : '',
    `TASK:\n${task}`,
    'Respond concisely with expert output. Focus only on what was asked — do not ask clarifying questions.',
  ].filter(Boolean).join('\n\n')
  try {
    const result = await routedText('generation', [
      { role: 'system', content: targetPrompt },
      { role: 'user', content: userContent },
    ], { maxTokens: 1500 })
    return `[${targetAgentId.toUpperCase()} RESPONSE]\n${result}`
  } catch {
    return `Delegation to ${targetAgentId} failed — continuing without their input.`
  }
}

export async function executeCreateDeal(ctx: Record<string, unknown>, userId: string | undefined, supabaseAdmin: SupabaseClient, agentId: string): Promise<string> {
  const company = (ctx.company as string) || ''
  if (!company || !userId) return 'Deal not created — missing company name or unauthenticated.'
  const stage = (ctx.stage as string) || 'lead'
  const dealValue = typeof ctx.value === 'number' ? ctx.value : undefined
  const { data: deal } = await supabaseAdmin.from('deals').insert({
    user_id: userId, company,
    contact_name:  (ctx.contact_name  as string) ?? null,
    contact_email: (ctx.contact_email as string) ?? null,
    contact_title: (ctx.contact_title as string) ?? null,
    stage: ['lead','qualified','proposal','negotiating','won','lost'].includes(stage) ? stage : 'lead',
    value: dealValue ?? null, notes: (ctx.notes as string) ?? null, source: 'susi_chat',
  }).select().single()
  if (!deal) return `Failed to create deal for ${company}.`
  void supabaseAdmin.from('agent_activity').insert({ user_id: userId, agent_id: agentId, action_type: 'deal_created', description: `Added ${company} to pipeline as ${stage}`, metadata: { deal_id: deal.id, company, stage, value: dealValue } })
  return [`Deal created: **${company}**`, dealValue ? `Value: $${dealValue.toLocaleString()}` : null, `Stage: ${stage}`, (ctx.contact_email as string) ? `Contact: ${(ctx.contact_name as string) || (ctx.contact_email as string)}` : null].filter(Boolean).join(' · ')
}

export async function executeSendOutreachSequence(ctx: Record<string, unknown>, userId: string | undefined, supabaseAdmin: SupabaseClient, agentId: string): Promise<string> {
  if (!userId) return 'Cannot send emails — user not authenticated.'
  const contacts = (ctx.contacts as Array<{ name: string; email: string; company?: string }>) ?? []
  const steps = (ctx.sequence_steps as Array<{ subject: string; body: string }>) ?? []
  if (contacts.length === 0) return 'No contacts provided. Run apollo_search first to find leads.'
  if (steps.length === 0) return 'No sequence steps provided. Generate an outreach_sequence artifact first.'
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/agents/outreach/send`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': userId }, body: JSON.stringify({ contacts, steps, agentId }) })
  if (!res.ok) return `Outreach send failed: ${res.status} ${res.statusText}`
  const data = await res.json() as { sent?: number; failed?: number; pipelineAdded?: number }
  void supabaseAdmin.from('agent_activity').insert({ user_id: userId, agent_id: agentId, action_type: 'outreach_sent', description: `Sent outreach to ${data.sent ?? 0} contacts`, metadata: { sent: data.sent, failed: data.failed, pipeline_added: data.pipelineAdded } })
  return `Outreach sent: **${data.sent ?? 0} emails dispatched**, ${data.failed ?? 0} failed, ${data.pipelineAdded ?? 0} contacts added to pipeline.`
}

export async function executeBulkEnrichPipeline(ctx: Record<string, unknown>, userId: string | undefined, supabaseAdmin: SupabaseClient, agentId: string): Promise<string> {
  if (!userId) return 'Cannot enrich pipeline — user not authenticated.'
  const apiKey = process.env.APOLLO_API_KEY
  if (!apiKey) return '*Apollo.io API key not configured.*'
  const payload: Record<string, unknown> = { page: 1, per_page: (ctx.per_page as number) ?? 50 }
  if (ctx.job_titles) payload.person_titles = ctx.job_titles
  if (ctx.industries) payload.organization_industry_tag_values = ctx.industries
  if (ctx.locations)  payload.person_locations = ctx.locations
  if (ctx.keywords)   payload.q_keywords = ctx.keywords
  if (ctx.employee_count_min || ctx.employee_count_max) payload.organization_num_employees_ranges = [`${ctx.employee_count_min ?? 1},${ctx.employee_count_max ?? 10000}`]
  const res = await fetch('https://api.apollo.io/v1/mixed_people/search', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Api-Key': apiKey }, body: JSON.stringify(payload) })
  if (!res.ok) return `Apollo search failed: ${res.status}`
  const data = await res.json() as { people?: Array<Record<string, unknown>> }
  const people = data.people ?? []
  if (people.length === 0) return 'No leads found. Try broadening the search criteria.'
  const rows = people.map((p: Record<string, unknown>) => ({ user_id: userId, company: ((p.organization as Record<string, unknown>)?.name as string) || 'Unknown', contact_name: [p.first_name, p.last_name].filter(Boolean).join(' ') || null, contact_email: (p.email as string) || null, contact_title: (p.title as string) || null, stage: 'lead', source: `${agentId}_bulk_enrich` }))
  const { error } = await supabaseAdmin.from('deals').insert(rows)
  if (error) return `Pipeline insert failed: ${error.message}`
  void supabaseAdmin.from('agent_activity').insert({ user_id: userId, agent_id: agentId, action_type: 'pipeline_enriched', description: `Bulk added ${rows.length} leads from Apollo`, metadata: { count: rows.length } })
  return `Pipeline enriched: **${rows.length} leads added** from Apollo search.`
}

export async function executeScheduleFollowup(ctx: Record<string, unknown>, userId: string | undefined, supabaseAdmin: SupabaseClient, agentId: string): Promise<string> {
  if (!userId) return 'Cannot schedule follow-up — user not authenticated.'
  const actionType  = (ctx.action_type as string) || 'followup_check'
  const daysFromNow = (ctx.days_from_now as number) || 3
  const dealId = ctx.deal_id as string | undefined
  const executeAt = new Date()
  executeAt.setDate(executeAt.getDate() + daysFromNow)
  const { error } = await supabaseAdmin.from('scheduled_actions').insert({ user_id: userId, agent_id: agentId, action_type: actionType, payload: { ...(ctx.payload as Record<string, unknown> || {}), deal_id: dealId, company: ctx.company }, execute_at: executeAt.toISOString(), status: 'pending' })
  if (error) return `Failed to schedule follow-up: ${error.message}`
  if (dealId) await supabaseAdmin.from('deals').update({ next_action: actionType, next_action_date: executeAt.toISOString().split('T')[0] }).eq('id', dealId).eq('user_id', userId)
  void supabaseAdmin.from('agent_activity').insert({ user_id: userId, agent_id: agentId, action_type: 'followup_scheduled', description: `Scheduled ${actionType} for Day +${daysFromNow}${ctx.company ? ` — ${ctx.company}` : ''}`, metadata: { action_type: actionType, execute_at: executeAt.toISOString(), deal_id: dealId } })
  return `Follow-up scheduled: **${actionType}** set for ${executeAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} (Day +${daysFromNow}).${dealId ? ' Deal updated.' : ''}`
}

export async function executeInitiateVoiceCall(_ctx: Record<string, unknown>, _userId: string | undefined, _supabaseAdmin: SupabaseClient, _agentId: string): Promise<string> {
  return 'AI voice calls are coming in a future update. For now, use **calendly_link** to generate a booking link and share it with your prospect to schedule a call.'
}

// ─── Dispatchers ──────────────────────────────────────────────────────────────

/**
 * Execute a LOOP_TOOL and return its string result.
 * The result is injected back as a tool_result content block so the LLM continues reasoning.
 */
export async function runLoopTool(
  toolName: string,
  toolCtx: Record<string, unknown>,
  ctx: ToolRunContext,
): Promise<string> {
  const { userId, supabaseAdmin, existingConversationId } = ctx
  if (toolName === 'lead_enrich') {
    const { result } = await executeTool('lead_enrich', { domain: (toolCtx.domain as string) || '' }, userId, supabaseAdmin, async (a) => executeLeadEnrich((a as { domain: string }).domain), existingConversationId ?? undefined)
    return result as string
  }
  if (toolName === 'web_research') {
    const { result } = await executeTool('web_research', { query: (toolCtx.query as string) || '' }, userId, supabaseAdmin, async (a) => fetchTavilyResearch((a as { query: string }).query), existingConversationId ?? undefined)
    return result ? JSON.stringify(result) : 'No results found.'
  }
  if (toolName === 'apollo_search')    return executeApolloSearch(toolCtx)
  if (toolName === 'posthog_query')    return executePosthogQuery(toolCtx)
  if (toolName === 'calendly_link')    return executeCalendlyLink(toolCtx)
  if (toolName === 'delegate_to_agent') return executeDelegateToAgent(toolCtx.agentId as string, toolCtx.task as string, toolCtx.context as string | undefined)
  return `Unknown loop tool: ${toolName}`
}

/**
 * Execute an EXEC_TOOL (side-effect action) and return its result string.
 * Caller is responsible for breaking the loop after this returns.
 */
export async function runExecTool(
  toolName: string,
  toolCtx: Record<string, unknown>,
  ctx: ToolRunContext,
): Promise<string> {
  const { userId, supabaseAdmin, agentId } = ctx
  if (toolName === 'create_deal')              return executeCreateDeal(toolCtx, userId, supabaseAdmin, agentId)
  if (toolName === 'send_outreach_sequence')   return executeSendOutreachSequence(toolCtx, userId, supabaseAdmin, agentId)
  if (toolName === 'initiate_voice_call' || toolName === 'vapi_call') return executeInitiateVoiceCall(toolCtx, userId, supabaseAdmin, agentId)
  if (toolName === 'bulk_enrich_pipeline')     return executeBulkEnrichPipeline(toolCtx, userId, supabaseAdmin, agentId)
  if (toolName === 'schedule_followup')        return executeScheduleFollowup(toolCtx, userId, supabaseAdmin, agentId)
  return `Unknown exec tool: ${toolName}`
}
