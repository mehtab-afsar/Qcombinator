import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/culture-assessment
// No body — pulls hiring_plan + founder_profiles for context
// Returns: { assessment: { overallScore, verdict, dimensions[], strengths[], gaps[],
//   rituals[], hiringFilter[], remotePlaybook, redFlags[], priorityAction } }

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

    const [{ data: hiringArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const hiring = hiringArt?.content as Record<string, unknown> | null
    const teamSize = (hiring?.currentHeadcount as number | undefined) ?? 5
    const values = (hiring?.cultureValues as string[] | undefined)?.slice(0, 3).join(', ') ?? ''
    const remotePolicy = (hiring?.remotePolicy as string | undefined) ?? 'hybrid'

    const prompt = `You are Harper, a people operations expert. Assess culture health for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
TEAM SIZE: ${teamSize}
STATED VALUES: ${values || 'not specified'}
REMOTE POLICY: ${remotePolicy}

Build a culture assessment and improvement framework for a ${stage} startup.

Return JSON only (no markdown):
{
  "overallScore": 72,
  "verdict": "1-sentence culture health assessment",
  "cultureArchetype": "culture archetype (e.g. Execution-First, Innovation Lab, Customer-Obsessed, People-First)",
  "dimensions": [
    {
      "dimension": "culture dimension (e.g. Psychological Safety, Ownership, Speed, Learning, Diversity)",
      "score": 70,
      "description": "what this dimension means in practice",
      "currentState": "how this shows up at ${startupName} right now",
      "improvement": "specific action to improve this dimension"
    }
  ],
  "strengths": [
    { "strength": "cultural strength", "evidence": "how you'd know it's working", "leverage": "how to amplify" }
  ],
  "gaps": [
    { "gap": "culture gap", "risk": "what goes wrong if unaddressed", "fix": "specific intervention" }
  ],
  "rituals": [
    { "ritual": "culture ritual to implement", "frequency": "how often", "purpose": "what it reinforces", "effort": "low/medium/high" }
  ],
  "hiringFilter": [
    { "value": "culture value", "interviewQuestion": "question to assess this value", "greenFlag": "answer that indicates fit", "redFlag": "answer that indicates misfit" }
  ],
  "remotePlaybook": {
    "asyncNorm": "default async communication rule",
    "syncCadence": "when to do synchronous communication",
    "documentationStandard": "how to document decisions",
    "connectionRitual": "how to build connection remotely"
  },
  "redFlags": ["culture warning sign to watch for 1", "red flag 2", "red flag 3"],
  "priorityAction": "single most impactful culture-building action to take this month"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let assessment: Record<string, unknown> = {}
    try { assessment = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate culture assessment' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'culture_assessed',
      action_data: { startupName, overallScore: assessment.overallScore },
    }).maybeSingle()

    return NextResponse.json({ assessment })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
