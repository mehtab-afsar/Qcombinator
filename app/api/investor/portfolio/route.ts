import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/investor/portfolio
// Returns accepted connection requests enriched with founder Q-Score + artifact data
// (demo: each accepted connection = one "portfolio company" for the investor)

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get investor profile to find their demo_investor_id
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id, id')
      .eq('user_id', user.id)
      .single()

    if (!investorProfile || !investorProfile.demo_investor_id) {
      return NextResponse.json({ companies: [] })
    }

    // Find accepted connections for this investor
    const { data: connections } = await supabase
      .from('connection_requests')
      .select('id, founder_id, founder_qscore, personal_message, created_at, status')
      .eq('demo_investor_id', investorProfile.demo_investor_id)
      .in('status', ['accepted', 'viewed', 'meeting_scheduled'])
      .order('created_at', { ascending: false })
      .limit(20)

    if (!connections || connections.length === 0) {
      return NextResponse.json({ companies: [] })
    }

    const founderIds = connections.map(c => c.founder_id).filter(Boolean)

    // Fetch founder profiles
    const { data: founders } = await supabase
      .from('founder_profiles')
      .select('user_id, startup_name, industry, stage, description, full_name')
      .in('user_id', founderIds)

    // Fetch latest Q-Score per founder
    const { data: scores } = await supabase
      .from('qscore_history')
      .select('user_id, overall_score, team_score, market_score, traction_score, gtm_score, product_score, created_at')
      .in('user_id', founderIds)
      .order('created_at', { ascending: false })

    // Fetch financial artifact per founder (for revenue/runway data)
    const { data: financials } = await supabase
      .from('agent_artifacts')
      .select('user_id, content, created_at')
      .in('user_id', founderIds)
      .eq('artifact_type', 'financial_summary')
      .order('created_at', { ascending: false })

    type ScoreRow = { user_id: string; overall_score: number; team_score: number; market_score: number; traction_score: number; gtm_score: number; product_score: number; created_at: string }
    type FounderRow = { user_id: string; startup_name: string; industry: string; stage: string; description: string; full_name: string }

    // Build a map: user_id → latest score
    const scoreMap: Record<string, ScoreRow> = {}
    for (const s of ((scores ?? []) as ScoreRow[])) {
      if (!scoreMap[s.user_id]) scoreMap[s.user_id] = s
    }

    // Build a map: user_id → latest financial data
    const finMap: Record<string, Record<string, unknown>> = {}
    for (const f of (financials ?? [])) {
      if (!finMap[f.user_id]) finMap[f.user_id] = f.content as Record<string, unknown>
    }

    const founderMap: Record<string, FounderRow> = {}
    for (const f of ((founders ?? []) as FounderRow[])) founderMap[f.user_id] = f

    // Shape into portfolio companies
    const companies = connections.map(conn => {
      const fp  = founderMap[conn.founder_id] ?? {}
      const qs  = scoreMap[conn.founder_id]
      const fin = finMap[conn.founder_id] ?? {}

      const overallScore = conn.founder_qscore ?? qs?.overall_score ?? 0
      const healthScore  = overallScore >= 75 ? 'excellent' : overallScore >= 55 ? 'good' : overallScore >= 40 ? 'concern' : 'critical'

      // Try to pull revenue/runway from financial artifact
      const mrr     = (fin.mrr     as string) ?? (fin.currentMRR as string) ?? ''
      const runway  = (fin.runway  as string) ?? (fin.runwayMonths as string) ?? ''
      const growth  = (fin.growth  as string) ?? (fin.mrrGrowth   as string) ?? ''
      const burnRate= (fin.burnRate as string) ?? (fin.monthlyBurn as string) ?? ''

      return {
        id:               conn.founder_id,
        connectionId:     conn.id,
        name:             (fp.startup_name as string) || 'Startup',
        sector:           (fp.industry     as string) || 'Unknown',
        stage:            (fp.stage        as string) || 'Seed',
        founderName:      (fp.full_name    as string) || 'Founder',
        description:      (fp.description  as string) || conn.personal_message || '',
        qScore:           overallScore,
        qScoreBreakdown: {
          team:    qs?.team_score    ?? 0,
          market:  qs?.market_score  ?? 0,
          traction:qs?.traction_score?? 0,
          gtm:     qs?.gtm_score     ?? 0,
          product: qs?.product_score ?? 0,
        },
        health:           healthScore,
        connectedAt:      conn.created_at,
        metrics: {
          revenue:  mrr     ? `${mrr} MRR`       : '—',
          growth:   growth  ? `+${growth}% MoM`  : '—',
          burnRate: burnRate? `${burnRate}/mo`    : '—',
          runway:   runway  ? `${runway} months`  : '—',
        },
      }
    })

    return NextResponse.json({ companies })
  } catch (err) {
    console.error('Investor portfolio GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
