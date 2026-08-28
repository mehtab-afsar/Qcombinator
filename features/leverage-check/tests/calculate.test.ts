/**
 * 10x Founder Leverage Check — scoring engine unit tests.
 *
 * The formula reduces to: multiple = 3 * avgOfAll5DimensionRawAverages - 2, and since every raw
 * answer is an integer 1-4, avgOfAll5 is always an exact multiple of 0.1 (sum of 5 half-integer
 * dimension averages / 5) — the "band boundary" test cases below pick real, reachable answer
 * combinations rather than assuming every literal boundary decimal (e.g. exactly 2.0) is
 * reachable, since not all of them are.
 */

import { calculateLeverageCheck, type QuizAnswers } from '../scoring/calculate'

function answers(overrides: Partial<QuizAnswers>): QuizAnswers {
  return { q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A', q6: 'A', q7: 'A', q8: 'A', ...overrides }
}

describe('calculateLeverageCheck — endpoints', () => {
  it('all-A answers → 1.0x, every dimension at 0, FOUNDER OPERATED', () => {
    const result = calculateLeverageCheck(answers({}))
    expect(result.multiple).toBe(1.0)
    expect(result.archetype).toBe('FOUNDER OPERATED')
    expect(result.dimensionScores).toEqual({
      dependency: 0, decision: 0, execution: 0, growth: 0, management: 0,
    })
  })

  it('all-D answers → 10.0x, every dimension at 100, 10X FOUNDER', () => {
    const result = calculateLeverageCheck(answers({ q1: 'D', q2: 'D', q3: 'D', q4: 'D', q5: 'D', q6: 'D', q7: 'D', q8: 'D' }))
    expect(result.multiple).toBe(10.0)
    expect(result.archetype).toBe('10X FOUNDER')
    expect(result.dimensionScores).toEqual({
      dependency: 100, decision: 100, execution: 100, growth: 100, management: 100,
    })
  })
})

describe('calculateLeverageCheck — archetype band boundaries', () => {
  it('multiple 1.9 (dependency sum 5, rest at floor) stays FOUNDER OPERATED', () => {
    const result = calculateLeverageCheck(answers({ q1: 'A', q2: 'D' })) // dependency avg 2.5, rest 1
    expect(result.multiple).toBe(1.9)
    expect(result.archetype).toBe('FOUNDER OPERATED')
  })

  it('multiple 2.2 (just past the 1.9 case) crosses into AI ASSISTED', () => {
    const result = calculateLeverageCheck(answers({ q1: 'B', q2: 'D' })) // dependency avg 3, rest 1
    expect(result.multiple).toBe(2.2)
    expect(result.archetype).toBe('AI ASSISTED')
  })

  it('multiple 3.4 stays AI ASSISTED (top of its band)', () => {
    const result = calculateLeverageCheck(answers({ q1: 'D', q2: 'D', q3: 'B', q4: 'B' }))
    expect(result.multiple).toBe(3.4)
    expect(result.archetype).toBe('AI ASSISTED')
  })

  it('multiple 3.7 (one step past 3.4) crosses into AI LEVERAGED', () => {
    const result = calculateLeverageCheck(answers({ q1: 'D', q2: 'D', q3: 'B', q4: 'B', q5: 'A', q6: 'B' }))
    expect(result.multiple).toBe(3.7)
    expect(result.archetype).toBe('AI LEVERAGED')
  })

  it('multiple 5.2 stays AI LEVERAGED (just under the 5.5 floor)', () => {
    const result = calculateLeverageCheck(answers({
      q1: 'B', q2: 'D', q3: 'B', q4: 'D', q5: 'A', q6: 'C', q7: 'B', q8: 'B',
    }))
    expect(result.multiple).toBe(5.2)
    expect(result.archetype).toBe('AI LEVERAGED')
  })

  it('multiple 5.5 exactly hits the AGENTIC OPERATOR floor (inclusive boundary)', () => {
    const result = calculateLeverageCheck(answers({
      q1: 'B', q2: 'D', q3: 'B', q4: 'D', q5: 'B', q6: 'C', q7: 'B', q8: 'B',
    }))
    expect(result.multiple).toBe(5.5)
    expect(result.archetype).toBe('AGENTIC OPERATOR')
  })

  it('multiple 7.3 stays AGENTIC OPERATOR (just under the 7.5 floor)', () => {
    const result = calculateLeverageCheck(answers({
      q1: 'D', q2: 'D', q3: 'D', q4: 'D', q5: 'A', q6: 'B', q7: 'C', q8: 'C',
    }))
    expect(result.multiple).toBe(7.3)
    expect(result.archetype).toBe('AGENTIC OPERATOR')
  })

  it('multiple 7.6 (one step past 7.3) crosses into 10X FOUNDER', () => {
    const result = calculateLeverageCheck(answers({
      q1: 'D', q2: 'D', q3: 'D', q4: 'D', q5: 'A', q6: 'C', q7: 'C', q8: 'C',
    }))
    expect(result.multiple).toBe(7.6)
    expect(result.archetype).toBe('10X FOUNDER')
  })
})

describe('calculateLeverageCheck — equal weighting across uneven question counts', () => {
  it('weights all 5 dimensions equally, not a flat 8-question average', () => {
    // dependency/decision/execution (2 questions each) all A → dimension avg 1.
    // growth/management (1 question each) both D → dimension avg 4.
    // Correct: avgOfAll5 = (1+1+1+4+4)/5 = 2.2 → multiple = 3*2.2-2 = 4.6.
    // Wrong (flat 8-answer mean): (1×6 + 4×2)/8 = 1.75 → would give 3.25 instead.
    const result = calculateLeverageCheck(answers({ q7: 'D', q8: 'D' }))
    expect(result.multiple).toBe(4.6)
    expect(result.dimensionScores.growth).toBe(100)
    expect(result.dimensionScores.management).toBe(100)
    expect(result.dimensionScores.dependency).toBe(0)
  })
})

describe('calculateLeverageCheck — strongest/weakest tie-break order', () => {
  it('picks the DIMENSION_ORDER-first dimension when scores tie for the max', () => {
    // dependency and decision both maxed (tied strongest) — dependency comes first in
    // DIMENSION_ORDER, so it should win.
    const result = calculateLeverageCheck(answers({
      q1: 'D', q2: 'D', q3: 'D', q4: 'D', q5: 'A', q6: 'A', q7: 'A', q8: 'B',
    }))
    expect(result.dimensionScores.dependency).toBe(result.dimensionScores.decision)
    expect(result.strongestDimension).toBe('dependency')
  })

  it('picks the DIMENSION_ORDER-first dimension when scores tie for the min', () => {
    // execution and growth both at floor (tied weakest) — execution comes first in
    // DIMENSION_ORDER, so it should win.
    const result = calculateLeverageCheck(answers({
      q1: 'D', q2: 'D', q3: 'D', q4: 'D', q5: 'A', q6: 'A', q7: 'A', q8: 'B',
    }))
    expect(result.dimensionScores.execution).toBe(result.dimensionScores.growth)
    expect(result.weakestDimension).toBe('execution')
  })
})

describe('calculateLeverageCheck — rounding', () => {
  it('rounds the multiple to exactly 1 decimal place, immune to floating-point drift', () => {
    const result = calculateLeverageCheck(answers({
      q1: 'B', q2: 'D', q3: 'B', q4: 'D', q5: 'A', q6: 'C', q7: 'B', q8: 'B',
    }))
    expect(result.multiple).toBe(5.2)
    expect(Number(result.multiple.toFixed(1))).toBe(result.multiple)
  })
})
