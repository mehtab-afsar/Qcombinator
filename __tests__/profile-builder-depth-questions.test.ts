/**
 * getNextDepthQuestion — the replacement for the old WHAT_ELSE_PROMPT loop. Unlike that
 * prompt (memory-less, untethered to any real field, no stop condition), this walks a
 * declarative field list, skips answered/already-asked fields, and genuinely terminates.
 */

import { getNextDepthQuestion, DEPTH_QUESTIONS, DEPTH_QUESTION_CAP } from '@/lib/profile-builder/depth-questions'

describe('getNextDepthQuestion', () => {
  it('returns the first unanswered, unasked field for a section', () => {
    const result = getNextDepthQuestion(1, {}, new Set())
    expect(result).not.toBeNull()
    expect(Object.keys(DEPTH_QUESTIONS[1])).toContain(result!.field)
  })

  it('skips a field that is already extracted (non-null)', () => {
    const result = getNextDepthQuestion(1, { customerList: ['Acme Corp'] }, new Set())
    expect(result?.field).not.toBe('customerList')
  })

  it('skips a field that was already asked this conversation', () => {
    const fields = Object.keys(DEPTH_QUESTIONS[1])
    const result = getNextDepthQuestion(1, {}, new Set([fields[0]]))
    expect(result?.field).not.toBe(fields[0])
  })

  it('never repeats across successive calls as fields get answered', () => {
    const asked = new Set<string>()
    const extracted: Record<string, unknown> = {}
    const seen: string[] = []
    let next = getNextDepthQuestion(1, extracted, asked)
    while (next) {
      expect(seen).not.toContain(next.field)
      seen.push(next.field)
      asked.add(next.field)
      extracted[next.field] = 'answered'
      next = getNextDepthQuestion(1, extracted, asked)
    }
    expect(seen.length).toBe(Object.keys(DEPTH_QUESTIONS[1]).length)
  })

  it('returns null once every field in the section has been asked', () => {
    const allFields = Object.keys(DEPTH_QUESTIONS[1])
    const result = getNextDepthQuestion(1, {}, new Set(allFields))
    expect(result).toBeNull()
  })

  it('returns null once the cap is hit, even if unanswered fields remain', () => {
    const asked = new Set(Array.from({ length: DEPTH_QUESTION_CAP }, (_, i) => `dummy${i}`))
    const result = getNextDepthQuestion(5, {}, asked)
    expect(result).toBeNull()
  })

  it('returns null for a section with no depth questions defined', () => {
    const result = getNextDepthQuestion(999, {}, new Set())
    expect(result).toBeNull()
  })

  it('resolves nested field paths (e.g. p2.competitorCount) via getNestedValue', () => {
    const result = getNextDepthQuestion(2, { p2: { competitorCount: 5 } }, new Set())
    expect(result?.field).not.toBe('p2.competitorCount')
  })
})
