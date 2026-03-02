import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { callOpenRouter } from '@/lib/openrouter'

// POST /api/agents/susi/score-deals
// No body — pulls all active deals, AI scores each 0–100 for likelihood to close.
// Returns: { scores: { company, stage, score, grade, reasoning, nextAction, urgency }[],
//            avgScore, topDeal, atRiskDeals[] }

function getAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const STAGE_BASE: Record<string, number> = {
  lead: 10, qualified: 30, proposal: 55, negotiating: 75, won: 100, lost: 0,
}

function daysStale(updatedAt: string | null): number {
  if (!updatedAt) return 0
  return Math.max(0, (Date.now() - new Date(updatedAt).getTime()) / 86400000)
}

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getAdmin()

    const { data: deals } = await admin
      .from('deals')
      .select('id, company, contact_name, contact_title, stage, value, notes, next_action, created_at, updated_at')
      .eq('user_id', user.id)
      .not('stage', 'in', '("won","lost")')
      .order('updated_at', { ascending: false })

    if (!deals || deals.length === 0) {
      return NextResponse.json({ error: 'No active deals to score.' }, { status: 400 })
    }

    // Compute a base score per deal, then let LLM refine
    const dealSummaries = deals.map(d => {
      const stale = daysStale(d.updated_at)
      const baseScore = Math.max(0, (STAGE_BASE[d.stage] ?? 20) - Math.min(30, Math.floor(stale / 3)))
      return {
        id: d.id,
        company: d.company,
        stage: d.stage,
        value: d.value,
        contact: d.contact_title ? `${d.contact_name ?? ''} (${d.contact_title})` : (d.contact_name ?? 'Unknown'),
        daysStale: Math.round(stale),
        notes: d.notes ? d.notes.slice(0, 100) : null,
        nextAction: d.next_action,
        baseScore,
      }
    })

    const prompt = `You are a B2B sales expert. Score each deal 0-100 for likelihood to close. Base scores are pre-computed but adjust based on context clues.

Deals:
${JSON.stringify(dealSummaries, null, 2)}

For each deal return:
- score: 0-100 integer (use base as starting point, adjust ±20 based on context)
- grade: "A" (70+) | "B" (50-69) | "C" (30-49) | "D" (<30)
- reasoning: 1 sentence why
- nextAction: most important next step to advance
- urgency: "high" | "medium" | "low"

Return JSON array only (no markdown, no extra keys):
[{"company":"...","score":0,"grade":"...","reasoning":"...","nextAction":"...","urgency":"..."}]`

    let scored: { company: string; score: number; grade: string; reasoning: string; nextAction: string; urgency: string }[] = []
    try {
      const raw = await callOpenRouter([{ role: 'user', content: prompt }], { maxTokens: 800 })
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
      scored = JSON.parse(cleaned)
    } catch {
      // fallback: use base scores
      scored = dealSummaries.map(d => ({
        company: d.company,
        score: d.baseScore,
        grade: d.baseScore >= 70 ? 'A' : d.baseScore >= 50 ? 'B' : d.baseScore >= 30 ? 'C' : 'D',
        reasoning: `Stage: ${d.stage}, stale ${d.daysStale} days`,
        nextAction: d.nextAction ?? 'Follow up',
        urgency: d.daysStale > 14 ? 'high' : d.daysStale > 7 ? 'medium' : 'low',
      }))
    }

    // Merge LLM scores with deal IDs
    const scores = deals.map((d, i) => {
      const s = scored[i] ?? { score: dealSummaries[i].baseScore, grade: 'C', reasoning: '', nextAction: '', urgency: 'medium' }
      return {
        dealId: d.id,
        company: d.company,
        stage: d.stage,
        value: d.value,
        daysStale: Math.round(daysStale(d.updated_at)),
        score: s.score, grade: s.grade, reasoning: s.reasoning, nextAction: s.nextAction, urgency: s.urgency,
      }
    }).sort((a, b) => b.score - a.score)

    const avgScore  = scores.length > 0 ? Math.round(scores.reduce((s, d) => s + d.score, 0) / scores.length) : 0
    const topDeal   = scores[0] ?? null
    const atRisk    = scores.filter(d => d.score < 35 || d.daysStale > 21)

    await admin.from('agent_activity').insert({
      user_id: user.id, agent_id: 'susi', action_type: 'deals_scored',
      action_data: { dealsScored: scores.length, avgScore, atRiskCount: atRisk.length },
    }).maybeSingle()

    return NextResponse.json({ scores, avgScore, topDeal, atRiskDeals: atRisk })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
