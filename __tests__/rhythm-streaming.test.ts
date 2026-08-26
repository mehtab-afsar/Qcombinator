/**
 * PRD 2 Stage 2 Part B — createDeltaWriter batches onDelta chunks into periodic
 * operating_rhythm_runs.streaming_text writes rather than one write per chunk (which would
 * multiply Postgres UPDATEs by a document's token count), and finish() always clears the
 * column so the next step never inherits stale live text.
 *
 * It also carries WHICH asset the text belongs to. A run spans every executive's Programs
 * (ADR-008), so text with no owner is text that every executive's tab renders as its own — the
 * cross-executive leak this identity closes. The load-bearing assertions here are the negative
 * one (nothing is EVER written before begin() names an asset) and the whole-object ones (both
 * columns in one update — two statements would emit two Realtime events, the first pairing new
 * text with the previous asset's id).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createDeltaWriter } from '@/lib/rhythm/streaming'

interface Update { streaming_text: string | null; streaming_asset_id: string | null }

function fakeAdmin() {
  const updates: Update[] = []
  const client = {
    from: () => ({
      update: (vals: Update) => ({
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
    writer.begin('AS001')
    writer.onDelta('a')
    writer.onDelta('b')
    expect(updates).toHaveLength(0)
  })

  it('⚠️ writes NOTHING, ever, until begin() has named an asset', () => {
    // The safety property. Unowned text is text every executive's tab claims as its own, so it
    // must never reach the column at all — not even once the flush interval has passed.
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.onDelta('orphan text')
    jest.setSystemTime(1_000_600)
    writer.onDelta('more orphan text')
    jest.setSystemTime(1_002_000)
    writer.onDelta('still orphaned')
    expect(updates).toEqual([])
  })

  it('a briefing or action — neither of which calls begin() — therefore cannot stream at all', () => {
    // Structural rather than incidental: nothing about the briefing path has to remember to
    // avoid streaming, because a writer with no asset simply drops what it is given.
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    for (let i = 0; i < 50; i++) { jest.setSystemTime(1_000_000 + i * 600); writer.onDelta('x') }
    expect(updates).toEqual([])
  })

  it('flushes the ACCUMULATED text once the flush interval has elapsed — one write, not one per chunk', () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.begin('AS001')
    writer.onDelta('Hello ')
    jest.setSystemTime(1_000_600) // past the 500ms flush interval
    writer.onDelta('world')
    // Asserted as a WHOLE object: both columns must move in the same update.
    expect(updates).toEqual([{ streaming_text: 'Hello world', streaming_asset_id: 'AS001' }])
  })

  it('a second flush after another interval carries the FULL accumulated text, not just the new part', () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.begin('AS001')
    writer.onDelta('a')
    jest.setSystemTime(1_000_600)
    writer.onDelta('b') // flush 1: "ab"
    jest.setSystemTime(1_001_200)
    writer.onDelta('c') // flush 2: "abc"
    expect(updates).toEqual([
      { streaming_text: 'ab', streaming_asset_id: 'AS001' },
      { streaming_text: 'abc', streaming_asset_id: 'AS001' },
    ])
  })

  it('begin() for a SECOND asset drops the first one\'s text — never a shared prefix', () => {
    // Without the reset, AS002's live preview would open showing the tail of AS001's document.
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.begin('AS001')
    writer.onDelta('first document')
    jest.setSystemTime(1_000_600)
    writer.onDelta(' continues')

    writer.begin('AS002')
    writer.onDelta('second')
    jest.setSystemTime(1_002_000)
    writer.onDelta(' document')

    expect(updates.at(-1)).toEqual({ streaming_text: 'second document', streaming_asset_id: 'AS002' })
    expect(updates.at(-1)!.streaming_text).not.toContain('first')
  })

  it('finish() clears BOTH columns to null, in one update', async () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.begin('AS001')
    writer.onDelta('a')
    await writer.finish()
    expect(updates.at(-1)).toEqual({ streaming_text: null, streaming_asset_id: null })
  })

  it('finish() waits for an in-flight flush before clearing, so the clear always wins (no resurrected stale text)', async () => {
    const { admin, updates } = fakeAdmin()
    const writer = createDeltaWriter(admin, 'run-1')
    writer.begin('AS001')
    writer.onDelta('a')
    jest.setSystemTime(1_000_600)
    writer.onDelta('b') // triggers a fire-and-forget flush of "ab"
    await writer.finish()
    expect(updates).toEqual([
      { streaming_text: 'ab', streaming_asset_id: 'AS001' },
      { streaming_text: null, streaming_asset_id: null },
    ])
  })

  it('a write failure is logged, never thrown — cosmetic, must not break generation', async () => {
    const client = {
      from: () => ({ update: () => ({ eq: async () => ({ error: { message: 'db down' } }) }) }),
    } as unknown as SupabaseClient
    const writer = createDeltaWriter(client, 'run-1')
    writer.begin('AS001')
    writer.onDelta('a')
    await expect(writer.finish()).resolves.toBeUndefined()
  })
})
