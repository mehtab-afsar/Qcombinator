import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mergeToAssessmentData } from '@/lib/profile-builder/data-merger'
import { enrichDataQuality } from '@/lib/profile-builder/confidence-engine'
import { reconcileIndicators, applyReconciliationFlags } from '@/lib/profile-builder/reconciliation-engine'
import { validateConsistency } from '@/features/qscore/validators/consistency-validator'
import {
  calculateIQScore,
  inferStage,
  normalizeSector,
} from '@/features/qscore/calculators/iq-score-calculator'
import { calculateGrade } from '@/features/qscore/types/qscore.types'
import { getCachedSectorWeights, setCachedSectorWeights } from '@/lib/cache/qscore-cache'
import { getAllIndicatorPercentiles } from '@/features/qscore/benchmarking/benchmark-engine'
import type { SectionData } from '@/lib/profile-builder/data-merger'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { data } = await supabase.auth.getUser(token)
  return data.user?.id ?? null
}

export async function POST(req: NextRequest) {
  try {
    // 1. Auth + load section data
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getAdminClient()

    const { data: rows, error: fetchErr } = await supabase
      .from('profile_builder_data')
      .select('section, extracted_fields, confidence_map, completion_score')
      .eq('user_id', userId)

    if (fetchErr) {
      console.error('[submit] fetch error:', fetchErr)
      return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 })
    }

    // 2. Require at least 3 sections at 70%+
    const completedSections = (rows ?? []).filter(r => (r.completion_score ?? 0) >= 70)
    if (completedSections.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 sections must be 70%+ complete before submitting' },
        { status: 400 }
      )
    }

    // 3. 24-hour rate limit
    const { data: recentSubmission } = await supabase
      .from('qscore_history')
      .select('id, calculated_at')
      .eq('user_id', userId)
      .eq('data_source', 'profile_builder')
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    if (recentSubmission) {
      const hoursSince = (Date.now() - new Date(recentSubmission.calculated_at).getTime()) / 3_600_000
      if (hoursSince < 24) {
        const retakeAvailableAt = new Date(
          new Date(recentSubmission.calculated_at).getTime() + 24 * 60 * 60 * 1000
        ).toISOString()
        return NextResponse.json(
          { error: 'You can recalculate once per 24 hours.', retakeAvailableAt },
          { status: 429 }
        )
      }
    }

    // 4. Build section map + merge to AssessmentData
    const sections: Partial<Record<number, SectionData>> = {}
    for (const row of rows ?? []) {
      sections[row.section as number] = {
        extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
        confidenceMap: (row.confidence_map ?? {}) as Record<string, number>,
      }
    }
    const { assessmentData } = mergeToAssessmentData(sections)

    // 5. Load founder_profiles (stage, sector, is_impact_focused)
    const { data: fp } = await supabase
      .from('founder_profiles')
      .select('industry, stage, is_impact_focused')
      .eq('user_id', userId)
      .single()

    const sector = normalizeSector(fp?.industry ?? 'default')
    const stage = inferStage(fp?.stage ?? 'mid')
    const isImpactFocused = fp?.is_impact_focused ?? false

    // 6. Get sector weights from DB (with cache)
    let customWeights: number[] | undefined
    const cachedWeights = getCachedSectorWeights<number[]>(sector, stage)
    if (cachedWeights) {
      customWeights = cachedWeights
    } else {
      const { data: weightRow } = await supabase
        .from('sector_weight_profiles')
        .select('p1_weight, p2_weight, p3_weight, p4_weight, p5_weight, p6_weight')
        .eq('sector', sector)
        .single()
      if (weightRow) {
        customWeights = [
          weightRow.p1_weight, weightRow.p2_weight, weightRow.p3_weight,
          weightRow.p4_weight, weightRow.p5_weight, weightRow.p6_weight,
        ]
        setCachedSectorWeights(sector, stage, customWeights)
      }
    }

    // 7. Confidence engine (metadata enrichment — does not affect rawScore)
    enrichDataQuality(assessmentData)

    // 8. AI reconciliation (flags only — non-blocking on error)
    let reconciliationResults: Awaited<ReturnType<typeof reconcileIndicators>> = []
    try {
      reconciliationResults = await reconcileIndicators(assessmentData, userId)
    } catch {
      // non-blocking
    }

    // 9. Calculate IQ Score
    const iqResult = calculateIQScore(
      assessmentData,
      stage,
      sector,
      isImpactFocused ? 'impact' : undefined,
      customWeights
    )

    // Apply reconciliation flags to indicators
    const allIndicators = iqResult.parameters.flatMap(p => p.indicators)
    applyReconciliationFlags(allIndicators, reconciliationResults)

    // 10. Benchmark percentiles (non-blocking)
    let percentileMap = new Map<string, { percentile: number | null; label: string; sampleSize: number }>()
    try {
      const rawPercentiles = await getAllIndicatorPercentiles(supabase, allIndicators, sector, stage)
      rawPercentiles.forEach((v, k) => percentileMap.set(k, { percentile: v.percentile, label: v.label, sampleSize: v.sampleSize }))
    } catch {
      // non-blocking
    }

    // 11. Cross-indicator validation
    const validation = validateConsistency(allIndicators, assessmentData)
    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Consistency check failed',
          issues: validation.blocking.map(i => ({ code: i.code, message: i.message })),
        },
        { status: 400 }
      )
    }

    const warningMessages = validation.warnings.map(w => w.message)
    const iqResultWithWarnings = { ...iqResult, validationWarnings: warningMessages }

    // 11. Bluff detection (incomplete sections blend toward baseline)
    const incompleteSections = (rows ?? []).filter(r => (r.completion_score ?? 0) < 30)
    let finalScore = Math.round(iqResultWithWarnings.finalIQ)
    if (incompleteSections.length > 0) {
      const blendFactor = incompleteSections.length / 5
      finalScore = Math.round(finalScore * (1 - blendFactor * 0.3) + 30 * blendFactor * 0.3)
    }
    finalScore = Math.max(1, Math.min(100, finalScore))

    // 12. Get previous score for chain
    const { data: prevScore } = await supabase
      .from('qscore_history')
      .select('id')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    // 13. Build breakdown objects from parameters
    const paramMap = Object.fromEntries(iqResultWithWarnings.parameters.map(p => [p.id, p]))

    // 14. INSERT qscore_history with score_version='v2_iq'
    const { error: insertErr } = await supabase
      .from('qscore_history')
      .insert({
        user_id: userId,
        overall_score: finalScore,
        // Legacy dimension fields — mapped from closest IQ parameters for backward compat
        market_score:   Math.round((paramMap['p1']?.averageScore ?? 0) * 20),
        product_score:  Math.round((paramMap['p3']?.averageScore ?? 0) * 20),
        gtm_score:      Math.round((paramMap['p2']?.averageScore ?? 0) * 20),
        financial_score:Math.round((paramMap['p6']?.averageScore ?? 0) * 20),
        team_score:     Math.round((paramMap['p4']?.averageScore ?? 0) * 20),
        traction_score: Math.round((paramMap['p1']?.averageScore ?? 0) * 20),
        grade: calculateGrade(finalScore),
        data_source: 'profile_builder',
        assessment_data: { ...assessmentData, scoreVersion: 'v2_iq' },
        previous_score_id: prevScore?.id ?? null,
        // v2 specific
        score_version: 'v2_iq',
        iq_breakdown: {
          ...iqResultWithWarnings,
          percentiles: Object.fromEntries(percentileMap),
        },
        available_iq: iqResultWithWarnings.availableIQ,
        track: iqResultWithWarnings.track,
        reconciliation_flags: reconciliationResults
          .filter(r => r.vcAlert)
          .map(r => ({ indicatorId: r.indicatorId, alert: r.vcAlert, severity: r.anomalySeverity })),
        validation_warnings: warningMessages,
      })

    if (insertErr) console.error('[submit] qscore insert error:', insertErr)

    // 15. Log reconciliation results for observability
    const loggable = reconciliationResults.filter(r => r.applied || r.error)
    if (loggable.length > 0) {
      await supabase.from('qscore_reconciliation_log').insert(
        loggable.map(r => ({
          user_id: userId,
          indicator_id: r.indicatorId,
          founder_value: r.founderValue,
          ai_estimate: r.aiEstimate,
          deviation: r.deviation,
          anomaly_severity: r.anomalySeverity,
          confidence_adjustment: r.confidenceAdjustment,
          vc_alert: r.vcAlert,
          applied: r.applied,
          error: r.error ?? null,
        }))
      ).then(({ error: logErr }) => {
        if (logErr) console.warn('[submit] reconciliation log failed:', logErr)
      })
    }

    // 16. UPDATE founder_profiles — mark profile builder complete
    await supabase
      .from('founder_profiles')
      .update({
        profile_builder_completed: true,
        profile_builder_completed_at: new Date().toISOString(),
        assessment_completed: true,
      })
      .eq('user_id', userId)

    // Build IQ breakdown summary for response (with per-indicator percentile)
    const iqBreakdown = iqResultWithWarnings.parameters.map(p => ({
      id: p.id,
      name: p.name,
      weight: Math.round(p.weight * 100),
      averageScore: Math.round(p.averageScore * 10) / 10,
      indicatorsActive: p.indicators.filter(i => !i.excluded).length,
      indicators: p.indicators.map(ind => ({
        id: ind.id,
        name: ind.name,
        rawScore: ind.rawScore,
        excluded: ind.excluded,
        exclusionReason: ind.exclusionReason,
        vcAlert: ind.vcAlert,
        percentile: percentileMap.get(ind.id)?.percentile ?? null,
        percentileLabel: percentileMap.get(ind.id)?.label ?? null,
      })),
    }))

    return NextResponse.json({
      score: finalScore,
      grade: calculateGrade(finalScore),
      finalIQ: iqResultWithWarnings.finalIQ,
      availableIQ: iqResultWithWarnings.availableIQ,
      iqBreakdown,
      track: iqResultWithWarnings.track,
      reconciliationFlags: iqResultWithWarnings.reconciliationFlags,
      validationWarnings: warningMessages,
      scoreVersion: 'v2_iq',
    })
  } catch (err) {
    console.error('[profile-builder/submit]', err)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
