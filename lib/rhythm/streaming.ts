/**
 * PRD 2 Stage 2 Part B — batches onDelta chunks into periodic writes to
 * operating_rhythm_runs.streaming_text, so the Activation screen's Realtime subscription can
 * show live text for a step the founder's own browser was never connected to (the self-chain
 * runs server-to-server — see lib/rhythm/trigger.ts's own docstring on triggerNextRhythmStep).
 *
 * Batched on purpose: writing on every provider delta (a few characters each) would multiply
 * Postgres UPDATEs by the token count of every document. This coalesces them to at most one
 * write every FLUSH_MS, which is exactly what judge.ts's onDelta contract already allows —
 * "call this per chunk" never promised one write per chunk downstream.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

const FLUSH_MS = 500

/** Cosmetic — a failed write here (a Supabase error response, OR any thrown exception, e.g. a
 *  test double / misconfigured client) must never fail the generation it's describing. */
async function writeStreamingText(admin: SupabaseClient, runId: string, text: string | null): Promise<void> {
  try {
    const { error } = await admin.from('operating_rhythm_runs').update({ streaming_text: text }).eq('id', runId)
    if (error) log.warn('streaming_text write failed', { runId, err: error.message })
  } catch (err) {
    log.warn('streaming_text write failed', { runId, err: (err as Error)?.message })
  }
}

export interface DeltaWriter {
  onDelta: (text: string) => void
  /**
   * Clears the column, so the NEXT step (a different asset entirely) never inherits this one's
   * stale live text. Call exactly once, after the generation call this writer was created for
   * has returned (success or failure) — never throws.
   */
  finish: () => Promise<void>
}

/** @param admin service-role client — streaming_text has no founder-write RLS policy. */
export function createDeltaWriter(admin: SupabaseClient, runId: string): DeltaWriter {
  let accumulated = ''
  let lastFlush = Date.now()
  // Tracks the in-flight write so finish() can wait for it — otherwise a fire-and-forget flush
  // could land AFTER finish()'s clearing null write and resurrect stale text for the next step.
  let pending: Promise<void> | null = null

  function flush(text: string): void {
    pending = writeStreamingText(admin, runId, text).finally(() => { pending = null })
  }

  return {
    onDelta(text: string) {
      accumulated += text
      const now = Date.now()
      if (now - lastFlush >= FLUSH_MS) {
        lastFlush = now
        flush(accumulated)
      }
    },
    async finish() {
      if (pending) await pending.catch(() => {})
      await writeStreamingText(admin, runId, null)
    },
  }
}
