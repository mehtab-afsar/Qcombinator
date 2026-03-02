import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/salary-benchmarking
// Body: { roles?: string[], location?: string }
// Pulls hiring_plan + founder_profiles for context
// Returns: { benchmarks: { overview, roles[], totalComp[], equityGuidance[],
//   budgetImpact, hiringStrategy, compensationPhilosophy } }

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

    const body = await req.json().catch(() => ({})) as { roles?: string[]; location?: string }

    const admin = getAdmin()

    const [{ data: hiringArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const hiring = hiringArt?.content as Record<string, unknown> | null
    const nextHires = (hiring?.nextHires as { role?: string }[] | undefined)?.slice(0, 5).map(h => h.role).filter(Boolean) ?? []

    const roles = body.roles ?? nextHires.length > 0 ? nextHires as string[] : ['Software Engineer', 'Account Executive', 'Product Manager']
    const location = body.location ?? 'US (remote-friendly)'

    const prompt = `You are Harper, a people operations expert. Provide salary benchmarking for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
LOCATION: ${location}
ROLES TO BENCHMARK: ${roles.join(', ')}

Provide realistic ${stage} startup salary benchmarks. Include base, OTE, and equity. Compare to FAANG, Series B, and startup-stage ranges. Help founder understand trade-offs.

Return JSON only (no markdown):
{
  "overview": "1-2 sentence compensation strategy summary for a ${stage} startup",
  "compensationPhilosophy": "recommended comp philosophy (e.g. 75th percentile base + meaningful equity)",
  "roles": [
    {
      "role": "role title",
      "level": "IC3 / Senior / Staff / Lead",
      "baseSalaryRange": { "low": 90000, "mid": 110000, "high": 135000 },
      "oTeRange": "total cash OTE if sales role",
      "signOnRange": "$5K-$15K or N/A",
      "equityPercent": "0.1-0.3%",
      "equityShares": "estimated shares at $10M option pool",
      "benchmarkVsFANG": "how your offer compares to FAANG",
      "benchmarkVsSeries B": "how your offer compares to Series B",
      "hiringDifficulty": "easy/medium/hard",
      "topCandidateMotivator": "what attracts great candidates at your stage",
      "negotiationTip": "what to emphasize in offer conversation"
    }
  ],
  "totalComp": [
    { "scenario": "bootstrap / lean", "annualPayroll": "total payroll estimate", "note": "trade-offs" },
    { "scenario": "competitive / seed", "annualPayroll": "total payroll estimate", "note": "trade-offs" }
  ],
  "equityGuidance": [
    { "role": "role category", "typical": "typical equity grant at this stage", "cliff": "1 year", "vesting": "4 years", "refreshCadence": "when to refresh" }
  ],
  "budgetImpact": {
    "totalHeadcount": ${roles.length},
    "estimatedAnnualBurn": "total annual salary burn",
    "runwayImpact": "how many months of runway this headcount consumes",
    "hiringRecommendation": "which roles to prioritize and why"
  },
  "hiringStrategy": "whether to hire full-time, part-time, or contract for different roles",
  "benefitsToOffer": ["minimum viable benefits for attracting talent 1", "benefit 2", "benefit 3"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let benchmarks: Record<string, unknown> = {}
    try { benchmarks = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate salary benchmarks' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'salary_benchmarked',
      action_data: { startupName, roles, location },
    }).maybeSingle()

    return NextResponse.json({ benchmarks })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
