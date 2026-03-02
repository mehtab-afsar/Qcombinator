import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/board-communication
// No body — pulls strategic_plan + financial_summary + board_deck for context
// Returns: { framework: { verdict, updateTemplate, boardPackStructure[], communicationCalendar[],
//   badNewsProtocol, askFormulas[], relationshipTips[], red lines[], priorityAction } }

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

    const [{ data: planArt }, { data: finArt }, { data: boardArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'strategic_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'board_deck').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const plan = planArt?.content as Record<string, unknown> | null
    const fin = finArt?.content as Record<string, unknown> | null
    const snapshot = (fin?.snapshot as Record<string, string> | null)

    const mrr = snapshot?.mrr ?? 'unknown'
    const runway = snapshot?.runway ?? 'unknown'
    const topOKR = (plan?.objectives as { objective?: string }[] | undefined)?.[0]?.objective ?? ''
    const boardSize = (boardArt?.content as Record<string, unknown> | null)?.boardSize as number ?? 3

    const prompt = `You are Sage, a strategic advisor. Build a board communication framework for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
MRR: ${mrr}
RUNWAY: ${runway}
BOARD SIZE: ${boardSize} members
TOP OKR: ${topOKR || 'not specified'}

Design a professional board communication system for a ${stage} startup.

Return JSON only (no markdown):
{
  "verdict": "1-sentence board communication health assessment",
  "updateTemplate": {
    "frequency": "how often to send updates",
    "sections": [
      { "section": "section name", "content": "what to include", "length": "how long", "priority": "always/sometimes" }
    ],
    "sampleOpening": "first 2 sentences of a board update",
    "badNewsSection": "how to frame bad news in updates"
  },
  "boardPackStructure": [
    { "section": "board pack section", "purpose": "why it's there", "owner": "who prepares", "dueBeforeMeeting": "days before" }
  ],
  "communicationCalendar": [
    { "touchpoint": "type of board communication", "frequency": "how often", "format": "email / call / deck / in-person", "purpose": "what it achieves", "preparationTime": "hours to prep" }
  ],
  "badNewsProtocol": {
    "rule1": "first rule for delivering bad news to board",
    "rule2": "second rule",
    "framingTemplate": "how to frame difficult news",
    "whatNotToSay": "phrase or approach to avoid"
  },
  "askFormulas": [
    { "askType": "type of ask (e.g. intro, capital, advice)", "timing": "when to ask", "howToFrame": "exact framing for the ask", "followUp": "follow-up cadence" }
  ],
  "relationshipTips": [
    { "tip": "board relationship best practice", "why": "why it matters", "howTo": "practical implementation" }
  ],
  "redLines": ["never do X with your board", "red line 2", "red line 3"],
  "priorityAction": "single highest-leverage board communication action to take this month"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let framework: Record<string, unknown> = {}
    try { framework = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate board communication framework' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'sage', action_type: 'board_communication_built',
      action_data: { startupName },
    }).maybeSingle()

    return NextResponse.json({ framework })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
