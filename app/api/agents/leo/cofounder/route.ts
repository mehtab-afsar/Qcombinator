import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/cofounder
// Generates a co-founder agreement as a styled HTML document.
// Body: { coFounderName, coFounderRole, yourRole?, equityA, equityB, vestingYears?, cliffMonths? }
// Returns: { html: string }

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
    const {
      coFounderName,
      coFounderRole,
      yourRole,
      equityA,
      equityB,
      vestingYears = 4,
      cliffMonths = 12,
    } = body as {
      coFounderName: string
      coFounderRole: string
      yourRole?: string
      equityA: number   // your equity %
      equityB: number   // co-founder equity %
      vestingYears?: number
      cliffMonths?: number
    }

    if (!coFounderName?.trim() || !coFounderRole?.trim()) {
      return NextResponse.json({ error: 'coFounderName and coFounderRole are required' }, { status: 400 })
    }
    if (typeof equityA !== 'number' || typeof equityB !== 'number') {
      return NextResponse.json({ error: 'equityA and equityB (numbers) are required' }, { status: 400 })
    }

    const admin = getAdmin()
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('startup_name, full_name, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const companyName = fp?.startup_name ?? 'the Company'
    const founderName = fp?.full_name ?? 'Founder A'
    const state = (sp.incorporationState as string) ?? 'Delaware'
    const founderRole = yourRole ?? 'CEO'
    const effectiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    const cliffDate = `${cliffMonths} months`
    const vestingSchedule = `${vestingYears}-year vesting with ${cliffDate} cliff`

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Leo, a startup legal advisor. Draft key clauses for a co-founder agreement.
Return ONLY valid JSON:
{
  "ipAssignment": "2-3 sentence IP assignment clause — all IP created for the company is owned by the company",
  "roleResponsibilities": "2 sentences on division of responsibilities and decision-making authority",
  "vestingClause": "2-3 sentences explaining the vesting schedule in plain English",
  "salaryDeferral": "1 sentence on deferred salary or equity compensation until funding",
  "disputeResolution": "2 sentences on how disputes are resolved (mediation first, then arbitration)",
  "exitProvisions": "2-3 sentences covering what happens if a co-founder leaves — good leaver / bad leaver concepts",
  "confidentiality": "1 sentence confidentiality commitment",
  "governingLaw": "1 sentence on governing law (use the state provided)"
}`,
        },
        {
          role: 'user',
          content: `Draft clauses for:
Company: ${companyName} (${state})
Founder A: ${founderName}, ${founderRole}, ${equityA}% equity
Founder B: ${coFounderName}, ${coFounderRole}, ${equityB}% equity
Vesting: ${vestingSchedule}`,
        },
      ],
      { maxTokens: 800, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let clauses: Record<string, string> = {}
    try { clauses = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { clauses = m ? JSON.parse(m[0]) : {} } catch { clauses = {} } }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Co-Founder Agreement — ${esc(companyName)}</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Georgia, 'Times New Roman', serif; background: #FAFAF8; color: #18160F; padding: 60px 48px; max-width: 760px; margin: 0 auto; }
h1 { font-size: 26px; font-weight: 700; margin-bottom: 6px; }
.subtitle { font-size: 13px; color: #8A867C; margin-bottom: 40px; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 40px; }
.party-card { border: 1px solid #E2DDD5; border-radius: 10px; padding: 18px 20px; }
.party-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8A867C; margin-bottom: 8px; }
.party-name { font-size: 16px; font-weight: 700; color: #18160F; margin-bottom: 2px; }
.party-meta { font-size: 12px; color: #8A867C; }
.equity-badge { display: inline-block; background: #18160F; color: #fff; font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; margin-top: 6px; }
.section { margin-bottom: 28px; }
.section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8A867C; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid #E2DDD5; }
.section p { font-size: 14px; line-height: 1.8; color: #18160F; }
.vesting-box { background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; }
.vesting-box p { font-size: 13px; color: #1D4ED8; line-height: 1.6; }
.sig-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; }
.sig-block { }
.sig-line { border-bottom: 1px solid #18160F; height: 40px; margin-bottom: 6px; }
.sig-label { font-size: 11px; color: #8A867C; }
.disclaimer { margin-top: 40px; padding: 14px 18px; background: #FFFBEB; border-left: 3px solid #D97706; font-size: 11px; color: #8A867C; line-height: 1.6; border-radius: 0 6px 6px 0; }
@media print { body { padding: 40px; background: #fff; } }
</style>
</head>
<body>
<h1>Co-Founder Agreement</h1>
<p class="subtitle">${esc(companyName)} · Effective ${esc(effectiveDate)}</p>

<div class="parties">
  <div class="party-card">
    <div class="party-label">Founder A</div>
    <div class="party-name">${esc(founderName)}</div>
    <div class="party-meta">${esc(founderRole)}</div>
    <div class="equity-badge">${equityA}% equity</div>
  </div>
  <div class="party-card">
    <div class="party-label">Founder B</div>
    <div class="party-name">${esc(coFounderName)}</div>
    <div class="party-meta">${esc(coFounderRole)}</div>
    <div class="equity-badge">${equityB}% equity</div>
  </div>
</div>

<div class="vesting-box">
  <p><strong>Vesting Schedule:</strong> ${esc(vestingSchedule)}. ${esc(String(clauses.vestingClause ?? ''))}</p>
</div>

${[
  ['Roles & Responsibilities', clauses.roleResponsibilities],
  ['Intellectual Property Assignment', clauses.ipAssignment],
  ['Exit Provisions', clauses.exitProvisions],
  ['Compensation & Salary Deferral', clauses.salaryDeferral],
  ['Dispute Resolution', clauses.disputeResolution],
  ['Confidentiality', clauses.confidentiality],
  ['Governing Law', clauses.governingLaw],
].filter(([, v]) => v).map(([title, content]) => `
<div class="section">
  <h2>${esc(String(title))}</h2>
  <p>${esc(String(content ?? ''))}</p>
</div>`).join('')}

<div class="sig-grid">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">${esc(founderName)}<br>${esc(founderRole)} · ${companyName}</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">${esc(coFounderName)}<br>${esc(coFounderRole)} · ${companyName}</div>
  </div>
</div>

<div style="text-align:center;margin-top:32px">
  <p class="sig-label">Date: ___________________</p>
</div>

<div class="disclaimer">
  <strong>Legal Disclaimer:</strong> This document is generated for informational purposes only and does not constitute legal advice. This is not a substitute for a properly drafted agreement reviewed by a qualified attorney. Please consult a lawyer before signing any legally binding document.
</div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'leo',
      action_type: 'cofounder_agreement_generated',
      description: `Co-founder agreement for ${companyName} — ${founderName} (${equityA}%) + ${coFounderName} (${equityB}%)`,
      metadata:    { coFounderName, equityA, equityB, vestingYears, cliffMonths },
    }).then(() => {})

    return NextResponse.json({ html })
  } catch (err) {
    console.error('Leo cofounder POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
