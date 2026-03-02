import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/one-pager
// No body — pulls brand_messaging + financial_summary + gtm_playbook + competitive_matrix artifacts
// Returns: { html: string } — polished one-page tear sheet for cold investor outreach

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

    const [{ data: brandArt }, { data: finArt }, { data: gtmArt }, { data: matrixArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your Startup'
    const founderName = fp?.full_name ?? 'Founder'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null

    const brand = brandArt?.content as Record<string, unknown> | null
    const fin   = finArt?.content as Record<string, unknown> | null
    const gtm   = gtmArt?.content as Record<string, unknown> | null
    const matrix = matrixArt?.content as Record<string, unknown> | null

    // Extract key data points
    const tagline = (brand?.taglines as { tagline: string }[] | undefined)?.[0]?.tagline ?? profileData?.tagline as string ?? ''
    const oneLiner = (brand?.elevatorPitch as { oneLiner?: string } | undefined)?.oneLiner ?? profileData?.description as string ?? ''
    const snapshot = fin?.snapshot as Record<string, string> | undefined
    const mrr = snapshot?.mrr ?? snapshot?.MRR ?? ''
    const customers = snapshot?.customers ?? ''
    const runway = snapshot?.runway ?? ''
    const fundraisingRec = (fin?.fundraisingRecommendation as { amount?: string; rationale?: string } | undefined)
    const valueProps = (brand?.valueProps as { headline: string; description: string }[] | undefined)?.slice(0, 3) ?? []
    const channels = (gtm?.channels as { channel: string; tactics?: string[] }[] | undefined)?.slice(0, 3).map(c => c.channel).join(', ') ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? ''
    const competitors = (matrix?.competitors as { name?: string; weaknesses?: string[] }[] | undefined)?.slice(0, 3).map(c => c.name).filter(Boolean) ?? []
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Pre-seed'
    const founderBackground = profileData?.founderBackground as string ?? ''

    const prompt = `You are Maya, a brand expert. Generate structured content for a one-page investor tear sheet for ${startupName}.

AVAILABLE DATA:
- Tagline: ${tagline}
- One-liner: ${oneLiner}
- Industry: ${industry}, Stage: ${stage}
- MRR: ${mrr}, Customers: ${customers}, Runway: ${runway}
- ICP: ${icp}
- Channels: ${channels}
- Competitors: ${competitors.join(', ')}
- Fundraising: ${fundraisingRec?.amount ?? 'undisclosed'} — ${fundraisingRec?.rationale ?? ''}
- Founder: ${founderName}${founderBackground ? ` — ${founderBackground}` : ''}

Fill in missing data with compelling, plausible language based on the context.

Return JSON only (no markdown):
{
  "problemStatement": "2 sentences on the problem",
  "solution": "2 sentences on the solution",
  "traction": ["traction bullet 1", "traction bullet 2", "traction bullet 3"],
  "whyNow": "1 sentence on market timing",
  "businessModel": "how you make money",
  "marketSize": "TAM/SAM summary",
  "competitiveAdvantage": "1-2 sentences on moat",
  "theAsk": "what you're raising and what for",
  "founderCredential": "most relevant founder credential or background",
  "callToAction": "closing line for the tear sheet"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let content: Record<string, unknown> = {}
    try { content = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate one-pager content' }, { status: 500 })
    }

    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${startupName} — Investor One-Pager</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #18160F; }
  .page { max-width: 760px; margin: 0 auto; padding: 48px 48px; min-height: 100vh; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #18160F; }
  .company { }
  .company-name { font-size: 28px; font-weight: 900; color: #18160F; letter-spacing: -0.02em; }
  .company-tagline { font-size: 14px; color: #8A867C; margin-top: 4px; }
  .badges { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; padding: 4px 10px; border-radius: 999px; border: 1.5px solid #18160F; color: #18160F; }
  .metrics { text-align: right; }
  .metric-item { margin-bottom: 6px; }
  .metric-val { font-size: 18px; font-weight: 800; color: #18160F; }
  .metric-label { font-size: 10px; color: #8A867C; text-transform: uppercase; letter-spacing: 0.06em; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .section { background: #F9F7F2; border-radius: 10px; padding: 16px 18px; }
  .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8A867C; margin-bottom: 8px; }
  .section-body { font-size: 12.5px; color: #18160F; line-height: 1.65; }
  .section-full { background: #F9F7F2; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; }
  .traction-list { display: flex; flex-direction: column; gap: 5px; }
  .traction-item { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; color: #18160F; line-height: 1.5; }
  .traction-dot { width: 6px; height: 6px; border-radius: 50%; background: #16A34A; flex-shrink: 0; margin-top: 5px; }
  .ask-box { background: #18160F; border-radius: 10px; padding: 20px 22px; margin-bottom: 20px; }
  .ask-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8A867C; margin-bottom: 8px; }
  .ask-body { font-size: 14px; font-weight: 700; color: #fff; line-height: 1.5; }
  .footer { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #E2DDD5; }
  .footer-left { font-size: 11px; color: #8A867C; }
  .footer-right { font-size: 11px; color: #8A867C; font-style: italic; }
  @media print { body { } .page { padding: 32px; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="company">
      <div class="company-name">${startupName}</div>
      ${tagline ? `<div class="company-tagline">${tagline}</div>` : ''}
      <div class="badges">
        ${stage ? `<span class="badge">${stage}</span>` : ''}
        ${industry ? `<span class="badge">${industry}</span>` : ''}
      </div>
    </div>
    ${(mrr || customers || runway) ? `<div class="metrics">
      ${mrr ? `<div class="metric-item"><div class="metric-val">${mrr}</div><div class="metric-label">MRR</div></div>` : ''}
      ${customers ? `<div class="metric-item"><div class="metric-val">${customers}</div><div class="metric-label">Customers</div></div>` : ''}
      ${runway ? `<div class="metric-item"><div class="metric-val">${runway}</div><div class="metric-label">Runway</div></div>` : ''}
    </div>` : ''}
  </div>

  ${oneLiner ? `<div style="font-size:15px;font-weight:600;color:#18160F;line-height:1.6;margin-bottom:24px;padding:16px 20px;background:#EFF6FF;border-radius:10px;border-left:4px solid #2563EB;">${oneLiner}</div>` : ''}

  <div class="grid">
    <div class="section">
      <div class="section-label">The Problem</div>
      <div class="section-body">${String(content.problemStatement ?? '')}</div>
    </div>
    <div class="section">
      <div class="section-label">Our Solution</div>
      <div class="section-body">${String(content.solution ?? '')}</div>
    </div>
    <div class="section">
      <div class="section-label">Business Model</div>
      <div class="section-body">${String(content.businessModel ?? '')}</div>
    </div>
    <div class="section">
      <div class="section-label">Market Size</div>
      <div class="section-body">${String(content.marketSize ?? '')}</div>
    </div>
  </div>

  <div class="section-full">
    <div class="section-label">Traction</div>
    <div class="traction-list">
      ${((content.traction as string[] | undefined) ?? []).map(t => `<div class="traction-item"><div class="traction-dot"></div><span>${t}</span></div>`).join('')}
    </div>
  </div>

  <div class="grid">
    <div class="section">
      <div class="section-label">Why Now</div>
      <div class="section-body">${String(content.whyNow ?? '')}</div>
    </div>
    <div class="section">
      <div class="section-label">Competitive Advantage</div>
      <div class="section-body">${String(content.competitiveAdvantage ?? '')}</div>
    </div>
  </div>

  ${valueProps.length > 0 ? `<div class="section-full" style="margin-bottom:20px;">
    <div class="section-label">Why We Win</div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;">
      ${valueProps.map(vp => `<div style="flex:1;min-width:180px;background:#fff;border-radius:8px;padding:12px 14px;border:1px solid #E2DDD5;"><div style="font-size:12px;font-weight:700;color:#18160F;margin-bottom:4px;">${vp.headline}</div><div style="font-size:11px;color:#8A867C;line-height:1.5;">${vp.description}</div></div>`).join('')}
    </div>
  </div>` : ''}

  <div class="ask-box">
    <div class="ask-label">The Ask</div>
    <div class="ask-body">${String(content.theAsk ?? fundraisingRec?.amount ?? 'Raising seed round')}</div>
  </div>

  <div class="grid" style="margin-bottom:24px;">
    <div class="section">
      <div class="section-label">Team</div>
      <div class="section-body"><strong>${founderName}</strong>${content.founderCredential ? ` — ${String(content.founderCredential)}` : ''}</div>
    </div>
    ${competitors.length > 0 ? `<div class="section">
      <div class="section-label">Competitive Landscape</div>
      <div class="section-body">${competitors.join(' · ')}</div>
    </div>` : ''}
  </div>

  ${content.callToAction ? `<div style="text-align:center;font-size:14px;font-weight:700;color:#2563EB;padding:16px;background:#EFF6FF;border-radius:10px;margin-bottom:24px;">${String(content.callToAction)}</div>` : ''}

  <div class="footer">
    <div class="footer-left">${startupName} · Confidential · ${today}</div>
    <div class="footer-right">Generated by Maya (Edge Alpha)</div>
  </div>
</div>
</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'one_pager_generated',
      action_data: { startupName, hasMetrics: !!(mrr || customers) },
    }).maybeSingle()

    return NextResponse.json({ html })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
