import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

const NETLIFY_API = 'https://api.netlify.com/api/v1'

// POST /api/agents/landingpage/deploy
// Body: { artifactType, artifactContent, siteName, agentId, artifactId }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const NETLIFY_API_KEY = process.env.NETLIFY_API_KEY
    if (!NETLIFY_API_KEY) return NextResponse.json({ error: 'NETLIFY_API_KEY not configured' }, { status: 503 })

    const { artifactType, artifactContent, siteName, agentId, artifactId } = await request.json()
    if (!artifactContent || !siteName) return NextResponse.json({ error: 'artifactContent and siteName required' }, { status: 400 })

    // Fetch founder profile for branding
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, tagline, industry')
      .eq('user_id', user.id)
      .single()

    // Generate HTML
    const html = artifactType === 'brand_messaging'
      ? buildWebsiteHtml(artifactContent, profile, siteName)
      : buildLandingPageHtml(artifactContent, profile, siteName)

    const slug = siteName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 32)

    // Check if we already have a site for this artifact
    const { data: existing } = await supabase
      .from('deployed_sites')
      .select('netlify_site_id, url')
      .eq('user_id', user.id)
      .eq('artifact_id', artifactId ?? '')
      .maybeSingle()

    let siteId = existing?.netlify_site_id
    let siteUrl = existing?.url

    // Create site if none exists
    if (!siteId) {
      const createRes = await fetch(`${NETLIFY_API}/sites`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NETLIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: `${slug}-${Date.now()}` }),
      })
      if (!createRes.ok) {
        const err = await createRes.text()
        console.error('Netlify create site error:', err)
        return NextResponse.json({ error: 'Failed to create Netlify site' }, { status: 502 })
      }
      const site = await createRes.json()
      siteId = site.id
      siteUrl = site.ssl_url || site.url
    }

    // Deploy via Files API (hash + upload)
    const htmlBytes = Buffer.from(html, 'utf-8')
    const htmlHash  = crypto.createHash('sha1').update(htmlBytes).digest('hex')

    const deployRes = await fetch(`${NETLIFY_API}/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NETLIFY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ files: { '/index.html': htmlHash } }),
    })
    if (!deployRes.ok) {
      const err = await deployRes.text()
      console.error('Netlify deploy error:', err)
      return NextResponse.json({ error: 'Failed to create deploy' }, { status: 502 })
    }
    const deploy = await deployRes.json()

    // Upload the file if required
    if (deploy.required?.includes(htmlHash) || deploy.required_functions?.length >= 0) {
      const uploadRes = await fetch(`${NETLIFY_API}/deploys/${deploy.id}/files/index.html`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${NETLIFY_API_KEY}`,
          'Content-Type': 'application/octet-stream',
        },
        body: htmlBytes,
      })
      if (!uploadRes.ok) {
        console.error('Netlify upload error:', await uploadRes.text())
      }
    }

    const liveUrl = siteUrl || `https://${siteId}.netlify.app`

    // Upsert into deployed_sites
    if (existing) {
      await supabase.from('deployed_sites')
        .update({ url: liveUrl, netlify_site_id: siteId, updated_at: new Date().toISOString() })
        .eq('user_id', user.id).eq('artifact_id', artifactId ?? '')
    } else {
      await supabase.from('deployed_sites').insert({
        user_id:        user.id,
        artifact_id:    artifactId ?? null,
        site_name:      siteName,
        netlify_site_id: siteId,
        url:            liveUrl,
        deploy_type:    artifactType === 'brand_messaging' ? 'website' : 'landing_page',
      })
    }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id:     user.id,
        agent_id:    agentId ?? 'patel',
        action_type: 'deploy_site',
        description: `Deployed ${artifactType === 'brand_messaging' ? 'website' : 'landing page'} to ${liveUrl}`,
        metadata:    { url: liveUrl, site_id: siteId, artifact_id: artifactId },
      })
    } catch {}

    return NextResponse.json({ url: liveUrl, siteId, deployId: deploy.id })
  } catch (err) {
    console.error('Landingpage deploy error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agents/landingpage/deploy?artifactId=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const artifactId = request.nextUrl.searchParams.get('artifactId')
    if (!artifactId) return NextResponse.json({ site: null })
    const { data } = await supabase
      .from('deployed_sites')
      .select('url, netlify_site_id, deploy_type, deployed_at')
      .eq('user_id', user.id)
      .eq('artifact_id', artifactId)
      .maybeSingle()
    return NextResponse.json({ site: data })
  } catch {
    return NextResponse.json({ site: null })
  }
}

// ─── HTML generators ──────────────────────────────────────────────────────────

function buildLandingPageHtml(content: Record<string, unknown>, profile: Record<string, unknown> | null, siteName: string): string {
  const icp     = content.icp     as Record<string, unknown> | undefined
  const pos     = content.positioning as Record<string, unknown> | undefined
  const msgs    = (content.messaging as { audience?: string; headline?: string; valueProps?: string[] }[] | undefined) ?? []
  const metrics = (content.metrics   as { metric?: string; target?: string }[] | undefined) ?? []

  const headline     = pos?.statement as string || (msgs[0]?.headline as string) || `${siteName} — The Future is Here`
  const subheadline  = profile?.tagline as string || 'Built for the teams that move fast'
  const icpSummary   = icp?.summary   as string || ''
  const differentiators = pos?.differentiators as string[] || []
  const valueProps   = msgs.flatMap(m => m.valueProps ?? []).slice(0, 3)
  const startupName  = profile?.startup_name as string || siteName

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(startupName)}</title>
<meta name="description" content="${esc(subheadline)}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0A0A0A;color:#F9F7F2;line-height:1.6}
a{color:inherit;text-decoration:none}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;background:linear-gradient(180deg,#0A0A0A 0%,#0F0F0F 100%)}
.hero h1{font-size:clamp(32px,6vw,68px);font-weight:800;line-height:1.1;max-width:800px;margin-bottom:20px;letter-spacing:-0.02em}
.hero .sub{font-size:clamp(16px,2vw,22px);color:#8A867C;max-width:580px;margin:0 auto 36px}
.cta{display:inline-flex;align-items:center;gap:10px;padding:14px 32px;background:#2563EB;color:#fff;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;border:none;transition:background .2s}
.cta:hover{background:#1D4ED8}
.badge{display:inline-block;padding:4px 12px;background:rgba(37,99,235,.15);border:1px solid rgba(37,99,235,.3);color:#93C5FD;border-radius:20px;font-size:12px;font-weight:600;margin-bottom:24px;letter-spacing:.06em}
section{max-width:1000px;margin:0 auto;padding:80px 24px}
.section-title{font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.14em;margin-bottom:16px}
h2{font-size:clamp(24px,3vw,40px);font-weight:700;margin-bottom:16px;line-height:1.2}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-top:32px}
.card{background:#111;border:1px solid #1E1E1E;border-radius:12px;padding:24px}
.card h3{font-size:16px;font-weight:700;margin-bottom:8px}
.card p{font-size:14px;color:#8A867C}
.metrics{display:flex;gap:40px;flex-wrap:wrap;margin-top:32px}
.metric{text-align:center}
.metric .num{font-size:40px;font-weight:800;color:#2563EB}
.metric .label{font-size:13px;color:#8A867C}
footer{border-top:1px solid #1E1E1E;padding:32px 24px;text-align:center;color:#8A867C;font-size:13px}
@media(max-width:640px){.metrics{gap:24px} .metric .num{font-size:32px}}
</style>
</head>
<body>
<!-- Hero -->
<div class="hero">
  <span class="badge">${esc(profile?.industry as string || 'SAAS')}</span>
  <h1>${esc(headline)}</h1>
  <p class="sub">${esc(subheadline)}</p>
  <button class="cta" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Get Early Access →</button>
</div>

${icpSummary ? `
<!-- Problem -->
<section>
  <div class="section-title">The Problem</div>
  <h2>Sound familiar?</h2>
  <p style="font-size:18px;color:#8A867C;max-width:640px">${esc(icpSummary)}</p>
</section>` : ''}

${valueProps.length > 0 ? `
<!-- Solution -->
<section style="background:#0D0D0D">
  <div style="max-width:1000px;margin:0 auto">
    <div class="section-title">The Solution</div>
    <h2>${esc(startupName)} handles this differently</h2>
    <div class="cards">
      ${valueProps.map(vp => `<div class="card"><h3>✓</h3><p>${esc(String(vp))}</p></div>`).join('')}
    </div>
  </div>
</section>` : ''}

${differentiators.length > 0 ? `
<!-- Differentiators -->
<section>
  <div class="section-title">Why Us</div>
  <h2>Built different from day one</h2>
  <div class="cards">
    ${differentiators.slice(0, 3).map(d => `<div class="card"><h3>→</h3><p>${esc(String(d))}</p></div>`).join('')}
  </div>
</section>` : ''}

${metrics.length > 0 ? `
<!-- Metrics -->
<section style="background:#0D0D0D;text-align:center">
  <div style="max-width:1000px;margin:0 auto">
    <div class="section-title">Traction</div>
    <div class="metrics" style="justify-content:center">
      ${metrics.slice(0, 4).map(m => `<div class="metric"><div class="num">${esc(String(m.target || '—'))}</div><div class="label">${esc(String(m.metric || ''))}</div></div>`).join('')}
    </div>
  </div>
</section>` : ''}

<!-- CTA -->
<section id="contact" style="text-align:center">
  <div class="section-title">Get Started</div>
  <h2>Ready to move faster?</h2>
  <p style="color:#8A867C;font-size:18px;margin-bottom:32px;max-width:500px;margin-left:auto;margin-right:auto">Join the waitlist. We&rsquo;re onboarding founders now.</p>
  <form onsubmit="handleSubmit(event)" style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <input id="email" type="email" placeholder="your@email.com" required style="padding:12px 16px;border-radius:8px;border:1px solid #2D2D2D;background:#111;color:#F9F7F2;font-size:15px;width:260px">
    <button type="submit" class="cta">Join Waitlist</button>
  </form>
  <p id="msg" style="margin-top:16px;color:#2563EB;display:none">You&rsquo;re on the list! We&rsquo;ll be in touch.</p>
</section>

<footer>
  <p>© ${new Date().getFullYear()} ${esc(startupName)}. Built with Edge Alpha.</p>
</footer>
<script>
function handleSubmit(e){e.preventDefault();document.getElementById('msg').style.display='block';e.target.style.display='none'}
</script>
</body>
</html>`
}

function buildWebsiteHtml(content: Record<string, unknown>, profile: Record<string, unknown> | null, siteName: string): string {
  const pos     = content.positioningStatement as string || ''
  const taglines = (content.taglines as { tagline: string }[] | undefined) ?? []
  const elevatorPitch = content.elevatorPitch as Record<string, string> | undefined
  const valueProps = (content.valueProps as { headline: string; description: string }[] | undefined) ?? []
  const voiceGuide = content.voiceGuide as Record<string, string[]> | undefined

  const headline    = taglines[0]?.tagline || profile?.startup_name as string || siteName
  const subheadline = elevatorPitch?.oneLiner || pos || 'Building the future, one feature at a time'
  const startupName = profile?.startup_name as string || siteName

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(startupName)}</title>
<meta name="description" content="${esc(subheadline)}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0A0A0A;color:#F9F7F2;line-height:1.6}
.hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px}
.hero h1{font-size:clamp(36px,7vw,80px);font-weight:900;line-height:1.05;max-width:900px;margin-bottom:20px;letter-spacing:-0.03em;background:linear-gradient(135deg,#fff 0%,#8A867C 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.hero .sub{font-size:clamp(16px,2.2vw,22px);color:#8A867C;max-width:600px;margin:0 auto 40px}
.cta{display:inline-flex;gap:8px;padding:15px 32px;background:#2563EB;color:#fff;border-radius:10px;font-size:16px;font-weight:700;border:none;cursor:pointer}
section{max-width:1000px;margin:0 auto;padding:80px 24px}
.label{font-size:11px;font-weight:700;color:#2563EB;text-transform:uppercase;letter-spacing:.14em;margin-bottom:12px}
h2{font-size:clamp(24px,3.5vw,44px);font-weight:800;margin-bottom:20px;line-height:1.15;letter-spacing:-0.02em}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-top:28px}
.card{background:#0F0F0F;border:1px solid #1A1A1A;border-radius:14px;padding:28px}
.card h3{font-size:15px;font-weight:700;margin-bottom:8px;color:#fff}
.card p{font-size:14px;color:#6B6B6B;line-height:1.65}
.pos{background:#0D1117;border:1px solid #1E293B;border-radius:14px;padding:28px;font-size:17px;font-style:italic;line-height:1.7;color:#CBD5E1;max-width:700px;margin:0 auto}
footer{border-top:1px solid #1E1E1E;padding:32px;text-align:center;color:#4B4B4B;font-size:13px}
nav{position:fixed;top:0;left:0;right:0;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;background:rgba(10,10,10,.85);backdrop-filter:blur(12px);border-bottom:1px solid #1A1A1A;z-index:100}
nav .logo{font-weight:800;font-size:18px}
.voice{display:flex;flex-direction:column;gap:10px;margin-top:24px}
.voice-item{padding:12px 16px;background:#0F0F0F;border-radius:8px;font-size:14px;color:#8A867C}
</style>
</head>
<body>
<nav>
  <div class="logo">${esc(startupName)}</div>
  <button class="cta" style="padding:9px 20px;font-size:14px" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Get Started</button>
</nav>

<div class="hero" style="padding-top:80px">
  <h1>${esc(headline)}</h1>
  <p class="sub">${esc(subheadline)}</p>
  <button class="cta" onclick="document.getElementById('contact').scrollIntoView({behavior:'smooth'})">Start for free →</button>
</div>

${pos ? `
<section style="text-align:center">
  <div class="label">Our Mission</div>
  <div class="pos">${esc(pos)}</div>
</section>` : ''}

${valueProps.length > 0 ? `
<section style="background:#060606">
  <div style="max-width:1000px;margin:0 auto">
    <div class="label">Why ${esc(startupName)}</div>
    <h2>Everything you need, nothing you don&rsquo;t</h2>
    <div class="grid">
      ${valueProps.slice(0, 6).map(vp => `<div class="card"><h3>${esc(vp.headline)}</h3><p>${esc(vp.description)}</p></div>`).join('')}
    </div>
  </div>
</section>` : ''}

${voiceGuide?.doSay && voiceGuide.doSay.length > 0 ? `
<section>
  <div class="label">What we believe</div>
  <h2>Our principles</h2>
  <div class="voice">
    ${voiceGuide.doSay.slice(0, 4).map(v => `<div class="voice-item">→ ${esc(String(v))}</div>`).join('')}
  </div>
</section>` : ''}

<section id="contact" style="text-align:center;background:#060606">
  <div class="label">Get Access</div>
  <h2>Join the waitlist</h2>
  <p style="color:#6B6B6B;font-size:17px;margin-bottom:32px">We&rsquo;re onboarding early customers now.</p>
  <form onsubmit="handleSubmit(event)" style="display:inline-flex;gap:12px;flex-wrap:wrap;justify-content:center">
    <input id="email" type="email" placeholder="you@startup.com" required style="padding:13px 18px;border-radius:8px;border:1px solid #2D2D2D;background:#111;color:#fff;font-size:15px;width:280px">
    <button type="submit" class="cta">Join Waitlist</button>
  </form>
  <p id="msg" style="margin-top:16px;color:#2563EB;display:none">You&rsquo;re in. We&rsquo;ll be in touch soon.</p>
</section>

<footer>© ${new Date().getFullYear()} ${esc(startupName)}. Powered by Edge Alpha.</footer>
<script>
function handleSubmit(e){e.preventDefault();document.getElementById('msg').style.display='block';e.target.style.display='none'}
</script>
</body>
</html>`
}

function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
