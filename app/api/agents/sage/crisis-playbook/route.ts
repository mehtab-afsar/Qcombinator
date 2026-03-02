import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/crisis-playbook
// Body: { crisisType?: string } — e.g. "funding", "churn", "PR", "cofounder", "technical"
// Pulls strategic_plan + founder_profiles for context
// Returns: { playbook: { crisisType, immediateActions[], stabilizationPlan[],
//   communicationTemplates[], recoveryMilestones[], lessonsLearned[], preventionChecklist[] } }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({})) as { crisisType?: string }

    const admin = getAdmin()

    const [{ data: planArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'strategic_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const plan = planArt?.content as Record<string, unknown> | null
    const runway = (plan?.financials as { runway?: string } | undefined)?.runway ?? 'unknown'

    const crisisType = body.crisisType ?? 'funding / cash crisis'

    const prompt = `You are Sage, a strategic advisor. Build a crisis playbook for ${startupName} for a "${crisisType}" scenario.

COMPANY: ${startupName} — ${stage} ${industry}
RUNWAY: ${runway}
CRISIS TYPE: ${crisisType}

Build a practical crisis playbook. Be direct about what to do in hour 1, day 1, week 1. Include real communication templates, not placeholders.

Return JSON only (no markdown):
{
  "crisisType": "${crisisType}",
  "severityAssessment": { "level": "critical/high/medium", "timeToAct": "hours/days/weeks", "primaryRisk": "what happens if you don't act" },
  "immediateActions": [
    { "action": "specific action", "when": "within X hours", "owner": "who does this", "why": "why this first" }
  ],
  "stabilizationPlan": [
    { "phase": "Day 1 / Week 1 / Month 1", "objective": "what you're trying to achieve", "actions": ["action 1", "action 2"], "successSignal": "how you know it's working" }
  ],
  "communicationTemplates": [
    {
      "audience": "who to communicate to (investors / team / customers / press)",
      "when": "when to send this",
      "tone": "crisis communications tone",
      "template": "actual message template with [BRACKETS] for fill-in-the-blank"
    }
  ],
  "recoveryMilestones": [
    { "milestone": "recovery milestone", "timeframe": "target date", "indicator": "leading indicator you're on track" }
  ],
  "decisionFramework": "how to make decisions fast under pressure in this crisis",
  "worstCaseContingency": "what to do if stabilization fails",
  "preventionChecklist": ["how to prevent this crisis type in the future 1", "prevention 2", "prevention 3"],
  "lessonsFromOthers": ["what other founders learned from this crisis type 1", "lesson 2"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let playbook: Record<string, unknown> = {}
    try { playbook = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate crisis playbook' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'sage', action_type: 'crisis_playbook_built',
      action_data: { startupName, crisisType },
    }).maybeSingle()

    return NextResponse.json({ playbook })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
