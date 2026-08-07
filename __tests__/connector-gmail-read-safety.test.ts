/**
 * F13 — Gmail-read connector registration and its honest refusal to send.
 *
 * No recipient/channel allowlist applies here (there's nothing to send to) — the property worth
 * pinning for a read-only connector is that it resolves as its OWN provider, requests exactly the
 * scopes Google's docs require, and refuses `send()` loudly rather than pretending to succeed.
 */

import { getConnector } from '@/lib/connectors/registry'
import { ConnectorError } from '@/lib/connectors/types'

describe('the gmail_read connector — registered, scoped, and honestly read-only', () => {
  it('resolves as its own provider, separate from gmail (send)', () => {
    expect(getConnector('gmail_read').provider).toBe('gmail_read')
    expect(getConnector('gmail').provider).toBe('gmail')
  })

  it('requests exactly the two scopes Google\'s Gmail MCP docs require — nothing more', () => {
    expect(getConnector('gmail_read').scopes).toEqual([
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.compose',
    ])
  })

  it('send() honestly refuses rather than silently doing nothing', async () => {
    const outcome = await getConnector('gmail_read').send(
      { grantId: 'g1', founderId: 'f1', provider: 'gmail_read', accessToken: 'x', accountEmail: null, scopes: [] },
      { idempotencyKey: 'k', recipients: [], subject: '', body: '' },
    )
    expect(outcome).toEqual({ status: 'rejected', reason: 'this connection only reads Gmail, it cannot send' })
  })

  it('reconcile() is honestly null — nothing to reconcile for a read-only connector', async () => {
    const result = await getConnector('gmail_read').reconcile(
      { grantId: 'g1', founderId: 'f1', provider: 'gmail_read', accessToken: 'x', accountEmail: null, scopes: [] },
      'any-key',
    )
    expect(result).toBeNull()
  })

  it('an unrelated unknown provider still throws — the registry did not silently widen', () => {
    expect(() => getConnector('unregistered_provider')).toThrow(ConnectorError)
  })
})
