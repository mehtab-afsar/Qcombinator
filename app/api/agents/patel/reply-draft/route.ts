import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/reply-draft
// Body: { prospectMessage: string, context?: string, tone?: 'assertive' | 'consultative' | 'friendly' }
// Returns: { drafts: [{ tone, subject, body, callToAction, followUpLine, wordCount }] }

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
      prospectMessage?: string; context?: string; tone?: string
    }

    if (!body.prospectMessage) return NextResponse.json({ error: 'prospectMessage is required' }, { status: 400 })

    const admin = getAdmin()

    const [{ data: scriptArt }, { data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi')
        .eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const gtm = gtmArt?.content as Record<string, unknown> | null
    const valueProps = (gtm?.valueProposition as { headline?: string } | undefined)?.headline ?? 'solve critical problems faster'

    const script = scriptArt?.content as Record<string, unknown> | null
    const objectionHandles = (script?.objectionHandling as { objection?: string; response?: string }[] | undefined)
      ?.slice(0, 3).map(o => `${o.objection}: ${o.response}`).join('; ') ?? ''

    const prompt = `You are Patel, a GTM expert. Draft 3 reply options to a prospect message for ${startupName}.

COMPANY: ${startupName} (${industry})
VALUE PROP: ${valueProps}
OBJECTION HANDLES: ${objectionHandles || 'none available'}
CONTEXT: ${body.context ?? 'none provided'}

PROSPECT MESSAGE:
"${body.prospectMessage}"

Write 3 reply options with different approaches. Each should be concise (under 120 words), advance the conversation, and have a clear next step.

Return JSON only (no markdown):
{
  "prospectSignal": "1-sentence read on what the prospect is signaling (interest/concern/objection/etc.)",
  "drafts": [
    {
      "toneLabel": "Consultative",
      "subject": "Re: [if replying to email, suggested subject] or empty string",
      "body": "full reply text — no placeholders, ready to send",
      "callToAction": "specific CTA (e.g. 15-min call Tuesday at 2pm?)",
      "followUpLine": "P.S. or 1 extra line to add warmth or urgency",
      "wordCount": 95,
      "why": "1-line rationale for this approach"
    },
    {
      "toneLabel": "Direct",
      "subject": "",
      "body": "full reply text",
      "callToAction": "specific CTA",
      "followUpLine": "",
      "wordCount": 60,
      "why": "1-line rationale"
    },
    {
      "toneLabel": "Curiosity-Led",
      "subject": "",
      "body": "full reply text — asks a sharp question to move forward",
      "callToAction": "CTA",
      "followUpLine": "",
      "wordCount": 50,
      "why": "1-line rationale"
    }
  ],
  "redFlags": "any concerning signals in the prospect message to watch for",
  "nextBestAction": "recommended next action after sending this reply"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: Record<string, unknown> = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate reply drafts' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'reply_drafted',
      action_data: { startupName, draftCount: (result.drafts as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ ...result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
