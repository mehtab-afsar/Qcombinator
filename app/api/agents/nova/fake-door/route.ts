import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// POST /api/agents/nova/fake-door
// Body: { featureName, tagline, description, ctaText, artifactId }
// Deploys a fake-door test landing page to Netlify and returns the live URL

function buildFakeDoorHtml(params: {
  featureName: string
  tagline: string
  description: string
  ctaText: string
  testId: string
  userId: string
  origin: string
}): string {
  const { featureName, tagline, description, ctaText, testId, userId, origin } = params

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${featureName}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, system-ui, sans-serif; background: #F9F7F2; color: #18160F; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
  .card { background: white; border: 1px solid #E2DDD5; border-radius: 20px; padding: 56px 48px; max-width: 540px; width: 100%; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,0.06); }
  .badge { display: inline-block; padding: 4px 14px; background: #F0FDF4; color: #16A34A; border: 1px solid #BBF7D0; border-radius: 999px; font-size: 12px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 24px; }
  h1 { font-size: clamp(1.8rem, 5vw, 2.4rem); font-weight: 700; line-height: 1.2; margin-bottom: 16px; color: #18160F; }
  .tagline { font-size: 18px; color: #8A867C; line-height: 1.6; margin-bottom: 40px; font-weight: 300; }
  .desc { font-size: 15px; color: #18160F; line-height: 1.7; margin-bottom: 40px; background: #F9F7F2; border-radius: 12px; padding: 20px 24px; text-align: left; border: 1px solid #E2DDD5; }
  form { display: flex; flex-direction: column; gap: 12px; }
  input { padding: 14px 16px; border: 1px solid #E2DDD5; border-radius: 10px; font-size: 15px; color: #18160F; font-family: inherit; outline: none; transition: border-color .15s; }
  input:focus { border-color: #2563EB; }
  button[type=submit] { padding: 15px; background: #18160F; color: #F9F7F2; border: none; border-radius: 10px; font-size: 16px; font-weight: 600; cursor: pointer; font-family: inherit; transition: opacity .15s; }
  button[type=submit]:hover { opacity: 0.85; }
  button[type=submit]:disabled { opacity: 0.5; cursor: not-allowed; }
  .success { display: none; text-align: center; padding: 20px; }
  .success h2 { font-size: 24px; font-weight: 700; margin-bottom: 10px; }
  .success p { color: #8A867C; font-size: 15px; }
  .count-note { font-size: 12px; color: #8A867C; margin-top: 16px; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">Early Access</div>
  <h1>${featureName}</h1>
  <p class="tagline">${tagline}</p>
  <div class="desc">${description}</div>
  <div id="form-wrap">
    <form id="waitlist-form">
      <input type="text" name="name" placeholder="Your name" required>
      <input type="email" name="email" placeholder="Work email" required>
      <button type="submit" id="submit-btn">${ctaText}</button>
    </form>
    <p class="count-note">Join hundreds of founders already on the list</p>
  </div>
  <div class="success" id="success-msg">
    <h2>You're on the list!</h2>
    <p>We'll reach out as soon as ${featureName} is ready. Stay tuned.</p>
  </div>
</div>
<script>
document.getElementById('waitlist-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Joining…';
  const data = {
    testId: '${testId}',
    userId: '${userId}',
    email: this.email.value,
    name: this.name.value,
    source: document.referrer || 'direct',
  };
  try {
    await fetch('${origin}/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (err) { console.error(err); }
  document.getElementById('form-wrap').style.display = 'none';
  document.getElementById('success-msg').style.display = 'block';
});
</script>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { featureName, tagline, description, ctaText = 'Join the waitlist', artifactId } = await request.json()
    if (!featureName || !tagline) {
      return NextResponse.json({ error: 'featureName and tagline are required' }, { status: 400 })
    }

    const NETLIFY_API_KEY = process.env.NETLIFY_API_KEY
    if (!NETLIFY_API_KEY) {
      return NextResponse.json({ error: 'NETLIFY_API_KEY not configured' }, { status: 500 })
    }

    const origin = request.nextUrl.origin
    const testId = artifactId ?? crypto.randomUUID()

    const html = buildFakeDoorHtml({
      featureName, tagline,
      description: description ?? tagline,
      ctaText,
      testId,
      userId: user.id,
      origin,
    })

    // Create Netlify site
    const siteName = `fake-door-${featureName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30)}-${Date.now()}`
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NETLIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: siteName }),
    })
    if (!siteRes.ok) {
      return NextResponse.json({ error: 'Failed to create Netlify site' }, { status: 500 })
    }
    const site = await siteRes.json() as { id: string; ssl_url?: string; default_domain?: string }
    const siteId = site.id

    // Deploy via Files API
    const htmlBytes = Buffer.from(html, 'utf-8')
    const sha1 = createHash('sha1').update(htmlBytes).digest('hex')

    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${NETLIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { '/index.html': sha1 } }),
    })
    if (!deployRes.ok) {
      return NextResponse.json({ error: 'Failed to create deploy' }, { status: 500 })
    }
    const deploy = await deployRes.json() as { id: string; required: string[] }

    if (deploy.required?.includes(sha1)) {
      await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${NETLIFY_API_KEY}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': htmlBytes.length.toString(),
        },
        body: htmlBytes,
      })
    }

    const liveUrl = site.ssl_url ?? `https://${site.default_domain}`

    // Log to deployed_sites
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    try {
      await adminClient.from('deployed_sites').insert({
        user_id: user.id,
        artifact_id: artifactId ?? null,
        site_name: siteName,
        netlify_site_id: siteId,
        url: liveUrl,
        deploy_type: 'fake_door',
      })
    } catch { /* non-critical */ }

    try {
      await adminClient.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'nova',
        action_type: 'fake_door_deployed',
        description: `Fake door test "${featureName}" deployed`,
        metadata: { featureName, url: liveUrl, testId },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({ url: liveUrl, testId, siteId })
  } catch (err) {
    console.error('Nova fake door error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/agents/nova/fake-door?artifactId=xxx — check existing deployment
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const artifactId = request.nextUrl.searchParams.get('artifactId')
    if (!artifactId) return NextResponse.json({ site: null })

    const { data } = await supabase
      .from('deployed_sites')
      .select('url, netlify_site_id, deployed_at')
      .eq('user_id', user.id)
      .eq('artifact_id', artifactId)
      .eq('deploy_type', 'fake_door')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({ site: data ?? null })
  } catch {
    return NextResponse.json({ site: null })
  }
}
