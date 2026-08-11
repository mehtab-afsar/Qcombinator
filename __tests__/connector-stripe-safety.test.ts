/**
 * F13 — Stripe connector registration and its honest refusal to send.
 *
 * Same shape as connector-gmail-read-safety.test.ts: nothing to send, so the property worth
 * pinning is that it resolves as its own provider, requests exactly the least-privilege scope,
 * and refuses `send()` loudly rather than pretending to succeed.
 */

import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

describe('the stripe connector — registered, scoped, and honestly read-only', () => {
  it('resolves as its own provider, separate from every other connector', () => {
    expect(getConnector('stripe').provider).toBe('stripe')
    expect(getConnector('gmail').provider).toBe('gmail')
    expect(getConnector('gmail_read').provider).toBe('gmail_read')
    expect(getConnector('slack').provider).toBe('slack')
  })

  it('requests read_only — never read_write', () => {
    expect(getConnector('stripe').scopes).toEqual(['read_only'])
  })

  it('send() honestly refuses rather than silently doing nothing', async () => {
    const outcome = await getConnector('stripe').send(
      { grantId: 'g1', founderId: 'f1', provider: 'stripe', accessToken: 'x', accountEmail: null, scopes: [] },
      { idempotencyKey: 'k', recipients: [], subject: '', body: '' },
    )
    expect(outcome).toEqual({ status: 'rejected', reason: 'this connection only reads Stripe metrics, it cannot send' })
  })

  it('reconcile() is honestly null — nothing to reconcile for a read-only connector', async () => {
    const result = await getConnector('stripe').reconcile(
      { grantId: 'g1', founderId: 'f1', provider: 'stripe', accessToken: 'x', accountEmail: null, scopes: [] },
      'any-key',
    )
    expect(result).toBeNull()
  })

  it('defines onConnected — the sync hook — unlike the other three connectors', () => {
    expect(typeof getConnector('stripe').onConnected).toBe('function')
    expect(getConnector('gmail').onConnected).toBeUndefined()
    expect(getConnector('slack').onConnected).toBeUndefined()
    expect(getConnector('gmail_read').onConnected).toBeUndefined()
  })

  it('an unrelated unknown provider still throws — the registry did not silently widen', () => {
    expect(() => getConnector('unregistered_provider')).toThrow(ConnectorError)
  })
})
