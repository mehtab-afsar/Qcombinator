/**
 * POST /api/strategy/propose — draft a Strategy proposal from the founder's Q-Score
 * and company context (S001, F07b). Proposes; does NOT save.
 *
 * The founder reviews and edits what comes back, then saves it exactly the same
 * way they always could — via POST /api/strategy (lib/mandate/strategy.ts). This
 * route never writes to strategy_sessions.
 *
 * Thin by design: validate -> call lib -> return (CLAUDE.md §2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { proposeStrategy, MandateGenerationError } from '@/lib/mandate/strategy-proposal'
import { log } from '@/lib/logger'

const proposeSchema = z.object({
  // Founder-supplied free text feeding an LLM prompt — capped for the same reason
  // /api/strategy caps mission/priorities/goals (CLAUDE.md §3: bounded input).
  currentTraction: z.string().trim().max(1_000).optional(),
})

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, proposeSchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()
    const proposal = await proposeStrategy(supabase, auth.user.id, parsed.data)

    return NextResponse.json({ proposal })
  } catch (err) {
    // Expected disagreement (no score yet, or the model was unavailable) — the
    // frontend's cue to fall back to a blank, founder-authored form. Not a 500:
    // nothing here is broken, the proposal just isn't available right now.
    if (err instanceof MandateGenerationError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    log.error('POST /api/strategy/propose', { err })
    return NextResponse.json({ error: 'Could not draft a proposal' }, { status: 500 })
  }
}
