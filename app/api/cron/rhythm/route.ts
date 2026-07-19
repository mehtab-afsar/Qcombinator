/**
 * GET /api/cron/rhythm — the weekly Operating-Rhythm trigger (Vercel Cron).
 *
 * Runs one cycle for every founder with a confirmed mandate. Idempotent per week (a duplicate
 * trigger is a no-op). Internal/reversible only — no external actions in v1.
 *
 * ⚠️ DOUBLY INERT BY DESIGN. It does nothing unless BOTH:
 *   1. CRON_SECRET is set (fail-closed, ADR-017 — 503 if unset, never runs unprotected), and
 *   2. FF_NEW_EXECUTIVE_MODEL is on.
 * So registering it in vercel.json spends nothing until the new model is deliberately switched
 * on with a secret present — a future pilot decision, not a side effect of shipping F10.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import { runCycle } from '@/lib/rhythm/run'
import { CycleAlreadyRanError } from '@/lib/rhythm/runs'
import { log } from '@/lib/logger'

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

  // Founders with a current, confirmed mandate — the only ones a cycle may run for (ADR-008).
  const { data, error } = await admin
    .from('executive_contracts')
    .select('founder_id')
    .eq('is_current', true)
    .eq('status', 'confirmed')
  if (error) {
    log.error('cron rhythm: failed to load founders', { err: error.message })
    return NextResponse.json({ error: 'Failed to load founders' }, { status: 500 })
  }

  const founderIds = [...new Set((data ?? []).map(r => r.founder_id as string))]

  let ran = 0
  let failed = 0
  let skipped = 0
  for (const founderId of founderIds) {
    try {
      await runCycle(admin, { founderId })
      ran++
    } catch (err) {
      if (err instanceof CycleAlreadyRanError) {
        skipped++ // already ran this week — idempotent no-op
        continue
      }
      failed++ // one founder's failure must not abort the batch
      log.error('cron rhythm: founder cycle failed', { founderId, err: (err as Error)?.message })
    }
  }

  return NextResponse.json({ founders: founderIds.length, ran, failed, skipped })
}
