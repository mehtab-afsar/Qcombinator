import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/deal-coaching
// Body: { dealName, stage, dealValue?, lastActivity?, notes? }
// Returns: { coaching: { diagnosis, riskScore, riskFactors[], nextAction,
//   emailTemplate, objectionResponse, closeStrategy, timeline, verdict } }

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
      dealName?: string; stage?: string; dealValue?: string;
      lastActivity?: string; notes?: string
    }

    const admin = getAdmin()

    const [{ data: salesArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi')
        .eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const sales = salesArt?.content as Record<string, unknown> | null
    const avgCycle = (sales?.avgCycleDays as number | undefined) ?? 30

    const dealName = body.dealName ?? 'the deal'
    const stage = body.stage ?? 'unknown'
    const dealValue = body.dealValue ?? 'unknown'
    const lastActivity = body.lastActivity ?? 'unknown'
    const notes = body.notes ?? 'no notes provided'

    const prompt = `You are Susi, a sales strategist. Coach the founder on how to close "${dealName}".

COMPANY: ${startupName} — ${industry}
DEAL: ${dealName}
STAGE: ${stage}
DEAL VALUE: ${dealValue}
LAST ACTIVITY: ${lastActivity}
NOTES: ${notes}
AVG SALES CYCLE: ~${avgCycle} days

Diagnose this deal and prescribe the exact next moves to advance or close it.

Return JSON only (no markdown):
{
  "diagnosis": "2-3 sentence deal diagnosis",
  "verdict": "deal is: on track / stalling / at risk / dead",
  "riskScore": 65,
  "riskFactors": [
    { "factor": "risk factor", "severity": "high/medium/low", "mitigation": "how to address" }
  ],
  "dealStrengths": ["reason this deal could close 1", "strength 2"],
  "nextAction": {
    "action": "the single most important next step",
    "timing": "do this within X days",
    "owner": "founder / champion / both",
    "successCriteria": "how you know it worked"
  },
  "emailTemplate": {
    "subject": "re-engagement or follow-up subject line",
    "body": "full email body (3-4 sentences max)",
    "sendTime": "best time/day to send"
  },
  "objectionResponse": {
    "likelyObjection": "most likely objection at this stage",
    "response": "how to respond",
    "reframe": "how to reframe the conversation"
  },
  "closeStrategy": {
    "closingMove": "the technique to close this deal",
    "urgencyCreator": "how to create legitimate urgency",
    "concessionStrategy": "what you can concede vs protect"
  },
  "timeline": {
    "expectedClose": "realistic close date",
    "criticalPath": "what must happen in what order",
    "dropDeadDate": "when to stop investing time"
  }
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let coaching: Record<string, unknown> = {}
    try { coaching = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate deal coaching' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'deal_coached',
      action_data: { startupName, dealName, verdict: coaching.verdict },
    }).maybeSingle()

    return NextResponse.json({ coaching })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
