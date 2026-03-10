import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/investor-qa-prep
// No body — pulls strategic_plan + qscore_history + financial_summary for context
// Returns: { prep: { toughestQuestions[], greatAnswers[], financialQuestions[],
//   visionQuestions[], founderTestQuestions[], closingQuestions[], doNotSay[], warmingTactic } }

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

    const [{ data: planArt }, { data: finArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'strategic_plan').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('overall_score, assessment_data').eq('user_id', user.id)
        .order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const plan = planArt?.content as Record<string, unknown> | null
    const fin = finArt?.content as Record<string, unknown> | null
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null
    const qScore = latestScore?.overall_score ?? null
    const snapshot = (fin?.snapshot as Record<string, string> | undefined)

    const mrr = snapshot?.mrr ?? assessment?.mrr ?? 'unknown'
    const runway = snapshot?.runway ?? assessment?.runway ?? 'unknown'
    const vision = (plan?.vision as string | undefined) ?? ''

    const prompt = `You are Sage, a strategic advisor. Prepare a complete investor Q&A prep guide for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
MRR: ${mrr}
RUNWAY: ${runway}
Q-SCORE: ${qScore ?? 'unknown'}
VISION: ${vision || 'not specified'}

Prepare the toughest investor questions this founder will face and model ideal answers. Be specific to their stage and industry.

Return JSON only (no markdown):
{
  "toughestQuestions": [
    {
      "question": "hard investor question",
      "why": "why investors ask this (what they're really probing)",
      "badAnswer": "typical weak answer founders give",
      "greatAnswer": "exact great answer (2-4 sentences)",
      "bridgingPhrase": "transition phrase to use if caught off guard"
    }
  ],
  "financialQuestions": [
    {
      "question": "financial/metrics question",
      "answerFramework": "how to structure your answer",
      "keyNumbers": "what specific data to reference",
      "ifYouDontHaveData": "how to handle if metrics are unknown"
    }
  ],
  "visionQuestions": [
    {
      "question": "vision/market question",
      "greatAnswer": "2-3 sentence ideal answer"
    }
  ],
  "founderTestQuestions": [
    {
      "question": "question testing founder conviction/expertise",
      "whatTheyreReallyAsking": "the underlying concern",
      "greatAnswer": "how to demonstrate depth and conviction"
    }
  ],
  "closingQuestions": [
    {
      "question": "question to ask the investor at the end",
      "why": "what this signals and what it helps you learn"
    }
  ],
  "doNotSay": ["phrase or statement that kills deals 1", "phrase 2", "phrase 3"],
  "warmingTactic": "how to warm up an investor before a cold pitch",
  "meetingStructure": "recommended structure for a 30-minute pitch meeting"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let prep: Record<string, unknown> = {}
    try { prep = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate investor Q&A prep' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'sage', action_type: 'investor_qa_prepared',
      action_data: { startupName, questionCount: (prep.toughestQuestions as unknown[] | undefined)?.length },
    }).maybeSingle()

    return NextResponse.json({ prep })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
