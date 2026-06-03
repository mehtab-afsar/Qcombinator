/**
 * Edge Alpha Q-Score v2 — Monthly Benchmark Refresh
 * Aggregates qscore_history where sample_size >= 20, updates qscore_benchmarks
 * Called by monthly cron job. Requires CRON_SECRET header.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { clearAllCaches } from '@/lib/cache/qscore-cache'

// Map founder_profiles.industry → benchmark sector key
function mapToSector(industry?: string | null): string {
  if (!industry) return 'default'
  const i = industry.toLowerCase().replace(/[-\s]/g, '_')
  if (i.includes('ai') || i.includes('software')) return 'ai_ml'
  if (i.includes('saas') || i.includes('b2b')) return 'b2b_saas'
  const direct = ['biotech', 'marketplace', 'fintech', 'consumer', 'climate', 'hardware', 'edtech', 'healthtech']
  return direct.find(k => i.includes(k)) ?? 'default'
}

// Map founder_profiles.stage → benchmark stage bucket
function mapToStage(stage?: string | null): string {
  if (!stage) return 'early'
  const s = stage.toLowerCase()
  if (s.includes('idea') || s.includes('pre') || s.includes('mvp') || s.includes('seed') || s.includes('angel')) return 'early'
  if (s.includes('series_a') || s.includes('series-a') || s.includes('launched') || s.includes('commerci') || s.includes('early-revenue') || s.includes('revenue')) return 'mid'
  if (s.includes('series_b') || s.includes('series-b') || s.includes('scaling') || s.includes('growth') || s.includes('series_c') || s.includes('series-c')) return 'growth'
  return 'early'
}

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
  // Verify cron secret — only accept Authorization: Bearer <CRON_SECRET>
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  if (req.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getAdminClient()

  let updated = 0
  let skipped = 0

  // Fetch all v2_q scores once — include user_id so we can join to founder sector/stage
  const { data: allScores, error: fetchErr } = await supabase
    .from('qscore_history')
    .select('user_id, iq_breakdown')
    .eq('score_version', 'v2_q')
    .not('iq_breakdown', 'is', null)
    .limit(5000)

  if (fetchErr || !allScores) {
    return NextResponse.json({ error: 'Failed to fetch scores', detail: fetchErr?.message }, { status: 500 })
  }

  // Resolve each user's sector/stage by joining to founder_profiles in memory
  const userIds = [...new Set(allScores.map((s: { user_id: string }) => s.user_id).filter(Boolean))]
  const profileMap = new Map<string, { industry: string | null; stage: string | null }>()
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('founder_profiles')
      .select('user_id, industry, stage')
      .in('user_id', userIds)
    for (const p of profiles ?? []) {
      profileMap.set(p.user_id, { industry: p.industry, stage: p.stage })
    }
  }

  for (const sector of SECTORS) {
    for (const stage of STAGES) {
      // Filter scores belonging to this sector/stage combination
      const scores = allScores.filter((s: { user_id: string; iq_breakdown: unknown }) => {
        const profile = profileMap.get(s.user_id)
        return mapToSector(profile?.industry) === sector && mapToStage(profile?.stage) === stage
      })

      if (scores.length < MIN_SAMPLE) {
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
