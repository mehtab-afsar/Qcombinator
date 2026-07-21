/**
 * GET /api/cron/rhythm — the weekly Operating-Rhythm trigger (Vercel Cron).
 *
 * Starts (or resumes) one cycle for every founder with a confirmed mandate, running step 1
 * inline per founder and handing the rest off to /api/rhythm/step's self-chain — NOT awaiting
 * each founder's full 5-6-call cycle serially, which is what made even 2 founders take 16+
 * minutes before chunking. Idempotent per week (a duplicate trigger is a no-op).
 * Internal/reversible only — no external actions in v1.
 *
 * ⚠️ DOUBLY INERT BY DESIGN. It does nothing unless BOTH:
 *   1. CRON_SECRET is set (fail-closed, ADR-017 — 503 if unset, never runs unprotected), and
 *   2. FF_NEW_EXECUTIVE_MODEL is on.
 * So registering it in vercel.json spends nothing until the new model is deliberately switched
 * on with a secret present — a future pilot decision, not a side effect of shipping F10.
 */

export const runtime = 'nodejs'
// Starting N founders' step 1 inline (one Claude call each, sequential) plus a bounded number
// of founders is comfortably under this even before the chain takes over for the rest.
export const maxDuration = 200

import { NextResponse, after } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { runNextStep } from '@/lib/rhythm/run'
import { createOrResumeRun, CycleAlreadyRanError } from '@/lib/rhythm/runs'
import { weekCycleKey } from '@/lib/rhythm/cycle-key'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'

/** Same after()-based hand-off /api/rhythm/run and /api/rhythm/step use to chain themselves. */
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

export async function GET(request: Request): Promise<NextResponse> {
  // Fail closed on the secret (ADR-017): unset → 503, mismatch → 401. Never fail-open.
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Inert until the new model is on — no spend on a stray trigger.
  if (!FF_NEW_EXECUTIVE_MODEL) {
    return NextResponse.json({ ran: 0, skipped: 'new model disabled' })
  }

  const admin = createAdminClient()
  const cycleKey = weekCycleKey(new Date())

  // Founders with a current, confirmed mandate — the only ones a cycle may run for (ADR-008).
  const { data, error } = await admin
    .from('executive_contracts')
    .select('founder_id, id')
    .eq('is_current', true)
    .eq('status', 'confirmed')
  if (error) {
    log.error('cron rhythm: failed to load founders', { err: error.message })
    return NextResponse.json({ error: 'Failed to load founders' }, { status: 500 })
  }

  const founders = [...new Map((data ?? []).map(r => [r.founder_id as string, r.id as string])).entries()]

  let started = 0
  let failed = 0
  let skipped = 0
  for (const [founderId, contractId] of founders) {
    try {
      const run = await createOrResumeRun(admin, { founderId, contractId, cycleKey })
      const step = await runNextStep(admin, run.id)
      if (!step.done) triggerStep(run.id)
      started++
    } catch (err) {
      if (err instanceof CycleAlreadyRanError) {
        skipped++ // already completed this week — idempotent no-op
        continue
      }
      failed++ // one founder's failure must not abort the batch
      log.error('cron rhythm: founder cycle failed to start', { founderId, err: (err as Error)?.message })
    }
  }

  return NextResponse.json({ founders: founders.length, started, failed, skipped })
}
