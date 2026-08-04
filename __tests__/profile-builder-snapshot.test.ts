/**
 * Profile Builder — the "startup snapshot" (Stage C of the rebuild).
 *
 * Two real leaks found by tracing where a field's label falls back when it isn't in
 * FIELD_LABELS: (1) the flattener walked into each section's `confidence` sub-object,
 * so a field like "hasPatent" inside p3.confidence rendered as a snippet in its own
 * right — "hasPatent: 0.95", a raw float with no context; (2) any OTHER unmapped
 * field fell back to its literal dotted key ("p2.expansionPotential"), not a readable
 * label. Both are exactly what the brief's own examples described
 * (p3.confidence.hasPatent: 0.95, p2.expansionPotential).
 *
 * Fixed, then went further per the brief: added a model-generated 1-2 sentence
 * narrative summary per section, rendered ahead of the field snippets rather than
 * instead of them (thin sections still show whatever was found).
 */

import { readFileSync } from 'fs'

const route = readFileSync('app/api/profile-builder/upload/route.ts', 'utf8')

describe('the confidence sub-object never leaks into the snippet list', () => {
  it('flatField skips the confidence key before recursing', () => {
    const fn = route.slice(route.indexOf('const flatField'), route.indexOf('flatField(sectionFields)'))
    expect(fn).toMatch(/if \(k === 'confidence'\) continue/)
  })
})

describe('an unmapped field never falls back to its raw dotted key', () => {
  it('extracted snippets use humanizeFieldKey, not the literal fullKey, as fallback', () => {
    expect(route).toContain('FIELD_LABELS[fullKey] ?? humanizeFieldKey(fullKey)')
    expect(route).not.toContain('FIELD_LABELS[fullKey] ?? fullKey')
  })

  it('missing-field labels use the same humanizing fallback', () => {
    expect(route).toContain('MISSING_FIELD_LABELS[f] ?? humanizeFieldKey(f)')
  })

  it('humanizeFieldKey takes only the last dotted segment and title-cases it', () => {
    const fnSrc = route.slice(route.indexOf('function humanizeFieldKey'), route.indexOf('function buildNarrativePrompt'))
    expect(fnSrc).toContain("fullKey.split('.').pop()")
    expect(fnSrc).toMatch(/replace\(\/\(\[a-z0-9\]\)\(\[A-Z\]\)\/g/) // camelCase -> spaced words
    expect(fnSrc).toContain('charAt(0).toUpperCase()')
  })
})

describe('the narrative summary is generated per section, through the router', () => {
  it('calls routedText with the summarisation task class, not a hardcoded model', () => {
    expect(route).toMatch(/routedText\('summarisation'/)
    expect(route).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('only runs for sections that actually have data', () => {
    expect(route).toContain('sectionSummaries.filter(s => s.extractedCount > 0)')
  })

  it('never crashes the upload if generation fails — Promise.allSettled, not Promise.all', () => {
    const block = route.slice(route.indexOf('Narrative summaries'), route.indexOf('Build extraction preview'))
    expect(block).toContain('Promise.allSettled')
  })

  it('the prompt explicitly forbids jargon, field names, and confidence numbers', () => {
    const fnSrc = route.slice(route.indexOf('function buildNarrativePrompt'), route.length)
    expect(fnSrc).toMatch(/no field names, no JSON keys, no confidence numbers/i)
  })
})

describe('the frontend renders the narrative ahead of the field list, not instead of it', () => {
  const page = readFileSync('app/founder/profile-builder/page.tsx', 'utf8')

  it('SectionSummary carries narrativeSummary through from the API', () => {
    expect(page).toContain('narrativeSummary?: string | null')
  })

  it('both snapshot screens render it when present', () => {
    const matches = page.match(/\{s\.narrativeSummary|\{card\.narrative/g) ?? []
    expect(matches.length).toBeGreaterThanOrEqual(2)
  })

  it('the field snippets still render underneath — thin sections are not left blank', () => {
    expect(page).toContain('card.snippets.length > 0')
  })
})
