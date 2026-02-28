import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'
import { Resend } from 'resend'

// POST /api/digest/daily
// Generates and emails a morning briefing: today's priorities, pipeline health,
// active deals needing follow-up, competitive alerts, and Q-Score nudge.

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) return NextResponse.json({ error: 'Email not configured' }, { status: 503 })

    const admin = getAdmin()
    const today = new Date()
    const todayStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Parallel data fetch
    const [fpRes, recentActivityRes, dealsRes, qscoreRes] = await Promise.all([
      admin.from('founder_profiles').select('full_name, startup_name, email').eq('user_id', user.id).single(),
      admin.from('agent_activity').select('agent_id, action_type, description, created_at').eq('user_id', user.id).gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(30),
      admin.from('deals').select('company, stage, value, next_action, updated_at').eq('user_id', user.id).not('stage', 'in', '("won","lost")').order('updated_at', { ascending: true }),
      admin.from('qscore_history').select('overall_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fp = fpRes.data
    const recentActivity = (recentActivityRes.data ?? [])
    const activeDeals = (dealsRes.data ?? [])
    const qscore = qscoreRes.data

    const founderName = fp?.full_name?.split(' ')[0] ?? 'Founder'
    const company = fp?.startup_name ?? 'your startup'
    const founderEmail = fp?.email ?? user.email ?? ''

    // Stale deals (no update in 3+ days)
    const staleDeals = activeDeals.filter(d => {
      if (!d.updated_at) return true
      return (Date.now() - new Date(d.updated_at).getTime()) / 86400000 > 3
    }).slice(0, 5)

    // Yesterday's actions
    const yesterdayActivity = recentActivity.filter(a => a.created_at >= oneDayAgo)

    // Build context for LLM
    const context = [
      `Founder: ${founderName} at ${company}`,
      `Today: ${todayStr}`,
      qscore ? `Q-Score: ${qscore.overall_score}` : '',
      activeDeals.length > 0 ? `Pipeline: ${activeDeals.length} active deals` : '',
      staleDeals.length > 0 ? `Stale deals needing follow-up: ${staleDeals.map(d => d.company).join(', ')}` : '',
      yesterdayActivity.length > 0
        ? `Yesterday's activity: ${yesterdayActivity.slice(0, 5).map(a => a.description).join('; ')}`
        : 'No activity logged yesterday',
      recentActivity.length > 0
        ? `Recent agent usage: ${[...new Set(recentActivity.map(a => a.agent_id))].join(', ')}`
        : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are a startup operating system generating a morning briefing for a founder. Be specific, brief, and actionable.
Return ONLY valid JSON:
{
  "greeting": "personalized good morning, 1 sentence, mention day/date",
  "topPriority": "the single most important thing to do today based on context — specific, not generic",
  "priorities": [
    { "emoji": "emoji", "title": "short title", "action": "what exactly to do — 1 sentence" }
  ],
  "pipelineNudge": "1 sentence on pipeline health or what to focus on — null if no deals",
  "momentum": "1 sentence celebrating yesterday's wins or noting the streak — honest, not forced",
  "scoreNudge": "1 sentence on Q-Score — what dimension is likely weakest and what to do today — null if no score"
}
Rules:
- priorities: 3 max, actually useful, drawn from the context data
- Be direct, not motivational-poster-y
- If founder has no pipeline, skip pipelineNudge`,
        },
        { role: 'user', content: `Generate morning briefing for:\n${context}` },
      ],
      { maxTokens: 500, temperature: 0.5 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let brief: Record<string, unknown>
    try { brief = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { brief = m ? JSON.parse(m[0]) : {} } catch { brief = {} } }

    const priorities = (brief.priorities as { emoji: string; title: string; action: string }[]) ?? []

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:48px 32px;background:#F9F7F2">
        <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8A867C;margin:0 0 12px">${esc(company)} · Morning Briefing</p>
        <h1 style="font-size:22px;font-weight:800;color:#18160F;margin:0 0 6px;line-height:1.2">${esc(todayStr)}</h1>
        <p style="font-size:14px;color:#8A867C;margin:0 0 28px">${esc(String(brief.greeting ?? `Good morning, ${founderName}!`))}</p>

        ${brief.topPriority ? `
        <div style="background:#2563EB;border-radius:12px;padding:16px 20px;margin-bottom:24px">
          <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#93C5FD;margin:0 0 4px">Today's #1 Priority</p>
          <p style="font-size:15px;font-weight:700;color:#fff;margin:0;line-height:1.4">${esc(String(brief.topPriority))}</p>
        </div>` : ''}

        ${priorities.length > 0 ? `
        <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#8A867C;margin:0 0 10px">Today's Focus</p>
        ${priorities.map(p => `
          <div style="background:#fff;border-radius:10px;padding:14px 18px;margin-bottom:8px;border:1px solid #E2DDD5">
            <p style="font-size:14px;font-weight:700;color:#18160F;margin:0 0 4px">${esc(p.emoji ?? '')} ${esc(p.title ?? '')}</p>
            <p style="font-size:13px;color:#8A867C;margin:0;line-height:1.5">${esc(p.action ?? '')}</p>
          </div>`).join('')}` : ''}

        ${staleDeals.length > 0 ? `
        <div style="background:#FFFBEB;border-radius:10px;padding:14px 18px;margin-top:16px;border:1px solid #FDE68A">
          <p style="font-size:13px;font-weight:700;color:#D97706;margin:0 0 6px">⚡ Follow up today</p>
          ${staleDeals.map(d => `<p style="font-size:12px;color:#18160F;margin:0 0 3px">• ${esc(d.company)} — ${esc(d.stage)}${d.next_action ? `: ${esc(d.next_action)}` : ''}</p>`).join('')}
        </div>` : ''}

        ${brief.pipelineNudge ? `<p style="font-size:13px;color:#18160F;margin:20px 0 0;line-height:1.6">${esc(String(brief.pipelineNudge))}</p>` : ''}
        ${brief.momentum ? `<p style="font-size:13px;color:#8A867C;margin:12px 0 0;line-height:1.6">${esc(String(brief.momentum))}</p>` : ''}
        ${qscore ? `<p style="font-size:13px;color:#8A867C;margin:8px 0 0">Q-Score: <strong style="color:#18160F">${qscore.overall_score}</strong>${brief.scoreNudge ? ` · ${esc(String(brief.scoreNudge))}` : ''}</p>` : ''}

        <div style="border-top:1px solid #E2DDD5;margin-top:36px;padding-top:20px">
          <p style="font-size:11px;color:#8A867C;margin:0">Edge Alpha · ${esc(company)}</p>
        </div>
      </div>`

    // Send via Resend
    if (!founderEmail) return NextResponse.json({ error: 'No email address on file' }, { status: 400 })

    const resend = new Resend(resendKey)
    const { error: sendError } = await resend.emails.send({
      from: `${company} OS <no-reply@edgealpha.ai>`,
      to: founderEmail,
      subject: `☀️ ${todayStr} — Your Morning Briefing`,
      html,
    })

    await admin.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'sage',
      action_type: 'morning_briefing_sent',
      description: `Morning briefing sent for ${todayStr}`,
      metadata: { email: founderEmail, priorityCount: priorities.length, staleDeals: staleDeals.length },
    })

    return NextResponse.json({
      sent: !sendError,
      brief,
      staleDeals: staleDeals.length,
      todayStr,
    })
  } catch (err) {
    console.error('Daily briefing error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
