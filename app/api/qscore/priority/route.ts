import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// GET /api/qscore/priority
// Returns AI-generated top 3 priorities for the founder to work on TODAY.
// Pulls live data: Q-Score breakdown, recent agent activity, pipeline health, runway.
// Results are cached for 6 hours in the qscore_history table's ai_actions column.

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const since24h  = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const since7d   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()

    // Fetch everything in parallel
    const [
      { data: profile },
      { data: latestScore },
      { data: recentActivity },
      { data: artifacts },
      { data: pipelineDeals },
    ] = await Promise.all([
      supabase
        .from('founder_profiles')
        .select('startup_name, industry, stage')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('qscore_history')
        .select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, ai_actions, calculated_at')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from('agent_activity')
        .select('agent_id, action_type, description, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since7d)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('agent_artifacts')
        .select('agent_id, artifact_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('deals')
        .select('stage, contact_name, next_action_date, updated_at')
        .eq('user_id', user.id)
        .limit(20),
    ])

    // Check if we have a fresh cached result (< 6 hours old)
    const cachedPriority = (latestScore?.ai_actions as Record<string, unknown> | null)?.daily_priority as {
      priorities: Array<{ title: string; why: string; action: string; agentId?: string; urgency: 'high' | 'medium' | 'low' }>
      generatedAt: string
    } | undefined

    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    if (cachedPriority?.generatedAt && cachedPriority.generatedAt > sixHoursAgo) {
      return NextResponse.json({ priorities: cachedPriority.priorities, cached: true, generatedAt: cachedPriority.generatedAt })
    }

    // Build context snapshot for the LLM
    const scores = latestScore ?? {}
    const dimScores = {
      market:    (scores as Record<string, number>).market_score    ?? 0,
      product:   (scores as Record<string, number>).product_score   ?? 0,
      gtm:       (scores as Record<string, number>).gtm_score       ?? 0,
      financial: (scores as Record<string, number>).financial_score ?? 0,
      team:      (scores as Record<string, number>).team_score      ?? 0,
      traction:  (scores as Record<string, number>).traction_score  ?? 0,
    }
    const overall = (scores as Record<string, number>).overall_score ?? 0

    const lowestDims = Object.entries(dimScores)
      .sort(([, a], [, b]) => a - b)
      .slice(0, 3)
      .map(([key, val]) => `${key}: ${val}`)

    const completedArtifactTypes = new Set((artifacts ?? []).map(a => a.artifact_type))
    const recentAgents = [...new Set((recentActivity ?? []).map(a => a.agent_id))].filter(Boolean)

    const overdueDeal = (pipelineDeals ?? []).find(d =>
      d.next_action_date && new Date(d.next_action_date) < new Date() && d.stage !== 'closed_won' && d.stage !== 'closed_lost'
    )

    const activityLast24h = (recentActivity ?? []).filter(a => a.created_at > since24h).length

    const contextBlock = `
Founder: ${profile?.startup_name ?? 'Startup'} | Industry: ${profile?.industry ?? 'Unknown'} | Stage: ${profile?.stage ?? 'Unknown'}
Q-Score: ${overall}/100
Dimension scores: ${JSON.stringify(dimScores)}
3 lowest-scoring dimensions: ${lowestDims.join(', ')}
Completed deliverables: ${[...completedArtifactTypes].join(', ') || 'none'}
Active agents this week: ${recentAgents.join(', ') || 'none'}
Agent actions in last 24h: ${activityLast24h}
${overdueDeal ? `⚠️ Overdue deal: "${overdueDeal.contact_name}" has a past-due follow-up action` : ''}
`.trim()

    const AGENT_MAP: Record<string, string> = {
      market: 'atlas', product: 'nova', gtm: 'patel',
      financial: 'felix', team: 'harper', traction: 'susi',
    }

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are an AI co-pilot for a startup founder. Given their current state, identify the 3 most impactful things they should work on TODAY.

Return ONLY valid JSON (no markdown):
{
  "priorities": [
    {
      "title": "short action title (max 8 words)",
      "why": "one sentence explaining the business impact",
      "action": "specific first step to take right now (one sentence)",
      "agentId": "which agent helps most: patel|susi|maya|felix|leo|harper|nova|atlas|sage (optional)",
      "urgency": "high|medium|low"
    }
  ]
}

Rules:
- Focus on the lowest-scoring dimensions first
- If there's an overdue deal, that's always priority #1
- Don't repeat what they've already done this week
- Be specific — not "improve GTM" but "Build your ICP document with Patel to define your top 3 customer segments"
- urgency: high = needs to happen today, medium = this week, low = but important`,
        },
        {
          role: 'user',
          content: `Here's my current state:\n${contextBlock}\n\nWhat should I work on today?`,
        },
      ],
      { maxTokens: 600, temperature: 0.4 }
    )

    // Parse LLM response
    const cleanRaw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let parsed: { priorities?: Array<{ title: string; why: string; action: string; agentId?: string; urgency: 'high' | 'medium' | 'low' }> }
    try {
      parsed = JSON.parse(cleanRaw)
    } catch {
      const match = cleanRaw.match(/\{[\s\S]*\}/)
      try { parsed = match ? JSON.parse(match[0]) : {} } catch { parsed = {} }
    }

    // Fallback if LLM fails — build from lowest dimensions
    const priorities = parsed.priorities?.length
      ? parsed.priorities.slice(0, 3)
      : Object.entries(dimScores)
          .sort(([, a], [, b]) => a - b)
          .slice(0, 3)
          .map(([dim]) => ({
            title: `Improve your ${dim} dimension`,
            why: `${dim} is your lowest-scoring area — raising it will boost your overall Q-Score significantly.`,
            action: `Open the ${dim === 'gtm' ? 'Patel' : AGENT_MAP[dim] ?? 'relevant agent'} agent and work on a deliverable.`,
            agentId: AGENT_MAP[dim],
            urgency: 'medium' as const,
          }))

    const generatedAt = new Date().toISOString()

    // Cache in ai_actions on latest qscore_history row
    if (latestScore) {
      const existingActions = (latestScore.ai_actions as Record<string, unknown>) ?? {}
      supabase
        .from('qscore_history')
        .update({ ai_actions: { ...existingActions, daily_priority: { priorities, generatedAt } } })
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .then(() => {}) // fire-and-forget
    }

    return NextResponse.json({ priorities, cached: false, generatedAt })
  } catch (err) {
    console.error('Priority API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
