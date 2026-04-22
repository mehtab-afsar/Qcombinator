import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'

// GET /api/investor/portfolio
// Returns accepted connection requests enriched with founder Q-Score + artifact data
// (demo: each accepted connection = one "portfolio company" for the investor)

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = createAdminClient()

    // Get investor profile to find their demo_investor_id (if any)
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()

    const demoInvestorId = investorProfile?.demo_investor_id

    // Find accepted connections for this investor — check BOTH FK columns.
    // A founder may have connected via demo_investor_id; investor may also have
    // sent outreach that set investor_id directly. Use OR to catch both.
    const connOrFilter = demoInvestorId
      ? `demo_investor_id.eq.${demoInvestorId},investor_id.eq.${user.id}`
      : `investor_id.eq.${user.id}`

    const { data: rawConnections } = await supabase
      .from('connection_requests')
      .select('id, founder_id, founder_qscore, personal_message, created_at, status')
      .in('status', ['accepted', 'viewed', 'meeting_scheduled'])
      .or(connOrFilter)
      .order('created_at', { ascending: false })
      .limit(40)

    // Deduplicate by founder_id — keep the most-recent row per founder
    const seenFounders = new Set<string>()
    const connections = (rawConnections ?? []).filter(c => {
      if (seenFounders.has(c.founder_id)) return false
      seenFounders.add(c.founder_id)
      return true
    })

    if (!connections || connections.length === 0) {
      return NextResponse.json({ companies: [] })
    }

    const founderIds = connections.map(c => c.founder_id).filter(Boolean)

    // supabase is already the admin client — reads founder data bypassing RLS
    const admin = supabase

    // Fetch founder profiles
    const { data: founders } = await admin
      .from('founder_profiles')
      .select('user_id, startup_name, industry, stage, description, full_name')
      .in('user_id', founderIds)

    // Fetch latest Q-Score per founder
    const { data: scores } = await admin
      .from('qscore_history')
      .select('user_id, overall_score, team_score, market_score, traction_score, gtm_score, product_score, calculated_at')
      .in('user_id', founderIds)
      .order('calculated_at', { ascending: false })

    // Fetch financial artifact per founder (for revenue/runway data)
    const { data: financials } = await admin
      .from('agent_artifacts')
      .select('user_id, content, created_at')
      .in('user_id', founderIds)
      .eq('artifact_type', 'financial_summary')
      .order('created_at', { ascending: false })

    // Fetch last message per connection for inbox preview
    const connectionIds = connections.map(c => c.id)
    const { data: lastMsgs } = await admin
      .from('messages')
      .select('connection_request_id, body, sender_id, created_at')
      .in('connection_request_id', connectionIds)
      .order('created_at', { ascending: false })

    // Build map: connection_id → latest message
    const lastMsgMap: Record<string, { body: string; sender_id: string; created_at: string }> = {}
    for (const m of (lastMsgs ?? [])) {
      if (!lastMsgMap[m.connection_request_id]) {
        lastMsgMap[m.connection_request_id] = { body: m.body, sender_id: m.sender_id, created_at: m.created_at }
      }
    }

    type ScoreRow = { user_id: string; overall_score: number; team_score: number; market_score: number; traction_score: number; gtm_score: number; product_score: number; calculated_at: string }
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

      const lm = lastMsgMap[conn.id]

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
        personalMessage:  conn.personal_message || null,
        metrics: {
          revenue:  mrr     ? `${mrr} MRR`       : '—',
          growth:   growth  ? `+${growth}% MoM`  : '—',
          burnRate: burnRate? `${burnRate}/mo`    : '—',
          runway:   runway  ? `${runway} months`  : '—',
        },
        lastMessage: lm ? {
          body:       lm.body.slice(0, 100) + (lm.body.length > 100 ? '…' : ''),
          created_at: lm.created_at,
          senderId:   lm.sender_id,
        } : null,
      }
    })

    return NextResponse.json({ companies })
  } catch (err) {
    log.error('GET /api/investor/portfolio', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
