/**
 * Comparable Company Context — Phase 1 of the RAG roadmap (see
 * /Users/mohammedmehtabafsar/.claude/plans/resilient-bouncing-starfish.md for the full plan).
 *
 * Produces a short, anonymized, aggregate text block describing founders in a similar
 * sector/stage bucket on this platform ("typically around $X MRR, teams of ~Y") — for grounding
 * AI-generated founder content in real platform data instead of generic LLM knowledge.
 *
 * Hard rules, not style choices:
 *  - Never surfaces any individual founder's identity or exact figure. Aggregates below a safe
 *    sample size return null rather than showing a thin/de-anonymizable statistic (see
 *    aggregateMetric — a 3-4 person "range" is literally one real founder's number, not a range).
 *  - Money figures (MRR) come ONLY from Stripe-verified data (founder_profiles.stripe_verified /
 *    stripe_mrr). Self-reported free-text financial fields (startup_profile_data.mrr, a
 *    z.string() with no numeric enforcement) are never parsed for this — a wrong parse here
 *    doesn't just look bad, it becomes a "fact" an AI-generated asset asserts with confidence.
 *  - Excludes founders who opted out of being surfaced to others (visibility_gated = true) —
 *    same flag lib/investor/visibility.ts already uses for the same purpose.
 *  - Never feeds into the Q-Score itself — output only ever reaches CompanyContext (advice/content
 *    generation), which is a separate, locked-off concern from scoring.
 */

import type { createAdminClient } from '@/lib/supabase/server'
import { mapToSector, mapToStage } from '@/lib/qscore/sector-stage-buckets'
import { getCachedComparablePopulation, setCachedComparablePopulation } from '@/lib/cache/qscore-cache'

type Admin = ReturnType<typeof createAdminClient>

interface PopulationRow {
  userId: string
  sector: string
  stage: string
  mrr: number | null       // Stripe-verified only, else null
  teamSize: number | null  // parsed from startup_profile_data.teamSize, else null
}

// Cohort must have at least this many OTHER founders in the same sector+stage bucket before we
// generate anything at all. qscore_benchmarks requires >=20 because it publishes precise
// percentiles reused for a month across many consumers; this renders a much softer "typically
// around" statement consumed once per prompt build — a materially weaker claim justifies a
// materially lower bar. Don't "fix" this inconsistency by bumping it to 20 — that would just make
// the feature return null for nearly everyone at current platform scale.
const MIN_COHORT_SIZE = 5

// A specific metric (MRR, team size) only appears in the output if at least this many cohort
// members have a usable value for it — independent of the overall cohort-size gate above, so a
// cohort of 5 where only 2 have Stripe-verified MRR still omits MRR rather than aggregating 2
// points. Enforced inside aggregateMetric().
const MIN_METRIC_SAMPLE = 3
// Above this many samples, show a median + interquartile band instead of median-only. Below it,
// median-only — an IQR band from a small n is too close to exposing one real founder's number.
const IQR_SAMPLE_SIZE = 8

// ── Team size parsing ───────────────────────────────────────────────────────────

/**
 * Strict allow-list parse: plain digits only. Ranges ("3-5"), qualifiers ("5+", "small team"),
 * and anything non-numeric are rejected outright rather than guessed at — a founder who typed
 * "3-5" gave two numbers, not one, and averaging them would fabricate a data point they never
 * actually reported.
 */
export function parseTeamSize(raw: string | null | undefined): number | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!/^\d{1,3}$/.test(trimmed)) return null
  const n = parseInt(trimmed, 10)
  if (n < 1 || n > 500) return null // outside this range is almost certainly junk input, not a real early-stage team
  return n
}

// ── Aggregation ──────────────────────────────────────────────────────────────────

export interface MetricAggregate {
  median: number
  iqr?: [number, number] // [p25, p75] — never true min/max
}

/**
 * Aggregates a list of real values into a safe-to-publish summary statistic. Returns null below
 * MIN_METRIC_SAMPLE. Deliberately never returns the min or max of the input — with a handful of
 * samples, a min/max is one specific real founder's exact figure republished as if it were an
 * aggregate, which is exactly what the "never show an individual's identity or exact figure"
 * product decision forbids.
 */
export function aggregateMetric(values: number[]): MetricAggregate | null {
  if (values.length < MIN_METRIC_SAMPLE) return null

  const sorted = [...values].sort((a, b) => a - b)
  const n = sorted.length
  const percentile = (pct: number) => sorted[Math.min(n - 1, Math.floor((pct / 100) * n))]

  const median = n % 2 === 0
    ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
    : sorted[(n - 1) / 2]

  if (n < IQR_SAMPLE_SIZE) return { median }
  return { median, iqr: [percentile(25), percentile(75)] }
}

function formatCurrency(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}

function formatMrr(agg: MetricAggregate): string {
  if (agg.iqr) return `typically ${formatCurrency(agg.iqr[0])}–${formatCurrency(agg.iqr[1])}/mo (median ${formatCurrency(agg.median)}/mo)`
  return `typically around ${formatCurrency(agg.median)}/mo`
}

function formatTeamSize(agg: MetricAggregate): string {
  const r = (n: number) => Math.round(n)
  if (agg.iqr) return `typically ${r(agg.iqr[0])}–${r(agg.iqr[1])} people (median ${r(agg.median)})`
  return `typically around ${r(agg.median)} people`
}

// ── Population fetch + cache ────────────────────────────────────────────────────

/**
 * Fetches and buckets the whole eligible founder population ONCE, cached ~45 min. Matters because
 * lib/rhythm/context.ts::buildContext() runs in a sequential per-founder loop in the rhythm cron
 * (app/api/cron/rhythm/route.ts) — without this cache, founders sharing a bucket would each
 * redundantly re-fetch and re-bucket the same population within a single cron tick.
 */
async function getEligiblePopulation(admin: Admin): Promise<PopulationRow[]> {
  const cached = getCachedComparablePopulation<PopulationRow[]>()
  if (cached) return cached

  const { data } = await admin
    .from('founder_profiles')
    .select('user_id, industry, stage, stripe_verified, stripe_mrr, startup_profile_data')
    .eq('visibility_gated', false)

  const population: PopulationRow[] = (data ?? []).map(row => {
    const sp = (row.startup_profile_data ?? {}) as Record<string, unknown>
    return {
      userId: row.user_id as string,
      sector: mapToSector(row.industry as string | null),
      stage: mapToStage(row.stage as string | null),
      mrr: row.stripe_verified === true && typeof row.stripe_mrr === 'number' ? row.stripe_mrr : null,
      teamSize: parseTeamSize(sp.teamSize as string | undefined),
    }
  })

  setCachedComparablePopulation(population)
  return population
}

// ── Public entry point ──────────────────────────────────────────────────────────

/**
 * Returns anonymized, aggregate comparable-cohort text for the given founder, or null if there
 * isn't a large enough cohort to say anything safely. Never queries/returns anything keyed to an
 * individual other founder — callers get prose, not rows.
 */
export async function getComparableCohortContext(admin: Admin, founderId: string): Promise<string | null> {
  const { data: target } = await admin
    .from('founder_profiles')
    .select('industry, stage')
    .eq('user_id', founderId)
    .maybeSingle()
  if (!target) return null

  const sector = mapToSector(target.industry as string | null)
  const stage = mapToStage(target.stage as string | null)

  const population = await getEligiblePopulation(admin)
  const cohort = population.filter(p => p.sector === sector && p.stage === stage && p.userId !== founderId)

  if (cohort.length < MIN_COHORT_SIZE) return null

  const mrrAgg = aggregateMetric(cohort.map(p => p.mrr).filter((v): v is number => v !== null))
  const teamAgg = aggregateMetric(cohort.map(p => p.teamSize).filter((v): v is number => v !== null))

  if (!mrrAgg && !teamAgg) return null

  const lines = [
    `Founders in a similar sector and stage on this platform (${cohort.length} comparable, anonymized):`,
  ]
  if (mrrAgg) lines.push(`- Monthly recurring revenue: ${formatMrr(mrrAgg)}`)
  if (teamAgg) lines.push(`- Team size: ${formatTeamSize(teamAgg)}`)
  return lines.join('\n')
}
