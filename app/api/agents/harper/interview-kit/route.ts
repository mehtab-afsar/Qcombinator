import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/interview-kit
// Body: { role: string, level?: string, focusAreas?: string[] }
// Returns: { kit: { role, scoringRubric[], behavioralQuestions[], technicalQuestions[],
//   cultureQuestions[], redFlags[], greenFlags[], interviewStructure, decisionFramework } }

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

    const body = await req.json().catch(() => ({})) as {
      role?: string; level?: string; focusAreas?: string[]
    }

    if (!body.role) return NextResponse.json({ error: 'role is required' }, { status: 400 })

    const admin = getAdmin()

    const { data: fp } = await admin.from('founder_profiles')
      .select('startup_name, startup_profile_data').eq('user_id', user.id).single()

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const role = body.role
    const level = body.level ?? 'Mid-level'
    const focusAreas = body.focusAreas?.join(', ') ?? 'general fit'

    const prompt = `You are Harper, a hiring expert. Build a complete interview kit for a ${level} ${role} at ${startupName}.

COMPANY: ${startupName} (${industry})
ROLE: ${level} ${role}
FOCUS AREAS: ${focusAreas}

Create a structured interview kit that helps the hiring team make consistent, unbiased decisions.

Return JSON only (no markdown):
{
  "role": "${role}",
  "level": "${level}",
  "interviewStructure": [
    { "stage": "stage name (e.g. Phone Screen)", "duration": "30 min", "interviewer": "who conducts", "focus": "what to assess" }
  ],
  "scoringRubric": [
    { "dimension": "dimension name", "weight": 20, "description": "what good looks like", "redFlag": "what bad looks like" }
  ],
  "behavioralQuestions": [
    { "question": "Tell me about a time when...", "whatYoureTesting": "what competency", "strongAnswer": "what a great answer includes", "probes": ["follow-up 1", "follow-up 2"] }
  ],
  "technicalQuestions": [
    { "question": "technical/skills question", "whatYoureTesting": "specific skill", "evaluationCriteria": "what to look for" }
  ],
  "cultureQuestions": [
    { "question": "culture/values question", "intent": "what you're assessing" }
  ],
  "situationalQuestions": [
    { "scenario": "Here's a scenario: ...", "whatYoureTesting": "judgment area" }
  ],
  "redFlags": ["signal that this candidate is wrong for the role 1", "red flag 2", "red flag 3"],
  "greenFlags": ["strong signal this candidate is right 1", "green flag 2", "green flag 3"],
  "decisionFramework": "2-3 sentences on how to make the final hire/no-hire call",
  "referenceCheckQuestions": ["reference check question 1", "question 2", "question 3"],
  "offerConsiderations": "key points to negotiate or highlight when making the offer"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let kit: Record<string, unknown> = {}
    try { kit = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate interview kit' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'interview_kit_generated',
      action_data: { startupName, role, level },
    }).maybeSingle()

    return NextResponse.json({ kit })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
