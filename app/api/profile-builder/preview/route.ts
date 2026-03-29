import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mergeToAssessmentData } from '@/lib/profile-builder/data-merger'
import { calculateIQScore, inferStage, normalizeSector } from '@/features/qscore/calculators/iq-score-calculator'
import { validateConsistency } from '@/features/qscore/validators/consistency-validator'
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

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = getAdminClient()

    const { data: rows, error: fetchErr } = await supabase
      .from('profile_builder_data')
      .select('section, extracted_fields, confidence_map, completion_score')
      .eq('user_id', userId)

    if (fetchErr) {
      return NextResponse.json({ error: 'Failed to load draft data' }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({
        projectedScore: 0,
        finalIQ: 0,
        availableIQ: 0,
        grade: 'F',
        iqBreakdown: [],
        validationWarnings: [],
        boostActions: [],
        marketplaceUnlocked: false,
        sectionsComplete: 0,
        scoreVersion: 'v2_iq',
      })
    }

    const sections: Partial<Record<number, SectionData>> = {}
    for (const row of rows) {
      sections[row.section as number] = {
        extractedFields: (row.extracted_fields ?? {}) as Record<string, unknown>,
        confidenceMap: (row.confidence_map ?? {}) as Record<string, number>,
      }
    }

    const { assessmentData } = mergeToAssessmentData(sections)

    // Load founder profile for stage/sector
    const { data: fp } = await supabase
      .from('founder_profiles')
      .select('industry, stage, is_impact_focused')
      .eq('user_id', userId)
      .single()

    const sector = normalizeSector(fp?.industry ?? 'default')
    const stage = inferStage(fp?.stage ?? 'mid')
    const isImpactFocused = fp?.is_impact_focused ?? false

    const iqResult = calculateIQScore(
      assessmentData,
      stage,
      sector,
      isImpactFocused ? 'impact' : undefined
    )

    // Validation warnings (non-blocking in preview)
    const allIndicators = iqResult.parameters.flatMap(p => p.indicators)
    const validation = validateConsistency(allIndicators, assessmentData)

    const sectionsComplete = rows.filter(r => (r.completion_score ?? 0) >= 70).length

    // Benchmark percentiles (non-blocking)
    const percentileMap = new Map<string, { percentile: number | null; label: string }>()
    try {
      const rawPercentiles = await getAllIndicatorPercentiles(supabase, allIndicators, sector, stage)
      rawPercentiles.forEach((v, k) => percentileMap.set(k, { percentile: v.percentile, label: v.label }))
    } catch {
      // non-blocking
    }

    // Boost actions per parameter
    const boostActions = iqResult.parameters
      .filter(p => p.averageScore < 3.0)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3)
      .map(p => ({
        parameter: p.name,
        action: getBoostAction(p.id),
        currentScore: Math.round(p.averageScore * 10) / 10,
      }))

    return NextResponse.json({
      projectedScore: Math.round(iqResult.finalIQ),
      finalIQ: iqResult.finalIQ,
      availableIQ: iqResult.availableIQ,
      grade: iqResult.grade,
      iqBreakdown: iqResult.parameters.map(p => ({
        id: p.id,
        name: p.name,
        averageScore: Math.round(p.averageScore * 10) / 10,
        weight: Math.round(p.weight * 100),
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
      })),
      validationWarnings: validation.warnings.map(w => w.message),
      boostActions,
      marketplaceUnlocked: iqResult.finalIQ >= 45,
      sectionsComplete,
      track: iqResult.track,
      scoreVersion: 'v2_iq',
    })
  } catch (err) {
    console.error('[profile-builder/preview]', err)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}

function getBoostAction(paramId: string): string {
  const actions: Record<string, string> = {
    p1: 'Upload LOIs or customer contracts to strengthen market readiness',
    p2: 'Add market size research or competitive analysis document',
    p3: 'Document IP claims, patents, or technical architecture',
    p4: 'Upload team bios or LinkedIn profiles to strengthen team credibility',
    p5: 'Add impact metrics or alignment with development goals',
    p6: 'Connect Stripe or upload financial model/spreadsheet',
  }
  return actions[paramId] ?? 'Complete more section questions to improve your score'
}
