import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/seo
// Body: { blogContent: string, targetAudience?: string, targetKeyword?: string }
// Uses Tavily to research relevant keywords + SERP landscape, then LLM generates full SEO optimization.
// Returns: { seo: { titleSuggestions[], metaDescription, primaryKeyword, secondaryKeywords[],
//   h1Suggestion, h2Suggestions[], contentGaps[], readabilityTips[], estimatedIntent,
//   wordCountAdvice, internalLinkOpportunities[], tldrSummary } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function tavilySearch(query: string): Promise<string> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return ''
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: key, query, search_depth: 'basic', max_results: 5 }),
    })
    const j = await res.json() as { results?: { title: string; content: string; url: string }[] }
    return (j.results ?? []).map(r => `• ${r.title}: ${r.content.slice(0, 150)}`).join('\n')
  } catch { return '' }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { blogContent?: string; targetAudience?: string; targetKeyword?: string }
    const { blogContent, targetAudience, targetKeyword } = body

    if (!blogContent?.trim()) {
      return NextResponse.json({ error: 'blogContent is required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Pull brand artifact for context
    const { data: brandArtifact } = await admin
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('agent_id', 'maya')
      .eq('artifact_type', 'brand_messaging')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const brandContext = brandArtifact?.content
      ? `Brand voice: ${String((brandArtifact.content as Record<string, unknown>).voiceAttributes ?? '')} | Audience: ${String((brandArtifact.content as Record<string, unknown>).targetAudience ?? '')}`
      : ''

    // Extract the approximate topic from first 300 chars
    const topicHint = blogContent.slice(0, 300)
    const keyword = targetKeyword ?? topicHint.split(' ').slice(0, 5).join(' ')

    // Tavily: SERP landscape + related questions
    const [serpData, questionData] = await Promise.all([
      tavilySearch(`${keyword} blog guide best practices 2025`),
      tavilySearch(`people also ask: ${keyword}`),
    ])

    const prompt = `You are an SEO content strategist. Analyze this blog post and generate comprehensive SEO recommendations.

BLOG CONTENT (first 1200 chars):
${blogContent.slice(0, 1200)}

TARGET AUDIENCE: ${targetAudience ?? 'startup founders and early-stage teams'}
${brandContext ? `BRAND CONTEXT: ${brandContext}` : ''}
TARGET KEYWORD HINT: ${keyword}

SERP LANDSCAPE:
${serpData || 'Not available'}

RELATED QUESTIONS:
${questionData || 'Not available'}

Return JSON only (no markdown):
{
  "primaryKeyword": "best keyword phrase to target",
  "secondaryKeywords": ["keyword 2", "keyword 3", "keyword 4", "keyword 5"],
  "titleSuggestions": ["Title Option 1 (under 60 chars)", "Title Option 2", "Title Option 3"],
  "metaDescription": "150-155 char meta description with primary keyword",
  "h1Suggestion": "optimized H1 tag",
  "h2Suggestions": ["Section heading 1", "Section heading 2", "Section heading 3", "Section heading 4"],
  "contentGaps": ["missing topic 1", "missing topic 2", "missing topic 3"],
  "readabilityTips": ["tip 1", "tip 2"],
  "estimatedIntent": "informational | navigational | transactional | commercial",
  "wordCountAdvice": "recommended word count and why",
  "internalLinkOpportunities": ["page type to link to", "another page type"],
  "tldrSummary": "one-sentence summary of the SEO opportunity"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let seo: Record<string, unknown> = {}
    try { seo = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to parse SEO recommendations' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'seo_optimized',
      action_data: { primaryKeyword: seo.primaryKeyword, contentGapCount: (seo.contentGaps as string[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ seo })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
