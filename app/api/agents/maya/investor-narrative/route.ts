import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/maya/investor-narrative
// No body — pulls brand_messaging + financial_summary + gtm_playbook + competitive_matrix
// Returns: { narrative: { hook, problem, solution, traction, marketOpportunity, businessModel,
//   competitiveAdvantage, team, theAsk, closingVision, storyArc[], objectionHandlers[] } }

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

    const [{ data: brandArt }, { data: finArt }, { data: gtmArt }, { data: matrixArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'maya')
        .eq('artifact_type', 'brand_messaging').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'felix')
        .eq('artifact_type', 'financial_summary').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'patel')
        .eq('artifact_type', 'gtm_playbook').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'atlas')
        .eq('artifact_type', 'competitive_matrix').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, full_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your Startup'
    const founderName = fp?.full_name ?? 'Founder'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null

    const brand = brandArt?.content as Record<string, unknown> | null
    const fin = finArt?.content as Record<string, unknown> | null
    const gtm = gtmArt?.content as Record<string, unknown> | null
    const matrix = matrixArt?.content as Record<string, unknown> | null

    const tagline = (brand?.taglines as { tagline: string }[] | undefined)?.[0]?.tagline ?? profileData?.tagline as string ?? ''
    const oneLiner = (brand?.elevatorPitch as { oneLiner?: string } | undefined)?.oneLiner ?? profileData?.description as string ?? ''
    const snapshot = fin?.snapshot as Record<string, string> | undefined
    const mrr = snapshot?.mrr ?? snapshot?.MRR ?? ''
    const customers = snapshot?.customers ?? ''
    const fundraisingRec = (fin?.fundraisingRecommendation as { amount?: string; rationale?: string } | undefined)
    const icp = (gtm?.icp as { summary?: string } | undefined)?.summary ?? ''
    const competitors = (matrix?.competitors as { name?: string }[] | undefined)?.slice(0, 3).map(c => c.name).filter(Boolean).join(', ') ?? ''
    const industry = profileData?.industry as string ?? 'B2B SaaS'
    const stage = profileData?.stage as string ?? 'Pre-seed'
    const founderBg = profileData?.founderBackground as string ?? ''

    const prompt = `You are Maya, a brand and narrative expert. Craft a compelling fundraising story arc for ${startupName}.

CONTEXT:
- Company: ${startupName} — ${oneLiner}
- Tagline: ${tagline}
- Industry: ${industry}, Stage: ${stage}
- MRR: ${mrr || 'undisclosed'}, Customers: ${customers || 'undisclosed'}
- ICP: ${icp}
- Key competitors: ${competitors || 'none noted'}
- Fundraising target: ${fundraisingRec?.amount ?? 'undisclosed'}
- Founder: ${founderName}${founderBg ? ` — ${founderBg}` : ''}

Build a structured investor narrative — the story told across a first investor meeting, email, and pitch deck. Each section should have a strong opening line AND supporting talking points.

Return JSON only (no markdown):
{
  "hook": "1-sentence attention-grabbing opening that makes an investor lean in",
  "problem": { "headline": "problem in one punchy line", "depth": "2-3 sentences on severity/scope", "personalStory": "1-sentence founder's personal connection to this problem if possible" },
  "solution": { "headline": "what you built in one line", "insight": "the non-obvious insight that makes your approach work", "differentiation": "what you do that incumbents can't or won't" },
  "traction": { "headline": "leading traction proof point", "bullets": ["traction point 1", "traction point 2", "traction point 3"] },
  "marketOpportunity": { "framing": "how to frame the market size compellingly", "tailwind": "macro trend making this the right time" },
  "businessModel": "how you make money — simple and memorable",
  "competitiveAdvantage": { "moat": "1 sentence on defensibility", "whyYouWin": "why you win long-term vs deep-pocketed incumbents" },
  "team": { "credibility": "why this team is uniquely positioned to win", "unfairAdvantage": "the one thing about your team that others can't replicate" },
  "theAsk": { "amount": "${fundraisingRec?.amount ?? 'raise amount'}", "use": "where the money goes in 2-3 buckets", "milestone": "what you'll prove with this capital" },
  "closingVision": "the big audacious vision — where this company is in 10 years",
  "storyArc": [
    { "beat": "beat name (e.g. The Problem, The Insight, The Product, The Proof)", "talkingPoint": "what to say at this beat", "transitionLine": "how to flow to the next beat" }
  ],
  "objectionHandlers": [
    { "objection": "likely investor objection", "response": "confident, direct response with evidence" }
  ]
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1100 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let narrative: Record<string, unknown> = {}
    try { narrative = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to generate investor narrative' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'maya', action_type: 'investor_narrative_generated',
      action_data: { startupName, stage, hasObjectionHandlers: !!(narrative.objectionHandlers) },
    }).maybeSingle()

    return NextResponse.json({ narrative })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
