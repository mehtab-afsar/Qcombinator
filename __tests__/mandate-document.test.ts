/**
 * lib/mandate/document.ts — splitting S002's generated document into sections a
 * founder can read as "why", not just the 4-field JSON summary.
 */

import { splitDocumentSections, pickReasoningSections, classifySection } from '@/lib/mandate/document'
import { REAL_CAPTURED_DOCUMENT, STEP_PREFIXED_DOCUMENT } from './fixtures/s002-documents'

describe('splitDocumentSections', () => {
  it('splits on real top-level headings, no fixed "Step N —" prefix required', () => {
    const sections = splitDocumentSections(REAL_CAPTURED_DOCUMENT)
    expect(sections.map(s => s.heading)).toEqual([
      'Executive Summary',
      'Executive Objectives',
      'Recommended Strategic Pathway',
      'Executive Asset Blueprint',
      'Asset Dependencies',
      'Success Metrics',
      'Executive Risks',
      'Executive Contract',
    ])
  })

  it("does not pick up the Executive Contract restatement's ### subheadings as their own sections", () => {
    const sections = splitDocumentSections(REAL_CAPTURED_DOCUMENT)
    const lastSection = sections[sections.length - 1]
    expect(lastSection.heading).toBe('Executive Contract')
    expect(sections.filter(s => s.heading === 'Mission')).toHaveLength(0)
    expect(sections.filter(s => s.heading === 'Strategic Pathway')).toHaveLength(0)
  })

  it('every section has a non-empty body', () => {
    const sections = splitDocumentSections(REAL_CAPTURED_DOCUMENT)
    for (const s of sections) expect(s.body.length).toBeGreaterThan(0)
  })

  it('still splits sensibly on a "Step N —" prefixed document (degrades gracefully, not a required format)', () => {
    const sections = splitDocumentSections(STEP_PREFIXED_DOCUMENT)
    expect(sections.map(s => s.heading)).toEqual([
      'Step 1 — Executive Direction',
      'Step 2 — Executive Objectives',
      'Step 3 — Recommended Strategic Pathway',
      'Step 4 — Executive Asset Blueprint',
      'Step 5 — Asset Dependencies',
      'Step 6 — Success Metrics',
      'Step 7 — Executive Risks',
      'Executive Contract',
    ])
  })

  it('degrades to [] rather than throwing on null/undefined/empty/malformed input', () => {
    expect(splitDocumentSections(null)).toEqual([])
    expect(splitDocumentSections(undefined)).toEqual([])
    expect(splitDocumentSections('')).toEqual([])
    expect(splitDocumentSections('no headings here at all')).toEqual([])
  })
})

describe('pickReasoningSections', () => {
  it('picks exactly Objectives, Pathway, and Risks from a real captured document', () => {
    const picked = pickReasoningSections(REAL_CAPTURED_DOCUMENT)
    expect(picked.map(s => s.heading)).toEqual([
      'Executive Objectives',
      'Recommended Strategic Pathway',
      'Executive Risks',
    ])
  })

  it("excludes the Executive Contract restatement even though its own 'Strategic Pathway' subheading contains the keyword", () => {
    const picked = pickReasoningSections(REAL_CAPTURED_DOCUMENT)
    // Only one Pathway section — Step 3's real reasoning, not the Step 8 restatement's echo.
    expect(picked.filter(s => s.heading.toLowerCase().includes('pathway'))).toHaveLength(1)
  })

  it('picks the same three sections from the Step-N-prefixed document too', () => {
    const picked = pickReasoningSections(STEP_PREFIXED_DOCUMENT)
    expect(picked.map(s => s.heading)).toEqual([
      'Step 2 — Executive Objectives',
      'Step 3 — Recommended Strategic Pathway',
      'Step 7 — Executive Risks',
    ])
  })

  it('a founder must never see a raw error over this cosmetic panel — degrades to [] on anything unexpected', () => {
    expect(pickReasoningSections(null)).toEqual([])
    expect(pickReasoningSections('garbage with no headings')).toEqual([])
  })
})

describe('classifySection — one keyword list, shared with the structurer', () => {
  it('recognises the three reasoning sections by keyword, at either heading style', () => {
    expect(classifySection('Executive Objectives')).toBe('objectives')
    expect(classifySection('Step 2 — Executive Objectives')).toBe('objectives')
    expect(classifySection('Recommended Strategic Pathway')).toBe('pathway')
    expect(classifySection('Executive Risks')).toBe('risks')
  })

  it('returns null for everything that is not reasoning', () => {
    expect(classifySection('Executive Summary')).toBeNull()
    expect(classifySection('Executive Asset Blueprint')).toBeNull()
    expect(classifySection('Success Metrics')).toBeNull()
    expect(classifySection('')).toBeNull()
  })

  it('has a documented precedence when a heading matches two — decided, not accidental', () => {
    expect(classifySection('Objectives and Risks')).toBe('objectives')
  })

  it('pickReasoningSections picks the same three as before the refactor', () => {
    expect(pickReasoningSections(REAL_CAPTURED_DOCUMENT).map(s => s.heading)).toEqual([
      'Executive Objectives', 'Recommended Strategic Pathway', 'Executive Risks',
    ])
    expect(pickReasoningSections(STEP_PREFIXED_DOCUMENT)).toHaveLength(3)
  })
})
