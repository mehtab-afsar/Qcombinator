import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/clauses
// Returns standard contract clauses for a given clause type, customized to the founder's context.
// Body: { clauseType: string, jurisdiction?: string, context?: string }

const CLAUSE_TYPES = [
  'non-disclosure', 'non-compete', 'non-solicitation', 'ip-assignment',
  'indemnification', 'limitation-of-liability', 'governing-law',
  'dispute-resolution', 'termination', 'payment-terms',
]

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { clauseType, jurisdiction = 'Delaware, USA', context } = body as {
      clauseType: string
      jurisdiction?: string
      context?: string
    }

    if (!clauseType?.trim()) return NextResponse.json({ error: 'clauseType is required' }, { status: 400 })

    const { data: fp } = await supabase
      .from('founder_profiles')
      .select('startup_name, industry')
      .eq('user_id', user.id)
      .single()

    const company = fp?.startup_name ?? 'the company'
    const industry = fp?.industry ?? 'technology'

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Leo, a startup legal advisor. Generate standard contract clause options.
Return ONLY valid JSON:
{
  "clauseType": "human-readable clause name",
  "summary": "1-2 sentence plain-English explanation of what this clause does and why it matters",
  "variants": [
    {
      "label": "Founder-Friendly",
      "riskLevel": "low",
      "text": "the full clause text, ready to paste",
      "notes": "when to use this variant — 1 sentence"
    },
    {
      "label": "Balanced",
      "riskLevel": "medium",
      "text": "the full clause text",
      "notes": "when to use this variant"
    },
    {
      "label": "Investor/Buyer-Friendly",
      "riskLevel": "high",
      "text": "the full clause text",
      "notes": "when to use and what to watch out for"
    }
  ],
  "keyTermsToNegotiate": ["3-5 specific things to push back on or clarify"],
  "redFlags": ["2-3 red flag variants to watch for in the wild"]
}`,
        },
        {
          role: 'user',
          content: `Generate clause options for: ${clauseType}
Company: ${company} (${industry})
Jurisdiction: ${jurisdiction}
${context ? `Context: ${context}` : ''}`,
        },
      ],
      { maxTokens: 1600, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} } }

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'leo',
      action_type: 'clause_generated',
      description: `Contract clause generated: ${clauseType}`,
      metadata: { clauseType, jurisdiction },
    }).then(() => {})

    return NextResponse.json({ clause: parsed, clauseType })
  } catch (err) {
    console.error('Leo clauses error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ clauseTypes: CLAUSE_TYPES })
}
