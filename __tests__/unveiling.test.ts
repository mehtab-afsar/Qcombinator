/**
 * F07 "The Unveiling" (UX_SPEC_the_frame.md §3) — the resume-state resolver and the
 * unveiling-specific route/file guards not already covered elsewhere:
 * __tests__/executive-contract.test.ts already pins ADR-003 (no PATCH/PUT/DELETE) at
 * the route level for app/api/contracts/**, and __tests__/executive-command-view.test.ts
 * already pins ADR-002 (one confirm, no approve control) across page.tsx/CommandView/
 * Unveiling/OneConfirm. This file covers what only the unveiling introduces: which
 * layer a founder resumes into, and that both streaming routes go through the router.
 */

import { readFileSync } from 'fs'
import { entryStep } from '@/features/executive/lib/unveiling-entry'
import { STAGES, activeStageIndex } from '@/features/executive/components/unveiling/MandateDrafting'
import type { Contract, Strategy } from '@/features/executive/types/executive.types'

const strategy: Strategy = { id: 's1', version: 1, mission: 'Win the ICP', priorities: ['p'], goals: ['g'] }
const contract: Contract = {
  id: 'c1', epoch: 1, version: 1, status: 'draft',
  priorities: ['p'], successMetrics: [], responsibilities: [], activePrograms: [],
  confirmedAt: null, createdAt: '', document: null,
}

describe('entryStep — the unveiling resumes from the SAME resolved data, never restarts', () => {
  it('nothing saved yet → layer 1, the read', () => {
    expect(entryStep(null, null)).toBe(1)
  })

  it('direction committed, no mandate yet → layer 3, the mandate hardens', () => {
    // Skips layers 1-2 — the founder already accepted a direction; re-showing "the
    // read" or the proposed-direction screen would re-litigate a saved decision.
    expect(entryStep(strategy, null)).toBe(3)
  })

  it('mandate already drafted → layer 4, the team claims it', () => {
    expect(entryStep(strategy, contract)).toBe(4)
  })

  it('a contract with no strategy on record still resumes past the read (contract implies a strategy exists)', () => {
    expect(entryStep(null, contract)).toBe(4)
  })
})

describe('both streaming routes go through the router, never a hardcoded model', () => {
  const propose = readFileSync('app/api/strategy/propose/route.ts', 'utf8')
  const nudge = readFileSync('app/api/strategy/nudge/route.ts', 'utf8')

  it('propose', () => {
    expect(propose).toContain("from '@/lib/llm/router'")
    expect(propose).toContain('routedStream(')
    expect(propose).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('nudge', () => {
    expect(nudge).toContain("from '@/lib/llm/router'")
    expect(nudge).toContain('routedStream(')
    expect(nudge).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('the nudge is capped well below a fresh proposal — a reshape, not a second S001 session', () => {
    expect(nudge).toContain('maxTokens: 1_200')
    expect(propose).toContain('maxTokens: 6_000')
  })
})

describe('the unveiling never edits a contract in place — only draft, then confirm (ADR-003)', () => {
  const unveiling = readFileSync('features/executive/components/unveiling/Unveiling.tsx', 'utf8')

  it('only calls the existing draft/confirm actions on POST /api/contracts, never PATCH/PUT', () => {
    expect(unveiling).toContain("action: 'draft'")
    expect(unveiling).toContain("action: 'confirm'")
    expect(unveiling).not.toMatch(/method:\s*['"](PATCH|PUT)['"]/)
  })

  it('"revise direction" re-enters layer 2 to nudge, it does not mutate the saved strategy directly', () => {
    expect(unveiling).not.toMatch(/\.update\(/)
  })
})

describe('the proposal STOPS at layer 2 for the founder to accept or nudge', () => {
  const unveiling = readFileSync('features/executive/components/unveiling/Unveiling.tsx', 'utf8')

  it('a finished proposal advances to step 2 and saves nothing on its own', () => {
    // Regression. This briefly auto-committed the proposed direction and jumped straight to the
    // ~90s mandate draft, on the theory that "Sounds right" was only ever the save call. It cost
    // the founder the one cheap moment to redirect — before the draft rather than after it — and
    // made the Thread rail mark "The direction" reached for a screen never rendered.
    const effect = unveiling.slice(unveiling.indexOf('if (proposal && step === 1)'))
    expect(effect.slice(0, 200)).toContain('setStep(2)')
    expect(effect.slice(0, 200)).not.toContain('saveAndCommit')
  })

  it('both controls are still the only way out of layer 2', () => {
    expect(unveiling).toContain('onAccept=')
    expect(unveiling).toContain('onNudgeClick=')
    const proposed = readFileSync('features/executive/components/unveiling/ProposedDirection.tsx', 'utf8')
    expect(proposed).toContain('Sounds right')
    expect(proposed).toContain('Nudge this')
  })
})

describe('the ~90s mandate wait is paced, not a spinner', () => {
  it('never steps backwards as time passes', () => {
    // The one property a fake-progress checklist must hold: a founder who watches a stage
    // un-complete reads the page as broken, which is the whole thing this replaced.
    let previous = -1
    for (let t = 0; t <= 200; t++) {
      const idx = activeStageIndex(t)
      expect(idx).toBeGreaterThanOrEqual(previous)
      previous = idx
    }
  })

  it('starts on the first stage and holds on the last', () => {
    expect(activeStageIndex(0)).toBe(0)
    expect(activeStageIndex(STAGES[STAGES.length - 1].at)).toBe(STAGES.length - 1)
    // Held well past a real ~77s generation and past generate.ts's 150s ceiling — a checklist
    // that completes while the page keeps waiting is worse than one still moving.
    expect(activeStageIndex(600)).toBe(STAGES.length - 1)
  })

  it('reaches the last stage before the draft typically returns', () => {
    // A real S002 measures ~77s (lib/mandate/generate.ts). Every stage must have had its turn
    // by then, or the pacing tells the founder less than the wait actually contains.
    expect(activeStageIndex(77)).toBe(STAGES.length - 1)
    expect(STAGES.every((s, i) => i === 0 || s.at > STAGES[i - 1].at)).toBe(true)
  })

  it('shows the founder the direction they just accepted, not an empty page', () => {
    const drafting = readFileSync('features/executive/components/unveiling/MandateDrafting.tsx', 'utf8')
    expect(drafting).toContain('mission')
    // And it names the wait. An unannounced 90 seconds reads as a hang.
    expect(drafting).toMatch(/about a minute and a half/)
  })
})
