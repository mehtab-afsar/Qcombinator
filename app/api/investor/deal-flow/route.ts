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

        return {
          id: f.user_id,
          name: f.startup_name || `${f.full_name}'s Startup`,
          tagline: f.tagline || f.industry || '',
          qScore: qrow?.overall_score ?? 0,
          qScorePercentile: qrow?.percentile ?? 0,
          stage: stageLabel[f.stage ?? ''] ?? f.stage ?? 'Unknown',
          sector: f.industry ?? 'Other',
          location: f.location ?? '',
          fundingGoal: f.funding ?? '',
          lastActive: f.updated_at,
          founder: { name: f.full_name },
          status: 'new' as const,
          hasScore: !!qrow,
        }
      })
    )

    // Sort by Q-Score descending, founders without a score at the bottom
    enriched.sort((a, b) => b.qScore - a.qScore)

    return NextResponse.json({ founders: enriched })
  } catch (err) {
    console.error('Deal flow GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
