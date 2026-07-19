/**
 * POST /api/rhythm/run — run one Operating-Rhythm cycle for the authenticated founder
 * (manual trigger; the cron path is /api/cron/rhythm). Idempotent per cycle_key.
 *
 * Thin: validate → call lib/rhythm/run → return (CLAUDE.md §2). Uses the service-role client
 * because the cycle writes Asset versions + Briefings (both server-side only).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { runCycle, RhythmError } from '@/lib/rhythm/run'
import { CycleAlreadyRanError } from '@/lib/rhythm/runs'
import { log } from '@/lib/logger'

// cycleKey override is for dev testing only; it defaults to the current ISO week.
const bodySchema = z.object({ cycleKey: z.string().trim().max(40).optional() })

/** New model off by default (ADR-014): the route does not exist — 404, not 403. */
function flagOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const admin = createAdminClient()
    const run = await runCycle(admin, { founderId: auth.user.id, cycleKey: parsed.data.cycleKey })

    return NextResponse.json({ run }, { status: 201 })
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
