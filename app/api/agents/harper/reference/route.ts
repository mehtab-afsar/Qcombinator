import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/reference
// Generates a tailored reference check questionnaire for a specific candidate and role.
// Body: { candidateName, role, claimedExperience, concerns? }
// Returns: { questions[], redFlagProbes[], intro, outro }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { candidateName, role, claimedExperience, concerns } = body as {
      candidateName: string
      role: string
      claimedExperience?: string
      concerns?: string
    }

    if (!candidateName?.trim() || !role?.trim()) {
      return NextResponse.json({ error: 'candidateName and role are required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Get hiring plan context
    const { data: hiringArtifact } = await admin
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('agent_id', 'harper')
      .eq('artifact_type', 'hiring_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hiringContent = (hiringArtifact?.content ?? {}) as Record<string, unknown>
    const roles = (hiringContent.roles ?? hiringContent.nextHires ?? []) as { title: string; mustHaves?: string[]; niceToHave?: string[] }[]
    const roleDetail = roles.find(r => r.title?.toLowerCase().includes(role.toLowerCase()))

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Harper, a talent advisor. Generate a thorough reference check questionnaire for a specific candidate and role.

Return ONLY valid JSON:
{
  "intro": "opening script to say to the reference — 2-3 sentences that build rapport and set the context",
  "questions": [
    {
      "category": "performance | culture_fit | skill_validation | red_flag | leadership | specific_claim",
      "question": "the actual question to ask",
      "whyItMatters": "what you're trying to learn",
      "followUp": "follow-up probe if they give a vague answer — or null",
      "redFlagAnswer": "what response would concern you — or null"
    }
  ],
  "redFlagProbes": [
    { "concern": "specific area to probe", "question": "subtle way to explore this without being leading" }
  ],
  "signalQuestions": [
    "2-3 indirect questions that reveal character/culture fit better than direct questions"
  ],
  "outro": "how to close the reference call and what to say about next steps",
  "interpretationGuide": "what overall pattern across references suggests a strong vs weak candidate"
}

Rules:
- Questions should be behavioral (STAR format: Situation, Task, Action, Result)
- Include 1-2 questions specific to the claimed experience
- Include subtle probes for any concerns without telegraphing them
- 8-12 questions total — quality over quantity
- Never ask illegal questions (age, health, family status, etc.)`,
        },
        {
          role: 'user',
          content: `Generate reference check questions for:
Candidate: ${candidateName}
Role: ${role}
${claimedExperience ? `Key experience they claim: ${claimedExperience}` : ''}
${concerns ? `Areas of concern from interview: ${concerns}` : ''}
${roleDetail?.mustHaves ? `Must-have skills for role: ${roleDetail.mustHaves.join(', ')}` : ''}`,
        },
      ],
      { maxTokens: 900, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let kit: Record<string, unknown> = {}
    try { kit = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { kit = m ? JSON.parse(m[0]) : {} } catch { kit = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'harper',
      action_type: 'reference_check_generated',
      description: `Reference check kit for ${candidateName} (${role})`,
      metadata:    { candidateName, role, questionCount: (kit.questions as unknown[])?.length ?? 0 },
    }).then(() => {})

    return NextResponse.json({ kit, candidateName, role })
  } catch (err) {
    console.error('Harper reference POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
