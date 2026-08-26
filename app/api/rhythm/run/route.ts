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
 *
 * PRD 2 Stage 2 — `?stream=1` switches step 1's response to Server-Sent Events, streaming its
 * asset content live (this is the one call a founder's own browser is actually connected to;
 * every step after the first still runs unattended via the self-chain, unchanged). Opt-in, not
 * the default: the chat rail (app/api/executive/[executiveId]/chat/route.ts) already calls this
 * SAME endpoint internally for "run the cycle now" and expects the plain JSON shape below —
 * changing the default would silently break that caller. One route, two response shapes,
 * selected by the caller, not two routes (CLAUDE.md §0.1).
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
import { buildStepPreviews } from '@/lib/rhythm/preview'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { weekCycleKey } from '@/lib/rhythm/cycle-key'
import { log } from '@/lib/logger'
import { getAnchorFounderId } from '@/lib/team/founder-permissions'

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

    // Team data anchors to the startup owner's founder_id, not whichever teammate is
    // logged in — see getAnchorFounderId's own doc comment.
    const anchorId = await getAnchorFounderId(auth.user.id, supabase)
    if (!anchorId) return NextResponse.json({ error: 'No workspace found' }, { status: 400 })

    const run = await getLatestRun(supabase, anchorId)
    if (!run) return NextResponse.json({ progress: null, history: [] }) // nothing has ever run — not an error

    // The active Programs give the projection its total; a just-created run's stages are empty.
    const contract = await getCurrentContract(supabase, anchorId)
    const activePrograms = contract?.status === 'confirmed' ? contract.activePrograms : []

    // F09 artifact organization — "Past cycles". Thin by design: id/status/dates/done-total, not
    // the full per-step detail buildProgress produces (that only matters for the LIVE run).
    const runs = await listRuns(supabase, anchorId)
    const history = runs.map(r => {
      const p = buildProgress(r, activePrograms)
      return { id: r.id, cycleKey: r.cycleKey, status: r.status, startedAt: r.startedAt, completedAt: r.completedAt, done: p.done, total: p.total }
    })

    const progress = buildProgress(run, activePrograms)

    // Real content previews (PRD §3, "Activation — THE MISSING MOMENT") — only for the
    // LIVE run, only while it's running; a completed run's steps don't need recomputing
    // on every poll, and history stays thin by design (see above).
    if (run.status === 'running' && run.contractId) {
      const programs = await getProgramsForContract(supabase, run.contractId)
      const previews = await buildStepPreviews(supabase, run, progress.steps, programs)
      progress.steps = progress.steps.map(step => ({ ...step, preview: previews.get(step.key) ?? null }))
    }

    return NextResponse.json({ progress, history })
  } catch (err) {
    log.error('GET /api/rhythm/run', { err })
    return NextResponse.json({ error: 'Failed to load the cycle' }, { status: 500 })
  }
}

function sseEncode(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`)
}

/** Shared by both response modes — resolved BEFORE any streaming starts, so the EXPECTED
 *  failure cases (already ran, circuit breaker, no mandate) are always a real JSON status code,
 *  never a soft error buried inside an SSE stream (same precedent as /api/strategy/propose). */
async function resolveRun(auth: { user: { id: string } }, cycleKeyOverride?: string) {
  const cycleKey = (process.env.NODE_ENV !== 'production' ? cycleKeyOverride : undefined)
    ?? weekCycleKey(new Date())
  const admin = createAdminClient()

  // The run has to land under the ONE shared founder_id (the workspace owner's) or a
  // teammate's manual trigger creates a second, parallel cycle nobody else's reads would ever
  // see — operating_rhythm_runs' unique(founder_id, cycle_key) is per founder_id, so this
  // would silently double-run the same week under two identities rather than resuming one.
  const anchorId = await getAnchorFounderId(auth.user.id, admin)
  if (!anchorId) throw new RhythmError('No workspace found.')

  const contract = await getCurrentContract(admin, anchorId)
  if (!contract || contract.status !== 'confirmed') {
    throw new RhythmError('No confirmed mandate — there is nothing to run.')
  }
  const run = await createOrResumeRun(admin, { founderId: anchorId, contractId: contract.id, cycleKey })
  return { admin, run, cycleKey }
}

function errorResponse(err: unknown): NextResponse {
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

export async function POST(req: NextRequest): Promise<Response> {
  const off = newModelOff()
  if (off) return off

  const auth = await verifyAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

  const parsed = await parseBody(req, bodySchema)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

  const streaming = req.nextUrl.searchParams.get('stream') === '1'

  if (!streaming) {
    try {
      const { admin, run, cycleKey } = await resolveRun(auth, parsed.data.cycleKey)
      // Step 1 runs inline: the caller's response reflects real progress, not an unstarted stub.
      const step = await runNextStep(admin, run.id)
      if (!step.done) triggerNextRhythmStep(run.id)
      return NextResponse.json({ runId: run.id, cycleKey, done: step.done }, { status: 202 })
    } catch (err) {
      return errorResponse(err)
    }
  }

  // Streaming mode — resolve the expected-failure cases as a real status BEFORE opening the
  // stream; only step 1's own generation happens inside it.
  let resolved: Awaited<ReturnType<typeof resolveRun>>
  try {
    resolved = await resolveRun(auth, parsed.data.cycleKey)
  } catch (err) {
    return errorResponse(err)
  }
  const { admin, run, cycleKey } = resolved

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // The asset id must ride along, exactly as it does on the Realtime path: without it
        // the client cannot tell whether this text belongs to the document it is showing, and
        // the ownership check downstream would reject every delta — silently killing the live
        // preview for the founder's own "Run now". `begin` lets the panel open before the first
        // token; the per-delta copy means a client that missed it still pairs correctly.
        let streamingAssetId: string | null = null
        const step = await runNextStep(admin, run.id, {
          begin(assetId: string) {
            streamingAssetId = assetId
            controller.enqueue(sseEncode({ type: 'begin', assetId }))
          },
          onDelta(text: string) {
            controller.enqueue(sseEncode({ type: 'delta', text, assetId: streamingAssetId }))
          },
        })
        if (!step.done) triggerNextRhythmStep(run.id)
        controller.enqueue(sseEncode({ type: 'done', runId: run.id, cycleKey, done: step.done }))
      } catch (err) {
        // A soft error over the stream, never a bare 500 mid-connection — same fallback shape
        // errorResponse would have produced, carried as data instead of a status code.
        const message = err instanceof RhythmError ? err.message : 'Failed to run the cycle'
        log.warn('[rhythm/run stream] step 1 failed', { err: (err as Error)?.message })
        controller.enqueue(sseEncode({ type: 'done', error: message }))
      }
      controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'))
      controller.close()
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
