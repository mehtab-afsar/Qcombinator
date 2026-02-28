import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/blog-post
// Body: { topic, artifactId? }
// Generates a brand-voice blog post using the founder's brand messaging artifact
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { topic, artifactId } = await request.json()
    if (!topic || typeof topic !== 'string' || topic.trim().length < 5) {
      return NextResponse.json({ error: 'topic is required (min 5 chars)' }, { status: 400 })
    }

    // Fetch brand messaging artifact for voice context
    let brandContext = ''
    if (artifactId) {
      const { data: artifact } = await supabase
        .from('agent_artifacts')
        .select('content, title')
        .eq('id', artifactId)
        .eq('user_id', user.id)
        .single()

      if (artifact?.content) {
        const c = artifact.content as Record<string, unknown>
        brandContext = `
Brand Positioning: ${c.positioningStatement ?? ''}
Taglines: ${Array.isArray(c.taglines) ? c.taglines.map((t: { tagline?: string }) => t.tagline).join(', ') : ''}
Elevator Pitch: ${(c.elevatorPitch as { oneLiner?: string } | undefined)?.oneLiner ?? ''}
Brand Voice personality: ${Array.isArray((c.voiceGuide as { personality?: string[] } | undefined)?.personality) ? ((c.voiceGuide as { personality?: string[] }).personality ?? []).join(', ') : ''}
Do say: ${Array.isArray((c.voiceGuide as { doSay?: string[] } | undefined)?.doSay) ? ((c.voiceGuide as { doSay?: string[] }).doSay ?? []).join(' | ') : ''}
Don't say: ${Array.isArray((c.voiceGuide as { dontSay?: string[] } | undefined)?.dontSay) ? ((c.voiceGuide as { dontSay?: string[] }).dontSay ?? []).join(' | ') : ''}
`.trim()
      }
    }

    const systemPrompt = `You are a world-class content writer for early-stage startups. Write a compelling, opinionated blog post that sounds authentically human — not corporate AI slop.

${brandContext ? `BRAND CONTEXT (write in this voice):\n${brandContext}\n\n` : ''}Style guide:
- Hook readers in the first sentence with a bold claim or surprising stat
- Use short paragraphs (2-3 sentences max)
- Include at least 1 real-world analogy or story
- End with a clear point of view takeaway
- No fluff, no "In conclusion", no generic advice
- Length: 600-900 words

Return ONLY the blog post content as clean HTML (no <html>/<head>/<body> wrapper tags). Use these HTML tags only: <h1>, <h2>, <p>, <ul>, <li>, <strong>, <em>, <blockquote>. Start with the <h1> title tag.`

    const html = (await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Write a blog post about: ${topic.trim()}` },
      ],
      { maxTokens: 1800, temperature: 0.75 },
    )).trim()

    if (!html) {
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 500 })
    }

    // Log to agent_activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'maya',
        action_type: 'blog_post_generated',
        metadata: { topic, artifactId, wordCount: html.split(/\s+/).length },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ html, topic })
  } catch (err) {
    console.error('Maya blog post error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
