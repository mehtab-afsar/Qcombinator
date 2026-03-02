import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/patel/ab-test
// Body: { element: string, currentVersion: string, goal?: string, audience?: string }
// Returns: { test: { variants[], hypothesis, successMetric, sampleSizeEstimate,
//   statisticalApproach, winCriteria, implementationNotes } }

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
      element?: string; currentVersion?: string; goal?: string; audience?: string
    }

    if (!body.element || !body.currentVersion) {
      return NextResponse.json({ error: 'element and currentVersion are required' }, { status: 400 })
    }

    const admin = getAdmin()

    const [{ data: gtmArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'

    const gtm = gtmArt?.content as Record<string, unknown> | null
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? 'early-stage founders'

    const prompt = `You are Patel, a GTM expert. Design an A/B test for ${startupName}.

COMPANY: ${startupName} (${industry})
ICP: ${icp}
ELEMENT TO TEST: ${body.element}
CURRENT VERSION (Control A): "${body.currentVersion}"
GOAL: ${body.goal ?? 'increase conversion rate'}
TARGET AUDIENCE: ${body.audience ?? icp}

Generate 3 challenger variants (B, C, D) that each test a distinct hypothesis. Each variant should be based on a different psychological/conversion principle.

Return JSON only (no markdown):
{
  "element": "${body.element}",
  "hypothesis": "overall hypothesis for why the current version underperforms",
  "successMetric": "the specific metric to measure (e.g. click-through rate on CTA button)",
  "sampleSizeEstimate": "estimated traffic needed per variant to reach significance",
  "testDuration": "recommended test duration",
  "variants": [
    {
      "label": "A",
      "name": "Control",
      "content": "${body.currentVersion}",
      "principle": "baseline",
      "hypothesis": "current state",
      "expectedLift": "baseline"
    },
    {
      "label": "B",
      "name": "short variant name",
      "content": "the actual copy/variant text — ready to use",
      "principle": "psychological principle (e.g. social proof, scarcity, curiosity, specificity)",
      "hypothesis": "why this will outperform A",
      "expectedLift": "estimated % lift range (e.g. 5-15%)"
    },
    {
      "label": "C",
      "name": "short variant name",
      "content": "the actual copy/variant text",
      "principle": "different psychological principle",
      "hypothesis": "why this will outperform A",
      "expectedLift": "estimated % lift range"
    },
    {
      "label": "D",
      "name": "short variant name",
      "content": "the actual copy/variant text",
      "principle": "different psychological principle",
      "hypothesis": "why this will outperform A",
      "expectedLift": "estimated % lift range"
    }
  ],
  "winCriteria": "what counts as a winner — e.g. 95% statistical significance + minimum 10% lift",
  "statisticalApproach": "frequentist or bayesian — brief recommendation",
  "implementationNotes": "brief technical/UX notes on running this test",
  "pitfalls": ["common mistake to avoid 1", "pitfall 2"]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 700 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let test: Record<string, unknown> = {}
    try { test = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate A/B test' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'patel', action_type: 'ab_test_designed',
      action_data: { startupName, element: body.element },
    }).maybeSingle()

    return NextResponse.json({ test })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
