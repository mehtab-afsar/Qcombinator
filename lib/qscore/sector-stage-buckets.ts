/**
 * Shared sector/stage bucketing — normalizes founder_profiles.industry/stage free text into
 * a fixed small vocabulary. Originally lived only in the benchmark-refresh cron
 * (app/api/cron/update-benchmarks/route.ts); extracted so lib/comparables/retrieve.ts can bucket
 * founders the same way without duplicating the mapping rules.
 */

// Map founder_profiles.industry → bucket key
export function mapToSector(industry?: string | null): string {
  if (!industry) return 'default'
  const i = industry.toLowerCase().replace(/[-\s]/g, '_')
  if (i.includes('ai') || i.includes('software')) return 'ai_ml'
  if (i.includes('saas') || i.includes('b2b')) return 'b2b_saas'
  const direct = ['biotech', 'marketplace', 'fintech', 'consumer', 'climate', 'hardware', 'edtech', 'healthtech']
  return direct.find(k => i.includes(k)) ?? 'default'
}

// Map founder_profiles.stage → bucket key.
// Note: unmatched/null falls to 'early', not 'default' (asymmetric with mapToSector) — inherited
// behavior from the original benchmark cron, not something to "fix" here.
export function mapToStage(stage?: string | null): string {
  if (!stage) return 'early'
  const s = stage.toLowerCase()
  if (s.includes('idea') || s.includes('pre') || s.includes('mvp') || s.includes('seed') || s.includes('angel')) return 'early'
  if (s.includes('series_a') || s.includes('series-a') || s.includes('launched') || s.includes('commerci') || s.includes('early-revenue') || s.includes('revenue')) return 'mid'
  if (s.includes('series_b') || s.includes('series-b') || s.includes('scaling') || s.includes('growth') || s.includes('series_c') || s.includes('series-c')) return 'growth'
  return 'early'
}

export const SECTORS = ['b2b_saas', 'biotech', 'marketplace', 'fintech', 'consumer', 'climate', 'hardware', 'edtech', 'healthtech', 'ai_ml', 'default']
export const STAGES = ['early', 'mid', 'growth']
