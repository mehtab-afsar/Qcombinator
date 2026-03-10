import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/sage/exit-strategy
// No body — pulls strategic_plan + qscore_history for context
// Returns: { strategy: { verdict, exitScore, exitPaths[], acquirerProfiles[], valuationRange,
//   readinessGaps[], milestones[], timeline, dealTerms, founderConsiderations, priorityAction } }

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

    const [{ data: planArt }, { data: fp }, { data: latestScore }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'sage')
        .eq('artifact_type', 'strategic_plan').order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
      admin.from('qscore_history').select('overall_score, assessment_data').eq('user_id', user.id)
        .order('calculated_at', { ascending: false }).limit(1).maybeSingle(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Seed'

    const plan = planArt?.content as Record<string, unknown> | null
    const assessment = latestScore?.assessment_data as Record<string, unknown> | null
    const qScore = latestScore?.overall_score ?? 0

    const mrr = (plan?.mrr as string | undefined) ?? (assessment?.mrr as string | undefined) ?? 'unknown'
    const arr = mrr !== 'unknown' ? `~$${(parseFloat(String(mrr).replace(/[^0-9.]/g, '')) * 12).toFixed(0)}K` : 'unknown'

    const prompt = `You are Sage, a strategic advisor. Build an exit strategy for ${startupName}.

COMPANY: ${startupName} — ${stage} ${industry}
Q-SCORE: ${qScore}/100
CURRENT MRR: ${mrr}
ESTIMATED ARR: ${arr}

Design a comprehensive exit strategy with multiple paths, acquirer targeting, and readiness roadmap.

Return JSON only (no markdown):
{
  "verdict": "1-sentence exit readiness assessment",
  "exitScore": 55,
  "exitPaths": [
    {
      "path": "Strategic Acquisition / Financial Acquisition / IPO / Merger / Acqui-hire",
      "probability": "estimated probability %",
      "timeHorizon": "years to exit",
      "targetValuation": "realistic valuation range",
      "requirements": ["what needs to be true for this path"],
      "bestFor": "why this path fits your situation"
    }
  ],
  "acquirerProfiles": [
    {
      "acquirerType": "type of strategic acquirer",
      "examples": ["example company 1", "example company 2"],
      "acquisitionThesis": "why they'd buy you",
      "whatTheyWant": "the specific asset they're acquiring",
      "outreachTiming": "when to start relationship"
    }
  ],
  "valuationRange": {
    "conservative": "low-end valuation",
    "realistic": "base case valuation",
    "optimistic": "bull case valuation",
    "primaryMultiple": "revenue / ARR / EBITDA multiple driving valuation"
  },
  "readinessGaps": [
    {
      "gap": "what's missing for exit readiness",
      "impact": "how it affects valuation",
      "fix": "how to close the gap",
      "timeToFix": "estimated time"
    }
  ],
  "milestones": [
    {
      "milestone": "milestone to hit before exit",
      "metric": "measurable target",
      "impact": "impact on valuation",
      "deadline": "target date"
    }
  ],
  "timeline": "recommended exit timeline and key dates",
  "dealTerms": {
    "earnoutStrategy": "how to structure earnouts",
    "retentionPackages": "how to retain key employees post-acquisition",
    "repsAndWarranties": "key representations to prepare",
    "escrowTypical": "typical escrow % for your stage"
  },
  "founderConsiderations": [
    "personal financial planning consideration",
    "tax optimization consideration",
    "post-acquisition role consideration"
  ],
  "priorityAction": "single most impactful action to take this quarter to improve exit positioning"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 900 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let strategy: Record<string, unknown> = {}
    try { strategy = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate exit strategy' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'sage', action_type: 'exit_strategy_built',
      action_data: { startupName, exitScore: strategy.exitScore },
    }).maybeSingle()

    return NextResponse.json({ strategy })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
