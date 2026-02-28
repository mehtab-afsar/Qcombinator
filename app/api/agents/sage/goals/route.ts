import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// GET  /api/agents/sage/goals  — return current goals + check-in history
// POST /api/agents/sage/goals  — log a weekly check-in (progress updates)
// Body (POST): { goals: [{ id, objective, progress, blocker? }], weekNote? }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    // Fetch strategic_plan artifact for OKRs
    const { data: artifact } = await admin
      .from('agent_artifacts')
      .select('id, content, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', 'sage')
      .eq('artifact_type', 'strategic_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Fetch check-in history from agent_activity
    const { data: checkins } = await admin
      .from('agent_activity')
      .select('description, metadata, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', 'sage')
      .eq('action_type', 'goal_checkin')
      .order('created_at', { ascending: false })
      .limit(8)

    const content = artifact?.content as Record<string, unknown> | undefined
    const okrs = (content?.okrs ?? []) as { objective: string; keyResults: { kr: string; target: string; metric: string }[] }[]

    return NextResponse.json({
      artifactId: artifact?.id ?? null,
      okrs,
      checkins: checkins ?? [],
    })
  } catch (err) {
    console.error('Sage goals GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { goals, weekNote } = body as {
      goals: { id: string; objective: string; progress: number; blocker?: string }[]
      weekNote?: string
    }

    if (!goals || !Array.isArray(goals) || goals.length === 0) {
      return NextResponse.json({ error: 'goals array is required' }, { status: 400 })
    }

    const admin = getAdmin()
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const avgProgress = Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)

    // Get founder context
    const { data: fp } = await admin
      .from('founder_profiles')
      .select('full_name, startup_name')
      .eq('user_id', user.id)
      .single()

    const founderName = fp?.full_name?.split(' ')[0] ?? 'Founder'

    // LLM generates accountability feedback
    const goalsContext = goals.map(g =>
      `- "${g.objective}" → ${g.progress}% complete${g.blocker ? ` (blocker: ${g.blocker})` : ''}`
    ).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a startup strategy advisor. The founder just reported their weekly OKR progress. Give sharp accountability feedback.
Return ONLY valid JSON:
{
  "headline": "one sentence summary of the week — honest about where things stand",
  "momentum": "strong | building | stalled | concerning",
  "wins": ["things going well — max 3"],
  "risks": ["what's at risk — max 2"],
  "focusNext": "the single most important thing to work on next week",
  "blockerAdvice": "specific advice on the biggest blocker — null if no blockers",
  "motivationalNote": "one direct, non-generic sentence to keep them going"
}
Rules:
- Be direct, not cheerleader-y
- If progress is below 40%, call it out
- Focus on what matters, not what's comfortable`,
        },
        {
          role: 'user',
          content: `Weekly check-in for ${founderName} — ${todayStr}
Average progress: ${avgProgress}%
${weekNote ? `Founder note: ${weekNote}` : ''}

Goal progress:
${goalsContext}`,
        },
      ],
      { maxTokens: 400, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let feedback: Record<string, unknown> = {}
    try { feedback = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { feedback = m ? JSON.parse(m[0]) : {} } catch { feedback = {} } }

    // Log the check-in
    await admin.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'sage',
      action_type: 'goal_checkin',
      description: `Weekly check-in: ${avgProgress}% avg progress across ${goals.length} objective${goals.length !== 1 ? 's' : ''}`,
      metadata: { goals, weekNote: weekNote ?? null, avgProgress, feedback },
    })

    return NextResponse.json({
      avgProgress,
      feedback,
      checkinDate: new Date().toISOString(),
    })
  } catch (err) {
    console.error('Sage goals POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
