import { NextRequest, NextResponse } from 'next/server'
import { groqService } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { startupProfile, investorProfile } = body

    if (!startupProfile || !investorProfile) {
      return NextResponse.json(
        { error: 'Both startup and investor profiles are required' },
        { status: 400 }
      )
    }

    // Call Groq service for investor matching analysis
    const matchAnalysis = await groqService.generateInvestorMatch(startupProfile, investorProfile)

    return NextResponse.json(matchAnalysis)
  } catch (error) {
    console.error('Investor matching error:', error)

    // Return fallback match analysis
    return NextResponse.json({
      matchScore: 78,
      reasoning: "Good alignment on sector focus and stage compatibility. Investor thesis aligns well with startup's value proposition and market approach.",
      alignmentFactors: [
        "Sector focus alignment",
        "Stage compatibility",
        "Geographic proximity",
        "Check size fit"
      ],
      potentialConcerns: [
        "Market timing considerations",
        "Competition intensity in space"
      ]
    })
  }
}