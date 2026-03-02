import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/product-launch
// Body: { launchDate?, productName?, launchType? } — pulls brand_messaging + gtm artifacts for context
// Returns: { plan: { verdict, launchType, phases[], channels[], prePR[], launchDay[], postLaunch[],
//   contentCalendar[], metrics[], risks[], priorityAction } }

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
      launchDate?: string; productName?: string; launchType?: string
    }

    const admin = getAdmin()

    const [{ data: brandArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const brand = brandArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null

    const tagline = (brand?.tagline as string | undefined) ?? ''
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'SMBs and mid-market'

    const productName = body.productName ?? startupName
    const launchDate = body.launchDate ?? '30 days from now'
    const launchType = body.launchType ?? 'product launch'

    const prompt = `You are Maya, a marketing strategist. Build a product launch plan for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
PRODUCT: ${productName}
TAGLINE: ${tagline || 'not set'}
ICP: ${icp}
LAUNCH DATE: ${launchDate}
LAUNCH TYPE: ${launchType}

Design a comprehensive go-to-market launch plan with 3 phases: pre-launch, launch day, and post-launch.

Return JSON only (no markdown):
{
  "verdict": "1-sentence launch readiness assessment",
  "launchType": "Product Hunt / Press / Influencer / Community / Cold Outreach / Hybrid",
  "launchGoal": "primary KPI for launch success",
  "phases": [
    {
      "phase": "Pre-Launch / Launch Day / Post-Launch",
      "duration": "how long this phase lasts",
      "focus": "primary objective",
      "keyActions": ["action 1", "action 2", "action 3"]
    }
  ],
  "channels": [
    {
      "channel": "channel name",
      "role": "primary / secondary / support",
      "launchTactic": "specific launch move for this channel",
      "expectedReach": "estimated reach",
      "effort": "high / medium / low"
    }
  ],
  "preLaunchChecklist": [
    {
      "task": "pre-launch task",
      "dueBy": "when (e.g. T-14 days)",
      "owner": "founder / team",
      "critical": true
    }
  ],
  "launchDayPlaybook": [
    {
      "time": "time block (e.g. 8:00 AM)",
      "action": "what to do",
      "platform": "where",
      "note": "any special instructions"
    }
  ],
  "contentCalendar": [
    {
      "dayRelativeToLaunch": "T-7 / T-0 / T+3",
      "contentType": "type of content",
      "message": "key message",
      "channel": "where to publish"
    }
  ],
  "metrics": [
    {
      "metric": "launch metric",
      "target": "launch day target",
      "weekOneTarget": "week 1 target",
      "monthOneTarget": "month 1 target"
    }
  ],
  "risks": [
    {
      "risk": "launch risk",
      "likelihood": "high / medium / low",
      "mitigation": "how to prepare"
    }
  ],
  "priorityAction": "single most important thing to do right now to ensure a successful launch"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let plan: Record<string, unknown> = {}
    try { plan = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate launch plan' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'launch_plan_built',
      action_data: { startupName, productName, launchType: plan.launchType },
    }).maybeSingle()

    return NextResponse.json({ plan })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
