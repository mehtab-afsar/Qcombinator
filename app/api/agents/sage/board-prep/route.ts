import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/board-prep
// Generates a board meeting packet by pulling from all agents:
// Felix financials + Susi pipeline + Atlas competitive + Harper team + Nova PMF + Sage strategy
// Returns: { boardPacket: { executiveSummary, financials, salesPipeline, product, team, competitive, strategy, appendix } }

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

    // Pull cross-agent data in parallel
    const [
      { data: profile },
      { data: latestScore },
      { data: scoreHistoryArr },
      { data: felixArtifact },
      { data: susiPipeline },
      { data: atlasArtifact },
      { data: harperArtifact },
      { data: novaArtifact },
      { data: sageArtifact },
      { data: recentActivity },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, full_name, industry, stage, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('overall_score, market_score, product_score, gtm_score, traction_score, team_score, calculated_at').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(1).single(),
      admin.from('qscore_history').select('overall_score').eq('user_id', user.id).order('calculated_at', { ascending: false }).limit(2),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('deals').select('stage, company, value, updated_at, contact_name').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(30),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas').eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper').eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'nova').eq('artifact_type', 'pmf_survey').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage').eq('artifact_type', 'strategic_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_activity').select('agent_id, action_type, description, created_at').eq('user_id', user.id).gte('created_at', since30d).order('created_at', { ascending: false }).limit(50),
    ])

    const prevScore = (scoreHistoryArr ?? [])[1] ?? null

    const fin = (felixArtifact?.content ?? {}) as Record<string, unknown>
    const pipeline = (susiPipeline ?? []) as { stage: string; company: string; value?: number | null; updated_at?: string; contact_name?: string }[]
    const competitive = (atlasArtifact?.content ?? {}) as Record<string, unknown>
    const hiringPlan = (harperArtifact?.content ?? {}) as Record<string, unknown>
    const pmf = (novaArtifact?.content ?? {}) as Record<string, unknown>
    const strategy = (sageArtifact?.content ?? {}) as Record<string, unknown>
    const sp = (profile?.startup_profile_data ?? {}) as Record<string, unknown>

    // Pipeline summary
    const wonDeals = pipeline.filter(d => d.stage === 'won')
    const activeDeals = pipeline.filter(d => !['won', 'lost'].includes(d.stage))
    const totalARR = wonDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)
    const pipelineValue = activeDeals.reduce((s, d) => s + (Number(d.value) || 0), 0)

    const contextLines = [
      `Company: ${profile?.startup_name ?? 'Unknown'} | Stage: ${profile?.stage ?? 'unknown'} | Industry: ${profile?.industry ?? 'unknown'}`,
      `Q-Score: ${latestScore?.overall_score ?? 0}/100 (prev: ${prevScore?.overall_score ?? 'n/a'})`,
      `Dimension breakdown — Market: ${latestScore?.market_score ?? 0}, Product: ${latestScore?.product_score ?? 0}, GTM: ${latestScore?.gtm_score ?? 0}, Traction: ${latestScore?.traction_score ?? 0}, Team: ${latestScore?.team_score ?? 0}`,
      fin.mrr ? `MRR: $${fin.mrr} | ARR: $${fin.arr ?? 'n/a'} | Burn: $${fin.monthlyBurn ?? 'n/a'}/mo | Runway: ${fin.runway ?? 'n/a'}` : 'No financial data connected',
      fin.churnRate ? `Churn rate: ${fin.churnRate}%` : '',
      `Pipeline: ${activeDeals.length} active deals, $${pipelineValue.toLocaleString()} value | Won this period: $${totalARR.toLocaleString()}`,
      pmf.nps !== undefined ? `NPS: ${pmf.nps} | PMF score: ${pmf.pmfScore ?? 'n/a'}` : 'No PMF survey data',
      pmf.percentVeryDisappointed !== undefined ? `"Very disappointed" if product gone: ${pmf.percentVeryDisappointed}%` : '',
      (competitive.competitors as { name: string }[] | undefined)?.length ? `Competitors tracked: ${(competitive.competitors as { name: string }[]).map(c => c.name).join(', ')}` : 'No competitive matrix',
      (hiringPlan.nextHires as { role: string; priority: string }[] | undefined)?.length
        ? `Planned hires: ${(hiringPlan.nextHires as { role: string; priority: string }[]).map(h => h.role).join(', ')}`
        : 'No hiring plan',
      strategy.vision ? `Strategic vision: ${strategy.vision}` : '',
      strategy.coreBets && Array.isArray(strategy.coreBets) ? `Core bets: ${(strategy.coreBets as string[]).join(' | ')}` : '',
      sp.problem ? `Problem: ${sp.problem}` : '',
      sp.solution ? `Solution: ${sp.solution}` : '',
      `Active last 30 days: ${(recentActivity ?? []).length} agent actions`,
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a strategic advisor. Generate a comprehensive board meeting packet for this startup. This should be investor-grade — honest, data-driven, and actionable.

Return ONLY valid JSON:
{
  "executiveSummary": {
    "headline": "one-sentence company status",
    "keyWin": "biggest win since last board meeting",
    "keyChallenge": "biggest challenge to address",
    "askFromBoard": "what you need from the board today — decisions, intros, advice"
  },
  "financials": {
    "snapshot": "MRR, ARR, burn, runway in one paragraph",
    "trend": "improving | declining | stable",
    "highlights": ["2-3 key financial observations"],
    "concerns": ["any financial red flags to discuss"],
    "guidance": "updated financial guidance for next quarter"
  },
  "salesPipeline": {
    "snapshot": "pipeline health summary",
    "highlights": ["key deals, notable wins, important losses"],
    "forecast": "expected revenue close in next 30/60/90 days",
    "blockers": ["what's slowing down sales"]
  },
  "product": {
    "pmfStatus": "strong | emerging | weak | unknown",
    "npsComment": "interpretation of NPS and customer sentiment",
    "recentMilestones": ["features shipped, improvements made"],
    "roadmapPriorities": ["top 3 product priorities next quarter"]
  },
  "team": {
    "currentTeam": "brief team description",
    "keyHires": ["open roles that are critical"],
    "teamRisks": ["any team-related risks"],
    "culture": "brief culture/morale observation"
  },
  "competitive": {
    "landscapeShift": "any notable competitive movements",
    "ourAdvantage": "where we are winning vs competitors",
    "threats": ["competitive threats to flag for board"],
    "opportunities": ["competitive gaps we can exploit"]
  },
  "strategy": {
    "currentBets": ["what we're betting on this quarter"],
    "pivotSignals": "are there any signals the strategy needs adjustment?",
    "fundraisingStatus": "where are we in the fundraising process?",
    "milestones": ["key milestones to hit before next board meeting"]
  },
  "riskRegister": [
    { "risk": "specific risk", "likelihood": "high | medium | low", "impact": "high | medium | low", "mitigation": "how we're addressing it" }
  ],
  "boardQuestions": ["3-4 specific questions you want the board to help answer"],
  "appendixNotes": "what supporting materials to include as appendix"
}

Be specific. Use actual numbers where available. Flag unknowns honestly. This is for sophisticated investors/board members — no fluff.`,
        },
        {
          role: 'user',
          content: `Generate board meeting packet for:\n${contextLines}`,
        },
      ],
      { maxTokens: 1400, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let boardPacket: Record<string, unknown> = {}
    try { boardPacket = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { boardPacket = m ? JSON.parse(m[0]) : {} } catch { boardPacket = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'sage',
      action_type: 'board_prep_generated',
      description: `Board meeting packet generated for ${profile?.startup_name ?? 'startup'}`,
      metadata:    { company: profile?.startup_name, qscore: latestScore?.overall_score, pipelineDeals: activeDeals.length },
    }).then(() => {})

    return NextResponse.json({ boardPacket, company: profile?.startup_name })
  } catch (err) {
    console.error('Sage board-prep POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
