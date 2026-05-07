/**
 * Benchmark Retriever
 *
 * Looks up sector-specific benchmark data and evaluates founder metrics
 * against percentile ranges. Replaces static benchmark strings with
 * structured, quantified comparisons.
 */

import { Sector } from '../knowledge-base';
import {
  BENCHMARK_REGISTRY,
  STAGE_BENCHMARK_REGISTRY,
  type BenchmarkRange,
  type BenchmarkPercentile,
  type BenchmarkStage,
  type MetricName,
  type SectorBenchmarks,
} from './benchmark-data';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface BenchmarkResult {
  metric: MetricName;
  benchmark: BenchmarkRange;
  sector: string;
}

export interface BenchmarkEvaluation {
  metric: MetricName;
  value: number;
  percentile: BenchmarkPercentile;
  benchmark: BenchmarkRange;
  humanReadable: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Retrieval
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrieve benchmark ranges for specific metrics in a given sector and optional stage.
 * Falls back: stage-specific → 'all' stage → saas_b2b.
 */
export function retrieveBenchmarks(
  sector: Sector,
  metrics: MetricName[],
  stage?: BenchmarkStage
): BenchmarkResult[] {
  const sectorKey = sector === 'all' ? 'saas_b2b' : sector;

  // Try stage-aware registry first
  let benchmarks: SectorBenchmarks | undefined;
  if (stage && stage !== 'all') {
    const stageBuckets = STAGE_BENCHMARK_REGISTRY[sectorKey as keyof typeof STAGE_BENCHMARK_REGISTRY];
    benchmarks = stageBuckets?.[stage] ?? stageBuckets?.['all' as BenchmarkStage];
  }
  // Fall back to legacy flat registry
  if (!benchmarks) {
    benchmarks = BENCHMARK_REGISTRY[sectorKey as keyof typeof BENCHMARK_REGISTRY] ?? BENCHMARK_REGISTRY.saas_b2b;
  }

  return metrics
    .filter(m => benchmarks![m] !== undefined)
    .map(m => ({
      metric: m,
      benchmark: benchmarks![m],
      sector: sectorKey,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a single value against a benchmark range.
 * For burn_multiple, lower is better (inverted comparison).
 */
export function evaluateAgainstBenchmark(
  value: number,
  benchmark: BenchmarkRange,
  metric: MetricName
): BenchmarkPercentile {
  // burn_multiple is inverted: lower = better
  if (metric === 'burn_multiple') {
    if (value <= benchmark.topDecile) return 'top_decile';
    if (value <= benchmark.p75) return 'above_p75';
    if (value <= benchmark.median) return 'p50_p75';
    if (value <= benchmark.p25) return 'p25_p50';
    return 'below_p25';
  }

  // Normal metrics: higher = better
  if (value >= benchmark.topDecile) return 'top_decile';
  if (value >= benchmark.p75) return 'above_p75';
  if (value >= benchmark.median) return 'p50_p75';
  if (value >= benchmark.p25) return 'p25_p50';
  return 'below_p25';
}

/**
 * Evaluate a founder's metric against sector benchmarks with human-readable output.
 */
export function evaluateMetric(
  metric: MetricName,
  value: number,
  sector: Sector
): BenchmarkEvaluation {
  const [result] = retrieveBenchmarks(sector, [metric]);
  if (!result) {
    // No benchmark available — return neutral
    return {
      metric,
      value,
      percentile: 'p25_p50',
      benchmark: { p25: 0, median: 0, p75: 0, topDecile: 0, unit: '', source: '', updated: '' },
      humanReadable: `No benchmark data available for ${metric}`,
    };
  }

  const percentile = evaluateAgainstBenchmark(value, result.benchmark, metric);
  const b = result.benchmark;

  const percentileLabels: Record<BenchmarkPercentile, string> = {
    below_p25: 'below 25th percentile',
    p25_p50: '25th–50th percentile',
    p50_p75: '50th–75th percentile',
    above_p75: 'above 75th percentile',
    top_decile: 'top 10%',
  };

  const humanReadable = `Your ${metric.replace(/_/g, ' ')} of ${value}${b.unit} is ${percentileLabels[percentile]} for ${result.sector.replace(/_/g, ' ')} (median: ${b.median}${b.unit}, p75: ${b.p75}${b.unit})`;

  return {
    metric,
    value,
    percentile,
    benchmark: result.benchmark,
    humanReadable,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt Context Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a benchmark context string for injection into LLM prompts.
 * Replaces the old static benchmark text with real percentile data.
 */
export function buildBenchmarkContext(
  sector: Sector,
  metrics: MetricName[] = ['conversion_rate', 'ltv_cac_ratio', 'gross_margin'],
  stage?: BenchmarkStage
): string {
  const results = retrieveBenchmarks(sector, metrics, stage);
  if (results.length === 0) {
    return 'No sector-specific benchmarks available. Use general startup benchmarks.';
  }

  const sectorLabel = sector === 'all' ? 'General (B2B SaaS default)' : sector.replace(/_/g, ' ').toUpperCase();

  const lines = results.map(r => {
    const b = r.benchmark;
    return `- ${r.metric.replace(/_/g, ' ')}: p25=${b.p25}${b.unit}, median=${b.median}${b.unit}, p75=${b.p75}${b.unit}, top 10%=${b.topDecile}${b.unit} (${b.source})`;
  });

  return `SECTOR: ${sectorLabel}\n${lines.join('\n')}`;
}
