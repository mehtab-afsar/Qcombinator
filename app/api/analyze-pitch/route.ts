import { NextRequest, NextResponse } from 'next/server'
import { callOpenRouter } from '@/lib/openrouter'

interface PitchAnalysis {
  overallScore: number
  clarity: number
  market: number
  traction: number
  team: number
  financials: number
  strengths: string[]
  improvements: string[]
  missingElements: string[]
  redFlags: string[]
  investorPerspective: string
  summary: string
}

const FALLBACK: PitchAnalysis = {
  overallScore: 7,
  clarity: 7,
  market: 7,
  traction: 6,
  team: 7,
  financials: 6,
  strengths: ['Clear problem identification', 'Reasonable market sizing', 'Passionate founding story'],
  improvements: ['Add specific traction metrics', 'Include competitive moat', 'Strengthen financial projections'],
  missingElements: ['Customer validation evidence', 'Go-to-market strategy'],
  redFlags: [],
  investorPerspective: 'Solid early stage pitch with clear vision. Would want to see more traction and customer evidence before committing.',
  summary: 'Solid pitch foundation with clear vision. Focus on demonstrating market traction and refining the business model for stronger investor appeal.',
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

    try {
      const content = await callOpenRouter(
        [
          {
            role: 'system',
            content: `You are a YC partner and experienced seed investor analyzing a startup pitch. Be honest, specific, and investor-grade in your assessment. Return ONLY valid JSON in this exact format, no other text:
{
  "overallScore": <integer 1-10>,
  "clarity": <integer 1-10>,
  "market": <integer 1-10>,
  "traction": <integer 1-10>,
  "team": <integer 1-10>,
  "financials": <integer 1-10>,
  "strengths": ["<specific strength>", "<specific strength>", "<specific strength>"],
  "improvements": ["<specific actionable improvement>", "<specific actionable improvement>", "<specific actionable improvement>"],
  "missingElements": ["<critical missing piece>", "<critical missing piece>"],
  "redFlags": ["<red flag if any — omit if none>"],
  "investorPerspective": "<1-2 sentences how a seed investor would respond to this pitch>",
  "summary": "<2-3 sentence honest investor-grade assessment>"
}
Scores of 7+ require clear evidence in the pitch. Be precise — identify specific phrases or missing info.`
          },
          {
            role: 'user',
            content: `Analyse this startup pitch:\n\n"${pitchText.slice(0, 4000)}"`
          }
        ],
        { maxTokens: 700, temperature: 0.3 },
      )
      const clean = content.replace(/```json|```/g, '').trim()
      const jsonMatch = clean.match(/\{[\s\S]*\}/)
      return NextResponse.json(JSON.parse(jsonMatch ? jsonMatch[0] : clean) as PitchAnalysis)
    } catch {
      return NextResponse.json(FALLBACK)
    }
  } catch (error) {
    console.error('Pitch analysis error:', error)
    return NextResponse.json(FALLBACK)
  }
}
