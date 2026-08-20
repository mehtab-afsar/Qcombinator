/**
 * getFounderContactsContext (lib/contacts/context.ts) — fetch + format a founder's real
 * contacts into the text `founderContactsContextFor` threads into Company Context.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getFounderContactsContext } from '@/lib/contacts/context'

function fakeAdmin(rows: unknown[] | null, error: { message: string } | null = null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: async () => ({ data: rows, error }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

describe('getFounderContactsContext', () => {
  it('returns null when the founder has no contacts', async () => {
    const result = await getFounderContactsContext(fakeAdmin([]), 'f1')
    expect(result).toBeNull()
  })

  it('returns null on a query error rather than throwing', async () => {
    const result = await getFounderContactsContext(fakeAdmin(null, { message: 'connection lost' }), 'f1')
    expect(result).toBeNull()
  })

  it('formats a contact with title and company', async () => {
    const rows = [{ name: 'Jane Doe', email: 'jane@acme.com', company: 'Acme', title: 'VP Engineering' }]
    const result = await getFounderContactsContext(fakeAdmin(rows), 'f1')
    expect(result).toContain('Jane Doe <jane@acme.com> — VP Engineering at Acme')
  })

  it('formats a contact with no company/title without a dangling separator', async () => {
    const rows = [{ name: 'Jane Doe', email: 'jane@acme.com', company: null, title: null }]
    const result = await getFounderContactsContext(fakeAdmin(rows), 'f1')
    expect(result).toContain('Jane Doe <jane@acme.com>')
    expect(result).not.toContain('Jane Doe <jane@acme.com> —')
  })

  it('includes the "never invent a recipient" instruction so the rule survives even if the prompt text is edited later', async () => {
    const rows = [{ name: 'Jane Doe', email: 'jane@acme.com', company: null, title: null }]
    const result = await getFounderContactsContext(fakeAdmin(rows), 'f1')
    expect(result).toMatch(/never invent/i)
  })
})
