import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/cost-reduction
// No body — pulls financial_summary + qscore_history for metrics
// Returns: { analysis: { totalPotentialSavings, categories[], quickWins[],
//   renegotiationTargets[], efficiencyGains[], implementationPlan[], verdict } }

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

    const [{ data: finArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('assessment_data').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const fin = finArt?.content as Record<string, unknown> | null
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null
    const snapshot = fin?.snapshot as Record<string, string> | null

    const burnRate = snapshot?.burn ?? assessment?.burnRate ?? 'unknown'
    const mrr = snapshot?.mrr ?? assessment?.mrr ?? 'unknown'
    const headcount = snapshot?.headcount ?? 'unknown'
    const runway = snapshot?.runway ?? assessment?.runway ?? 'unknown'

    const prompt = `You are Felix, a financial advisor. Analyze cost reduction opportunities for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
CURRENT BURN: ${burnRate}/month
MRR: ${mrr}
HEADCOUNT: ${headcount}
RUNWAY: ${runway}

Identify practical cost reduction opportunities for a ${stage} ${industry} startup. Focus on what can be cut or renegotiated without killing growth. Use realistic estimates if data is unknown.

Return JSON only (no markdown):
{
  "verdict": "1-sentence assessment of current burn efficiency",
  "totalPotentialSavings": "estimated monthly savings potential (e.g. $5K-$15K/mo)",
  "burnMultipleTarget": "target burn multiple after optimization (e.g. 1.2x)",
  "categories": [
    {
      "category": "cost category (e.g. SaaS Tools, Cloud/Infra, Headcount, Contractors, Marketing, Office)",
      "estimatedMonthlyCost": "estimated current spend",
      "potentialSaving": "estimated savings",
      "savingPct": 30,
      "actions": ["specific action 1", "action 2"],
      "difficulty": "easy/medium/hard",
      "riskToGrowth": "none/low/medium/high"
    }
  ],
  "quickWins": [
    { "win": "specific cost to cut this week", "saving": "monthly saving amount", "howTo": "exact steps", "timeToImplement": "1 day / 1 hour" }
  ],
  "renegotiationTargets": [
    { "vendor": "category or vendor type", "currentDeal": "estimated terms", "leverage": "what you can use to negotiate", "targetOutcome": "what to aim for", "script": "2-sentence negotiation opener" }
  ],
  "efficiencyGains": [
    { "area": "where to become more efficient", "currentState": "what's happening now", "improvement": "what to change", "monthlySaving": "estimated saving" }
  ],
  "implementationPlan": [
    { "week": "Week 1 / Week 2 / Week 3 / Week 4", "actions": ["action 1", "action 2"], "targetSaving": "savings to achieve this week" }
  ],
  "shouldNotCut": ["things that seem like costs but are actually growth engines — don't cut these"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate cost reduction analysis' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'felix', action_type: 'cost_reduction_analyzed',
      action_data: { startupName, totalPotentialSavings: analysis.totalPotentialSavings },
    }).maybeSingle()

    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
