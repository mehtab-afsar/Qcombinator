/**
 * The after()-based self-chain hand-off to /api/rhythm/step — was copy-pasted three times
 * (app/api/rhythm/run/route.ts, app/api/rhythm/step/route.ts, app/api/cron/rhythm/route.ts).
 * One shared version (CLAUDE.md §2, no duplicated logic); each of those three now imports it.
 */

import { after } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createOrResumeRun, CycleAlreadyRanError, StepLimitOpenError } from './runs'
import { weekCycleKey } from './cycle-key'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'

/**
 * Fire the next step and let it run independently — after() guarantees this survives past the
 * caller's own response. Fire-and-log: a delivery failure here means the chain stalls (the
 * existing 'stalled' badge in lib/rhythm/progress.ts catches that), never that the caller's own
 * response should fail.
 */
export function triggerNextRhythmStep(runId: string): void {
  const secret = process.env.INTERNAL_RUN_SECRET ?? ''
  after(async () => {
    await fetch(`${env.appUrl}/api/rhythm/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-run-secret': secret },
      body: JSON.stringify({ runId }),
    }).catch(err => log.error('rhythm step trigger failed', { runId, err: (err as Error)?.message }))
  })
}

/**
 * Start (or resume) this week's cycle without blocking the caller on any LLM work — used by the
 * mandate-confirm route (F09 Activation, PRD §4 "the spine") so confirming immediately produces
 * a real, in-progress run for the founder to watch, without the confirm response itself waiting
 * on a Claude call. Deliberately does NOT run step 1 inline the way the manual "Run now" button
 * does (app/api/rhythm/run/route.ts) — that inline step exists so a founder who just clicked a
 * button sees fast feedback; here, createOrResumeRun alone already gets the run row to
 * status:'running' before this function returns, which is what the Activation screen's very
 * first poll needs to see.
 *
 * Swallows the two EXPECTED no-ops (already ran this week / the circuit breaker is open) and
 * logs+swallows any other failure — triggering a cycle must never make a successful mandate
 * confirmation fail. The weekly cron and the manual "Run now" button both remain as fallbacks
 * either way.
 */
export async function startCycleIfDue(
  admin: SupabaseClient,
  args: { founderId: string; contractId: string },
): Promise<void> {
  try {
    const run = await createOrResumeRun(admin, {
      founderId: args.founderId,
      contractId: args.contractId,
      cycleKey: weekCycleKey(new Date()),
    })
    triggerNextRhythmStep(run.id)
  } catch (err) {
    if (err instanceof CycleAlreadyRanError || err instanceof StepLimitOpenError) {
      log.info('cycle not started at confirm — already settled this week', { founderId: args.founderId })
      return
    }
    log.error('startCycleIfDue failed', { founderId: args.founderId, err: (err as Error)?.message })
  }
}
