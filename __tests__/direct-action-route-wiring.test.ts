/**
 * `app/api/actions/[id]/direct/route.ts` — a source-level guard, in the established convention of
 * __tests__/action-route-wiring.test.ts.
 *
 * Source-scanned rather than executed because the regressions worth catching here are all
 * *omissions*, and an omission still compiles, still returns 200, and still looks correct in a
 * runtime test that only exercises the happy path.
 *
 * The one that has already happened once: `app/api/assets/[id]/direct/route.ts` anchors on
 * `auth.user.id` instead of the workspace owner. For a solo founder those are the same id, so it
 * works everywhere it is tried and breaks only for a teammate — silently, by finding nothing.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const route = readFileSync(
  join(__dirname, '..', 'app/api/actions/[id]/direct/route.ts'), 'utf8',
)

describe('the route is closed before it is useful', () => {
  it('checks the feature flag first, before it even reads the session', () => {
    expect(route.indexOf('newModelOff()')).toBeLessThan(route.indexOf('verifyAuth()'))
  })

  it('requires a session', () => {
    expect(route).toContain('await verifyAuth()')
    expect(route).toContain('if (!auth.ok)')
  })

  it('requires a role that may edit — a viewer cannot spend the founder\'s tokens', () => {
    expect(route).toContain('canEditAsset(role)')
    expect(route).toContain("status: 403")
  })

  it('treats a missing role as no permission, not as permission', () => {
    // getMyTeamRole returns null for a user with no startup. `canEditAsset(null)` would not
    // compile, but a cast would — and would fail open. Fail closed (CLAUDE.md §3).
    expect(route).toContain('if (!role || !canEditAsset(role))')
  })
})

describe('⚠️ it anchors on the workspace owner, not the caller', () => {
  it('resolves the founder id through getAnchorFounderId', () => {
    expect(route).toContain('getAnchorFounderId(auth.user.id, admin)')
  })

  it('never passes auth.user.id as the founderId', () => {
    // The exact shape of the assets/[id]/direct bug.
    expect(route).not.toMatch(/founderId:\s*auth\.user\.id/)
    expect(route).toContain('founderId,')
  })

  it('refuses when there is no workspace to anchor to', () => {
    expect(route).toContain('if (!founderId)')
  })
})

describe('it is thin — every real decision is re-derived in lib', () => {
  it('hands directActionRun a founder id and an action id, and nothing else that matters', () => {
    expect(route).toContain('directActionRun(admin, { founderId, actionId: id, dedupeKey })')
  })

  it('never lets the client name the Program, the contract or the execution', () => {
    // These are the fields that would turn a permission check into a suggestion.
    for (const field of ['templateId', 'programId', 'contractId', 'executionId', 'activePrograms']) {
      expect(route).not.toContain(`body?.${field}`)
      expect(route).not.toContain(`body.${field}`)
    }
  })

  it('bounds the one client-supplied string it does accept', () => {
    expect(route).toContain('dedupeKey.slice(0, 200)')
  })
})

describe('the failure paths are all defined', () => {
  it('an unknown Action id is a 404, resolved by the Registry rather than a local list', () => {
    expect(route).toContain('ActionNotFoundError')
    expect(route).toContain("status: 404")
  })

  it('a repeat click is a 200 saying so, not a second model call', () => {
    expect(route).toContain('AlreadyExecutedError')
    expect(route).toContain('alreadyRun: true')
  })

  it('a refusal is a 400 carrying the reason code, so the UI can say which one', () => {
    expect(route).toContain('DirectActionError')
    expect(route).toContain('code: err.code')
  })

  it('anything else is logged and generalised — no internals in the response body', () => {
    expect(route).toContain('log.error')
    expect(route).toMatch(/status: 500/)

    // Scoped to the fallthrough branch deliberately. `err.message` on the DirectActionError line
    // above is our own founder-facing copy, written to be read; here it would be a stack trace,
    // a Postgres error or a model provider's response.
    const fallthrough = route.slice(route.indexOf('log.error'))
    expect(fallthrough).not.toMatch(/error:\s*(String\(err\)|err\.message|`\$\{err)/)
  })
})
