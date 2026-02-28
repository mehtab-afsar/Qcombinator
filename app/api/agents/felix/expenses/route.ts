import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/expenses
// Founder pastes a list of expenses → Felix categorizes into buckets
// (payroll, infra, marketing, legal, software, contractors, office, other)
// and surfaces burn breakdown + savings opportunities.
// Body: { expenses: string } — raw text list of expenses

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { expenses } = body as { expenses: string }

    if (!expenses || expenses.trim().length < 10) {
      return NextResponse.json({ error: 'expenses text is required' }, { status: 400 })
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Felix, a startup CFO. Parse and categorize a list of expenses. Extract line items and bucket them.
Return ONLY valid JSON:
{
  "lineItems": [
    { "description": "original line item text", "amount": 1200, "category": "payroll|infra|marketing|legal|software|contractors|office|other", "subcategory": "more specific label", "isRecurring": true }
  ],
  "totals": {
    "payroll": 0, "infra": 0, "marketing": 0, "legal": 0, "software": 0, "contractors": 0, "office": 0, "other": 0
  },
  "totalMonthlyBurn": 0,
  "largestCategories": ["top 2-3 categories by spend"],
  "savingsOpportunities": [
    { "item": "specific expense", "suggestion": "how to reduce it", "estimatedSaving": 300 }
  ],
  "burnHealthNote": "1 sentence on whether this burn profile is appropriate for the stage",
  "runway": null
}
Rules:
- If no amount is given for a line item, estimate based on industry norms for early-stage startups
- Parse currency symbols ($, €, £) and multipliers (k = 1000)
- Mark payroll, rent, SaaS subscriptions as recurring
- Identify 2-3 specific savings opportunities — be direct`,
        },
        {
          role: 'user',
          content: `Categorize these expenses:\n${expenses.trim()}`,
        },
      ],
      { maxTokens: 700, temperature: 0.2 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'felix',
      action_type: 'expenses_categorized',
      description: `Expense categorization: $${(result.totalMonthlyBurn as number | undefined)?.toLocaleString() ?? '?'}/mo total burn`,
      metadata: { totalMonthlyBurn: result.totalMonthlyBurn, largestCategories: result.largestCategories },
    }).then(() => {})

    return NextResponse.json({ result })
  } catch (err) {
    console.error('Felix expenses error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
