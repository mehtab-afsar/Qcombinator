/**
 * lib/actions/pulled-data.ts — the cache reader behind `pulledDataContextFor`, and the
 * `PULL_SOURCES` map that both the pull route and the Actions list route key off of.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getPulledDataContext, getPulledAtTimestamps, PULL_SOURCES } from '@/lib/actions/pulled-data'

function fakeAdminForSingle(row: unknown | null, error: { message: string } | null = null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: row, error }),
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

function fakeAdminForList(rows: unknown[] | null, error: { message: string } | null = null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          in: async () => ({ data: rows, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

describe('PULL_SOURCES', () => {
  it('maps exactly the two idle-connector Actions this session wired up', () => {
    expect(PULL_SOURCES).toEqual({
      monitor_and_classify_responses: 'gmail_read',
      monitor_lead_generation: 'posthog',
    })
  })
})

describe('getPulledDataContext', () => {
  it('returns null when nothing has ever been pulled for this Action', async () => {
    const result = await getPulledDataContext(fakeAdminForSingle(null), 'f1', 'monitor_lead_generation')
    expect(result).toBeNull()
  })

  it('returns null on a query error rather than throwing', async () => {
    const result = await getPulledDataContext(fakeAdminForSingle(null, { message: 'connection lost' }), 'f1', 'monitor_lead_generation')
    expect(result).toBeNull()
  })

  it('returns null when the cached content is empty/whitespace', async () => {
    const result = await getPulledDataContext(fakeAdminForSingle({ content: '   ', pulled_at: '2026-08-20T00:00:00Z' }), 'f1', 'monitor_lead_generation')
    expect(result).toBeNull()
  })

  it('renders the real content with a pulled-at date, and marks it as real', async () => {
    const result = await getPulledDataContext(
      fakeAdminForSingle({ content: 'No matching threads found.', pulled_at: '2026-08-20T09:00:00Z' }),
      'f1', 'monitor_and_classify_responses',
    )
    expect(result).toContain('No matching threads found.')
    expect(result).toContain('2026-08-20')
    expect(result).toMatch(/real, not the model's own reasoning/i)
  })
})

describe('getPulledAtTimestamps', () => {
  it('returns an empty map for an empty action id list without querying', async () => {
    const admin = { from: jest.fn() } as unknown as SupabaseClient
    const result = await getPulledAtTimestamps(admin, 'f1', [])
    expect(result).toEqual({})
    expect((admin as unknown as { from: jest.Mock }).from).not.toHaveBeenCalled()
  })

  it('maps action_id to pulled_at for each row found', async () => {
    const rows = [
      { action_id: 'monitor_lead_generation', pulled_at: '2026-08-20T09:00:00Z' },
      { action_id: 'monitor_and_classify_responses', pulled_at: '2026-08-19T08:00:00Z' },
    ]
    const result = await getPulledAtTimestamps(fakeAdminForList(rows), 'f1', ['monitor_lead_generation', 'monitor_and_classify_responses'])
    expect(result).toEqual({
      monitor_lead_generation: '2026-08-20T09:00:00Z',
      monitor_and_classify_responses: '2026-08-19T08:00:00Z',
    })
  })

  it('returns an empty map on a query error rather than throwing', async () => {
    const result = await getPulledAtTimestamps(fakeAdminForList(null, { message: 'connection lost' }), 'f1', ['monitor_lead_generation'])
    expect(result).toEqual({})
  })
})
