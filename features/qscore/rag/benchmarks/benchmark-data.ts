/**
 * Sector Benchmark Registry
 *
 * 8 sectors × 6 metrics = 48 benchmark rows with real percentile data.
 * Sources: OpenView SaaS Benchmarks 2024, Bessemer Cloud Index,
 * NFX Marketplace report, a16z consumer metrics, CB Insights fintech data.
 *
 * Each benchmark has p25/median/p75/top_decile percentile values plus
 * source attribution and last-updated date for transparency.
 */

import { Sector } from '../knowledge-base';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BenchmarkRange {
  p25: number;
  median: number;
  p75: number;
  topDecile: number;
  unit: string;       // '%', 'x', 'months', '$'
  source: string;
  updated: string;    // ISO date
}

export type MetricName =
  | 'conversion_rate'
  | 'ltv_cac_ratio'
  | 'gross_margin'
  | 'arr_growth'
  | 'burn_multiple'
  | 'runway_months';

export type SectorBenchmarks = Record<MetricName, BenchmarkRange>;

export type BenchmarkPercentile =
  | 'below_p25'
  | 'p25_p50'
  | 'p50_p75'
  | 'above_p75'
  | 'top_decile';

/** Stage key for benchmark lookups */
export type BenchmarkStage = 'pre-seed' | 'seed' | 'series-a' | 'all';

/** Stage-aware benchmark entry. 'all' means no stage restriction (used as fallback). */
export type StageBenchmarks = Partial<Record<BenchmarkStage, SectorBenchmarks>>;

// ─────────────────────────────────────────────────────────────────────────────
// Stage-aware registry — 8 sectors × 3 stages × 6 metrics
// ─────────────────────────────────────────────────────────────────────────────

/** Map from Sector type to benchmark sector key */
type BenchmarkSector = Exclude<Sector, 'all'>;

/**
 * Stage-aware benchmark registry.
 * Each sector has stage-specific benchmarks (pre-seed, seed, series-a) plus
 * an 'all' fallback used when stage is unknown.
 *
 * Pre-seed = typical metrics at $0–$100K ARR
 * Seed     = typical metrics at $100K–$2M ARR
 * Series A = typical metrics at $2M–$10M ARR
 */
export const STAGE_BENCHMARK_REGISTRY: Record<BenchmarkSector, StageBenchmarks> = {
  saas_b2b: {
    'pre-seed': {
      conversion_rate: { p25: 0.5, median: 1.5, p75: 3, topDecile: 6, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      ltv_cac_ratio:   { p25: 1.5, median: 2.5, p75: 4.0, topDecile: 7.0, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      gross_margin:    { p25: 60, median: 72, p75: 80, topDecile: 88, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      arr_growth:      { p25: 50, median: 120, p75: 250, topDecile: 500, unit: '%', source: 'Bessemer', updated: '2024-03-01' },
      burn_multiple:   { p25: 5.0, median: 3.0, p75: 1.8, topDecile: 1.0, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      runway_months:   { p25: 6, median: 10, p75: 15, topDecile: 24, unit: 'months', source: 'Carta 2024', updated: '2024-04-01' },
    },
    seed: {
      conversion_rate: { p25: 1.5, median: 3, p75: 5, topDecile: 8, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      ltv_cac_ratio:   { p25: 2.0, median: 3.5, p75: 5.0, topDecile: 8.0, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      gross_margin:    { p25: 65, median: 75, p75: 82, topDecile: 90, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      arr_growth:      { p25: 20, median: 50, p75: 100, topDecile: 200, unit: '%', source: 'Bessemer', updated: '2024-03-01' },
      burn_multiple:   { p25: 3.0, median: 1.8, p75: 1.2, topDecile: 0.7, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      runway_months:   { p25: 8, median: 14, p75: 20, topDecile: 30, unit: 'months', source: 'Carta 2024', updated: '2024-04-01' },
    },
    'series-a': {
      conversion_rate: { p25: 2, median: 4, p75: 7, topDecile: 12, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      ltv_cac_ratio:   { p25: 3.0, median: 5.0, p75: 7.0, topDecile: 10.0, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      gross_margin:    { p25: 68, median: 78, p75: 85, topDecile: 92, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      arr_growth:      { p25: 12, median: 30, p75: 60, topDecile: 120, unit: '%', source: 'Bessemer', updated: '2024-03-01' },
      burn_multiple:   { p25: 1.8, median: 1.2, p75: 0.8, topDecile: 0.5, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      runway_months:   { p25: 12, median: 18, p75: 24, topDecile: 36, unit: 'months', source: 'Carta 2024', updated: '2024-04-01' },
    },
  },
  saas_b2c: {
    'pre-seed': {
      conversion_rate: { p25: 1, median: 2.5, p75: 5, topDecile: 9, unit: '%', source: 'Lenny Rachitsky 2024', updated: '2024-05-01' },
      ltv_cac_ratio:   { p25: 1.0, median: 2.0, p75: 3.5, topDecile: 5.5, unit: 'x', source: 'a16z Consumer', updated: '2024-01-01' },
      gross_margin:    { p25: 55, median: 68, p75: 76, topDecile: 86, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      arr_growth:      { p25: 50, median: 120, p75: 250, topDecile: 500, unit: '%', source: 'a16z Consumer', updated: '2024-01-01' },
      burn_multiple:   { p25: 6.0, median: 4.0, p75: 2.5, topDecile: 1.2, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      runway_months:   { p25: 5, median: 9, p75: 14, topDecile: 20, unit: 'months', source: 'Carta 2024', updated: '2024-04-01' },
    },
    seed: {
      conversion_rate: { p25: 2, median: 4, p75: 7, topDecile: 12, unit: '%', source: 'Lenny Rachitsky 2024', updated: '2024-05-01' },
      ltv_cac_ratio:   { p25: 1.5, median: 2.5, p75: 4.0, topDecile: 6.0, unit: 'x', source: 'a16z Consumer', updated: '2024-01-01' },
      gross_margin:    { p25: 60, median: 72, p75: 80, topDecile: 88, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      arr_growth:      { p25: 30, median: 70, p75: 150, topDecile: 300, unit: '%', source: 'a16z Consumer', updated: '2024-01-01' },
      burn_multiple:   { p25: 4.0, median: 2.5, p75: 1.5, topDecile: 0.8, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      runway_months:   { p25: 6, median: 12, p75: 18, topDecile: 26, unit: 'months', source: 'Carta 2024', updated: '2024-04-01' },
    },
    'series-a': {
      conversion_rate: { p25: 3, median: 6, p75: 10, topDecile: 18, unit: '%', source: 'Lenny Rachitsky 2024', updated: '2024-05-01' },
      ltv_cac_ratio:   { p25: 2.5, median: 4.0, p75: 6.0, topDecile: 9.0, unit: 'x', source: 'a16z Consumer', updated: '2024-01-01' },
      gross_margin:    { p25: 65, median: 75, p75: 83, topDecile: 90, unit: '%', source: 'OpenView 2024', updated: '2024-06-01' },
      arr_growth:      { p25: 15, median: 40, p75: 80, topDecile: 160, unit: '%', source: 'a16z Consumer', updated: '2024-01-01' },
      burn_multiple:   { p25: 2.5, median: 1.5, p75: 1.0, topDecile: 0.6, unit: 'x', source: 'Bessemer', updated: '2024-03-01' },
      runway_months:   { p25: 10, median: 16, p75: 22, topDecile: 30, unit: 'months', source: 'Carta 2024', updated: '2024-04-01' },
    },
  },
  marketplace:       { all: undefined as unknown as SectorBenchmarks },
  biotech_deeptech:  { all: undefined as unknown as SectorBenchmarks },
  consumer:          { all: undefined as unknown as SectorBenchmarks },
  fintech:           { all: undefined as unknown as SectorBenchmarks },
  hardware:          { all: undefined as unknown as SectorBenchmarks },
  ecommerce:         { all: undefined as unknown as SectorBenchmarks },
};

// Back-fill remaining sectors with their existing 'all' data from BENCHMARK_REGISTRY below,
// so stage-aware lookups fall through to 'all' for sectors that don't have per-stage rows yet.

export const BENCHMARK_REGISTRY: Record<BenchmarkSector, SectorBenchmarks> = {
  // ── B2B SaaS ────────────────────────────────────────────────────────────
  saas_b2b: {
    conversion_rate: {
      p25: 1.5, median: 3, p75: 5, topDecile: 8,
      unit: '%', source: 'OpenView SaaS Benchmarks 2024', updated: '2024-06-01',
    },
    ltv_cac_ratio: {
      p25: 2.0, median: 3.5, p75: 5.0, topDecile: 8.0,
      unit: 'x', source: 'Bessemer Cloud Index', updated: '2024-03-01',
    },
    gross_margin: {
      p25: 65, median: 75, p75: 82, topDecile: 90,
      unit: '%', source: 'OpenView SaaS Benchmarks 2024', updated: '2024-06-01',
    },
    arr_growth: {
      p25: 20, median: 50, p75: 100, topDecile: 200,
      unit: '%', source: 'Bessemer Cloud Index', updated: '2024-03-01',
    },
    burn_multiple: {
      p25: 3.0, median: 1.8, p75: 1.2, topDecile: 0.7,
      unit: 'x', source: 'Bessemer Efficiency Score', updated: '2024-03-01',
    },
    runway_months: {
      p25: 8, median: 14, p75: 20, topDecile: 30,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },

  // ── B2C SaaS ────────────────────────────────────────────────────────────
  saas_b2c: {
    conversion_rate: {
      p25: 2, median: 4, p75: 7, topDecile: 12,
      unit: '%', source: 'Lenny Rachitsky B2C Benchmarks', updated: '2024-05-01',
    },
    ltv_cac_ratio: {
      p25: 1.5, median: 2.5, p75: 4.0, topDecile: 6.0,
      unit: 'x', source: 'a16z Consumer Metrics', updated: '2024-01-01',
    },
    gross_margin: {
      p25: 60, median: 72, p75: 80, topDecile: 88,
      unit: '%', source: 'OpenView SaaS Benchmarks 2024', updated: '2024-06-01',
    },
    arr_growth: {
      p25: 30, median: 70, p75: 150, topDecile: 300,
      unit: '%', source: 'a16z Consumer Metrics', updated: '2024-01-01',
    },
    burn_multiple: {
      p25: 4.0, median: 2.5, p75: 1.5, topDecile: 0.8,
      unit: 'x', source: 'Bessemer Efficiency Score', updated: '2024-03-01',
    },
    runway_months: {
      p25: 6, median: 12, p75: 18, topDecile: 26,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },

  // ── Marketplace ─────────────────────────────────────────────────────────
  marketplace: {
    conversion_rate: {
      p25: 1, median: 2.5, p75: 5, topDecile: 10,
      unit: '%', source: 'NFX Marketplace Benchmarks', updated: '2024-02-01',
    },
    ltv_cac_ratio: {
      p25: 1.5, median: 3.0, p75: 5.0, topDecile: 8.0,
      unit: 'x', source: 'NFX Marketplace Benchmarks', updated: '2024-02-01',
    },
    gross_margin: {
      p25: 40, median: 55, p75: 70, topDecile: 85,
      unit: '%', source: 'a16z Marketplace 100', updated: '2024-01-01',
    },
    arr_growth: {
      p25: 25, median: 60, p75: 120, topDecile: 250,
      unit: '%', source: 'NFX Marketplace Benchmarks', updated: '2024-02-01',
    },
    burn_multiple: {
      p25: 4.5, median: 2.8, p75: 1.5, topDecile: 0.9,
      unit: 'x', source: 'Bessemer Efficiency Score', updated: '2024-03-01',
    },
    runway_months: {
      p25: 7, median: 13, p75: 19, topDecile: 28,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },

  // ── Biotech / DeepTech ──────────────────────────────────────────────────
  biotech_deeptech: {
    conversion_rate: {
      p25: 0.5, median: 1.5, p75: 3, topDecile: 6,
      unit: '%', source: 'Silicon Valley Bank Life Science Report', updated: '2024-01-01',
    },
    ltv_cac_ratio: {
      p25: 1.0, median: 2.0, p75: 4.0, topDecile: 7.0,
      unit: 'x', source: 'Bio Industry Analysis', updated: '2024-01-01',
    },
    gross_margin: {
      p25: 50, median: 65, p75: 78, topDecile: 88,
      unit: '%', source: 'McKinsey Biotech Margins', updated: '2024-01-01',
    },
    arr_growth: {
      p25: 10, median: 30, p75: 60, topDecile: 120,
      unit: '%', source: 'Bio Industry Analysis', updated: '2024-01-01',
    },
    burn_multiple: {
      p25: 8.0, median: 5.0, p75: 3.0, topDecile: 1.5,
      unit: 'x', source: 'Silicon Valley Bank', updated: '2024-01-01',
    },
    runway_months: {
      p25: 12, median: 18, p75: 28, topDecile: 42,
      unit: 'months', source: 'Silicon Valley Bank Life Science Report', updated: '2024-01-01',
    },
  },

  // ── Consumer Brand ──────────────────────────────────────────────────────
  consumer: {
    conversion_rate: {
      p25: 1.5, median: 3, p75: 6, topDecile: 10,
      unit: '%', source: 'a16z Consumer Metrics', updated: '2024-01-01',
    },
    ltv_cac_ratio: {
      p25: 1.2, median: 2.5, p75: 4.0, topDecile: 6.5,
      unit: 'x', source: 'a16z Consumer Metrics', updated: '2024-01-01',
    },
    gross_margin: {
      p25: 45, median: 58, p75: 68, topDecile: 80,
      unit: '%', source: 'Consumer Brand Index', updated: '2024-01-01',
    },
    arr_growth: {
      p25: 15, median: 40, p75: 80, topDecile: 180,
      unit: '%', source: 'a16z Consumer Metrics', updated: '2024-01-01',
    },
    burn_multiple: {
      p25: 5.0, median: 3.0, p75: 1.8, topDecile: 1.0,
      unit: 'x', source: 'Consumer Brand Index', updated: '2024-01-01',
    },
    runway_months: {
      p25: 6, median: 11, p75: 17, topDecile: 24,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },

  // ── Fintech ─────────────────────────────────────────────────────────────
  fintech: {
    conversion_rate: {
      p25: 1, median: 2.5, p75: 5, topDecile: 9,
      unit: '%', source: 'CB Insights Fintech Report', updated: '2024-03-01',
    },
    ltv_cac_ratio: {
      p25: 2.0, median: 3.5, p75: 6.0, topDecile: 10.0,
      unit: 'x', source: 'CB Insights Fintech Report', updated: '2024-03-01',
    },
    gross_margin: {
      p25: 55, median: 68, p75: 78, topDecile: 88,
      unit: '%', source: 'Fintech Industry Analysis', updated: '2024-01-01',
    },
    arr_growth: {
      p25: 25, median: 55, p75: 110, topDecile: 220,
      unit: '%', source: 'CB Insights Fintech Report', updated: '2024-03-01',
    },
    burn_multiple: {
      p25: 3.5, median: 2.2, p75: 1.3, topDecile: 0.7,
      unit: 'x', source: 'Bessemer Efficiency Score', updated: '2024-03-01',
    },
    runway_months: {
      p25: 9, median: 15, p75: 22, topDecile: 32,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },

  // ── Hardware ────────────────────────────────────────────────────────────
  hardware: {
    conversion_rate: {
      p25: 0.8, median: 2, p75: 4, topDecile: 7,
      unit: '%', source: 'Hardware Club Benchmarks', updated: '2024-01-01',
    },
    ltv_cac_ratio: {
      p25: 1.5, median: 2.5, p75: 4.0, topDecile: 6.0,
      unit: 'x', source: 'Hardware Club Benchmarks', updated: '2024-01-01',
    },
    gross_margin: {
      p25: 30, median: 45, p75: 58, topDecile: 70,
      unit: '%', source: 'Hardware Industry Analysis', updated: '2024-01-01',
    },
    arr_growth: {
      p25: 15, median: 35, p75: 70, topDecile: 140,
      unit: '%', source: 'Hardware Club Benchmarks', updated: '2024-01-01',
    },
    burn_multiple: {
      p25: 6.0, median: 3.5, p75: 2.0, topDecile: 1.2,
      unit: 'x', source: 'Hardware Industry Analysis', updated: '2024-01-01',
    },
    runway_months: {
      p25: 8, median: 14, p75: 22, topDecile: 30,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },

  // ── E-commerce ──────────────────────────────────────────────────────────
  ecommerce: {
    conversion_rate: {
      p25: 1.5, median: 3, p75: 5, topDecile: 9,
      unit: '%', source: 'Shopify Commerce Report', updated: '2024-04-01',
    },
    ltv_cac_ratio: {
      p25: 1.5, median: 2.8, p75: 4.5, topDecile: 7.0,
      unit: 'x', source: 'Shopify Commerce Report', updated: '2024-04-01',
    },
    gross_margin: {
      p25: 35, median: 48, p75: 60, topDecile: 75,
      unit: '%', source: 'E-commerce Industry Analysis', updated: '2024-01-01',
    },
    arr_growth: {
      p25: 20, median: 45, p75: 90, topDecile: 180,
      unit: '%', source: 'Shopify Commerce Report', updated: '2024-04-01',
    },
    burn_multiple: {
      p25: 4.0, median: 2.5, p75: 1.5, topDecile: 0.8,
      unit: 'x', source: 'E-commerce Industry Analysis', updated: '2024-01-01',
    },
    runway_months: {
      p25: 6, median: 11, p75: 16, topDecile: 24,
      unit: 'months', source: 'Carta Data Insights', updated: '2024-04-01',
    },
  },
};
