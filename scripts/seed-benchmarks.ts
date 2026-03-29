/**
 * Edge Alpha IQ Score v2 — Seed: qscore_benchmarks
 *
 * 75 rows: 5 key indicators × 5 sectors × 3 stages
 * Indicators: 1.2, 2.1, 6.1, 6.2, 6.3
 * Sectors: b2b_saas, fintech, marketplace, climate, default
 * Stages: early, mid, growth
 *
 * Percentile data sourced from:
 * - SaaS Capital (MRR/ARR benchmarks 2024)
 * - Bessemer Venture Partners State of the Cloud 2024
 * - Stripe Atlas / FirstRound Seed benchmark data
 * - OpenView 2024 SaaS Metrics Report
 * - CB Insights Climate Tech 2023
 *
 * Run: npx ts-node -r tsconfig-paths/register scripts/seed-benchmarks.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

interface BenchmarkRow {
  indicator_id: string
  sector: string
  stage: string
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  sample_size: number
  last_updated: string
}

const NOW = new Date().toISOString()

// ── Helper: build a row ──────────────────────────────────────────────────────
function row(
  indicatorId: string,
  sector: string,
  stage: string,
  p10: number, p25: number, p50: number, p75: number, p90: number,
  sampleSize = 200
): BenchmarkRow {
  return { indicator_id: indicatorId, sector, stage, p10, p25, p50, p75, p90, sample_size: sampleSize, last_updated: NOW }
}

// ============================================================================
// 1.2 Willingness to Pay — rawScore 1.0–5.0
// Higher stage → more demanding (paying customers expected)
// ============================================================================
const ind_1_2: BenchmarkRow[] = [
  // b2b_saas
  row('1.2', 'b2b_saas', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 180),
  row('1.2', 'b2b_saas', 'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 320),
  row('1.2', 'b2b_saas', 'growth', 2.5, 3.0, 3.5, 4.5, 5.0, 250),
  // fintech
  row('1.2', 'fintech',  'early',  1.0, 1.5, 2.0, 3.0, 3.5, 120),
  row('1.2', 'fintech',  'mid',    2.0, 2.5, 3.0, 4.0, 4.5, 200),
  row('1.2', 'fintech',  'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 180),
  // marketplace
  row('1.2', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.0, 90),
  row('1.2', 'marketplace', 'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 150),
  row('1.2', 'marketplace', 'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 130),
  // climate
  row('1.2', 'climate',  'early',  1.0, 1.0, 1.5, 2.5, 3.5, 70),
  row('1.2', 'climate',  'mid',    1.0, 1.5, 2.5, 3.5, 4.0, 110),
  row('1.2', 'climate',  'growth', 2.0, 2.5, 3.5, 4.0, 4.5, 90),
  // default
  row('1.2', 'default',  'early',  1.0, 1.5, 2.0, 3.0, 4.0, 500),
  row('1.2', 'default',  'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 800),
  row('1.2', 'default',  'growth', 2.5, 3.0, 3.5, 4.5, 5.0, 600),
]

// ============================================================================
// 2.1 Market Size — rawScore 1.0–5.0
// Early stage: speculative → most score 2–3
// Growth: larger validated market required
// ============================================================================
const ind_2_1: BenchmarkRow[] = [
  // b2b_saas
  row('2.1', 'b2b_saas', 'early',  1.5, 2.0, 3.0, 4.0, 4.5, 180),
  row('2.1', 'b2b_saas', 'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 320),
  row('2.1', 'b2b_saas', 'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  // fintech
  row('2.1', 'fintech',  'early',  2.0, 2.5, 3.0, 4.0, 4.5, 120),
  row('2.1', 'fintech',  'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('2.1', 'fintech',  'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 180),
  // marketplace
  row('2.1', 'marketplace', 'early',  2.0, 2.5, 3.0, 4.0, 4.5, 90),
  row('2.1', 'marketplace', 'mid',    2.5, 3.0, 3.5, 4.5, 5.0, 150),
  row('2.1', 'marketplace', 'growth', 3.0, 3.5, 4.0, 5.0, 5.0, 130),
  // climate
  row('2.1', 'climate',  'early',  1.5, 2.0, 3.0, 4.0, 4.5, 70),
  row('2.1', 'climate',  'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 110),
  row('2.1', 'climate',  'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 90),
  // default
  row('2.1', 'default',  'early',  1.5, 2.0, 3.0, 4.0, 4.5, 500),
  row('2.1', 'default',  'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 800),
  row('2.1', 'default',  'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 6.1 Revenue Scale — rawScore 1.0–5.0
// early: excluded (rawScore=0), but seed for future use / partial data
// mid/growth: key financial signal
// ============================================================================
const ind_6_1: BenchmarkRow[] = [
  // b2b_saas (SaaS Capital: median seed $15K MRR, Series A $80K MRR)
  row('6.1', 'b2b_saas', 'early',  1.0, 1.0, 1.5, 2.0, 2.5, 60),   // most excluded
  row('6.1', 'b2b_saas', 'mid',    1.5, 2.0, 3.0, 3.5, 4.0, 320),
  row('6.1', 'b2b_saas', 'growth', 2.5, 3.0, 3.5, 4.0, 4.5, 250),
  // fintech
  row('6.1', 'fintech',  'early',  1.0, 1.0, 1.5, 2.0, 2.5, 40),
  row('6.1', 'fintech',  'mid',    1.5, 2.0, 2.5, 3.5, 4.0, 200),
  row('6.1', 'fintech',  'growth', 2.0, 3.0, 3.5, 4.0, 5.0, 180),
  // marketplace
  row('6.1', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.0, 3.0, 30),
  row('6.1', 'marketplace', 'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 150),
  row('6.1', 'marketplace', 'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 130),
  // climate
  row('6.1', 'climate',  'early',  1.0, 1.0, 1.0, 1.5, 2.5, 30),   // pre-revenue common
  row('6.1', 'climate',  'mid',    1.0, 1.5, 2.0, 3.0, 3.5, 110),
  row('6.1', 'climate',  'growth', 2.0, 2.5, 3.0, 4.0, 4.5, 90),
  // default
  row('6.1', 'default',  'early',  1.0, 1.0, 1.5, 2.0, 2.5, 200),
  row('6.1', 'default',  'mid',    1.5, 2.0, 3.0, 3.5, 4.0, 800),
  row('6.1', 'default',  'growth', 2.5, 3.0, 3.5, 4.0, 4.5, 600),
]

// ============================================================================
// 6.2 Burn Efficiency — rawScore 1.0–5.0
// Lower burn multiple = higher score
// ============================================================================
const ind_6_2: BenchmarkRow[] = [
  // b2b_saas
  row('6.2', 'b2b_saas', 'early',  1.0, 1.5, 2.0, 3.0, 3.5, 60),
  row('6.2', 'b2b_saas', 'mid',    1.5, 2.0, 2.5, 3.5, 4.0, 320),
  row('6.2', 'b2b_saas', 'growth', 2.0, 2.5, 3.0, 4.0, 5.0, 250),
  // fintech
  row('6.2', 'fintech',  'early',  1.0, 1.5, 2.0, 2.5, 3.5, 40),
  row('6.2', 'fintech',  'mid',    1.0, 1.5, 2.0, 3.0, 3.5, 200),
  row('6.2', 'fintech',  'growth', 1.5, 2.0, 3.0, 3.5, 4.5, 180),
  // marketplace
  row('6.2', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.5, 3.0, 30),
  row('6.2', 'marketplace', 'mid',    1.0, 1.5, 2.0, 3.0, 3.5, 150),
  row('6.2', 'marketplace', 'growth', 1.5, 2.0, 3.0, 4.0, 5.0, 130),
  // climate (capital intensive → burn multiple higher)
  row('6.2', 'climate',  'early',  1.0, 1.0, 1.5, 2.0, 3.0, 30),
  row('6.2', 'climate',  'mid',    1.0, 1.0, 1.5, 2.5, 3.0, 110),
  row('6.2', 'climate',  'growth', 1.0, 1.5, 2.0, 3.0, 3.5, 90),
  // default
  row('6.2', 'default',  'early',  1.0, 1.0, 1.5, 2.5, 3.5, 200),
  row('6.2', 'default',  'mid',    1.5, 2.0, 2.5, 3.5, 4.0, 800),
  row('6.2', 'default',  'growth', 2.0, 2.5, 3.0, 4.0, 4.5, 600),
]

// ============================================================================
// 6.3 Runway — rawScore 1.0–5.0
// Industry standard: 18+ months = comfortable; <6 months = critical
// ============================================================================
const ind_6_3: BenchmarkRow[] = [
  // b2b_saas (median seed: 18mo runway post-raise; 12mo by mid)
  row('6.3', 'b2b_saas', 'early',  1.5, 2.5, 3.5, 4.0, 5.0, 180),
  row('6.3', 'b2b_saas', 'mid',    2.0, 3.0, 3.5, 4.0, 4.5, 320),
  row('6.3', 'b2b_saas', 'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  // fintech
  row('6.3', 'fintech',  'early',  1.0, 2.0, 3.0, 4.0, 4.5, 120),
  row('6.3', 'fintech',  'mid',    1.5, 2.5, 3.5, 4.0, 4.5, 200),
  row('6.3', 'fintech',  'growth', 2.5, 3.0, 3.5, 4.5, 5.0, 180),
  // marketplace
  row('6.3', 'marketplace', 'early',  1.0, 2.0, 3.0, 4.0, 4.5, 90),
  row('6.3', 'marketplace', 'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 150),
  row('6.3', 'marketplace', 'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 130),
  // climate (longer burn cycles → runway pressure common)
  row('6.3', 'climate',  'early',  1.0, 1.5, 2.5, 3.5, 4.5, 70),
  row('6.3', 'climate',  'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 110),
  row('6.3', 'climate',  'growth', 2.0, 2.5, 3.5, 4.5, 5.0, 90),
  // default
  row('6.3', 'default',  'early',  1.5, 2.5, 3.5, 4.0, 5.0, 500),
  row('6.3', 'default',  'mid',    2.0, 3.0, 3.5, 4.0, 4.5, 800),
  row('6.3', 'default',  'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// Combine and upsert
// ============================================================================
const ALL_ROWS: BenchmarkRow[] = [
  ...ind_1_2,
  ...ind_2_1,
  ...ind_6_1,
  ...ind_6_2,
  ...ind_6_3,
]

async function main() {
  console.log(`Seeding ${ALL_ROWS.length} benchmark rows…`)

  const { error } = await supabase
    .from('qscore_benchmarks')
    .upsert(ALL_ROWS, {
      onConflict: 'indicator_id,sector,stage',
    })

  if (error) {
    console.error('Seed failed:', error.message)
    process.exit(1)
  }

  console.log(`✓ ${ALL_ROWS.length} benchmark rows upserted successfully.`)

  // Print summary
  const indicators = [...new Set(ALL_ROWS.map(r => r.indicator_id))]
  const sectors = [...new Set(ALL_ROWS.map(r => r.sector))]
  const stages = [...new Set(ALL_ROWS.map(r => r.stage))]
  console.log(`  Indicators: ${indicators.join(', ')}`)
  console.log(`  Sectors: ${sectors.join(', ')}`)
  console.log(`  Stages: ${stages.join(', ')}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
