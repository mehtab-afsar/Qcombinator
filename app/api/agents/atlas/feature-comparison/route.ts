import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/feature-comparison
// No body — pulls competitive_matrix + gtm_playbook for context
// Returns: { comparison: { featureCategories[], youWin[], theyWin[], parity[],
//   gapAnalysis[], roadmapSignals[], salesNarrative, verdict } }

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

    const [{ data: compArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const comp = compArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null

    const competitors = (comp?.competitors as { name?: string }[] | undefined)?.slice(0, 4).map(c => c.name).join(', ') ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'

    const prompt = `You are Atlas, a competitive intelligence analyst. Build a feature comparison for ${startupName} vs competitors.

COMPANY: ${startupName} — ${stage} ${industry}
COMPETITORS: ${competitors || 'typical competitors in this space'}
TARGET CUSTOMER: ${icp}

Build a comprehensive feature-by-feature comparison. Focus on features that matter to buyers, not engineering internals.

Return JSON only (no markdown):
{
  "verdict": "1-sentence competitive feature position summary",
  "featureCategories": [
    {
      "category": "feature category (e.g. Core Functionality, Integrations, Analytics, Security, UX, Pricing Model)",
      "features": [
        {
          "feature": "specific feature name",
          "us": "full/partial/roadmap/no",
          "competitor1": "full/partial/roadmap/no",
          "competitor2": "full/partial/roadmap/no",
          "importance": "critical/high/medium/low",
          "buyerNote": "why this feature matters to the buyer"
        }
      ]
    }
  ],
  "youWin": [
    { "area": "where you clearly win", "advantage": "specific advantage", "howToLead": "how to emphasize this in sales" }
  ],
  "theyWin": [
    { "competitor": "competitor name", "area": "where they beat you", "gap": "how big is the gap", "response": "how to handle this in sales" }
  ],
  "parity": [
    { "feature": "feature at parity", "differentiator": "what else to emphasize instead" }
  ],
  "gapAnalysis": [
    { "gap": "feature gap you should prioritize closing", "reason": "why this gap loses deals", "urgency": "immediate/this quarter/later" }
  ],
  "roadmapSignals": [
    { "competitor": "competitor name", "signal": "what they're building or doing", "threatLevel": "high/medium/low", "counterMove": "how to respond" }
  ],
  "salesNarrative": "how to tell your feature story vs competitors in 3 sentences",
  "featureGapFAQ": [
    { "question": "a question buyers ask about a feature gap", "answer": "how to answer it honestly and positively" }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let comparison: Record<string, unknown> = {}
    try { comparison = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate feature comparison' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'feature_comparison_built',
      action_data: { startupName },
    }).maybeSingle()

    return NextResponse.json({ comparison })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
