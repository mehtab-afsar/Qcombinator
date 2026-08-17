/**
 * F14 — where the real Action payload lives between generation and approval.
 *
 * `resolvePayload`/`deletePayload` reuse lib/connectors/vault.ts's resolveSecret/deleteSecret
 * directly (mocked here the same way __tests__/connector-grants.test.ts mocks that module).
 * `storePayload` does NOT reuse storeSecret — it needs a name unique per payload, not per
 * founder+provider — so it's tested against a mocked `admin.rpc` instead.
 */

jest.mock('@/lib/connectors/vault', () => {
  const actual = jest.requireActual('@/lib/connectors/vault')
  return { ...actual, resolveSecret: jest.fn(), deleteSecret: jest.fn() }
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { storePayload, resolvePayload, deletePayload } from '@/lib/actions/payload-vault'
import { resolveSecret, deleteSecret, VaultError } from '@/lib/connectors/vault'
import type { ActionPayload } from '@/lib/actions/payload'

const m = (fn: unknown) => fn as jest.Mock

const payload: ActionPayload = {
  recipients: [{ email: 'jane@acme.com', name: 'Jane' }],
  subject: 'Twenty minutes?',
  body: 'Hi Jane, ...',
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('storePayload', () => {
  it('stores the payload as JSON and returns the ref', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: 'vault-ref-1', error: null })
    const admin = { rpc } as unknown as SupabaseClient

    const ref = await storePayload(admin, 'f1', payload)

    expect(ref).toBe('vault-ref-1')
    expect(rpc).toHaveBeenCalledWith('create_secret_for_connector', {
      p_secret: JSON.stringify(payload),
      p_name: expect.stringContaining('action-payload:f1:'),
    })
  })

  it('gives two payloads for the SAME founder two different names — no shared-slot collision', async () => {
    // Unlike storeSecret's fixed connector:${provider}:${founderId}, a founder can have several
    // Actions pending at once; each needs its own slot, not one the next pending Action overwrites.
    const rpc = jest.fn().mockResolvedValue({ data: 'ref', error: null })
    const admin = { rpc } as unknown as SupabaseClient

    await storePayload(admin, 'f1', payload)
    await storePayload(admin, 'f1', payload)

    const [firstName, secondName] = rpc.mock.calls.map(c => c[1].p_name)
    expect(firstName).not.toBe(secondName)
  })

  it('throws VaultError on an RPC failure, never returns undefined silently', async () => {
    const rpc = jest.fn().mockResolvedValue({ data: null, error: { code: '500', message: 'x' } })
    const admin = { rpc } as unknown as SupabaseClient
    await expect(storePayload(admin, 'f1', payload)).rejects.toThrow(VaultError)
  })
})

describe('resolvePayload', () => {
  const admin = {} as unknown as SupabaseClient

  it('round-trips the exact payload that was stored', async () => {
    m(resolveSecret).mockResolvedValue(JSON.stringify(payload))
    const resolved = await resolvePayload(admin, 'vault-ref-1')
    expect(resolved).toEqual(payload)
  })

  it('throws VaultError when the stored value is not valid JSON — never returns garbage', async () => {
    m(resolveSecret).mockResolvedValue('not json')
    await expect(resolvePayload(admin, 'vault-ref-1')).rejects.toThrow(VaultError)
  })

  it('propagates resolveSecret\'s own VaultError (missing/unreadable) unchanged', async () => {
    m(resolveSecret).mockRejectedValue(new VaultError('not_found', 'gone'))
    await expect(resolvePayload(admin, 'vault-ref-1')).rejects.toThrow('gone')
  })
})

describe('deletePayload', () => {
  it('delegates straight to deleteSecret with the same ref', async () => {
    const admin = {} as unknown as SupabaseClient
    await deletePayload(admin, 'vault-ref-1')
    expect(deleteSecret).toHaveBeenCalledWith(admin, 'vault-ref-1')
  })
})
