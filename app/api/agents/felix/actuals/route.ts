import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/actuals
// Compares Stripe actuals against projected MRR from financial model.
// Body: { actualMRR, projectedMRR?, financialSnapshot? }
// Returns: variance analysis with recommendation

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { actualMRR, projectedMRR, financialSnapshot } = body as {
      actualMRR: number
      projectedMRR?: number
      financialSnapshot?: Record<string, string>
    }

    if (!actualMRR || isNaN(actualMRR)) {
      return NextResponse.json({ error: 'actualMRR is required' }, { status: 400 })
    }

    // Extract projected MRR from snapshot if not provided
    const snap = financialSnapshot ?? {}
    let projected = projectedMRR
    if (!projected) {
      const raw =
        snap['projectedMRR'] ?? snap['mrrTarget'] ?? snap['targetMRR'] ??
        snap['projectedRevenue'] ?? snap['mrrGrowthTarget'] ?? ''
      projected = raw ? parseFloat(String(raw).replace(/[^0-9.]/g, '')) : undefined
    }

    // Get current MRR from snapshot for growth rate
    const currentSnapMRR = snap['mrr'] ?? snap['MRR'] ?? ''
    const snapMRR = currentSnapMRR ? parseFloat(String(currentSnapMRR).replace(/[^0-9.]/g, '')) : undefined

    const variance = projected ? actualMRR - projected : null
    const variancePct = projected && projected > 0 ? Math.round(((actualMRR - projected) / projected) * 100) : null
    const onTrack = variancePct !== null ? variancePct >= -10 : null

    const now = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    const contextLines = [
      `Month: ${now}`,
      `Actual MRR: $${actualMRR.toLocaleString()}`,
      projected ? `Projected MRR: $${projected.toLocaleString()}` : '',
      variance !== null ? `Variance: ${variance >= 0 ? '+' : ''}$${variance.toLocaleString()} (${variancePct}%)` : '',
      snapMRR ? `Last recorded MRR: $${snapMRR.toLocaleString()}` : '',
      snap['monthlyBurn'] ? `Monthly burn: $${snap['monthlyBurn']}` : '',
      snap['runway'] ? `Runway: ${snap['runway']}` : '',
      snap['churnRate'] ? `Churn rate: ${snap['churnRate']}` : '',
      snap['newMRR'] ? `New MRR: $${snap['newMRR']}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Felix, a startup CFO. Analyze the founder's actual MRR vs projections and give a sharp variance analysis.
Return ONLY valid JSON:
{
  "headline": "one punchy sentence — e.g., 'You're 18% behind your April target'",
  "status": "ahead | on_track | slightly_behind | significantly_behind",
  "variance": ${variance ?? 'null'},
  "variancePct": ${variancePct ?? 'null'},
  "drivers": ["2-3 likely reasons for the gap — positive or negative"],
  "risks": ["1-2 risks if trend continues"],
  "actions": [
    { "priority": "high | medium", "action": "specific thing to do this week", "impact": "expected result" }
  ],
  "forecastNote": "revised projection for next month based on current trajectory — 1 sentence"
}
Rules:
- Be specific and financial, not motivational
- If ahead of projections, celebrate and explain what's working
- If behind, be direct about what needs to change`,
        },
        {
          role: 'user',
          content: `Analyze actuals vs projections:\n${contextLines}`,
        },
      ],
      { maxTokens: 500, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { analysis = m ? JSON.parse(m[0]) : {} } catch { analysis = {} } }

    // Log to agent activity
    await supabase.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'felix',
      action_type: 'actuals_vs_projections',
      description: `Actuals vs projections: ${projected ? `$${actualMRR.toLocaleString()} vs $${projected.toLocaleString()} projected (${variancePct ?? '?'}%)` : `$${actualMRR.toLocaleString()} MRR logged`}`,
      metadata: { actualMRR, projectedMRR: projected, variance, variancePct },
    }).then(() => {})

    return NextResponse.json({
      actualMRR,
      projectedMRR: projected ?? null,
      variance,
      variancePct,
      onTrack,
      analysis,
    })
  } catch (err) {
    console.error('Felix actuals error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
