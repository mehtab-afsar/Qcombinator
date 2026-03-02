import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/team-alignment
// No body — pulls strategic_plan + hiring_plan for context
// Returns: { assessment: { alignmentScore, dimensions[], teamHealthSignals[],
//   communicationGaps[], decisionFramework, meetingCadence, actionPlan[], rituals[] } }

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

    const [{ data: planArt }, { data: hiringArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'strategic_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const stage = profileData?.stage as string ?? 'Seed'

    const plan = planArt?.content as Record<string, unknown> | null
    const hiring = hiringArt?.content as Record<string, unknown> | null

    const vision = plan?.vision as string ?? ''
    const coreBets = (plan?.coreBets as string[] | undefined)?.slice(0, 3).join('; ') ?? ''
    const teamSize = (hiring?.currentTeam as { headcount?: number } | undefined)?.headcount ?? 'unknown'
    const roles = (hiring?.hiringPriorities as string[] | undefined)?.slice(0, 3).join(', ') ?? ''

    const prompt = `You are Sage, a strategic advisor. Run a team alignment assessment for ${startupName}.

COMPANY: ${startupName} — ${stage} startup
VISION: ${vision || 'not set'}
CORE BETS: ${coreBets || 'not specified'}
TEAM SIZE: ${teamSize}
CURRENT PRIORITIES: ${roles || 'not specified'}

Assess team alignment across strategy, communication, decision-making, and execution. Provide actionable recommendations for a ${stage} startup.

Return JSON only (no markdown):
{
  "alignmentScore": 68,
  "verdict": "1-sentence overall team alignment assessment",
  "dimensions": [
    {
      "dimension": "dimension name (Strategy / Communication / Decision-Making / Execution / Culture)",
      "score": 72,
      "status": "strong / aligned / misaligned / critical",
      "finding": "what we observe about alignment here",
      "risk": "what could go wrong if this isn't addressed",
      "fix": "specific action to improve alignment in this dimension"
    }
  ],
  "teamHealthSignals": [
    { "signal": "positive signal 1", "type": "positive", "implication": "what it means" },
    { "signal": "warning signal 1", "type": "warning", "implication": "what it means" }
  ],
  "communicationGaps": [
    { "gap": "specific communication gap", "impact": "how this affects the team", "solution": "how to close this gap" }
  ],
  "decisionFramework": {
    "recommendation": "which decision framework fits this team (RACI/DACI/Consent-based/etc.)",
    "currentIssue": "what's going wrong with decisions now",
    "implementation": "how to roll out the framework"
  },
  "meetingCadence": {
    "weekly": "what weekly meetings are needed and why",
    "monthly": "monthly rhythm",
    "quarterly": "quarterly alignment practices",
    "antipatterns": "meetings to eliminate or reduce"
  },
  "actionPlan": [
    { "action": "specific team alignment action", "timeline": "this week / this month / this quarter", "owner": "who should lead this", "impact": "high/medium/low" }
  ],
  "rituals": [
    { "ritual": "team ritual name", "frequency": "how often", "duration": "how long", "purpose": "what it achieves for alignment" }
  ],
  "priorityAction": "single most impactful team alignment action for the next 2 weeks"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let assessment: Record<string, unknown> = {}
    try { assessment = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate team alignment assessment' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'sage', action_type: 'team_alignment_assessed',
      action_data: { startupName, alignmentScore: assessment.alignmentScore },
    }).maybeSingle()

    return NextResponse.json({ assessment })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
