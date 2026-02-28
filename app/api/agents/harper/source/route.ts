import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/source
// Active candidate sourcing: searches GitHub, LinkedIn, AngelList via Tavily
// for profiles that match a given role + skill requirements.
// Returns top candidates with reasoning and profile links.

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
    const { roleName, skills, location, remoteOk, seniority, companyStage } = body as {
      roleName: string
      skills?: string[]
      location?: string
      remoteOk?: boolean
      seniority?: string    // 'junior' | 'mid' | 'senior' | 'lead'
      companyStage?: string // 'seed' | 'series-a' | 'startup'
    }

    if (!roleName) return NextResponse.json({ error: 'roleName is required' }, { status: 400 })

    const admin = getAdmin()
    const tavilyKey = process.env.TAVILY_API_KEY

    const skillStr = skills?.length ? skills.join(', ') : roleName
    const locationStr = location && !remoteOk ? location : 'remote'

    const searchResults: { title: string; url: string; content: string }[] = []

    // Run 3 parallel Tavily searches for different platforms
    const queries = [
      `${roleName} engineer startup open to work GitHub portfolio ${skillStr}`,
      `${roleName} ${skillStr} ${locationStr} AngelList profile looking for job startup`,
      `site:linkedin.com/in ${roleName} ${skillStr} ${seniority ?? 'senior'} startup`,
    ]

    if (tavilyKey) {
      await Promise.all(
        queries.map(async query => {
          try {
            const res = await fetch('https://api.tavily.com/search', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                api_key: tavilyKey,
                query,
                max_results: 4,
                search_depth: 'basic',
              }),
            })
            if (res.ok) {
              const data = await res.json()
              const results = (data.results ?? []).slice(0, 3) as { title: string; url: string; content: string }[]
              searchResults.push(...results)
            }
          } catch { /* non-fatal */ }
        })
      )
    }

    // Deduplicate by URL
    const seen = new Set<string>()
    const unique = searchResults.filter(r => {
      if (seen.has(r.url)) return false
      seen.add(r.url)
      return true
    })

    const searchContext = unique
      .slice(0, 10)
      .map(r => `URL: ${r.url}\nTitle: ${r.title}\nSnippet: ${r.content?.slice(0, 250)}`)
      .join('\n\n---\n\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Harper, a startup recruiter. Analyse web search results to identify potential candidates for a role.
From the search snippets, extract and evaluate the most promising candidate profiles.

Return ONLY valid JSON:
{
  "candidates": [
    {
      "name": "candidate name or 'Unknown' if not found",
      "profileUrl": "URL to their GitHub/LinkedIn/portfolio",
      "platform": "GitHub|LinkedIn|AngelList|Portfolio|Other",
      "matchScore": 0-100,
      "skills": ["list of relevant skills spotted"],
      "summary": "1-2 sentences on why they might be a good fit",
      "outreachAngle": "1 sentence — personalised angle to use in a cold message to this candidate"
    }
  ],
  "searchSummary": "1-2 sentences on the overall talent landscape found",
  "recommendedChannels": ["best platforms to source ${roleName || 'this role'} candidates"]
}

Rules:
- Only include results that look like real candidate profiles (GitHub profiles, LinkedIn pages, portfolios)
- Skip company pages, job boards, articles, or generic results
- Score match based on: skill overlap, seniority signals, startup experience
- If fewer than 3 real profiles found, still return what you have but be honest in searchSummary`,
        },
        {
          role: 'user',
          content: `Role: ${roleName}\nRequired skills: ${skillStr}\nSeniority: ${seniority ?? 'not specified'}\nLocation: ${locationStr}\nCompany stage: ${companyStage ?? 'early-stage startup'}\n\nSearch results:\n${searchContext || 'No results returned — Tavily key may not be configured.'}`,
        },
      ],
      { maxTokens: 900, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(clean)
    } catch {
      const m = clean.match(/\{[\s\S]*\}/)
      try { parsed = m ? JSON.parse(m[0]) : {} } catch { parsed = {} }
    }

    // Log activity
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'harper',
      action_type: 'candidates_sourced',
      description: `Active sourcing run for ${roleName} — ${(parsed.candidates as unknown[])?.length ?? 0} candidates found`,
      metadata:    { roleName, skills, seniority, location },
    })

    return NextResponse.json({ sourced: parsed, searchedPlatforms: queries.length })
  } catch (err) {
    console.error('Harper source error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
