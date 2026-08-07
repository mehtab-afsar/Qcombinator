/**
 * Profile Builder — "confirm what was extracted before it counts" (Stage E's last
 * piece). A bad parse should be catchable by the founder, not silently baked into
 * the score. Every extracted-field chip on the extraction-results screen now has a
 * one-tap "×" that removes it — reverting the field to "missing" (re-asked normally)
 * rather than leaving a wrong value counted.
 */

import { readFileSync } from 'fs'

const page = readFileSync('app/founder/profile-builder/page.tsx', 'utf8')
// dismissExtractedField/deleteNestedField/saveSection moved out of page.tsx into their
// own data hook as part of the profile-builder feature-folder split (Stage 7) — the
// body-slicing checks below now read that file, not page.tsx's source text.
const hook = readFileSync('features/profile-builder/hooks/useProfileBuilderData.ts', 'utf8')

describe('a founder can reject a bad extraction before it counts', () => {
  it('every extracted field with a fieldKey gets a dismiss control, wired to dismissExtractedField', () => {
    // page.tsx owns dismissExtractedField and wires it into ExtractResultsScreen, which
    // forwards it to the shared ProfileSnapshot component — the component calls it per field.
    expect(page).toContain('onDismissField={dismissExtractedField}')
    const extractResults = readFileSync('features/profile-builder/components/ExtractResultsScreen.tsx', 'utf8')
    expect(extractResults).toContain('onDismissField={onDismissField}')
    const snapshot = readFileSync('features/profile-builder/components/ProfileSnapshot.tsx', 'utf8')
    expect(snapshot).toContain('onDismissField(card.sectionKey, s.fieldKey!, s.label)')
  })

  it('dismissing removes the field from the ACTUAL scored data, not just the display', () => {
    const fn = hook.slice(hook.indexOf('function dismissExtractedField'), hook.indexOf('// ── persist fast-flow state'))
    expect(fn).toContain('deleteNestedField(sec.extractedFields, fieldKey)')
    expect(fn).toContain('saveSection(secKey, updated, token)')
  })

  it('completion score is recomputed after removal, not left stale', () => {
    const fn = hook.slice(hook.indexOf('function dismissExtractedField'), hook.indexOf('// ── persist fast-flow state'))
    expect(fn).toContain('getSectionCompletionPct(nextFields')
  })

  it('a dismissed field reappears as missing, not just vanishes', () => {
    const fn = hook.slice(hook.indexOf('function dismissExtractedField'), hook.indexOf('// ── persist fast-flow state'))
    expect(fn).toContain('missingLabels: [...s.missingLabels, label]')
  })

  it('deleteNestedField only mutates a clone — the caller\'s object is never touched in place', () => {
    const fn = hook.slice(hook.indexOf('function deleteNestedField'), hook.indexOf('function dismissExtractedField'))
    expect(fn).toMatch(/JSON\.parse\(JSON\.stringify\(obj\)\)/)
  })
})
