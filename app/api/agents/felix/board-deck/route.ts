import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/felix/board-deck
// Generates HTML financial slides for a board deck from Stripe + expense data.
// No body required — pulls from agent_artifacts (financial_summary) and qscore_history.
// Returns: { slides[], htmlDeck, summaryStats }

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
      { data: felixArtifact },
      { data: scoreHistory },
      { data: actualsArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('qscore_history').select('overall_score, traction_score, calculated_at').eq('user_id', user.id).gte('calculated_at', since90d).order('calculated_at', { ascending: true }).limit(12),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix').eq('artifact_type', 'actuals_report').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const fin = (felixArtifact?.content ?? {}) as Record<string, unknown>
    const actuals = (actualsArtifact?.content ?? {}) as Record<string, unknown>
    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>

    // Build score trend data
    const scoreTrend = (scoreHistory ?? []).map(s => ({
      date: new Date(s.calculated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      score: s.overall_score,
      traction: s.traction_score,
    }))

    const financialContext = [
      fin.mrr ? `MRR: $${fin.mrr}` : 'No MRR data',
      fin.arr ? `ARR: $${fin.arr}` : '',
      fin.monthlyBurn ? `Monthly burn: $${fin.monthlyBurn}` : '',
      fin.runway ? `Runway: ${fin.runway}` : '',
      fin.customers ? `Paying customers: ${fin.customers}` : '',
      fin.churnRate ? `Monthly churn: ${fin.churnRate}%` : '',
      fin.ltv ? `LTV: $${fin.ltv}` : '',
      fin.cac ? `CAC: $${fin.cac}` : '',
      fin.grossMargin ? `Gross margin: ${fin.grossMargin}%` : '',
      actuals.projectedMRR ? `Projected MRR (model): $${actuals.projectedMRR}` : '',
      actuals.variancePercent ? `Actuals vs projection: ${actuals.variancePercent}%` : '',
      sp.revenueModel ? `Revenue model: ${sp.revenueModel}` : '',
      sp.fundingRaised ? `Total raised: $${sp.fundingRaised}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Felix, a startup CFO. Generate the financial section for a board deck. Output investor-grade financial narrative — specific, honest, no spin.

Return ONLY valid JSON:
{
  "slides": [
    {
      "title": "slide title",
      "type": "metrics_dashboard | revenue_trend | unit_economics | cash_position | forecast | burn_bridge",
      "headline": "one bold statement that captures the most important insight on this slide",
      "keyNumbers": [
        { "label": "metric name", "value": "formatted value", "change": "+X% MoM or null", "trend": "up | down | flat | null" }
      ],
      "narrative": "2-3 sentences the CEO would say presenting this slide",
      "footnote": "any caveat or methodology note — or null"
    }
  ],
  "cfoNotes": "what the board will ask about — and suggested answers",
  "redFlags": ["any financial metrics the board will flag"],
  "positives": ["metrics to emphasize — genuine strengths"],
  "guidanceStatement": "full-quarter guidance in 2 sentences (what you're projecting and key assumption)"
}

Generate 4-5 slides covering: key metrics dashboard, revenue/growth trend, unit economics, cash & runway, forecast.
Use real numbers from context. If a metric is missing, note it as 'TBD' and explain why it matters.`,
        },
        {
          role: 'user',
          content: `Generate board deck financial slides for ${fp?.startup_name ?? 'this startup'}:\n\n${financialContext}`,
        },
      ],
      { maxTokens: 1200, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { result = m ? JSON.parse(m[0]) : {} } catch { result = {} } }

    const slides = (result.slides as Record<string, unknown>[] | undefined) ?? []

    // Generate a self-contained HTML deck
    const htmlDeck = generateBoardDeckHTML(
      fp?.startup_name ?? 'Financial Report',
      slides,
      scoreTrend
    )

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'felix',
      action_type: 'board_deck_generated',
      description: `Board deck financial slides generated — ${slides.length} slides`,
      metadata:    { company: fp?.startup_name, slideCount: slides.length, mrr: fin.mrr },
    }).then(() => {})

    return NextResponse.json({ result, htmlDeck, scoreTrend, company: fp?.startup_name })
  } catch (err) {
    console.error('Felix board-deck POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateBoardDeckHTML(
  company: string,
  slides: Record<string, unknown>[],
  _scoreTrend: { date: string; score: number; traction: number }[]
): string {
  const slideHTML = slides.map((slide, idx) => {
    const nums = (slide.keyNumbers as { label: string; value: string; change: string | null; trend: string | null }[] | undefined) ?? []
    return `
    <div class="slide" id="slide-${idx + 1}" style="display: ${idx === 0 ? 'flex' : 'none'};">
      <div class="slide-header">
        <p class="slide-type">${String(slide.type ?? '').replace(/_/g, ' ').toUpperCase()}</p>
        <h2 class="slide-title">${String(slide.title ?? '')}</h2>
        <p class="slide-headline">${String(slide.headline ?? '')}</p>
      </div>
      <div class="metrics-grid">
        ${nums.map(n => `
        <div class="metric-card">
          <p class="metric-label">${n.label}</p>
          <p class="metric-value">${n.value}</p>
          ${n.change ? `<p class="metric-change ${n.trend === 'up' ? 'positive' : n.trend === 'down' ? 'negative' : ''}">${n.change}</p>` : ''}
        </div>`).join('')}
      </div>
      ${slide.narrative ? `<p class="narrative">${String(slide.narrative)}</p>` : ''}
      ${slide.footnote ? `<p class="footnote">* ${String(slide.footnote)}</p>` : ''}
    </div>`
  }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${company} — Board Financials</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0F172A; color: #F8FAFC; min-height: 100vh; display: flex; flex-direction: column; }
  .deck-header { background: #1E293B; padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; }
  .deck-header h1 { font-size: 18px; font-weight: 700; color: #F8FAFC; }
  .deck-header .date { font-size: 12px; color: #94A3B8; }
  .deck-body { flex: 1; display: flex; align-items: center; justify-content: center; padding: 32px; }
  .slide { width: 100%; max-width: 900px; background: #1E293B; border-radius: 16px; padding: 40px; display: flex; flex-direction: column; gap: 24px; min-height: 480px; border: 1px solid #334155; }
  .slide-type { font-size: 10px; font-weight: 700; color: #3B82F6; text-transform: uppercase; letter-spacing: 0.15em; }
  .slide-title { font-size: 28px; font-weight: 800; color: #F8FAFC; line-height: 1.2; }
  .slide-headline { font-size: 15px; color: #94A3B8; line-height: 1.5; }
  .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; }
  .metric-card { background: #0F172A; border-radius: 10px; padding: 16px; border: 1px solid #334155; }
  .metric-label { font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 4px; }
  .metric-value { font-size: 28px; font-weight: 800; color: #F8FAFC; }
  .metric-change { font-size: 12px; margin-top: 4px; font-weight: 600; }
  .metric-change.positive { color: #22C55E; }
  .metric-change.negative { color: #EF4444; }
  .narrative { font-size: 14px; color: #CBD5E1; line-height: 1.7; padding-top: 8px; border-top: 1px solid #334155; }
  .footnote { font-size: 11px; color: #475569; font-style: italic; }
  .nav { display: flex; justify-content: center; gap: 16px; padding: 20px; }
  .nav button { padding: 10px 24px; border-radius: 8px; border: 1px solid #334155; background: #1E293B; color: #94A3B8; font-size: 14px; font-weight: 600; cursor: pointer; }
  .nav button:hover { background: #334155; color: #F8FAFC; }
  .slide-counter { padding: 0 16px; line-height: 40px; font-size: 13px; color: #64748B; }
  @media print { .nav, .deck-header { display: none; } .slide { border: none; } }
</style>
</head>
<body>
<div class="deck-header">
  <h1>${company} — Financial Board Update</h1>
  <span class="date">${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
</div>
<div class="deck-body">${slideHTML}</div>
<div class="nav">
  <button onclick="prevSlide()">← Previous</button>
  <span class="slide-counter" id="counter">1 / ${slides.length}</span>
  <button onclick="nextSlide()">Next →</button>
</div>
<script>
  let current = 1;
  const total = ${slides.length};
  function showSlide(n) {
    document.querySelectorAll('.slide').forEach((s,i) => s.style.display = i === n-1 ? 'flex' : 'none');
    document.getElementById('counter').textContent = n + ' / ' + total;
    current = n;
  }
  function nextSlide() { if (current < total) showSlide(current + 1); }
  function prevSlide() { if (current > 1) showSlide(current - 1); }
  document.addEventListener('keydown', e => { if (e.key === 'ArrowRight') nextSlide(); if (e.key === 'ArrowLeft') prevSlide(); });
</script>
</body>
</html>`
}
