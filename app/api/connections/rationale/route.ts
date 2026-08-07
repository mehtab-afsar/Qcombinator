import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody, matchRationaleSchema } from '@/lib/api/validate'
import { log } from '@/lib/logger'
import { generateMatchRationale } from '@/features/matching/services/match-rationale'

/**
 * POST /api/connections/rationale
 * Body: MatchRationaleInput (lib/api/validate.ts) — investorId XOR demoInvestorId required.
 * Returns: { rationale: string, cached: boolean }
 *
 * Called on-demand when a founder hovers/expands an investor card. Cached in
 * founder_match_explanations, keyed (founder_id, investor_id|demo_investor_id) — a hit skips
 * the LLM call entirely. Pass regenerate: true to force a fresh generation (same escape hatch
 * app/api/investor/startup/[id]/memo/route.ts already uses).
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
    const { user } = auth

    const parsed = await parseBody(req, matchRationaleSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
    const { investorId, demoInvestorId, regenerate, ...rationaleInput } = parsed.data

    const supabase = await createClient()

    if (!regenerate) {
      const { data: cached } = await supabase
        .from('founder_match_explanations')
        .select('explanation')
        .eq('founder_id', user.id)
        .eq(investorId ? 'investor_id' : 'demo_investor_id', investorId ?? demoInvestorId)
        .maybeSingle()

      if (cached) return NextResponse.json({ rationale: cached.explanation, cached: true })
    }

    const rationale = await generateMatchRationale(rationaleInput)

    const conflictCol = investorId ? 'founder_id,investor_id' : 'founder_id,demo_investor_id'
    void supabase
      .from('founder_match_explanations')
      .upsert({
        founder_id:       user.id,
        investor_id:      investorId ?? null,
        demo_investor_id: demoInvestorId ?? null,
        explanation:       rationale,
        match_score:       rationaleInput.matchScore,
      }, { onConflict: conflictCol })
      .then(({ error }) => {
        if (error) log.warn('[connections/rationale] cache write failed (non-blocking)', { error })
      })

    return NextResponse.json({ rationale, cached: false })
  } catch (err) {
    log.error('POST /api/connections/rationale', { err })
    return NextResponse.json({ rationale: '' }, { status: 200 })
  }
}
