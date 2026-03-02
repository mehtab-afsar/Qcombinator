import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/equity-plan
// Body: { totalShares?, optionPoolPercent?, vestingYears?, cliffMonths?, founders? }
// Returns: { plan: { optionPool, grantSuggestions[], vestingSchedule, 409aGuidance,
//   refreshStrategy, dilutionModel[], commonMistakes[], legalChecklist } }

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
      totalShares?: number; optionPoolPercent?: number; vestingYears?: number;
      cliffMonths?: number; founders?: string;
    }

    const admin = getAdmin()

    const [{ data: capArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'leo')
        .eq('artifact_type', 'cap_table').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const stage = profileData?.stage as string ?? 'Seed'
    const teamSize = profileData?.teamSize as number ?? 5

    const cap = capArt?.content as Record<string, unknown> | null
    const totalShares = body.totalShares ?? (cap?.totalShares as number | undefined) ?? 10000000
    const optionPoolPercent = body.optionPoolPercent ?? (cap?.optionPool as number | undefined) ?? 10
    const vestingYears = body.vestingYears ?? 4
    const cliffMonths = body.cliffMonths ?? 12

    const prompt = `You are Leo, a startup legal advisor. Create an equity plan for ${startupName}.

COMPANY: ${startupName} — ${stage} startup
TOTAL SHARES: ${totalShares.toLocaleString()}
OPTION POOL: ${optionPoolPercent}%
TEAM SIZE: ~${teamSize} people
VESTING: ${vestingYears}-year vesting, ${cliffMonths}-month cliff
FOUNDERS: ${body.founders ?? 'not specified'}

Design a comprehensive equity plan with grant benchmarks, vesting mechanics, 409A guidance, and dilution modeling. Think like a startup attorney advising a Seed/Series A company.

Return JSON only (no markdown):
{
  "optionPool": {
    "totalShares": ${totalShares},
    "poolShares": ${Math.round(totalShares * optionPoolPercent / 100)},
    "poolPercent": ${optionPoolPercent},
    "recommendation": "why this pool size is right or needs adjusting for ${stage}"
  },
  "grantSuggestions": [
    {
      "role": "role title (e.g. Founding Engineer, VP Engineering, Product Manager)",
      "level": "senior / mid / junior",
      "equityPercent": 0.5,
      "shares": ${Math.round(totalShares * 0.005)},
      "rationale": "why this grant size for this role at this stage",
      "vestingNote": "any special vesting provisions for this role"
    }
  ],
  "vestingSchedule": {
    "years": ${vestingYears},
    "cliffMonths": ${cliffMonths},
    "cliffDescription": "what happens at the cliff",
    "monthlyVestingAfterCliff": "what vests each month post-cliff",
    "accelerationProvisions": "single trigger vs double trigger acceleration explanation",
    "earlyExercise": "83(b) election recommendation and deadline"
  },
  "refreshStrategy": {
    "whenToRefresh": "when to do equity refresh grants",
    "refreshSize": "typical refresh grant size as % of original grant",
    "performanceTriggers": "what performance warrants a refresh",
    "topUpVsNewGrant": "recommendation on topping up vs new grant"
  },
  "dilutionModel": [
    { "round": "Seed", "newInvestorPercent": 15, "founderDilution": "founders go from 90% to ~76.5%", "poolChange": "pool may need to increase" },
    { "round": "Series A", "newInvestorPercent": 20, "founderDilution": "founders dilute further to ~60%", "poolChange": "new 10-15% pool typically required" }
  ],
  "a409Guidance": [
    "key requirement 1 for 409A compliance",
    "how often to get a 409A valuation (annually or after major events)",
    "what triggers a new 409A (funding round, major revenue milestone)",
    "strike price implications for employees"
  ],
  "commonMistakes": [
    "equity planning mistake founders commonly make 1",
    "mistake 2",
    "mistake 3"
  ],
  "legalChecklist": [
    { "item": "legal requirement or best practice", "urgency": "immediate/before first hire/before Series A", "notes": "brief guidance" }
  ],
  "keyInsight": "single most important equity planning insight for this stage"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let plan: Record<string, unknown> = {}
    try { plan = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate equity plan' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'leo', action_type: 'equity_plan_generated',
      action_data: { startupName, totalShares, optionPoolPercent },
    }).maybeSingle()

    return NextResponse.json({ plan })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
