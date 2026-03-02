import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/ip-strategy
// No body — pulls legal_checklist + founder_profiles for context
// Returns: { strategy: { verdict, ipScore, portfolio[], tradeSecrets[], trademarks[],
//   patentCandidates[], defensiveMoat, licensingOpportunities[], redFlags[], priorityAction } }

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

    const [{ data: legalArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'leo')
        .eq('artifact_type', 'legal_checklist').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'
    const description = profileData?.description as string ?? ''

    const legal = legalArt?.content as Record<string, unknown> | null
    const incorporationType = (legal?.incorporationType as string | undefined) ?? 'Delaware C-Corp'

    const prompt = `You are Leo, a startup legal advisor. Build a comprehensive IP strategy for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
DESCRIPTION: ${description || 'not provided'}
ENTITY TYPE: ${incorporationType}

Design an IP protection and monetization strategy for a ${stage} ${industry} startup.

Return JSON only (no markdown):
{
  "verdict": "1-sentence IP posture assessment",
  "ipScore": 65,
  "portfolio": [
    {
      "ipType": "Patent / Trademark / Copyright / Trade Secret",
      "asset": "what the IP covers",
      "status": "registered / pending / unregistered / recommended",
      "protectionLevel": "strong / moderate / weak",
      "value": "strategic value of this IP"
    }
  ],
  "tradeSecrets": [
    {
      "secret": "what to protect as trade secret",
      "protection": "how to protect it operationally",
      "risk": "biggest risk to this secret"
    }
  ],
  "trademarks": [
    {
      "mark": "what to trademark",
      "class": "USPTO class description",
      "urgency": "register now / register within 6mo / monitor",
      "cost": "estimated registration cost"
    }
  ],
  "patentCandidates": [
    {
      "invention": "what could be patented",
      "type": "utility / design / provisional",
      "viability": "high / medium / low",
      "reasoning": "why this is/isn't worth patenting"
    }
  ],
  "defensiveMoat": "how your IP portfolio creates a defensive moat against competitors",
  "licensingOpportunities": [
    {
      "opportunity": "potential licensing play",
      "potentialRevenue": "estimated revenue opportunity",
      "approach": "how to structure and pursue"
    }
  ],
  "redFlags": [
    {
      "risk": "IP risk or gap",
      "severity": "high / medium / low",
      "fix": "how to address immediately"
    }
  ],
  "priorityAction": "single most important IP action to take this month"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate IP strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'leo', action_type: 'ip_strategy_built',
      action_data: { startupName, ipScore: strategy.ipScore },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
