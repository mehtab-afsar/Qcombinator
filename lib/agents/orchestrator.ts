/**
 * Cross-Agent Orchestration Layer
 *
 * Allows any primary agent to automatically pull context from other agents
 * without requiring the founder to visit each agent manually.
 *
 * v2 improvements over the original:
 *   1. Topic-aware routing — classify the message first, then only pull agents
 *      relevant to that topic. Sage no longer loads all 5 agents on every turn.
 *   2. Real artifact content — instead of extracting 2-3 hardcoded fields,
 *      serialize the full artifact as readable key:value text (up to 600 chars).
 *      The receiving agent sees the actual output, not a shallow summary.
 *   3. Startup state in mini-briefs — when an artifact doesn't exist, the
 *      mini-brief LLM call receives actual startup metrics instead of just
 *      the raw user message.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { tieredText } from '@/lib/llm/router';
import type { StartupState } from '@/lib/agents/startup-state';

// ─── Topic classification ─────────────────────────────────────────────────────
// Keyword → topic mapping (regex, no LLM call needed)

type Topic =
  | 'fundraising'
  | 'gtm_sales'
  | 'hiring_team'
  | 'product_pmf'
  | 'legal_compliance'
  | 'financial_runway'
  | 'competitive'
  | 'strategic'
  | 'general'

const TOPIC_PATTERNS: Array<{ topic: Topic; pattern: RegExp }> = [
  { topic: 'fundraising',       pattern: /\b(raise|fundrais|investor|pitch|deck|term sheet|due diligence|seed|series [abc]|valuation|cap table|dilut|round)\b/i },
  { topic: 'gtm_sales',         pattern: /\b(gtm|go.to.market|icp|lead|outreach|pipeline|prospect|close|deal|conversion|sales|revenue|customer acquisition|cac|channel)\b/i },
  { topic: 'hiring_team',       pattern: /\b(hire|hiring|recruit|headcount|team|salary|comp|equity|role|jd|job description|org|culture|onboard)\b/i },
  { topic: 'product_pmf',       pattern: /\b(product|feature|roadmap|pmf|retention|churn|nps|user|feedback|survey|launch|sprint|eng|tech)\b/i },
  { topic: 'legal_compliance',  pattern: /\b(legal|contract|ip|patent|gdpr|compliance|terms|privacy|equity|vesting|cliff|cap table|entity|incorporation)\b/i },
  { topic: 'financial_runway',  pattern: /\b(runway|burn|cash|mrr|arr|revenue|model|forecast|unit economics|cogs|margin|p&l|budget)\b/i },
  { topic: 'competitive',       pattern: /\b(competitor|competition|market map|landscape|differentiat|positioning|battle card|vs\.|versus)\b/i },
  { topic: 'strategic',         pattern: /\b(strategy|okr|goal|priorit|focus|roadmap|vision|mission|pivot|north star|quarter|annual)\b/i },
]

function classifyTopic(message: string): Topic {
  for (const { topic, pattern } of TOPIC_PATTERNS) {
    if (pattern.test(message)) return topic
  }
  return 'general'
}

// ─── Topic → relevant agents ──────────────────────────────────────────────────
// Only these agents' context is pulled for each topic.
// More focused than the old static full-dependency map.

const TOPIC_AGENTS: Record<Topic, string[]> = {
  fundraising:      ['felix', 'sage', 'patel'],         // financials + strategic + GTM story
  gtm_sales:        ['patel', 'atlas', 'maya'],          // ICP + competitive + brand
  hiring_team:      ['harper', 'felix'],                 // hiring plan + budget
  product_pmf:      ['nova', 'atlas', 'patel'],          // PMF + competitive gaps + ICP
  legal_compliance: ['leo', 'felix'],                    // legal + financials
  financial_runway: ['felix', 'sage'],                   // financial + strategic context
  competitive:      ['atlas', 'patel', 'maya'],          // competitive + ICP + positioning
  strategic:        ['sage', 'felix', 'atlas', 'patel'], // strategy + finance + market + GTM
  general:          ['patel', 'felix'],                  // default: ICP + financial health
}

// For each primary agent, what topics are actually relevant to pull cross-agent context for?
// If the message is off-topic for this agent, skip orchestration entirely.
const AGENT_RELEVANT_TOPICS: Record<string, Topic[]> = {
  patel:  ['gtm_sales', 'competitive', 'fundraising', 'strategic', 'general'],
  susi:   ['gtm_sales', 'competitive', 'general'],
  maya:   ['gtm_sales', 'competitive', 'strategic', 'general'],
  felix:  ['financial_runway', 'fundraising', 'strategic', 'hiring_team', 'general'],
  leo:    ['legal_compliance', 'fundraising', 'hiring_team', 'general'],
  harper: ['hiring_team', 'financial_runway', 'strategic', 'general'],
  nova:   ['product_pmf', 'competitive', 'gtm_sales', 'general'],
  atlas:  ['competitive', 'gtm_sales', 'strategic', 'product_pmf', 'general'],
  sage:   ['strategic', 'fundraising', 'financial_runway', 'gtm_sales', 'competitive', 'hiring_team', 'product_pmf', 'general'],
}

// Artifact type to fetch for each agent
const AGENT_PRIMARY_ARTIFACT: Record<string, string> = {
  patel:  'icp_document',
  susi:   'sales_script',
  maya:   'brand_messaging',
  felix:  'financial_summary',
  leo:    'legal_checklist',
  harper: 'hiring_plan',
  nova:   'pmf_survey',
  atlas:  'competitive_matrix',
  sage:   'strategic_plan',
}

// Mini-brief prompts — used when no artifact exists yet
// Now receive full startup state context, not just the user message
const MINI_BRIEF_PROMPTS: Record<string, string> = {
  maya:   'You are a brand strategist. Given the founder and startup context, write 3-4 sentences covering: brand voice (tone, personality), the core value proposition in plain language, and the primary target audience. Be specific to this startup.',
  atlas:  'You are a competitive analyst. Given the founder and startup context, write 3-4 sentences covering: the 2-3 most likely competitors, the key differentiator this startup has, and the biggest competitive risk.',
  felix:  'You are a CFO advisor. Given the founder and startup context, write 3-4 sentences covering: current financial stage, the most important financial metric to track right now, and the biggest financial risk.',
  patel:  'You are a GTM strategist. Given the founder and startup context, write 3-4 sentences covering: the most likely ICP (job title, company size, industry), the primary acquisition channel, and the biggest GTM obstacle.',
  nova:   'You are a Chief Product Officer. Given the founder and startup context, write 3-4 sentences covering: the current product-market fit signal, the biggest user feedback theme, and the highest-priority product decision.',
  sage:   'You are a CEO advisor. Given the founder and startup context, write 3-4 sentences covering: the single most important strategic priority right now, the key risk to the business model, and the most critical thing to prove in the next 90 days.',
  harper: 'You are a people advisor. Given the founder and startup context, write 3-4 sentences covering: the most critical missing hire, the team\'s biggest capability gap, and a realistic hiring timeline given the startup stage.',
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SubAgentResult {
  agentId: string
  source: 'existing_artifact' | 'mini_brief'
  content: string
}

export interface OrchestrationResult {
  subAgentResults: SubAgentResult[]
  contextInjection: string
  subCallsUsed: number
}

// ─── Artifact serializer ──────────────────────────────────────────────────────
// Converts artifact JSON to readable text. Generic — works for any agent.
// Flattens one level of nesting, formats as "Key: value" pairs.

function serializeArtifact(artifact: Record<string, unknown>, agentId: string, maxChars = 600): string {
  const lines: string[] = []

  function addValue(key: string, value: unknown) {
    if (value === null || value === undefined || value === '') return
    const label = key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()
    const labelCap = label.charAt(0).toUpperCase() + label.slice(1)

    if (Array.isArray(value)) {
      const items = value
        .slice(0, 4)
        .map(v => (typeof v === 'object' && v !== null
          ? Object.values(v as Record<string, unknown>).slice(0, 2).join(' — ')
          : String(v)))
        .join(', ')
      if (items) lines.push(`${labelCap}: ${items}`)
    } else if (typeof value === 'object') {
      // Flatten one level
      const nested = value as Record<string, unknown>
      const sub = Object.entries(nested)
        .slice(0, 3)
        .map(([k, v]) => `${k}: ${String(v).slice(0, 60)}`)
        .join(' | ')
      if (sub) lines.push(`${labelCap}: ${sub}`)
    } else {
      lines.push(`${labelCap}: ${String(value).slice(0, 120)}`)
    }
  }

  // Agent-specific priority fields come first
  const PRIORITY: Record<string, string[]> = {
    patel:  ['buyerPersona', 'recommendedChannels', 'primaryPain', 'positioningStatement', 'firmographics'],
    felix:  ['metrics', 'runway', 'keyRisks', 'recommendations', 'fundraisingReadiness'],
    atlas:  ['competitors', 'positioningStatement', 'marketInsight', 'keyDifferentiator'],
    maya:   ['positioningStatement', 'voiceGuide', 'messagingPillars', 'targetAudience'],
    nova:   ['pmfScore', 'keyFindings', 'topFrictions', 'recommendations'],
    sage:   ['strategicPriorities', 'keyRisks', 'okrs', 'investorReadiness'],
    harper: ['roleTitle', 'requirements', 'compensationRange', 'sourcingStrategy'],
  }

  const priority = PRIORITY[agentId] ?? []
  const remaining = Object.keys(artifact).filter(k => !priority.includes(k))

  for (const key of [...priority, ...remaining]) {
    if (!(key in artifact)) continue
    addValue(key, artifact[key])
    // Stop when we've hit the char budget
    if (lines.join('\n').length > maxChars) break
  }

  return lines.join('\n').slice(0, maxChars)
}

// ─── Startup state formatter ──────────────────────────────────────────────────

function formatStartupStateForMini(state: StartupState | null): string {
  if (!state) return ''
  const parts: string[] = []
  if (state.company_name)      parts.push(`Company: ${state.company_name}`)
  if (state.industry)          parts.push(`Industry: ${state.industry}`)
  if (state.stage)             parts.push(`Stage: ${state.stage}`)
  if (state.mrr !== undefined && state.mrr !== null) parts.push(`MRR: $${state.mrr}`)
  if (state.monthly_burn !== undefined && state.monthly_burn !== null) parts.push(`Monthly burn: $${state.monthly_burn}`)
  if (state.runway_months !== undefined && state.runway_months !== null) parts.push(`Runway: ${state.runway_months} months`)
  if (state.paying_customer_count !== undefined && state.paying_customer_count !== null) parts.push(`Paying customers: ${state.paying_customer_count}`)
  if (state.pmf_score !== undefined && state.pmf_score !== null) parts.push(`PMF score: ${state.pmf_score}/100`)
  if (state.team_size !== undefined && state.team_size !== null) parts.push(`Team size: ${state.team_size}`)
  return parts.join(' | ')
}

// ─── Main orchestration function ──────────────────────────────────────────────

export async function orchestrate(
  primaryAgentId: string,
  userId: string,
  userMessage: string,
  supabase: SupabaseClient,
  maxSubCalls = 2,
  startupState: StartupState | null = null,
): Promise<OrchestrationResult> {

  // Step 1: classify the topic from the user's message
  const topic = classifyTopic(userMessage)

  // Step 2: check if this agent even cares about cross-agent context for this topic
  const relevantTopics = AGENT_RELEVANT_TOPICS[primaryAgentId] ?? ['general']
  if (!relevantTopics.includes(topic) && topic !== 'general') {
    return { subAgentResults: [], contextInjection: '', subCallsUsed: 0 }
  }

  // Step 3: get the agents relevant to this topic, excluding the primary agent itself
  const depsForTopic = (TOPIC_AGENTS[topic] ?? TOPIC_AGENTS.general)
    .filter(id => id !== primaryAgentId)

  if (depsForTopic.length === 0) {
    return { subAgentResults: [], contextInjection: '', subCallsUsed: 0 }
  }

  // Step 4: fetch existing artifacts for the relevant agents
  const { data: existingArtifacts } = await supabase
    .from('agent_artifacts')
    .select('agent_id, artifact_type, content')
    .eq('user_id', userId)
    .in('agent_id', depsForTopic)
    .order('created_at', { ascending: false })

  const existingMap = new Map<string, Record<string, unknown>>()
  for (const row of existingArtifacts ?? []) {
    // Keep the most recent artifact per agent
    if (!existingMap.has(row.agent_id)) {
      existingMap.set(row.agent_id, row.content as Record<string, unknown>)
    }
  }
  void AGENT_PRIMARY_ARTIFACT // keep reference for future typed fetching

  // Step 5: build results — prefer existing artifacts, fall back to mini-briefs
  const results: SubAgentResult[] = []
  let subCallsUsed = 0
  const stateContext = formatStartupStateForMini(startupState)

  for (const depAgentId of depsForTopic) {
    if (existingMap.has(depAgentId)) {
      // Real artifact exists — serialize its content properly
      const content = serializeArtifact(existingMap.get(depAgentId)!, depAgentId)
      if (content.trim()) {
        results.push({ agentId: depAgentId, source: 'existing_artifact', content })
      }
    } else if (subCallsUsed < maxSubCalls && MINI_BRIEF_PROMPTS[depAgentId]) {
      // No artifact — run a grounded mini-brief with actual startup context
      subCallsUsed++
      try {
        const brief = await tieredText('economy', [
          { role: 'system', content: MINI_BRIEF_PROMPTS[depAgentId] },
          {
            role: 'user',
            content: [
              stateContext ? `Startup context: ${stateContext}` : '',
              `Founder message: ${userMessage.slice(0, 300)}`,
            ].filter(Boolean).join('\n'),
          },
        ], { maxTokens: 300 })
        if (brief.trim().length > 20) {
          results.push({ agentId: depAgentId, source: 'mini_brief', content: brief.trim() })
        }
      } catch {
        // Sub-call failed — skip this dependency (non-blocking)
      }
    }

    // Cap at 4 context blocks total — quality over quantity
    if (results.length >= 4) break
  }

  if (results.length === 0) {
    return { subAgentResults: [], contextInjection: '', subCallsUsed }
  }

  const contextInjection = results
    .map(r => {
      const label = r.agentId.toUpperCase()
      const source = r.source === 'mini_brief' ? ' (synthesised — no artifact yet)' : ''
      return `[${label} CONTEXT${source}]\n${r.content}`
    })
    .join('\n\n')

  return { subAgentResults: results, contextInjection, subCallsUsed }
}
