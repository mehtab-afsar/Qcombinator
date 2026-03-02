import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/pricing
// No body — pulls financial_summary + competitive_matrix + gtm_playbook artifacts for context
// Returns: { strategy: { recommendedModel, rationale, tiers[], freeTierAdvice, enterpriseAdvice,
//   discountingPolicy, trialStrategy, anchoringTactic, pricingPageAdvice, keyInsight,
//   competitorPositioning, yourAdvantage } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const [{ data: finArtifact }, { data: matrixArtifact }, { data: gtmArtifact }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const fin = finArtifact?.content as Record<string, unknown> | null
    const matrix = matrixArtifact?.content as Record<string, unknown> | null
    const gtm = gtmArtifact?.content as Record<string, unknown> | null

    const snapshot = fin?.snapshot as Record<string, string> | undefined
    const mrr = snapshot?.mrr ?? snapshot?.MRR ?? 'unknown'
    const avgRevPerCustomer = snapshot?.avgRevenuePerCustomer ?? snapshot?.arpu ?? 'unknown'

    const competitors = (matrix?.competitors as { name?: string; pricing?: string }[] | undefined)
      ?.slice(0, 4).map(c => `${c.name}: ${c.pricing ?? 'unknown pricing'}`).join('; ') ?? 'unknown'

    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage startups'

    const prompt = `You are Susi, a B2B sales expert. Design a pricing strategy for ${startupName}.

CONTEXT:
- Target customer: ${icp}
- Current MRR: ${mrr}
- Avg revenue per customer: ${avgRevPerCustomer}
- Competitor pricing: ${competitors}

Design a complete pricing strategy. Think about: what the market expects, willingness to pay for the ICP, competitor gaps, and optimal tier structure.

Return JSON only (no markdown):
{
  "recommendedModel": "per-seat | usage-based | flat-rate | freemium | hybrid",
  "rationale": "2 sentences on why this model fits best",
  "tiers": [
    {
      "name": "tier name",
      "price": "$X/mo or custom",
      "billingOptions": ["monthly", "annual (-20%)"],
      "seats": "number or unlimited",
      "keyFeatures": ["feature 1", "feature 2", "feature 3"],
      "targetCustomer": "who this tier is for",
      "positioningNote": "how to sell this tier"
    }
  ],
  "freeTierAdvice": "should you have a free tier? why/why not and what to include if yes",
  "enterpriseAdvice": "how to structure enterprise pricing",
  "discountingPolicy": "when/how to discount — annual discount, startup program, etc.",
  "trialStrategy": "free trial length, what to include, trial-to-paid conversion tactics",
  "anchoringTactic": "how to use price anchoring to make your main tier feel like a deal",
  "pricingPageAdvice": "2-3 tips on the pricing page design and messaging",
  "competitorPositioning": "how to position vs competitors on price",
  "yourAdvantage": "your unique pricing angle / differentiation",
  "keyInsight": "single most important pricing insight for ${startupName} right now"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate pricing strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'pricing_strategy_generated',
      action_data: { recommendedModel: strategy.recommendedModel, tierCount: (strategy.tiers as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
