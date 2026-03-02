import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/proposal
// Body: { dealId?: string, prospectName?: string, prospectCompany?: string, dealValue?: string }
// Pulls deal data + financial_summary + gtm_playbook for context
// Returns: { html } — a complete proposal document ready to download/send

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

    const body = await req.json().catch(() => ({})) as { dealId?: string; prospectName?: string; prospectCompany?: string; dealValue?: string }
    const admin = getAdmin()

    const [dealQuery, { data: gtmArt }, { data: fp }] = await Promise.all([
      body.dealId
        ? admin.from('deals').select('company, contact_name, contact_title, stage, value, notes').eq('user_id', user.id).eq('id', body.dealId).single()
        : Promise.resolve({ data: null }),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const deal = dealQuery.data
    const startupName = fp?.startup_name ?? 'Your startup'
    const founderName = fp?.full_name ?? 'Founder'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const description = profileData?.description as string ?? ''
    const website = profileData?.website as string ?? ''

    const prospectName = body.prospectName ?? deal?.contact_name ?? 'Decision Maker'
    const prospectCompany = body.prospectCompany ?? deal?.company ?? 'Prospect Company'
    const dealValue = body.dealValue ?? deal?.value ?? 'custom pricing'
    const dealNotes = deal?.notes ?? ''
    const icp = (gtmArt?.content as { icp?: { summary?: string } } | null)?.icp?.summary ?? ''

    const prompt = `You are Susi, a B2B sales expert. Write a professional sales proposal from ${startupName} to ${prospectCompany}.

CONTEXT:
- Sender: ${startupName} — ${description}${website ? ` (${website})` : ''}
- Sender name: ${founderName}
- Prospect: ${prospectName} at ${prospectCompany}
- Deal value: ${dealValue}
- Deal notes: ${dealNotes || 'none'}
- Ideal customer: ${icp || 'B2B companies'}

Write a complete, polished proposal. Include:
1. Executive summary (problem + solution + business impact)
2. About us (1 paragraph on ${startupName})
3. Your situation (what we understand about ${prospectCompany}'s challenge)
4. Our solution (exactly what we provide)
5. Deliverables (what they get, in bullet points)
6. Timeline (implementation phases with weeks)
7. Investment (pricing with clear value framing)
8. Why ${startupName} (3 key differentiators)
9. Next steps (clear CTAs)
10. Terms & conditions summary

Return JSON only (no markdown):
{
  "executiveSummary": "3-sentence summary for a busy exec",
  "aboutUs": "1 paragraph company description",
  "theirSituation": "2-3 sentences on ${prospectCompany}'s challenge as we understand it",
  "ourSolution": "2-3 sentences on exactly what we provide",
  "deliverables": ["deliverable 1", "deliverable 2", "deliverable 3", "deliverable 4", "deliverable 5"],
  "timeline": [
    { "phase": "Phase 1", "duration": "Week 1-2", "activities": ["activity 1", "activity 2"] }
  ],
  "investment": { "amount": "${dealValue}", "whatIncluded": "what they get for this price", "paymentTerms": "net-30, 50% upfront, etc." },
  "whyUs": ["differentiator 1", "differentiator 2", "differentiator 3"],
  "nextSteps": ["step 1", "step 2", "step 3"],
  "termsHighlights": ["key term 1 (e.g. 30-day notice to cancel)", "key term 2", "key term 3"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let p: Record<string, unknown> = {}
    try { p = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate proposal' }, { status: 500 })
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Proposal — ${startupName} × ${prospectCompany}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, serif; background: #fff; color: #18160F; line-height: 1.7; }
  .page { max-width: 720px; margin: 0 auto; padding: 56px 48px; }
  .cover { background: #18160F; color: #fff; border-radius: 12px; padding: 40px 40px; margin-bottom: 48px; }
  .cover-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8A867C; margin-bottom: 16px; font-family: -apple-system, sans-serif; }
  .cover-title { font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 8px; }
  .cover-sub { font-size: 15px; color: #8A867C; margin-bottom: 24px; }
  .cover-meta { display: flex; gap: 24px; flex-wrap: wrap; }
  .cover-meta-item { font-size: 12px; color: #8A867C; font-family: -apple-system, sans-serif; }
  .cover-meta-item strong { color: #fff; display: block; font-size: 13px; }
  h2 { font-size: 18px; font-weight: 700; color: #18160F; margin: 36px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #E2DDD5; font-family: -apple-system, sans-serif; }
  p { font-size: 13.5px; color: #18160F; line-height: 1.75; margin-bottom: 12px; }
  ul { margin: 8px 0 12px 0; padding-left: 0; list-style: none; }
  ul li { font-size: 13px; color: #18160F; padding: 5px 0 5px 18px; position: relative; line-height: 1.6; }
  ul li:before { content: "→"; position: absolute; left: 0; color: #2563EB; font-weight: 700; }
  .timeline-phase { background: #F9F7F2; border-radius: 8px; padding: 14px 16px; margin-bottom: 10px; border: 1px solid #E2DDD5; }
  .phase-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .phase-name { font-size: 13px; font-weight: 700; color: #18160F; font-family: -apple-system, sans-serif; }
  .phase-dur { font-size: 11px; color: #8A867C; font-family: -apple-system, sans-serif; font-weight: 600; }
  .invest-box { background: #18160F; color: #fff; border-radius: 10px; padding: 24px 28px; margin: 12px 0; }
  .invest-amount { font-size: 28px; font-weight: 800; color: #fff; margin-bottom: 6px; font-family: -apple-system, sans-serif; }
  .invest-detail { font-size: 13px; color: #8A867C; line-height: 1.6; }
  .next-steps { counter-reset: step; }
  .next-steps li { counter-increment: step; padding-left: 32px; }
  .next-steps li:before { content: counter(step); position: absolute; left: 0; background: #2563EB; color: #fff; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 800; font-family: -apple-system, sans-serif; }
  .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #E2DDD5; display: flex; justify-content: space-between; font-size: 11px; color: #8A867C; font-family: -apple-system, sans-serif; }
  .sig { margin-top: 40px; }
  .sig-line { width: 200px; border-bottom: 1px solid #18160F; margin-bottom: 6px; height: 40px; }
  .sig-name { font-size: 12px; color: #18160F; font-family: -apple-system, sans-serif; font-weight: 600; }
  @media print { body { } .page { padding: 32px; } }
</style>
</head>
<body>
<div class="page">
  <div class="cover">
    <div class="cover-label">Business Proposal</div>
    <div class="cover-title">Prepared for ${prospectCompany}</div>
    <div class="cover-sub">From ${startupName}</div>
    <div class="cover-meta">
      <div class="cover-meta-item"><strong>${today}</strong>Date</div>
      <div class="cover-meta-item"><strong>${prospectName}</strong>Prepared For</div>
      <div class="cover-meta-item"><strong>${dealValue}</strong>Investment</div>
    </div>
  </div>

  <h2>Executive Summary</h2>
  <p>${String(p.executiveSummary ?? '')}</p>

  <h2>About ${startupName}</h2>
  <p>${String(p.aboutUs ?? '')}</p>

  <h2>Understanding Your Situation</h2>
  <p>${String(p.theirSituation ?? '')}</p>

  <h2>Our Solution</h2>
  <p>${String(p.ourSolution ?? '')}</p>

  ${(p.deliverables as string[] | undefined)?.length ? `<h2>What You Get</h2>
  <ul>${(p.deliverables as string[]).map(d => `<li>${d}</li>`).join('')}</ul>` : ''}

  ${(p.timeline as { phase: string; duration: string; activities: string[] }[] | undefined)?.length ? `<h2>Implementation Timeline</h2>
  ${(p.timeline as { phase: string; duration: string; activities: string[] }[]).map(ph => `
  <div class="timeline-phase">
    <div class="phase-header"><span class="phase-name">${ph.phase}</span><span class="phase-dur">${ph.duration}</span></div>
    <ul>${ph.activities.map(a => `<li>${a}</li>`).join('')}</ul>
  </div>`).join('')}` : ''}

  <h2>Investment</h2>
  <div class="invest-box">
    <div class="invest-amount">${String((p.investment as Record<string, string> | undefined)?.amount ?? dealValue)}</div>
    <div class="invest-detail">${String((p.investment as Record<string, string> | undefined)?.whatIncluded ?? '')}<br>Payment terms: ${String((p.investment as Record<string, string> | undefined)?.paymentTerms ?? 'Upon agreement')}</div>
  </div>

  ${(p.whyUs as string[] | undefined)?.length ? `<h2>Why ${startupName}</h2>
  <ul>${(p.whyUs as string[]).map(w => `<li>${w}</li>`).join('')}</ul>` : ''}

  ${(p.nextSteps as string[] | undefined)?.length ? `<h2>Next Steps</h2>
  <ul class="next-steps">${(p.nextSteps as string[]).map(s => `<li>${s}</li>`).join('')}</ul>` : ''}

  ${(p.termsHighlights as string[] | undefined)?.length ? `<h2>Key Terms</h2>
  <ul>${(p.termsHighlights as string[]).map(t => `<li>${t}</li>`).join('')}</ul>` : ''}

  <div class="sig">
    <div class="sig-line"></div>
    <div class="sig-name">${founderName} · ${startupName}</div>
  </div>

  <div class="footer">
    <span>${startupName} · Confidential · ${today}</span>
    <span>Valid for 30 days from issue date</span>
  </div>
</div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'proposal_generated',
      action_data: { prospectCompany, dealValue },
    }).maybeSingle()

    return NextResponse.json({ html })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
