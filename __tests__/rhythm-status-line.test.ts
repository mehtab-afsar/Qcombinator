/**
 * StatusLine's failed-mid-cycle branch (RhythmStepList.tsx) — no React rendering library exists
 * in this repo, so this pins the source shape directly (same convention as
 * executive-contract.test.ts's route-shape assertions), rather than rendering the component.
 *
 * The bug this guards: a single program's step can fail (run.ts marks it 'failed' permanently
 * for that run) while OTHER programs in the same cycle keep going, so the overall run stays
 * `status: 'running'`. Before this branch existed, the line just said "Working…" forever with no
 * mention of the failure — a founder had no way to tell "still working" apart from "one piece
 * already died and won't retry itself."
 */

import { readFileSync } from 'fs'

describe('StatusLine names a failed step instead of just saying "Working…"', () => {
  const src = readFileSync('features/executive/components/RhythmStepList.tsx', 'utf8')

  it('checks for a failed step among docs.steps', () => {
    expect(src).toMatch(/docs\.steps\.find\(s => s\.state === 'failed'\)/)
  })

  it('the failed-step check runs before the generic "Working…" branch', () => {
    const failedCheck = src.indexOf("docs.steps.find(s => s.state === 'failed')")
    const workingBranch = src.indexOf("status === 'running' && !docs.finished")
    expect(failedCheck).toBeGreaterThan(-1)
    expect(workingBranch).toBeGreaterThan(-1)
    expect(failedCheck).toBeLessThan(workingBranch)
  })

  it('names the failed step and explains it will retry once the cycle finishes', () => {
    const i = src.indexOf("docs.steps.find(s => s.state === 'failed')")
    const branch = src.slice(i, i + 500)
    expect(branch).toContain('failedStep.label')
    expect(branch).toContain('retry once this cycle finishes')
  })
})
