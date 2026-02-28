import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

// POST /api/agents/maya/blog-publish
// Publishes a Maya-generated blog post to a live Netlify URL.
// Body: { html, title, topic, artifactId? }
// Returns: { url: string }

function buildPublishHtml(title: string, bodyHtml: string, startupName: string): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} — ${startupName}</title>
<meta name="description" content="${title}">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F9F7F2;color:#18160F;line-height:1.7}
.nav{background:#18160F;padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{font-size:15px;font-weight:700;color:#F9F7F2;text-decoration:none}
.nav-back{font-size:12px;color:#8A867C;text-decoration:none}
.nav-back:hover{color:#F9F7F2}
article{max-width:680px;margin:0 auto;padding:60px 24px 100px}
header{margin-bottom:40px;padding-bottom:32px;border-bottom:1px solid #E2DDD5}
.byline{font-size:12px;color:#8A867C;margin-bottom:16px;text-transform:uppercase;letter-spacing:0.08em}
h1{font-size:clamp(1.8rem,4vw,2.6rem);font-weight:700;line-height:1.2;color:#18160F;margin-bottom:16px}
.article-body h2{font-size:1.3rem;font-weight:600;margin:36px 0 12px;color:#18160F}
.article-body h3{font-size:1.1rem;font-weight:600;margin:28px 0 10px;color:#18160F}
.article-body p{margin-bottom:18px;font-size:16px;line-height:1.75;color:#2C2A24}
.article-body ul,.article-body ol{padding-left:24px;margin-bottom:18px}
.article-body li{margin-bottom:8px;font-size:16px;line-height:1.7;color:#2C2A24}
.article-body blockquote{border-left:3px solid #2563EB;padding:12px 20px;background:#EFF6FF;border-radius:0 8px 8px 0;margin:24px 0}
.article-body blockquote p{color:#1D4ED8;font-style:italic;margin:0}
.article-body strong{font-weight:600;color:#18160F}
.article-body em{font-style:italic}
.article-body a{color:#2563EB;text-decoration:underline}
footer{max-width:680px;margin:0 auto;padding:32px 24px;border-top:1px solid #E2DDD5}
footer p{font-size:12px;color:#8A867C}
</style>
</head>
<body>
<nav class="nav">
  <a class="nav-brand" href="/">${startupName}</a>
  <a class="nav-back" href="javascript:history.back()">← Blog</a>
</nav>
<article>
  <header>
    <p class="byline">${startupName} · ${today}</p>
    <h1>${title}</h1>
  </header>
  <div class="article-body">
    ${bodyHtml}
  </div>
</article>
<footer>
  <p>Published with <a href="https://edgealpha.ai" style="color:#2563EB">Edge Alpha</a> · ${startupName}</p>
</footer>
</body>
</html>`
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const NETLIFY_API_KEY = process.env.NETLIFY_API_KEY
    if (!NETLIFY_API_KEY) return NextResponse.json({ error: 'NETLIFY_API_KEY not configured' }, { status: 503 })

    const { html, title, topic, artifactId } = await request.json()
    if (!html || !title) return NextResponse.json({ error: 'html and title are required' }, { status: 400 })

    // Fetch startup name for branding
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name')
      .eq('user_id', user.id)
      .single()

    const startupName = (profile?.startup_name as string | undefined) ?? 'Blog'
    const fullHtml = buildPublishHtml(title, html, startupName)
    const htmlBytes = Buffer.from(fullHtml, 'utf-8')
    const sha1 = createHash('sha1').update(htmlBytes).digest('hex')

    // Slug for site name
    const slug = (topic || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36)

    // Create Netlify site
    const siteName = `blog-${slug}-${Date.now().toString(36)}`
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: { Authorization: `Bearer ${NETLIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: siteName }),
    })
    if (!siteRes.ok) {
      const err = await siteRes.text()
      console.error('Netlify create site error:', err)
      return NextResponse.json({ error: 'Failed to create Netlify site' }, { status: 502 })
    }
    const site = await siteRes.json() as { id: string; ssl_url?: string; default_domain?: string }
    const siteId = site.id

    // Deploy via Files API
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${NETLIFY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ files: { '/index.html': sha1 } }),
    })
    if (!deployRes.ok) return NextResponse.json({ error: 'Failed to create deploy' }, { status: 502 })

    const deploy = await deployRes.json() as { id: string; required?: string[] }

    if (deploy.required?.includes(sha1)) {
      await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${NETLIFY_API_KEY}`,
          'Content-Type': 'application/octet-stream',
          'Content-Length': htmlBytes.length.toString(),
        },
        body: htmlBytes,
      })
    }

    const liveUrl = site.ssl_url ?? `https://${site.default_domain}`

    // Persist
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    try {
      await Promise.all([
        adminClient.from('deployed_sites').insert({
          user_id:         user.id,
          artifact_id:     artifactId ?? null,
          site_name:       siteName,
          netlify_site_id: siteId,
          url:             liveUrl,
          deploy_type:     'blog_post',
        }),
        adminClient.from('agent_activity').insert({
          user_id:     user.id,
          agent_id:    'maya',
          action_type: 'blog_published',
          description: `Blog post "${title}" published at ${liveUrl}`,
          metadata:    { title, url: liveUrl, siteId, slug },
        }),
      ])
    } catch { /* non-critical */ }

    return NextResponse.json({ url: liveUrl, siteId })
  } catch (err) {
    console.error('Blog publish error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
