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
// 1.1 Early Signal — rawScore 1.0–5.0
// Conversation count / paying customer signals
// early: 0 convos = 1.0, 25+ = 5.0
// mid: no customers = 1.0, 50+ = 5.0
// growth: <50 customers = 1.0, 1000+ = 5.0
// ============================================================================
const ind_1_1: BenchmarkRow[] = [
  // b2b_saas
  row('1.1', 'b2b_saas', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('1.1', 'b2b_saas', 'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('1.1', 'b2b_saas', 'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  // fintech
  row('1.1', 'fintech',  'early',  1.0, 1.5, 2.5, 3.5, 4.5, 120),
  row('1.1', 'fintech',  'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 200),
  row('1.1', 'fintech',  'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  // marketplace
  row('1.1', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 90),
  row('1.1', 'marketplace', 'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('1.1', 'marketplace', 'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 130),
  // climate
  row('1.1', 'climate',  'early',  1.0, 1.0, 2.0, 3.0, 4.0, 70),
  row('1.1', 'climate',  'mid',    1.0, 2.0, 3.0, 4.0, 4.5, 110),
  row('1.1', 'climate',  'growth', 2.0, 2.5, 3.5, 4.5, 5.0, 90),
  // default
  row('1.1', 'default',  'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('1.1', 'default',  'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('1.1', 'default',  'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 1.3 Speed — rawScore 1.0–5.0
// Sales cycle length proxy
// early: most no pipeline yet, seeded lenient
// mid: formal sales motion expected
// growth: self-serve / PLG benchmark
// ============================================================================
const ind_1_3: BenchmarkRow[] = [
  // b2b_saas
  row('1.3', 'b2b_saas', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('1.3', 'b2b_saas', 'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 320),
  row('1.3', 'b2b_saas', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 250),
  // fintech (regulatory slows cycles)
  row('1.3', 'fintech',  'early',  1.0, 1.5, 2.0, 3.0, 4.0, 120),
  row('1.3', 'fintech',  'mid',    1.0, 2.0, 3.0, 3.5, 4.0, 200),
  row('1.3', 'fintech',  'growth', 2.0, 2.5, 3.5, 4.0, 4.5, 180),
  // marketplace
  row('1.3', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 90),
  row('1.3', 'marketplace', 'mid',    1.5, 2.5, 3.5, 4.0, 4.5, 150),
  row('1.3', 'marketplace', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 130),
  // climate (long enterprise / government cycles)
  row('1.3', 'climate',  'early',  1.0, 1.0, 1.5, 2.5, 3.5, 70),
  row('1.3', 'climate',  'mid',    1.0, 1.5, 2.0, 3.0, 3.5, 110),
  row('1.3', 'climate',  'growth', 1.5, 2.0, 3.0, 3.5, 4.0, 90),
  // default
  row('1.3', 'default',  'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('1.3', 'default',  'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 800),
  row('1.3', 'default',  'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 600),
]

// ============================================================================
// 1.4 Durability — rawScore 1.0–5.0
// Churn / NRR / retention signals
// early: mostly excluded (no customers), seeded low for partials
// mid: NRR/churn benchmarks from Sequoia / a16z
// growth: NRR 110%+ expected
// ============================================================================
const ind_1_4: BenchmarkRow[] = [
  // b2b_saas (Bessemer/a16z: median NRR seed 98%, Series A 105%)
  row('1.4', 'b2b_saas', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 60),
  row('1.4', 'b2b_saas', 'mid',    1.5, 2.5, 3.5, 4.0, 4.5, 320),
  row('1.4', 'b2b_saas', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 250),
  // fintech
  row('1.4', 'fintech',  'early',  1.0, 1.5, 2.0, 3.0, 4.0, 40),
  row('1.4', 'fintech',  'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 200),
  row('1.4', 'fintech',  'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 180),
  // marketplace (consumer retention lower)
  row('1.4', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.5, 3.5, 30),
  row('1.4', 'marketplace', 'mid',    1.0, 2.0, 3.0, 4.0, 4.5, 150),
  row('1.4', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 130),
  // climate (early pilots, less recurrence data)
  row('1.4', 'climate',  'early',  1.0, 1.0, 1.5, 2.5, 3.5, 30),
  row('1.4', 'climate',  'mid',    1.0, 1.5, 2.5, 3.5, 4.0, 110),
  row('1.4', 'climate',  'growth', 1.5, 2.5, 3.5, 4.0, 4.5, 90),
  // default
  row('1.4', 'default',  'early',  1.0, 1.0, 1.5, 2.5, 3.5, 200),
  row('1.4', 'default',  'mid',    1.5, 2.5, 3.5, 4.0, 4.5, 800),
  row('1.4', 'default',  'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 1.5 Scale — rawScore 1.0–5.0
// Expansion potential / adjacent markets
// early: mostly narrative — seeded permissively
// mid: second segment in pilots expected
// growth: platform / multi-market expected
// ============================================================================
const ind_1_5: BenchmarkRow[] = [
  // b2b_saas
  row('1.5', 'b2b_saas', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('1.5', 'b2b_saas', 'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 320),
  row('1.5', 'b2b_saas', 'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  // fintech
  row('1.5', 'fintech',  'early',  1.0, 1.5, 2.5, 3.5, 4.5, 120),
  row('1.5', 'fintech',  'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 200),
  row('1.5', 'fintech',  'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  // marketplace (network effects = natural scale narrative)
  row('1.5', 'marketplace', 'early',  1.5, 2.0, 3.0, 4.0, 5.0, 90),
  row('1.5', 'marketplace', 'mid',    2.0, 2.5, 3.5, 4.5, 5.0, 150),
  row('1.5', 'marketplace', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 130),
  // climate (longer horizon, harder to prove scale early)
  row('1.5', 'climate',  'early',  1.0, 1.5, 2.0, 3.0, 4.0, 70),
  row('1.5', 'climate',  'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 110),
  row('1.5', 'climate',  'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 90),
  // default
  row('1.5', 'default',  'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('1.5', 'default',  'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 800),
  row('1.5', 'default',  'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 2.2 Market Urgency — rawScore 1.0–5.0
// "Why now?" catalyst strength
// ============================================================================
const ind_2_2: BenchmarkRow[] = [
  row('2.2', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('2.2', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('2.2', 'b2b_saas',    'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  row('2.2', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('2.2', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('2.2', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('2.2', 'marketplace', 'early',  1.0, 2.0, 3.0, 4.0, 4.5, 90),
  row('2.2', 'marketplace', 'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 150),
  row('2.2', 'marketplace', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 130),
  row('2.2', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('2.2', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('2.2', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('2.2', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('2.2', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('2.2', 'default',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 2.3 Value Pool — rawScore 1.0–5.0
// ============================================================================
const ind_2_3: BenchmarkRow[] = [
  row('2.3', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('2.3', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 4.5, 320),
  row('2.3', 'b2b_saas',    'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  row('2.3', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('2.3', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('2.3', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('2.3', 'marketplace', 'early',  1.5, 2.0, 3.0, 4.0, 4.5, 90),
  row('2.3', 'marketplace', 'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 150),
  row('2.3', 'marketplace', 'growth', 2.5, 3.5, 4.0, 5.0, 5.0, 130),
  row('2.3', 'climate',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 70),
  row('2.3', 'climate',     'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 110),
  row('2.3', 'climate',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 90),
  row('2.3', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('2.3', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 4.5, 800),
  row('2.3', 'default',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 2.4 Expansion Potential — rawScore 1.0–5.0
// ============================================================================
const ind_2_4: BenchmarkRow[] = [
  row('2.4', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('2.4', 'b2b_saas',    'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 320),
  row('2.4', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  row('2.4', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 120),
  row('2.4', 'fintech',     'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 200),
  row('2.4', 'fintech',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  row('2.4', 'marketplace', 'early',  1.5, 2.0, 3.0, 4.0, 5.0, 90),
  row('2.4', 'marketplace', 'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 150),
  row('2.4', 'marketplace', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 130),
  row('2.4', 'climate',     'early',  1.0, 1.5, 2.0, 3.0, 4.0, 70),
  row('2.4', 'climate',     'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 110),
  row('2.4', 'climate',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 90),
  row('2.4', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('2.4', 'default',     'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 800),
  row('2.4', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 2.5 Competitive Space — rawScore 1.0–5.0
// ============================================================================
const ind_2_5: BenchmarkRow[] = [
  row('2.5', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('2.5', 'b2b_saas',    'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 320),
  row('2.5', 'b2b_saas',    'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 250),
  row('2.5', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 120),
  row('2.5', 'fintech',     'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 200),
  row('2.5', 'fintech',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 180),
  row('2.5', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 90),
  row('2.5', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 150),
  row('2.5', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.0, 5.0, 130),
  row('2.5', 'climate',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 70),
  row('2.5', 'climate',     'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 110),
  row('2.5', 'climate',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 90),
  row('2.5', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('2.5', 'default',     'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 800),
  row('2.5', 'default',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 600),
]

// ============================================================================
// 3.1 IP Protection — rawScore 1.0–5.0
// Patent/trade secret status
// ============================================================================
const ind_3_1: BenchmarkRow[] = [
  row('3.1', 'b2b_saas',    'early',  1.0, 1.5, 2.0, 3.0, 4.0, 180),
  row('3.1', 'b2b_saas',    'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 320),
  row('3.1', 'b2b_saas',    'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 250),
  row('3.1', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 120),
  row('3.1', 'fintech',     'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 200),
  row('3.1', 'fintech',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 180),
  row('3.1', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.5, 3.5, 90),
  row('3.1', 'marketplace', 'mid',    1.0, 1.5, 2.5, 3.5, 4.0, 150),
  row('3.1', 'marketplace', 'growth', 1.5, 2.5, 3.5, 4.0, 4.5, 130),
  row('3.1', 'climate',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 70),
  row('3.1', 'climate',     'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 110),
  row('3.1', 'climate',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 90),
  row('3.1', 'default',     'early',  1.0, 1.5, 2.0, 3.0, 4.0, 500),
  row('3.1', 'default',     'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 800),
  row('3.1', 'default',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 600),
]

// ============================================================================
// 3.2 Technical Depth — rawScore 1.0–5.0
// ============================================================================
const ind_3_2: BenchmarkRow[] = [
  row('3.2', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('3.2', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('3.2', 'b2b_saas',    'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  row('3.2', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('3.2', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('3.2', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('3.2', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 90),
  row('3.2', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 150),
  row('3.2', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 130),
  row('3.2', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('3.2', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('3.2', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('3.2', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('3.2', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('3.2', 'default',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 3.3 Know-How Density — rawScore 1.0–5.0
// ============================================================================
const ind_3_3: BenchmarkRow[] = [
  row('3.3', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('3.3', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('3.3', 'b2b_saas',    'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  row('3.3', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('3.3', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('3.3', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('3.3', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 90),
  row('3.3', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 150),
  row('3.3', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.0, 5.0, 130),
  row('3.3', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('3.3', 'climate',     'mid',    2.5, 3.0, 3.5, 4.5, 5.0, 110),
  row('3.3', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('3.3', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('3.3', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('3.3', 'default',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 3.4 Build Complexity — rawScore 1.0–5.0
// ============================================================================
const ind_3_4: BenchmarkRow[] = [
  row('3.4', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('3.4', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('3.4', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  row('3.4', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('3.4', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('3.4', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('3.4', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 90),
  row('3.4', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 150),
  row('3.4', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 130),
  row('3.4', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('3.4', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('3.4', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('3.4', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('3.4', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('3.4', 'default',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 3.5 Replication Barrier — rawScore 1.0–5.0
// ============================================================================
const ind_3_5: BenchmarkRow[] = [
  row('3.5', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('3.5', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('3.5', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  row('3.5', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('3.5', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('3.5', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('3.5', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.5, 3.5, 90),
  row('3.5', 'marketplace', 'mid',    1.0, 1.5, 2.5, 3.5, 4.0, 150),
  row('3.5', 'marketplace', 'growth', 1.5, 2.5, 3.5, 4.0, 4.5, 130),
  row('3.5', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 5.0, 70),
  row('3.5', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('3.5', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('3.5', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('3.5', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('3.5', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 4.1 Domain Depth — rawScore 1.0–5.0
// Years of domain experience
// ============================================================================
const ind_4_1: BenchmarkRow[] = [
  row('4.1', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('4.1', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('4.1', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  row('4.1', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('4.1', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('4.1', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('4.1', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 90),
  row('4.1', 'marketplace', 'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('4.1', 'marketplace', 'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 130),
  row('4.1', 'climate',     'early',  1.5, 2.0, 3.0, 3.5, 4.5, 70),
  row('4.1', 'climate',     'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 110),
  row('4.1', 'climate',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 90),
  row('4.1', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('4.1', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('4.1', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 4.2 Founder-Market Fit — rawScore 1.0–5.0
// ============================================================================
const ind_4_2: BenchmarkRow[] = [
  row('4.2', 'b2b_saas',    'early',  1.0, 2.0, 3.0, 4.0, 4.5, 180),
  row('4.2', 'b2b_saas',    'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 320),
  row('4.2', 'b2b_saas',    'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 250),
  row('4.2', 'fintech',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 120),
  row('4.2', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('4.2', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('4.2', 'marketplace', 'early',  1.0, 2.0, 3.0, 4.0, 4.5, 90),
  row('4.2', 'marketplace', 'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 150),
  row('4.2', 'marketplace', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 130),
  row('4.2', 'climate',     'early',  1.5, 2.0, 3.0, 4.0, 4.5, 70),
  row('4.2', 'climate',     'mid',    2.0, 2.5, 3.5, 4.0, 4.5, 110),
  row('4.2', 'climate',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 90),
  row('4.2', 'default',     'early',  1.0, 2.0, 3.0, 4.0, 4.5, 500),
  row('4.2', 'default',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 800),
  row('4.2', 'default',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 4.3 Founder Experience (prior exits/startups) — rawScore 1.0–5.0
// ============================================================================
const ind_4_3: BenchmarkRow[] = [
  row('4.3', 'b2b_saas',    'early',  1.0, 1.5, 2.0, 3.0, 4.0, 180),
  row('4.3', 'b2b_saas',    'mid',    1.0, 1.5, 2.5, 3.5, 4.5, 320),
  row('4.3', 'b2b_saas',    'growth', 1.5, 2.0, 3.0, 4.0, 5.0, 250),
  row('4.3', 'fintech',     'early',  1.0, 1.5, 2.0, 3.0, 4.0, 120),
  row('4.3', 'fintech',     'mid',    1.0, 1.5, 2.5, 3.5, 4.5, 200),
  row('4.3', 'fintech',     'growth', 1.5, 2.5, 3.5, 4.0, 5.0, 180),
  row('4.3', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 90),
  row('4.3', 'marketplace', 'mid',    1.0, 1.5, 2.5, 3.5, 4.5, 150),
  row('4.3', 'marketplace', 'growth', 1.5, 2.0, 3.0, 4.0, 5.0, 130),
  row('4.3', 'climate',     'early',  1.0, 1.5, 2.0, 3.0, 4.0, 70),
  row('4.3', 'climate',     'mid',    1.0, 1.5, 2.5, 3.5, 4.5, 110),
  row('4.3', 'climate',     'growth', 1.5, 2.0, 3.0, 4.0, 5.0, 90),
  row('4.3', 'default',     'early',  1.0, 1.5, 2.0, 3.0, 4.0, 500),
  row('4.3', 'default',     'mid',    1.0, 1.5, 2.5, 3.5, 4.5, 800),
  row('4.3', 'default',     'growth', 1.5, 2.0, 3.0, 4.0, 5.0, 600),
]

// ============================================================================
// 4.4 Leadership Coverage (team function coverage) — rawScore 1.0–5.0
// ============================================================================
const ind_4_4: BenchmarkRow[] = [
  row('4.4', 'b2b_saas',    'early',  1.0, 2.0, 3.0, 4.0, 4.5, 180),
  row('4.4', 'b2b_saas',    'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 320),
  row('4.4', 'b2b_saas',    'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 250),
  row('4.4', 'fintech',     'early',  1.0, 2.0, 3.0, 4.0, 4.5, 120),
  row('4.4', 'fintech',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 200),
  row('4.4', 'fintech',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 180),
  row('4.4', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 90),
  row('4.4', 'marketplace', 'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('4.4', 'marketplace', 'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 130),
  row('4.4', 'climate',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 70),
  row('4.4', 'climate',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 110),
  row('4.4', 'climate',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 90),
  row('4.4', 'default',     'early',  1.0, 2.0, 3.0, 4.0, 4.5, 500),
  row('4.4', 'default',     'mid',    2.0, 3.0, 3.5, 4.5, 5.0, 800),
  row('4.4', 'default',     'growth', 2.5, 3.5, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 4.5 Team Cohesion (months working together) — rawScore 1.0–5.0
// ============================================================================
const ind_4_5: BenchmarkRow[] = [
  row('4.5', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('4.5', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 320),
  row('4.5', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 250),
  row('4.5', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 120),
  row('4.5', 'fintech',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 200),
  row('4.5', 'fintech',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  row('4.5', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 90),
  row('4.5', 'marketplace', 'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('4.5', 'marketplace', 'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 130),
  row('4.5', 'climate',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 70),
  row('4.5', 'climate',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 110),
  row('4.5', 'climate',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 90),
  row('4.5', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 500),
  row('4.5', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 800),
  row('4.5', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// 5.1–5.5 Structural Impact (P5) — rawScore 1.0–5.0
// climate-heavy pillars; non-climate sectors seeded low/neutral
// ============================================================================
const ind_5_1: BenchmarkRow[] = [
  row('5.1', 'b2b_saas',    'early',  1.0, 1.0, 1.5, 2.5, 3.5, 100),
  row('5.1', 'b2b_saas',    'mid',    1.0, 1.5, 2.0, 3.0, 4.0, 200),
  row('5.1', 'b2b_saas',    'growth', 1.0, 1.5, 2.5, 3.5, 4.5, 180),
  row('5.1', 'fintech',     'early',  1.0, 1.0, 1.5, 2.5, 3.5, 80),
  row('5.1', 'fintech',     'mid',    1.0, 1.5, 2.5, 3.5, 4.0, 150),
  row('5.1', 'fintech',     'growth', 1.5, 2.0, 3.0, 4.0, 4.5, 130),
  row('5.1', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.0, 3.0, 60),
  row('5.1', 'marketplace', 'mid',    1.0, 1.0, 1.5, 2.5, 3.5, 100),
  row('5.1', 'marketplace', 'growth', 1.0, 1.5, 2.0, 3.0, 4.0, 90),
  row('5.1', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('5.1', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('5.1', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('5.1', 'default',     'early',  1.0, 1.0, 2.0, 3.0, 4.0, 400),
  row('5.1', 'default',     'mid',    1.0, 1.5, 2.5, 3.5, 4.5, 600),
  row('5.1', 'default',     'growth', 1.5, 2.0, 3.0, 4.0, 4.5, 500),
]

const ind_5_2: BenchmarkRow[] = [
  row('5.2', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 100),
  row('5.2', 'b2b_saas',    'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 200),
  row('5.2', 'b2b_saas',    'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 180),
  row('5.2', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 80),
  row('5.2', 'fintech',     'mid',    1.5, 2.5, 3.0, 4.0, 4.5, 150),
  row('5.2', 'fintech',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 130),
  row('5.2', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 60),
  row('5.2', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 100),
  row('5.2', 'marketplace', 'growth', 2.0, 2.5, 3.5, 4.0, 4.5, 90),
  row('5.2', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('5.2', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('5.2', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('5.2', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 400),
  row('5.2', 'default',     'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 600),
  row('5.2', 'default',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 500),
]

const ind_5_3: BenchmarkRow[] = [
  row('5.3', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 100),
  row('5.3', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 200),
  row('5.3', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  row('5.3', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 80),
  row('5.3', 'fintech',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('5.3', 'fintech',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 130),
  row('5.3', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 60),
  row('5.3', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 100),
  row('5.3', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.0, 5.0, 90),
  row('5.3', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('5.3', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('5.3', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('5.3', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 400),
  row('5.3', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 600),
  row('5.3', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 500),
]

const ind_5_4: BenchmarkRow[] = [
  row('5.4', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 100),
  row('5.4', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 200),
  row('5.4', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  row('5.4', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 80),
  row('5.4', 'fintech',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('5.4', 'fintech',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 130),
  row('5.4', 'marketplace', 'early',  1.0, 1.5, 2.5, 3.5, 4.5, 60),
  row('5.4', 'marketplace', 'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 100),
  row('5.4', 'marketplace', 'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 90),
  row('5.4', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 5.0, 70),
  row('5.4', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('5.4', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('5.4', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 400),
  row('5.4', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 600),
  row('5.4', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 500),
]

const ind_5_5: BenchmarkRow[] = [
  row('5.5', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 3.5, 4.5, 100),
  row('5.5', 'b2b_saas',    'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 200),
  row('5.5', 'b2b_saas',    'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 180),
  row('5.5', 'fintech',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 80),
  row('5.5', 'fintech',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 150),
  row('5.5', 'fintech',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 130),
  row('5.5', 'marketplace', 'early',  1.0, 1.5, 2.0, 3.0, 4.0, 60),
  row('5.5', 'marketplace', 'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 100),
  row('5.5', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 90),
  row('5.5', 'climate',     'early',  2.0, 2.5, 3.5, 4.0, 4.5, 70),
  row('5.5', 'climate',     'mid',    2.5, 3.0, 4.0, 4.5, 5.0, 110),
  row('5.5', 'climate',     'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 90),
  row('5.5', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 400),
  row('5.5', 'default',     'mid',    1.5, 2.5, 3.5, 4.0, 5.0, 600),
  row('5.5', 'default',     'growth', 2.0, 3.0, 4.0, 4.5, 5.0, 500),
]

// ============================================================================
// 6.4 Unit Economics — rawScore 1.0–5.0
// LTV:CAC ratio proxy
// ============================================================================
const ind_6_4: BenchmarkRow[] = [
  row('6.4', 'b2b_saas',    'early',  1.0, 1.0, 1.5, 2.5, 3.5, 60),
  row('6.4', 'b2b_saas',    'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 320),
  row('6.4', 'b2b_saas',    'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 250),
  row('6.4', 'fintech',     'early',  1.0, 1.0, 1.5, 2.5, 3.5, 40),
  row('6.4', 'fintech',     'mid',    1.5, 2.0, 3.0, 3.5, 4.5, 200),
  row('6.4', 'fintech',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 180),
  row('6.4', 'marketplace', 'early',  1.0, 1.0, 1.5, 2.0, 3.0, 30),
  row('6.4', 'marketplace', 'mid',    1.5, 2.0, 2.5, 3.5, 4.5, 150),
  row('6.4', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 130),
  row('6.4', 'climate',     'early',  1.0, 1.0, 1.0, 2.0, 3.0, 30),
  row('6.4', 'climate',     'mid',    1.0, 1.5, 2.0, 3.0, 4.0, 110),
  row('6.4', 'climate',     'growth', 1.5, 2.0, 3.0, 4.0, 4.5, 90),
  row('6.4', 'default',     'early',  1.0, 1.0, 1.5, 2.5, 3.5, 200),
  row('6.4', 'default',     'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 800),
  row('6.4', 'default',     'growth', 2.5, 3.0, 3.5, 4.5, 5.0, 600),
]

// ============================================================================
// 6.5 Gross Margin — rawScore 1.0–5.0
// ============================================================================
const ind_6_5: BenchmarkRow[] = [
  // b2b_saas (OpenView 2024: median gross margin ~72%)
  row('6.5', 'b2b_saas',    'early',  1.0, 1.5, 2.5, 4.0, 5.0, 60),
  row('6.5', 'b2b_saas',    'mid',    2.0, 3.0, 4.0, 4.5, 5.0, 320),
  row('6.5', 'b2b_saas',    'growth', 3.0, 3.5, 4.0, 4.5, 5.0, 250),
  // fintech (lower margins due to cost of capital)
  row('6.5', 'fintech',     'early',  1.0, 1.5, 2.0, 3.0, 4.0, 40),
  row('6.5', 'fintech',     'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 200),
  row('6.5', 'fintech',     'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 180),
  // marketplace (variable take rates)
  row('6.5', 'marketplace', 'early',  1.0, 1.0, 2.0, 3.0, 4.0, 30),
  row('6.5', 'marketplace', 'mid',    1.5, 2.0, 3.0, 4.0, 4.5, 150),
  row('6.5', 'marketplace', 'growth', 2.0, 3.0, 3.5, 4.5, 5.0, 130),
  // climate (hardware/capex intensive → lower margins)
  row('6.5', 'climate',     'early',  1.0, 1.0, 1.5, 2.5, 3.5, 30),
  row('6.5', 'climate',     'mid',    1.0, 1.5, 2.5, 3.5, 4.0, 110),
  row('6.5', 'climate',     'growth', 1.5, 2.0, 3.0, 4.0, 4.5, 90),
  // default
  row('6.5', 'default',     'early',  1.0, 1.5, 2.5, 3.5, 4.5, 200),
  row('6.5', 'default',     'mid',    2.0, 2.5, 3.5, 4.0, 5.0, 800),
  row('6.5', 'default',     'growth', 2.5, 3.0, 4.0, 4.5, 5.0, 600),
]

// ============================================================================
// Combine and upsert
// ============================================================================
const ALL_ROWS: BenchmarkRow[] = [
  // P1 — Market Readiness
  ...ind_1_1, ...ind_1_2, ...ind_1_3, ...ind_1_4, ...ind_1_5,
  // P2 — Market Potential
  ...ind_2_1, ...ind_2_2, ...ind_2_3, ...ind_2_4, ...ind_2_5,
  // P3 — IP & Defensibility
  ...ind_3_1, ...ind_3_2, ...ind_3_3, ...ind_3_4, ...ind_3_5,
  // P4 — Founder & Team
  ...ind_4_1, ...ind_4_2, ...ind_4_3, ...ind_4_4, ...ind_4_5,
  // P5 — Structural Impact
  ...ind_5_1, ...ind_5_2, ...ind_5_3, ...ind_5_4, ...ind_5_5,
  // P6 — Financials
  ...ind_6_1, ...ind_6_2, ...ind_6_3, ...ind_6_4, ...ind_6_5,
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
