import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mergeToAssessmentData } from '@/lib/profile-builder/data-merger'
import { calculatePRDQScore } from '@/features/qscore/calculators/prd-aligned-qscore'
import { runRAGScoring } from '@/features/qscore/rag/rag-orchestrator'
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
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getAdminClient()

    // 1. Load all profile_builder_data rows for this user
    const { data: rows, error: fetchErr } = await supabase
      .from('profile_builder_data')
      .select('section, extracted_fields, confidence_map, completion_score')
      .eq('user_id', userId)

    if (fetchErr) {
      console.error('[submit] fetch error:', fetchErr)
      return NextResponse.json({ error: 'Failed to load profile data' }, { status: 500 })
    }

    // Require at least 3 sections at 70%+
    const completedSections = (rows ?? []).filter(r => (r.completion_score ?? 0) >= 70)
    if (completedSections.length < 3) {
      return NextResponse.json(
        { error: 'At least 3 sections must be 70%+ complete before submitting' },
        { status: 400 }
      )
    }

    // 24-hour rate limit — prevents gaming but lets founders resubmit as they make real progress.
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

    // 2. Build section map for data-merger
    const sections: Partial<Record<number, SectionData>> = {}
    for (const row of rows ?? []) {
      sections[row.section as number] = {
        extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
        confidenceMap: (row.confidence_map ?? {}) as Record<string, number>,
      }
    }

    // 3. Merge into AssessmentData
    const { assessmentData } = mergeToAssessmentData(sections)

    // 4. Load thresholds + sector weights (best-effort)
    let thresholds
    let dimensionWeights
    try {
      const { fetchQScoreThresholds, fetchDimensionWeights } = await import('@/features/qscore/services/threshold-config')
      const { data: fp } = await supabase
        .from('founder_profiles')
        .select('industry')
        .eq('user_id', userId)
        .single()
      thresholds = await fetchQScoreThresholds(supabase)
      dimensionWeights = await fetchDimensionWeights(supabase, fp?.industry ?? 'default')
    } catch {
      // non-critical — fall back to defaults
    }

    // 5. RAG semantic evaluation (non-blocking on failure)
    let semanticEval
    try {
      semanticEval = await runRAGScoring(assessmentData, userId)
    } catch {
      // fall back to heuristic
    }

    // 6. Calculate Q-Score
    const qScore = calculatePRDQScore(assessmentData, undefined, semanticEval, thresholds, dimensionWeights)

    // 7. Bluff detection — if incomplete sections exist, blend toward baseline
    const incompleteSections = (rows ?? []).filter(r => (r.completion_score ?? 0) < 30)
    let finalScore = Math.round(qScore.overall)
    if (incompleteSections.length > 0) {
      const blendFactor = incompleteSections.length / 5
      finalScore = Math.round(finalScore * (1 - blendFactor * 0.3) + 30 * blendFactor * 0.3)
    }
    finalScore = Math.max(1, Math.min(100, finalScore))

    // 8. Get previous score for chain
    const { data: prevScore } = await supabase
      .from('qscore_history')
      .select('id')
      .eq('user_id', userId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single()

    // 9. INSERT qscore_history
    const { error: insertErr } = await supabase
      .from('qscore_history')
      .insert({
        user_id: userId,
        overall_score: finalScore,
        market_score: Math.round(qScore.breakdown.market?.score ?? 0),
        product_score: Math.round(qScore.breakdown.product?.score ?? 0),
        gtm_score: Math.round(qScore.breakdown.goToMarket?.score ?? 0),
        financial_score: Math.round(qScore.breakdown.financial?.score ?? 0),
        team_score: Math.round(qScore.breakdown.team?.score ?? 0),
        traction_score: Math.round(qScore.breakdown.traction?.score ?? 0),
        grade: qScore.grade,
        data_source: 'profile_builder',
        assessment_data: assessmentData,
        previous_score_id: prevScore?.id ?? null,
      })

    if (insertErr) console.error('[submit] qscore insert error:', insertErr)

    // 10. UPDATE founder_profiles — mark profile builder complete
    await supabase
      .from('founder_profiles')
      .update({
        profile_builder_completed: true,
        profile_builder_completed_at: new Date().toISOString(),
        assessment_completed: true,
      })
      .eq('user_id', userId)

    return NextResponse.json({
      score: finalScore,
      grade: qScore.grade,
      breakdown: qScore.breakdown,
    })
  } catch (err) {
    console.error('[profile-builder/submit]', err)
    return NextResponse.json({ error: 'Scoring failed' }, { status: 500 })
  }
}
