import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/compliance
// No body — uses startup industry/stage from founder_profiles + legal_checklist artifact
// Returns: { report: { overallRisk, items[], priorityActions[], upcomingDeadlines[], safeHarbors[] } }

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

    const [{ data: legalArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'leo')
        .eq('artifact_type', 'legal_checklist').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry  = profileData?.industry  as string ?? 'B2B SaaS'
    const stage     = profileData?.stage     as string ?? 'Seed'
    const location  = profileData?.location  as string ?? 'United States'

    const legal   = legalArt?.content as Record<string, unknown> | null
    const items   = (legal?.items    as { item?: string; status?: string }[] | undefined)?.slice(0, 10) ?? []
    const legalCtx = items.length
      ? items.map(i => `- ${i.item ?? 'Unknown'}: ${i.status ?? 'pending'}`).join('\n')
      : 'No legal checklist data available'

    const prompt = `You are Leo, a startup legal expert. Run a compliance audit for ${startupName}.

COMPANY: ${startupName}
STAGE: ${stage} ${industry}
LOCATION: ${location}
EXISTING LEGAL CHECKLIST STATUS:
${legalCtx}

Generate a practical compliance report that flags real risks for a ${stage} ${industry} startup. Be specific, not generic.

Return JSON only (no markdown):
{
  "overallRisk": "low / medium / high",
  "riskSummary": "2 sentences on the overall compliance health",
  "items": [
    {
      "area": "compliance area (e.g. Data Privacy, IP, Employment)",
      "status": "ok / needs attention / critical",
      "finding": "what we found or what's likely missing",
      "action": "specific action to take",
      "effort": "low / medium / high",
      "priority": 1
    }
  ],
  "priorityActions": ["#1 most important action right now", "action 2", "action 3"],
  "upcomingDeadlines": [
    { "item": "e.g. Delaware franchise tax", "deadline": "March 1", "consequence": "penalty if missed" }
  ],
  "safeHarbors": ["thing you're probably ok on 1", "thing you're probably ok on 2"],
  "disclaimer": "Leo is not a lawyer. This is for educational purposes only — consult a licensed attorney before acting."
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 800 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let report: Record<string, unknown> = {}
    try { report = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate compliance report' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'leo', action_type: 'compliance_audit_run',
      action_data: { startupName, overallRisk: report.overallRisk },
    }).maybeSingle()

    return NextResponse.json({ report })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
