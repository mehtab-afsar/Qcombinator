import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { log } from '@/lib/logger'
import { callClaude } from '@/lib/claude'

// GET /api/qscore/priority
// Returns AI-generated top 3 priorities for the founder to work on TODAY.
// Pulls live data: Q-Score breakdown, recent agent activity, pipeline health, runway.
// Results are cached for 6 hours in the qscore_history table's ai_actions column.

export async function GET() {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth
    const supabase = await createClient()

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
        .select('startup_name, industry, stage, weekly_goal, weekly_metric_value, customer_calls_count')
        .eq('user_id', user.id)
        .single(),
      supabase
        .from('qscore_history')
        .select('id, overall_score, p1_score, p2_score, p3_score, p4_score, p5_score, p6_score, ai_actions, calculated_at')
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

    // ── Rule-based priorities for new / unscored users ───────────────────────
    // Never call the LLM when the founder has no meaningful score data —
    // all-zero dimension scores produce generic, unhelpful AI output.
    const overallScore = latestScore?.overall_score ?? 0
    const hasArtifacts = (artifacts ?? []).length > 0
    const hasActivity  = (recentActivity ?? []).length > 0
    const usedAgents   = [...new Set((recentActivity ?? []).map(a => a.agent_id))].filter(Boolean)

    if (!latestScore || overallScore < 15) {
      const stage = profile?.stage ?? ''
      const weeklyGoal  = (profile as Record<string, unknown>)?.weekly_goal as string | null ?? null
      const onboardingPriorities = []

      // Priority 1 — always: if no weekly goal set, set one
      if (!weeklyGoal) {
        onboardingPriorities.push({
          title: 'Set your #1 goal for this week',
          why: 'YC founders who state a specific weekly goal are 3× more likely to hit it. Start every week with one concrete target — a number, a meeting, a shipped feature.',
          action: 'Open your dashboard, click "Set this week\'s goal", and write one sentence with a measurable outcome.',
          agentId: undefined,
          urgency: 'high' as const,
        })
      }

      // Priority 2 — complete profile builder (get a score)
      onboardingPriorities.push({
        title: 'Complete the Profile Builder to get your Q-Score',
        why: `Without a Q-Score, recommendations stay generic. ${hasArtifacts || hasActivity ? 'You\'ve started — finish all 5 sections.' : 'It takes 10–15 min and unlocks investor visibility.'}`,
        action: 'Open Profile Builder → upload your pitch deck → answer all 5 sections → click Submit.',
        agentId: undefined,
        urgency: weeklyGoal ? 'high' : 'medium' as const,
      })

      // Priority 3 — recommend a behavior (not a document) based on stage
      const stageBehavior: Record<string, { id: string; name: string; behavior: string }> = {
        idea:       { id: 'patel',  name: 'Patel',  behavior: 'do 10 customer discovery calls — no selling, only listening' },
        mvp:        { id: 'nova',   name: 'Nova',   behavior: 'put your MVP in front of 5 real users this week and capture their feedback' },
        'pre-seed': { id: 'patel',  name: 'Patel',  behavior: 'get 3 signed LOIs or verbal commitments from potential customers' },
        seed:       { id: 'felix',  name: 'Felix',  behavior: 'nail your unit economics: make sure LTV:CAC > 3:1 before scaling spend' },
      }
      const rec = stageBehavior[stage] ?? { id: 'atlas', name: 'Atlas', behavior: 'run a competitive scan to find the 3 players you must beat' }

      if (!usedAgents.includes(rec.id)) {
        onboardingPriorities.push({
          title: `This week: ${rec.behavior.split(' ').slice(0, 6).join(' ')}…`,
          why: `YC's #1 advice for ${stage || 'early'}-stage founders: ${rec.behavior}. ${rec.name} can help you prepare and structure this.`,
          action: `Open ${rec.name} in the CXO Hub → explain your current stage → let them help you execute: ${rec.behavior}.`,
          agentId: rec.id,
          urgency: 'medium' as const,
        })
      }

      return NextResponse.json({
        priorities: onboardingPriorities.slice(0, 3),
        cached: false,
        generatedAt: new Date().toISOString(),
      })
    }

    // Build context snapshot for the LLM
    const scores = latestScore ?? {}
    const dimScores = {
      'Market Readiness':   (scores as Record<string, number>).p1_score ?? 0,
      'Market Potential':   (scores as Record<string, number>).p2_score ?? 0,
      'IP & Defensibility': (scores as Record<string, number>).p3_score ?? 0,
      'Founder & Team':     (scores as Record<string, number>).p4_score ?? 0,
      'Structural Impact':  (scores as Record<string, number>).p5_score ?? 0,
      'Financials':         (scores as Record<string, number>).p6_score ?? 0,
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

    const weeklyGoalCtx    = (profile as Record<string, unknown>)?.weekly_goal as string | null ?? null
    const weeklyMetricCtx  = (profile as Record<string, unknown>)?.weekly_metric_value as string | null ?? null
    const callsThisWeek    = ((profile as Record<string, unknown>)?.customer_calls_count as number | null) ?? 0

    const contextBlock = `
Founder: ${profile?.startup_name ?? 'Startup'} | Industry: ${profile?.industry ?? 'Unknown'} | Stage: ${profile?.stage ?? 'Unknown'}
Q-Score: ${overall}/100
Dimension scores: ${JSON.stringify(dimScores)}
3 lowest-scoring dimensions: ${lowestDims.join(', ')}
${weeklyGoalCtx ? `This week's stated goal: "${weeklyGoalCtx}"` : 'Weekly goal: not set yet'}
${weeklyMetricCtx ? `Primary metric: ${weeklyMetricCtx}` : ''}
Customer calls this week: ${callsThisWeek}
Completed deliverables: ${[...completedArtifactTypes].join(', ') || 'none'}
Active agents this week: ${recentAgents.join(', ') || 'none'}
Agent actions in last 24h: ${activityLast24h}
${overdueDeal ? `⚠️ Overdue deal: "${overdueDeal.contact_name}" has a past-due follow-up action` : ''}
`.trim()

    const AGENT_MAP: Record<string, string> = {
      'Market Readiness':   'patel',
      'Market Potential':   'atlas',
      'IP & Defensibility': 'nova',
      'Founder & Team':     'harper',
      'Structural Impact':  'sage',
      'Financials':         'felix',
    }

    const raw = await callClaude(
      [
        {
          role: 'system',
          content: `You are a YC-style startup advisor — direct, data-driven, focused on behaviors not documents.

Given the founder's current state, identify the 3 most impactful things they should DO TODAY. Not documents to generate — behaviors to execute.

Return ONLY valid JSON (no markdown):
{
  "priorities": [
    {
      "title": "behavior-centric action (max 8 words, starts with a verb)",
      "why": "one sentence linking this behavior to a business outcome",
      "action": "specific first step the founder can take in the next hour",
      "agentId": "which agent helps most: patel|susi|felix|leo|harper|nova|atlas|sage (optional)",
      "urgency": "high|medium|low"
    }
  ]
}

Rules:
- If the founder has a stated weekly goal, ALL 3 priorities must help them hit that goal
- If customer_calls_count is 0 and stage is idea/mvp, ALWAYS include "Talk to 3 customers today" as a priority
- If there's an overdue deal, that's always priority #1
- Focus on the lowest-scoring dimensions — but frame the fix as a behavior ("Get 3 LOIs" not "Build pipeline document")
- The agent is the HELPER, not the deliverable — say "Patel can help you structure your ICP calls" not "Build ICP with Patel"
- urgency: high = founder should do this in the next 4 hours, medium = this week, low = important but not urgent`,
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

    // Cache in ai_actions on the specific latest qscore_history row (by id)
    if (latestScore && (latestScore as Record<string, unknown>).id) {
      const existingActions = (latestScore.ai_actions as Record<string, unknown>) ?? {}
      supabase
        .from('qscore_history')
        .update({ ai_actions: { ...existingActions, daily_priority: { priorities, generatedAt } } })
        .eq('id', (latestScore as Record<string, unknown>).id)
        .then(() => {}) // fire-and-forget
    }

    return NextResponse.json({ priorities, cached: false, generatedAt })
  } catch (err) {
    log.error('GET /api/qscore/priority', { err })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
