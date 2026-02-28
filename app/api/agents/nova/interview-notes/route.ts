import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/nova/interview-notes
// Body: { notes: string, intervieweeName?: string, role?: string, artifactId?: string }
// Analyzes raw customer interview notes / transcripts and extracts structured insights:
// - Key themes (recurring topics)
// - Pain points with severity
// - Desired features (ranked by frequency)
// - Notable quotes
// - PMF signal tags

interface InsightRow {
  theme: string
  frequency: 'high' | 'medium' | 'low'
  quotes: string[]
  insight: string
}

interface FeatureRequest {
  feature: string
  mentions: number
  context: string
  priority: 'must-have' | 'nice-to-have' | 'delight'
}

interface PainPoint {
  pain: string
  severity: 'critical' | 'significant' | 'minor'
  currentWorkaround: string
  willingnessToPay: boolean
}

interface InterviewAnalysis {
  interviewee: string
  pmfSignal: 'strong' | 'moderate' | 'weak' | 'negative'
  pmfSummary: string
  themes: InsightRow[]
  painPoints: PainPoint[]
  featureRequests: FeatureRequest[]
  keyQuotes: { quote: string; type: 'pain' | 'praise' | 'feature-request' | 'objection' }[]
  buyingSignals: string[]
  redFlags: string[]
  nextSteps: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { notes, intervieweeName, role, artifactId } = await request.json()
    if (!notes || typeof notes !== 'string' || notes.trim().length < 30) {
      return NextResponse.json({ error: 'notes must be at least 30 characters' }, { status: 400 })
    }

    const intervieweeLabel = intervieweeName?.trim() || 'Customer'
    const roleLabel = role?.trim() || ''

    const prompt = `You are a product researcher analyzing a customer interview. Extract structured insights from the following notes.

Interviewee: ${intervieweeLabel}${roleLabel ? ` (${roleLabel})` : ''}

Interview Notes:
${notes.trim().slice(0, 5000)}

Return ONLY valid JSON in this exact shape:
{
  "interviewee": "${intervieweeLabel}",
  "pmfSignal": "strong" | "moderate" | "weak" | "negative",
  "pmfSummary": "<1-2 sentence PMF assessment — would this person be very disappointed if they couldn't use your product?>",
  "themes": [
    {
      "theme": "<theme name, e.g. 'Manual reporting pain'>",
      "frequency": "high" | "medium" | "low",
      "quotes": ["<exact or near-exact quote from notes>"],
      "insight": "<what this means for your product>"
    }
  ],
  "painPoints": [
    {
      "pain": "<specific pain they mentioned>",
      "severity": "critical" | "significant" | "minor",
      "currentWorkaround": "<how they solve it today>",
      "willingnessToPay": true | false
    }
  ],
  "featureRequests": [
    {
      "feature": "<requested feature>",
      "mentions": <number of times mentioned>,
      "context": "<why they want it>",
      "priority": "must-have" | "nice-to-have" | "delight"
    }
  ],
  "keyQuotes": [
    {
      "quote": "<verbatim or near-verbatim quote>",
      "type": "pain" | "praise" | "feature-request" | "objection"
    }
  ],
  "buyingSignals": ["<positive signal 1>", "<positive signal 2>"],
  "redFlags": ["<concern or red flag 1>"],
  "nextSteps": ["<follow-up action 1>", "<follow-up action 2>"]
}

Be specific and use direct language from the notes where possible. Identify 2-5 themes, 1-4 pain points, 1-4 feature requests, and 2-5 key quotes.`

    const raw = (await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 900, temperature: 0.3 },
    )).trim()

    let analysis: InterviewAnalysis
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Persist insights to DB so Nova can build a running pattern database
    // Upsert into agent_artifacts as a special "interview_insights" type
    try {
      await supabase.from('agent_artifacts').insert({
        user_id:       user.id,
        agent_id:      'nova',
        artifact_type: 'interview_insights',
        title:         `Interview: ${intervieweeLabel} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        content:       analysis,
      })
    } catch { /* non-critical */ }

    // Log activity
    try {
      const pmfEmoji = analysis.pmfSignal === 'strong' ? '🟢' : analysis.pmfSignal === 'moderate' ? '🟡' : analysis.pmfSignal === 'negative' ? '🔴' : '🟠'
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    'nova',
        action_type: 'interview_analyzed',
        description: `Interview with ${intervieweeLabel} analyzed — PMF signal: ${pmfEmoji} ${analysis.pmfSignal} · ${analysis.themes?.length ?? 0} themes · ${analysis.painPoints?.length ?? 0} pain points`,
        metadata:    { interviewee: intervieweeLabel, pmfSignal: analysis.pmfSignal, themeCount: analysis.themes?.length, painCount: analysis.painPoints?.length },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ analysis, artifactId })
  } catch (err) {
    console.error('Nova interview-notes error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agents/nova/interview-notes
// Returns all previous interview analyses for this founder
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data } = await supabase
      .from('agent_artifacts')
      .select('id, title, content, created_at')
      .eq('user_id', user.id)
      .eq('artifact_type', 'interview_insights')
      .order('created_at', { ascending: false })
      .limit(20)

    return NextResponse.json({ insights: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
