/**
 * POST /api/strategy — save the founder's direction as a new current version.
 * GET  /api/strategy — the current version + history.
 *
 * S001, the root of the mandate (PRD §9, F07). Thin by design: validate → call
 * lib/mandate/strategy.ts → return (CLAUDE.md §2).
 *
 * Generic route, not per-agent (CLAUDE.md §2). This is what replaces the
 * ~170-route persona sprawl.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import {
  getCurrentStrategy,
  getStrategyHistory,
  isStrategyComplete,
  saveStrategy,
  StrategyWriteError,
} from '@/lib/mandate/strategy'
import { log } from '@/lib/logger'

/**
 * Every field optional: a half-finished session must be saveable and resumable
 * (F07 edge case). Completeness gates the Contract (F08), not the save.
 *
 * Caps are deliberate. This text is founder-supplied and lands in layer 4 of an
 * LLM prompt — unbounded input is unbounded spend, and a 500KB "mission" is not a
 * mission (CLAUDE.md §3: validate at the boundary, never trust the client).
 */
const strategySchema = z.object({
  mission: z.string().trim().max(2_000).optional(),
  priorities: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
  goals: z.array(z.string().trim().min(1).max(500)).max(10).optional(),
})

/**
 * The new model is off by default (ADR-014, strangler migration). When off this
 * route does not exist — 404, not 403: a disabled feature should be invisible,
 * not merely forbidden.
 */
function flagOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // The user-scoped client, on purpose — RLS is the tenancy boundary here, and
    // using it means the database enforces isolation rather than this route
    // remembering to. The service role would bypass exactly the guarantee we want.
    const supabase = await createClient()
    const [current, history] = await Promise.all([
      getCurrentStrategy(supabase, auth.user.id),
      getStrategyHistory(supabase, auth.user.id),
    ])

    return NextResponse.json({
      strategy: current,
      history,
      isComplete: isStrategyComplete(current),
    })
  } catch (err) {
    log.error('GET /api/strategy', { err })
    return NextResponse.json({ error: 'Failed to load strategy' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, strategySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()
    const strategy = await saveStrategy(supabase, auth.user.id, parsed.data)

    return NextResponse.json(
      { strategy, isComplete: isStrategyComplete(strategy) },
      { status: 201 },
    )
  } catch (err) {
    // A lost race is the founder's problem to see, not a 500 to bury: their edit
    // did not stick and they need to know before they walk away from it.
    if (err instanceof StrategyWriteError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    log.error('POST /api/strategy', { err })
    return NextResponse.json({ error: 'Failed to save strategy' }, { status: 500 })
  }
}
