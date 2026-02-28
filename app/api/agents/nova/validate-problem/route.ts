import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/validate-problem
// Searches Reddit, HackerNews, Twitter, and forums for people discussing the problem
// the founder is solving. Returns real quotes, link to threads, and potential early adopters.
// Body: { problemStatement, targetAudience?, industry? }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { problemStatement, targetAudience, industry } = body as {
      problemStatement: string
      targetAudience?: string
      industry?: string
    }

    if (!problemStatement?.trim()) return NextResponse.json({ error: 'problemStatement is required' }, { status: 400 })

    const admin = getAdmin()
    const tavilyKey = process.env.TAVILY_API_KEY

    const searchResults: { title: string; url: string; content: string; score?: number }[] = []

    // Run targeted searches across platforms
    const queries = [
      `site:reddit.com "${problemStatement.slice(0, 60)}" OR "${targetAudience ?? ''} frustrated struggling"`,
      `site:news.ycombinator.com "${problemStatement.slice(0, 50)}" problem solution`,
      `${targetAudience ?? ''} "${problemStatement.slice(0, 50).split(' ').slice(0, 5).join(' ')}" pain point forum`,
      `"I hate" OR "I wish" OR "why is there no" ${problemStatement.slice(0, 50)} ${industry ?? ''}`,
    ].filter(q => q.trim().length > 10)

    if (tavilyKey) {
      await Promise.all(queries.map(async query => {
        try {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query,
              max_results: 5,
              search_depth: 'basic',
              include_domains: ['reddit.com', 'news.ycombinator.com', 'quora.com', 'indiehackers.com', 'producthunt.com'],
            }),
          })
          if (res.ok) {
            const data = await res.json()
            const results = (data.results ?? []) as { title: string; url: string; content: string; score?: number }[]
            searchResults.push(...results.slice(0, 3))
          }
        } catch { /* non-fatal */ }
      }))
    }

    // Deduplicate by URL
    const seen = new Set<string>()
    const unique = searchResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true })

    const snippetsContext = unique
      .slice(0, 12)
      .map(r => `Platform: ${new URL(r.url).hostname.replace('www.','')}
URL: ${r.url}
Title: ${r.title}
Snippet: ${r.content?.slice(0, 300)}`)
      .join('\n\n---\n\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Nova, a PMF researcher. Analyse forum and community discussions to validate a startup's problem hypothesis.

Return ONLY valid JSON:
{
  "validationSignal": "strong|moderate|weak|inconclusive",
  "summary": "2-3 sentences — does the evidence confirm the problem is real and painful?",
  "painLevel": 0-10,
  "quotes": [
    {
      "text": "direct quote or close paraphrase from the search results",
      "source": "platform name (Reddit/HN/Quora etc)",
      "url": "link to the discussion",
      "sentiment": "frustrated|searching|complaining|requesting"
    }
  ],
  "themes": ["2-4 recurring pain themes found across discussions"],
  "earlyAdopterSignals": ["specific types of people complaining — potential early adopters to target"],
  "competitorMentions": ["any competing solutions mentioned, with context"],
  "messagingInsights": ["2-3 specific phrases/language patterns from real users to borrow for messaging"],
  "nextSteps": ["2-3 specific actions to further validate or exploit this data"]
}

Rules:
- Only quote from the actual search results provided
- If search results are thin, say so in summary — don't hallucinate evidence
- Focus on finding SPECIFIC pain language, not general topic relevance
- A quote is only valid if you can attribute it to a real snippet provided`,
        },
        {
          role: 'user',
          content: `Problem to validate: ${problemStatement.trim()}\nTarget audience: ${targetAudience ?? 'not specified'}\nIndustry: ${industry ?? 'not specified'}\n\nSearch results:\n${snippetsContext || 'No results found — Tavily may not be configured.'}`,
        },
      ],
      { maxTokens: 900, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'nova',
      action_type: 'problem_validated',
      description: `Problem validation search — signal: ${parsed.validationSignal ?? 'unknown'}, ${unique.length} sources analysed`,
      metadata:    { problemStatement: problemStatement.slice(0, 100), validationSignal: parsed.validationSignal, sourcesFound: unique.length },
    })

    return NextResponse.json({ validation: parsed, sourcesSearched: unique.length })
  } catch (err) {
    console.error('Nova validate-problem error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
