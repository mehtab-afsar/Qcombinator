import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/market-map
// No body — uses founder_profiles industry/description + competitive_matrix for context
// Returns: { map: { totalAddressableMarket, serviceable, obtainable, marketDynamics,
//   keyPlayers[], verticals[], entryPoints[], whitespace[], consolidationTrends[] } }

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

    const [{ data: matrixArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const description = profileData?.description as string ?? ''
    const stage = profileData?.stage as string ?? 'Seed'

    const matrix = matrixArt?.content as Record<string, unknown> | null
    const competitors = (matrix?.competitors as { name?: string }[] | undefined)
      ?.slice(0, 4).map(c => c.name ?? '').filter(Boolean).join(', ') ?? 'Not mapped yet'

    const prompt = `You are Atlas, a competitive intelligence expert. Build a market map for ${startupName}.

COMPANY: ${startupName} — ${description || `${stage} ${industry} startup`}
KNOWN COMPETITORS: ${competitors}

Map the total market landscape — not just direct competitors.

Return JSON only (no markdown):
{
  "marketOverview": "2-sentence summary of the market dynamics and opportunity",
  "totalAddressableMarket": { "size": "$X billion", "basis": "how this is calculated", "growth": "CAGR %" },
  "serviceableAddressableMarket": { "size": "$X billion", "segment": "specific segment you can realistically serve" },
  "serviceableObtainableMarket": { "size": "$X million", "horizon": "3-5 year realistic capture", "assumptions": "key assumptions" },
  "marketSegments": [
    { "segment": "segment name", "size": "size estimate", "growth": "fast/stable/declining", "competition": "crowded/moderate/fragmented", "ourFit": "strong/moderate/weak" }
  ],
  "keyPlayers": [
    { "name": "company name", "category": "incumbent / challenger / niche / adjacent", "marketShare": "est. %", "positioning": "1-line positioning" }
  ],
  "whitespaceOpportunities": [
    { "gap": "market gap description", "evidence": "why this gap exists", "difficulty": "easy/medium/hard to capture" }
  ],
  "entryPoints": [
    { "vertical": "specific vertical to enter first", "rationale": "why start here", "signalToExpand": "when to move to next vertical" }
  ],
  "marketDynamics": {
    "tailwinds": ["macro trend helping you 1", "tailwind 2"],
    "headwinds": ["challenge 1", "headwind 2"],
    "regulatoryShifts": "any relevant regulatory changes"
  },
  "consolidationTrends": ["trend 1 (e.g. large players acquiring in this space)", "trend 2"],
  "competitiveIntensity": "low / medium / high — 1 sentence rationale",
  "bottomLine": "1-sentence verdict on the market opportunity for ${startupName}"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let map: Record<string, unknown> = {}
    try { map = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate market map' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'market_map_generated',
      action_data: { startupName, segmentCount: (map.marketSegments as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ map })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
