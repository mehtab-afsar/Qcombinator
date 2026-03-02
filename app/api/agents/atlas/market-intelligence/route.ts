import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/market-intelligence
// No body — pulls competitive_matrix + founder_profiles for context
// Returns: { intelligence: { verdict, marketSignals[], trends[], emergingPlayers[],
//   threatRadar[], opportunityMap[], regulatoryWatch[], customerSentiment[], watchlist[], prioritySignal } }

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

    const [{ data: compArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const comp = compArt?.content as Record<string, unknown> | null
    const competitors = (comp?.competitors as { name: string }[] | undefined)?.slice(0, 4).map(c => c.name).join(', ') ?? 'major players in the space'

    const prompt = `You are Atlas, a competitive intelligence analyst. Build a market intelligence briefing for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
KNOWN COMPETITORS: ${competitors}

Synthesize market intelligence: trends, emerging threats, opportunities, and signals for a ${stage} ${industry} startup.

Return JSON only (no markdown):
{
  "verdict": "1-sentence market conditions assessment",
  "marketSignals": [
    {
      "signal": "market signal or development",
      "category": "funding / product launch / regulatory / talent / partnership / pricing",
      "impact": "how this affects ${startupName}",
      "urgency": "high / medium / low",
      "source": "where this signal comes from"
    }
  ],
  "trends": [
    {
      "trend": "macro or micro trend",
      "direction": "accelerating / stable / decelerating",
      "timeHorizon": "immediate / 6mo / 1-2yr / 3-5yr",
      "opportunity": "how to capitalize",
      "threat": "risk if you ignore it"
    }
  ],
  "emergingPlayers": [
    {
      "company": "emerging competitor or entrant",
      "threat": "how they could disrupt you",
      "differentiation": "what makes them different",
      "watchLevel": "high / medium / monitor"
    }
  ],
  "threatRadar": [
    {
      "threat": "competitive threat",
      "likelihood": "high / medium / low",
      "timeframe": "when this threat materializes",
      "response": "how to prepare now"
    }
  ],
  "opportunityMap": [
    {
      "opportunity": "market opportunity",
      "size": "estimated opportunity size",
      "readiness": "ready now / 6 months / 12+ months",
      "firstMoveAdvantage": "why moving first matters"
    }
  ],
  "watchlist": [
    {
      "entity": "company / regulation / technology to watch",
      "reason": "why this matters",
      "trigger": "specific event that would require action"
    }
  ],
  "prioritySignal": "the single most important market development to act on this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let intelligence: Record<string, unknown> = {}
    try { intelligence = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate market intelligence' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'market_intel_built',
      action_data: { startupName },
    }).maybeSingle()

    return NextResponse.json({ intelligence })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
