import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/market-size
// No body — pulls tracked_competitors + competitive_matrix, Tavily-researches each for
// funding/headcount/ARR signals, LLM estimates TAM/SAM/SOM
// Returns: { tam, sam, som, methodology, competitorRevenues[], marketGrowthRate,
//   keyInsight, yourTargetShare, confidence }

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

    // Build competitor list
    let competitors: string[] = []
    if (tracked && tracked.length > 0) {
      competitors = tracked.map(t => t.name).filter(Boolean)
    } else if (matrixArtifact?.content) {
      const mc = matrixArtifact.content as Record<string, unknown>
      competitors = ((mc.competitors as { name?: string }[] | undefined) ?? []).map(c => c.name ?? '').filter(Boolean).slice(0, 4)
    }

    if (competitors.length === 0) {
      return NextResponse.json({ error: 'No tracked competitors found. Add competitors via the competitive matrix first.' }, { status: 400 })
    }

    // Tavily: search for funding + ARR signals for each competitor (max 4)
    const targets = competitors.slice(0, 4)
    const researchResults = await Promise.all(
      targets.map(name => tavilySearch(`${name} funding ARR revenue employees 2024 2025`))
    )

    const competitorContext = targets.map((name, i) => {
      const snippets = researchResults[i].map(r => `  ${r.title}: ${r.content.slice(0, 180)}`).join('\n')
      return `### ${name}\n${snippets || '  No data found'}`
    }).join('\n\n')

    const industry = (profileData?.industry as string | undefined) ?? 'B2B SaaS'
    const description = (profileData?.description as string | undefined) ?? ''

    const prompt = `You are Atlas, a competitive intelligence expert. Estimate the market size for ${startupName}.

STARTUP: ${startupName}${description ? ` — ${description}` : ''}
INDUSTRY: ${industry}

COMPETITOR RESEARCH (funding, ARR, headcount signals):
${competitorContext}

Based on this data, estimate:
- Individual competitor ARR/revenue (use funding rounds as proxy: typical SaaS companies raise at 10x ARR)
- Total addressable market (TAM) — everyone who COULD use this type of product
- Serviceable addressable market (SAM) — your realistic total market with current distribution
- Serviceable obtainable market (SOM) — what you could realistically capture in 3-5 years

Return JSON only (no markdown):
{
  "tam": "$X billion",
  "sam": "$X million",
  "som": "$X million",
  "tamRationale": "1 sentence",
  "samRationale": "1 sentence",
  "somRationale": "1 sentence",
  "methodology": "how you derived these estimates",
  "competitorRevenues": [
    { "name": "competitor", "estimatedARR": "$X million", "funding": "$X raised", "signal": "how you inferred this" }
  ],
  "combinedCompetitorRevenue": "$X million",
  "marketGrowthRate": "X% YoY",
  "marketMaturity": "emerging | growing | mature | declining",
  "keyInsight": "most important market sizing insight for ${startupName}",
  "yourTargetShare": "realistic % of SAM to target in year 3",
  "confidence": "high | medium | low"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 800 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to estimate market size' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'market_sized',
      action_data: { tam: result.tam, sam: result.sam, som: result.som, competitorsResearched: targets.length },
    }).maybeSingle()

    return NextResponse.json({ ...result, competitorsResearched: targets.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
