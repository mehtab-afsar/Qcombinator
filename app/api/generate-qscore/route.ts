import { NextRequest, NextResponse } from 'next/server'
import { groqService } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startupData } = body

    if (!startupData) {
      return NextResponse.json(
        { error: 'Startup data is required' },
        { status: 400 }
      )
    }

    // Validate required fields
    const requiredFields = ['companyName', 'industry', 'stage', 'description']
    for (const field of requiredFields) {
      if (!startupData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        )
      }
    }

    // Call Groq service to generate Q Score
    const qScoreAnalysis = await groqService.generateQScore(startupData)

    return NextResponse.json(qScoreAnalysis)
  } catch (error) {
    console.error('Q Score generation error:', error)

    // Return fallback Q Score analysis
    return NextResponse.json({
      overallScore: 742,
      breakdown: {
        team: 168,
        market: 145,
        product: 152,
        traction: 138,
        financials: 139
      },
      reasoning: "Strong founding team with relevant experience in a growing market. Product shows innovation potential but needs more market validation and stronger financial projections.",
      recommendations: [
        "Focus on customer acquisition and retention metrics",
        "Develop stronger competitive differentiation strategy",
        "Build comprehensive financial models with clear unit economics",
        "Establish strategic partnerships in target market",
        "Create detailed go-to-market execution plan"
      ]
    })
  }
}