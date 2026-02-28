import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/briefing
// Generates a cross-agent weekly briefing pulling live data from all agents.
// No body required — pulls all available agent data.
// Returns: { briefing: { content: { headline, scoreSummary, wins[], risks[], nextWeekFocus[], motivationalClose } } }

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
    const since7d  = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000).toISOString()
    const since14d = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: profile },
      { data: latestScore },
      { data: prevScoreArr },
      { data: felixArtifact },
      { data: activeDeals },
      { data: wonDeals },
      { data: atlasArtifact },
      { data: harperArtifact },
      { data: novaArtifact },
      { data: recentActivity },
      { data: staleDealData },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, stage, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('overall_score, traction_score, product_score, gtm_score, team_score, market_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).single(),
      admin.from('qscore_history').select('overall_score').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(2),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('deals').select('company, stage, value, updated_at').eq('user_id', user.id).not('stage', 'in', '("won","lost")').order('updated_at', { ascending: false }).limit(20),
      admin.from('deals').select('company, value').eq('user_id', user.id).eq('stage', 'won').gte('updated_at', since7d),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas').eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper').eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova').eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_activity').select('agent_id, action_type, description, created_at').eq('user_id', user.id).gte('created_at', since7d).order('created_at', { ascending: false }).limit(60),
      admin.from('deals').select('id').eq('user_id', user.id).lt('updated_at', since14d).not('stage', 'in', '("won","lost")'),
    ])

    const prevScore = (prevScoreArr ?? [])[1] ?? null
    const fin = (felixArtifact?.content ?? {}) as Record<string, unknown>
    const competitive = (atlasArtifact?.content ?? {}) as Record<string, unknown>
    const hiringPlan = (harperArtifact?.content ?? {}) as Record<string, unknown>
    const pmf = (novaArtifact?.content ?? {}) as Record<string, unknown>

    const activePipelineValue = (activeDeals ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0)
    const wonThisWeek = (wonDeals ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0)
    const scoreDelta = prevScore ? (latestScore?.overall_score ?? 0) - (prevScore.overall_score ?? 0) : null
    const staleDealCount = (staleDealData ?? []).length

    const contextLines = [
      `Company: ${profile?.startup_name ?? 'Unknown'} | Stage: ${profile?.stage ?? 'unknown'}`,
      `Q-Score: ${latestScore?.overall_score ?? 0}/100${scoreDelta !== null ? ` (${scoreDelta >= 0 ? '+' : ''}${scoreDelta} this week)` : ''}`,
      `Dim — Market: ${latestScore?.market_score ?? 0}, Product: ${latestScore?.product_score ?? 0}, GTM: ${latestScore?.gtm_score ?? 0}, Traction: ${latestScore?.traction_score ?? 0}, Team: ${latestScore?.team_score ?? 0}`,
      fin.mrr ? `MRR: $${fin.mrr} | Burn: $${fin.monthlyBurn ?? 'n/a'}/mo | Runway: ${fin.runway ?? 'n/a'}` : 'No financial data',
      `Active pipeline: ${(activeDeals ?? []).length} deals, $${activePipelineValue.toLocaleString()}`,
      wonThisWeek > 0 ? `Won this week: $${wonThisWeek.toLocaleString()}` : 'No wins this week',
      staleDealCount > 0 ? `Stale deals (>14d): ${staleDealCount}` : '',
      pmf.nps !== undefined ? `NPS: ${pmf.nps}` : '',
      (competitive.competitors as { name: string }[] | undefined)?.length
        ? `Tracking ${(competitive.competitors as { name: string }[]).length} competitors`
        : '',
      (hiringPlan.nextHires as { role: string }[] | undefined)?.length
        ? `Open roles: ${(hiringPlan.nextHires as { role: string }[]).length}`
        : '',
      `Agent actions this week: ${(recentActivity ?? []).length}`,
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a strategic advisor. Generate a concise weekly founder briefing. Monday morning energy — direct, prioritized, no fluff.

Return ONLY valid JSON:
{
  "headline": "one bold sentence summarizing the company's position this week",
  "scoreSummary": "2-3 sentences covering Q-Score, financial position, and pipeline in plain language",
  "wins": ["specific wins from this week — concrete, not generic (2-4 items)"],
  "risks": ["specific risks or concerns to address (2-3 items)"],
  "nextWeekFocus": ["the 2-3 most important things to focus on next week"],
  "motivationalClose": "one closing sentence — honest and encouraging, not cringe"
}

Be specific. Reference actual data. The founder reads this in 3 minutes.`,
        },
        {
          role: 'user',
          content: `Generate weekly briefing:\n\n${contextLines}`,
        },
      ],
      { maxTokens: 700, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let content: Record<string, unknown> = {}
    try { content = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { content = m ? JSON.parse(m[0]) : {} } catch { content = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'sage',
      action_type: 'weekly_briefing_generated',
      description: `Weekly briefing — Q-Score ${latestScore?.overall_score ?? 0}, pipeline ${(activeDeals ?? []).length} deals`,
      metadata:    { qscore: latestScore?.overall_score, pipelineCount: (activeDeals ?? []).length, wonThisWeek },
    }).then(() => {})

    return NextResponse.json({ briefing: { content }, company: profile?.startup_name })
  } catch (err) {
    console.error('Sage briefing POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
