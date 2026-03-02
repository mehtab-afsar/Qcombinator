import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/launch-plan
// No body — pulls GTM playbook artifact + brand messaging for context
// Returns: { html: string, summary: { preLaunchDays, launchDayItems, postLaunchWeeks } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const [{ data: gtmArtifact }, { data: brandArtifact }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const gtm = gtmArtifact?.content as Record<string, unknown> | null
    const brand = brandArtifact?.content as Record<string, unknown> | null

    const channels = (gtm?.channels as { channel: string }[] | undefined)?.slice(0, 3).map(c => c.channel).join(', ') ?? 'online channels'
    const tagline = (brand?.taglines as { tagline: string }[] | undefined)?.[0]?.tagline ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'

    const prompt = `You are Patel, a GTM expert. Create a launch plan for ${startupName}.

CONTEXT:
- Target customer: ${icp}
- Channels: ${channels}
- Tagline: ${tagline}

Build a structured 3-phase launch plan:

PHASE 1: Pre-Launch (14 days before) — 8-10 tasks
- Teaser campaign, waitlist, beta outreach, media prep, influencer seeding, analytics setup, etc.

PHASE 2: Launch Day — 10-12 tasks by time block (Morning/Midday/Afternoon/Evening)
- Product Hunt submission, social posts, email blast, press outreach, Hacker News Show HN, live Q&A, etc.

PHASE 3: Post-Launch Week 1-2 — 8-10 tasks
- Follow-up with leads, onboard early users, publish results post, retargeting, iteration

Return JSON only (no markdown):
{
  "preLaunch": [
    { "day": -14, "task": "task name", "description": "what to do", "channel": "Product Hunt | Email | Twitter | LinkedIn | Direct", "priority": "high | medium | low" }
  ],
  "launchDay": [
    { "timeBlock": "Morning (7-9am)", "task": "task name", "description": "what to do", "channel": "channel", "priority": "high" }
  ],
  "postLaunch": [
    { "week": 1, "task": "task name", "description": "what to do", "channel": "channel", "priority": "high | medium | low" }
  ],
  "successMetrics": ["metric 1", "metric 2", "metric 3"],
  "topRisk": "biggest launch risk and how to mitigate it"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let plan: {
      preLaunch?: { day: number; task: string; description: string; channel: string; priority: string }[];
      launchDay?: { timeBlock: string; task: string; description: string; channel: string; priority: string }[];
      postLaunch?: { week: number; task: string; description: string; channel: string; priority: string }[];
      successMetrics?: string[];
      topRisk?: string;
    } = {}
    try { plan = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate launch plan' }, { status: 500 })
    }

    const priorityColor = (p: string) => p === 'high' ? '#DC2626' : p === 'medium' ? '#D97706' : '#8A867C'
    const channelEmoji: Record<string, string> = {
      'Product Hunt': '🚀', 'Email': '📧', 'Twitter': '🐦', 'LinkedIn': '💼',
      'Direct': '📞', 'Hacker News': '🔶', 'Press': '📰', 'Reddit': '🤖',
    }
    function getEmoji(ch: string) {
      for (const [k, v] of Object.entries(channelEmoji)) { if (ch.includes(k)) return v; }
      return '•'
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${startupName} — Launch Plan</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 13px; color: #18160F; background: #F9F7F2; padding: 40px; }
  .header { background: #18160F; color: #fff; border-radius: 12px; padding: 28px 32px; margin-bottom: 28px; }
  .header h1 { font-size: 22px; font-weight: 800; margin-bottom: 4px; }
  .header p { font-size: 13px; color: #8A867C; }
  .phase { background: #fff; border-radius: 12px; border: 1px solid #E2DDD5; margin-bottom: 20px; overflow: hidden; }
  .phase-header { padding: 16px 20px; border-bottom: 1px solid #E2DDD5; display: flex; align-items: center; gap: 10px; }
  .phase-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; padding: 3px 10px; border-radius: 999px; }
  .task-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px 20px; border-bottom: 1px solid #F0EDE6; }
  .task-row:last-child { border-bottom: none; }
  .task-dot { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; margin-top: 1px; }
  .task-info { flex: 1; }
  .task-name { font-size: 13px; font-weight: 600; color: #18160F; margin-bottom: 2px; }
  .task-desc { font-size: 11px; color: #8A867C; line-height: 1.5; }
  .task-meta { display: flex; gap: 6px; margin-top: 5px; flex-wrap: wrap; }
  .tag { font-size: 10px; padding: 2px 8px; border-radius: 999px; border: 1px solid #E2DDD5; color: #8A867C; }
  .priority-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
  .timeblock { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A867C; padding: 10px 20px 4px; background: #F9F7F2; }
  .metrics { background: #EFF6FF; border-radius: 10px; padding: 16px 20px; margin-bottom: 20px; }
  .risk-box { background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 10px; padding: 14px 18px; }
  .checkbox { width: 16px; height: 16px; border: 2px solid #E2DDD5; border-radius: 4px; flex-shrink: 0; margin-top: 3px; }
  @media print { body { background: #fff; padding: 24px; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${startupName} — Launch Plan</h1>
    <p>Generated ${today} · ${(plan.preLaunch?.length ?? 0) + (plan.launchDay?.length ?? 0) + (plan.postLaunch?.length ?? 0)} tasks across 3 phases</p>
  </div>

  ${plan.successMetrics && plan.successMetrics.length > 0 ? `
  <div class="metrics">
    <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#2563EB;margin-bottom:8px;">Success Metrics</p>
    <div style="display:flex;flex-wrap:wrap;gap:8px;">
      ${plan.successMetrics.map(m => `<span style="font-size:12px;padding:4px 12px;border-radius:999px;background:#DBEAFE;color:#1D4ED8;font-weight:600;">${m}</span>`).join('')}
    </div>
  </div>` : ''}

  <!-- Pre-Launch -->
  <div class="phase">
    <div class="phase-header">
      <span class="phase-label" style="background:#FEF2F2;color:#DC2626;">Phase 1</span>
      <span style="font-size:14px;font-weight:700;color:#18160F;">Pre-Launch — 14 Days Before</span>
      <span style="font-size:11px;color:#8A867C;margin-left:auto;">${plan.preLaunch?.length ?? 0} tasks</span>
    </div>
    ${(plan.preLaunch ?? []).map(t => `
    <div class="task-row">
      <div class="checkbox"></div>
      <div style="width:36px;text-align:center;flex-shrink:0;font-size:11px;font-weight:700;color:#DC2626;margin-top:2px;">D${t.day}</div>
      <div class="task-info">
        <div class="task-name">${t.task}</div>
        <div class="task-desc">${t.description}</div>
        <div class="task-meta">
          <span class="tag">${getEmoji(t.channel)} ${t.channel}</span>
          <span class="tag" style="color:${priorityColor(t.priority)};border-color:${priorityColor(t.priority)};">${t.priority}</span>
        </div>
      </div>
    </div>`).join('')}
  </div>

  <!-- Launch Day -->
  <div class="phase">
    <div class="phase-header">
      <span class="phase-label" style="background:#F0FDF4;color:#16A34A;">Phase 2</span>
      <span style="font-size:14px;font-weight:700;color:#18160F;">🚀 Launch Day</span>
      <span style="font-size:11px;color:#8A867C;margin-left:auto;">${plan.launchDay?.length ?? 0} tasks</span>
    </div>
    ${(() => {
      const byBlock: Record<string, typeof plan.launchDay> = {}
      for (const t of plan.launchDay ?? []) {
        if (!byBlock[t.timeBlock]) byBlock[t.timeBlock] = []
        byBlock[t.timeBlock]!.push(t)
      }
      return Object.entries(byBlock).map(([block, tasks]) => `
      <div class="timeblock">${block}</div>
      ${(tasks ?? []).map(t => `
      <div class="task-row">
        <div class="checkbox"></div>
        <div class="task-info">
          <div class="task-name">${t.task}</div>
          <div class="task-desc">${t.description}</div>
          <div class="task-meta">
            <span class="tag">${getEmoji(t.channel)} ${t.channel}</span>
          </div>
        </div>
      </div>`).join('')}`).join('')
    })()}
  </div>

  <!-- Post-Launch -->
  <div class="phase">
    <div class="phase-header">
      <span class="phase-label" style="background:#EFF6FF;color:#2563EB;">Phase 3</span>
      <span style="font-size:14px;font-weight:700;color:#18160F;">Post-Launch — Weeks 1–2</span>
      <span style="font-size:11px;color:#8A867C;margin-left:auto;">${plan.postLaunch?.length ?? 0} tasks</span>
    </div>
    ${(plan.postLaunch ?? []).map(t => `
    <div class="task-row">
      <div class="checkbox"></div>
      <div style="width:40px;text-align:center;flex-shrink:0;font-size:11px;font-weight:700;color:#2563EB;margin-top:2px;">W${t.week}</div>
      <div class="task-info">
        <div class="task-name">${t.task}</div>
        <div class="task-desc">${t.description}</div>
        <div class="task-meta">
          <span class="tag">${getEmoji(t.channel)} ${t.channel}</span>
          <span class="tag" style="color:${priorityColor(t.priority)};border-color:${priorityColor(t.priority)};">${t.priority}</span>
        </div>
      </div>
    </div>`).join('')}
  </div>

  ${plan.topRisk ? `
  <div class="risk-box">
    <p style="font-size:11px;font-weight:700;color:#D97706;text-transform:uppercase;margin-bottom:4px;">⚠ Top Launch Risk</p>
    <p style="font-size:12px;color:#18160F;line-height:1.6;">${plan.topRisk}</p>
  </div>` : ''}

  <p style="font-size:10px;color:#8A867C;text-align:center;margin-top:24px;">Generated by Patel (Edge Alpha) · Print this page for your launch war room</p>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'launch_plan_generated',
      action_data: { preLaunchTasks: plan.preLaunch?.length ?? 0, launchDayTasks: plan.launchDay?.length ?? 0, postLaunchTasks: plan.postLaunch?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ html, summary: { preLaunchTasks: plan.preLaunch?.length ?? 0, launchDayTasks: plan.launchDay?.length ?? 0, postLaunchTasks: plan.postLaunch?.length ?? 0, successMetrics: plan.successMetrics ?? [], topRisk: plan.topRisk } })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
