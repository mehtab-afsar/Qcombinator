import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/leo/term-sheet-analyzer
// Body: { instrument?: string, raiseAmount?: string, valuation?: string, leadInvestor?: string }
// Returns: { analysis: { summary, redFlags[], founderFriendly[], standardTerms[],
//   negotiationPoints[], glossary[], verdict, nextSteps[] } }

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
      instrument?: string; raiseAmount?: string; valuation?: string; leadInvestor?: string
    }

    const admin = getAdmin()

    const [{ data: tsArt }, { data: fp }] = await Promise.all([
      admin.from('agent_artifacts').select('content').eq('user_id', user.id).eq('agent_id', 'leo')
        .eq('artifact_type', 'term_sheet').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('founder_profiles').select('startup_name, startup_profile_data').eq('user_id', user.id).single(),
    ])

    const startupName = fp?.startup_name ?? 'Your startup'
    const profileData = fp?.startup_profile_data as Record<string, unknown> | null
    const stage = profileData?.stage as string ?? 'Seed'

    const ts = tsArt?.content as Record<string, unknown> | null
    const existingTerms = ts ? JSON.stringify(ts).slice(0, 500) : ''

    const instrument = body.instrument ?? 'SAFE'
    const raiseAmount = body.raiseAmount ?? '$1.5M'
    const valuation = body.valuation ?? '$8M pre-money'
    const leadInvestor = body.leadInvestor ?? 'not specified'

    const prompt = `You are Leo, a startup legal expert. Analyze a term sheet for ${startupName}.

COMPANY: ${startupName} — ${stage} stage
INSTRUMENT: ${instrument}
RAISE AMOUNT: ${raiseAmount}
VALUATION/CAP: ${valuation}
LEAD INVESTOR: ${leadInvestor}
${existingTerms ? `EXISTING TERM DATA: ${existingTerms}` : ''}

Analyze this term sheet as a founder's advocate. Explain every key term in plain English, flag red flags, highlight founder-friendly terms, and identify negotiation leverage points.

Return JSON only (no markdown):
{
  "summary": "2-3 sentence plain-English summary of this deal",
  "verdict": { "overall": "founder-friendly/market-standard/investor-friendly", "score": 72, "rationale": "why this rating" },
  "redFlags": [
    { "term": "problematic term name", "clause": "what it says", "risk": "what it means for founders", "severity": "high/medium/low", "counterProposal": "what to ask for instead" }
  ],
  "founderFriendly": [
    { "term": "favorable term", "benefit": "why this is good for founders" }
  ],
  "standardTerms": [
    { "term": "standard term", "explanation": "plain English explanation", "typical": "what's typical for ${instrument} at this stage" }
  ],
  "negotiationPoints": [
    { "point": "negotiable term", "currentPosition": "what the term sheet says", "ask": "what to negotiate for", "rationale": "why you have leverage here", "priority": "must-have/nice-to-have" }
  ],
  "glossary": [
    { "term": "legal/financial term", "definition": "plain English definition in 1 sentence" }
  ],
  "nextSteps": [
    { "step": "action to take", "timeline": "when", "who": "founder / lawyer / both" }
  ],
  "lawyerBrief": "2-3 sentence brief to give your lawyer on what to focus on in negotiation"
}`

    const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 1000 })
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
    let analysis: Record<string, unknown> = {}
    try { analysis = JSON.parse(cleaned) } catch {
      return NextResponse.json({ error: 'Failed to analyze term sheet' }, { status: 500 })
    }

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'leo', action_type: 'term_sheet_analyzed',
      action_data: { startupName, instrument, raiseAmount },
    }).maybeSingle()

    return NextResponse.json({ analysis })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
