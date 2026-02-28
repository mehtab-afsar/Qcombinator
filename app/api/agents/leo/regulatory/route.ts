import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/regulatory
// Researches industry-specific regulations for the startup's sector.
// Body: { industry?, additionalContext? }
// Returns: { regulations[], complianceChecklist[], riskAreas[], timeline, immediateActions[] }

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
    const { industry: bodyIndustry, additionalContext } = body as {
      industry?: string
      additionalContext?: string
    }

    const admin = getAdmin()

    // Get founder profile for industry + product context
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('full_name, startup_name, industry, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const industry = bodyIndustry ?? fp?.industry ?? ''
    const solution = (sp.solution as string) ?? ''
    const targetCustomer = (sp.targetCustomer as string) ?? ''

    if (!industry.trim()) {
      return NextResponse.json({ error: 'Industry is required. Update your founder profile or pass it in the request.' }, { status: 400 })
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Leo, a startup legal advisor. Research and explain the key regulations that apply to this startup based on their industry and product.

Return ONLY valid JSON:
{
  "regulations": [
    {
      "name": "regulation name (e.g. HIPAA, GDPR, SOX, COPPA)",
      "applies": true,
      "severity": "must_comply | likely_applies | may_apply | monitor",
      "summary": "what this regulation requires in plain English",
      "penalty": "potential penalty for non-compliance",
      "applicableBecause": "why this applies to their specific business"
    }
  ],
  "complianceChecklist": [
    {
      "item": "specific compliance action",
      "category": "privacy | security | financial | consumer | employment | industry_specific",
      "timeline": "immediately | before_launch | before_fundraising | within_year",
      "difficulty": "easy | moderate | complex",
      "estimatedCost": "rough cost estimate"
    }
  ],
  "riskAreas": [
    { "area": "risk area name", "risk": "specific risk description", "severity": "high | medium | low" }
  ],
  "complianceScore": 0-100,
  "biggestRisk": "the single highest regulatory risk for this business",
  "quickWins": ["low-effort compliance items to do this week — typically privacy policy, terms, cookie consent"],
  "expertAdvice": "what type of lawyer to hire and what to ask them first"
}

Be specific to the industry. Generic advice is not useful. If you're unsure a regulation applies, mark it 'may_apply' and explain why.`,
        },
        {
          role: 'user',
          content: `Research regulations for:
Industry: ${industry}
${fp?.startup_name ? `Company: ${fp.startup_name}` : ''}
${solution ? `Product/solution: ${solution}` : ''}
${targetCustomer ? `Target customer: ${targetCustomer}` : ''}
${additionalContext ? `Additional context: ${additionalContext}` : ''}`,
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
      action_type: 'regulatory_research',
      description: `Regulatory research for ${industry} — compliance score: ${String(result.complianceScore ?? '?')}/100`,
      metadata:    { industry, complianceScore: result.complianceScore, biggestRisk: result.biggestRisk },
    }).then(() => {})

    return NextResponse.json({ result, industry })
  } catch (err) {
    console.error('Leo regulatory POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
