import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/battle-cards
// No body — pulls competitive_matrix + tracked_competitors, Tavily-enriches each,
// Returns: { battleCards: [{ competitor, positioning, theirStrengths, theirWeaknesses,
//   whereYouWin, whereYouLose, objectionHandlers[], talkTrack, disqualifiers[], winSignals[] }] }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function tavilySearch(query: string): Promise<{ title: string; content: string }[]> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 3 }),
    })
    const j = await res.json() as { results?: { title: string; content: string }[] }
    return j.results ?? []
  } catch { return [] }
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const [{ data: tracked }, { data: matrixArtifact }, { data: fp }] = await Promise.all([
      admin.from('tracked_competitors').select('name, website').eq('user_id', user.id).limit(5),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const description = profileData?.description as string ?? ''
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    // Build competitor list from tracked + matrix artifact
    let competitors: { name: string; knownData?: string }[] = []
    if (tracked && tracked.length > 0) {
      competitors = tracked.map(t => ({ name: t.name }))
    } else if (matrixArtifact?.content) {
      const mc = matrixArtifact.content as Record<string, unknown>
      const matrixComps = (mc.competitors as { name?: string; strengths?: string[]; weaknesses?: string[]; pricing?: string }[] | undefined) ?? []
      competitors = matrixComps.slice(0, 4).map(c => ({
        name: c.name ?? 'Unknown',
        knownData: [
          c.strengths?.length ? `Strengths: ${c.strengths.slice(0, 2).join(', ')}` : '',
          c.weaknesses?.length ? `Weaknesses: ${c.weaknesses.slice(0, 2).join(', ')}` : '',
          c.pricing ? `Pricing: ${c.pricing}` : '',
        ].filter(Boolean).join(' | '),
      }))
    }

    if (competitors.length === 0) {
      return NextResponse.json({ error: 'No competitors found. Add via the competitive matrix first.' }, { status: 400 })
    }

    // Tavily-enrich top 4 competitors
    const targets = competitors.slice(0, 4)
    const enriched = await Promise.all(
      targets.map(async c => {
        const results = await tavilySearch(`${c.name} vs ${startupName} comparison review complaints 2024 2025`)
        const snippets = results.map(r => `${r.title}: ${r.content.slice(0, 160)}`).join('\n')
        return { name: c.name, knownData: c.knownData ?? '', liveSnippets: snippets || 'No live data found' }
      })
    )

    const competitorContext = enriched.map(c =>
      `### ${c.name}\nKnown: ${c.knownData || 'none'}\nLive research:\n${c.liveSnippets}`
    ).join('\n\n')

    const prompt = `You are Atlas, a competitive intelligence expert. Generate detailed battle cards for ${startupName}'s sales team to use when competing against each rival.

STARTUP: ${startupName}${description ? ` — ${description}` : ''}
INDUSTRY: ${industry}

COMPETITORS + RESEARCH:
${competitorContext}

For each competitor, build a battle card that helps the ${startupName} sales team WIN deals where this competitor is in the mix.

Return JSON only (no markdown):
{
  "battleCards": [
    {
      "competitor": "competitor name",
      "positioning": "in one sentence — how they position themselves vs the market",
      "theirStrengths": ["strength 1", "strength 2", "strength 3"],
      "theirWeaknesses": ["weakness 1", "weakness 2", "weakness 3"],
      "whereYouWin": ["scenario where ${startupName} consistently beats them 1", "scenario 2"],
      "whereYouLose": ["scenario where they have genuine advantage 1", "scenario 2"],
      "objectionHandlers": [
        { "objection": "prospect says: '${startupName} vs [competitor], why you?'", "response": "sharp, confident 2-sentence response" },
        { "objection": "prospect says '[competitor] has more features'", "response": "response" },
        { "objection": "prospect says '[competitor] is cheaper'", "response": "response" }
      ],
      "talkTrack": "2-3 sentence script for when a rep discovers this competitor is in the deal — what to say to shift the conversation",
      "disqualifiers": ["signal that means you should NOT compete here and walk away", "signal 2"],
      "winSignals": ["signal that means you're likely to win if you push hard", "signal 2"],
      "landmine": "the one question to ask the prospect that exposes this competitor's biggest weakness"
    }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1400 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: { battleCards?: unknown[] } = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate battle cards' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'battle_cards_generated',
      action_data: { startupName, competitorCount: (result.battleCards ?? []).length },
    }).maybeSingle()

    return NextResponse.json({ battleCards: result.battleCards ?? [], competitorCount: (result.battleCards ?? []).length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
