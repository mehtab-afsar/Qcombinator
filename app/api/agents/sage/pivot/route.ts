import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/pivot
// Sage monitors multiple startup health signals and evaluates whether a pivot
// conversation is warranted. Pulls from Q-Score, pipeline, surveys, and activity.
// Returns: { recommendation, signals, pivotScore, pivotOptions }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const _since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    // Pull all relevant signals in parallel
    const [
      { data: profile },
      { data: latestScore },
      { data: prevScore },
      { data: scoreHistory },
      { data: pipeline },
      { data: surveyArtifact },
      { data: financialArtifact },
      { data: recentActivity },
      { data: checkins },
    ] = await Promise.all([
      supabase.from('founder_profiles').select('startup_name, full_name, industry, stage').eq('user_id', user.id).single(),
      supabase.from('qscore_history').select('overall_score, market_score, product_score, gtm_score, traction_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).single(),
      supabase.from('qscore_history').select('overall_score').eq('user_id', user.id).lt('calculated_at', since30d).order('calculated_at', { ascending: false }).limit(1).single(),
      // Last 3 score snapshots for trend
      supabase.from('qscore_history').select('overall_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(5),
      admin.from('deals').select('stage, company, value, updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(20),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova').eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_activity').select('agent_id, action_type, created_at').eq('user_id', user.id).gte('created_at', since30d).limit(40),
      admin.from('agent_activity').select('metadata').eq('user_id', user.id).eq('agent_id', 'sage').eq('action_type', 'goal_checkin').order('created_at', { ascending: false }).limit(4),
    ])

    // Extract signals
    const currentScore  = (latestScore?.overall_score as number | undefined) ?? 0
    const prevScoreVal  = (prevScore?.overall_score as number | undefined) ?? currentScore
    const scoreTrend    = currentScore - prevScoreVal

    // Score trajectory — is it declining?
    const history = (scoreHistory ?? []) as { overall_score: number; calculated_at: string }[]
    const scoreDeclining = history.length >= 3 &&
      history[0].overall_score < history[1].overall_score &&
      history[1].overall_score < history[2].overall_score

    // Pipeline health
    const pipelineArr = pipeline ?? []
    const wonDeals = pipelineArr.filter(d => d.stage === 'won').length
    const lostDeals = pipelineArr.filter(d => d.stage === 'lost').length
    const totalClosed = wonDeals + lostDeals
    const winRate = totalClosed > 0 ? Math.round((wonDeals / totalClosed) * 100) : null

    // Stale pipeline
    const activeDeals = pipelineArr.filter(d => !['won', 'lost'].includes(d.stage))
    const staleActive = activeDeals.filter(d => {
      const ts = new Date(d.updated_at ?? '').getTime()
      return (Date.now() - ts) / 86400000 > 21 // 21 days
    }).length

    // PMF signals
    const pmfContent = (surveyArtifact?.content ?? {}) as Record<string, unknown>
    const nps = pmfContent.nps as number | undefined
    const pmfScore = pmfContent.pmfScore as number | undefined

    // Financial signals
    const finContent = (financialArtifact?.content ?? {}) as Record<string, unknown>
    const runway = finContent.runway as string | undefined
    const mrr = parseFloat(String(finContent.mrr ?? '0').replace(/[^0-9.]/g, '')) || 0
    const churnRate = finContent.churnRate as number | undefined

    // Agent engagement
    const actionCount = (recentActivity ?? []).length
    const agentsSinceMonth = new Set((recentActivity ?? []).map((a: { agent_id: string }) => a.agent_id)).size

    // Goal check-in momentum
    const recentCheckins = (checkins ?? []).slice(0, 3)
    const avgProgress = recentCheckins.length > 0
      ? Math.round(recentCheckins.reduce((s, c) => s + (((c.metadata as Record<string, unknown>)?.avgProgress as number) ?? 0), 0) / recentCheckins.length)
      : null

    // Compile signals for LLM
    const signalLines = [
      `Q-Score: ${currentScore}/100 (${scoreTrend >= 0 ? '+' : ''}${scoreTrend} vs 30 days ago)`,
      scoreDeclining ? 'Q-Score has declined 3 consecutive measurements' : '',
      winRate !== null ? `Sales win rate: ${winRate}% (${wonDeals}W/${lostDeals}L)` : 'No closed deals yet',
      activeDeals.length > 0 ? `Active pipeline: ${activeDeals.length} deals (${staleActive} stale >21 days)` : 'No active pipeline',
      nps !== undefined ? `NPS: ${nps}` : '',
      pmfScore !== undefined ? `PMF score: ${pmfScore}` : '',
      mrr > 0 ? `MRR: $${mrr.toLocaleString()}` : 'No revenue yet',
      churnRate !== undefined ? `Monthly churn: ${churnRate}%` : '',
      runway ? `Runway: ${runway}` : '',
      avgProgress !== null ? `OKR avg progress (last 3 check-ins): ${avgProgress}%` : '',
      `Agent engagement this month: ${actionCount} actions across ${agentsSinceMonth} agents`,
      `Stage: ${profile?.stage ?? 'unknown'} | Industry: ${profile?.industry ?? 'unknown'}`,
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a strategic advisor. Evaluate whether this startup should seriously consider a pivot based on their signals.

A pivot is not failure — it's strategic adaptation. Be honest but constructive.

Return ONLY valid JSON:
{
  "pivotScore": 0-100,
  "recommendation": "persevere | explore | pivot_now",
  "verdict": "2-3 sentence honest assessment of current trajectory",
  "redFlags": ["signals that indicate the current approach isn't working"],
  "greenLights": ["signals that suggest the core is working — don't throw away"],
  "pivotOptions": [
    {
      "type": "customer_pivot | problem_pivot | channel_pivot | technology_pivot | business_model_pivot",
      "description": "specific pivot direction to consider",
      "rationale": "why this might work based on current signals",
      "risk": "what you'd be giving up"
    }
  ],
  "persevereCase": "the strongest argument for staying the course",
  "nextCheckpoint": "what metric or milestone in X weeks should trigger this conversation again",
  "urgency": "immediate | within_30_days | review_in_60_days | not_needed"
}

Scoring: 0-25 = persevere strongly, 26-50 = explore options, 51-75 = serious pivot consideration, 76-100 = pivot urgently
Be direct. If signals are unclear, say so. Don't recommend pivoting based on 1 bad month.`,
        },
        {
          role: 'user',
          content: `Company: ${profile?.startup_name ?? 'Unknown'}\n\nCurrent signals:\n${signalLines}`,
        },
      ],
      { maxTokens: 800, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    // Log the evaluation
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'sage',
      action_type: 'pivot_evaluation',
      description: `Pivot evaluation — recommendation: ${String(result.recommendation ?? 'unknown')}, score: ${String(result.pivotScore ?? '?')}/100`,
      metadata:    { pivotScore: result.pivotScore, recommendation: result.recommendation, currentScore },
    }).then(() => {})

    return NextResponse.json({
      evaluation: result,
      signals: { currentScore, scoreTrend, scoreDeclining, winRate, nps, mrr, runway, avgProgress },
    })
  } catch (err) {
    console.error('Sage pivot POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
