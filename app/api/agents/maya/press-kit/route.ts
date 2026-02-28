import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/press-kit
// Generates a downloadable HTML press kit from brand_messaging artifact + founder profile.
// Includes: company boilerplate, founder bio, key stats, product description,
// logo usage guidelines, and media contact info.

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

function esc(s: string) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    // Fetch brand messaging artifact
    const { data: brandArtifact } = await admin
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('agent_id', 'maya')
      .eq('artifact_type', 'brand_messaging')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fetch financial summary for key stats
    const { data: finArtifact } = await admin
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('agent_id', 'felix')
      .eq('artifact_type', 'financial_summary')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fetch founder profile
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('startup_name, full_name, tagline, industry, startup_profile_data')
      .eq('user_id', user.id)
      .single()

    const sp   = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const brand = (brandArtifact?.content ?? {}) as Record<string, unknown>
    const fin   = (finArtifact?.content ?? {}) as Record<string, unknown>

    const context = [
      `Company: ${fp?.startup_name ?? 'Unknown'}`,
      fp?.tagline ? `Tagline: ${fp.tagline}` : '',
      fp?.industry ? `Industry: ${fp.industry}` : '',
      brand.positioningStatement ? `Positioning: ${brand.positioningStatement}` : '',
      brand.elevatorPitch ? `Elevator pitch: ${brand.elevatorPitch}` : '',
      brand.brandVoice ? `Brand voice: ${brand.brandVoice}` : '',
      Array.isArray(brand.taglines) ? `Taglines: ${(brand.taglines as string[]).join(' | ')}` : '',
      fp?.full_name ? `Founder: ${fp.full_name}` : '',
      (sp.founderBio as string) ? `Founder bio: ${sp.founderBio}` : '',
      (fin.mrr as string) ? `MRR: ${fin.mrr}` : '',
      (fin.customers as string) ? `Customers: ${fin.customers}` : '',
      (sp.founded as string) ? `Founded: ${sp.founded}` : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Maya, a brand strategist. Generate press kit content for a startup.
Return ONLY valid JSON:
{
  "companyBoilerplate": "3-sentence company description for press (who you are, what you do, why you exist)",
  "founderBio": "2-3 sentence founder bio in third person for press",
  "productDescription": "2-sentence product description for journalists",
  "keyStats": ["3-5 impressive facts/stats about the company (use real data if given, otherwise use 'XX' as placeholder)"],
  "missionStatement": "1 sentence mission",
  "mediaContact": { "name": "Founder or PR contact name", "email": "media@company.com (use placeholder if unknown)", "title": "appropriate title" },
  "logoGuidelines": ["3-4 logo/brand usage guidelines (colours, spacing, don'ts)"],
  "recentNews": ["1-2 recent milestones or announcements to highlight"],
  "talkingPoints": ["3 key talking points for media interviews"]
}`,
        },
        { role: 'user', content: `Generate press kit for:\n${context}` },
      ],
      { maxTokens: 900, temperature: 0.45 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let pk: Record<string, unknown>
    try { pk = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { pk = m ? JSON.parse(m[0]) : {} } catch { pk = {} } }

    const companyName = fp?.startup_name ?? 'Company'
    const founderName = fp?.full_name ?? ''

    // Build HTML press kit
    const keyStats   = (pk.keyStats as string[] ?? []).map(s => `<li style="padding:6px 0;border-bottom:1px solid #E2DDD5;font-size:13px;color:#18160F">${esc(s)}</li>`).join('')
    const talkPts    = (pk.talkingPoints as string[] ?? []).map((t, i) => `<div style="display:flex;gap:12px;margin-bottom:12px"><span style="width:24px;height:24px;border-radius:50%;background:#18160F;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0">${i+1}</span><p style="font-size:13px;color:#18160F;line-height:1.6">${esc(t)}</p></div>`).join('')
    const logoGuides = (pk.logoGuidelines as string[] ?? []).map(g => `<p style="font-size:12px;color:#8A867C;padding:5px 0;border-bottom:1px solid #F0EDE6">• ${esc(g)}</p>`).join('')
    const recentNews = (pk.recentNews as string[] ?? []).map(n => `<div style="background:#F0FDF4;border-left:3px solid #16A34A;padding:10px 14px;margin-bottom:8px;border-radius:0 6px 6px 0"><p style="font-size:12px;color:#18160F">${esc(n)}</p></div>`).join('')

    const mc = (pk.mediaContact as Record<string, string> | undefined) ?? {}

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${esc(companyName)} Press Kit</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; }
.page { max-width: 800px; margin: 0 auto; }
.hero { background: #18160F; color: #fff; padding: 56px 48px; }
.hero h1 { font-size: 36px; font-weight: 800; margin-bottom: 8px; }
.hero p { font-size: 14px; color: #8A867C; }
.badge { display: inline-block; background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.7); font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; padding: 4px 10px; border-radius: 4px; margin-bottom: 16px; }
.section { padding: 40px 48px; border-bottom: 1px solid #E2DDD5; }
.section h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #8A867C; margin-bottom: 16px; }
.contact-box { background: #EFF6FF; border-radius: 10px; padding: 20px 24px; border: 1px solid #BFDBFE; }
.contact-box p { font-size: 13px; color: #18160F; line-height: 1.8; }
.contact-box strong { color: #2563EB; }
footer { padding: 24px 48px; background: #F0EDE6; }
footer p { font-size: 11px; color: #8A867C; }
@media print { body { background: #fff; } }
</style>
</head>
<body>
<div class="page">
  <div class="hero">
    <div class="badge">Press Kit · ${new Date().getFullYear()}</div>
    <h1>${esc(companyName)}</h1>
    ${fp?.tagline ? `<p style="font-size:16px;color:rgba(255,255,255,0.7);margin-top:8px">${esc(fp.tagline)}</p>` : ''}
  </div>

  <div class="section">
    <h2>About ${esc(companyName)}</h2>
    <p style="font-size:14px;line-height:1.8;color:#18160F">${esc(String(pk.companyBoilerplate ?? ''))}</p>
    ${pk.missionStatement ? `<p style="font-size:13px;color:#8A867C;margin-top:14px;font-style:italic">${esc(String(pk.missionStatement))}</p>` : ''}
  </div>

  ${pk.productDescription ? `<div class="section">
    <h2>The Product</h2>
    <p style="font-size:14px;line-height:1.8;color:#18160F">${esc(String(pk.productDescription))}</p>
  </div>` : ''}

  ${keyStats ? `<div class="section">
    <h2>Key Facts & Stats</h2>
    <ul style="list-style:none">${keyStats}</ul>
  </div>` : ''}

  ${recentNews ? `<div class="section">
    <h2>Recent News</h2>
    ${recentNews}
  </div>` : ''}

  ${talkPts ? `<div class="section">
    <h2>Key Talking Points</h2>
    ${talkPts}
  </div>` : ''}

  ${pk.founderBio ? `<div class="section">
    <h2>Founder${founderName ? ' — ' + esc(founderName) : ''}</h2>
    <p style="font-size:14px;line-height:1.8;color:#18160F">${esc(String(pk.founderBio))}</p>
  </div>` : ''}

  ${logoGuides ? `<div class="section">
    <h2>Logo & Brand Usage</h2>
    ${logoGuides}
  </div>` : ''}

  <div class="section" style="border-bottom:none">
    <h2>Media Contact</h2>
    <div class="contact-box">
      <p><strong>${esc(mc.name ?? founderName ?? companyName)}</strong><br>
      ${mc.title ? esc(mc.title) + '<br>' : ''}
      <a href="mailto:${esc(mc.email ?? '')}" style="color:#2563EB">${esc(mc.email ?? 'media@' + companyName.toLowerCase().replace(/\s+/g, '') + '.com')}</a></p>
    </div>
  </div>

  <footer>
    <p>${esc(companyName)} · Confidential for press use · Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    <p style="margin-top:4px">Print or save as PDF: Ctrl/Cmd + P</p>
  </footer>
</div>
</body>
</html>`

    // Log activity
    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'maya',
      action_type: 'press_kit_generated',
      description: `Press kit generated for ${companyName}`,
      metadata:    { companyName },
    })

    return NextResponse.json({ html, pressKit: pk })
  } catch (err) {
    console.error('Maya press-kit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
