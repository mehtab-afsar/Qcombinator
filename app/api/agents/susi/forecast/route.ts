import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/forecast
// Generates a revenue forecast based on pipeline data, close rates, and MRR.
// No body required — pulls from deals + felix artifact.
// Returns: { forecast: { thirtyDay, sixtyDay, ninetyDay, pipelineHealth, closeRateEstimate, riskDeals[], topDeals[], recommendation } }

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
    const since90d = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: fp },
      { data: activeDeals },
      { data: closedDeals },
      { data: lostDeals },
      { data: felixArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('deals').select('company, contact_name, stage, value, created_at, updated_at, notes').eq('user_id', user.id).not('stage', 'in', '("won","lost")').order('value', { ascending: false }),
      admin.from('deals').select('company, value, stage, updated_at').eq('user_id', user.id).eq('stage', 'won').gte('updated_at', since90d),
      admin.from('deals').select('company, value').eq('user_id', user.id).eq('stage', 'lost').gte('updated_at', since90d),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fin = (felixArtifact?.content ?? {}) as Record<string, unknown>

    // Calculate pipeline stats
    const totalPipelineValue = (activeDeals ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0)
    const wonValue = (closedDeals ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0)
    const lostValue = (lostDeals ?? []).reduce((s, d) => s + (Number(d.value) || 0), 0)
    const totalClosed = wonValue + lostValue
    const historicCloseRate = totalClosed > 0 ? Math.round((wonValue / totalClosed) * 100) : null

    // Stage-weighted pipeline
    const stageWeights: Record<string, number> = {
      lead: 0.05, prospecting: 0.1, qualified: 0.2, proposal: 0.4,
      negotiation: 0.7, decision: 0.85, closing: 0.9,
    }
    const weightedValue = (activeDeals ?? []).reduce((s, d) => {
      const w = stageWeights[d.stage?.toLowerCase() ?? ''] ?? 0.15
      return s + (Number(d.value) || 0) * w
    }, 0)

    const pipelineContext = [
      `Active pipeline: ${(activeDeals ?? []).length} deals, $${totalPipelineValue.toLocaleString()} total`,
      `Weighted pipeline (stage-adjusted): $${Math.round(weightedValue).toLocaleString()}`,
      historicCloseRate !== null ? `Historical close rate (90d): ${historicCloseRate}%` : '',
      `Won last 90d: $${wonValue.toLocaleString()} | Lost last 90d: $${lostValue.toLocaleString()}`,
      fin.mrr ? `Current MRR: $${fin.mrr}` : '',
      fin.monthlyBurn ? `Monthly burn: $${fin.monthlyBurn}` : '',
      `Top 5 deals by value:`,
      ...(activeDeals ?? []).slice(0, 5).map(d =>
        `  ${d.company} | ${d.stage} | $${Number(d.value || 0).toLocaleString()} | ${d.notes ? d.notes.slice(0, 60) : 'no notes'}`
      ),
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Susi, a sales advisor. Generate a revenue forecast for this startup based on their pipeline.

Return ONLY valid JSON:
{
  "thirtyDay": {
    "expected": "dollar amount (e.g. $28,000)",
    "optimistic": "dollar amount",
    "pessimistic": "dollar amount",
    "reasoning": "1 sentence"
  },
  "sixtyDay": {
    "expected": "dollar amount",
    "optimistic": "dollar amount",
    "pessimistic": "dollar amount",
    "reasoning": "1 sentence"
  },
  "ninetyDay": {
    "expected": "dollar amount",
    "optimistic": "dollar amount",
    "pessimistic": "dollar amount",
    "reasoning": "1 sentence"
  },
  "closeRateEstimate": "estimated close rate % for this pipeline",
  "pipelineHealth": "strong | healthy | thin | at_risk",
  "pipelineGaps": ["what's missing or weak in the current pipeline"],
  "riskDeals": ["deals most at risk of being lost and why"],
  "topDeals": ["deals with highest probability of closing and why"],
  "recommendation": "2-3 sentence strategic recommendation on what to focus on to hit forecast"
}

Base your forecast on stage-weighted deal values and historical close rates. Be honest about uncertainty.`,
        },
        {
          role: 'user',
          content: `Generate revenue forecast for ${fp?.startup_name ?? 'this startup'}:\n\n${pipelineContext}`,
        },
      ],
      { maxTokens: 800, temperature: 0.35 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let forecast: Record<string, unknown> = {}
    try { forecast = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { forecast = m ? JSON.parse(m[0]) : {} } catch { forecast = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'susi',
      action_type: 'revenue_forecast_generated',
      description: `Revenue forecast: ${(activeDeals ?? []).length} deals, $${totalPipelineValue.toLocaleString()} pipeline, close rate ${historicCloseRate ?? 'unknown'}%`,
      metadata:    { pipelineValue: totalPipelineValue, dealCount: (activeDeals ?? []).length, historicCloseRate },
    }).then(() => {})

    return NextResponse.json({ forecast, pipelineValue: totalPipelineValue, dealCount: (activeDeals ?? []).length })
  } catch (err) {
    console.error('Susi forecast POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
