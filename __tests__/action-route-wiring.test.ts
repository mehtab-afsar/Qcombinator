/**
 * F14 — POST /api/actions actually sends now. Until this session, `executeApprovedAction` had
 * zero callers anywhere — approving only ever recorded consent. This is a source-level guard on
 * the specific wiring that fixed that: the 'approve' branch must call approveAction, THEN
 * executeApprovedAction, in that order, and must not silently swallow the send by only awaiting
 * the approval. Matches __tests__/team-write-gating.test.ts's source-scanning pattern for this
 * same route file — the underlying functions are unit-tested elsewhere (action-approval.test.ts,
 * action-execute.test.ts); this is specifically a regression guard on the ORDER.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const src = readFileSync(join(__dirname, '..', 'app/api/actions/route.ts'), 'utf8')

describe('POST /api/actions — approve actually triggers a send', () => {
  it('imports executeApprovedAction, not just approveAction', () => {
    expect(src).toContain("import { executeApprovedAction")
    expect(src).toMatch(/from ['"]@\/lib\/actions\/execute['"]/)
  })

  it('calls executeApprovedAction AFTER approveAction, inside the approve branch', () => {
    const approveCallIdx = src.indexOf('await approveAction(')
    const executeCallIdx = src.indexOf('await executeApprovedAction(')
    expect(approveCallIdx).toBeGreaterThan(-1)
    expect(executeCallIdx).toBeGreaterThan(-1)
    expect(executeCallIdx).toBeGreaterThan(approveCallIdx)
  })

  it('passes the APPROVED entry\'s own payloadRef through to execution, not a fresh lookup', () => {
    const block = src.slice(src.indexOf('await executeApprovedAction('), src.indexOf('await executeApprovedAction(') + 400)
    expect(block).toContain('payloadRef: approved.payloadRef')
  })

  it('the response reflects the EXECUTED entry, not the merely-approved one', () => {
    // A founder polling this response must see the real outcome (executed/failed/unknown), not
    // a stale 'approved' status that never updates.
    const approveBranch = src.slice(src.indexOf("if (decision === 'approve')"), src.indexOf("declineAction(admin"))
    expect(approveBranch).toContain('entry: executed')
  })

  it('ExecutionError is mapped to a real HTTP error, never left to fall through to a bare 500', () => {
    expect(src).toContain('ExecutionError')
    expect(src).toMatch(/err instanceof ExecutionError/)
  })
})
