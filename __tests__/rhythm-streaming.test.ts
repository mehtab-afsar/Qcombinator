/**
 * PRD 2 Stage 2 Part B — createDeltaWriter batches onDelta chunks into periodic
 * operating_rhythm_runs.streaming_text writes rather than one write per chunk (which would
 * multiply Postgres UPDATEs by a document's token count), and finish() always clears the
 * column so the next step never inherits stale live text.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createDeltaWriter } from '@/lib/rhythm/streaming'

function fakeAdmin() {
  const updates: Array<{ streaming_text: string | null }> = []
  const client = {
    from: () => ({
      update: (vals: { streaming_text: string | null }) => ({
        eq: async () => { updates.push(vals); return { error: null } },
      }),
    }),
  }
  return { admin: client as unknown as SupabaseClient, updates }
}

describe('createDeltaWriter', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(1_000_000))
  afterEach(() => jest.useRealTimers())

  it('does not write before the flush interval has elapsed', () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.onDelta('a')
    writer.onDelta('b')
    expect(updates).toHaveLength(0)
  })

  it('flushes the ACCUMULATED text once the flush interval has elapsed — one write, not one per chunk', () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.onDelta('Hello ')
    jest.setSystemTime(1_000_600) // past the 500ms flush interval
    writer.onDelta('world')
    expect(updates).toEqual([{ streaming_text: 'Hello world' }])
  })

  it('a second flush after another interval carries the FULL accumulated text, not just the new part', () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.onDelta('a')
    jest.setSystemTime(1_000_600)
    writer.onDelta('b') // flush 1: "ab"
    jest.setSystemTime(1_001_200)
    writer.onDelta('c') // flush 2: "abc"
    expect(updates).toEqual([{ streaming_text: 'ab' }, { streaming_text: 'abc' }])
  })

  it('finish() clears the column to null', async () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.onDelta('a')
    await writer.finish()
    expect(updates.at(-1)).toEqual({ streaming_text: null })
  })

  it('finish() waits for an in-flight flush before clearing, so the clear always wins (no resurrected stale text)', async () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.onDelta('a')
    jest.setSystemTime(1_000_600)
    writer.onDelta('b') // triggers a fire-and-forget flush of "ab"
    await writer.finish()
    expect(updates).toEqual([{ streaming_text: 'ab' }, { streaming_text: null }])
  })

  it('a write failure is logged, never thrown — cosmetic, must not break generation', async () => {
    const client = {
      from: () => ({ update: () => ({ eq: async () => ({ error: { message: 'db down' } }) }) }),
    } as unknown as SupabaseClient
    const writer = createDeltaWriter(client, 'run-1')
    writer.onDelta('a')
    await expect(writer.finish()).resolves.toBeUndefined()
  })
})
