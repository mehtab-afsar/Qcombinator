/**
 * Recent Market Activity — RAG Phase 3 (see
 * /Users/mohammedmehtabafsar/.claude/plans/resilient-bouncing-starfish.md for the full plan).
 *
 * Produces a short text block of recent, sector-matched startup funding news from
 * market_funding_signals (ingested by app/api/cron/ingest-market-signals/route.ts from a public
 * TechCrunch RSS feed) — for grounding AI-generated founder content in what's actually
 * happening in the market, alongside lib/comparables/retrieve.ts's platform-internal
 * comparable-cohort data.
 *
 * Different in kind from retrieve.ts's comparableCohort, on purpose:
 *  - Real company names/amounts are fine here — this is already-public news, not private
 *    platform data, so none of the anonymization/aggregation rules in retrieve.ts apply.
 *  - It's UNVERIFIED third-party reporting, not a fact this product vouches for. The rendered
 *    text says so explicitly, every time — never omit the hedge to make the output read cleaner.
 *  - Never feeds into the Q-Score itself — same locked boundary as every other Company Context
 *    field (ADR-005).
 */

import type { createAdminClient } from '@/lib/supabase/server'
import { mapToSector } from '@/lib/qscore/sector-stage-buckets'

type Admin = ReturnType<typeof createAdminClient>

const LOOKBACK_DAYS = 30
const MAX_ITEMS = 5
// Wide enough to comfortably cover 30 days of this feed's real volume (observed ~4 items/day,
// only a fraction of which classify as 'funding') after the DB-level event_type/date filter —
// bucket-matching by sector still has to happen in memory since the stored sector is raw text,
// not pre-bucketed.
const CANDIDATE_ROW_LIMIT = 200

interface SignalRow {
  company_name: string | null
  sector: string | null
  stage: string | null
  round_amount: string | null
  investors: string[] | null
  summary: string | null
  source_url: string
  published_at: string | null
}

/**
 * Returns a hedged text block of recent same-sector funding news, or null if there's nothing
 * relevant — never a misleading empty/thin block.
 */
export async function getMarketSignalContext(admin: Admin, founderId: string): Promise<string | null> {
  const { data: founder } = await admin
    .from('founder_profiles')
    .select('industry')
    .eq('user_id', founderId)
    .maybeSingle()
  if (!founder) return null

  const founderSector = mapToSector(founder.industry as string | null)

  const sinceDate = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { data: rows } = await admin
    .from('market_funding_signals')
    .select('company_name, sector, stage, round_amount, investors, summary, source_url, published_at')
    .eq('event_type', 'funding')
    .gte('published_at', sinceDate)
    .order('published_at', { ascending: false })
    .limit(CANDIDATE_ROW_LIMIT)

  const matched = ((rows ?? []) as SignalRow[])
    .filter(r => mapToSector(r.sector) === founderSector)
    .slice(0, MAX_ITEMS)

  if (matched.length === 0) return null

  const lines = [
    "Recent third-party news (unverified, via TechCrunch — not this platform's own data):",
  ]
  for (const r of matched) {
    const headline = [r.company_name, r.stage, r.round_amount].filter(Boolean).join(' · ')
    const investorNote = r.investors && r.investors.length > 0 ? ` — investors: ${r.investors.join(', ')}` : ''
    lines.push(`- ${headline}${r.summary ? `: ${r.summary}` : ''}${investorNote} (${r.source_url})`)
  }
  return lines.join('\n')
}
