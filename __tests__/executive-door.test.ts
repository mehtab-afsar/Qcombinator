/**
 * The door into the Executive model.
 *
 * ⚠️ WHAT THIS GUARDS. The previous dashboard card returned `null` until a briefing existed —
 * and a briefing needs a cycle, a cycle needs a confirmed mandate, and a mandate can only be set
 * on the page that card was the only link to. **The new product was unreachable.** You had to
 * already be inside to find the way in.
 *
 * Nothing caught it: every test called the pages directly, and typecheck cannot see that a route
 * has no inbound link. So the property pinned here is deliberately blunt — **at every stage a
 * founder can be in, the door says something and points somewhere.** A future refactor that
 * reintroduces an early `return null` fails here.
 */

import { contentFor, type DoorState } from '@/features/executive/components/ExecutiveEntryCard'

const at = (over: Partial<DoorState> = {}): DoorState =>
  ({ mandate: 'no_strategy', briefing: null, pendingCount: 0, ...over })

const briefing = { id: 'b1', verdict: 'Two ICPs validated; messaging needs work.', createdAt: '' }

describe('the door is open at every stage', () => {
  const stages: Array<[string, DoorState]> = [
    ['a brand-new founder, no Q-Score yet', at({ mandate: 'no_score' })],
    ['scored, nothing set', at({ mandate: 'no_strategy' })],
    ['direction set, no mandate yet', at({ mandate: 'no_contract' })],
    ['mandate drafted, not confirmed', at({ mandate: 'draft' })],
    ['confirmed, first cycle not finished', at({ mandate: 'confirmed' })],
    ['confirmed, a briefing exists', at({ mandate: 'confirmed', briefing })],
    ['something is waiting on the founder', at({ mandate: 'confirmed', pendingCount: 2 })],
  ]

  it.each(stages)('%s → the card renders and links somewhere', (_label, state) => {
    const content = contentFor(state)
    expect(content).not.toBeNull()
    expect(content!.headline.length).toBeGreaterThan(0)
    expect(content!.cta.length).toBeGreaterThan(0)
    expect(content!.href).toMatch(/^\/founder\//)
  })

  it('the FIRST-EVER visit is the case that was broken — pin it hard', () => {
    // A founder with no strategy, no contract, no briefing and nothing pending. This exact state
    // rendered nothing before, which is what made three Stories of work invisible.
    const content = contentFor(at({ mandate: 'no_strategy' }))
    expect(content).not.toBeNull()
    expect(content!.href).toBe('/founder/strategy')
  })

  it('a founder with no Q-Score is routed to the score, never to a cold mission box', () => {
    // The bug Mo hit personally: "set your direction" shown with no Q-Score behind it.
    // The score must come first — it's what the mandate gets drafted from.
    const content = contentFor(at({ mandate: 'no_score' }))
    expect(content).not.toBeNull()
    expect(content!.href).toBe('/founder/profile-builder')
    expect(content!.href).not.toBe('/founder/strategy')
  })
})

describe('what the door says', () => {
  it('an action waiting on the founder outranks everything else', () => {
    // Even with a briefing to show, the thing genuinely BLOCKED on them wins the card.
    const content = contentFor(at({ mandate: 'confirmed', briefing, pendingCount: 1 }))
    expect(content!.eyebrow).toBe('Needs you')
    expect(content!.headline).toContain('One action')
  })

  it('counts plurally without saying "1 actions"', () => {
    expect(contentFor(at({ mandate: 'confirmed', pendingCount: 1 }))!.headline).toContain('One action is')
    expect(contentFor(at({ mandate: 'confirmed', pendingCount: 3 }))!.headline).toContain('3 actions are')
  })

  it('shows the briefing once there is one, and says so plainly before that', () => {
    expect(contentFor(at({ mandate: 'confirmed', briefing }))!.headline).toBe(briefing.verdict)
    expect(contentFor(at({ mandate: 'confirmed' }))!.headline).toMatch(/first briefing/i)
  })

  it('never renders a door into a product that is switched off', () => {
    expect(contentFor(at({ mandate: 'disabled' }))).toBeNull()
  })

  it('is not an approval gate — the card offers no decision (ADR-002)', () => {
    // The Command View's own docstring warns against rebuilding the gate the PRD removed. A
    // dashboard card with Approve/Dismiss on it would be exactly that, one level up.
    for (const [, state] of [['', at({ mandate: 'confirmed', briefing, pendingCount: 1 })]] as const) {
      const content = contentFor(state)!
      expect(content.cta).not.toMatch(/approve|dismiss|acknowledge|accept/i)
    }
  })
})
