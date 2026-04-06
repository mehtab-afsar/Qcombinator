/**
 * Founder Profile Context for Agent Prompts
 *
 * Fetches the founder's structured profile builder data server-side
 * and formats it as a compact FOUNDER PROFILE block injected into
 * every agent's system prompt.
 *
 * This closes the gap where agents were blind to profile builder data
 * and founders had to repeat their business basics in every conversation.
 *
 * Token budget: ~200–280 tokens (compact, only non-null fields).
 * Runs in parallel with getAgentContext() — zero extra latency.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { mergeToAssessmentData } from '../profile-builder/data-merger'
import type { SectionData } from '../profile-builder/data-merger'

// ── Fetch ─────────────────────────────────────────────────────────────────────

export async function getFounderProfileContext(
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  // Both queries run in parallel
  const [profileResult, sectionsResult, scoreResult] = await Promise.all([
    supabase
      .from('founder_profiles')
      .select('startup_name, industry, stage, description, is_impact_focused')
      .eq('user_id', userId)
      .single(),

    supabase
      .from('profile_builder_data')
      .select('section, extracted_fields, confidence_map')
      .eq('user_id', userId),

    supabase
      .from('qscore_history')
      .select('overall_score, grade, track, score_version')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single(),
  ])

  const fp = profileResult.data
  const rows = sectionsResult.data ?? []

  // No profile data yet — return empty (founder hasn't done profile builder)
  if (!fp && rows.length === 0) return ''

  // Build section map and merge to AssessmentData
  const sections: Partial<Record<number, SectionData>> = {}
  for (const row of rows) {
    sections[row.section as number] = {
      extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
      confidenceMap:   (row.confidence_map   ?? {}) as Record<string, number>,
    }
  }
  const { assessmentData: d } = mergeToAssessmentData(sections)
  const score = scoreResult.data

  // ── Format compact profile block ─────────────────────────────────────────

  const lines: string[] = []

  // Header
  const name  = fp?.startup_name ?? null
  const ind   = fp?.industry     ?? null
  const stage = fp?.stage        ?? null
  const parts = [name, ind, stage ? `${stage} stage` : null].filter(Boolean)
  if (parts.length) lines.push(`Business: ${parts.join(' · ')}`)

  // Description / problem story
  const desc = fp?.description ?? d.problemStory
  if (desc && typeof desc === 'string' && desc.trim().length > 5) {
    lines.push(`Product: ${desc.trim().slice(0, 120)}${desc.length > 120 ? '…' : ''}`)
  }

  // Customer signals
  const custParts: string[] = []
  if (d.customerType) custParts.push(d.customerType)
  if (d.conversationCount) custParts.push(`${d.conversationCount} customer interviews`)
  if (d.hasPayingCustomers) custParts.push('paying customers ✓')
  else if (d.conversationCount) custParts.push('no paying customers yet')
  if (d.largestContractUsd) custParts.push(`largest deal $${d.largestContractUsd.toLocaleString()}`)
  if (custParts.length) lines.push(`Customers: ${custParts.join(' · ')}`)

  // Revenue / financials
  const fin = d.financial
  const revParts: string[] = []
  if (fin?.mrr) revParts.push(`MRR $${fin.mrr.toLocaleString()}`)
  if (fin?.arr) revParts.push(`ARR $${fin.arr.toLocaleString()}`)
  if (revParts.length) lines.push(`Revenue: ${revParts.join(' · ')}`)

  const burnParts: string[] = []
  if (fin?.monthlyBurn) burnParts.push(`burn $${fin.monthlyBurn.toLocaleString()}/mo`)
  if (fin?.runway)      burnParts.push(`${fin.runway} months runway`)
  if (fin?.averageDealSize) burnParts.push(`avg deal $${fin.averageDealSize.toLocaleString()}`)
  if (burnParts.length) lines.push(`Financials: ${burnParts.join(' · ')}`)

  // Market
  const mktParts: string[] = []
  if (d.p2?.tamDescription) mktParts.push(d.p2.tamDescription.slice(0, 80))
  if (d.p2?.competitorCount != null) mktParts.push(`${d.p2.competitorCount} direct competitors`)
  if (d.p2?.marketUrgency)  mktParts.push(`urgency: ${d.p2.marketUrgency.slice(0, 50)}`)
  if (mktParts.length) lines.push(`Market: ${mktParts.join(' · ')}`)

  // IP / technical
  const techParts: string[] = []
  if (d.p3?.hasPatent) techParts.push('patent filed')
  if (d.p3?.technicalDepth) techParts.push(d.p3.technicalDepth.slice(0, 60))
  if (d.p3?.buildComplexity) techParts.push(`build complexity: ${d.p3.buildComplexity}`)
  if (techParts.length) lines.push(`Tech / IP: ${techParts.join(' · ')}`)

  // Team
  const teamParts: string[] = []
  if (d.p4?.domainYears) teamParts.push(`${d.p4.domainYears}y domain expertise`)
  if (d.p4?.teamCoverage?.length) teamParts.push(`coverage: ${d.p4.teamCoverage.join(', ')}`)
  if (d.p4?.priorExits) teamParts.push(`${d.p4.priorExits} prior exit${d.p4.priorExits > 1 ? 's' : ''}`)
  if (d.p4?.founderMarketFit) teamParts.push(d.p4.founderMarketFit.slice(0, 60))
  if (teamParts.length) lines.push(`Team: ${teamParts.join(' · ')}`)

  // IQ Score
  if (score) {
    const trackLabel = score.track === 'impact' ? ' · impact track' : ''
    lines.push(`IQ Score: ${score.overall_score}/100 — Grade ${score.grade}${trackLabel}`)
  }

  if (lines.length === 0) return ''

  return `\n\nFOUNDER PROFILE (from their completed profile assessment — use as your baseline; always prefer specifics they share in conversation over this summary):\n${lines.join('\n')}`
}
