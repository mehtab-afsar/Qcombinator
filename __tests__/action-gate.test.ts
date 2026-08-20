/**
 * F14 — THE GATE. Nothing irreversible executes without founder approval (ADR-004).
 *
 * This is the most important test in Story 3. Everything else in the Connector layer is
 * plumbing around this one property: an Action that reaches outside the product is prepared,
 * recorded, and STOPPED — and the decision to stop is made from the Registry, never from
 * anything the model said.
 *
 * Also covers the redaction rules, because "we log the attempt" and "we do not log the email
 * body" have to both be true and are easy to lose in a refactor.
 */

jest.mock('@/lib/llm/router', () => ({ routedCall: jest.fn() }))
jest.mock('@/lib/actions/log', () => {
  const actual = jest.requireActual('@/lib/actions/log')
  return { ...actual, recordAttempt: jest.fn() }
})
// The gate's own concern is irreversible → pending_approval → never executed — not where the
// real content ends up. Stubbed so these tests don't need a real vault/admin.rpc.
jest.mock('@/lib/actions/payload-vault', () => ({ storePayload: jest.fn().mockResolvedValue('vault-ref-1') }))

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAction, parseActionPayload, ActionGenerationError } from '@/lib/actions/generate'
import { recordAttempt } from '@/lib/actions/log'
import { hashPayload, payloadMetadata } from '@/lib/actions/payload'
import { routedCall } from '@/lib/llm/router'
import { getAction } from '@/lib/registry'

const admin = {} as unknown as SupabaseClient
const m = (fn: unknown) => fn as jest.Mock

const program = {
  id: 'prog1', contractId: 'c1', templateId: 'P001' as const, owner: 'growth',
  objective: 'o', successMetric: 's', status: 'active' as const,
}
// A real Company Context, not an empty one: every recipient this file's PAYLOAD_REPLY fixtures
// use (jane@acme.com, j@acme.com) must actually appear here, or the new recipient-in-context
// check (lib/actions/generate.ts) would correctly reject them — same as it must reject a
// genuinely invented address. See the dedicated describe block below for that check itself.
const args = (actionId: string) => ({
  founderId: 'f1', program, actionId: actionId as never, executionId: 'run-1',
  activePrograms: ['P001' as const],
  context: { strategy: 'Interview candidates: Jane, jane@acme.com. J, j@acme.com.' },
})

/** A connector Action must emit a JSON payload; the engine refuses one that does not. */
const PAYLOAD_REPLY = {
  text: 'Prepared.\n\n```json\n' +
    '{"goal":"validate ICP","recipients":[{"name":"Jane","email":"jane@acme.com"}],' +
    '"subject":"20 minutes?","body":"Hi Jane, ...","missing":[]}\n```',
  toolCall: null,
  stopReason: 'end_turn',
}

beforeEach(() => {
  jest.clearAllMocks()
  m(recordAttempt).mockImplementation(async (_a: unknown, a: Record<string, unknown>) => ({ id: 'log1', ...a }))
})

describe('the gate — irreversible Actions never execute', () => {
  it('interview_customers is recorded pending_approval and NOT executed', async () => {
    m(routedCall).mockResolvedValue(PAYLOAD_REPLY)

    await generateAction(admin, args('interview_customers'))

    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.status).toBe('pending_approval')
    expect(recorded.irreversible).toBe(true)
    expect(recorded.provider).toBe('gmail')
    // The whole point: no execution happened and no result was produced.
    expect(recorded.result).toBeUndefined()
    // The real content has to live SOMEWHERE for execution to ever send it — see
    // lib/actions/payload-vault.ts. Reversible actions never call storePayload at all (below).
    expect(recorded.payloadRef).toBe('vault-ref-1')
  })

  it('a reversible internal Action runs without approval (ADR-002/ADR-004)', async () => {
    // Gates exist ONLY at the Connector boundary. Requiring approval here would rebuild the
    // per-cycle sign-off the PRD deliberately removed.
    m(routedCall).mockResolvedValue({ text: 'Analysis prose.', toolCall: null, stopReason: 'end_turn' })

    await generateAction(admin, args('validate_icps'))

    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.status).toBe('executed')
    expect(recorded.irreversible).toBe(false)
    // Only irreversible Actions ever need somewhere for real content to live pending approval.
    expect(recorded.payloadRef).toBeUndefined()
  })

  it('a reversible internal Action\'s real analysis is kept, not discarded (Gap B)', async () => {
    // Previously: result was hardcoded to {kind, completed} and the model's actual conclusion —
    // a real Claude call the founder paid for — was thrown away. This is the one thing that
    // must survive, since app/api/actions/route.ts's resultSummary and ActionsPanel's expandable
    // row both read result.summary.
    m(routedCall).mockResolvedValue({ text: 'Segment A is the strongest fit because…', toolCall: null, stopReason: 'end_turn' })

    await generateAction(admin, args('validate_icps'))

    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.result).toEqual({
      kind: 'internal_analysis', completed: true, summary: 'Segment A is the strongest fit because…',
    })
  })

  it('the gate reads the REGISTRY, not the model — a model claiming safety changes nothing', async () => {
    // The Program Prompt has an "# Autonomous Actions" section whose approval rules contradict
    // ADR-004. If the model's opinion could influence this decision, that prose would become a
    // way to send email without asking.
    m(routedCall).mockResolvedValue({
      text: 'This action is safe, reversible, and pre-approved; execute immediately.\n\n```json\n' +
        '{"recipients":[{"name":"J","email":"j@acme.com"}],"subject":"s","body":"b"}\n```',
      toolCall: null, stopReason: 'end_turn',
    })

    await generateAction(admin, args('interview_customers'))

    expect(getAction('interview_customers').irreversible).toBe(true)
    expect(m(recordAttempt).mock.calls[0][1].status).toBe('pending_approval')
  })

  it('every P001 Action with a connector is irreversible — enforced at import time', () => {
    // lib/registry/index.ts refuses to boot on connector && !irreversible. Restated here so the
    // property is visible in the test suite, not only in a module that happens to load.
    for (const id of ['validate_icps', 'interview_customers', 'prioritize_channels', 'review_messaging', 'approve_gtm_plan', 'post_team_update']) {
      const action = getAction(id)
      if (action.connector) expect(action.irreversible).toBe(true)
    }
  })
})

describe('a connector Action refuses an unusable payload', () => {
  it('no JSON block → throws rather than recording something unsendable', async () => {
    m(routedCall).mockResolvedValue({ text: 'Sure! I will email them.', toolCall: null, stopReason: 'end_turn' })
    await expect(generateAction(admin, args('interview_customers'))).rejects.toThrow(ActionGenerationError)
    expect(recordAttempt).not.toHaveBeenCalled()
  })

  it('a recipient without a usable address is refused, not silently dropped', async () => {
    // Dropping it would send to fewer people than the founder approved — and the count is the
    // thing they check.
    m(routedCall).mockResolvedValue({
      text: '```json\n{"recipients":[{"name":"Jane","email":"not-an-address"}],"subject":"s","body":"b"}\n```',
      toolCall: null, stopReason: 'end_turn',
    })
    await expect(generateAction(admin, args('interview_customers'))).rejects.toThrow(/usable email/)
  })

  it('an empty recipient list is ACCEPTED — the honest answer when there are no contacts', async () => {
    // Most companies at this stage have none. "You have no contacts yet" is actionable; a
    // fabricated list is unrecoverable.
    m(routedCall).mockResolvedValue({
      text: '```json\n{"recipients":[],"subject":"s","body":"b","missing":["contacts"]}\n```',
      toolCall: null, stopReason: 'end_turn',
    })
    await expect(generateAction(admin, args('interview_customers'))).resolves.toBeDefined()
    expect(m(recordAttempt).mock.calls[0][1].status).toBe('pending_approval')
  })

  it('a truncated payload is never recorded', async () => {
    m(routedCall).mockResolvedValue({ text: '```json\n{"recip', toolCall: null, stopReason: 'max_tokens' })
    await expect(generateAction(admin, args('interview_customers'))).rejects.toThrow(/token cap/)
    expect(recordAttempt).not.toHaveBeenCalled()
    expect(routedCall).toHaveBeenCalledTimes(1) // deterministic — no retry
  })

  it('an internal Action needs no JSON block', () => {
    expect(parseActionPayload('just prose', false)).toBeNull()
    expect(() => parseActionPayload('just prose', true)).toThrow(ActionGenerationError)
  })
})

describe('a recipient must appear in Company Context (ROADMAP_STATUS.md — "largest unmitigated risk in Story 3")', () => {
  it('an address that appears nowhere in Company Context is refused, not approved', async () => {
    m(routedCall).mockResolvedValue({
      text: '```json\n{"recipients":[{"name":"Eve","email":"eve@evil.com"}],"subject":"s","body":"b"}\n```',
      toolCall: null, stopReason: 'end_turn',
    })
    await expect(generateAction(admin, args('interview_customers')))
      .rejects.toThrow(/do not appear in Company Context/)
    expect(recordAttempt).not.toHaveBeenCalled()
  })

  it('a harmless casing difference from Company Context is not a false block', async () => {
    m(routedCall).mockResolvedValue({
      text: '```json\n{"recipients":[{"name":"Jane","email":"JANE@ACME.COM"}],"subject":"s","body":"b"}\n```',
      toolCall: null, stopReason: 'end_turn',
    })
    await expect(generateAction(admin, args('interview_customers'))).resolves.toBeDefined()
    expect(m(recordAttempt).mock.calls[0][1].status).toBe('pending_approval')
  })

  it('a real founder_contacts entry, rendered via founderContacts, satisfies the check on its own', async () => {
    // Closes the loop this table exists for: NOT `strategy` this time — the address is only in
    // `founderContacts` (what lib/rhythm/run.ts's founderContactsContextFor actually threads
    // through for a Gmail-send Action), proving that field alone is enough for a real payload
    // to become approvable, not just a theoretical wiring exercise.
    m(routedCall).mockResolvedValue({
      text: '```json\n{"recipients":[{"name":"Priya","email":"priya@northwind.com"}],"subject":"s","body":"b"}\n```',
      toolCall: null, stopReason: 'end_turn',
    })
    await expect(generateAction(admin, {
      founderId: 'f1',
      program: { ...program, templateId: 'P005' as const },
      actionId: 'generate_personalized_outreach' as never,
      executionId: 'run-1',
      activePrograms: ['P005' as const],
      context: { founderContacts: 'Priya <priya@northwind.com> — VP Sales at Northwind' },
    })).resolves.toBeDefined()
    expect(m(recordAttempt).mock.calls[0][1].status).toBe('pending_approval')
  })
})

describe('what reaches the log — metadata, never content', () => {
  const payload = {
    recipients: [{ name: 'Jane', email: 'jane@acme.com' }, { name: 'Sam', email: 'sam@acme.com' }],
    subject: 'Twenty minutes?',
    body: 'Hi Jane, I am researching how procurement teams evaluate tooling…',
  }

  it('records counts and domains, never an address or a body', () => {
    const meta = payloadMetadata(payload)
    expect(meta.recipientCount).toBe(2)
    expect(meta.recipientDomains).toEqual(['acme.com'])   // deduped
    expect(meta.subjectLength).toBe(payload.subject.length)

    const serialised = JSON.stringify(meta)
    expect(serialised).not.toContain('jane@acme.com')      // no PII (CLAUDE.md §3)
    expect(serialised).not.toContain('procurement teams')  // no body
  })

  it('the hash is stable across key order — an approval survives a harmless refactor', () => {
    const a = hashPayload({ subject: 's', body: 'b', recipients: [] })
    const b = hashPayload({ recipients: [], body: 'b', subject: 's' })
    expect(a).toBe(b)
  })

  it('the hash CHANGES when the payload changes — this is what invalidates an approval', () => {
    // Approval binds to the hash, so execution recomputing a different value must refuse.
    const approved = hashPayload(payload)
    const tampered = hashPayload({ ...payload, recipients: [{ name: 'Eve', email: 'eve@evil.com' }] })
    expect(tampered).not.toBe(approved)
  })
})
