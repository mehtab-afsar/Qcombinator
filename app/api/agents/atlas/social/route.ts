import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/social
// Searches Twitter/Reddit/HN/web for mentions of one or more competitors.
// Uses Tavily for real-time results, then LLM synthesizes competitive intel.
// Body: { competitors: string[], topics?: string[] }
// Returns: { mentions, sentimentSummary, complaints, praise, opportunities }

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
    const { competitors, topics } = body as { competitors: string[]; topics?: string[] }

    if (!competitors || competitors.length === 0) {
      return NextResponse.json({ error: 'competitors array is required' }, { status: 400 })
    }

    const tavilyKey = process.env.TAVILY_API_KEY
    const admin = getAdmin()

    // Build search queries — one per competitor, focus on social/forum mentions
    const queries = competitors.slice(0, 3).flatMap(comp => [
      `"${comp}" site:reddit.com`,
      `"${comp}" site:twitter.com OR site:x.com`,
      `"${comp}" site:news.ycombinator.com`,
    ]).concat(
      (topics ?? []).slice(0, 2).map(t => `${competitors[0]} ${t}`)
    )

    // Run Tavily searches in parallel (cap at 5 queries to manage cost)
    const searchResults: { title: string; url: string; content: string; source: string }[] = []

    if (tavilyKey) {
      await Promise.allSettled(
        queries.slice(0, 5).map(async (q) => {
          const res = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              api_key: tavilyKey,
              query: q,
              max_results: 4,
              search_depth: 'basic',
              include_answer: false,
            }),
          })
          if (!res.ok) return
          const data = await res.json() as { results?: { title: string; url: string; content: string }[] }
          const source = q.includes('reddit') ? 'Reddit' : q.includes('twitter') || q.includes('x.com') ? 'Twitter/X' : q.includes('ycombinator') ? 'HN' : 'Web'
          for (const r of data.results ?? []) {
            searchResults.push({ title: r.title, url: r.url, content: r.content?.slice(0, 400) ?? '', source })
          }
        })
      )
    }

    // Fallback: also get any tracked competitor alerts from DB
    const { data: trackedAlerts } = await admin
      .from('agent_activity')
      .select('description, metadata, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', 'atlas')
      .in('action_type', ['competitor_alert', 'social_mention'])
      .order('created_at', { ascending: false })
      .limit(10)

    const allCompetitorNames = competitors.join(', ')
    const mentionContext = searchResults.length > 0
      ? searchResults.map(r => `[${r.source}] ${r.title}\n${r.content}`).join('\n\n---\n\n')
      : 'No live results available. Analyze based on competitor names only.'

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Atlas, a competitive intelligence advisor. Analyze social media and forum mentions of competitors to surface actionable insights.

Return ONLY valid JSON:
{
  "overallSentiment": "positive | mixed | negative | insufficient_data",
  "topComplaints": [
    { "complaint": "specific complaint about competitor", "frequency": "high | medium | low", "quote": "representative quote or null", "opportunity": "how your product can exploit this gap" }
  ],
  "topPraise": [
    { "praise": "what users love about competitor", "implication": "what you need to match or differentiate from" }
  ],
  "emergingThemes": ["key trends or topics appearing in discussion"],
  "battleCardUpdates": ["specific talking points to add to your battle card"],
  "earlyWarning": "any signals suggesting competitor is changing strategy, losing customers, or gaining momentum — null if none",
  "recommendedAction": "single most important action to take based on this intelligence",
  "mentionCount": ${searchResults.length}
}

Base your analysis ONLY on what's in the search results. Don't fabricate specifics.`,
        },
        {
          role: 'user',
          content: `Competitors to monitor: ${allCompetitorNames}
${topics ? `Focus topics: ${topics.join(', ')}` : ''}

Social/forum mentions found:
${mentionContext}

${trackedAlerts && trackedAlerts.length > 0 ? `\nPreviously tracked alerts:\n${trackedAlerts.slice(0, 5).map(a => a.description).join('\n')}` : ''}`,
        },
      ],
      { maxTokens: 700, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : {} } catch { analysis = {} } }

    // Store top mentions as activities
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'atlas',
      action_type: 'social_listening_run',
      description: `Social listening: ${allCompetitorNames} — ${searchResults.length} mentions found`,
      metadata:    { competitors, mentionCount: searchResults.length, overallSentiment: analysis.overallSentiment },
    }).then(() => {})

    return NextResponse.json({
      analysis,
      mentions: searchResults.slice(0, 12),
      competitors,
    })
  } catch (err) {
    console.error('Atlas social POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
