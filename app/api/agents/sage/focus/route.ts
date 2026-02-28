import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/focus
// Sage answers: "What is the single most important thing I should work on RIGHT NOW?"
// Pulls data from all agent sources and returns a prioritized recommendation.

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

    // Gather cross-agent signals in parallel
    const [
      { data: profile },
      { data: latestScore },
      { data: pipeline },
      { data: recentActivity },
      { data: artifacts },
      { data: openReminders },
      { data: milestones },
    ] = await Promise.all([
      supabase.from('founder_profiles').select('startup_name, full_name, industry, stage').eq('user_id', user.id).single(),
      supabase.from('qscore_history').select('overall_score, market_score, product_score, gtm_score, financial_score, team_score, traction_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).single(),
      admin.from('deals').select('stage, company, value, updated_at').eq('user_id', user.id).not('stage', 'in', '("won","lost")').order('updated_at', { ascending: true }).limit(10),
      admin.from('agent_activity').select('agent_id, action_type, description, created_at').eq('user_id', user.id).gte('created_at', since30d).order('created_at', { ascending: false }).limit(30),
      admin.from('agent_artifacts').select('agent_id, artifact_type, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      admin.from('agent_activity').select('description, metadata, created_at').eq('user_id', user.id).eq('action_type', 'deal_reminder').order('created_at', { ascending: false }).limit(5),
      admin.from('agent_activity').select('metadata').eq('user_id', user.id).eq('agent_id', 'sage').eq('action_type', 'milestone_completed').order('created_at', { ascending: false }).limit(20),
    ])

    // Build context
    const scores = {
      overall:   (latestScore?.overall_score  as number | undefined) ?? 0,
      market:    (latestScore?.market_score   as number | undefined) ?? 0,
      product:   (latestScore?.product_score  as number | undefined) ?? 0,
      gtm:       (latestScore?.gtm_score      as number | undefined) ?? 0,
      financial: (latestScore?.financial_score as number | undefined) ?? 0,
      team:      (latestScore?.team_score     as number | undefined) ?? 0,
      traction:  (latestScore?.traction_score as number | undefined) ?? 0,
    }
    const lowestDim = Object.entries(scores)
      .filter(([k]) => k !== 'overall')
      .sort(([, a], [, b]) => a - b)[0]

    const stalestDeal = pipeline && pipeline.length > 0 ? pipeline[0] : null
    const staleDays = stalestDeal
      ? Math.round((Date.now() - new Date(stalestDeal.updated_at).getTime()) / 86400000)
      : null

    const agentArtifactTypes = new Set((artifacts ?? []).map(a => a.artifact_type))
    const allArtifactTypes = ['icp_document', 'outreach_sequence', 'battle_card', 'gtm_playbook', 'sales_script', 'brand_messaging', 'financial_summary', 'hiring_plan', 'strategic_plan', 'competitive_matrix', 'legal_checklist', 'pmf_survey']
    const missingArtifacts = allArtifactTypes.filter(t => !agentArtifactTypes.has(t))

    const recentActionTypes = new Set((recentActivity ?? []).map(a => a.action_type))
    const hasRecentOutreach = recentActionTypes.has('outreach_sent') || recentActionTypes.has('batch_sent')
    const completedMilestoneIdxs = new Set((milestones ?? []).map(m => (m.metadata as Record<string, unknown>)?.milestoneIndex as number))

    const context = `
Company: ${profile?.startup_name ?? 'Unknown'} | Stage: ${profile?.stage ?? 'unknown'} | Industry: ${profile?.industry ?? 'unknown'}
Q-Score: ${scores.overall}/100 | Weakest dimension: ${lowestDim?.[0] ?? 'unknown'} (${lowestDim?.[1] ?? 0}/100)
Dimension scores: ${JSON.stringify(scores)}
Active pipeline deals: ${pipeline?.length ?? 0}${stalestDeal ? ` | Stalest deal: ${stalestDeal.company} (${staleDays} days idle, stage: ${stalestDeal.stage})` : ''}
Open deal reminders: ${openReminders?.length ?? 0}
Recent actions (30d): ${[...recentActionTypes].join(', ') || 'none'}
Has recent outreach: ${hasRecentOutreach}
Missing artifacts (0 of 12): ${missingArtifacts.slice(0, 4).join(', ')}
Completed milestones: ${completedMilestoneIdxs.size}
`.trim()

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a startup operating system. The founder asks: "What is the single most important thing I should work on right now?"

Pull together all available signals — Q-Score gaps, stale pipeline, missing deliverables, overdue reminders, momentum — and give ONE clear answer.

Return ONLY valid JSON:
{
  "topPriority": {
    "action": "specific, concrete action (not vague) — e.g. 'Follow up with Acme Corp — deal has been idle 12 days'",
    "whyNow": "1-2 sentences on WHY this is the most important thing today",
    "urgency": "today | this_week | next_week",
    "estimatedImpact": "what changes if you do this — quantify if possible",
    "agent": "which agent is best positioned to help — e.g. 'Susi' or 'Felix'"
  },
  "context": "2-sentence summary of current state of the startup (what's going well, what's at risk)",
  "secondaryPriorities": [
    { "action": "...", "reason": "...", "urgency": "this_week | next_week" }
  ],
  "avoidToday": "1 specific thing to NOT work on today because it's lower priority than it feels"
}

Rules:
- Be SPECIFIC — name the company, the dimension, the artifact, the deal. Not generic advice.
- Prioritize revenue/survival above all else
- If runway < 6 months, financial actions dominate
- If NPS < 40, PMF is the priority
- If no outreach in 30 days, GTM is stale
- Only 3 secondary priorities max`,
        },
        {
          role: 'user',
          content: `Current status:\n${context}`,
        },
      ],
      { maxTokens: 600, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    // Log the focus query
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'sage',
      action_type: 'focus_check',
      description: `Focus query — top priority: "${String((result.topPriority as Record<string, unknown>)?.action ?? '').slice(0, 80)}"`,
      metadata:    { scores, result },
    }).then(() => {})

    return NextResponse.json({ focus: result, scores, generatedAt: new Date().toISOString() })
  } catch (err) {
    console.error('Sage focus POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
