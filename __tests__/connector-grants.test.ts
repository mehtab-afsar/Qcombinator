/**
 * F13 — the grant lifecycle, and specifically its ORDERING.
 *
 * The ordering is where this goes wrong, and neither correct order is the obvious one:
 *   · connect — vault BEFORE the row, so a failure never leaves a grant that reads as working
 *     and cannot send.
 *   · revoke  — the PROVIDER before our row, so a failure never leaves a token that still works
 *     at Google with nothing on our side pointing at it.
 *
 * A test per ordering, because both are invisible in the happy path.
 */

jest.mock('@/lib/connectors/vault', () => ({
  storeSecret: jest.fn(), resolveSecret: jest.fn(), updateSecret: jest.fn(), deleteSecret: jest.fn(),
}))
jest.mock('@/lib/connectors/registry', () => ({ getConnector: jest.fn() }))

import type { SupabaseClient } from '@supabase/supabase-js'
import { recordGrant, resolveGrant, revokeGrant } from '@/lib/connectors/grants'
import { storeSecret, resolveSecret, deleteSecret } from '@/lib/connectors/vault'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

const m = (fn: unknown) => fn as jest.Mock
const calls: string[] = []

const activeRow = (over: Record<string, unknown> = {}) => ({
  id: 'grant-1', founder_id: 'f1', provider: 'gmail', status: 'active',
  scopes: ['https://www.googleapis.com/auth/gmail.send'], token_ref: 'ref-1',
  account_email: 'mo@innosphere.ventures', connected_at: 'now', expires_at: null, ...over,
})

/** Records the sequence of DB operations so ordering can be asserted, not assumed. */
function fakeAdmin(opts: { row?: Record<string, unknown> | null; insertError?: { code?: string; message: string } } = {}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: opts.row ?? null, error: null }) }),
            maybeSingle: async () => ({ data: opts.row ?? null, error: null }),
            order: async () => ({ data: opts.row ? [opts.row] : [], error: null }),
          }),
          maybeSingle: async () => ({ data: opts.row ?? null, error: null }),
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => {
            calls.push('db:insert')
            return opts.insertError
              ? { data: null, error: opts.insertError }
              : { data: activeRow(), error: null }
          },
        }),
      }),
      update: () => ({ eq: async () => { calls.push('db:update'); return { error: null } } }),
    }),
  } as unknown as SupabaseClient
}

beforeEach(() => {
  jest.clearAllMocks()
  calls.length = 0
  m(storeSecret).mockImplementation(async () => { calls.push('vault:store'); return 'ref-1' })
  m(deleteSecret).mockImplementation(async () => { calls.push('vault:delete') })
  m(resolveSecret).mockResolvedValue('ya29.TOKEN')
  m(getConnector).mockReturnValue({
    provider: 'gmail',
    revoke: jest.fn(async () => { calls.push('provider:revoke') }),
  })
})

describe('connect — the vault is written BEFORE the row', () => {
  it('stores the secret first, then the grant', async () => {
    await recordGrant(fakeAdmin(), {
      founderId: 'f1', provider: 'gmail', refreshToken: 't', scopes: [], accountEmail: null,
    })
    // Row-first would risk an `active` grant whose token_ref is null — a connection that reads
    // as working and cannot send.
    expect(calls).toEqual(['vault:store', 'db:insert'])
  })

  it('a failed row insert CLEANS UP the orphaned secret', async () => {
    await expect(recordGrant(fakeAdmin({ insertError: { message: 'boom' } }), {
      founderId: 'f1', provider: 'gmail', refreshToken: 't', scopes: [], accountEmail: null,
    })).rejects.toBeInstanceOf(ConnectorError)
    // Otherwise an unreferenced credential sits in the vault forever with nothing pointing at it.
    expect(calls).toEqual(['vault:store', 'db:insert', 'vault:delete'])
  })

  it('a double-clicked connect is refused by the unique index, not by a race we wrote', async () => {
    await expect(recordGrant(fakeAdmin({ insertError: { code: '23505', message: 'dup' } }), {
      founderId: 'f1', provider: 'gmail', refreshToken: 't', scopes: [], accountEmail: null,
    })).rejects.toMatchObject({ code: 'already_connected' })
  })
})

describe('revoke — the PROVIDER is told before our row changes', () => {
  it('revokes upstream, then marks the row, then deletes the secret', async () => {
    await revokeGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')
    // The tempting order (delete our copy first) leaves a token that still works at Google with
    // nothing on our side pointing at it — unrevokable, because we threw away the handle.
    expect(calls).toEqual(['provider:revoke', 'db:update', 'vault:delete'])
  })

  it('if the provider refuses, NOTHING local changes', async () => {
    m(getConnector).mockReturnValue({
      provider: 'gmail',
      revoke: jest.fn(async () => { throw new Error('google is down') }),
    })
    await expect(revokeGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')).rejects.toThrow()
    // Better an active grant we still know about than a live token we can no longer reach.
    expect(calls).not.toContain('db:update')
    expect(calls).not.toContain('vault:delete')
  })
})

describe('resolve — fails closed on every branch', () => {
  it('resolves an active grant into a usable credential', async () => {
    const grant = await resolveGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')
    expect(grant.accessToken).toBe('ya29.TOKEN')
    expect(grant.scopes).toEqual(['https://www.googleapis.com/auth/gmail.send'])
  })

  it('no grant → not_connected, never a silent no-op', async () => {
    await expect(resolveGrant(fakeAdmin({ row: null }), 'f1', 'gmail'))
      .rejects.toMatchObject({ code: 'not_connected' })
  })

  it('an active grant with NO token_ref fails closed rather than sending without one', async () => {
    // Means the row and the vault diverged. recordGrant is written to make this impossible, so
    // if it happens someone needs to know — never proceed.
    await expect(resolveGrant(fakeAdmin({ row: activeRow({ token_ref: null }) }), 'f1', 'gmail'))
      .rejects.toMatchObject({ code: 'no_credential' })
  })

  it('a vault failure propagates — no cached token, no "try anyway"', async () => {
    m(resolveSecret).mockRejectedValue(new Error('vault unreachable'))
    await expect(resolveGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')).rejects.toThrow()
  })
})
