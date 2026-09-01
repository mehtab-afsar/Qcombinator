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
 *
 * PRD 2 Stage 2 Part B — every step this route runs is one the founder's own browser was never
 * connected to (that's the whole reason this self-chain exists — see triggerNextRhythmStep's
 * docstring), so this is the ONE place that needs the Realtime write path: judge.ts's onDelta
 * (built for Part A's inline streamed click) is reused here, batched into
 * operating_rhythm_runs.streaming_text via lib/rhythm/streaming.ts, for ActivationScreen.tsx to
 * subscribe to. Applies uniformly regardless of what started the run (a fresh confirm, the
 * weekly cron, or step 2+ of a manually-streamed cycle) — ActivationScreen watches a run to
 * completion, not just its first step, so there is no separate "is this the activation step"
 * flag to thread through.
 */

export const runtime = 'nodejs'
// Comfortably above judge.ts's 180s worst-case single asset call and generate.ts's 120s
// briefing call — one step never does more than one of those.
//
// ⚠️ THIS IS A REQUEST, NOT A GUARANTEE. The hosting plan caps it: Vercel Hobby allows 60s, so
// this 200 is silently clamped there. A single asset generation measured ~77-90s, which means on
// Hobby the function is killed MID-GENERATION — the step never records, the self-chain has
// nothing to continue from, and the run sits at 'running' until it ages into 'stalled' ten
// minutes later. That is the mechanism behind "the cycle stops and never resumes"; it is a plan
// limit, not a bug in this route. Pro (300s) is what makes this number real.
export const maxDuration = 200

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { parseBody, uuidSchema } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { runNextStep, RhythmError } from '@/lib/rhythm/run'
import { triggerNextRhythmStep } from '@/lib/rhythm/trigger'
import { createDeltaWriter } from '@/lib/rhythm/streaming'
import { log } from '@/lib/logger'

const bodySchema = z.object({ runId: uuidSchema })

function verifySecret(req: NextRequest): NextResponse | null {
  const secret = process.env.INTERNAL_RUN_SECRET
  // Fail closed (ADR-017 pattern): unset → 503, mismatch → 403. Never fail-open.
  if (!secret) return NextResponse.json({ error: 'INTERNAL_RUN_SECRET not configured' }, { status: 503 })
  if (req.headers.get('x-run-secret') !== secret) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return null
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const forbidden = verifySecret(req)
  if (forbidden) return forbidden

  // Inert until the new model is on — a stray call can't spend anything.
  const off = newModelOff()
  if (off) return off

  const parsed = await parseBody(req, bodySchema)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  try {
    const admin = createAdminClient()
    const writer = createDeltaWriter(admin, parsed.data.runId)
    let step: Awaited<ReturnType<typeof runNextStep>>
    try {
      step = await runNextStep(admin, parsed.data.runId, writer)
    } finally {
      // Clears streaming_text AND its asset id regardless of outcome — a failed step must not
      // leave stale live text on the run row for the next step (a different asset) to inherit.
      await writer.finish()
    }
    if (!step.done) triggerNextRhythmStep(parsed.data.runId)
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
