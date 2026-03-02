import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/job-descriptions
// Body: { role: string, level?: string, department?: string }
// Pulls hiring_plan for context, generates a full JD for the specified role
// Returns: { html, jd: { title, summary, responsibilities[], requirements[], niceToHave[], whatWeOffer[], aboutUs } }

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

    const body = await req.json().catch(() => ({})) as { role?: string; level?: string; department?: string }
    if (!body.role?.trim()) return NextResponse.json({ error: 'role is required' }, { status: 400 })

    const admin = getAdmin()

    const [{ data: hiringArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const description = profileData?.description as string ?? ''
    const stage = profileData?.stage as string ?? 'Seed'
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const location = profileData?.location as string ?? 'Remote'

    const hiring = hiringArt?.content as Record<string, unknown> | null
    const roleContext = (hiring?.nextHires as { role?: string; responsibilities?: string[]; requirements?: string[]; salaryRange?: string; equity?: string; whyNow?: string }[] | undefined)
      ?.find(r => r.role?.toLowerCase().includes(body.role!.toLowerCase()))

    const prompt = `You are Harper, an HR expert. Write a complete, compelling job description for ${startupName}.

COMPANY: ${startupName} — ${description}
STAGE: ${stage} ${industry} startup
LOCATION: ${location}

ROLE TO HIRE FOR: ${body.role}${body.level ? ` (${body.level})` : ''}${body.department ? ` — ${body.department}` : ''}
${roleContext ? `CONTEXT FROM HIRING PLAN:
- Responsibilities: ${roleContext.responsibilities?.join(', ') ?? 'not specified'}
- Requirements: ${roleContext.requirements?.join(', ') ?? 'not specified'}
- Salary range: ${roleContext.salaryRange ?? 'competitive'}
- Equity: ${roleContext.equity ?? 'equity available'}
- Why hiring now: ${roleContext.whyNow ?? 'scaling team'}` : ''}

Write a JD that attracts A-players who thrive in early-stage environments. Be specific, honest about the challenges, and compelling about the opportunity.

Return JSON only (no markdown):
{
  "title": "exact job title",
  "summary": "3-sentence role summary — the opportunity, the mission, what great looks like",
  "responsibilities": ["responsibility 1 (outcome-focused)", "responsibility 2", "responsibility 3", "responsibility 4", "responsibility 5", "responsibility 6"],
  "requirements": ["must-have requirement 1", "must-have requirement 2", "must-have requirement 3", "must-have requirement 4", "must-have requirement 5"],
  "niceToHave": ["nice-to-have 1", "nice-to-have 2", "nice-to-have 3"],
  "whatWeOffer": ["compensation item (salary + equity + benefits)", "growth opportunity 1", "culture item", "remote/flexibility note"],
  "aboutUs": "2 sentences about ${startupName} — mission, traction, culture",
  "hnPost": "Hacker News Who's Hiring post (1 paragraph, technical, no fluff)",
  "linkedInPost": "LinkedIn job post intro (2-3 sentences for the post, engaging)"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let jd: Record<string, unknown> = {}
    try { jd = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate job description' }, { status: 500 })
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${jd.title ?? body.role} — ${startupName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; }
  .page { max-width: 680px; margin: 0 auto; padding: 40px 32px; }
  .header { background: #18160F; color: #fff; border-radius: 12px; padding: 28px 32px; margin-bottom: 24px; }
  .company { font-size: 12px; color: #8A867C; margin-bottom: 4px; }
  .title { font-size: 24px; font-weight: 800; color: #fff; margin-bottom: 12px; }
  .badges { display: flex; gap: 8px; flex-wrap: wrap; }
  .badge { font-size: 10px; font-weight: 700; padding: 3px 10px; border-radius: 999px; border: 1px solid #444; color: #ccc; }
  .section { background: #fff; border-radius: 10px; padding: 20px 24px; margin-bottom: 16px; border: 1px solid #E2DDD5; }
  .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #8A867C; margin-bottom: 12px; }
  p { font-size: 13px; color: #18160F; line-height: 1.7; }
  ul { list-style: none; padding: 0; }
  ul li { font-size: 13px; color: #18160F; padding: 4px 0 4px 16px; position: relative; line-height: 1.6; }
  ul li:before { content: "→"; position: absolute; left: 0; color: #2563EB; font-weight: 700; }
  .hn-box { background: #FFF7ED; border-radius: 10px; padding: 16px 18px; border: 1px solid #FED7AA; font-size: 12px; color: #18160F; line-height: 1.7; font-family: monospace; }
  .footer { text-align: center; font-size: 10px; color: #8A867C; margin-top: 24px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company">${startupName}</div>
    <div class="title">${String(jd.title ?? body.role)}</div>
    <div class="badges">
      <span class="badge">${stage}</span>
      <span class="badge">${industry}</span>
      <span class="badge">${location}</span>
      ${body.level ? `<span class="badge">${body.level}</span>` : ''}
    </div>
  </div>

  <div class="section">
    <div class="section-title">The Opportunity</div>
    <p>${String(jd.summary ?? '')}</p>
    <br>
    <p><strong>About ${startupName}:</strong> ${String(jd.aboutUs ?? '')}</p>
  </div>

  <div class="section">
    <div class="section-title">What You'll Do</div>
    <ul>${((jd.responsibilities as string[] | undefined) ?? []).map(r => `<li>${r}</li>`).join('')}</ul>
  </div>

  <div class="section">
    <div class="section-title">What We're Looking For</div>
    <ul>${((jd.requirements as string[] | undefined) ?? []).map(r => `<li>${r}</li>`).join('')}</ul>
    ${(jd.niceToHave as string[] | undefined)?.length ? `<br><p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#8A867C;margin-bottom:8px;">Nice to Have</p>
    <ul>${(jd.niceToHave as string[]).map(n => `<li>${n}</li>`).join('')}</ul>` : ''}
  </div>

  <div class="section">
    <div class="section-title">What We Offer</div>
    <ul>${((jd.whatWeOffer as string[] | undefined) ?? []).map(w => `<li>${w}</li>`).join('')}</ul>
  </div>

  ${jd.hnPost ? `<div class="section">
    <div class="section-title">HN Who's Hiring Post</div>
    <div class="hn-box">${String(jd.hnPost)}</div>
  </div>` : ''}

  <div class="footer">Generated by Harper (Edge Alpha)</div>
</div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'job_description_generated',
      action_data: { role: body.role, title: jd.title },
    }).maybeSingle()

    return NextResponse.json({ html, jd })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
