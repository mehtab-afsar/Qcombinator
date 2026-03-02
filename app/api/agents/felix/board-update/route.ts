import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/board-update
// Body: { recipients?: string[], subject?: string }
// Pulls financial_summary + last 30 days of agent_activity for context
// Generates board-level narrative via LLM + sends via Resend if recipients provided
// Returns: { html, sent: boolean, sentCount: number }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { recipients?: string[]; subject?: string }
    const admin = getAdmin()

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: finArt }, { data: fp }, { data: activity }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_activity').select('agent_id, action_type, action_data, created_at')
        .eq('user_id', user.id).gte('created_at', thirtyDaysAgo).order('created_at', { ascending: false }).limit(50),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const founderName = fp?.full_name ?? 'Founder'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const stage = profileData?.stage as string ?? 'Seed'
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const fin = finArt?.content as Record<string, unknown> | null
    const mrr = fin?.mrr as string ?? fin?.currentMRR as string ?? 'not reported'
    const arr = fin?.arr as string ?? 'not reported'
    const burn = fin?.monthlyBurn as string ?? fin?.burn as string ?? 'not reported'
    const runway = fin?.runwayMonths as string ?? fin?.runway as string ?? 'not reported'
    const customers = fin?.customers as string ?? fin?.customerCount as string ?? 'not reported'
    const growth = fin?.mrrGrowth as string ?? fin?.growthRate as string ?? 'not reported'

    const activitySummary = (activity ?? []).slice(0, 20).map(a =>
      `- ${a.agent_id}: ${a.action_type}`
    ).join('\n') || 'No agent activity recorded'

    const now = new Date()
    const monthYear = now.toLocaleString('en-US', { month: 'long', year: 'numeric' })

    const prompt = `You are Felix, a CFO advisor. Write a concise, professional board update for ${startupName} for ${monthYear}.

COMPANY: ${startupName} — ${stage} ${industry}
FOUNDER: ${founderName}

FINANCIAL METRICS:
- MRR: ${mrr}
- ARR: ${arr}
- Monthly Burn: ${burn}
- Runway: ${runway}
- Customers: ${customers}
- MRR Growth: ${growth}

AGENT ACTIVITY THIS MONTH (what the team worked on):
${activitySummary}

Write a board-level update that is honest, data-driven, and concise. Boards hate fluff.

Return JSON only (no markdown):
{
  "executiveSummary": "2-3 sentences — the headline state of the business this month",
  "metricsNarrative": "2 sentences interpreting the numbers — growth trend, what's working",
  "topWins": ["win 1 (specific)", "win 2", "win 3"],
  "topChallenges": ["challenge 1 (honest)", "challenge 2"],
  "keyDecisions": ["decision needed from the board 1", "decision 2"],
  "nextMonthFocus": ["priority 1", "priority 2", "priority 3"],
  "ask": "the one thing we need help with from the board right now",
  "riskFlag": "biggest risk on the horizon (be honest)"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let narrative: Record<string, unknown> = {}
    try { narrative = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate board update' }, { status: 500 })
    }

    const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

    const listItems = (items: unknown) =>
      Array.isArray(items) ? (items as string[]).map(i => `<li>${esc(i)}</li>`).join('') : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(startupName)} — Board Update ${esc(monthYear)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; background: #fff; color: #18160F; line-height: 1.7; }
  .page { max-width: 680px; margin: 0 auto; padding: 48px 40px; }
  .header { background: #18160F; border-radius: 10px; padding: 28px 32px; margin-bottom: 32px; }
  .header-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8A867C; margin-bottom: 8px; font-family: -apple-system, sans-serif; }
  .header-title { font-size: 22px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .header-sub { font-size: 13px; color: #8A867C; font-family: -apple-system, sans-serif; }
  .metrics-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px; }
  .metric-card { background: #F9F7F2; border: 1px solid #E2DDD5; border-radius: 8px; padding: 14px 16px; }
  .metric-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A867C; margin-bottom: 4px; font-family: -apple-system, sans-serif; }
  .metric-value { font-size: 18px; font-weight: 800; color: #18160F; font-family: -apple-system, sans-serif; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A867C; margin: 24px 0 10px; font-family: -apple-system, sans-serif; padding-bottom: 6px; border-bottom: 1px solid #E2DDD5; }
  p { font-size: 14px; color: #18160F; line-height: 1.75; margin-bottom: 12px; }
  ul { list-style: none; padding: 0; margin-bottom: 12px; }
  ul li { font-size: 13px; color: #18160F; padding: 5px 0 5px 18px; position: relative; line-height: 1.6; }
  ul li:before { content: "→"; position: absolute; left: 0; color: #2563EB; font-weight: 700; }
  .risk-box { background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 14px 16px; margin-top: 8px; }
  .risk-box p { color: #991B1B; font-size: 13px; margin: 0; }
  .ask-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 16px; margin-top: 8px; }
  .ask-box p { color: #1E40AF; font-size: 13px; margin: 0; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2DDD5; font-size: 11px; color: #8A867C; font-family: -apple-system, sans-serif; }
  @media print { .page { padding: 24px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="header-label">Board Update</div>
    <div class="header-title">${esc(startupName)}</div>
    <div class="header-sub">${esc(monthYear)} · Prepared by ${esc(founderName)}</div>
  </div>

  <div class="metrics-row">
    <div class="metric-card"><div class="metric-label">MRR</div><div class="metric-value">${esc(String(mrr))}</div></div>
    <div class="metric-card"><div class="metric-label">Burn / mo</div><div class="metric-value">${esc(String(burn))}</div></div>
    <div class="metric-card"><div class="metric-label">Runway</div><div class="metric-value">${esc(String(runway))}</div></div>
    <div class="metric-card"><div class="metric-label">ARR</div><div class="metric-value">${esc(String(arr))}</div></div>
    <div class="metric-card"><div class="metric-label">Customers</div><div class="metric-value">${esc(String(customers))}</div></div>
    <div class="metric-card"><div class="metric-label">MoM Growth</div><div class="metric-value">${esc(String(growth))}</div></div>
  </div>

  <h2>Executive Summary</h2>
  <p>${esc(String(narrative.executiveSummary ?? ''))}</p>
  <p>${esc(String(narrative.metricsNarrative ?? ''))}</p>

  ${(narrative.topWins as string[] | undefined)?.length ? `<h2>Wins This Month</h2><ul>${listItems(narrative.topWins)}</ul>` : ''}
  ${(narrative.topChallenges as string[] | undefined)?.length ? `<h2>Challenges</h2><ul>${listItems(narrative.topChallenges)}</ul>` : ''}
  ${(narrative.keyDecisions as string[] | undefined)?.length ? `<h2>Decisions Needed from Board</h2><ul>${listItems(narrative.keyDecisions)}</ul>` : ''}
  ${(narrative.nextMonthFocus as string[] | undefined)?.length ? `<h2>Next Month Focus</h2><ul>${listItems(narrative.nextMonthFocus)}</ul>` : ''}

  ${narrative.ask ? `<h2>The Ask</h2><div class="ask-box"><p>${esc(String(narrative.ask))}</p></div>` : ''}
  ${narrative.riskFlag ? `<h2>Risk Flag</h2><div class="risk-box"><p>${esc(String(narrative.riskFlag))}</p></div>` : ''}

  <div class="footer">${esc(startupName)} · Board Update · ${esc(monthYear)} · Generated by Felix (Edge Alpha)</div>
</div>
</body>
</html>`

    let sent = false
    let sentCount = 0
    const recipients = body.recipients ?? []

    if (recipients.length > 0) {
      const resendKey = process.env.RESEND_API_KEY
      if (resendKey) {
        const subject = body.subject ?? `${startupName} — Board Update ${monthYear}`
        for (const recipient of recipients) {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ from: 'Edge Alpha <noreply@edgealpha.ai>', to: recipient, subject, html }),
            })
            if (res.ok) { sentCount++; sent = true }
          } catch { /* skip failed sends */ }
        }
      }
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'board_update_generated',
      action_data: { monthYear, sent, sentCount, recipientCount: recipients.length },
    }).maybeSingle()

    return NextResponse.json({ html, sent, sentCount })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
