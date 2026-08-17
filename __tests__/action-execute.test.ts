/**
 * F14 — executing an approved Action. This is the path that never had a single caller until
 * now: `executeApprovedAction` is "the only path in this product that touches the outside
 * world," and every check here is a specific way real sending could go wrong.
 *
 * Central to this file: the real payload no longer arrives as an argument — it's resolved from
 * the vault, inside this function, by `payloadRef` alone (AI SDR / execution-wiring work). Every
 * test threads a `payloadRef` and mocks `resolvePayload`, never passes a raw payload.
 */

jest.mock('@/lib/mandate/contract', () => ({ getCurrentContract: jest.fn() }))
jest.mock('@/lib/connectors/registry', () => ({ getConnector: jest.fn() }))
jest.mock('@/lib/connectors/grants', () => ({ resolveGrant: jest.fn() }))
jest.mock('@/lib/actions/log', () => {
  const actual = jest.requireActual('@/lib/actions/log')
  return { ...actual, recordAttempt: jest.fn() }
})
jest.mock('@/lib/actions/payload-vault', () => ({ resolvePayload: jest.fn(), deletePayload: jest.fn() }))
// Only for the "no connector" check below: the real Registry guarantees every irreversible
// Action HAS a connector (validateRegistry refuses to boot otherwise), so exercising this
// defensive branch needs a fixture the real Registry can't provide.
jest.mock('@/lib/registry', () => {
  const actual = jest.requireActual('@/lib/registry')
  return { ...actual, getAction: jest.fn(actual.getAction) }
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { executeApprovedAction, ExecutionError } from '@/lib/actions/execute'
import { getCurrentContract } from '@/lib/mandate/contract'
import { getConnector } from '@/lib/connectors/registry'
import { resolveGrant } from '@/lib/connectors/grants'
import { recordAttempt } from '@/lib/actions/log'
import { resolvePayload, deletePayload } from '@/lib/actions/payload-vault'
import { VaultError } from '@/lib/connectors/vault'
import { hashPayload } from '@/lib/actions/payload'
import { RecipientBlockedError } from '@/lib/connectors/allowlist'
import { getAction } from '@/lib/registry'

const m = (fn: unknown) => fn as jest.Mock
const admin = {} as unknown as SupabaseClient

const payload = {
  recipients: [{ email: 'jane@acme.com', name: 'Jane' }],
  subject: 'Twenty minutes?',
  body: 'Hi Jane, ...',
}
const approvedHash = hashPayload(payload)

const baseArgs = {
  founderId: 'f1', actionId: 'interview_customers', programId: 'prog1',
  executionId: 'run1', payloadRef: 'vault-ref-1', approvedHash,
}

beforeEach(() => {
  jest.clearAllMocks()
  m(resolvePayload).mockResolvedValue(payload)
  m(getCurrentContract).mockResolvedValue({ status: 'confirmed' })
  m(recordAttempt).mockImplementation(async (_a: unknown, a: Record<string, unknown>) => ({ id: 'log1', ...a }))
})

describe('executeApprovedAction — fail-closed checks, in order', () => {
  it('resolves the payload from the vault by ref — never accepts raw content as an argument', async () => {
    m(getConnector).mockReturnValue({ send: jest.fn().mockResolvedValue({ status: 'sent', providerId: 'p1' }) })
    m(resolveGrant).mockResolvedValue({ token: 'x' })

    await executeApprovedAction(admin, baseArgs)
    expect(resolvePayload).toHaveBeenCalledWith(admin, 'vault-ref-1')
  })

  it('refuses closed when the vault read fails — never sends with guessed content', async () => {
    m(resolvePayload).mockRejectedValue(new VaultError('not_found', 'gone'))
    await expect(executeApprovedAction(admin, baseArgs)).rejects.toThrow(ExecutionError)
    await expect(executeApprovedAction(admin, baseArgs)).rejects.toMatchObject({ code: 'payload_unavailable' })
  })

  it('refuses when the resolved payload no longer hashes to what was approved', async () => {
    await expect(executeApprovedAction(admin, { ...baseArgs, approvedHash: 'stale-hash' }))
      .rejects.toMatchObject({ code: 'payload_changed' })
  })

  it('refuses when the mandate is no longer confirmed', async () => {
    m(getCurrentContract).mockResolvedValue({ status: 'draft' })
    await expect(executeApprovedAction(admin, baseArgs)).rejects.toMatchObject({ code: 'no_mandate' })
  })

  it('refuses an Action with no connector — nothing to send through', async () => {
    // A defensive check: the real Registry guarantees this never happens (validateRegistry
    // refuses to boot if an irreversible Action lacks a connector), so it's exercised here via a
    // fixture the real Registry itself would never allow.
    m(getAction).mockReturnValueOnce({
      id: 'interview_customers', name: 'x', kind: 'oneoff', irreversible: true, instructionsRef: 'x',
      // connector deliberately omitted
    })
    await expect(executeApprovedAction(admin, baseArgs)).rejects.toMatchObject({ code: 'not_external' })
  })
})

describe('executeApprovedAction — the happy path, and every outcome it can settle on', () => {
  it('records executed and cleans up the payload on a successful send', async () => {
    m(resolveGrant).mockResolvedValue({ token: 'x' })
    m(getConnector).mockReturnValue({ send: jest.fn().mockResolvedValue({ status: 'sent', providerId: 'gmail-msg-1' }) })

    const entry = await executeApprovedAction(admin, baseArgs)

    expect(entry.status).toBe('executed')
    expect(deletePayload).toHaveBeenCalledWith(admin, 'vault-ref-1')
  })

  it('records failed and STILL cleans up the payload when the provider rejects', async () => {
    m(resolveGrant).mockResolvedValue({ token: 'x' })
    m(getConnector).mockReturnValue({
      send: jest.fn().mockResolvedValue({ status: 'rejected', reason: 'invalid recipient' }),
    })

    const entry = await executeApprovedAction(admin, baseArgs)

    expect(entry.status).toBe('failed')
    expect(deletePayload).toHaveBeenCalledWith(admin, 'vault-ref-1')
  })

  it('records unknown as a first-class outcome, not a failure — and still cleans up', async () => {
    m(resolveGrant).mockResolvedValue({ token: 'x' })
    m(getConnector).mockReturnValue({
      send: jest.fn().mockResolvedValue({ status: 'unknown', reason: 'timeout' }),
    })

    const entry = await executeApprovedAction(admin, baseArgs)

    expect(entry.status).toBe('unknown')
    expect(deletePayload).toHaveBeenCalledWith(admin, 'vault-ref-1')
  })

  it('records failed and cleans up when the connector THROWS (e.g. the allowlist)', async () => {
    m(resolveGrant).mockResolvedValue({ token: 'x' })
    m(getConnector).mockReturnValue({
      send: jest.fn().mockRejectedValue(new RecipientBlockedError(['jane@acme.com'])),
    })

    const entry = await executeApprovedAction(admin, baseArgs)

    expect(entry.status).toBe('failed')
    expect(deletePayload).toHaveBeenCalledWith(admin, 'vault-ref-1')
  })

  it('a cleanup failure never masks the real recorded outcome', async () => {
    m(resolveGrant).mockResolvedValue({ token: 'x' })
    m(getConnector).mockReturnValue({ send: jest.fn().mockResolvedValue({ status: 'sent', providerId: 'p1' }) })
    m(deletePayload).mockRejectedValue(new Error('vault unreachable'))

    const entry = await executeApprovedAction(admin, baseArgs)
    expect(entry.status).toBe('executed') // still returned successfully despite cleanup failing
  })
})
