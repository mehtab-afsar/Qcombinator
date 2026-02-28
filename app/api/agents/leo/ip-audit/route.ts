import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/ip-audit
// Audits startup IP risks: code ownership, prior employer claims, OSS licenses, contractor assignments.
// Body: { codeAuthors, priorEmployers?, ossLibraries?, hasContractorAgreements?, additionalContext? }
// Returns: { riskScore, risks[], recommendations[], urgentItems[], certifications[] }

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
    const {
      codeAuthors,
      priorEmployers,
      ossLibraries,
      hasContractorAgreements,
      additionalContext,
    } = body as {
      codeAuthors?: string
      priorEmployers?: string
      ossLibraries?: string
      hasContractorAgreements?: boolean
      additionalContext?: string
    }

    const admin = getAdmin()

    // Get founder + company context
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('full_name, startup_name, industry, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    const contextParts = [
      fp?.startup_name ? `Company: ${fp.startup_name}` : '',
      fp?.industry ? `Industry: ${fp.industry}` : '',
      (sp.solution as string) ? `Product: ${sp.solution as string}` : '',
      codeAuthors ? `Code authors: ${codeAuthors}` : '',
      priorEmployers ? `Prior employers of founders/engineers: ${priorEmployers}` : '',
      ossLibraries ? `Open source libraries used: ${ossLibraries}` : '',
      hasContractorAgreements !== undefined ? `Contractor IP assignments signed: ${hasContractorAgreements ? 'Yes' : 'No'}` : '',
      additionalContext ? `Additional context: ${additionalContext}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Leo, a startup legal advisor specializing in intellectual property. Conduct an IP audit and identify risks.

Return ONLY valid JSON:
{
  "riskScore": 0-100,
  "riskLevel": "low | medium | high | critical",
  "risks": [
    {
      "category": "prior_employer | contractor | oss_license | founder_ownership | trade_secret | patent",
      "risk": "specific risk description",
      "severity": "critical | high | medium | low",
      "likelihood": "likely | possible | unlikely",
      "explanation": "why this matters for investors and acquirers"
    }
  ],
  "urgentItems": ["things to fix BEFORE fundraising or any major deal"],
  "recommendations": [
    { "action": "specific action to take", "timeline": "immediately | within_30_days | within_90_days", "cost": "estimate — e.g. '$500 lawyer review' or 'free — template agreement'" }
  ],
  "investorReadiness": "how an investor or acquirer will view this IP situation",
  "cleanBillOfHealth": ["things that are correctly in place"],
  "priorityQuestion": "the single most important question to ask a startup lawyer about your IP"
}

Key risks to check:
- PIIA/CIIA: Did founders and engineers sign IP assignment agreements?
- Prior employer: Do any founders have moonlighting clauses or IP ownership claims from a prior employer?
- OSS: Are any GPL/LGPL/AGPL libraries used that could require open-sourcing your code?
- Contractors: Were all contractors required to assign IP to the company?
- Trade secrets: Are there confidentiality agreements protecting key IP?`,
        },
        {
          role: 'user',
          content: `Audit IP risks:\n${contextParts}`,
        },
      ],
      { maxTokens: 800, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let audit: Record<string, unknown> = {}
    try { audit = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { audit = m ? JSON.parse(m[0]) : {} } catch { audit = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'leo',
      action_type: 'ip_audit',
      description: `IP audit — risk: ${String(audit.riskLevel ?? 'unknown')}, score: ${String(audit.riskScore ?? '?')}/100`,
      metadata:    { riskScore: audit.riskScore, riskLevel: audit.riskLevel, urgentItemsCount: (audit.urgentItems as unknown[])?.length ?? 0 },
    }).then(() => {})

    return NextResponse.json({ audit })
  } catch (err) {
    console.error('Leo IP audit POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
