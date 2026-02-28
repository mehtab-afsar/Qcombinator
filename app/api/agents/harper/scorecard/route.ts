import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/scorecard
// Generates a structured interview scorecard for a candidate.
// Body: { candidateName, role, interviewNotes, applicationId? }

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
    const { candidateName, role, interviewNotes, applicationId } = body as {
      candidateName: string
      role: string
      interviewNotes: string
      applicationId?: string
    }

    if (!candidateName || !role || !interviewNotes?.trim()) {
      return NextResponse.json({ error: 'candidateName, role, and interviewNotes are required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Fetch hiring plan for role-specific criteria
    const { data: hiringArtifact } = await admin
      .from('agent_artifacts')
      .select('content')
      .eq('user_id', user.id)
      .eq('artifact_type', 'hiring_plan')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const hiringPlan = (hiringArtifact?.content ?? {}) as Record<string, unknown>
    const nextHires = (hiringPlan.nextHires as { role: string; requirements?: string[]; responsibilities?: string[] }[]) ?? []
    const matchedRole = nextHires.find(h => h.role.toLowerCase().includes(role.toLowerCase()))
    const requirements = matchedRole?.requirements?.slice(0, 5).join(', ') ?? ''
    const responsibilities = matchedRole?.responsibilities?.slice(0, 3).join('; ') ?? ''

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Harper, a hiring advisor. Generate a structured interview scorecard.
Return ONLY valid JSON:
{
  "candidateName": "name",
  "role": "role name",
  "overallScore": 75,
  "recommendation": "strong_yes | yes | no | strong_no",
  "summary": "2-3 sentence overall assessment",
  "dimensions": [
    {
      "name": "Technical Skills",
      "score": 80,
      "maxScore": 100,
      "evidence": "specific evidence from notes",
      "gap": "what's missing or concerning — null if none"
    },
    {
      "name": "Communication",
      "score": 70,
      "maxScore": 100,
      "evidence": "...",
      "gap": "..."
    },
    {
      "name": "Culture Fit",
      "score": 85,
      "maxScore": 100,
      "evidence": "...",
      "gap": null
    },
    {
      "name": "Problem-Solving",
      "score": 75,
      "maxScore": 100,
      "evidence": "...",
      "gap": "..."
    },
    {
      "name": "Role Fit",
      "score": 80,
      "maxScore": 100,
      "evidence": "...",
      "gap": null
    }
  ],
  "strengths": ["top 3 specific strengths"],
  "concerns": ["top 2-3 specific concerns or gaps — empty array if none"],
  "suggestedNextSteps": "one clear recommendation: move to next round / make offer / pass — with brief reasoning",
  "referenceCheckFocus": "what to specifically verify in reference calls"
}`,
        },
        {
          role: 'user',
          content: `Score this interview:
Candidate: ${candidateName}
Role: ${role}
${requirements ? `Required skills: ${requirements}` : ''}
${responsibilities ? `Key responsibilities: ${responsibilities}` : ''}

Interview notes:
${interviewNotes}`,
        },
      ],
      { maxTokens: 1000, temperature: 0.3 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let scorecard: Record<string, unknown>
    try { scorecard = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { scorecard = m ? JSON.parse(m[0]) : {} } catch { scorecard = {} } }

    // Optionally update the application record with scorecard
    if (applicationId) {
      await admin.from('applications').update({
        notes: JSON.stringify(scorecard),
      }).eq('id', applicationId).then(() => {})
    }

    await admin.from('agent_activity').insert({
      user_id: user.id,
      agent_id: 'harper',
      action_type: 'scorecard_generated',
      description: `Interview scorecard generated for ${candidateName} — ${role}`,
      metadata: { candidateName, role, applicationId, overallScore: scorecard.overallScore },
    })

    return NextResponse.json({ scorecard })
  } catch (err) {
    console.error('Harper scorecard error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
