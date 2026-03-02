import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/positioning-map
// No body — pulls competitive_matrix + gtm_playbook for context
// Returns: { map: { xAxis, yAxis, players[], yourPosition, whiteSpace[],
//   positioningStatement, differentiation, vulnerabilities[], moves[] } }

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

    const competitors = (comp?.competitors as { name?: string }[] | undefined)?.slice(0, 5).map(c => c.name).join(', ') ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'

    const prompt = `You are Atlas, a competitive intelligence analyst. Build a competitive positioning map for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
KNOWN COMPETITORS: ${competitors || 'none on file'}
TARGET CUSTOMER: ${icp}

Create a 2D positioning map with realistic axis dimensions that reveal white space opportunities. If competitors unknown, model typical ${industry} landscape.

Return JSON only (no markdown):
{
  "xAxis": { "label": "axis name (e.g. Ease of Use)", "low": "what low means", "high": "what high means" },
  "yAxis": { "label": "axis name (e.g. Enterprise Focus)", "low": "what low means", "high": "what high means" },
  "players": [
    {
      "name": "company name",
      "x": 0.7,
      "y": 0.3,
      "type": "direct/indirect/adjacent",
      "strength": "their core strength",
      "weakness": "exploitable weakness"
    }
  ],
  "yourPosition": { "x": 0.6, "y": 0.8, "rationale": "why you belong here" },
  "whiteSpace": [
    { "area": "uncontested territory description", "x": 0.5, "y": 0.9, "opportunity": "why this is valuable", "customerSegment": "who benefits" }
  ],
  "positioningStatement": "For [target customer] who [need], [company] is the [category] that [differentiator], unlike [alternatives] which [limitation].",
  "differentiation": { "primary": "strongest differentiator", "secondary": "second differentiator", "proof": "what evidence supports this" },
  "vulnerabilities": [
    { "vulnerability": "positioning risk", "fromCompetitor": "who could exploit this", "defense": "how to protect" }
  ],
  "moves": [
    { "move": "strategic positioning move", "rationale": "why now", "signal": "what to watch for", "timeline": "when to execute" }
  ],
  "verdict": "1-sentence positioning health summary"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let map: Record<string, unknown> = {}
    try { map = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate positioning map' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'positioning_map_built',
      action_data: { startupName, whiteSpaceCount: (map.whiteSpace as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ map })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
