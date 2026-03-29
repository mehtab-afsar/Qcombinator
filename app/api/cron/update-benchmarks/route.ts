/**
 * Edge Alpha IQ Score v2 — Monthly Benchmark Refresh
 * Aggregates qscore_history where sample_size >= 20, updates qscore_benchmarks
 * Called by monthly cron job. Requires CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { clearAllCaches } from '@/lib/cache/qscore-cache'

const INDICATOR_IDS = [
  '1.1', '1.2', '1.3', '1.4', '1.5',
  '2.1', '2.2', '2.3', '2.4', '2.5',
  '3.1', '3.2', '3.3', '3.4', '3.5',
  '4.1', '4.2', '4.3', '4.4', '4.5',
  '5.1', '5.2', '5.3', '5.4', '5.5',
  '6.1', '6.2', '6.3', '6.4', '6.5',
]

const SECTORS = ['b2b_saas', 'biotech', 'marketplace', 'fintech', 'consumer', 'climate', 'hardware', 'edtech', 'healthtech', 'ai_ml', 'default']
const STAGES = ['early', 'mid', 'growth']
const MIN_SAMPLE = 20

export async function POST(req: NextRequest) {
  // Verify cron secret
  const secret = req.headers.get('x-cron-secret') ?? req.headers.get('authorization')
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  let updated = 0
  let skipped = 0

  for (const sector of SECTORS) {
    for (const stage of STAGES) {
      // Fetch v2_iq scores for this sector/stage
      const { data: scores, error } = await supabase
        .from('qscore_history')
        .select('iq_breakdown')
        .eq('score_version', 'v2_iq')
        .eq('assessment_data->scoreVersion', 'v2_iq')
        .not('iq_breakdown', 'is', null)
        .limit(1000)

      if (error || !scores || scores.length < MIN_SAMPLE) {
        skipped++
        continue
      }

      // Extract per-indicator scores from iq_breakdown
      for (const indicatorId of INDICATOR_IDS) {
        const indicatorScores: number[] = []

        for (const row of scores) {
          const breakdown = row.iq_breakdown
          if (!breakdown?.parameters) continue
          for (const param of breakdown.parameters) {
            const ind = param.indicators?.find((i: { id: string }) => i.id === indicatorId)
            if (ind && !ind.excluded && ind.rawScore > 0) {
              indicatorScores.push(ind.rawScore)
            }
          }
        }

        if (indicatorScores.length < MIN_SAMPLE) continue

        indicatorScores.sort((a, b) => a - b)
        const n = indicatorScores.length
        const p = (pct: number) => indicatorScores[Math.floor((pct / 100) * n)] ?? 0

        const { error: upsertErr } = await supabase
          .from('qscore_benchmarks')
          .upsert({
            indicator_id: indicatorId,
            sector,
            stage,
            p10: p(10),
            p25: p(25),
            p50: p(50),
            p75: p(75),
            p90: p(90),
            sample_size: n,
            last_updated: new Date().toISOString(),
          }, { onConflict: 'indicator_id,sector,stage' })

        if (!upsertErr) updated++
      }
    }
  }

  // Clear benchmark cache so new data is picked up immediately
  clearAllCaches()

  return NextResponse.json({
    updated,
    skipped,
    message: `Benchmark refresh complete: ${updated} updated, ${skipped} sectors skipped (<${MIN_SAMPLE} samples)`,
  })
}
