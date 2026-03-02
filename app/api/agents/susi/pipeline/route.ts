import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/pipeline
// No body — pulls all deals, computes stage-by-stage funnel analytics.
// Returns: { analytics: { totalDeals, activeDeals, activePipelineValue, wonValue, winRate,
//   avgDealSize, stages[], bottleneck, velocityComment, topRecommendation, winRateComment, quickWins[] } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STAGE_ORDER = ['lead', 'qualified', 'proposal', 'negotiating', 'won', 'lost']

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const { data: allDeals } = await admin
      .from('deals')
      .select('company, stage, value, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (!allDeals || allDeals.length === 0) {
      return NextResponse.json({ error: 'No deals in pipeline yet — add deals first.' }, { status: 400 })
    }

    // Group by stage
    const stageMap: Record<string, typeof allDeals> = {}
    for (const deal of allDeals) {
      const s = deal.stage ?? 'lead'
      if (!stageMap[s]) stageMap[s] = []
      stageMap[s].push(deal)
    }

    const wonDeals   = stageMap['won']  ?? []
    const lostDeals  = stageMap['lost'] ?? []
    const activeDeals = allDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost')

    const winRate = (wonDeals.length + lostDeals.length) > 0
      ? Math.round(wonDeals.length / (wonDeals.length + lostDeals.length) * 100)
      : null

    function avgDays(deals: NonNullable<typeof allDeals>): number | null {
      if (!deals.length) return null
      const diffs = deals.map(d => {
        const c = new Date(d.created_at ?? Date.now()).getTime()
        const u = new Date(d.updated_at ?? d.created_at ?? Date.now()).getTime()
        return Math.max(0, (u - c) / 86400000)
      })
      return Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length)
    }

    const stages = STAGE_ORDER.map((stage, idx) => {
      const dealsInStage = stageMap[stage] ?? []
      const nextStage = STAGE_ORDER[idx + 1]
      const nextCount  = nextStage ? (stageMap[nextStage] ?? []).length : 0
      const conversionToNext = dealsInStage.length > 0 && nextStage && stage !== 'lost'
        ? Math.round(nextCount / Math.max(dealsInStage.length, 1) * 100)
        : null
      const totalValue = dealsInStage.reduce((sum, d) => sum + (parseFloat(d.value ?? '0') || 0), 0)
      return { stage, count: dealsInStage.length, totalValue: Math.round(totalValue), avgDaysInStage: avgDays(dealsInStage), conversionToNext }
    })

    const activePipelineValue = activeDeals.reduce((sum, d) => sum + (parseFloat(d.value ?? '0') || 0), 0)
    const wonValue   = wonDeals.reduce((sum, d) => sum + (parseFloat(d.value ?? '0') || 0), 0)
    const avgDealSize = wonDeals.length > 0 ? Math.round(wonValue / wonDeals.length) : null

    // LLM insight pass
    const prompt = `You are a B2B sales analytics expert. Analyze this pipeline funnel and give strategic insights.

Pipeline:
- Total deals: ${allDeals.length} | Active: ${activeDeals.length} | Won: ${wonDeals.length} | Lost: ${lostDeals.length}
- Win rate: ${winRate ?? 'N/A'}% | Active pipeline value: $${Math.round(activePipelineValue).toLocaleString()}
- Stages: ${JSON.stringify(stages.map(s => ({ stage: s.stage, count: s.count, conversion: s.conversionToNext })))}

Return JSON only (no markdown):
{
  "bottleneck": "stage name where most deals stall",
  "velocityComment": "one sentence on deal flow speed",
  "topRecommendation": "single most impactful action to improve pipeline health",
  "winRateComment": "assessment vs B2B benchmark of 20-30%",
  "quickWins": ["action 1", "action 2", "action 3"]
}`

    let analysis: { bottleneck?: string; velocityComment?: string; topRecommendation?: string; winRateComment?: string; quickWins?: string[] } = {}
    try {
      const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 400 })
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      analysis = JSON.parse(cleaned)
    } catch { /* fallback to empty */ }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'pipeline_analyzed',
      action_data: { totalDeals: allDeals.length, winRate, activeDeals: activeDeals.length },
    }).maybeSingle()

    return NextResponse.json({
      analytics: {
        totalDeals: allDeals.length,
        activeDeals: activeDeals.length,
        activePipelineValue: Math.round(activePipelineValue),
        wonValue: Math.round(wonValue),
        winRate,
        avgDealSize,
        stages,
        bottleneck:          analysis.bottleneck,
        velocityComment:     analysis.velocityComment,
        topRecommendation:   analysis.topRecommendation,
        winRateComment:      analysis.winRateComment,
        quickWins:           analysis.quickWins ?? [],
      },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
