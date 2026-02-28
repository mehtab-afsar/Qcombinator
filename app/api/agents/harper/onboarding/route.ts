import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/onboarding
// Generates a week-1 onboarding checklist for a new hire.
// Body: { roleName, newHireName?, startDate? }
// Returns: { html: string, checklist: { day: string; tasks: string[] }[] }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { roleName, newHireName, startDate } = body as {
      roleName: string
      newHireName?: string
      startDate?: string
    }

    if (!roleName?.trim()) {
      return NextResponse.json({ error: 'roleName is required' }, { status: 400 })
    }

    const admin = getAdmin()

    const [{ data: fp }, { data: hiringArtifact }] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper').eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const hiring = (hiringArtifact?.content ?? {}) as Record<string, unknown>
    const companyName = fp?.startup_name ?? 'the company'
    const founderName = fp?.full_name ?? 'the founder'

    // Find role-specific info from hiring plan
    const nextHires = (hiring.nextHires as { role: string; requirements?: string[]; whyNow?: string }[] | undefined) ?? []
    const roleDetails = nextHires.find(h => h.role?.toLowerCase().includes(roleName.toLowerCase()))

    const context = [
      `Company: ${companyName}`,
      `Role: ${roleName}`,
      newHireName ? `New hire: ${newHireName}` : '',
      startDate ? `Start date: ${startDate}` : '',
      sp.stage ? `Company stage: ${sp.stage}` : '',
      sp.teamSize ? `Team size: ${sp.teamSize}` : 'Very early stage (3-5 people)',
      (sp.remote as boolean) ? 'Remote-first' : 'In-person or hybrid',
      roleDetails?.requirements?.length ? `Key skills: ${roleDetails.requirements.join(', ')}` : '',
      roleDetails?.whyNow ? `Why we hired for this role: ${roleDetails.whyNow}` : '',
      hiring.cultureValues && Array.isArray(hiring.cultureValues) ? `Culture values: ${(hiring.cultureValues as string[]).join(', ')}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Harper, an HR advisor. Create a practical, specific week-1 onboarding plan for a new hire.
Focus on Day 1, Week 1, and the 30-day mark. Be concrete and actionable — not generic.

Return ONLY valid JSON:
{
  "welcomeNote": "2-sentence warm welcome note from the founder to the new hire",
  "schedule": [
    {
      "period": "Day 1 — Orientation",
      "focus": "one-line theme",
      "tasks": ["specific task 1", "specific task 2", "specific task 3"]
    },
    { "period": "Day 2-3 — Deep Dive", "focus": "...", "tasks": [...] },
    { "period": "Day 4-5 — First Contributions", "focus": "...", "tasks": [...] },
    { "period": "Week 2-4 — Ramp Up", "focus": "...", "tasks": [...] },
    { "period": "30-Day Mark", "focus": "...", "tasks": [...] }
  ],
  "toolsToProvide": ["list of accounts/tools to set up before Day 1"],
  "meetPeople": ["who to introduce them to in the first week — and why"],
  "successAt30Days": "what success looks like after 30 days — specific, measurable",
  "founderCheckins": ["3 specific check-in points in first month — what to discuss at each"]
}`,
        },
        {
          role: 'user',
          content: `Create onboarding plan for:\n${context}`,
        },
      ],
      { maxTokens: 1000, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let plan: Record<string, unknown> = {}
    try { plan = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { plan = m ? JSON.parse(m[0]) : {} } catch { plan = {} } }

    const schedule = (plan.schedule as { period: string; focus: string; tasks: string[] }[] | undefined) ?? []
    const toolsToProvide = (plan.toolsToProvide as string[] | undefined) ?? []
    const meetPeople = (plan.meetPeople as string[] | undefined) ?? []
    const founderCheckins = (plan.founderCheckins as string[] | undefined) ?? []

    // Generate HTML onboarding kit
    const hirerName = newHireName ?? 'Your New Hire'
    const dateLabel = startDate ?? 'Starting Soon'

    const scheduleHtml = schedule.map(s => `
  <div style="background:#fff;border:1px solid #E2DDD5;border-radius:10px;padding:18px 20px;margin-bottom:14px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
      <div style="width:8px;height:8px;border-radius:50%;background:#18160F;flex-shrink:0"></div>
      <div>
        <p style="font-size:13px;font-weight:700;color:#18160F">${esc(s.period)}</p>
        <p style="font-size:11px;color:#8A867C">${esc(s.focus)}</p>
      </div>
    </div>
    <ul style="list-style:none;margin-left:18px">
      ${s.tasks.map(t => `<li style="font-size:13px;color:#18160F;padding:4px 0;border-bottom:1px solid #F0EDE6">☐ ${esc(t)}</li>`).join('')}
    </ul>
  </div>`).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Onboarding Kit — ${esc(hirerName)}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; }
.page { max-width: 760px; margin: 0 auto; }
.hero { background: #18160F; color: #fff; padding: 48px; }
.hero-sub { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: rgba(255,255,255,0.5); margin-bottom: 12px; }
.hero h1 { font-size: 28px; font-weight: 800; margin-bottom: 6px; }
.hero-meta { font-size: 13px; color: rgba(255,255,255,0.6); }
.section { padding: 32px 48px; border-bottom: 1px solid #E2DDD5; }
.section h2 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8A867C; margin-bottom: 16px; }
.welcome { background: #EFF6FF; border-left: 3px solid #2563EB; padding: 16px 20px; border-radius: 0 8px 8px 0; font-size: 14px; line-height: 1.7; color: #18160F; font-style: italic; }
.tool-grid { display: flex; flex-wrap: wrap; gap: 8px; }
.tool-chip { background: #F0EDE6; border: 1px solid #E2DDD5; border-radius: 6px; padding: 6px 12px; font-size: 12px; color: #18160F; }
.success-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 16px 20px; }
.success-box p { font-size: 14px; color: #15803D; line-height: 1.7; }
.checkin { background: #fff; border: 1px solid #E2DDD5; border-radius: 8px; padding: 12px 16px; margin-bottom: 8px; font-size: 13px; color: #18160F; }
footer { padding: 20px 48px; background: #F0EDE6; }
footer p { font-size: 11px; color: #8A867C; }
@media print { body { background: #fff; } }
</style>
</head>
<body>
<div class="page">
  <div class="hero">
    <div class="hero-sub">Onboarding Kit</div>
    <h1>Welcome, ${esc(hirerName)}</h1>
    <p class="hero-meta">${esc(roleName)} · ${esc(companyName)} · Starting ${esc(dateLabel)}</p>
  </div>

  ${plan.welcomeNote ? `<div class="section">
    <h2>From ${esc(founderName)}</h2>
    <div class="welcome">${esc(String(plan.welcomeNote))}</div>
  </div>` : ''}

  ${toolsToProvide.length > 0 ? `<div class="section">
    <h2>Tools & Accounts to Set Up Before Day 1</h2>
    <div class="tool-grid">
      ${toolsToProvide.map(t => `<div class="tool-chip">☐ ${esc(t)}</div>`).join('')}
    </div>
  </div>` : ''}

  <div class="section">
    <h2>Onboarding Schedule</h2>
    ${scheduleHtml}
  </div>

  ${meetPeople.length > 0 ? `<div class="section">
    <h2>People to Meet in Week 1</h2>
    ${meetPeople.map(p => `<p style="font-size:13px;color:#18160F;padding:6px 0;border-bottom:1px solid #F0EDE6">→ ${esc(p)}</p>`).join('')}
  </div>` : ''}

  ${plan.successAt30Days ? `<div class="section">
    <h2>What Success Looks Like at 30 Days</h2>
    <div class="success-box"><p>${esc(String(plan.successAt30Days))}</p></div>
  </div>` : ''}

  ${founderCheckins.length > 0 ? `<div class="section" style="border-bottom:none">
    <h2>Founder Check-in Schedule</h2>
    ${founderCheckins.map(c => `<div class="checkin">📌 ${esc(c)}</div>`).join('')}
  </div>` : ''}

  <footer>
    <p>${esc(companyName)} · Onboarding Kit for ${esc(hirerName)} · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  </footer>
</div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'harper',
      action_type: 'onboarding_kit_generated',
      description: `Onboarding kit for ${newHireName ?? roleName} — ${roleName} at ${companyName}`,
      metadata:    { roleName, newHireName, startDate },
    }).then(() => {})

    return NextResponse.json({ html, checklist: schedule })
  } catch (err) {
    console.error('Harper onboarding POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
