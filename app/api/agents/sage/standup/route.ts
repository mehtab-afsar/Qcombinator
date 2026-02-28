import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/sage/standup
// Body: { artifactId? }
// Sends a weekly OKR check-in email to the founder — summarises current OKRs
// and asks for a progress update in a structured reply format

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { artifactId } = await request.json().catch(() => ({}))

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email not configured' }, { status: 503 })
    }

    // Get founder info
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const founderName = (profile?.full_name as string | undefined) ?? 'Founder'
    const companyName = (profile?.startup_name as string | undefined) ?? 'Your company'
    const founderEmail = user.email!

    // Get latest strategic plan artifact
    let okrs: { objective: string; keyResults: { kr: string; target: string }[] }[] = []
    try {
      const q = supabase
        .from('agent_artifacts')
        .select('content')
        .eq('user_id', user.id)
        .eq('artifact_type', 'strategic_plan')
        .order('created_at', { ascending: false })
        .limit(1)

      const { data: artifact } = artifactId
        ? await q.eq('id', artifactId)
        : await q

      const item = Array.isArray(artifact) ? artifact[0] : artifact
      if (item?.content) {
        const c = item.content as Record<string, unknown>
        const raw = c.okrs
        if (Array.isArray(raw)) {
          okrs = (raw as Record<string, unknown>[]).map(o => ({
            objective: String(o.objective ?? o.title ?? ''),
            keyResults: Array.isArray(o.keyResults)
              ? (o.keyResults as Record<string, unknown>[]).map(kr => ({
                  kr: String(kr.kr ?? kr.result ?? kr),
                  target: String(kr.target ?? kr.metric ?? ''),
                }))
              : [],
          })).filter(o => o.objective)
        }
      }
    } catch { /* use empty OKRs */ }

    const today = new Date()
    const weekStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const weekNum = Math.ceil(today.getDate() / 7)

    const okrRows = okrs.length
      ? okrs.map((okr, i) => `
<tr style="background:${i % 2 === 0 ? '#F9F7F2' : '#fff'}">
  <td style="padding:12px 16px;font-weight:700;color:#18160F;border-bottom:1px solid #E2DDD5;vertical-align:top">O${i + 1}: ${okr.objective}</td>
  <td style="padding:12px 16px;border-bottom:1px solid #E2DDD5;vertical-align:top">
    ${okr.keyResults.map((kr, ki) => `<div style="margin-bottom:6px"><span style="font-size:11px;color:#8A867C">KR${ki + 1}:</span> ${kr.kr}${kr.target ? ` <span style="color:#2563EB;font-weight:600">→ ${kr.target}</span>` : ''}</div>`).join('')}
  </td>
  <td style="padding:12px 16px;border-bottom:1px solid #E2DDD5;color:#8A867C;font-style:italic;vertical-align:top;min-width:120px">
    [Reply with %]
  </td>
</tr>`).join('')
      : '<tr><td colspan="3" style="padding:16px;color:#8A867C;text-align:center">No OKRs set yet — generate a strategic plan with Sage</td></tr>'

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F7F2;margin:0;padding:40px 20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #E2DDD5">
  <!-- Header -->
  <div style="background:#18160F;padding:28px 32px">
    <p style="color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;margin:0 0 6px">Sage · Weekly Standup</p>
    <h1 style="color:#F9F7F2;font-size:20px;font-weight:800;margin:0">Week ${weekNum} Check-In — ${weekStr}</h1>
  </div>

  <!-- Body -->
  <div style="padding:28px 32px">
    <p style="color:#18160F;font-size:15px;line-height:1.7;margin:0 0 20px">Hi ${founderName},</p>
    <p style="color:#18160F;font-size:15px;line-height:1.7;margin:0 0 24px">
      Time for your weekly OKR check-in. <strong>Reply to this email</strong> with your progress percentage for each key result — Sage will log the updates.
    </p>

    <!-- OKR table -->
    <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px">
      <thead>
        <tr style="background:#F9F7F2">
          <th style="padding:10px 16px;text-align:left;font-size:11px;color:#8A867C;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #E2DDD5">Objective</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;color:#8A867C;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #E2DDD5">Key Results</th>
          <th style="padding:10px 16px;text-align:left;font-size:11px;color:#8A867C;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;border-bottom:2px solid #E2DDD5">Progress</th>
        </tr>
      </thead>
      <tbody>
        ${okrRows}
      </tbody>
    </table>

    <!-- Reply format -->
    <div style="background:#EFF6FF;border-radius:10px;padding:16px 20px;border:1px solid #BFDBFE;margin-bottom:24px">
      <p style="font-size:12px;font-weight:700;color:#2563EB;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.08em">Reply Format</p>
      <code style="font-size:13px;color:#18160F;line-height:1.8;white-space:pre-wrap;display:block">${okrs.length > 0
        ? okrs.map((okr, i) => `O${i + 1}: ${okr.keyResults.map((_, ki) => `KR${ki + 1}: ___%`).join(', ')}`).join('\n')
        : 'O1: KR1: 60%, KR2: 40%\nBlockers: [anything blocking you]'
      }\n\nBlockers: [anything blocking progress]
Top win: [what went well]</code>
    </div>

    <p style="font-size:12px;color:#8A867C;line-height:1.6;margin:0">
      This check-in was sent by <strong>Sage</strong> via Edge Alpha. Updates are logged to your strategic plan dashboard.
    </p>
  </div>
</div>
</body>
</html>`

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sage via Edge Alpha <no-reply@edgealpha.ai>',
        to: [founderEmail],
        subject: `Weekly OKR check-in — ${companyName} · Week ${weekNum}`,
        html: emailHtml,
      }),
    })

    if (!emailRes.ok) {
      return NextResponse.json({ error: 'Failed to send standup email' }, { status: 500 })
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'sage',
        action_type: 'weekly_standup',
        description: `Weekly OKR standup sent for Week ${weekNum}`,
        metadata: { okrCount: okrs.length, artifactId, weekNum },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ sent: true, email: founderEmail, okrCount: okrs.length, weekNum })
  } catch (err) {
    console.error('Sage standup error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
