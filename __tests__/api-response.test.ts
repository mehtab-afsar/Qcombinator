/**
 * The shared new-model route guard.
 *
 * This test exists because of what the extraction revealed: the per-route flag tests were
 * scanning source TEXT for `if (FF_NEW_EXECUTIVE_MODEL) return null`, so they proved a string
 * was present, not that the guard behaved. Now that there is exactly one definition
 * (CODEBASE_AUDIT Q-1), it can be executed for real — this asserts the outcome, not the source.
 */

const flagState = { on: false }
jest.mock('@/lib/feature-flags', () => ({
  get FF_NEW_EXECUTIVE_MODEL() { return flagState.on },
}))

import { newModelOff } from '@/lib/api/response'

describe('newModelOff — the one gate for every new-model route', () => {
  it('when the flag is OFF, returns a 404 — invisible, not merely forbidden', async () => {
    flagState.on = false
    const res = newModelOff()

    expect(res).not.toBeNull()
    // 404 over 403 on purpose: a 403 confirms to an unauthenticated caller that the route
    // exists. Until the pilot, the new model should not be discoverable at all (ADR-014).
    expect(res!.status).toBe(404)
    expect(await res!.json()).toEqual({ error: 'Not found' })
  })

  it('when the flag is ON, returns null so the route proceeds', () => {
    flagState.on = true
    expect(newModelOff()).toBeNull()
  })

  it('reads the flag on every call — never captured once at module load', () => {
    // A guard that snapshotted the flag at import time would be un-flippable without a redeploy
    // and would silently diverge between routes loaded at different moments.
    flagState.on = true
    expect(newModelOff()).toBeNull()
    flagState.on = false
    expect(newModelOff()).not.toBeNull()
  })
})
