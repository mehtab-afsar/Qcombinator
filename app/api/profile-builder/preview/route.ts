import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { mergeToAssessmentData } from '@/lib/profile-builder/data-merger'
import { calculatePRDQScore } from '@/features/qscore/calculators/prd-aligned-qscore'
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

function getBoostActions(dimensions: Record<string, number>): Array<{ action: string; impact: number }> {
  const actions: Array<{ action: string; impact: number }> = []
  if ((dimensions.financial ?? 0) < 70)
    actions.push({ action: 'Connect Stripe or upload financial model', impact: 18 })
  if ((dimensions.traction ?? 0) < 65)
    actions.push({ action: 'Upload customer list or LOIs', impact: 12 })
  if ((dimensions.market ?? 0) < 65)
    actions.push({ action: 'Upload competitive analysis or market research', impact: 8 })
  if ((dimensions.team ?? 0) < 70)
    actions.push({ action: 'Add LinkedIn URL or team bio document', impact: 6 })
  if ((dimensions.product ?? 0) < 65)
    actions.push({ action: 'Share customer interview notes or feedback', impact: 7 })
  return actions.sort((a, b) => b.impact - a.impact).slice(0, 3)
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
        grade: 'F',
        dimensions: { market: 0, product: 0, gtm: 0, financial: 0, team: 0, traction: 0 },
        boostActions: [],
        marketplaceUnlocked: false,
        sectionsComplete: 0,
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
    const qScore = calculatePRDQScore(assessmentData)

    const dimensions = {
      market: Math.round(qScore.breakdown.market?.score ?? 0),
      product: Math.round(qScore.breakdown.product?.score ?? 0),
      gtm: Math.round(qScore.breakdown.goToMarket?.score ?? 0),
      financial: Math.round(qScore.breakdown.financial?.score ?? 0),
      team: Math.round(qScore.breakdown.team?.score ?? 0),
      traction: Math.round(qScore.breakdown.traction?.score ?? 0),
    }

    const sectionsComplete = rows.filter(r => (r.completion_score ?? 0) >= 70).length
    const projectedScore = Math.round(qScore.overall)
    const boostActions = getBoostActions(dimensions)

    return NextResponse.json({
      projectedScore,
      grade: qScore.grade,
      dimensions,
      boostActions,
      marketplaceUnlocked: projectedScore >= 65,
      sectionsComplete,
    })
  } catch (err) {
    console.error('[profile-builder/preview]', err)
    return NextResponse.json({ error: 'Preview failed' }, { status: 500 })
  }
}
