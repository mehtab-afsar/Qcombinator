import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/cap-table
// Validates a cap table description for legal issues: missing option pool,
// vesting not started, advisor shares without agreements, founder shares not restricted.
// Body: { capTableData, additionalContext? }
// Returns: { issues[], healthScore, urgentFixes[], investorReadinessGaps[], safeHarbor[], nextSteps }

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
    const { capTableData, additionalContext } = body as {
      capTableData: string
      additionalContext?: string
    }

    if (!capTableData?.trim()) {
      return NextResponse.json({ error: 'Cap table data is required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Get founder profile for context
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('startup_name, stage, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    // Also get any existing legal artifacts
    const { data: legalArtifact } = await admin
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('agent_id', 'leo')
      .eq('artifact_type', 'legal_checklist')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const legalContent = (legalArtifact?.content ?? {}) as Record<string, unknown>

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Leo, a startup legal advisor specializing in equity and corporate law. Validate this cap table for legal, structural, and investor-readiness issues.

Common issues to check:
1. No option pool (investors expect 10-20% pre-money for Series A)
2. Founder shares not subject to 4-year vesting with 1-year cliff
3. Advisor/consultant shares without formal advisor agreements
4. Employee option grants without a 409A valuation
5. SAFEs that haven't been converted and are creating uncertainty
6. Founder equity not restricted (83(b) election not filed)
7. Single founder with 100% equity (investor concern)
8. Option pool too large or too small relative to stage
9. Shares issued without proper board/stockholder approval
10. Missing accelerated vesting clauses for change-of-control

Return ONLY valid JSON:
{
  "healthScore": 0-100,
  "overallAssessment": "2-3 sentence honest assessment",
  "issues": [
    {
      "issue": "specific issue name",
      "category": "legal_gap | investor_concern | tax_risk | governance | structural",
      "severity": "critical | high | medium | low",
      "explanation": "why this is a problem",
      "howToFix": "specific steps to resolve",
      "timeline": "immediately | before_fundraising | before_hiring | within_6_months"
    }
  ],
  "urgentFixes": ["3-5 highest-priority fixes before the next funding conversation"],
  "investorReadinessGaps": ["specific things sophisticated investors will flag in due diligence"],
  "safeHarbor": ["things the cap table is doing well — don't overcorrect these"],
  "optionPoolAnalysis": {
    "currentSize": "estimated current ESOP pool size",
    "recommendedSize": "recommended size for their stage",
    "reasoning": "why"
  },
  "nextSteps": "prioritized action plan in plain English",
  "lawyerBrief": "what to tell your lawyer to focus on in the next session"
}

Be specific. Use legal terminology but explain it. If data is missing, note what you'd need to give a complete assessment.`,
        },
        {
          role: 'user',
          content: `Validate cap table for ${fp?.startup_name ?? 'this startup'} (${fp?.stage ?? 'unknown stage'}):

Cap table:
${capTableData}

${additionalContext ? `Additional context: ${additionalContext}` : ''}
${sp.fundingStage ? `Funding stage: ${sp.fundingStage}` : ''}
${legalContent.incorporationType ? `Incorporation: ${legalContent.incorporationType}` : ''}`,
        },
      ],
      { maxTokens: 1000, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'leo',
      action_type: 'cap_table_validated',
      description: `Cap table validation — health score: ${String(result.healthScore ?? '?')}/100, ${String((result.issues as unknown[] | undefined)?.length ?? 0)} issues found`,
      metadata:    { healthScore: result.healthScore, issueCount: (result.issues as unknown[] | undefined)?.length ?? 0 },
    }).then(() => {})

    return NextResponse.json({ result })
  } catch (err) {
    console.error('Leo cap-table POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
