import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/techstack
// Uses Tavily to detect a competitor's tech stack from their website + public sources.
// Body: { competitorName, competitorUrl? }

const TAVILY_KEY = process.env.TAVILY_API_KEY

async function tavilySearch(query: string): Promise<{ title: string; url: string; content: string }[]> {
  if (!TAVILY_KEY) return []
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_KEY,
        query,
        search_depth: 'basic',
        max_results: 6,
        include_domains: ['builtwith.com', 'stackshare.io', 'github.com', 'linkedin.com', 'techcrunch.com', 'crunchbase.com'],
      }),
    })
    const data = await res.json()
    return (data.results ?? []).map((r: { title: string; url: string; content: string }) => ({
      title: r.title, url: r.url, content: r.content?.slice(0, 600) ?? '',
    }))
  } catch { return [] }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { competitorName, competitorUrl } = body as {
      competitorName: string
      competitorUrl?: string
    }

    if (!competitorName?.trim()) return NextResponse.json({ error: 'competitorName is required' }, { status: 400 })

    const [stackResults, jobResults] = await Promise.all([
      tavilySearch(`${competitorName} tech stack technologies BuiltWith StackShare site:stackshare.io OR site:builtwith.com`),
      tavilySearch(`${competitorName} engineering blog infrastructure AWS cloud database 2024 2025`),
    ])

    const allResults = [...stackResults, ...jobResults]
    const context = allResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.content}`).join('\n\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Atlas, a competitive intelligence specialist. Analyze the provided search results and identify the competitor's technology stack.
Return ONLY valid JSON:
{
  "competitorName": "name",
  "confidence": "high | medium | low",
  "summary": "2-sentence plain-English summary of their stack and what it reveals about their technical choices",
  "categories": {
    "frontend": ["React", "Next.js"],
    "backend": ["Node.js", "Python"],
    "database": ["PostgreSQL", "Redis"],
    "cloud": ["AWS", "Vercel"],
    "payments": ["Stripe"],
    "analytics": ["Mixpanel", "Segment"],
    "marketing": ["HubSpot", "Intercom"],
    "auth": ["Auth0"],
    "other": []
  },
  "keyInsights": [
    "What their stack choice reveals about their scale or strategy — 2-4 insights"
  ],
  "competitiveImplications": "1-2 sentences: what this means for you — vulnerabilities to exploit, or strengths to be aware of",
  "recentChanges": "Any evidence of recent tech migrations or additions — null if none found",
  "sources": ["url1", "url2"]
}

If results are insufficient, return best estimates with confidence: "low".`,
        },
        {
          role: 'user',
          content: `Analyze tech stack for: ${competitorName}${competitorUrl ? ` (${competitorUrl})` : ''}

Search results:
${context || 'No search results found — provide best estimate based on company name/type.'}`,
        },
      ],
      { maxTokens: 900, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let techstack: Record<string, unknown>
    try { techstack = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { techstack = m ? JSON.parse(m[0]) : {} } catch { techstack = {} } }

    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'atlas',
      action_type: 'techstack_detected',
      description: `Tech stack detected for ${competitorName}`,
      metadata: { competitorName, confidence: techstack.confidence },
    }).then(() => {})

    return NextResponse.json({ techstack, competitorName })
  } catch (err) {
    console.error('Atlas techstack error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
