/**
 * POST /api/rhythm/run — start one Operating-Rhythm cycle for the authenticated founder
 * (manual trigger; the cron path is /api/cron/rhythm). Idempotent per cycle_key.
 *
 * Thin: validate → call lib/rhythm/run → return (CLAUDE.md §2). Uses the service-role client
 * because the cycle writes Asset versions + Briefings (both server-side only).
 *
 * Runs step 1 synchronously (so the response reflects real progress, not a guess), then hands
 * the rest off to /api/rhythm/step's self-chain and returns 202 — a full cycle takes minutes
 * (5–6 sequential Claude calls), far past what any single HTTP invocation should be made to
 * survive. Progress is readable via the existing operating_rhythm_runs row; polling it is a
 * founder-facing follow-up, not built here.
 */

// Step 1 runs inline and can be one real Claude call (up to judge.ts's 180s worst case) —
// comfortably under this ceiling regardless of hosting tier ambiguity (see the chunking plan).
export const runtime = 'nodejs'
export const maxDuration = 200

import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { RhythmError, runNextStep } from '@/lib/rhythm/run'
import { createOrResumeRun, CycleAlreadyRanError } from '@/lib/rhythm/runs'
import { getCurrentContract } from '@/lib/mandate/contract'
import { weekCycleKey } from '@/lib/rhythm/cycle-key'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'

// cycleKey override is for dev testing only; it defaults to the current ISO week.
const bodySchema = z.object({ cycleKey: z.string().trim().max(40).optional() })

/** New model off by default (ADR-014): the route does not exist — 404, not 403. */
function flagOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/** Same after()-based hand-off the step route uses to chain itself — see its docstring. */
function triggerStep(runId: string): void {
  const secret = process.env.INTERNAL_RUN_SECRET ?? ''
  after(async () => {
    await fetch(`${env.appUrl}/api/rhythm/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-run-secret': secret },
      body: JSON.stringify({ runId }),
    }).catch(err => log.error('rhythm step trigger failed', { runId, err: (err as Error)?.message }))
  })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    // B2: a client-supplied cycleKey would let a founder bypass the once-a-week guard and run
    // unlimited paid cycles. Honour it ONLY outside production (for local/dev testing); in
    // production the key is always derived server-side (defaults to the current week).
    const cycleKey = (process.env.NODE_ENV !== 'production' ? parsed.data.cycleKey : undefined)
      ?? weekCycleKey(new Date())

    const admin = createAdminClient()
    const contract = await getCurrentContract(admin, auth.user.id)
    if (!contract || contract.status !== 'confirmed') {
      throw new RhythmError('No confirmed mandate — there is nothing to run.')
    }

    const run = await createOrResumeRun(admin, { founderId: auth.user.id, contractId: contract.id, cycleKey })
    // Step 1 runs inline: the caller's response reflects real progress, not an unstarted stub.
    const step = await runNextStep(admin, run.id)
    if (!step.done) triggerStep(run.id)

    return NextResponse.json({ runId: run.id, cycleKey, done: step.done }, { status: 202 })
  } catch (err) {
    // Already ran this week → 409 (idempotent, the founder should know it was a no-op).
    if (err instanceof CycleAlreadyRanError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    // No confirmed mandate → 400 (nothing to run yet).
    if (err instanceof RhythmError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    log.error('POST /api/rhythm/run', { err })
    return NextResponse.json({ error: 'Failed to run the cycle' }, { status: 500 })
  }
}
