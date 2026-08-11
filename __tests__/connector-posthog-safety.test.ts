/**
 * F13 — PostHog connector registration and its honest refusal to send.
 *
 * Same shape as connector-gmail-read-safety.test.ts / connector-stripe-safety.test.ts.
 */

import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

describe('the posthog connector — registered, scoped, and honestly read-only', () => {
  it('resolves as its own provider, separate from every other connector', () => {
    expect(getConnector('posthog').provider).toBe('posthog')
    expect(getConnector('stripe').provider).toBe('stripe')
  })

  it('requests only read-only analytics scopes — never a write scope', () => {
    expect(getConnector('posthog').scopes).toEqual(['insight:read', 'dashboard:read', 'query:read'])
  })

  it('send() honestly refuses rather than silently doing nothing', async () => {
    const outcome = await getConnector('posthog').send(
      { grantId: 'g1', founderId: 'f1', provider: 'posthog', accessToken: 'x', accountEmail: null, scopes: [] },
      { idempotencyKey: 'k', recipients: [], subject: '', body: '' },
    )
    expect(outcome).toEqual({ status: 'rejected', reason: 'this connection only reads PostHog analytics, it cannot send' })
  })

  it('reconcile() is honestly null', async () => {
    const result = await getConnector('posthog').reconcile(
      { grantId: 'g1', founderId: 'f1', provider: 'posthog', accessToken: 'x', accountEmail: null, scopes: [] },
      'any-key',
    )
    expect(result).toBeNull()
  })

  it('an unrelated unknown provider still throws', () => {
    expect(() => getConnector('unregistered_provider')).toThrow(ConnectorError)
  })
})
