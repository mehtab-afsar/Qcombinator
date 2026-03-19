import { withCircuitBreaker } from '@/lib/circuit-breaker'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/pricing
// No body — pulls tracked_competitors + competitive_matrix artifact, uses Tavily to find live pricing.
// Returns: { pricing: { competitor, pricingModel, tiers[], startingPrice, hasFree, hasEnterprise,
//   signals[], lastScraped }[], insights: { cheapest, mostExpensive, yourPositioning,
//   pricingGap, opportunity, recommendation } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function tavilySearch(query: string): Promise<{ title: string; content: string; url: string }[]> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return []
  return withCircuitBreaker('tavily', async () => {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 4 }),
    })
    const j = await res.json() as { results?: { title: string; content: string; url: string }[] }
    return j.results ?? []
  }, [])
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    // Pull tracked competitors + competitive matrix artifact + founder profile
    const [
      { data: tracked },
      { data: matrixArtifact },
      { data: fp },
    ] = await Promise.all([
      admin.from('tracked_competitors').select('name, website').eq('user_id', user.id).limit(6),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas').eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    // Build competitor list from tracked_competitors or fall back to matrix artifact
    let competitorNames: string[] = []
    if (tracked && tracked.length > 0) {
      competitorNames = tracked.map(t => t.name).filter(Boolean)
    } else if (matrixArtifact?.content) {
      const matrix = matrixArtifact.content as Record<string, unknown>
      const comps = matrix.competitors as { name?: string }[] | undefined
      competitorNames = (comps ?? []).map(c => c.name ?? '').filter(Boolean).slice(0, 5)
    }

    if (competitorNames.length === 0) {
      return NextResponse.json({ error: 'No tracked competitors found. Add competitors via the competitive matrix first.' }, { status: 400 })
    }

    const startupName = fp?.startup_name ?? 'Your startup'
    const startupDesc = (fp?.startup_profile_data as Record<string, unknown> | null)?.description as string | undefined

    // Tavily: search each competitor's pricing page in parallel (max 4 to avoid slow response)
    const targetCompetitors = competitorNames.slice(0, 4)
    const pricingSearches = await Promise.all(
      targetCompetitors.map(name =>
        tavilySearch(`${name} pricing plans cost per month 2025 SaaS`)
      )
    )

    // Build context for LLM
    const competitorContext = targetCompetitors.map((name, i) => {
      const results = pricingSearches[i]
      const snippet = results.map(r => `  ${r.title}: ${r.content.slice(0, 200)}`).join('\n')
      return `### ${name}\n${snippet || '  No pricing data found'}`
    }).join('\n\n')

    const prompt = `You are a competitive pricing analyst. Based on the scraped data below, extract pricing information for each competitor and generate strategic insights.

YOUR STARTUP: ${startupName}${startupDesc ? ` — ${startupDesc}` : ''}

COMPETITOR PRICING DATA (scraped):
${competitorContext}

For each competitor, extract what you can. If data is limited, make reasonable inferences.

Return JSON only (no markdown):
{
  "pricing": [
    {
      "competitor": "name",
      "pricingModel": "per-seat | usage-based | flat-rate | freemium | custom",
      "tiers": [{"name": "tier name", "price": "$X/mo or free or custom", "keyFeature": "main value"}],
      "startingPrice": "$X/mo or Free or Custom",
      "hasFree": true/false,
      "hasEnterprise": true/false,
      "signals": ["pricing signal 1", "pricing signal 2"]
    }
  ],
  "insights": {
    "cheapest": "competitor name",
    "mostExpensive": "competitor name",
    "averageStartingPrice": "$X/mo",
    "yourPositioning": "recommendation: position ${startupName} at what price point and why",
    "pricingGap": "gap in the market you could exploit",
    "opportunity": "specific pricing strategy opportunity",
    "recommendation": "2-3 sentence actionable pricing recommendation for ${startupName}"
  }
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: { pricing: unknown[]; insights: unknown } = { pricing: [], insights: {} }
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to parse pricing analysis' }, { status: 500 })
    }

    // Attach lastScraped timestamp to each entry
    const pricingWithTimestamp = (result.pricing as Record<string, unknown>[]).map(p => ({
      ...p,
      lastScraped: new Date().toISOString(),
    }))

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'atlas', action_type: 'pricing_monitored',
      action_data: { competitorsAnalyzed: targetCompetitors.length, competitors: targetCompetitors },
    }).maybeSingle()

    return NextResponse.json({ pricing: pricingWithTimestamp, insights: result.insights, competitorsAnalyzed: targetCompetitors.length })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
