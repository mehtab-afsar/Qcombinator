/**
 * POST /api/rhythm/step — advance one Operating-Rhythm run by exactly one chunked step (one
 * asset or one briefing generation), then self-trigger the next step if the run isn't done.
 *
 * Internal only — never called by a founder's browser. The manual trigger
 * (/api/rhythm/run) and the cron (/api/cron/rhythm) both start a run and hand off to this
 * route's self-chain instead of awaiting a full cycle inline, so no single invocation has to
 * survive more than ~one Claude call (lib/rhythm/run.ts's runNextStep contract).
 *
 * Auth: INTERNAL_RUN_SECRET / x-run-secret header — the same pattern the old model already
 * uses for its own internal runner (app/api/agents/generate/run/route.ts), reused here as-is.
 */

export const runtime = 'nodejs'
// Comfortably above judge.ts's 180s worst-case single asset call and generate.ts's 120s
// briefing call — one step never does more than one of those.
export const maxDuration = 200

import { NextRequest, NextResponse, after } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { parseBody, uuidSchema } from '@/lib/api/validate'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { runNextStep, RhythmError } from '@/lib/rhythm/run'
import { env } from '@/lib/env'
import { log } from '@/lib/logger'

const bodySchema = z.object({ runId: uuidSchema })

function verifySecret(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_RUN_SECRET
  // Fail closed (ADR-017 pattern): unset → 503, mismatch → 403. Never fail-open.
  if (!secret) return NextResponse.json({ error: 'INTERNAL_RUN_SECRET not configured' }, { status: 503 })
  if (req.headers.get('x-run-secret') !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

/** Fire the next step and let it run independently — after() guarantees this survives past the response. */
function scheduleNextStep(runId: string, secret: string): void {
  after(async () => {
    await fetch(`${env.appUrl}/api/rhythm/step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-run-secret': secret },
      body: JSON.stringify({ runId }),
    }).catch(err => log.error('rhythm step self-chain trigger failed', { runId, err: (err as Error)?.message }))
  })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const forbidden = verifySecret(req)
  if (forbidden) return forbidden

  // Inert until the new model is on — a stray call can't spend anything.
  if (!FF_NEW_EXECUTIVE_MODEL) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const parsed = await parseBody(req, bodySchema)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const admin = createAdminClient()
    const step = await runNextStep(admin, parsed.data.runId)
    if (!step.done) scheduleNextStep(parsed.data.runId, process.env.INTERNAL_RUN_SECRET as string)
    return NextResponse.json({ runId: parsed.data.runId, done: step.done })
  } catch (err) {
    // A step failing to even RUN (run row missing, mandate no longer confirmed) means the
    // chain is broken, not merely slow — do not self-schedule a retry into the void.
    if (err instanceof RhythmError) {
      log.error('rhythm step aborted', { runId: parsed.data.runId, err: err.message })
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    log.error('POST /api/rhythm/step', { runId: parsed.data.runId, err })
    return NextResponse.json({ error: 'Failed to advance the run' }, { status: 500 })
  }
}
