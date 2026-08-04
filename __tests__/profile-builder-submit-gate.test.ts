/**
 * The "calculate my Q-Score" button must never say ready when the server will 400.
 *
 * Bug found live: `saveSection()` (app/founder/profile-builder/page.tsx) deliberately
 * never persists the 'pitch' practice section to profile_builder_data — it's a
 * rehearsal, not scored data. But the client's own submit-gate used
 * `Object.values(sections)`, which includes 'pitch' alongside the 5 real sections.
 * A founder who only did the pitch practice saw an enabled "ready" button, clicked
 * it, and got a 400 from /api/profile-builder/submit ("Complete at least one section
 * before submitting") — because the server only ever sees what was actually saved.
 *
 * Source-text scan, matching this repo's established idiom for pinning a fix in a
 * large page component without extracting it to a pure function.
 */

import { readFileSync } from 'fs'

const page = readFileSync('app/founder/profile-builder/page.tsx', 'utf8')

describe('the Q-Score submit gate matches what the server actually sees', () => {
  it('hasAnySectionData checks only the 5 real, saved sections — not Object.values(sections)', () => {
    const line = page.split('\n').find(l => l.includes('const hasAnySectionData ='))
    expect(line).toBeDefined()
    expect(line).not.toContain('Object.values(sections)')
    expect(line).toContain("['1', '2', '3', '4', '5']")
  })

  it('the "parameters answered" count on the fast-flow score preview excludes pitch too', () => {
    expect(page).toContain("['1', '2', '3', '4', '5'].filter(k => (sections[k]?.completionScore ?? 0) >= 30).length}/5 parameters answered")
  })

  it('saveSection still skips persisting pitch — this is why the two checks must agree', () => {
    // If this ever changes (pitch starts being saved), the gate above stops being a
    // workaround and this test's premise should be revisited, not silently pass.
    expect(page).toMatch(/if \(secNum === 'pitch'\) return/)
  })
})
