/**
 * F14 — the approval gate's denial paths.
 *
 * Each check in `approveAction` exists because of a specific way an approval goes wrong. A test
 * per reason, so removing one breaks something named rather than something vague.
 *
 * The load-bearing one is the payload binding: approving must mean "yes to THIS", not "yes to
 * whatever is under that id when it eventually runs".
 */

jest.mock('@/lib/mandate/contract', () => ({ getCurrentContract: jest.fn() }))
jest.mock('@/lib/actions/log', () => {
  const actual = jest.requireActual('@/lib/actions/log')
  return { ...actual, recordAttempt: jest.fn() }
})

import type { SupabaseClient } from '@supabase/supabase-js'
import { approveAction, declineAction, ApprovalError, APPROVAL_TTL_MS } from '@/lib/actions/approve'
import { recordAttempt } from '@/lib/actions/log'
import { getCurrentContract } from '@/lib/mandate/contract'

const m = (fn: unknown) => fn as jest.Mock
const HASH = 'a'.repeat(64)

/** Minimal fake of the single-row read `approveAction` performs. */
function fakeAdmin(row: Record<string, unknown> | null): SupabaseClient {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }),
        }),
      }),
    }),
  } as unknown as SupabaseClient
}

const pendingRow = (over: Record<string, unknown> = {}) => ({
  id: 'entry-1',
  founder_id: 'f1',
  program_id: 'prog1',
  execution_id: 'run-1',
  action_id: 'interview_customers',
  provider: 'gmail',
  status: 'pending_approval',
  payload_hash: HASH,
  created_at: new Date().toISOString(),
  ...over,
})

const args = { founderId: 'f1', entryId: 'entry-1', payloadHash: HASH, approvedBy: 'f1' }

beforeEach(() => {
  jest.clearAllMocks()
  m(getCurrentContract).mockResolvedValue({ status: 'confirmed', activePrograms: ['P001'] })
  m(recordAttempt).mockImplementation(async (_a: unknown, a: Record<string, unknown>) => ({ id: 'new', ...a }))
})

describe('approval — the happy path records consent but does NOT execute', () => {
  it('appends an `approved` row carrying who and what', async () => {
    await approveAction(fakeAdmin(pendingRow()), args)

    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.status).toBe('approved')
    expect(recorded.approvedBy).toBe('f1')
    // Approving is not sending. Nothing here says 'executed'.
    expect(recorded.status).not.toBe('executed')
  })
})

describe('approval — every denial path', () => {
  it('THE PAYLOAD BINDING: a different hash is refused', async () => {
    // The founder approved what they SAW. If the payload was regenerated in between, consent
    // does not transfer to the new one — otherwise "approved" would mean "someone clicked yes
    // on this action id once".
    await expect(
      approveAction(fakeAdmin(pendingRow({ payload_hash: 'b'.repeat(64) })), args),
    ).rejects.toMatchObject({ code: 'payload_changed' })
    expect(recordAttempt).not.toHaveBeenCalled()
  })

  it('a missing stored hash is refused, not treated as a match', async () => {
    await expect(
      approveAction(fakeAdmin(pendingRow({ payload_hash: null })), args),
    ).rejects.toMatchObject({ code: 'payload_changed' })
  })

  it('an already-decided action cannot be re-approved', async () => {
    // Otherwise a stale browser tab could mint fresh consent for work already sent or declined.
    for (const status of ['executed', 'declined', 'approved', 'failed']) {
      await expect(
        approveAction(fakeAdmin(pendingRow({ status })), args),
      ).rejects.toMatchObject({ code: 'not_pending' })
    }
  })

  it('an expired action is refused — consent is about a moment, not just a payload', async () => {
    const old = new Date(Date.now() - APPROVAL_TTL_MS - 60_000).toISOString()
    await expect(
      approveAction(fakeAdmin(pendingRow({ created_at: old })), args),
    ).rejects.toMatchObject({ code: 'expired' })
  })

  it('an action just inside the window is still approvable', async () => {
    const recent = new Date(Date.now() - APPROVAL_TTL_MS + 60_000).toISOString()
    await expect(approveAction(fakeAdmin(pendingRow({ created_at: recent })), args)).resolves.toBeDefined()
  })

  it('no confirmed mandate → refused, re-checked HERE not only at generation', async () => {
    // A founder can revoke or re-issue a mandate between preparation and approval
    // (Featureinventory UC-14.6: re-check at execution time).
    m(getCurrentContract).mockResolvedValue({ status: 'draft', activePrograms: [] })
    await expect(approveAction(fakeAdmin(pendingRow()), args)).rejects.toMatchObject({ code: 'no_mandate' })

    m(getCurrentContract).mockResolvedValue(null)
    await expect(approveAction(fakeAdmin(pendingRow()), args)).rejects.toMatchObject({ code: 'no_mandate' })
  })

  it('an unknown action id is a 404, not a silent no-op', async () => {
    await expect(approveAction(fakeAdmin(null), args)).rejects.toMatchObject({ code: 'not_found' })
  })

  it('a REVERSIBLE action is not approvable — it should never have been pending', async () => {
    await expect(
      approveAction(fakeAdmin(pendingRow({ action_id: 'validate_icps' })), args),
    ).rejects.toMatchObject({ code: 'not_approvable' })
  })

  it('every denial is an ApprovalError — nothing fails open', async () => {
    await expect(approveAction(fakeAdmin(pendingRow({ status: 'executed' })), args))
      .rejects.toBeInstanceOf(ApprovalError)
  })
})

describe('declining is recorded, never deleted', () => {
  it('appends a `declined` row', async () => {
    // "The founder said no" is exactly what an audit exists to remember. A declined action that
    // vanished would look identical to one that was never prepared.
    await declineAction(fakeAdmin(pendingRow()), { founderId: 'f1', entryId: 'entry-1', declinedBy: 'f1' })

    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.status).toBe('declined')
    expect(recorded.irreversible).toBe(true)
  })

  it('cannot decline something already decided', async () => {
    await expect(
      declineAction(fakeAdmin(pendingRow({ status: 'executed' })), { founderId: 'f1', entryId: 'e', declinedBy: 'f1' }),
    ).rejects.toMatchObject({ code: 'not_pending' })
  })
})

// ─── The append-only queue trap ───────────────────────────────────────────────

describe('pendingApprovals reflects the LATEST row, not any pending row', () => {
  /**
   * The bug this pins was found by clicking the button, not by reading the code: approving
   * appends an `approved` row and leaves the original `pending_approval` row untouched (the
   * table is append-only). A naive `where status = 'pending_approval'` therefore returned the
   * item forever — the founder approved, watched it stay in the queue, and could approve it
   * again. Every unit test passed while that was true.
   */
  const rows = (list: Array<Record<string, unknown>>) => ({
    from: () => ({
      select: () => ({
        eq: () => ({ order: () => ({ limit: async () => ({ data: list, error: null }) }) }),
      }),
    }),
  }) as unknown as SupabaseClient

  const row = (over: Record<string, unknown>) => ({
    id: 'x', founder_id: 'f1', program_id: null, execution_id: 'run-1',
    action_id: 'interview_customers', provider: 'gmail', irreversible: true,
    payload_hash: HASH, request: {}, result: null, approved_by: null, approved_at: null,
    created_at: '2026-08-03T10:00:00Z', ...over,
  })

  it('an approved action LEAVES the queue even though its pending row still exists', async () => {
    const { pendingApprovals } = jest.requireActual('@/lib/actions/log')
    const list = [
      row({ id: 'b', status: 'approved', created_at: '2026-08-03T11:00:00Z' }), // newest first
      row({ id: 'a', status: 'pending_approval' }),
    ]
    expect(await pendingApprovals(rows(list), 'f1')).toEqual([])
  })

  it('a still-pending action stays in the queue', async () => {
    const { pendingApprovals } = jest.requireActual('@/lib/actions/log')
    const result = await pendingApprovals(rows([row({ id: 'a', status: 'pending_approval' })]), 'f1')
    expect(result).toHaveLength(1)
  })

  it('a declined action also leaves the queue', async () => {
    const { pendingApprovals } = jest.requireActual('@/lib/actions/log')
    const list = [
      row({ id: 'b', status: 'declined', created_at: '2026-08-03T11:00:00Z' }),
      row({ id: 'a', status: 'pending_approval' }),
    ]
    expect(await pendingApprovals(rows(list), 'f1')).toEqual([])
  })
})
