import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/okr-tracker
// No body — pulls strategic_plan + founder_profiles for context
// Returns: { okrs: { quarter, companyObjectives[], teamOKRs[], scoringGuide,
//   checkInCadence, retrospectiveQuestions[], commonPitfalls[] } }

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
    const vision = plan?.vision as string ?? ''
    const okrCtx = (plan?.okrs as { objective?: string }[] | undefined)
      ?.slice(0, 3).map(o => o.objective ?? '').filter(Boolean).join('; ') ?? ''

    const now = new Date()
    const quarter = `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`

    const prompt = `You are Sage, a strategic advisor. Build an OKR framework for ${startupName} for ${quarter}.

COMPANY: ${startupName} — ${stage} ${industry}
VISION: ${vision || 'not set'}
EXISTING PLAN CONTEXT: ${okrCtx || 'none'}

Generate a complete, actionable OKR framework with 3 company objectives and team-level OKRs.

Return JSON only (no markdown):
{
  "quarter": "${quarter}",
  "companyObjectives": [
    {
      "objective": "inspiring, qualitative objective statement",
      "theme": "growth / product / operations / culture",
      "keyResults": [
        {
          "kr": "measurable key result",
          "baseline": "current value or 'unknown'",
          "target": "specific target",
          "unit": "unit of measurement (e.g. %, $, #)",
          "owner": "suggested role/person",
          "confidence": 70,
          "measurementMethod": "how to track this"
        }
      ],
      "initiatives": ["initiative to drive this objective 1", "initiative 2"]
    }
  ],
  "teamOKRs": [
    {
      "team": "team name (e.g. Engineering, Sales, Marketing)",
      "objective": "team-level objective aligned to company OKRs",
      "keyResults": [
        { "kr": "key result", "target": "target", "owner": "person/role" }
      ]
    }
  ],
  "scoringGuide": "how to score OKRs at quarter end (0.0-1.0 scale explanation)",
  "checkInCadence": "recommended weekly/bi-weekly check-in structure",
  "retrospectiveQuestions": ["question to ask at quarter end 1", "question 2", "question 3"],
  "commonPitfalls": ["pitfall to avoid 1", "pitfall 2", "pitfall 3"],
  "successDefinition": "what does a successful OKR quarter look like for ${startupName}"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let okrs: Record<string, unknown> = {}
    try { okrs = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate OKR framework' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'sage', action_type: 'okr_framework_built',
      action_data: { startupName, quarter, objectiveCount: (okrs.companyObjectives as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ okrs })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
