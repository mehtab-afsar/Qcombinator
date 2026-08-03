/**
 * Every analytics event must have somewhere it actually fires.
 *
 * FOUND 4 Aug 2026: `lib/analytics.ts` had 11 events. Eight had zero callers anywhere in the
 * codebase — the module described a measurement plan, not a working one. Two of the eight
 * (`agent_message_sent`, `artifact_generated`) belonged to the adviser layer deleted the same day
 * and could never fire again. Nothing recorded the Executive model at all, on a project where
 * Phase 4 is decided by week-4 retention (ADR-016) and retention cannot be measured backwards.
 *
 * A type checker cannot see this — an unused export is not a type error, and `tsc` was clean the
 * whole time this was broken. This is a source-text guard for exactly that reason.
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const ROOT = join(__dirname, '..')

/** Every `export function track<Name>` in a file, mapped to its exported name. */
function trackerExports(file: string): string[] {
  const src = readFileSync(join(ROOT, file), 'utf8')
  return [...src.matchAll(/export function (track[A-Za-z]+)\(/g)].map(m => m[1])
}

/** Every .ts/.tsx file under a directory, read once and cached — this file walks the tree twice. */
function allSourceFiles(): string[] {
  const out: string[] = []
  const SKIP = new Set(['node_modules', '.next', '__tests__', 'test-results'])
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
      if (SKIP.has(entry.name)) continue
      const rel = join(dir, entry.name)
      if (entry.isDirectory()) walk(rel)
      else if (/\.tsx?$/.test(entry.name)) out.push(rel)
    }
  }
  for (const top of ['app', 'lib', 'features', 'components']) walk(top)
  return out
}

describe('analytics: every tracker is called somewhere outside its own definition', () => {
  const definitionFiles = ['lib/analytics.ts', 'lib/analytics-client.ts']
  const trackers = definitionFiles.flatMap(trackerExports)
  const files = allSourceFiles().filter(f => !definitionFiles.includes(f))
  const sources = files.map(f => readFileSync(join(ROOT, f), 'utf8'))

  it('found trackers to check (a change here means the sweep itself broke)', () => {
    expect(trackers.length).toBeGreaterThan (0)
  })

  it.each(trackers)('%s has at least one caller', name => {
    const called = sources.some(src => src.includes(`${name}(`))
    expect(called).toBe(true)
  })
})

describe('analytics: the retention signal is real', () => {
  const clientSrc = readFileSync(join(ROOT, 'lib/analytics-client.ts'), 'utf8')
  const panelSrc = readFileSync(join(ROOT, 'features/executive/components/BriefingsPanel.tsx'), 'utf8')

  it('mandate_confirmed exists — the denominator every retention question depends on', () => {
    const src = readFileSync(join(ROOT, 'lib/analytics.ts'), 'utf8')
    expect(src).toContain("'mandate_confirmed'")
  })

  it('briefing_opened fires from the panel that actually shows a briefing, not on every render', () => {
    expect(clientSrc).toContain('trackBriefingOpened')
    expect(panelSrc).toContain('trackBriefingOpened')
    // Guarded by a ref keyed on briefing id — the specific mechanism that stops a re-render (the
    // panel polls while the rhythm is running) from counting as a second visit.
    expect(panelSrc).toMatch(/reported\.current\.(has|add)/)
  })

  it('outcome tracking mirrors action_log — unknown is not silently dropped', () => {
    const src = readFileSync(join(ROOT, 'lib/analytics.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export function trackActionExecuted'))
    expect(fn).toMatch(/'executed'\s*\|\s*'unknown'\s*\|\s*'failed'/)
  })
})
