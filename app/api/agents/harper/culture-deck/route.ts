import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/culture-deck
// No body — pulls hiring_plan + founder_profiles for context
// Returns: { html: string, deck: { mission, values[], behaviors[], antiPatterns[],
//   hiringFilters[], rituals[], remotePolicy, performancePhilosophy, growthPath } }

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

    const [{ data: hiringArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const hiring = hiringArt?.content as Record<string, unknown> | null
    const teamSize = (hiring?.currentTeam as { headcount?: number } | undefined)?.headcount ?? 'early stage'
    const keyRoles = (hiring?.hiringPriorities as string[] | undefined)?.slice(0, 3).join(', ') ?? ''

    const prompt = `You are Harper, a talent strategist. Create a culture deck for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
TEAM SIZE: ${teamSize}
HIRING FOR: ${keyRoles || 'key roles'}

Build a compelling, authentic culture deck that attracts top talent and sets expectations clearly. Think Stripe/Netflix/Notion style — honest, specific, no corporate fluff.

Return JSON only (no markdown):
{
  "mission": "1-2 sentence company mission that excites candidates",
  "cultureHeadline": "punchy headline for the culture (e.g. 'We build for the long game')",
  "values": [
    {
      "value": "value name (2-3 words)",
      "description": "what this means in practice",
      "looksLike": "concrete example behavior that embodies this",
      "doesntLookLike": "concrete example of what violates this value"
    }
  ],
  "hiringFilters": [
    "characteristic we always hire for 1",
    "characteristic 2",
    "characteristic 3"
  ],
  "antiPatterns": [
    "behavior or trait that doesn't work here 1",
    "anti-pattern 2",
    "anti-pattern 3"
  ],
  "rituals": [
    { "ritual": "team practice name", "frequency": "how often", "purpose": "why we do this" }
  ],
  "remotePolicy": "work style policy (remote-first, hybrid, in-office) with specifics",
  "performancePhilosophy": "how we think about performance, feedback, and growth",
  "growthPath": "what career growth looks like here — be honest about what stage allows",
  "compensationPhilosophy": "approach to comp (market rate, equity focus, etc.)",
  "interviewProcess": "what candidates can expect — be honest about the process",
  "notForYouIf": [
    "this role/company is NOT a fit if you... 1",
    "not a fit if... 2"
  ],
  "closingStatement": "1-2 sentences that inspire the right candidate to apply"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let deck: Record<string, unknown> = {}
    try { deck = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate culture deck' }, { status: 500 })
    }

    // Generate HTML culture deck
    const values = (deck.values as { value: string; description: string; looksLike: string; doesntLookLike: string }[] | undefined) ?? []
    const rituals = (deck.rituals as { ritual: string; frequency: string; purpose: string }[] | undefined) ?? []
    const hiringFilters = (deck.hiringFilters as string[] | undefined) ?? []
    const antiPatterns = (deck.antiPatterns as string[] | undefined) ?? []
    const notForYouIf = (deck.notForYouIf as string[] | undefined) ?? []

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${startupName} — Culture Deck</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #18160F; color: #F9F7F2; }
  .slide { min-height: 100vh; padding: 80px; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid #2a2720; }
  .slide:nth-child(odd) { background: #18160F; }
  .slide:nth-child(even) { background: #1e1c15; }
  h1 { font-size: 48px; font-weight: 800; line-height: 1.1; }
  h2 { font-size: 32px; font-weight: 700; margin-bottom: 32px; color: #D97706; }
  h3 { font-size: 20px; font-weight: 700; margin-bottom: 12px; }
  p { font-size: 18px; line-height: 1.6; color: #C4BFB6; max-width: 720px; }
  .label { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #8A867C; margin-bottom: 12px; }
  .value-card { background: #25231C; border: 1px solid #2a2720; border-radius: 16px; padding: 32px; margin-bottom: 24px; }
  .value-name { font-size: 24px; font-weight: 800; color: #F9F7F2; margin-bottom: 8px; }
  .value-desc { font-size: 16px; color: #C4BFB6; margin-bottom: 16px; }
  .eg { font-size: 14px; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; }
  .eg-yes { background: #0f2a1a; border: 1px solid #16A34A44; color: #4ADE80; }
  .eg-no { background: #2a0f0f; border: 1px solid #DC262644; color: #F87171; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; margin-top: 24px; }
  .chip { display: inline-block; padding: 8px 16px; border-radius: 24px; font-size: 14px; font-weight: 600; background: #25231C; border: 1px solid #2a2720; margin: 4px; }
  .ritual-row { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 16px; }
  .ritual-badge { font-size: 12px; font-weight: 700; color: #D97706; background: #2a1f0f; border: 1px solid #D97706; border-radius: 6px; padding: 4px 10px; white-space: nowrap; }
  .warning { color: #F87171; font-size: 14px; margin-bottom: 8px; }
  .footer { font-size: 14px; color: #8A867C; margin-top: 32px; }
</style>
</head>
<body>

<div class="slide" style="background: linear-gradient(135deg, #18160F 0%, #1a1800 100%);">
  <div class="label">${startupName}</div>
  <h1 style="font-size: 64px; margin-bottom: 24px;">${deck.cultureHeadline ?? 'Culture Deck'}</h1>
  <p style="font-size: 20px;">${deck.mission ?? ''}</p>
</div>

<div class="slide">
  <div class="label">Our Values</div>
  <h2>What we actually believe</h2>
  ${values.map(v => `
  <div class="value-card">
    <div class="value-name">${v.value}</div>
    <div class="value-desc">${v.description}</div>
    <div class="eg eg-yes">✓ ${v.looksLike}</div>
    <div class="eg eg-no">✗ ${v.doesntLookLike}</div>
  </div>`).join('')}
</div>

<div class="slide">
  <div class="label">Who We Hire</div>
  <h2>What we always look for</h2>
  <div style="display: flex; flex-wrap: wrap; margin-bottom: 32px;">
    ${hiringFilters.map(f => `<span class="chip" style="border-color: #16A34A44; color: #4ADE80;">✓ ${f}</span>`).join('')}
  </div>
  <h3 style="color: #F87171; margin-bottom: 16px;">What doesn't work here</h3>
  <div>
    ${antiPatterns.map(a => `<p class="warning">✗ ${a}</p>`).join('')}
  </div>
</div>

<div class="slide">
  <div class="label">How We Work</div>
  <h2>Our rituals &amp; practices</h2>
  ${rituals.map(r => `
  <div class="ritual-row">
    <span class="ritual-badge">${r.frequency}</span>
    <div>
      <h3 style="font-size: 16px; color: #F9F7F2;">${r.ritual}</h3>
      <p style="font-size: 14px; color: #8A867C;">${r.purpose}</p>
    </div>
  </div>`).join('')}
  <div style="margin-top: 32px; padding: 24px; background: #25231C; border-radius: 12px; border: 1px solid #2a2720;">
    <div class="label">Work Style</div>
    <p style="font-size: 16px;">${deck.remotePolicy ?? ''}</p>
  </div>
</div>

<div class="slide">
  <div class="label">Growth &amp; Performance</div>
  <h2>How we grow together</h2>
  <div style="padding: 24px; background: #25231C; border-radius: 12px; border: 1px solid #2a2720; margin-bottom: 24px;">
    <div class="label">Performance Philosophy</div>
    <p style="font-size: 16px;">${deck.performancePhilosophy ?? ''}</p>
  </div>
  <div style="padding: 24px; background: #25231C; border-radius: 12px; border: 1px solid #2a2720; margin-bottom: 24px;">
    <div class="label">Career Growth</div>
    <p style="font-size: 16px;">${deck.growthPath ?? ''}</p>
  </div>
  <div style="padding: 24px; background: #25231C; border-radius: 12px; border: 1px solid #2a2720;">
    <div class="label">Compensation</div>
    <p style="font-size: 16px;">${deck.compensationPhilosophy ?? ''}</p>
  </div>
</div>

<div class="slide">
  <div class="label">Honest Transparency</div>
  <h2>This is NOT for you if…</h2>
  ${notForYouIf.map(n => `<div style="padding: 16px 20px; background: #2a0f0f; border: 1px solid #DC262644; border-radius: 10px; margin-bottom: 12px; font-size: 16px; color: #F87171;">${n}</div>`).join('')}
  <div style="margin-top: 32px; padding: 24px; background: #0f2a1a; border: 1px solid #16A34A44; border-radius: 12px;">
    <div class="label">Our Interview Process</div>
    <p style="font-size: 16px;">${deck.interviewProcess ?? ''}</p>
  </div>
</div>

<div class="slide" style="background: linear-gradient(135deg, #0f2a1a 0%, #18160F 100%);">
  <div class="label">Join Us</div>
  <h1 style="color: #4ADE80; margin-bottom: 24px;">Ready to build?</h1>
  <p style="font-size: 20px;">${deck.closingStatement ?? ''}</p>
  <p class="footer" style="margin-top: 48px;">Generated by Harper for ${startupName} · ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
</div>

</body>
</html>`

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'culture_deck_generated',
      action_data: { startupName, valueCount: values.length },
    }).maybeSingle()

    return NextResponse.json({ deck, html })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
