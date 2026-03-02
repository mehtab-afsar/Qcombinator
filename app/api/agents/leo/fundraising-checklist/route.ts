import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/fundraising-checklist
// No body — pulls term_sheet + strategic_plan + qscore_history for context
// Returns: { checklist: { readinessScore, verdict, phases[], redFlags[], strengthens[],
//   dueDiligencePrep[], dataRoomItems[], investorFAQ[], timeline, priorityAction } }

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

    const [{ data: tsArt }, { data: planArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'leo')
        .eq('artifact_type', 'term_sheet').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'strategic_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('overall_score, assessment_data').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const qScore = latestScore?.overall_score ?? 0
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null
    const mrr = (assessment?.mrr as string | undefined) ?? 'unknown'
    const runway = (assessment?.runway as string | undefined) ?? 'unknown'
    const prevRound = (tsArt?.content as Record<string, unknown> | null)?.instrument as string ?? ''
    const nextRound = (planArt?.content as Record<string, unknown> | null)?.fundingNeeds as string ?? ''

    const prompt = `You are Leo, a legal and fundraising expert. Build a fundraising readiness checklist for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
Q-SCORE: ${qScore}/100
MRR: ${mrr}
RUNWAY: ${runway}
PREVIOUS INSTRUMENT: ${prevRound || 'not specified'}
PLANNED RAISE: ${nextRound || 'not specified'}

Build a comprehensive fundraising readiness assessment for a ${stage} ${industry} startup.

Return JSON only (no markdown):
{
  "readinessScore": 75,
  "verdict": "1-sentence fundraising readiness assessment",
  "readinessLevel": "not ready / getting there / ready / overdue",
  "phases": [
    {
      "phase": "phase name (e.g. Pre-Process, Active Raise, Term Sheet, Closing)",
      "status": "not started / in progress / complete",
      "tasks": [
        { "task": "specific task", "done": false, "critical": true, "effort": "low/medium/high", "timeToComplete": "estimated time" }
      ]
    }
  ],
  "redFlags": [
    { "flag": "fundraising red flag investors will notice", "severity": "high/medium/low", "fix": "how to address before raising" }
  ],
  "strengths": [
    { "strength": "fundraising strength to emphasize", "howToLeverage": "how to use this in pitches" }
  ],
  "dueDiligencePrep": [
    { "area": "due diligence category", "investorFocus": "what they look for", "yourPrep": "what to prepare", "timeNeeded": "prep time estimate" }
  ],
  "dataRoomItems": [
    { "item": "data room document", "priority": "must-have / nice-to-have", "status": "ready / needs creation / not applicable" }
  ],
  "investorFAQ": [
    { "question": "common investor question", "strongAnswer": "how to answer confidently" }
  ],
  "timeline": {
    "optimalStartDate": "when to start the process",
    "estimatedDuration": "how long the round will take",
    "criticalPath": "what must happen first"
  },
  "priorityAction": "single most important fundraising prep action to take this week"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let checklist: Record<string, unknown> = {}
    try { checklist = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate fundraising checklist' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'leo', action_type: 'fundraising_checklist_built',
      action_data: { startupName, readinessScore: checklist.readinessScore },
    }).maybeSingle()

    return NextResponse.json({ checklist })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
