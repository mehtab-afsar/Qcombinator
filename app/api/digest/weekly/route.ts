import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/digest/weekly
// Sends a beautiful weekly digest email to the founder summarising:
// - All agent activity from the past 7 days
// - Q-Score change (if any)
// - Key metrics
// - What to focus on this week

const AGENT_EMOJIS: Record<string, string> = {
  patel: '📣', susi: '🤝', maya: '🎨', felix: '📊',
  leo: '⚖️', harper: '👥', nova: '🔬', atlas: '🔭', sage: '🧭',
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Fetch data in parallel
    const [
      { data: profile },
      { data: activityRows },
      { data: currentScore },
      { data: prevScore },
    ] = await Promise.all([
      supabase.from('founder_profiles').select('startup_name, full_name').eq('user_id', user.id).single(),
      adminClient.from('agent_activity').select('agent_id, action_type, description, created_at').eq('user_id', user.id).gt('created_at', since).order('created_at', { ascending: false }).limit(50),
      supabase.from('qscore_history').select('overall_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).single(),
      supabase.from('qscore_history').select('overall_score').eq('user_id', user.id).lt('calculated_at', since).order('calculated_at', { ascending: false }).limit(1).single(),
    ])

    const founderName  = (profile?.full_name as string)  ?? 'Founder'
    const companyName  = (profile?.startup_name as string) ?? 'Your Company'
    const founderEmail = user.email!
    const activity     = activityRows ?? []

    // Score delta
    const currScore = (currentScore as { overall_score?: number } | null)?.overall_score
    const prevScoreVal = (prevScore as { overall_score?: number } | null)?.overall_score
    const scoreDelta = currScore !== undefined && prevScoreVal !== undefined ? currScore - prevScoreVal : null

    // Group activity by agent
    const byAgent: Record<string, { action_type: string; description: string; created_at: string }[]> = {}
    for (const a of activity as { agent_id: string; action_type: string; description: string; created_at: string }[]) {
      if (!byAgent[a.agent_id]) byAgent[a.agent_id] = []
      byAgent[a.agent_id].push(a)
    }

    const weekStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const hasActivity = activity.length > 0

    function agentSection(agentId: string, rows: { action_type: string; description: string }[]) {
      const emoji = AGENT_EMOJIS[agentId] ?? '🤖'
      const name  = agentId.charAt(0).toUpperCase() + agentId.slice(1)
      const items = rows.slice(0, 4).map(r =>
        `<div style="display:flex;gap:8px;margin-bottom:6px"><span style="color:#8A867C;flex-shrink:0">→</span><p style="font-size:13px;color:#18160F;line-height:1.5;margin:0">${r.description}</p></div>`
      ).join('')
      return `
        <div style="margin-bottom:16px;padding:14px 16px;background:#F9F7F2;border-radius:10px;border:1px solid #E2DDD5">
          <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;margin:0 0 8px">${emoji} ${name}</p>
          ${items}
          ${rows.length > 4 ? `<p style="font-size:11px;color:#8A867C;margin-top:4px">+ ${rows.length - 4} more actions</p>` : ''}
        </div>`
    }

    const agentSections = Object.entries(byAgent)
      .sort(([, a], [, b]) => b.length - a.length)
      .map(([id, rows]) => agentSection(id, rows))
      .join('')

    const scoreSection = currScore !== undefined ? `
      <div style="background:#F9F7F2;border-radius:10px;padding:14px 16px;border:1px solid #E2DDD5;margin-bottom:16px;display:flex;align-items:center;gap:20px">
        <div style="text-align:center;flex-shrink:0">
          <p style="font-size:28px;font-weight:900;color:#18160F;margin:0">${currScore}</p>
          <p style="font-size:10px;color:#8A867C;text-transform:uppercase;letter-spacing:0.1em;margin:0">Q-Score</p>
        </div>
        ${scoreDelta !== null ? `<p style="font-size:13px;color:${scoreDelta >= 0 ? '#16A34A' : '#DC2626'};font-weight:600">
          ${scoreDelta >= 0 ? '▲' : '▼'} ${Math.abs(scoreDelta)} points ${scoreDelta >= 0 ? 'gained' : 'lost'} this week
        </p>` : '<p style="font-size:13px;color:#8A867C">Score unchanged this week</p>'}
      </div>` : ''

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F7F2;margin:0;padding:40px 20px">
<div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2DDD5">
  <div style="background:#18160F;padding:28px 32px">
    <p style="color:rgba(249,247,242,0.5);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin:0 0 6px">Edge Alpha · Weekly Digest</p>
    <h1 style="color:#F9F7F2;font-size:20px;font-weight:800;margin:0">${companyName} — Week of ${weekStr}</h1>
  </div>
  <div style="padding:28px 32px">
    <p style="color:#18160F;font-size:15px;line-height:1.7;margin:0 0 20px">Hi ${founderName}, here's what your AI team got done this week.</p>
    ${scoreSection}
    ${hasActivity ? `
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#8A867C;margin:0 0 12px">Agent Activity (${activity.length} actions)</p>
    ${agentSections}` : `
    <div style="background:#F9F7F2;border-radius:10px;padding:20px;border:1px solid #E2DDD5;text-align:center;margin-bottom:16px">
      <p style="font-size:14px;color:#8A867C">No agent activity this week. Start a session with any of your 9 AI advisors!</p>
    </div>`}
    <div style="margin-top:20px;padding-top:20px;border-top:1px solid #E2DDD5">
      <p style="font-size:12px;color:#8A867C;line-height:1.6;margin:0">
        This digest was sent by <strong>Edge Alpha</strong>. Log in to your dashboard to continue working with your AI team.
      </p>
    </div>
  </div>
</div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Edge Alpha <no-reply@edgealpha.ai>',
        to: [founderEmail],
        subject: `Weekly digest — ${companyName} · ${activity.length} agent action${activity.length !== 1 ? 's' : ''} this week`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      return NextResponse.json({ error: 'Failed to send digest email' }, { status: 500 })
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'system',
        action_type: 'weekly_digest_sent',
        description: `Weekly digest sent — ${activity.length} actions across ${Object.keys(byAgent).length} agents`,
        metadata:    { agentCount: Object.keys(byAgent).length, actionCount: activity.length, score: currScore },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ sent: true, email: founderEmail, actionCount: activity.length })
  } catch (err) {
    console.error('Weekly digest error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
