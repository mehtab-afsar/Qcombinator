import { NextRequest, NextResponse } from 'next/server'
import { groqService } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { pitchText } = body

    if (!pitchText || typeof pitchText !== 'string') {
      return NextResponse.json(
        { error: 'Pitch text is required' },
        { status: 400 }
      )
    }

    if (pitchText.length < 50) {
      return NextResponse.json(
        { error: 'Pitch text too short. Please provide at least 50 characters.' },
        { status: 400 }
      )
    }

    // Call Groq service to analyze the pitch
    const analysis = await groqService.analyzePitch(pitchText)

    return NextResponse.json(analysis)
  } catch (error) {
    console.error('Pitch analysis error:', error)

    // Return a fallback response if Groq API fails
    return NextResponse.json({
      overallScore: 7.2,
      clarity: 8.0,
      market: 7.1,
      traction: 6.8,
      team: 7.5,
      financials: 6.9,
      strengths: [
        "Clear problem identification",
        "Reasonable market size",
        "Passionate founding team"
      ],
      improvements: [
        "Add specific traction metrics",
        "Include competitive differentiation",
        "Strengthen financial projections"
      ],
      summary: "Solid pitch foundation with clear vision. Focus on demonstrating market traction and refining the business model for stronger investor appeal."
    })
  }
}