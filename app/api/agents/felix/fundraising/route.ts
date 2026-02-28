import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/fundraising
// Models a fundraising round: dilution, ownership post-round, use of funds, investor return.
// Body: { raiseAmount, preMoneyValuation, instrument?, runwayMonths?, useOfFundsBreakdown? }
// Returns: { dilutionPercent, postMoneyValuation, investorPercent, yourRemaining,
//            recommendation, runwayExtension, useOfFunds[], investorReturn, timeline }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const {
      raiseAmount,
      preMoneyValuation,
      instrument = 'SAFE',
      runwayMonths,
      useOfFundsBreakdown,
    } = body as {
      raiseAmount: number
      preMoneyValuation?: number
      instrument?: string
      runwayMonths?: number
      useOfFundsBreakdown?: string
    }

    if (!raiseAmount || raiseAmount <= 0) {
      return NextResponse.json({ error: 'raiseAmount is required and must be positive' }, { status: 400 })
    }

    const admin = getAdmin()

    const [{ data: fp }, { data: finArtifact }] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, stage, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fin = (finArtifact?.content ?? {}) as Record<string, unknown>
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    const monthlyBurn = parseFloat(String(fin.monthlyBurn ?? sp.monthlyBurn ?? '0').replace(/[^0-9.]/g, '')) || 0
    const mrr = parseFloat(String(fin.mrr ?? sp.mrr ?? '0').replace(/[^0-9.]/g, '')) || 0
    const stage = fp?.stage ?? 'pre-seed'

    // Hard math (no LLM needed)
    const postMoneyValuation = preMoneyValuation ? preMoneyValuation + raiseAmount : null
    const investorPercent = postMoneyValuation ? Math.round((raiseAmount / postMoneyValuation) * 1000) / 10 : null
    const yourRemaining = investorPercent ? Math.round((100 - investorPercent) * 10) / 10 : null
    const runwayExtensionMonths = monthlyBurn > 0 ? Math.round(raiseAmount / monthlyBurn) : null

    const contextLines = [
      `Company: ${fp?.startup_name ?? 'Unknown'} (${stage})`,
      `Raise amount: $${raiseAmount.toLocaleString()}`,
      preMoneyValuation ? `Pre-money valuation: $${preMoneyValuation.toLocaleString()}` : 'No valuation specified — modeling as uncapped SAFE',
      `Instrument: ${instrument}`,
      monthlyBurn > 0 ? `Current monthly burn: $${monthlyBurn.toLocaleString()}` : '',
      mrr > 0 ? `Current MRR: $${mrr.toLocaleString()}` : 'Pre-revenue',
      runwayMonths ? `Current runway: ${runwayMonths} months` : '',
      useOfFundsBreakdown ? `Planned use: ${useOfFundsBreakdown}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Felix, a startup CFO. Model this fundraising round and advise the founder.

Return ONLY valid JSON:
{
  "recommendation": "raise | wait | reduce_ask — and 2-sentence rationale",
  "timeline": "fundraising timeline advice (e.g. 'Start now — takes 3-6 months at seed stage')",
  "useOfFunds": [
    { "category": "Engineering / Product", "percentage": 40, "amount": "$400K", "rationale": "Why this allocation makes sense" }
  ],
  "investorReturn": "what a typical investor would expect — e.g. '3x at Series A valuation of $15M'",
  "milestoneToHit": "the single most important milestone to hit before needing the next round",
  "dilutionComment": "plain-language explanation of what this dilution means for the founder",
  "alternativeStructure": "optional — lower-dilution alternative (e.g. revenue-based financing, smaller SAFE)"
}

Use of funds should add up to 100%. Base on stage and burn rate context.`,
        },
        {
          role: 'user',
          content: `Model this fundraising round:\n\n${contextLines}`,
        },
      ],
      { maxTokens: 700, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : {} } catch { analysis = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'felix',
      action_type: 'fundraising_modeled',
      description: `Fundraising model: $${raiseAmount.toLocaleString()} raise on $${preMoneyValuation?.toLocaleString() ?? 'uncapped'} pre-money`,
      metadata:    { raiseAmount, preMoneyValuation, instrument, investorPercent, dilutionPercent: investorPercent },
    }).then(() => {})

    return NextResponse.json({
      // Hard math
      raiseAmount,
      preMoneyValuation: preMoneyValuation ?? null,
      postMoneyValuation,
      investorPercent,
      yourRemaining,
      runwayExtensionMonths,
      instrument,
      // LLM analysis
      recommendation:       analysis.recommendation ?? null,
      timeline:             analysis.timeline ?? null,
      useOfFunds:           analysis.useOfFunds ?? [],
      investorReturn:       analysis.investorReturn ?? null,
      milestoneToHit:       analysis.milestoneToHit ?? null,
      dilutionComment:      analysis.dilutionComment ?? null,
      alternativeStructure: analysis.alternativeStructure ?? null,
    })
  } catch (err) {
    console.error('Felix fundraising POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
