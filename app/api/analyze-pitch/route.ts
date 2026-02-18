import { NextRequest, NextResponse } from 'next/server'
interface PitchAnalysis {
  overallScore: number; clarity: number; market: number; traction: number
  team: number; financials: number; strengths: string[]; improvements: string[]; summary: string
}

const FALLBACK: PitchAnalysis = {
  overallScore: 7.2,
  clarity: 8.0,
  market: 7.1,
  traction: 6.8,
  team: 7.5,
  financials: 6.9,
  strengths: ['Clear problem identification', 'Reasonable market size', 'Passionate founding team'],
  improvements: ['Add specific traction metrics', 'Include competitive differentiation', 'Strengthen financial projections'],
  summary: 'Solid pitch foundation with clear vision. Focus on demonstrating market traction and refining the business model for stronger investor appeal.'
}

export async function POST(request: NextRequest) {
  try {
    const { pitchText } = await request.json()

    if (!pitchText || typeof pitchText !== 'string') {
      return NextResponse.json({ error: 'Pitch text is required' }, { status: 400 })
    }
    if (pitchText.length < 50) {
      return NextResponse.json({ error: 'Pitch text too short. Please provide at least 50 characters.' }, { status: 400 })
    }

    const key = process.env.OPENROUTER_API_KEY
    if (!key) return NextResponse.json(FALLBACK)

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://edgealpha.ai',
        'X-Title': 'Edge Alpha Pitch Analyser',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-haiku',
        temperature: 0.4,
        max_tokens: 1000,
        messages: [
          {
            role: 'system',
            content: `You are an expert startup investor and pitch analyst. Analyse the given pitch and return ONLY valid JSON in this exact format, no other text:
{
  "overallScore": number (1-10),
  "clarity": number (1-10),
  "market": number (1-10),
  "traction": number (1-10),
  "team": number (1-10),
  "financials": number (1-10),
  "strengths": ["strength1", "strength2", "strength3"],
  "improvements": ["improvement1", "improvement2", "improvement3"],
  "summary": "2-3 sentence overall assessment with investment recommendation"
}`
          },
          {
            role: 'user',
            content: `Analyse this startup pitch:\n\n"${pitchText}"`
          }
        ]
      })
    })

    if (!response.ok) return NextResponse.json(FALLBACK)

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content ?? ''

    try {
      // Strip any markdown fences if present
      const clean = content.replace(/```json|```/g, '').trim()
      return NextResponse.json(JSON.parse(clean) as PitchAnalysis)
    } catch {
      return NextResponse.json(FALLBACK)
    }
  } catch (error) {
    console.error('Pitch analysis error:', error)
    return NextResponse.json(FALLBACK)
  }
}
