import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/referral-program
// No body — pulls gtm_playbook + icp_document for context
// Returns: { program: { overview, incentiveStructure, mechanics, viralLoops[],
//   launchPlan[], successMetrics[], templates[], antiPatterns[] } }

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

    const [{ data: gtmArt }, { data: icpArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'icp_document').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const gtm = gtmArt?.content as Record<string, unknown> | null
    const icp = icpArt?.content as Record<string, unknown> | null

    const icpSummary = (gtm?.icp as { summary?: string } | undefined)?.summary
      ?? (icp?.summary as string | undefined) ?? 'growth-focused B2B buyers'
    const avgDealSize = (gtm?.pricing as { averageDealSize?: string } | undefined)?.averageDealSize ?? 'unknown'

    const prompt = `You are Patel, a GTM strategist. Design a referral program for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
ICP: ${icpSummary}
AVG DEAL SIZE: ${avgDealSize}

Design a referral/viral loop program that fits a ${stage} B2B startup. Consider both customer referrals and partner referrals. Make incentives specific and realistic.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence referral program summary and expected impact",
  "programName": "catchy name for the referral program",
  "incentiveStructure": {
    "referrerIncentive": "what the person referring gets",
    "referreeIncentive": "what the new customer gets",
    "incentiveType": "credit/cash/upgrade/partnership",
    "minimumQualification": "what makes a valid referral",
    "payoutTiming": "when incentives are paid out"
  },
  "mechanics": {
    "howItWorks": "step-by-step: how a referral is made and tracked",
    "trackingMethod": "how to track referral attribution (unique links / codes / email)",
    "minimumViableVersion": "the simplest version to launch this week",
    "fullVersion": "what the complete program looks like in 3 months"
  },
  "viralLoops": [
    {
      "loop": "specific viral mechanism",
      "trigger": "what triggers the share/referral",
      "channel": "where it happens",
      "estimatedViralCoefficient": "expected k-factor"
    }
  ],
  "launchPlan": [
    { "week": "Week 1 / Week 2 / Week 3", "action": "what to do", "expected": "what happens" }
  ],
  "successMetrics": [
    { "metric": "referral KPI", "baseline": "starting point", "target": "90-day target", "howToMeasure": "tool or method" }
  ],
  "templates": [
    {
      "type": "email / in-app message / LinkedIn post",
      "template": "actual copy with [BRACKETS] for personalization"
    }
  ],
  "antiPatterns": ["referral program mistake to avoid 1", "anti-pattern 2", "anti-pattern 3"],
  "bestPracticeExample": "real company referral program example relevant to this model"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let program: Record<string, unknown> = {}
    try { program = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate referral program' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'referral_program_designed',
      action_data: { startupName, programName: program.programName },
    }).maybeSingle()

    return NextResponse.json({ program })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
