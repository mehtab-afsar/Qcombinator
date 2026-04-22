import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { sendConnectionAcceptedEmails } from '@/lib/email/send'

// GET /api/investor/connections
// Returns pending connection requests for the authenticated investor,
// joined with founder_profiles and latest qscore_history.
export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = createAdminClient()

    // Look up this investor's demo_investor_id — connections are stored by demo_investor_id,
    // NOT investor_id (which is an auth.users FK used only for real-auth investor accounts).
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()

    const demoInvestorId = investorProfile?.demo_investor_id

    // Query via BOTH FK columns — a connection may have been created by the founder
    // (demo_investor_id) or by the investor's outreach (investor_id). OR catches both.
    const connOrFilter = demoInvestorId
      ? `demo_investor_id.eq.${demoInvestorId},investor_id.eq.${user.id}`
      : `investor_id.eq.${user.id}`

    const { data: rawRequests, error } = await supabase
      .from('connection_requests')
      .select('id, founder_id, status, personal_message, founder_qscore, created_at, updated_at')
      .or(connOrFilter)
      .order('created_at', { ascending: false })

    if (error) {
      log.error('GET /api/investor/connections', { error })
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // Deduplicate by founder_id — keep the most-recent row per founder
    const seenFounders = new Set<string>()
    const requests = (rawRequests ?? []).filter(r => {
      if (seenFounders.has(r.founder_id)) return false
      seenFounders.add(r.founder_id)
      return true
    })

    const founderIds = (requests ?? []).map(r => r.founder_id).filter(Boolean)

    // Batch fetch founder profiles + Q-Scores in 2 queries instead of N×2
    const [{ data: profiles }, { data: allScores }] = await Promise.all([
      supabase
        .from('founder_profiles')
        .select('user_id, full_name, startup_name, industry, stage, tagline, avatar_url, company_logo_url')
        .in('user_id', founderIds),
      supabase
        .from('qscore_history')
        .select('user_id, overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, percentile, calculated_at')
        .in('user_id', founderIds)
        .order('calculated_at', { ascending: false }),
    ])

    type ProfileRow = { user_id: string; full_name: string; startup_name: string; industry: string; stage: string; tagline?: string; avatar_url?: string | null; company_logo_url?: string | null }
    type QRow = { user_id: string; overall_score: number; market_score: number; product_score: number; gtm_score: number; financial_score: number; team_score: number; traction_score: number; percentile: number }

    const profileMap = new Map<string, ProfileRow>()
    for (const p of (profiles ?? []) as ProfileRow[]) profileMap.set(p.user_id, p)

    const scoreMap = new Map<string, QRow>()
    for (const s of (allScores ?? []) as QRow[]) {
      if (!scoreMap.has(s.user_id)) scoreMap.set(s.user_id, s)
    }

    const enriched = (requests ?? []).map((req) => {
      const profile = profileMap.get(req.founder_id)
      const qrow    = scoreMap.get(req.founder_id)

      return {
        id: req.id,
        founderId: req.founder_id,
        founderName: profile?.full_name ?? 'Unknown Founder',
        startupName: profile?.startup_name ?? 'Unknown Startup',
        oneLiner: profile?.industry ?? '',
        stage: profile?.stage ?? 'Unknown',
        industry: profile?.industry ?? '',
        fundingTarget: '',
        qScore: qrow?.overall_score ?? req.founder_qscore ?? 0,
        qScorePercentile: qrow?.percentile ?? 0,
        qScoreBreakdown: {
          market: qrow?.market_score ?? 0,
          product: qrow?.product_score ?? 0,
          goToMarket: qrow?.gtm_score ?? 0,
          financial: qrow?.financial_score ?? 0,
          team: qrow?.team_score ?? 0,
          traction: qrow?.traction_score ?? 0,
        },
        status: req.status as 'pending' | 'viewed' | 'accepted' | 'declined' | 'meeting_scheduled',
        personalMessage: req.personal_message ?? undefined,
        requestedDate: req.created_at,
        respondedDate: req.updated_at ?? null,
        tagline: profile?.tagline ?? '',
        avatarUrl: (profile as ProfileRow | undefined)?.avatar_url ?? null,
        companyLogoUrl: (profile as ProfileRow | undefined)?.company_logo_url ?? null,
      }
    })

    return NextResponse.json({ requests: enriched })
  } catch (err) {
    log.error('GET /api/investor/connections', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/investor/connections
// Body: { requestId, action: 'accept' | 'decline', feedback?: { reasons, text } }
export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = createAdminClient()

    const { requestId, action, feedback } = await request.json()
    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 })
    }

    const newStatus = action === 'accept' ? 'meeting_scheduled' : 'declined'

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    // Look up demo_investor_id to use the correct ownership check
    const { data: investorProfile } = await supabase
      .from('investor_profiles')
      .select('demo_investor_id')
      .eq('user_id', user.id)
      .single()


    const demoInvestorId = investorProfile?.demo_investor_id

    let updateQuery = supabase
      .from('connection_requests')
      .update(updatePayload)
      .eq('id', requestId)

    // Ensure investor owns this request (via demo_investor_id or investor_id)
    if (demoInvestorId) {
      updateQuery = updateQuery.eq('demo_investor_id', demoInvestorId)
    } else {
      updateQuery = updateQuery.eq('investor_id', user.id)
    }

    const { error } = await updateQuery

    if (error) {
      log.error('PATCH /api/investor/connections update', { error })
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
    }

    // If decline with feedback, log it as an analytics event
    if (action === 'decline' && feedback) {
      await supabase.from('analytics_events').insert({
        user_id: user.id,
        event_type: 'investor_decline_feedback',
        event_data: { request_id: requestId, reasons: feedback.reasons, text: feedback.text },
      })
    }

    // On accept: notify the founder in-app
    if (action === 'accept') {
      try {
        const { data: connReqForNotif } = await supabase
          .from('connection_requests')
          .select('founder_id')
          .eq('id', requestId)
          .single()
        if (connReqForNotif?.founder_id) {
          const { data: ip } = await supabase
            .from('investor_profiles')
            .select('full_name, firm_name')
            .eq('user_id', user.id)
            .single()
          const investorName = (ip as { full_name?: string } | null)?.full_name ?? 'An investor'
          const firmName     = (ip as { firm_name?: string }  | null)?.firm_name  ?? ''
          await supabase.from('notifications').insert({
            user_id:  connReqForNotif.founder_id,
            type:     'connection_accepted',
            title:    `${investorName}${firmName ? ` from ${firmName}` : ''} accepted your connection request`,
            read:     false,
            metadata: { connection_id: requestId, investor_id: user.id },
          })
        }
      } catch (notifErr) {
        log.error('PATCH /api/investor/connections accept notification', { notifErr })
      }
    }

    // On accept: fetch names/emails and send notification emails
    if (action === 'accept' && process.env.RESEND_API_KEY) {
      try {
        // Get the connection request to find the founder_id
        const { data: connReq } = await supabase
          .from('connection_requests')
          .select('founder_id')
          .eq('id', requestId)
          .single()

        if (connReq?.founder_id) {
          const [
            { data: { user: founderUser } },
            { data: { user: investorUser } },
            { data: founderProfile },
            { data: investorProfile },
          ] = await Promise.all([
            supabase.auth.admin.getUserById(connReq.founder_id),
            supabase.auth.admin.getUserById(user.id),
            supabase.from('founder_profiles').select('full_name, startup_name').eq('user_id', connReq.founder_id).single(),
            supabase.from('investor_profiles').select('full_name, firm_name').eq('user_id', user.id).single(),
          ])

          const founderEmail = founderUser?.email
          const investorEmail = investorUser?.email
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const fp = founderProfile as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ip = investorProfile as any

          if (founderEmail && investorEmail) {
            await sendConnectionAcceptedEmails({
              founderEmail,
              founderName: fp?.full_name ?? 'Founder',
              startupName: fp?.startup_name ?? 'Your Startup',
              investorEmail,
              investorName: ip?.full_name ?? 'Investor',
              investorFirm: ip?.firm_name ?? 'Their Firm',
            })
          }
        }
      } catch (emailErr) {
        log.error('PATCH /api/investor/connections email', { emailErr })
      }
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    log.error('PATCH /api/investor/connections', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
