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
import { entryStep } from '@/features/executive/components/unveiling/Unveiling'
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
