/**
 * Enhanced Deal Flow API with Q-Score Dimension Scores
 * Returns founders with all 6 dimension scores for personalized matching
 */

import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch founders with their Q-Score dimensions
    const { data: founders, error } = await supabase
      .from('founder_profiles')
      .select(`
        id,
        startup_name,
        industry,
        stage,
        company_logo_url,
        avatar_url,
        qscore:qscores!inner(
          overall_score,
          p1_score,
          p2_score,
          p3_score,
          p4_score,
          p5_score,
          p6_score
        )
      `)
      .order('qscores(overall_score)', { ascending: false })
      .limit(100)

    if (error) throw error

    // Transform to match expected format
    const transformedFounders = (founders || []).map(f => ({
      id: f.id,
      name: f.startup_name,
      sector: f.industry,
      stage: f.stage,
      qScore: f.qscore?.[0]?.overall_score ?? 0,
      companyLogoUrl: f.company_logo_url,
      avatarUrl: f.avatar_url,
      // Dimension scores (NEW)
      dimensions: {
        p1: f.qscore?.[0]?.p1_score ?? 0,
        p2: f.qscore?.[0]?.p2_score ?? 0,
        p3: f.qscore?.[0]?.p3_score ?? 0,
        p4: f.qscore?.[0]?.p4_score ?? 0,
        p5: f.qscore?.[0]?.p5_score ?? 0,
        p6: f.qscore?.[0]?.p6_score ?? 0,
      },
    }))

    return Response.json({
      founders: transformedFounders,
      total: transformedFounders.length,
    })
  } catch (error) {
    console.error('Failed to fetch deal flow with dimensions:', error)
    return Response.json(
      { error: 'Failed to fetch deal flow' },
      { status: 500 }
    )
  }
}
