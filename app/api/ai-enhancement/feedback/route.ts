import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/ai-enhancement/feedback
// Body: { question, category, answer, dimensionScore? }
// Returns: { rating, headline, strengths[], gaps[], suggestion, rewrittenOpener? }

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { question, category, answer, dimensionScore } = await request.json() as {
      question: string
      category: string
      answer: string
      dimensionScore?: number
    }

    if (!question || !answer?.trim()) {
      return NextResponse.json({ error: 'question and answer are required' }, { status: 400 })
    }

    const wordCount = answer.trim().split(/\s+/).length
    const scoreContext = dimensionScore !== undefined
      ? `The founder's current ${category} score is ${dimensionScore}/100.`
      : ''

    const prompt = `You are a seasoned venture capitalist conducting a Series A partner meeting. A founder just answered this question:

Question: "${question}"
Category: ${category}
${scoreContext}

Founder's answer (${wordCount} words):
"${answer}"

Evaluate their answer like a real VC would. Be direct and specific — not generic. Identify exactly what's missing or weak.

Return ONLY valid JSON with this exact shape:
{
  "rating": "strong|good|weak|needs-work",
  "score": 1-10,
  "headline": "One punchy sentence summarising the overall quality",
  "strengths": ["specific strength 1", "specific strength 2"],
  "gaps": ["specific gap 1", "specific gap 2"],
  "suggestion": "One concrete, actionable thing to do differently",
  "rewrittenOpener": "How a strong answer to this question should START (2-3 sentences max)"
}`

    const raw = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 600, temperature: 0.4 },
    )

    let parsed: {
      rating: string
      score: number
      headline: string
      strengths: string[]
      gaps: string[]
      suggestion: string
      rewrittenOpener?: string
    }
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(jsonMatch?.[0] ?? raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('AI enhancement feedback error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
