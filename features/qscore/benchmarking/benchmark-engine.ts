/**
 * Edge Alpha IQ Score v2 — Benchmark Engine
 *
 * Calculates percentile rank for each indicator score vs. cohort.
 * Fallback chain: sector+stage → sector-only → indicator-only → null
 * Cached in-memory for 1 hour.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { ScoreStage } from '../types/qscore.types'
import { getCachedBenchmark, setCachedBenchmark } from '../../../lib/cache/qscore-cache'

export interface BenchmarkRow {
  indicator_id: string
  sector: string
  stage: string
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  sample_size: number
}

export interface PercentileResult {
  indicatorId: string
  percentile: number | null
  label: string
  benchmarkSector: string | null
  benchmarkStage: string | null
  sampleSize: number
}

// ── DB fetch with caching ─────────────────────────────────────────────────────

async function fetchBenchmark(
  supabase: SupabaseClient,
  indicatorId: string,
  sector: string,
  stage: string
): Promise<BenchmarkRow | null> {
  const cached = getCachedBenchmark<BenchmarkRow>(indicatorId, sector, stage)
  if (cached) return cached

  const { data, error } = await supabase
    .from('qscore_benchmarks')
    .select('*')
    .eq('indicator_id', indicatorId)
    .eq('sector', sector)
    .eq('stage', stage)
    .single()

  if (error || !data) return null

  setCachedBenchmark(indicatorId, sector, stage, data as BenchmarkRow)
  return data as BenchmarkRow
}

// ── Percentile interpolation ──────────────────────────────────────────────────

function calcPercentile(score: number, row: BenchmarkRow): number {
  const { p10, p25, p50, p75, p90 } = row

  if (score <= p10) return interpolate(score, 0, p10, 0, 10)
  if (score <= p25) return interpolate(score, p10, p25, 10, 25)
  if (score <= p50) return interpolate(score, p25, p50, 25, 50)
  if (score <= p75) return interpolate(score, p50, p75, 50, 75)
  if (score <= p90) return interpolate(score, p75, p90, 75, 90)
  return interpolate(score, p90, 5.0, 90, 99)
}

function interpolate(
  value: number,
  min: number,
  max: number,
  outMin: number,
  outMax: number
): number {
  if (max === min) return outMin
  const t = (value - min) / (max - min)
  return Math.round(Math.min(outMax, outMin + t * (outMax - outMin)))
}

function percentileLabel(p: number | null): string {
  if (p === null) return 'No benchmark data'
  if (p >= 90) return 'Top 10%'
  if (p >= 75) return 'Top 25%'
  if (p >= 50) return 'Above median'
  if (p >= 25) return 'Below median'
  return 'Bottom quartile'
}

// ── Main public function ──────────────────────────────────────────────────────

export async function getIndicatorPercentile(
  supabase: SupabaseClient,
  indicatorId: string,
  score: number,
  sector: string,
  stage: ScoreStage
): Promise<PercentileResult> {
  const fallbackChain = [
    { sector, stage },
    { sector, stage: 'mid' },              // sector match, default stage
    { sector: 'default', stage },           // default sector, same stage
    { sector: 'default', stage: 'mid' },   // full fallback
  ]

  for (const { sector: s, stage: st } of fallbackChain) {
    const row = await fetchBenchmark(supabase, indicatorId, s, st).catch(() => null)
    if (row && row.sample_size >= 5) {
      const percentile = calcPercentile(score, row)
      return {
        indicatorId,
        percentile,
        label: percentileLabel(percentile),
        benchmarkSector: s,
        benchmarkStage: st,
        sampleSize: row.sample_size,
      }
    }
  }

  return {
    indicatorId,
    percentile: null,
    label: 'No benchmark data',
    benchmarkSector: null,
    benchmarkStage: null,
    sampleSize: 0,
  }
}

export async function getAllIndicatorPercentiles(
  supabase: SupabaseClient,
  indicatorScores: Array<{ id: string; rawScore: number; excluded: boolean }>,
  sector: string,
  stage: ScoreStage
): Promise<Map<string, PercentileResult>> {
  const results = await Promise.allSettled(
    indicatorScores
      .filter(i => !i.excluded && i.rawScore > 0)
      .map(i => getIndicatorPercentile(supabase, i.id, i.rawScore, sector, stage))
  )

  const map = new Map<string, PercentileResult>()
  for (const r of results) {
    if (r.status === 'fulfilled') {
      map.set(r.value.indicatorId, r.value)
    }
  }
  return map
}
