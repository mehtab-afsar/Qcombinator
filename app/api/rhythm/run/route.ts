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

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { RhythmError, runNextStep } from '@/lib/rhythm/run'
import { createOrResumeRun, getLatestRun, listRuns, CycleAlreadyRanError, StepLimitOpenError } from '@/lib/rhythm/runs'
import { triggerNextRhythmStep } from '@/lib/rhythm/trigger'
import { buildProgress } from '@/lib/rhythm/progress'
import { getCurrentContract } from '@/lib/mandate/contract'
import { weekCycleKey } from '@/lib/rhythm/cycle-key'
import { log } from '@/lib/logger'

// cycleKey override is for dev testing only; it defaults to the current ISO week.
const bodySchema = z.object({ cycleKey: z.string().trim().max(40).optional() })

/**
 * GET — the founder's latest cycle as readable progress ("Generating ICP Profiles… 2 of 6").
 * Read-only and cheap: the Command View polls this while a cycle is in flight.
 */
export async function GET(): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped on purpose — RLS (SELECT-own) is the tenancy boundary, as in /api/briefings.
    const supabase = await createClient()
    const run = await getLatestRun(supabase, auth.user.id)
    if (!run) return NextResponse.json({ progress: null, history: [] }) // nothing has ever run — not an error

    // The active Programs give the projection its total; a just-created run's stages are empty.
    const contract = await getCurrentContract(supabase, auth.user.id)
    const activePrograms = contract?.status === 'confirmed' ? contract.activePrograms : []

    // F09 artifact organization — "Past cycles". Thin by design: id/status/dates/done-total, not
    // the full per-step detail buildProgress produces (that only matters for the LIVE run).
    const runs = await listRuns(supabase, auth.user.id)
    const history = runs.map(r => {
      const p = buildProgress(r, activePrograms)
      return { id: r.id, cycleKey: r.cycleKey, status: r.status, startedAt: r.startedAt, completedAt: r.completedAt, done: p.done, total: p.total }
    })

    return NextResponse.json({ progress: buildProgress(run, activePrograms), history })
  } catch (err) {
    log.error('GET /api/rhythm/run', { err })
    return NextResponse.json({ error: 'Failed to load the cycle' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
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
    if (!step.done) triggerNextRhythmStep(run.id)

    return NextResponse.json({ runId: run.id, cycleKey, done: step.done }, { status: 202 })
  } catch (err) {
    // Already ran this week → 409 (idempotent, the founder should know it was a no-op).
    if (err instanceof CycleAlreadyRanError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    // The circuit breaker blew for this week. Also a 409 (the week is spent), but a distinct
    // message: retrying would hand the same runaway a fresh budget, so it needs a human.
    if (err instanceof StepLimitOpenError) {
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
