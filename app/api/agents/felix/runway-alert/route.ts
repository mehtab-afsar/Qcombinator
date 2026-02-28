import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/felix/runway-alert
// Body: { runwayMonths, burnRate?, mrr?, artifactId? }
// Sends a runway warning email to the founder when runway < 6 months

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { runwayMonths, burnRate, mrr, artifactId } = await request.json()
    if (typeof runwayMonths !== 'number' || runwayMonths < 0) {
      return NextResponse.json({ error: 'runwayMonths (number) is required' }, { status: 400 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }

    // Get founder profile for name + company
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const founderName = (profile?.full_name as string | undefined) ?? 'Founder'
    const companyName = (profile?.startup_name as string | undefined) ?? 'Your company'
    const founderEmail = user.email!

    const urgency = runwayMonths <= 2 ? 'CRITICAL' : runwayMonths <= 4 ? 'HIGH' : 'MEDIUM'
    const urgencyColor = urgency === 'CRITICAL' ? '#DC2626' : urgency === 'HIGH' ? '#D97706' : '#7C3AED'
    const actionItems = runwayMonths <= 3
      ? ['Immediately reach out to existing investors for a bridge', 'Cut non-critical spend today', 'Prioritize revenue-generating activities only', 'Prepare emergency fundraising pitch deck']
      : ['Begin fundraising conversations now — 3-6 months lead time needed', 'Review and reduce burn by 20%', 'Accelerate revenue — identify fastest path to cash', 'Update your investor pipeline and warm intros']

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #E2DDD5;">
    <!-- Header -->
    <div style="background: ${urgencyColor}; padding: 28px 32px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin: 0 0 6px 0;">Felix · Runway Alert</p>
      <h1 style="color: white; font-size: 22px; font-weight: 800; margin: 0;">${urgency} — ${runwayMonths} months of runway</h1>
    </div>
    <!-- Body -->
    <div style="padding: 28px 32px;">
      <p style="color: #18160F; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">Hi ${founderName},</p>
      <p style="color: #18160F; font-size: 15px; line-height: 1.7; margin: 0 0 20px 0;">
        Felix has flagged a runway risk for <strong>${companyName}</strong>. With only <strong>${runwayMonths} month${runwayMonths !== 1 ? 's' : ''}</strong> of runway remaining, you need to act now.
      </p>
      <!-- Metrics -->
      <div style="background: #F9F7F2; border-radius: 10px; padding: 16px 20px; margin-bottom: 24px; border: 1px solid #E2DDD5;">
        <div style="display: flex; gap: 24px; flex-wrap: wrap;">
          <div>
            <p style="font-size: 10px; color: #8A867C; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 2px 0;">Runway</p>
            <p style="font-size: 20px; font-weight: 800; color: ${urgencyColor}; margin: 0;">${runwayMonths}mo</p>
          </div>
          ${burnRate ? `<div>
            <p style="font-size: 10px; color: #8A867C; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 2px 0;">Monthly Burn</p>
            <p style="font-size: 20px; font-weight: 800; color: #18160F; margin: 0;">$${Number(burnRate).toLocaleString()}</p>
          </div>` : ''}
          ${mrr ? `<div>
            <p style="font-size: 10px; color: #8A867C; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 2px 0;">MRR</p>
            <p style="font-size: 20px; font-weight: 800; color: #18160F; margin: 0;">$${Number(mrr).toLocaleString()}</p>
          </div>` : ''}
        </div>
      </div>
      <!-- Action items -->
      <p style="font-size: 12px; font-weight: 700; color: #8A867C; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 10px 0;">Recommended Actions</p>
      ${actionItems.map(a => `<div style="display: flex; gap: 10px; align-items: flex-start; margin-bottom: 8px;">
        <span style="color: ${urgencyColor}; font-size: 14px; flex-shrink: 0; margin-top: 1px;">→</span>
        <p style="font-size: 14px; color: #18160F; line-height: 1.5; margin: 0;">${a}</p>
      </div>`).join('')}
      <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #E2DDD5;">
        <p style="font-size: 12px; color: #8A867C; margin: 0; line-height: 1.6;">
          This alert was triggered automatically by <strong>Felix</strong> via Edge Alpha. Log in to your dashboard to update your financial model or connect live Stripe metrics.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Felix via Edge Alpha <no-reply@edgealpha.ai>',
        to: [founderEmail],
        subject: `[${urgency}] ${runwayMonths}-month runway — action required (${companyName})`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Resend runway alert error:', errText)
      return NextResponse.json({ error: 'Failed to send alert email' }, { status: 500 })
    }

    // Log to agent_activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'felix',
        action_type: 'runway_alert',
        description: `Runway alert sent — ${runwayMonths} months remaining (${urgency})`,
        metadata: { runwayMonths, burnRate, mrr, urgency, artifactId },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ sent: true, urgency, email: founderEmail })
  } catch (err) {
    console.error('Felix runway alert error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
