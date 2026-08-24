/**
 * Apollo connector registration, its honest refusal to send, and — the part unique to this
 * provider — the credential pass-through that keeps `resolveGrant` from killing the grant.
 *
 * Same shape as connector-posthog-safety.test.ts, plus a block for the API-key landmine
 * (docs/AGI_ACTIONS_PRD.md, spine slice 2).
 */

import { getConnector } from '@/lib/connectors/registry'
import { getOAuthProvider } from '@/lib/connectors/oauth-provider'
import { ConnectorError } from '@/lib/connectors/types'

const grant = {
  grantId: 'g1', founderId: 'f1', provider: 'apollo', accessToken: 'key-123',
  accountEmail: null, scopes: [],
}

describe('the apollo connector — registered, scoped, and honestly read-only', () => {
  it('resolves as its own provider, separate from every other connector', () => {
    expect(getConnector('apollo').provider).toBe('apollo')
    expect(getConnector('posthog').provider).toBe('posthog')
  })

  it('requests only read scopes — it acquires data, it never writes to Apollo', () => {
    expect(getConnector('apollo').scopes).toEqual(['people:read', 'organizations:read'])
  })

  it('send() honestly refuses rather than silently doing nothing', async () => {
    const outcome = await getConnector('apollo').send(
      grant,
      { idempotencyKey: 'k', recipients: [], subject: '', body: '' },
    )
    expect(outcome).toEqual({
      status: 'rejected',
      reason: 'this connection only reads Apollo lead data, it cannot send',
    })
  })

  it('reconcile() is honestly null', async () => {
    expect(await getConnector('apollo').reconcile(grant, 'any-key')).toBeNull()
  })

  it('revoke() does not throw — a founder must always be able to disconnect', async () => {
    // grants.ts aborts the whole disconnect if revoke throws. Apollo has no revocation endpoint,
    // so throwing here would permanently trap a founder who wants out.
    await expect(getConnector('apollo').revoke(grant)).resolves.toBeUndefined()
  })
})

describe('the API-key pass-through — the landmine this provider exists to avoid', () => {
  it('is registered in OAUTH_PROVIDERS even though it does no OAuth', () => {
    // ⚠️ resolveGrant calls getOAuthProvider(provider).mintAccessToken() on EVERY use of EVERY
    // grant. Without an entry it throws unknown_provider, and resolveGrant's catch reads that as
    // "the provider refused the refresh" and marks the founder's grant EXPIRED — a connection
    // that silently kills itself on first use. This test is the guard on that.
    expect(() => getOAuthProvider('apollo')).not.toThrow()
  })

  it('mintAccessToken returns the stored key unchanged, and never expires it', async () => {
    // The regression connector-grants.test.ts's own docstring warns about: a mismatch between
    // the stored durable credential and the returned live one. For Apollo they are the same
    // string, and anything else here means the founder's key is silently mangled before use.
    const minted = await getOAuthProvider('apollo').mintAccessToken('apollo-key-abc123')
    expect(minted).toEqual({ accessToken: 'apollo-key-abc123', expiresAt: null })
  })

  it('the three handshake members throw loudly rather than pretending to work', async () => {
    // Apollo grants are created through /api/connectors/apollo/key. Reaching these is a wiring
    // bug, and a plausible-looking return value would hide it.
    const provider = getOAuthProvider('apollo')
    await expect(provider.authorizeUrl('f1', [])).rejects.toThrow(ConnectorError)
    expect(() => provider.verifyState('state')).toThrow(ConnectorError)
    await expect(provider.exchangeCode('code', [], 'state')).rejects.toThrow(ConnectorError)
  })
})
