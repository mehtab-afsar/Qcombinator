import { NextRequest, NextResponse } from 'next/server'
import { groqService } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { description } = body

    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Company description is required' },
        { status: 400 }
      )
    }

    console.log('⚡ Quick startup evaluation...')

    // Quick evaluation using fastest model
    const evaluation = await groqService.quickEvaluate(description)

    return NextResponse.json(evaluation)
  } catch (error) {
    console.error('Quick evaluation error:', error)
    return NextResponse.json({
      score: 6,
      verdict: "Need more information to make proper assessment",
      keyInsights: ["Market analysis needed", "Team background unclear", "Revenue model undefined"]
    })
  }
}