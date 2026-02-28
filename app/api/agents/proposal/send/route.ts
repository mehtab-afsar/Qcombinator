import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

// POST /api/agents/proposal/send
// Generates a branded sales proposal from the sales_script artifact data
// and sends it as a rich HTML email via Resend.
//
// Body: {
//   salesScript:      Record<string, unknown>  — the sales_script artifact content
//   prospectName:     string
//   prospectEmail:    string
//   prospectCompany:  string
//   prospectTitle?:   string
//   dealValue?:       string   — e.g. "$12,000/year"
//   useCase?:         string   — what the prospect is trying to solve
//   yourName:         string
//   yourEmail:        string
//   yourCompany:      string
//   artifactId?:      string
// }

const PLATFORM_FROM = 'Edge Alpha <proposals@edgealpha.ai>'

function buildProposalHtml(params: {
  prospectName: string
  prospectCompany: string
  yourName: string
  yourCompany: string
  yourEmail: string
  dealValue: string
  useCase: string
  pitchFramework: Record<string, string>
  valueProps: Array<{ headline: string; description: string; proof?: string }>
  closingLines: string[]
  targetPersona: string
}): string {
  const { prospectName, prospectCompany, yourName, yourCompany, yourEmail, dealValue, useCase, pitchFramework, valueProps, closingLines } = params

  const firstName = prospectName.split(' ')[0]
  const todayStr  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const valuePropRows = valueProps.slice(0, 3).map(v => `
    <tr>
      <td style="padding:16px 20px;border-bottom:1px solid #E2DDD5">
        <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18160F">${v.headline}</p>
        <p style="margin:0;font-size:13px;color:#8A867C;line-height:1.55">${v.description}</p>
        ${v.proof ? `<p style="margin:6px 0 0;font-size:11px;color:#16A34A;font-weight:500">${v.proof}</p>` : ''}
      </td>
    </tr>
  `).join('')

  const closingLine = closingLines[0] || 'Looking forward to working with you.'

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Proposal for ${prospectCompany}</title>
</head>
<body style="margin:0;padding:0;background:#F2F2F0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">

  <!-- outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F2F2F0;padding:32px 0">
    <tr><td align="center">

      <!-- card -->
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#F9F7F2;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

        <!-- header bar -->
        <tr>
          <td style="background:#18160F;padding:24px 36px;text-align:left">
            <p style="margin:0;font-size:11px;color:#8A867C;text-transform:uppercase;letter-spacing:0.14em">Proposal</p>
            <p style="margin:6px 0 0;font-size:22px;font-weight:300;color:#F9F7F2;letter-spacing:-0.02em">For ${prospectCompany}</p>
            <p style="margin:6px 0 0;font-size:12px;color:#8A867C">${todayStr} · Prepared by ${yourName}</p>
          </td>
        </tr>

        <!-- greeting -->
        <tr>
          <td style="padding:36px 36px 0">
            <p style="margin:0 0 16px;font-size:16px;font-weight:400;color:#18160F">Hi ${firstName},</p>
            ${useCase
              ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#18160F">Thank you for the conversation about your need to <strong>${useCase}</strong>. Based on what you shared, I&apos;m confident we can help — here&apos;s what that looks like.</p>`
              : `<p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#18160F">Thank you for your time. Based on our conversation, I've put together a proposal outlining exactly how we can help ${prospectCompany}.</p>`
            }
          </td>
        </tr>

        <!-- problem / solution -->
        ${pitchFramework.problemStatement ? `
        <tr>
          <td style="padding:24px 36px 0">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em">The Problem</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#18160F">${pitchFramework.problemStatement}</p>
          </td>
        </tr>` : ''}

        ${pitchFramework.solutionBridge ? `
        <tr>
          <td style="padding:20px 36px 0">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em">Our Solution</p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#18160F">${pitchFramework.solutionBridge}</p>
          </td>
        </tr>` : ''}

        <!-- value props -->
        ${valuePropRows ? `
        <tr>
          <td style="padding:24px 36px 0">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em">What You Get</p>
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E2DDD5;border-radius:12px;overflow:hidden">
              ${valuePropRows}
            </table>
          </td>
        </tr>` : ''}

        <!-- investment -->
        ${dealValue ? `
        <tr>
          <td style="padding:24px 36px 0">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#18160F;border-radius:12px;overflow:hidden">
              <tr>
                <td style="padding:24px 28px">
                  <p style="margin:0 0 4px;font-size:11px;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em;font-weight:600">Investment</p>
                  <p style="margin:0;font-size:28px;font-weight:300;color:#F9F7F2;letter-spacing:-0.02em">${dealValue}</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}

        <!-- next steps -->
        <tr>
          <td style="padding:24px 36px 0">
            <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#8A867C;text-transform:uppercase;letter-spacing:0.12em">Next Steps</p>
            ${[
              'Reply to this email to accept or discuss terms',
              'We schedule a kickoff call within 48 hours',
              'Work begins on the agreed start date',
            ].map(step => `<p style="margin:0 0 8px;font-size:13px;color:#18160F;padding-left:16px">→&nbsp;&nbsp;${step}</p>`).join('')}
          </td>
        </tr>

        <!-- closing -->
        <tr>
          <td style="padding:28px 36px">
            <p style="margin:0 0 16px;font-size:14px;line-height:1.7;color:#18160F;font-style:italic">&ldquo;${closingLine}&rdquo;</p>
            <p style="margin:0 0 4px;font-size:14px;font-weight:600;color:#18160F">${yourName}</p>
            <p style="margin:0;font-size:12px;color:#8A867C">${yourCompany}</p>
            <a href="mailto:${yourEmail}" style="font-size:12px;color:#2563EB;text-decoration:none">${yourEmail}</a>
          </td>
        </tr>

        <!-- footer -->
        <tr>
          <td style="padding:20px 36px;border-top:1px solid #E2DDD5;text-align:center">
            <p style="margin:0;font-size:11px;color:#8A867C">Proposal prepared with <a href="https://edgealpha.ai" style="color:#2563EB;text-decoration:none">Edge Alpha</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resendKey = process.env.RESEND_API_KEY
    if (!resendKey) {
      return NextResponse.json({ error: 'Email sending not configured' }, { status: 503 })
    }

    const body = await request.json()
    const {
      salesScript = {},
      prospectName,
      prospectEmail,
      prospectCompany = '',
      prospectTitle = '',
      dealValue = '',
      useCase = '',
      yourName,
      yourEmail,
      yourCompany = '',
      artifactId,
    } = body as {
      salesScript: Record<string, unknown>
      prospectName: string
      prospectEmail: string
      prospectCompany?: string
      prospectTitle?: string
      dealValue?: string
      useCase?: string
      yourName: string
      yourEmail: string
      yourCompany?: string
      artifactId?: string
    }

    if (!prospectName || !prospectEmail || !yourName || !yourEmail) {
      return NextResponse.json({ error: 'prospectName, prospectEmail, yourName, yourEmail required' }, { status: 400 })
    }

    // Extract content from sales_script artifact
    const pitchFramework = (salesScript.pitchFramework as Record<string, string>) ?? {}
    const valueProps     = (salesScript.valuePropositions as Array<{ headline: string; description: string; proof?: string }>) ?? []
    const closingLines   = (salesScript.closingLines as string[]) ?? []
    const targetPersona  = (salesScript.targetPersona as string) ?? ''

    const proposalHtml = buildProposalHtml({
      prospectName,
      prospectCompany,
      yourName,
      yourCompany,
      yourEmail,
      dealValue,
      useCase,
      pitchFramework,
      valueProps,
      closingLines,
      targetPersona,
    })

    const subject = `Proposal for ${prospectCompany || prospectName} — from ${yourCompany || yourName}`

    const resend = new Resend(resendKey)
    const { data, error } = await resend.emails.send({
      from:    PLATFORM_FROM,
      replyTo: `${yourName} <${yourEmail}>`,
      to:      prospectEmail,
      subject,
      html:    proposalHtml,
    })

    if (error) {
      console.error('Proposal send error:', error)
      return NextResponse.json({ error: 'Failed to send proposal' }, { status: 500 })
    }

    // Save to proposals table
    const { data: saved } = await supabase
      .from('proposals')
      .insert({
        user_id:          user.id,
        artifact_id:      artifactId ?? null,
        prospect_name:    prospectName,
        prospect_email:   prospectEmail,
        prospect_company: prospectCompany || null,
        prospect_title:   prospectTitle || null,
        deal_value:       dealValue || null,
        use_case:         useCase || null,
        subject,
        proposal_html:    proposalHtml,
        resend_id:        data?.id ?? null,
        status:           'sent',
      })
      .select('id')
      .single()

    // Auto-create a deal in the pipeline at "proposal" stage (non-fatal)
    try {
      await supabase.from('deals').upsert(
        {
          user_id:       user.id,
          company:       prospectCompany || prospectName,
          contact_name:  prospectName,
          contact_email: prospectEmail,
          contact_title: prospectTitle || null,
          stage:         'proposal',
          value:         dealValue || null,
          notes:         `Proposal sent on ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          next_action:   'Follow up if no reply in 3 days',
          source:        'proposal_sent',
        },
        { onConflict: 'user_id,contact_email', ignoreDuplicates: false }
      )
    } catch {}

    // Log activity (non-fatal)
    try {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'susi',
        action_type: 'send_proposal',
        description: `Sent proposal to ${prospectName} at ${prospectCompany || prospectEmail}${dealValue ? ` · ${dealValue}` : ''}`,
        metadata:    { prospect_email: prospectEmail, deal_value: dealValue, proposal_id: saved?.id },
      })
    } catch {}

    return NextResponse.json({ success: true, proposalId: saved?.id, resendId: data?.id })
  } catch (err) {
    console.error('Proposal send error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agents/proposal/send — list sent proposals
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('proposals')
      .select('id, prospect_name, prospect_company, prospect_email, deal_value, subject, sent_at, status')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ proposals: data ?? [] })
  } catch (err) {
    console.error('Proposals GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
