/**
 * lib/mandate/document-structure.ts — parsing S002's reasoning into something renderable as a
 * document instead of a transcript.
 *
 * The tests that carry the weight here are the ones asserting what is ABSENT. The prompt
 * prescribes section names and nothing about their contents, so which sub-fields a model emits
 * varies per generation — and a renderer built on the assumption that all of them arrive ships
 * blank labels the first time one doesn't. Two of the three fixtures disagree about this, on
 * purpose.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import {
  parseObjectives, parsePathway, parseRisks, structureSection, structureReasoning,
} from '@/lib/mandate/document-structure'
import { pickReasoningSections } from '@/lib/mandate/document'
import {
  FOUR_FIELD_DOCUMENT, REAL_CAPTURED_DOCUMENT, STEP_PREFIXED_DOCUMENT,
} from './fixtures/s002-documents'

const bodyOf = (doc: string, keyword: string) =>
  pickReasoningSections(doc).find(s => s.heading.toLowerCase().includes(keyword))!.body

describe('parseObjectives — against what the model actually writes', () => {
  it('the four-field, double-asterisk shape: all rows, all four objectives', () => {
    const objectives = parseObjectives(bodyOf(FOUR_FIELD_DOCUMENT, 'objective'))

    expect(objectives).toHaveLength(4)
    expect(objectives[0].title).toBe('Define Business Model & Unit Economics')
    expect(objectives[0].priority).toBe('high')
    expect(objectives[0].fields.map(f => f.label)).toEqual(['Why it matters', 'Impact', 'Success'])
    expect(objectives[0].fields[0].text).toBe(
      'Cannot price, sell, or scale without understanding how the business makes money.',
    )
    expect(objectives[3].priority).toBe('medium')
  })

  it('⚠️ the single-asterisk shape carries only ONE field — Impact and Success are absent', () => {
    // The test the whole layout depends on. This is a real captured generation: it states
    // "why it matters" and a priority, and simply never writes an expected impact or a success
    // criterion. A card that reserves a row per field renders two empty labels here.
    const objectives = parseObjectives(bodyOf(REAL_CAPTURED_DOCUMENT, 'objective'))

    expect(objectives).toHaveLength(2)
    expect(objectives[0].title).toBe('Prove Commercial Model')
    expect(objectives[0].fields).toHaveLength(1)
    expect(objectives[0].fields[0].label).toBe('Why it matters')
    expect(objectives[0].fields.map(f => f.label)).not.toContain('Impact')
    expect(objectives[0].fields.map(f => f.label)).not.toContain('Success')
  })

  it('never renders a label with no text behind it', () => {
    for (const doc of [FOUR_FIELD_DOCUMENT, REAL_CAPTURED_DOCUMENT]) {
      for (const o of parseObjectives(bodyOf(doc, 'objective'))) {
        for (const f of o.fields) expect(f.text.length).toBeGreaterThan(0)
      }
    }
  })

  it('the ordinal is positional, not the model\'s own numbering', () => {
    const objectives = parseObjectives('**7. First thing**\n*Why it matters:* a\n\n**12. Second thing**\n*Why it matters:* b')
    expect(objectives.map(o => o.ordinal)).toEqual(['01', '02'])
  })

  it('fields come out in canonical order however the model ordered them', () => {
    const body = [
      '**1. Alpha**', '**Priority:** Low', '**Success criteria:** c', '**Why it matters:** a', '**Expected business impact:** b',
      '', '**2. Beta**', '**Why it matters:** d',
    ].join('\n')
    const [first] = parseObjectives(body)
    expect(first.fields.map(f => f.label)).toEqual(['Why it matters', 'Impact', 'Success'])
    expect(first.priority).toBe('low') // lifted out of the rows, never rendered as one
  })

  it('a label alone on its line takes the value from the line below it', () => {
    const body = '**1. Alpha**\n**Why it matters:**\nThe reason.\n\n**2. Beta**\n**Why it matters:**\nAnother.'
    expect(parseObjectives(body)[0].fields[0].text).toBe('The reason.')
  })

  it('an unrecognised label is dropped, never shown as a mystery row', () => {
    const body = '**1. Alpha**\n*Note:* ignore me\n*Why it matters:* a\n\n**2. Beta**\n*Why it matters:* b'
    expect(parseObjectives(body)[0].fields.map(f => f.label)).toEqual(['Why it matters'])
  })

  it('priority is null rather than invented when the model never states one', () => {
    const body = '**1. Alpha**\n*Why it matters:* a\n\n**2. Beta**\n*Why it matters:* b'
    expect(parseObjectives(body)[0].priority).toBeNull()
  })

  it('gives up cleanly on prose, and never throws', () => {
    expect(parseObjectives('One flowing paragraph with no structure at all.')).toEqual([])
    expect(parseObjectives('')).toEqual([])
  })
})

describe('parsePathway', () => {
  it('reads the name and all three rationales when they are there', () => {
    const pathway = parsePathway(bodyOf(FOUR_FIELD_DOCUMENT, 'pathway'))!
    expect(pathway.name).toBe('Product Validation')
    expect(pathway.why).toContain('validate core business assumptions')
    expect(pathway.outcomes).toContain('Validated business model')
    expect(pathway.alternatives).toContain('Commercial Acceleration requires')
  })

  it('⚠️ the captured generation states no expected outcomes — that stays null', () => {
    const pathway = parsePathway(bodyOf(REAL_CAPTURED_DOCUMENT, 'pathway'))!
    expect(pathway.name).toBe('Commercial Acceleration')
    expect(pathway.why).toContain('The company has a diagnostic')
    expect(pathway.alternatives).toContain('Investment Readiness')
    expect(pathway.outcomes).toBeNull()
  })

  it('⚠️ "Why alternatives were not selected" does NOT land in `why`', () => {
    // Both real labels start with "Why". Test the precedence explicitly, because getting it
    // backwards puts the rejected options where the founder reads the chosen rationale — and
    // it would look entirely plausible on screen.
    const pathway = parsePathway('**Chosen Path**\n\n**Why alternatives were not selected:** Because X.')!
    expect(pathway.alternatives).toBe('Because X.')
    expect(pathway.why).toBeNull()
  })

  it('null on a body with no name at all', () => {
    expect(parsePathway('')).toBeNull()
  })
})

describe('parseRisks', () => {
  it('the labelled shape, one block per risk', () => {
    const risks = parseRisks(bodyOf(FOUR_FIELD_DOCUMENT, 'risk'))
    expect(risks.map(r => r.kind)).toEqual(['strategic', 'execution', 'assumption'])
    expect(risks[0].body).toContain('ICP assumptions are incorrect')
  })

  it('the titled shape keeps the model\'s own inline title', () => {
    const risks = parseRisks(bodyOf(REAL_CAPTURED_DOCUMENT, 'risk'))
    expect(risks.map(r => r.kind)).toEqual(['strategic', 'execution'])
    expect(risks[0].title).toBe('Investor adoption lags founder adoption')
  })

  it('one flowing paragraph still yields the three risks, by sentence', () => {
    const risks = parseRisks(bodyOf(STEP_PREFIXED_DOCUMENT, 'risk'))
    expect(risks.map(r => r.kind)).toEqual(['strategic', 'execution', 'assumption'])
  })

  it('a trailing paragraph that names no kind is dropped, not counted as a fourth risk', () => {
    const body = [
      '**Strategic Risk: A**', 'Body A.', '', '**Execution Risk: B**', 'Body B.',
      '', '**Closing Note**', 'Management should monitor these weekly.',
    ].join('\n')
    expect(parseRisks(body)).toHaveLength(2)
  })
})

describe('structureReasoning — the fallback contract', () => {
  it('both real mandates structure all three sections', () => {
    for (const doc of [FOUR_FIELD_DOCUMENT, REAL_CAPTURED_DOCUMENT]) {
      expect(structureReasoning(doc).map(s => s.kind)).toEqual(['objectives', 'pathway', 'risks'])
    }
  })

  it('⚠️ degradation is PER SECTION — unstructured prose falls back without taking the rest with it', () => {
    // The step-prefixed fixture's sections are single paragraphs. Its objectives and pathway
    // cannot be structured; its risks can. All-or-nothing would throw away the risks too.
    const sections = structureReasoning(STEP_PREFIXED_DOCUMENT)
    expect(sections).toHaveLength(3)
    expect(sections[0].kind).toBe('raw')
    expect(sections[1].kind).toBe('raw')
    expect(sections[2].kind).toBe('risks')
  })

  it('every raw section keeps a body to render — never an empty panel', () => {
    for (const doc of [FOUR_FIELD_DOCUMENT, REAL_CAPTURED_DOCUMENT, STEP_PREFIXED_DOCUMENT]) {
      for (const s of structureReasoning(doc)) {
        if (s.kind === 'raw') expect(s.body.length).toBeGreaterThan(0)
      }
    }
  })

  it('⚠️ NO raw markdown survives into any structured field', () => {
    // The literal founder-visible bug: `**Why it matters:**` rendering as characters on screen.
    const strings: string[] = []
    for (const doc of [FOUR_FIELD_DOCUMENT, REAL_CAPTURED_DOCUMENT]) {
      for (const s of structureReasoning(doc)) {
        if (s.kind === 'objectives') {
          for (const o of s.objectives) strings.push(o.title, ...o.fields.map(f => f.text))
        } else if (s.kind === 'pathway') {
          strings.push(s.pathway.name, s.pathway.why ?? '', s.pathway.outcomes ?? '', s.pathway.alternatives ?? '')
        } else if (s.kind === 'risks') {
          for (const r of s.risks) strings.push(r.title ?? '', r.body)
        }
      }
    }
    expect(strings.length).toBeGreaterThan(10) // the assertion below must not be vacuous
    for (const v of strings) {
      expect(v).not.toMatch(/\*\*/)
      expect(v).not.toMatch(/^\s*[*_]/)
    }
  })

  it('never throws, on anything', () => {
    expect(structureReasoning(null)).toEqual([])
    expect(structureReasoning(undefined)).toEqual([])
    expect(structureReasoning('garbage with no headings')).toEqual([])
    // Arbitrary truncations of a real document — the shape a streamed or capped generation takes.
    for (let i = 0; i < REAL_CAPTURED_DOCUMENT.length; i += 97) {
      expect(() => structureReasoning(REAL_CAPTURED_DOCUMENT.slice(0, i))).not.toThrow()
      expect(() => structureReasoning(REAL_CAPTURED_DOCUMENT.slice(i))).not.toThrow()
    }
  })

  it('a section that is not reasoning at all renders raw rather than being mis-parsed', () => {
    expect(structureSection({ heading: 'Success Metrics', body: 'Some prose.' }).kind).toBe('raw')
  })
})

describe('the panel renders the parse, not the markdown', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

  it('MandateReveal no longer dumps the document into a pre-wrap paragraph', () => {
    const src = read('features/executive/components/unveiling/MandateReveal.tsx')
    expect(src).not.toContain("whiteSpace: 'pre-wrap'")
    expect(src).toContain('structureReasoning')
  })

  it('the raw fallback is actually wired to the shared markdown renderer', () => {
    // Without this the "degrade, never fail" contract above is only a claim about the parser.
    expect(read('features/executive/components/mandate/StructuredReasoning.tsx')).toContain('ReportMarkdown')
  })
})
