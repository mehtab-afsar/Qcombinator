import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/meeting-prep
// Generates a call brief for an upcoming meeting with a prospect.
// Body: { dealId?, company?, contactName?, contactTitle?, contactEmail?, stage?, value?, notes?, nextAction?, founderCompany? }
// Returns: { prep: { companySnapshot, contactInsight, dealContext, talkingPoints[], likelyObjections[{ objection, response }], openingQuestion, meetingGoal, redFlags[] } }

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
    const {
      dealId, company, contactName, contactTitle, contactEmail,
      stage, value, notes, nextAction, founderCompany,
    } = body as {
      dealId?: string
      company?: string
      contactName?: string
      contactTitle?: string
      contactEmail?: string
      stage?: string
      value?: string | number
      notes?: string
      nextAction?: string
      founderCompany?: string
    }

    const admin = getAdmin()

    const [
      { data: fp },
      { data: deal },
      { data: icpArtifact },
      { data: scriptArtifact },
    ] = await Promise.all([
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      dealId
        ? admin.from('deals').select('*').eq('user_id', user.id).eq('id', dealId).single()
        : company
        ? admin.from('deals').select('*').eq('user_id', user.id).ilike('company', `%${company}%`).order('updated_at', { ascending: false }).limit(1).single()
        : Promise.resolve({ data: null }),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel').eq('artifact_type', 'icp_document').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'susi').eq('artifact_type', 'sales_script').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const sp = (fp?.startup_profile_data ?? {}) as Record<string, unknown>
    const icp = (icpArtifact?.content ?? {}) as Record<string, unknown>
    const script = (scriptArtifact?.content ?? {}) as Record<string, unknown>
    const dealData = deal as Record<string, unknown> | null

    const targetCompany = company ?? dealData?.company ?? 'Unknown Company'
    const targetContact = contactName ?? dealData?.contact_name ?? 'Unknown Contact'
    const dealStage    = stage ?? dealData?.stage ?? 'unknown'
    const dealValue    = value ?? dealData?.value ?? null
    const dealNotes    = notes ?? dealData?.notes ?? ''
    const myCompany    = founderCompany ?? fp?.startup_name ?? 'Unknown'

    const contextLines = [
      `My company: ${myCompany}`,
      sp.problem ? `Problem we solve: ${sp.problem}` : '',
      sp.solution ? `Our solution: ${sp.solution}` : '',
      `Meeting with: ${targetContact}${contactTitle ? ` (${contactTitle})` : ''} at ${targetCompany}`,
      contactEmail ? `Contact email: ${contactEmail}` : '',
      dealStage !== 'unknown' ? `Deal stage: ${dealStage}` : '',
      dealValue ? `Deal value: $${dealValue}` : '',
      dealNotes ? `Deal notes: ${dealNotes}` : '',
      nextAction ? `Planned next action: ${nextAction}` : '',
      (icp.primaryPersona as Record<string, unknown> | undefined)?.title
        ? `ICP: ${(icp.primaryPersona as Record<string, unknown>).title}`
        : '',
      (script.mainObjections as string[] | undefined)?.length
        ? `Known objections: ${(script.mainObjections as string[]).join(', ')}`
        : '',
    ].filter(Boolean).join('\n')

    const raw = await callOpenRouter(
      [
        {
          role: 'system',
          content: `You are Susi, a sales advisor. Generate a pre-call brief for this meeting. Make it specific, actionable, and brief — the founder should read this in 3 minutes before getting on the call.

Return ONLY valid JSON:
{
  "companySnapshot": "2-3 sentences on what you know or can infer about this company — size, model, likely pains",
  "contactInsight": "this contact's likely role, priorities, and decision-making style in 2 sentences",
  "dealContext": "summary of where we are in the sales process and what got us here",
  "talkingPoints": ["3-4 specific talking points tailored to this prospect"],
  "likelyObjections": [
    { "objection": "expected objection", "response": "how to address it" }
  ],
  "openingQuestion": "exact first question to ask after small talk — personalized to them",
  "meetingGoal": "what a successful outcome looks like (concrete, not generic)",
  "redFlags": ["things to watch for that suggest the deal is at risk"]
}

Be specific. No generic sales advice.`,
        },
        {
          role: 'user',
          content: `Generate meeting prep brief:\n\n${contextLines}`,
        },
      ],
      { maxTokens: 800, temperature: 0.4 }
    )

    const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let prep: Record<string, unknown> = {}
    try { prep = JSON.parse(clean) }
    catch { const m = clean.match(/\{[\s\S]*\}/); try { prep = m ? JSON.parse(m[0]) : {} } catch { prep = {} } }

    await admin.from('agent_activity').insert({
      user_id:     user.id,
      agent_id:    'susi',
      action_type: 'meeting_prep_generated',
      description: `Meeting prep brief for ${targetContact} at ${targetCompany}`,
      metadata:    { company: targetCompany, contact: targetContact, dealStage },
    }).then(() => {})

    return NextResponse.json({ prep, company: targetCompany, contact: targetContact })
  } catch (err) {
    console.error('Susi meeting-prep POST error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
