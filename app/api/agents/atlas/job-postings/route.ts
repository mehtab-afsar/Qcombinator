import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/atlas/job-postings
// Body: { competitorName, jobListings }
// Parses pasted job titles/listings and extracts strategic hiring signals
// e.g. "5 ML engineers → building AI product layer", "3 enterprise sales roles → moving upmarket"

interface HiringSignal {
  pattern: string          // e.g. "AI / ML hiring surge"
  roles: string[]          // e.g. ["ML Engineer", "AI Research Lead"]
  count: number
  inference: string        // strategic implication for your startup
  urgency: 'high' | 'medium' | 'low'
}

interface JobAnalysis {
  competitor: string
  totalRoles: number
  signals: HiringSignal[]
  strategicSummary: string
  recommendedActions: string[]
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { competitorName, jobListings } = await request.json()
    if (!competitorName || typeof competitorName !== 'string') {
      return NextResponse.json({ error: 'competitorName is required' }, { status: 400 })
    }
    if (!jobListings || typeof jobListings !== 'string' || jobListings.trim().length < 10) {
      return NextResponse.json({ error: 'jobListings must be at least 10 characters' }, { status: 400 })
    }

    const prompt = `You are a competitive intelligence analyst. Analyze the following job postings from "${competitorName}" and extract strategic hiring signals that a competing startup should pay attention to.

Job Listings:
${jobListings.slice(0, 4000)}

Return ONLY valid JSON in this exact shape:
{
  "competitor": "${competitorName}",
  "totalRoles": <number of distinct roles detected>,
  "signals": [
    {
      "pattern": "<descriptive pattern name, e.g. 'AI/ML investment surge'>",
      "roles": ["<role title 1>", "<role title 2>"],
      "count": <number>,
      "inference": "<strategic implication — what does this hiring pattern reveal about their product direction or market strategy?>",
      "urgency": "high" | "medium" | "low"
    }
  ],
  "strategicSummary": "<2-3 sentence executive summary of what this competitor is building/doing based on hiring>",
  "recommendedActions": ["<action 1 for competing startup>", "<action 2>", "<action 3>"]
}

Group roles into meaningful patterns (AI/ML, enterprise sales, infra, product, design, etc.). Mark urgency as high if 3+ roles in the same area (signals major investment), medium for 1-2 focused roles, low for scattered individual hires. Be specific and actionable.`

    const raw = await callOpenRouter(
      [{ role: 'user', content: prompt }],
      { maxTokens: 800, temperature: 0.3 },
    )

    let analysis: JobAnalysis
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : raw)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'atlas',
        action_type: 'job_signal_analysis',
        description: `Job hiring analysis for ${competitorName} — ${analysis.signals?.length ?? 0} signals found`,
        metadata: { competitor: competitorName, totalRoles: analysis.totalRoles, signalCount: analysis.signals?.length },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('Atlas job postings error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
