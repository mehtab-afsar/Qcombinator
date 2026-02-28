import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// GET  /api/agents/sage/milestone — returns milestone status derived from strategic_plan artifact
// POST /api/agents/sage/milestone — marks a milestone as complete
// Body (POST): { milestoneIndex: number, milestoneText: string }

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

    // Fetch latest strategic_plan artifact
    const { data: artifact } = await admin
      .from('agent_artifacts')
      .select('id, content, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', 'sage')
      .eq('artifact_type', 'strategic_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!artifact) return NextResponse.json({ milestones: [], fundraisingTarget: null, artifactId: null })

    const content = artifact.content as Record<string, unknown>
    const milestones = (content.fundraisingMilestones ?? []) as string[]

    // Fetch completed milestones from agent_activity
    const { data: completions } = await admin
      .from('agent_activity')
      .select('metadata, created_at')
      .eq('user_id', user.id)
      .eq('agent_id', 'sage')
      .eq('action_type', 'milestone_completed')
      .order('created_at', { ascending: false })

    const completedSet = new Set(
      (completions ?? []).map(c => (c.metadata as Record<string, unknown>)?.milestoneIndex as number)
    )

    // Extract fundraising timeline from milestones text or OKRs
    const okrs = (content.okrs ?? []) as { objective: string; keyResults: { kr: string; target: string }[] }[]
    const fundraisingKR = okrs
      .flatMap(o => o.keyResults ?? [])
      .find(kr => kr.kr?.toLowerCase().includes('raise') || kr.target?.toLowerCase().includes('raise') || kr.target?.includes('M') || kr.target?.includes('K'))

    return NextResponse.json({
      artifactId: artifact.id,
      milestones: milestones.map((text, i) => ({
        index: i,
        text,
        completed: completedSet.has(i),
      })),
      fundraisingKR: fundraisingKR ?? null,
      totalMilestones: milestones.length,
      completedCount: milestones.filter((_, i) => completedSet.has(i)).length,
    })
  } catch (err) {
    console.error('Sage milestone GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { milestoneIndex, milestoneText, targetDate, allMilestones } = body as {
      milestoneIndex?: number
      milestoneText: string
      targetDate?: string
      allMilestones?: string[]
    }

    if (!milestoneText?.trim()) {
      return NextResponse.json({ error: 'milestoneText is required' }, { status: 400 })
    }

    const admin = getAdmin()

    // If marking a specific milestone complete
    if (milestoneIndex !== undefined) {
      await admin.from('agent_activity').insert({
        user_id: user.id,
        agent_id: 'sage',
        action_type: 'milestone_completed',
        description: `Milestone completed: "${milestoneText.slice(0, 80)}"`,
        metadata: { milestoneIndex, milestoneText },
      })
      return NextResponse.json({ ok: true, milestoneIndex, milestoneText })
    }

    // Generate countdown context if targetDate is provided
    const today = new Date()
    const target = targetDate ? new Date(targetDate) : null
    const daysRemaining = target ? Math.ceil((target.getTime() - today.getTime()) / 86400000) : null

    const completedMilestones = allMilestones?.filter((_, i) => body.completed?.[i]) ?? []
    const remainingMilestones = allMilestones?.filter((_, i) => !body.completed?.[i]) ?? []

    if (!allMilestones?.length) return NextResponse.json({ ok: true })

    // LLM assessment of milestone progress
    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Sage, a startup strategy advisor. Give a milestone progress assessment.
Return ONLY valid JSON:
{
  "status": "on_track | ahead | at_risk | behind",
  "summary": "2-sentence assessment of where they stand",
  "criticalPath": "the single most important milestone to hit next",
  "bottleneck": "what's most likely to cause a delay — null if on track",
  "recommendation": "1 specific action to take this week to stay on schedule"
}`,
        },
        {
          role: 'user',
          content: `Milestone progress:
${daysRemaining !== null ? `Days until target: ${daysRemaining}` : ''}
Total milestones: ${allMilestones.length}
Completed: ${completedMilestones.length} (${Math.round((completedMilestones.length / allMilestones.length) * 100)}%)
Remaining: ${remainingMilestones.join(', ')}`,
        },
      ],
      { maxTokens: 300, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let assessment: Record<string, unknown> = {}
    try { assessment = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { assessment = m ? JSON.parse(m[0]) : {} } catch { assessment = {} } }

    return NextResponse.json({ ok: true, assessment, daysRemaining })
  } catch (err) {
    console.error('Sage milestone POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
