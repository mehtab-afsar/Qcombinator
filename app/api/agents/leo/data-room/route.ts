import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/agents/leo/data-room
// Returns all agent artifacts grouped by data-room category,
// plus a full self-contained HTML data-room file the founder can download
// and share with investors or partners.

const CATEGORY_MAP: Record<string, { folder: string; label: string; icon: string }> = {
  financial_summary:  { folder: 'Financials',        label: 'Financial Summary',      icon: '💰' },
  gtm_playbook:       { folder: 'Go-To-Market',       label: 'GTM Playbook',           icon: '🚀' },
  icp_document:       { folder: 'Go-To-Market',       label: 'ICP Document',           icon: '🎯' },
  outreach_sequence:  { folder: 'Go-To-Market',       label: 'Outreach Sequence',      icon: '📧' },
  strategic_plan:     { folder: 'Strategy',           label: 'Strategic Plan',         icon: '📊' },
  competitive_matrix: { folder: 'Market Intelligence',label: 'Competitive Analysis',   icon: '🔍' },
  legal_checklist:    { folder: 'Legal',              label: 'Legal Checklist',        icon: '⚖️'  },
  hiring_plan:        { folder: 'Team',               label: 'Hiring Plan',            icon: '👥' },
  pmf_survey:         { folder: 'Product',            label: 'PMF Survey',             icon: '🧪' },
  brand_messaging:    { folder: 'Brand',              label: 'Brand Messaging',        icon: '✨' },
  sales_script:       { folder: 'Sales',              label: 'Sales Script',           icon: '💬' },
  battle_card:        { folder: 'Market Intelligence',label: 'Battle Card',            icon: '⚔️'  },
}

const FOLDER_ORDER = ['Strategy', 'Financials', 'Go-To-Market', 'Sales', 'Product', 'Team', 'Brand', 'Market Intelligence', 'Legal']

interface ArtifactRow {
  id: string
  artifact_type: string
  title: string
  content: Record<string, unknown>
  created_at: string
}

function buildDataRoomHtml(
  startupName: string,
  founderName: string,
  byFolder: Record<string, { meta: typeof CATEGORY_MAP[string]; artifacts: ArtifactRow[] }[]>
): string {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const totalArtifacts = Object.values(byFolder).reduce((n, arr) => n + arr.reduce((m, b) => m + b.artifacts.length, 0), 0)

  const navItems = FOLDER_ORDER
    .filter(f => byFolder[f])
    .map(f => `<a href="#folder-${f.replace(/\s+/g, '-')}" style="display:block;padding:8px 14px;border-radius:8px;font-size:13px;color:#18160F;text-decoration:none;margin-bottom:2px;transition:background .12s" onmouseover="this.style.background='#E2DDD5'" onmouseout="this.style.background='transparent'">${byFolder[f][0]?.meta?.icon ?? ''} ${f}</a>`)
    .join('\n')

  const sections = FOLDER_ORDER
    .filter(f => byFolder[f])
    .map(folder => {
      const entries = byFolder[folder]
      const cards = entries.map(({ meta, artifacts }) =>
        artifacts.map(a => {
          const snippet = JSON.stringify(a.content, null, 2).slice(0, 500)
          return `
<div style="background:#fff;border:1px solid #E2DDD5;border-radius:12px;padding:20px 24px;margin-bottom:12px">
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
    <span style="font-size:20px">${meta.icon}</span>
    <div>
      <p style="font-size:15px;font-weight:700;color:#18160F;margin:0">${a.title || meta.label}</p>
      <p style="font-size:11px;color:#8A867C;margin:0">${meta.folder} · ${new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
    </div>
  </div>
  <pre style="font-size:11px;color:#374151;background:#F9F7F2;border:1px solid #E2DDD5;border-radius:8px;padding:12px 14px;overflow:auto;max-height:200px;white-space:pre-wrap;word-break:break-word;margin:0">${snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}${snippet.length >= 500 ? '\n…' : ''}</pre>
</div>`
        }).join('')
      ).join('')

      return `
<section id="folder-${folder.replace(/\s+/g, '-')}" style="margin-bottom:40px">
  <h2 style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;color:#8A867C;margin:0 0 14px;padding-bottom:8px;border-bottom:1px solid #E2DDD5">${folder}</h2>
  ${cards}
</section>`
    }).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${startupName} — Investor Data Room</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; }
  .layout { display: flex; min-height: 100vh; }
  .sidebar { width: 220px; flex-shrink: 0; background: #fff; border-right: 1px solid #E2DDD5; padding: 28px 16px; position: sticky; top: 0; height: 100vh; overflow-y: auto; }
  .main { flex: 1; padding: 40px 48px; max-width: 900px; }
  @media (max-width: 700px) { .layout { flex-direction: column; } .sidebar { width: 100%; height: auto; position: static; } .main { padding: 24px 20px; } }
</style>
</head>
<body>
<div class="layout">
  <nav class="sidebar">
    <div style="margin-bottom:28px">
      <p style="font-size:16px;font-weight:800;color:#18160F;margin-bottom:4px">${startupName}</p>
      <p style="font-size:11px;color:#8A867C">Investor Data Room</p>
    </div>
    ${navItems}
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #E2DDD5">
      <p style="font-size:10px;color:#8A867C">${totalArtifacts} document${totalArtifacts !== 1 ? 's' : ''}</p>
      <p style="font-size:10px;color:#8A867C">Generated ${today}</p>
    </div>
  </nav>
  <main class="main">
    <div style="margin-bottom:36px">
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.16em;color:#8A867C;margin-bottom:8px">Confidential</p>
      <h1 style="font-size:28px;font-weight:800;color:#18160F;margin-bottom:6px">${startupName}</h1>
      <p style="font-size:15px;color:#8A867C">Prepared by ${founderName} · ${today}</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        ${FOLDER_ORDER.filter(f => byFolder[f]).map(f =>
          `<span style="padding:3px 10px;background:#F0EDE6;border:1px solid #E2DDD5;border-radius:999px;font-size:11px;font-weight:600;color:#8A867C">${f}</span>`
        ).join('')}
      </div>
    </div>
    ${sections}
  </main>
</div>
</body>
</html>`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch all agent artifacts for this founder
    const { data: artifacts, error } = await supabase
      .from('agent_artifacts')
      .select('id, artifact_type, title, content, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch founder profile for branding
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('startup_name, full_name')
      .eq('user_id', user.id)
      .single()

    const startupName = (profile?.startup_name as string | undefined) ?? 'Your Startup'
    const founderName = (profile?.full_name as string | undefined) ?? 'Founder'

    // Group by folder
    const byFolder: Record<string, { meta: typeof CATEGORY_MAP[string]; artifacts: ArtifactRow[] }[]> = {}
    for (const artifact of (artifacts ?? [])) {
      const meta = CATEGORY_MAP[artifact.artifact_type]
      if (!meta) continue
      if (!byFolder[meta.folder]) byFolder[meta.folder] = []
      const existing = byFolder[meta.folder].find(e => e.meta === meta)
      if (existing) {
        existing.artifacts.push(artifact as ArtifactRow)
      } else {
        byFolder[meta.folder].push({ meta, artifacts: [artifact as ArtifactRow] })
      }
    }

    // Summary of what's present and what's missing
    const present = Object.keys(byFolder)
    const missing = FOLDER_ORDER.filter(f => !present.includes(f))

    const html = buildDataRoomHtml(startupName, founderName, byFolder)

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'leo',
        action_type: 'data_room_generated',
        description: `Data room generated — ${artifacts?.length ?? 0} documents across ${present.length} sections`,
        metadata: { sections: present, missing, artifactCount: artifacts?.length ?? 0 },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      html,
      startupName,
      folderCount: present.length,
      artifactCount: artifacts?.length ?? 0,
      present,
      missing,
    })
  } catch (err) {
    console.error('Leo data-room error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
