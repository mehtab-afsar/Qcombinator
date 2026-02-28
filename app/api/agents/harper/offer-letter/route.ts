import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/offer-letter
// Generates an offer letter for an accepted candidate.
// Body: { candidateName, role, salary, equity?, startDate?, location?, reportingTo? }
// Returns: { letterHtml, keyTerms, subject }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { candidateName, role, salary, equity, startDate, location, reportingTo } = body as {
      candidateName: string
      role: string
      salary: string | number
      equity?: string
      startDate?: string
      location?: string
      reportingTo?: string
    }

    if (!candidateName?.trim() || !role?.trim() || !salary) {
      return NextResponse.json({ error: 'candidateName, role, and salary are required' }, { status: 400 })
    }

    const admin = getAdmin()

    const [
      { data: fp },
      { data: hiringArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper').eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const hiring = (hiringArtifact?.content ?? {}) as Record<string, unknown>

    const offerDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const startDateStr = startDate ?? 'to be confirmed'

    // Find role details from hiring plan
    const hiringRoles = (hiring.nextHires as { role: string; equity?: string }[] | undefined) ?? []
    const roleDetails = hiringRoles.find(r => r.role?.toLowerCase().includes(role.toLowerCase()))

    const context = [
      `Company: ${fp?.startup_name ?? 'Unknown'}`,
      `CEO/Signing: ${fp?.full_name ?? 'Founder'}`,
      `Candidate: ${candidateName}`,
      `Role: ${role}`,
      `Salary: ${typeof salary === 'number' ? `$${salary.toLocaleString()}` : salary} per year`,
      equity ? `Equity: ${equity}` : roleDetails?.equity ? `Equity: ${roleDetails.equity}` : '',
      `Start date: ${startDateStr}`,
      location ? `Location: ${location}` : sp.location ? `Location: ${sp.location}` : 'Remote-first',
      reportingTo ? `Reports to: ${reportingTo}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Harper, an HR advisor. Generate a professional, warm offer letter. Write as the CEO making a genuine, exciting offer.

Return ONLY valid JSON:
{
  "subject": "email subject for sending the offer",
  "opening": "warm opening paragraph welcoming them — genuine, not corporate",
  "terms": [
    { "label": "term label", "value": "term value" }
  ],
  "vestingDetails": "plain-English equity/vesting explanation (null if no equity)",
  "conditions": ["offer is conditional on: background check, references, etc."],
  "closingParagraph": "warm closing expressing excitement about them joining",
  "keyTerms": {
    "salary": "formatted salary string",
    "equity": "equity string or null",
    "startDate": "start date string",
    "offerExpiry": "5 business days from today"
  }
}

Terms should include at minimum: Position, Start Date, Base Salary, Equity (if applicable), Location, Benefits note.`,
        },
        {
          role: 'user',
          content: `Generate offer letter:\n\n${context}`,
        },
      ],
      { maxTokens: 800, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let offerData: Record<string, unknown> = {}
    try { offerData = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { offerData = m ? JSON.parse(m[0]) : {} } catch { offerData = {} } }

    const terms = (offerData.terms as { label: string; value: string }[] | undefined) ?? []

    const letterHtml = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Offer Letter — ${candidateName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; background: #FAFAF8; color: #18160F; padding: 60px 40px; max-width: 700px; margin: 0 auto; }
  .header { border-bottom: 2px solid #18160F; padding-bottom: 20px; margin-bottom: 32px; }
  .company { font-size: 22px; font-weight: 700; }
  .date { font-size: 13px; color: #6B6860; margin-top: 4px; }
  p { font-size: 15px; line-height: 1.8; margin-bottom: 16px; }
  .terms-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
  .terms-table td { padding: 10px 14px; border: 1px solid #E2DDD5; font-size: 14px; }
  .terms-table tr:first-child td { background: #F0EDE6; font-weight: 700; }
  .terms-table td:first-child { font-weight: 600; width: 40%; }
  .conditions { background: #FFFBEB; border-left: 3px solid #D97706; padding: 14px 18px; margin: 20px 0; }
  .conditions p { font-size: 13px; color: #6B6860; }
  .sig-line { border-bottom: 1px solid #18160F; width: 200px; height: 36px; margin-bottom: 6px; }
  .sig-label { font-size: 12px; color: #6B6860; }
  @media print { body { padding: 40px; } }
</style>
</head>
<body>
<div class="header">
  <div class="company">${fp?.startup_name ?? 'Company'}</div>
  <div class="date">${offerDate}</div>
</div>
<p>Dear ${candidateName},</p>
<p>${String(offerData.opening ?? `We are excited to offer you the position of ${role} at ${fp?.startup_name ?? 'our company'}.`)}</p>
${terms.length > 0 ? `<table class="terms-table"><tr><td>Term</td><td>Details</td></tr>${terms.map(t => `<tr><td>${t.label}</td><td>${t.value}</td></tr>`).join('')}</table>` : ''}
${offerData.vestingDetails ? `<p><strong>Equity & Vesting:</strong> ${String(offerData.vestingDetails)}</p>` : ''}
${(offerData.conditions as string[] | undefined)?.length ? `<div class="conditions"><p><strong>This offer is conditional on:</strong> ${(offerData.conditions as string[]).join('; ')}.</p></div>` : ''}
<p>${String(offerData.closingParagraph ?? 'We look forward to welcoming you to the team.')}</p>
<p>This offer expires in 5 business days. Please sign and return to confirm acceptance.</p>
<div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:48px;">
  <div><div class="sig-line"></div><div class="sig-label">${fp?.full_name ?? 'Founder'}, CEO<br>${fp?.startup_name ?? 'Company'}</div></div>
  <div><div class="sig-line"></div><div class="sig-label">${candidateName}<br>Date: ___________</div></div>
</div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'harper',
      action_type: 'offer_letter_generated',
      description: `Offer letter for ${candidateName} — ${role}`,
      metadata:    { candidateName, role, salary: String(salary), equity },
    }).then(() => {})

    return NextResponse.json({
      html: letterHtml,
      keyTerms: offerData.keyTerms ?? {},
      subject: offerData.subject ?? `Offer of Employment — ${role} at ${fp?.startup_name ?? 'Company'}`,
    })
  } catch (err) {
    console.error('Harper offer-letter POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
