import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/sequence
// Body: { targetRole: string, targetIndustry: string, painPoint: string, valueProposition: string }
// Generates a 4-step outreach sequence: Day 0 intro, Day 3 follow-up, Day 7 value-add, Day 14 breakup
// Returns: { sequence: { step, day, subject, body, cta, toneNote }[], sequenceStrategy: string }

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

    const body = await req.json() as {
      targetRole?: string; targetIndustry?: string; painPoint?: string; valueProposition?: string
    }
    const { targetRole, targetIndustry, painPoint, valueProposition } = body

    if (!targetRole?.trim() || !painPoint?.trim()) {
      return NextResponse.json({ error: 'targetRole and painPoint are required' }, { status: 400 })
    }

    const admin = getAdmin()

    // Pull brand messaging artifact for voice context
    const [{ data: brandArtifact }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id)
        .in('artifact_type', ['brand_messaging', 'gtm_playbook']).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'My startup'
    const brandVoice = (brandArtifact?.content as Record<string, unknown> | null)?.voiceAttributes
    const voiceContext = brandVoice ? `Brand voice: ${JSON.stringify(brandVoice).slice(0, 100)}` : ''

    const prompt = `You are Patel, a GTM expert. Create a 4-step cold outreach sequence that converts.

TARGET: ${targetRole}${targetIndustry ? ` at ${targetIndustry} companies` : ''}
PAIN POINT: ${painPoint}
VALUE PROP: ${valueProposition ?? `${startupName} helps solve this`}
${voiceContext}
COMPANY: ${startupName}

Write 4 emails:
- Step 1 (Day 0): Cold intro — short, hyper-relevant, one CTA. Under 100 words.
- Step 2 (Day 3): Follow-up — add social proof or a case study angle. Under 80 words.
- Step 3 (Day 7): Value-add — share something genuinely useful (insight, resource, stat). No ask until the end. Under 120 words.
- Step 4 (Day 14): Breakup — honest, no pressure. Leave door open. Under 60 words.

Return JSON only (no markdown):
{
  "sequenceStrategy": "one sentence on the overall sequence approach",
  "sequence": [
    {
      "step": 1,
      "day": 0,
      "subject": "subject line under 50 chars",
      "body": "email body — use {{firstName}} and {{company}} placeholders",
      "cta": "the specific ask",
      "toneNote": "tone guidance for this step"
    }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let result: { sequenceStrategy?: string; sequence?: unknown[] } = {}
    try { result = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate sequence' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'sequence_created',
      action_data: { targetRole, targetIndustry, steps: (result.sequence ?? []).length },
    }).maybeSingle()

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
