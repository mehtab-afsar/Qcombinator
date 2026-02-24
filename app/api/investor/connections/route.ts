import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { sendConnectionAcceptedEmails } from '@/lib/email/send'

// GET /api/investor/connections
// Returns pending connection requests for the authenticated investor,
// joined with founder_profiles and latest qscore_history.
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch pending requests addressed to this investor (no inline join — founder_id FK points to auth.users)
    const { data: requests, error } = await supabase
      .from('connection_requests')
      .select('id, founder_id, status, personal_message, founder_qscore, created_at')
      .eq('investor_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Fetch connection requests error:', error)
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
    }

    // For each request, fetch founder profile + latest Q-Score separately
    const enriched = await Promise.all(
      (requests ?? []).map(async (req) => {
        const [{ data: profile }, { data: qrow }] = await Promise.all([
          supabase
            .from('founder_profiles')
            .select('full_name, startup_name, industry, stage')
            .eq('user_id', req.founder_id)
            .single(),
          supabase
            .from('qscore_history')
            .select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, percentile')
            .eq('user_id', req.founder_id)
            .order('calculated_at', { ascending: false })
            .limit(1)
            .single(),
        ])

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
          personalMessage: req.personal_message ?? undefined,
          requestedDate: req.created_at,
        }
      })
    )

    return NextResponse.json({ requests: enriched })
  } catch (err) {
    console.error('Connection requests GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/investor/connections
// Body: { requestId, action: 'accept' | 'decline', feedback?: { reasons, text } }
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { requestId, action, feedback } = await request.json()
    if (!requestId || !action) {
      return NextResponse.json({ error: 'requestId and action are required' }, { status: 400 })
    }

    const newStatus = action === 'accept' ? 'meeting_scheduled' : 'declined'

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('connection_requests')
      .update(updatePayload)
      .eq('id', requestId)
      .eq('investor_id', user.id) // ensure investor owns this request

    if (error) {
      console.error('Update connection request error:', error)
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

    // On accept: fetch names/emails and send notification emails
    if (action === 'accept' && process.env.RESEND_API_KEY) {
      try {
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

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
            supabaseAdmin.auth.admin.getUserById(connReq.founder_id),
            supabaseAdmin.auth.admin.getUserById(user.id),
            supabaseAdmin.from('founder_profiles').select('full_name, startup_name').eq('user_id', connReq.founder_id).single(),
            supabaseAdmin.from('investor_profiles').select('full_name, firm_name').eq('user_id', user.id).single(),
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
        // Never let email failures break the response
        console.error('Email notification error:', emailErr)
      }
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (err) {
    console.error('Connection requests PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
