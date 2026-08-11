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
// The vault holds a REFRESH token; resolveGrant exchanges it for a short-lived access token on
// every resolve. Mocking the vault alone is what let the 401 reach production — these tests must
// distinguish the two credentials, not treat them as one string.
jest.mock('@/lib/connectors/gmail/send-oauth', () => ({
  refreshAccessToken: jest.fn(async (refresh: string) => {
    if (refresh !== 'ya29.TOKEN') throw new Error('google refused the refresh')
    return { accessToken: 'access.MINTED', expiresAt: null }
  }),
}))
// Slack bot tokens don't refresh — mocked separately so the "which provider's dispatch actually
// ran" regression test below can tell the two apart.
jest.mock('@/lib/connectors/slack/oauth', () => ({
  mintAccessToken: jest.fn(async (stored: string) => ({ accessToken: `slack.${stored}`, expiresAt: null })),
}))
// gmail_read is a THIRD provider sharing Google's refresh mechanics conceptually but dispatched
// through its own module — mocked separately for the same reason slack-oauth is.
jest.mock('@/lib/connectors/gmail/read-oauth', () => ({
  mintAccessToken: jest.fn(async (stored: string) => ({ accessToken: `gmailread.${stored}`, expiresAt: null })),
}))

import type { SupabaseClient } from '@supabase/supabase-js'
import { recordGrant, resolveGrant, revokeGrant } from '@/lib/connectors/grants'
import { storeSecret, resolveSecret, deleteSecret } from '@/lib/connectors/vault'
import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'
import { refreshAccessToken } from '@/lib/connectors/gmail/send-oauth'
import { mintAccessToken as slackMintAccessToken } from '@/lib/connectors/slack/oauth'
import { mintAccessToken as gmailReadMintAccessToken } from '@/lib/connectors/gmail/read-oauth'

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
    // The MINTED access token, never the stored refresh token — the distinction the first real
    // send exposed. Asserting the stored value here is what made a broken resolve look green.
    expect(grant.accessToken).toBe('access.MINTED')
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

  /**
   * A fault on OUR side must never kill the founder's connection.
   *
   * Found in a live run: a script started without the Google client env, refreshAccessToken threw
   * `not_configured`, and the catch-all handler marked a working grant `expired` — so a typo in
   * our own deployment would have told every founder to reconnect. Google refusing us and us
   * being broken are different facts and must have different consequences.
   */
  it('does NOT expire the grant when the failure is ours, not Google\'s', async () => {
    m(refreshAccessToken).mockRejectedValueOnce(
      new ConnectorError('not_configured', 'The Gmail connector is not configured.'),
    )
    await expect(resolveGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')).rejects.toThrow()
    expect(calls).not.toContain('db:update') // the grant is left exactly as it was
  })

  /** Google refusing the refresh DOES mean the grant is dead — the founder revoked us upstream. */
  it('expires the grant when Google refuses the refresh', async () => {
    m(refreshAccessToken).mockRejectedValueOnce(new Error('invalid_grant'))
    await expect(resolveGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')).rejects.toThrow()
    expect(calls).toContain('db:update')
  })
})

/**
 * F13 — the regression test for a real gap found adding Slack: `resolveGrant` used to import
 * Google's `refreshAccessToken` directly and call it unconditionally, regardless of `provider`.
 * A second provider's resolve would have silently gone through Google's refresh logic. The fix is
 * `lib/connectors/oauth-provider.ts`'s dispatch table — this proves resolving a Slack grant uses
 * Slack's own `mintAccessToken` and never touches Google's `refreshAccessToken` at all.
 */
describe('resolve dispatches to the PROVIDER-OWNED credential mint, not always Google\'s', () => {
  it('resolving a slack grant calls slack-oauth.mintAccessToken, never oauth.refreshAccessToken', async () => {
    const grant = await resolveGrant(
      fakeAdmin({ row: activeRow({ provider: 'slack', scopes: ['chat:write'] }) }),
      'f1',
      'slack',
    )
    expect(grant.accessToken).toBe('slack.ya29.TOKEN')
    expect(slackMintAccessToken).toHaveBeenCalledWith('ya29.TOKEN')
    expect(refreshAccessToken).not.toHaveBeenCalled()
  })

  it('resolving a gmail grant still calls oauth.refreshAccessToken, never slack-oauth.mintAccessToken', async () => {
    await resolveGrant(fakeAdmin({ row: activeRow() }), 'f1', 'gmail')
    expect(refreshAccessToken).toHaveBeenCalledWith('ya29.TOKEN')
    expect(slackMintAccessToken).not.toHaveBeenCalled()
  })

  it('resolving a gmail_read grant calls its OWN mintAccessToken, never gmail\'s or slack\'s', async () => {
    const grant = await resolveGrant(
      fakeAdmin({ row: activeRow({ provider: 'gmail_read', scopes: ['https://www.googleapis.com/auth/gmail.readonly'] }) }),
      'f1',
      'gmail_read',
    )
    expect(grant.accessToken).toBe('gmailread.ya29.TOKEN')
    expect(gmailReadMintAccessToken).toHaveBeenCalledWith('ya29.TOKEN')
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(slackMintAccessToken).not.toHaveBeenCalled()
  })
})
