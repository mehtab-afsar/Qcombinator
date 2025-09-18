import { NextRequest, NextResponse } from 'next/server'
import { groqService } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      )
    }

    console.log('🧪 Testing multiple Groq models...')

    // Test different models with the same prompt
    const results = await groqService.testModels(prompt)

    return NextResponse.json({
      prompt,
      timestamp: new Date().toISOString(),
      results
    })
  } catch (error) {
    console.error('Model testing error:', error)
    return NextResponse.json(
      { error: 'Failed to test models' },
      { status: 500 }
    )
  }
}