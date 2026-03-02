import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/contractor
// Body: { contractorName, contractorRole, compensationType: 'hourly'|'project', rate: string,
//         startDate?: string, endDate?: string, scope: string }
// Returns: { html: string } — ready-to-sign IC agreement HTML download

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

    const body = await req.json() as {
      contractorName?: string; contractorRole?: string; compensationType?: 'hourly' | 'project';
      rate?: string; startDate?: string; endDate?: string; scope?: string
    }
    const { contractorName, contractorRole, compensationType = 'hourly', rate, startDate, endDate, scope } = body

    if (!contractorName?.trim() || !contractorRole?.trim() || !scope?.trim()) {
      return NextResponse.json({ error: 'contractorName, contractorRole, and scope are required' }, { status: 400 })
    }

    const admin = getAdmin()

    const { data: fp } = await admin
      .from('founder_profiles')
      .select('startup_name, full_name, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const companyName = fp?.startup_name ?? 'The Company'
    const founderName = fp?.full_name ?? 'Founder'

    const prompt = `Draft an Independent Contractor Agreement between ${companyName} and ${contractorName}.

DETAILS:
- Contractor: ${contractorName}, providing services as: ${contractorRole}
- Compensation: ${compensationType === 'hourly' ? `$${rate}/hour` : `$${rate} (fixed project fee)`}
- Start date: ${startDate ?? 'upon signing'}
- ${endDate ? `End date: ${endDate}` : 'Duration: project-based, terminable by either party with 14 days notice'}
- Scope of work: ${scope}

Draft 7 clauses covering:
1. Services & Deliverables — specific scope, acceptance criteria
2. Compensation & Payment — rate, invoice schedule (net-15), expense reimbursement
3. Independent Contractor Status — no employment relationship, no benefits, own taxes
4. IP Assignment — all work product owned by ${companyName}, moral rights waived
5. Confidentiality — 3 years, excludes public info, standard carve-outs
6. Non-Solicitation — 12 months post-engagement, no poaching of employees/clients
7. Term & Termination — notice period, payment for completed work, return of materials

Return JSON only (no markdown):
{
  "clauses": [
    { "title": "1. Services & Deliverables", "body": "full clause text..." }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1200 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: { clauses?: { title: string; body: string }[] } = {}
    try { parsed = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate contractor agreement' }, { status: 500 })
    }

    const clauses = parsed.clauses ?? []
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Independent Contractor Agreement — ${contractorName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; font-size: 13px; line-height: 1.8; color: #1a1a1a; background: #fff; padding: 60px 80px; max-width: 800px; margin: 0 auto; }
  .header { text-align: center; margin-bottom: 40px; padding-bottom: 28px; border-bottom: 2px solid #1a1a1a; }
  .title { font-size: 20px; font-weight: bold; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 6px; }
  .subtitle { font-size: 13px; color: #555; }
  .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin: 28px 0; }
  .party-card { background: #f8f8f6; border: 1px solid #e0ddd8; border-radius: 6px; padding: 16px 20px; }
  .party-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #777; margin-bottom: 6px; }
  .party-name { font-size: 14px; font-weight: bold; color: #1a1a1a; }
  .party-detail { font-size: 12px; color: #555; margin-top: 2px; }
  .comp-box { background: #f0ede6; border: 1px solid #d4cfc7; border-radius: 6px; padding: 14px 20px; margin: 20px 0; display: flex; gap: 32px; }
  .comp-item { flex: 1; }
  .comp-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin-bottom: 4px; }
  .comp-value { font-size: 15px; font-weight: bold; color: #1a1a1a; }
  .clause { margin: 24px 0; page-break-inside: avoid; }
  .clause-title { font-size: 13px; font-weight: bold; margin-bottom: 8px; }
  .clause-body { font-size: 12.5px; color: #333; }
  .sig-block { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; padding-top: 32px; border-top: 1px solid #ddd; }
  .sig-party { }
  .sig-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.08em; color: #777; margin-bottom: 18px; }
  .sig-line { border-bottom: 1px solid #1a1a1a; margin-bottom: 6px; height: 36px; }
  .sig-detail { font-size: 11px; color: #555; }
  .disclaimer { margin-top: 32px; padding: 12px 16px; background: #fff8ed; border: 1px solid #f0d9a0; border-radius: 6px; font-size: 10px; color: #7a6200; line-height: 1.6; }
  @media print { body { padding: 40px 60px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="title">Independent Contractor Agreement</div>
    <div class="subtitle">Effective date: ${today}</div>
  </div>

  <p style="font-size:13px;color:#333;margin-bottom:20px;">This Independent Contractor Agreement (&ldquo;Agreement&rdquo;) is entered into as of <strong>${today}</strong>, by and between:</p>

  <div class="parties">
    <div class="party-card">
      <div class="party-label">Company (Client)</div>
      <div class="party-name">${companyName}</div>
      <div class="party-detail">Represented by: ${founderName}</div>
    </div>
    <div class="party-card">
      <div class="party-label">Contractor</div>
      <div class="party-name">${contractorName}</div>
      <div class="party-detail">Providing services as: ${contractorRole}</div>
    </div>
  </div>

  <div class="comp-box">
    <div class="comp-item">
      <div class="comp-label">Compensation</div>
      <div class="comp-value">${compensationType === 'hourly' ? `$${rate}/hour` : `$${rate} fixed`}</div>
    </div>
    <div class="comp-item">
      <div class="comp-label">Type</div>
      <div class="comp-value">${compensationType === 'hourly' ? 'Hourly Rate' : 'Project Fee'}</div>
    </div>
    <div class="comp-item">
      <div class="comp-label">Start Date</div>
      <div class="comp-value">${startDate ?? 'Upon Signing'}</div>
    </div>
    ${endDate ? `<div class="comp-item"><div class="comp-label">End Date</div><div class="comp-value">${endDate}</div></div>` : ''}
  </div>

  ${clauses.map(c => `
  <div class="clause">
    <div class="clause-title">${c.title}</div>
    <div class="clause-body">${c.body}</div>
  </div>`).join('')}

  <div class="sig-block">
    <div class="sig-party">
      <div class="sig-label">For ${companyName}</div>
      <div class="sig-line"></div>
      <div class="sig-detail">Name: ${founderName}</div>
      <div class="sig-detail" style="margin-top:8px">Date: _______________</div>
    </div>
    <div class="sig-party">
      <div class="sig-label">Contractor</div>
      <div class="sig-line"></div>
      <div class="sig-detail">Name: ${contractorName}</div>
      <div class="sig-detail" style="margin-top:8px">Date: _______________</div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>Legal Notice:</strong> This agreement was generated by AI (Edge Alpha / Leo) for reference purposes only. It does not constitute legal advice. Have a qualified attorney review before signing, especially for engagements involving material IP, significant compensation, or complex scope.
  </div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'leo', action_type: 'contractor_agreement_generated',
      action_data: { contractorName, contractorRole, compensationType, rate },
    }).maybeSingle()

    return NextResponse.json({ html })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
