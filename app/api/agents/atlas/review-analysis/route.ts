import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/review-analysis
// Body: { competitorName, reviews: string (paste of G2/Capterra/TrustPilot reviews) }
// Uses OpenRouter to cluster reviews into: top complaints, top praise, feature gaps, sales angles

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { competitorName, reviews } = await request.json()
    if (!competitorName || !reviews || reviews.trim().length < 50) {
      return NextResponse.json({ error: 'competitorName and reviews (min 50 chars) are required' }, { status: 400 })
    }

    const systemPrompt = `You are a competitive intelligence analyst. Analyze customer reviews of a competitor and extract actionable intelligence for a startup that competes with them.

Focus on:
1. Top complaints — what do customers hate most? (be specific, use actual quoted phrases where possible)
2. Top praise — what do customers love? (know this to understand what NOT to undermine)
3. Feature gaps — missing features, frequent feature requests
4. Sales angles — how can a competitor use these weaknesses in sales conversations?

Return ONLY valid JSON (no markdown fences):
{
  "competitorName": "...",
  "reviewCount": <number or null if unclear>,
  "topComplaints": [
    { "complaint": "...", "frequency": "high|medium|low", "quote": "actual quote or null", "salesAngle": "How to use this in a demo/sales call" }
  ],
  "topPraise": [
    { "praise": "...", "implication": "What this means for a competitor's pitch" }
  ],
  "featureGaps": [
    { "feature": "...", "evidence": "...", "opportunity": "..." }
  ],
  "battleCardSummary": "3-4 sentence executive summary for a sales battle card",
  "keyQuote": "The single most damning quote from the reviews (if any)"
}`

    const raw = await callOpenRouter(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Competitor: ${competitorName}\n\nReviews:\n${reviews.slice(0, 8000)}` },
      ],
      { maxTokens: 1500, temperature: 0.3 },
    )
    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()

    let analysis
    try {
      analysis = JSON.parse(clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI analysis' }, { status: 500 })
    }

    // Log
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'atlas',
        action_type: 'review_analysis',
        description: `Competitor review analysis: ${competitorName}`,
        metadata: { competitorName, complaintCount: analysis.topComplaints?.length, gapCount: analysis.featureGaps?.length },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('Atlas review analysis error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
