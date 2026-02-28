import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/investor/deal-flow
// Returns founders with completed onboarding and a Q-Score, sorted by score desc.
// Investors use this to browse the deal flow pipeline.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch founders who have completed onboarding
    const { data: founders, error } = await supabase
      .from('founder_profiles')
      .select(`
        user_id,
        full_name,
        startup_name,
        industry,
        stage,
        tagline,
        location,
        funding,
        startup_profile_data,
        updated_at
      `)
      .eq('onboarding_completed', true)
      .eq('role', 'founder')
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Deal flow fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch deal flow' }, { status: 500 })
    }

    if (!founders || founders.length === 0) {
      return NextResponse.json({ founders: [] })
    }

    // For each founder, get their latest Q-Score
    const enriched = await Promise.all(
      founders.map(async (f) => {
        const { data: qrow } = await supabase
          .from('qscore_history')
          .select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, percentile, calculated_at')
          .eq('user_id', f.user_id)
          .order('calculated_at', { ascending: false })
          .limit(1)
          .single()

        // Map DB stage values to display labels
        const stageLabel: Record<string, string> = {
          idea: 'Idea', mvp: 'MVP', launched: 'Seed', scaling: 'Series A',
          'pre-seed': 'Pre-Seed', seed: 'Seed', 'series-a': 'Series A', bootstrapped: 'Bootstrapped',
        }

        // Pull richer data from startup_profile_data JSONB
        const sp = (f.startup_profile_data ?? {}) as Record<string, unknown>
        const tagline = f.tagline
          || (sp.oneLiner as string)
          || (sp.problemStatement as string)?.slice(0, 100)
          || f.industry
          || ''
        const fundingGoal = (sp.raisingAmount as string)
          || f.funding
          || ''
        const highlights: string[] = []
        if (sp.tamSize)       highlights.push(`TAM: ${sp.tamSize as string}`)
        if (sp.businessModel) highlights.push(sp.businessModel as string)
        if (sp.whyNow)        highlights.push((sp.whyNow as string).slice(0, 60))

        return {
          id: f.user_id,
          name: f.startup_name || (sp.companyName as string) || `${f.full_name}'s Startup`,
          tagline,
          qScore: qrow?.overall_score ?? 0,
          qScorePercentile: qrow?.percentile ?? 0,
          stage: stageLabel[f.stage ?? ''] ?? f.stage ?? 'Unknown',
          sector: f.industry ?? 'Other',
          location: f.location ?? '',
          fundingGoal,
          teamSize: sp.teamSize ? Number(sp.teamSize) || null : null,
          highlights,
          lastActive: f.updated_at,
          founder: { name: f.full_name },
          status: 'new' as const,
          hasScore: !!qrow,
        }
      })
    )

    // Fetch investor's AI personalization for match scores
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('ai_personalization')
      .eq('user_id', user.id)
      .single()

    const aiMatches = (investorProfile?.ai_personalization as { matches?: Record<string, { score: number; reason: string }> } | null)?.matches ?? {}

    // Apply personalized match scores where available
    const withMatch = enriched.map(f => ({
      ...f,
      matchScore: aiMatches[f.id]?.score ?? Math.round(50 + (f.qScore / 100) * 40),
      matchReason: aiMatches[f.id]?.reason ?? null,
    }))

    // Sort by personalized match score, then by Q-Score as tiebreaker
    withMatch.sort((a, b) => b.matchScore - a.matchScore || b.qScore - a.qScore)

    return NextResponse.json({ founders: withMatch })
  } catch (err) {
    console.error('Deal flow GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
