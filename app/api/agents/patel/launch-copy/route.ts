import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/launch-copy
// Generates ready-to-paste copy for:
//   - Product Hunt tagline (60 chars), full description (260 chars), first comment
//   - Hacker News Show HN post (title + first paragraph)
//   - BetaList description (150 chars)
//   - Reddit r/startups intro post
//   - Twitter/X launch announcement (280 chars)
//
// Body: { startupName, tagline, problem, solution, targetUser, website? }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { startupName, tagline, problem, solution, targetUser, website } = body as {
      startupName: string
      tagline?: string
      problem: string
      solution: string
      targetUser: string
      website?: string
    }

    if (!startupName || !problem || !solution || !targetUser) {
      return NextResponse.json({ error: 'startupName, problem, solution, targetUser are required' }, { status: 400 })
    }

    const context = `
Startup: ${startupName}
Tagline: ${tagline || '(not provided)'}
Problem: ${problem}
Solution: ${solution}
Target user: ${targetUser}
${website ? `Website: ${website}` : ''}`.trim()

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are a world-class growth marketer who writes compelling launch copy.
Return ONLY valid JSON (no markdown fences):
{
  "productHunt": {
    "tagline": "max 60 chars — punchy, action-oriented, no buzzwords",
    "description": "max 260 chars — what it does + who it's for + key differentiator",
    "firstComment": "3-4 sentences — founder story of why you built this, honest and human"
  },
  "hackerNews": {
    "title": "Show HN: [Startup name] – [one-line description] (max 80 chars)",
    "body": "2 paragraphs — what you built and why, written like a HN post (no marketing speak, technical and direct)"
  },
  "betaList": {
    "description": "max 150 chars — what the product does, who it's for"
  },
  "twitter": {
    "announcement": "max 280 chars — launch tweet with 1 hook line, 2-3 bullets or key facts, CTA"
  },
  "redditIntro": {
    "title": "Launched [Startup] — [what it solves]",
    "body": "3-4 paragraphs — authentic founder post: problem background, what you built, current traction/status, call for feedback"
  }
}`,
        },
        { role: 'user', content: `Generate launch copy for:\n${context}` },
      ],
      { maxTokens: 1200, temperature: 0.6 }
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
    await supabase.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'patel',
      action_type: 'launch_copy_generated',
      description: `Launch copy generated for ${startupName} — 5 platforms`,
      metadata:    { startupName },
    }).then(() => {})

    return NextResponse.json({ copy: parsed, startupName })
  } catch (err) {
    console.error('Launch copy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
