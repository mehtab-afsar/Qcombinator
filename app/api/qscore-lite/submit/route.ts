/**
 * POST /api/qscore-lite/submit — public, anonymous. Looks up a company's public evidence
 * (Tavily + GitHub), scores it across 20 indicators, and returns the result — no separate GET
 * route, the browser gets everything it needs in this one response.
 *
 * NOT the Q-Score. Fully independent scoring engine and table (see the migration's own header).
 *
 * Domain-keyed 30-day cache: a lookup for a domain already scored within the last 30 days
 * short-circuits the entire Tavily/GitHub/LLM pipeline and returns the cached row directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/server'
import { parseBody } from '@/lib/api/validate'
import { qScoreLiteSubmitSchema } from '@/features/qscore-lite/scoring/validate'
import { normalizeDomain } from '@/features/qscore-lite/evidence/domain'
import { gatherEvidence } from '@/features/qscore-lite/evidence/gather'
import { generateExtractions } from '@/features/qscore-lite/extraction/generate'
import { calculateQScoreLite, groupByParameter } from '@/features/qscore-lite/scoring/aggregate'
import type { IndicatorResult } from '@/features/qscore-lite/scoring/types'
import { log } from '@/lib/logger'

const CACHE_STALENESS_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

function toResponseShape(row: {
  id: string
  qsl_score: number
  confidence_pct: number
  active_indicator_count: number
  indicator_results: IndicatorResult[]
  company_name: string
  domain: string
}) {
  return {
    id: row.id,
    domain: row.domain,
    companyName: row.company_name,
    qslScore: row.qsl_score,
    confidencePct: row.confidence_pct,
    activeIndicatorCount: row.active_indicator_count,
    parameters: groupByParameter(row.indicator_results),
    indicators: row.indicator_results,
  }
}

export async function POST(request: NextRequest) {
  try {
    const parsed = await parseBody(request, qScoreLiteSubmitSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const { companyName, url } = parsed.data
    const domain = normalizeDomain(url)
    const admin = getAdminClient()

    const { data: cached } = await admin
      .from('qscore_lite_lookups')
      .select('*')
      .eq('domain', domain)
      .maybeSingle()

    if (cached && Date.now() - new Date(cached.pulled_at).getTime() < CACHE_STALENESS_MS) {
      return NextResponse.json(toResponseShape(cached), { status: 200 })
    }

    const evidenceBundle = await gatherEvidence(companyName, domain)
    const { extractions, aiGenerated } = await generateExtractions(evidenceBundle.items)

    const publishedDateByUrl = new Map(evidenceBundle.items.map(item => [item.url, item.publishedDate]))
    const result = calculateQScoreLite(extractions, publishedDateByUrl, domain)

    const { data: saved, error } = await admin
      .from('qscore_lite_lookups')
      .upsert(
        {
          domain,
          company_name: companyName,
          url,
          evidence: evidenceBundle.items,
          indicator_results: result.indicators,
          qsl_score: result.qslScore,
          confidence_pct: result.confidencePct,
          active_indicator_count: result.activeIndicatorCount,
          ai_generated: aiGenerated,
          pulled_at: new Date().toISOString(),
        },
        { onConflict: 'domain' },
      )
      .select('*')
      .single()

    if (error || !saved) {
      log.error('qscore-lite submit: upsert failed', { error })
      return NextResponse.json({ error: 'Failed to save lookup' }, { status: 500 })
    }

    return NextResponse.json(toResponseShape(saved), { status: 201 })
  } catch (err) {
    log.error('qscore-lite submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
