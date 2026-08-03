/**
 * F14 — resolving which Executive an Action belongs to.
 *
 * `action_log` has no executive column at all — only `programId`, the DB row UUID of `programs`.
 * Added for the Command View redesign, which needs to group a founder's pending actions by
 * Executive (so "waiting for you" can say WHO is waiting on you, not just how many). Pure —
 * no Supabase — matching pickLatestPerProgram and buildProgress's testing shape.
 */

import { attachOwners, type ActionLogEntry } from '@/lib/actions/log'

const entry = (over: Partial<ActionLogEntry> = {}): ActionLogEntry => ({
  id: 'e1', founderId: 'f1', programId: 'prog-uuid-1', executionId: null,
  actionId: 'interview_customers', provider: 'gmail', irreversible: true,
  status: 'pending_approval', payloadHash: 'h1', request: {}, result: null,
  approvedBy: null, approvedAt: null, createdAt: '2026-08-04T00:00:00Z', ...over,
})

const program = { id: 'prog-uuid-1', templateId: 'P001', owner: 'growth' } as const

describe('attachOwners', () => {
  it('resolves an entry to its Program and Executive via the programId join', () => {
    const [owned] = attachOwners([entry()], [program])
    expect(owned.programTemplateId).toBe('P001')
    expect(owned.executiveId).toBe('growth')
  })

  it('an entry with no programId resolves to null owners, not a thrown error', () => {
    const [owned] = attachOwners([entry({ programId: null })], [program])
    expect(owned.programTemplateId).toBeNull()
    expect(owned.executiveId).toBeNull()
  })

  it('an entry whose programId matches nothing in the given programs degrades to null', () => {
    // The contract could be stale relative to the action_log row (a paused/removed program) —
    // this must never throw and must never invent an owner.
    const [owned] = attachOwners([entry({ programId: 'some-other-uuid' })], [program])
    expect(owned.programTemplateId).toBeNull()
    expect(owned.executiveId).toBeNull()
  })

  it('preserves every original field — this is an enrichment, not a projection', () => {
    const [owned] = attachOwners([entry()], [program])
    expect(owned.id).toBe('e1')
    expect(owned.actionId).toBe('interview_customers')
    expect(owned.status).toBe('pending_approval')
  })

  it('resolves each entry against its own program independently', () => {
    const secondProgram = { id: 'prog-uuid-2', templateId: 'P002', owner: 'finance' } as const
    const [a, b] = attachOwners(
      [entry({ id: 'e1', programId: 'prog-uuid-1' }), entry({ id: 'e2', programId: 'prog-uuid-2' })],
      [program, secondProgram],
    )
    expect(a.executiveId).toBe('growth')
    expect(b.executiveId).toBe('finance')
  })
})
