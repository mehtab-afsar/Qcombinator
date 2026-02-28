import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

// POST /api/agents/leo/nda
// Body: { counterpartyName, counterpartyEmail, ndaType: 'mutual' | 'one-way', purpose, jurisdiction? }

function buildNdaHtml(params: {
  partyAName: string
  partyBName: string
  partyBEmail: string
  ndaType: 'mutual' | 'one-way'
  purpose: string
  jurisdiction: string
  effectiveDate: string
}): string {
  const { partyAName, partyBName, partyBEmail, ndaType, purpose, jurisdiction, effectiveDate } = params

  const mutualOrOneWay =
    ndaType === 'mutual'
      ? `Both parties may share Confidential Information with each other. Each party agrees to protect the other party's Confidential Information under the terms of this Agreement.`
      : `${partyAName} ("Disclosing Party") may disclose Confidential Information to ${partyBName} ("Receiving Party"). Only the Receiving Party is bound by the confidentiality obligations set forth herein.`

  const obligationsReciprocal =
    ndaType === 'mutual'
      ? `Each party (in its capacity as "Receiving Party") agrees to:`
      : `The Receiving Party (${partyBName}) agrees to:`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Non-Disclosure Agreement — ${partyAName} &amp; ${partyBName}</title>
</head>
<body style="margin:0;padding:40px;font-family:Georgia,'Times New Roman',serif;font-size:12pt;line-height:1.7;color:#1a1a1a;background:#ffffff;max-width:800px;margin:0 auto">

  <div style="text-align:center;margin-bottom:40px;padding-bottom:24px;border-bottom:2px solid #1a1a1a">
    <h1 style="font-size:18pt;font-weight:bold;letter-spacing:0.05em;margin:0 0 8px;text-transform:uppercase">Non-Disclosure Agreement</h1>
    <p style="font-size:11pt;margin:0;color:#444">${ndaType === 'mutual' ? 'Mutual' : 'One-Way (Unilateral)'} Non-Disclosure Agreement</p>
  </div>

  <p style="margin:0 0 20px">
    This Non-Disclosure Agreement (this <strong>"Agreement"</strong>) is entered into as of <strong>${effectiveDate}</strong> (the <strong>"Effective Date"</strong>), by and between:
  </p>

  <div style="background:#f8f8f8;border-left:4px solid #1a1a1a;padding:16px 20px;margin:0 0 20px">
    <p style="margin:0 0 8px"><strong>Party A:</strong> ${partyAName}</p>
    <p style="margin:0"><strong>Party B:</strong> ${partyBName} (${partyBEmail})</p>
  </div>

  <p style="margin:0 0 24px">
    The parties enter into this Agreement in connection with <strong>${purpose}</strong> (the <strong>"Purpose"</strong>). The parties desire to protect certain confidential and proprietary information that may be disclosed in furtherance of the Purpose.
  </p>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">1. Definition of Confidential Information</h2>
  <p style="margin:0 0 16px">
    <strong>"Confidential Information"</strong> means any non-public information disclosed by one party (the <strong>"Disclosing Party"</strong>) to the other party (the <strong>"Receiving Party"</strong>), whether orally, in writing, or in any other form, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information includes, without limitation, business plans, financial information, technical data, trade secrets, know-how, research, product plans, customer lists, and any information relating to the Disclosing Party's business, products, or services.
  </p>

  <p style="margin:0 0 24px">${mutualOrOneWay}</p>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">2. Obligations of Confidentiality</h2>
  <p style="margin:0 0 12px">${obligationsReciprocal}</p>
  <ol style="margin:0 0 24px;padding-left:24px">
    <li style="margin-bottom:8px">Hold all Confidential Information in strict confidence and not disclose it to any third party without the prior written consent of the Disclosing Party;</li>
    <li style="margin-bottom:8px">Use the Confidential Information solely for the Purpose and for no other purpose whatsoever;</li>
    <li style="margin-bottom:8px">Limit access to Confidential Information to those employees, contractors, or advisors who have a need to know such information in connection with the Purpose and who are bound by confidentiality obligations no less restrictive than those in this Agreement;</li>
    <li style="margin-bottom:8px">Protect the Confidential Information using at least the same degree of care used to protect its own confidential information, but in no event less than reasonable care;</li>
    <li style="margin-bottom:8px">Promptly notify the Disclosing Party in writing upon discovery of any unauthorized use or disclosure of Confidential Information.</li>
  </ol>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">3. Term</h2>
  <p style="margin:0 0 24px">
    This Agreement shall commence on the Effective Date and remain in effect for a period of <strong>three (3) years</strong>, unless earlier terminated by either party upon thirty (30) days' written notice to the other party. The confidentiality obligations set forth herein shall survive termination or expiration of this Agreement for a period of <strong>five (5) years</strong> with respect to any Confidential Information disclosed prior to termination.
  </p>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">4. Exclusions</h2>
  <p style="margin:0 0 12px">The obligations of confidentiality shall not apply to information that:</p>
  <ol style="margin:0 0 24px;padding-left:24px" type="a">
    <li style="margin-bottom:8px">Is or becomes publicly known through no act or omission of the Receiving Party;</li>
    <li style="margin-bottom:8px">Was rightfully known by the Receiving Party prior to disclosure by the Disclosing Party, as evidenced by written records predating the Effective Date;</li>
    <li style="margin-bottom:8px">Is rightfully received by the Receiving Party from a third party without restriction and without breach of any obligation of confidentiality;</li>
    <li style="margin-bottom:8px">Is independently developed by the Receiving Party without use of or reference to the Disclosing Party's Confidential Information;</li>
    <li style="margin-bottom:8px">Is required to be disclosed by law, regulation, court order, or government authority, provided that the Receiving Party gives prompt prior written notice to the Disclosing Party (to the extent permitted by law) and cooperates with the Disclosing Party in seeking a protective order or other appropriate relief.</li>
  </ol>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">5. Return of Information</h2>
  <p style="margin:0 0 24px">
    Upon the written request of the Disclosing Party, or upon termination or expiration of this Agreement, the Receiving Party shall promptly return or certify the destruction of all Confidential Information and all copies, summaries, abstracts, or other representations thereof, in whatever form or medium, within ten (10) business days of such request or termination. Notwithstanding the foregoing, the Receiving Party may retain one (1) archival copy of Confidential Information to the extent required by applicable law or regulation, subject to the continued obligations of confidentiality under this Agreement.
  </p>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">6. Remedies</h2>
  <p style="margin:0 0 24px">
    Each party acknowledges that any breach of this Agreement may cause irreparable harm to the Disclosing Party for which monetary damages would be an inadequate remedy. Accordingly, in the event of any actual or threatened breach of this Agreement, the Disclosing Party shall be entitled to seek injunctive or other equitable relief, without the requirement to post bond or other security, in addition to all other remedies available at law or in equity. The prevailing party in any action to enforce this Agreement shall be entitled to recover its reasonable attorneys' fees and costs.
  </p>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">7. Governing Law and Jurisdiction</h2>
  <p style="margin:0 0 24px">
    This Agreement shall be governed by and construed in accordance with the laws of <strong>${jurisdiction}</strong>, without regard to its conflict of laws principles. Each party hereby irrevocably consents to the exclusive jurisdiction and venue of the courts located in ${jurisdiction} for the resolution of any dispute arising out of or related to this Agreement.
  </p>

  <h2 style="font-size:13pt;font-weight:bold;margin:32px 0 12px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">8. General Provisions</h2>
  <p style="margin:0 0 12px">
    <strong>Entire Agreement.</strong> This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, understandings, negotiations, and discussions, whether oral or written, between the parties relating to the subject matter hereof.
  </p>
  <p style="margin:0 0 12px">
    <strong>Amendments.</strong> This Agreement may not be amended or modified except by a written instrument signed by both parties.
  </p>
  <p style="margin:0 0 12px">
    <strong>Severability.</strong> If any provision of this Agreement is held to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
  </p>
  <p style="margin:0 0 24px">
    <strong>No License.</strong> Nothing in this Agreement grants either party any rights in or license to the other party's Confidential Information except as expressly set forth herein.
  </p>

  <h2 style="font-size:13pt;font-weight:bold;margin:40px 0 20px;text-transform:uppercase;letter-spacing:0.03em;border-bottom:1px solid #ccc;padding-bottom:6px">Signature Block</h2>

  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:24px">
    <tr>
      <td width="48%" style="vertical-align:top;padding-right:20px">
        <p style="margin:0 0 8px;font-weight:bold">PARTY A: ${partyAName}</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:40px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Signature</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:24px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Printed Name</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:24px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Title</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:24px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Date</p>
      </td>
      <td width="4%">&nbsp;</td>
      <td width="48%" style="vertical-align:top;padding-left:20px">
        <p style="margin:0 0 8px;font-weight:bold">PARTY B: ${partyBName}</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:40px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Signature</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:24px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Printed Name</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:24px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Title</p>
        <div style="border-bottom:1px solid #1a1a1a;margin:24px 0 6px;min-width:200px">&nbsp;</div>
        <p style="margin:0;font-size:10pt;color:#555">Date</p>
      </td>
    </tr>
  </table>

  <p style="margin:40px 0 0;font-size:9pt;color:#888;border-top:1px solid #ddd;padding-top:16px">
    Generated by Edge Alpha · Leo Legal Agent · This document is provided as a template and does not constitute legal advice. Please consult a qualified attorney before executing.
  </p>
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

    const body = await request.json()
    const {
      counterpartyName,
      counterpartyEmail,
      ndaType,
      purpose,
      jurisdiction,
    } = body as {
      counterpartyName: string
      counterpartyEmail: string
      ndaType: 'mutual' | 'one-way'
      purpose: string
      jurisdiction?: string
    }

    if (!counterpartyName || !counterpartyEmail || !ndaType || !purpose) {
      return NextResponse.json(
        { error: 'counterpartyName, counterpartyEmail, ndaType, and purpose are required' },
        { status: 400 }
      )
    }

    if (ndaType !== 'mutual' && ndaType !== 'one-way') {
      return NextResponse.json(
        { error: 'ndaType must be "mutual" or "one-way"' },
        { status: 400 }
      )
    }

    // Fetch founder profile
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const partyAName = profile?.startup_name
      ? `${profile.startup_name}${profile.full_name ? ` (${profile.full_name})` : ''}`
      : profile?.full_name ?? 'Party A'

    const effectiveDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const resolvedJurisdiction = jurisdiction ?? 'the State of Delaware, United States'

    const ndaHtml = buildNdaHtml({
      partyAName,
      partyBName: counterpartyName,
      partyBEmail: counterpartyEmail,
      ndaType,
      purpose,
      jurisdiction: resolvedJurisdiction,
      effectiveDate,
    })

    const docId = randomUUID()

    // Attempt to insert into legal_documents table — wrapped in try/catch since table may not exist yet
    try {
      await supabase.from('legal_documents').insert({
        id: docId,
        user_id: user.id,
        doc_type: 'nda',
        counterparty_name: counterpartyName,
        counterparty_email: counterpartyEmail,
        content_html: ndaHtml,
        status: 'draft',
      })
    } catch (dbErr) {
      // Table may not exist yet — non-fatal, continue and return HTML
      console.warn('legal_documents insert skipped (table may not exist):', dbErr)
    }

    return NextResponse.json({ html: ndaHtml, docId })
  } catch (err) {
    console.error('Leo NDA error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
