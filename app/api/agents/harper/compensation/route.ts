import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/harper/compensation
// No body — pulls hiring_plan artifact + founder_profiles for stage/industry
// Returns: { framework: { philosophyStatement, salaryBands[], equityBands[], benefitsStack,
//   negotiationPlaybook, offerStructure, refreshGrantPolicy, benchmarkSources, keyInsight } }

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

    const [{ data: hiringArt }, { data: finArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'harper')
        .eq('artifact_type', 'hiring_plan').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Pre-seed'
    const location = profileData?.location as string ?? 'San Francisco, CA'

    const hiring = hiringArt?.content as Record<string, unknown> | null
    const roles = (hiring?.roles as { title?: string; level?: string; department?: string }[] | undefined)
      ?.slice(0, 8).map(r => `${r.title ?? 'Unknown'} (${r.level ?? 'mid'}, ${r.department ?? 'unknown'})`).join(', ') ?? 'engineers, sales, marketing'

    const snapshot = (finArt?.content as { snapshot?: Record<string, string> } | null)?.snapshot
    const mrr = snapshot?.mrr ?? snapshot?.MRR ?? 'unknown'
    const runway = snapshot?.runway ?? 'unknown'

    const prompt = `You are Harper, an HR expert. Build a compensation framework for ${startupName}, a ${stage} ${industry} startup.

STARTUP CONTEXT:
- Company: ${startupName}
- Stage: ${stage}, Industry: ${industry}
- Location/Market: ${location}
- MRR: ${mrr}, Runway: ${runway}
- Roles to hire: ${roles}

Design a comprehensive compensation framework appropriate for an early-stage startup competing for talent.

Return JSON only (no markdown):
{
  "philosophyStatement": "2-sentence compensation philosophy that you can share with candidates",
  "salaryBands": [
    {
      "level": "IC1 | IC2 | IC3 | IC4 | M1 | M2 | M3",
      "title": "e.g. Junior Engineer, Senior Engineer, Staff Engineer, Engineering Manager",
      "department": "Engineering | Sales | Marketing | Product | Operations | G&A",
      "baseSalaryRange": { "low": "$X", "mid": "$X", "high": "$X" },
      "targetTotalComp": "$X - $X",
      "benchmarkPercentile": "50th | 65th | 75th percentile vs market",
      "notes": "any adjustments for remote vs on-site, equity offset, etc."
    }
  ],
  "equityBands": [
    {
      "level": "IC1 | IC2 | IC3 | IC4 | M1 | M2 | M3",
      "title": "role title",
      "equityRange": "X.XX% - X.XX%",
      "vestingSchedule": "4-year with 1-year cliff (standard)",
      "refreshPolicy": "annual refresh notes",
      "dilutionNote": "what this looks like after Series A dilution"
    }
  ],
  "benefitsStack": {
    "mustHave": ["benefit 1", "benefit 2", "benefit 3"],
    "competitive": ["differentiator 1", "differentiator 2"],
    "earlyStageAlternatives": ["creative low-cost benefit 1", "creative low-cost benefit 2"]
  },
  "negotiationPlaybook": [
    { "scenario": "candidate counters above band", "response": "how to respond" },
    { "scenario": "candidate focused only on cash (not equity)", "response": "how to reframe" },
    { "scenario": "competing offer from big tech", "response": "how to compete" },
    { "scenario": "candidate asks about future compensation at funding rounds", "response": "what to say" }
  ],
  "offerStructure": "recommended structure of the offer letter — what to lead with, how to present equity, timing",
  "refreshGrantPolicy": "when and how to give equity refreshes to retain top performers",
  "benchmarkSources": ["source 1 (e.g. Levels.fyi)", "source 2", "source 3"],
  "keyInsight": "single most important compensation insight for ${startupName} right now"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1100 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let framework: Record<string, unknown> = {}
    try { framework = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate compensation framework' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'harper', action_type: 'compensation_framework_generated',
      action_data: { startupName, stage, salaryBandCount: (framework.salaryBands as unknown[] | undefined)?.length ?? 0 },
    }).maybeSingle()

    return NextResponse.json({ framework })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
