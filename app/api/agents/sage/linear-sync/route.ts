import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// POST /api/agents/sage/linear-sync
// Body: { linearApiKey, artifactId? }
// Creates Linear Issues from OKRs in the founder's strategic_plan artifact
// Each OKR → Linear Issue with description + target metric, grouped into a Cycle

interface LinearTeam {
  id: string
  name: string
  key: string
}

interface OKR {
  objective: string
  keyResults?: string[]
  owner?: string
  quarter?: string
}

async function linearRequest(apiKey: string, query: string, variables?: Record<string, unknown>) {
  const res = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Authorization': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  })
  if (!res.ok) throw new Error(`Linear API error: ${res.status}`)
  const data = await res.json() as { data?: unknown; errors?: { message: string }[] }
  if (data.errors?.length) throw new Error(data.errors.map(e => e.message).join(', '))
  return data.data
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { linearApiKey, artifactId } = await request.json()
    if (!linearApiKey || typeof linearApiKey !== 'string') {
      return NextResponse.json({ error: 'linearApiKey is required' }, { status: 400 })
    }

    // Fetch teams from Linear
    const teamsData = await linearRequest(linearApiKey, `
      query { teams { nodes { id name key } } }
    `) as { teams: { nodes: LinearTeam[] } }

    const teams = teamsData.teams.nodes
    if (!teams.length) {
      return NextResponse.json({ error: 'No Linear teams found for this API key' }, { status: 400 })
    }
    const teamId = teams[0].id // Use first team

    // Fetch the strategic plan artifact
    let okrs: OKR[] = []
    let planTitle = 'Q OKRs from Edge Alpha'

    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const query = supabase
      .from('agent_artifacts')
      .select('id, title, content')
      .eq('user_id', user.id)
      .eq('artifact_type', 'strategic_plan')
      .order('created_at', { ascending: false })
      .limit(1)

    const { data: artifact } = artifactId
      ? await query.eq('id', artifactId)
      : await query

    if (artifact) {
      const item = Array.isArray(artifact) ? artifact[0] : artifact
      if (item?.content) {
        planTitle = item.title ?? planTitle
        const content = item.content as Record<string, unknown>
        // Try various OKR field names
        const rawOkrs = content.okrs ?? content.objectives ?? content.quarterlyOkrs ?? []
        if (Array.isArray(rawOkrs)) {
          okrs = rawOkrs.map((o: Record<string, unknown>) => ({
            objective: String(o.objective ?? o.title ?? o.goal ?? ''),
            keyResults: (() => { const krs = o.keyResults ?? o.krs; return Array.isArray(krs) ? (krs as unknown[]).map((kr: unknown) => typeof kr === 'string' ? kr : String((kr as Record<string, unknown>).result ?? kr)) : []; })(),
            owner: typeof o.owner === 'string' ? o.owner : undefined,
            quarter: typeof o.quarter === 'string' ? o.quarter : undefined,
          })).filter(o => o.objective)
        }
      }
    }

    if (!okrs.length) {
      return NextResponse.json({ error: 'No OKRs found in your strategic plan — generate one with Sage first' }, { status: 400 })
    }

    // Create Linear issues for each OKR + key results
    const createdIssues: { title: string; id: string; url: string }[] = []

    for (const okr of okrs) {
      // Create parent issue for the objective
      const issueData = await linearRequest(linearApiKey, `
        mutation CreateIssue($input: IssueCreateInput!) {
          issueCreate(input: $input) {
            issue { id title url }
          }
        }
      `, {
        input: {
          teamId,
          title: okr.objective,
          description: [
            `## Objective\n${okr.objective}`,
            okr.owner ? `**Owner:** ${okr.owner}` : '',
            okr.quarter ? `**Quarter:** ${okr.quarter}` : '',
            okr.keyResults?.length ? `\n## Key Results\n${okr.keyResults.map((kr, i) => `${i + 1}. ${kr}`).join('\n')}` : '',
            '\n---\n*Synced from Edge Alpha / Sage strategic plan*',
          ].filter(Boolean).join('\n'),
          priority: 2, // Medium
        },
      }) as { issueCreate: { issue: { id: string; title: string; url: string } } }

      const parentIssue = issueData.issueCreate.issue
      createdIssues.push({ title: parentIssue.title, id: parentIssue.id, url: parentIssue.url })

      // Create sub-issues for each key result
      if (okr.keyResults?.length) {
        for (const kr of okr.keyResults.slice(0, 6)) {
          try {
            await linearRequest(linearApiKey, `
              mutation CreateIssue($input: IssueCreateInput!) {
                issueCreate(input: $input) { issue { id } }
              }
            `, {
              input: {
                teamId,
                title: String(kr),
                parentId: parentIssue.id,
                priority: 3, // Low
              },
            })
          } catch { /* non-fatal */ }
        }
      }
    }

    // Store the API key for this user (optional, for future use)
    try {
      await adminClient.from('linear_tokens').upsert({
        user_id: user.id,
        api_key: linearApiKey,
        team_id: teamId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch { /* non-critical */ }

    // Log activity
    try {
      await supabase.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'sage',
        action_type: 'linear_sync',
        description: `Synced ${createdIssues.length} OKRs to Linear (${teams[0].name})`,
        metadata: { teamId, issueCount: createdIssues.length, planTitle },
      })
    } catch { /* non-critical */ }

    return NextResponse.json({
      success: true,
      team: teams[0].name,
      issues: createdIssues,
      count: createdIssues.length,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Internal server error'
    console.error('Sage Linear sync error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
