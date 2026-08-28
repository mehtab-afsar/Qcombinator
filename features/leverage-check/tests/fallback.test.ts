import { buildFallbackReport } from '../report/fallback'
import { calculateLeverageCheck, type Archetype } from '../scoring/calculate'
import type { QuizAnswers } from '../scoring/calculate'

const ARCHETYPE_ANSWERS: Record<Archetype, QuizAnswers> = {
  'FOUNDER OPERATED': { q1: 'A', q2: 'A', q3: 'A', q4: 'A', q5: 'A', q6: 'A', q7: 'A', q8: 'A' },
  'AI ASSISTED': { q1: 'B', q2: 'D', q3: 'A', q4: 'A', q5: 'A', q6: 'A', q7: 'A', q8: 'A' },
  'AI LEVERAGED': { q1: 'D', q2: 'D', q3: 'B', q4: 'B', q5: 'A', q6: 'B', q7: 'A', q8: 'A' },
  'AGENTIC OPERATOR': { q1: 'B', q2: 'D', q3: 'B', q4: 'D', q5: 'B', q6: 'C', q7: 'B', q8: 'B' },
  '10X FOUNDER': { q1: 'D', q2: 'D', q3: 'D', q4: 'D', q5: 'D', q6: 'D', q7: 'D', q8: 'D' },
}

describe('buildFallbackReport', () => {
  for (const archetype of Object.keys(ARCHETYPE_ANSWERS) as Archetype[]) {
    it(`produces non-empty short/full text for ${archetype}`, () => {
      const result = calculateLeverageCheck(ARCHETYPE_ANSWERS[archetype])
      expect(result.archetype).toBe(archetype) // sanity-check the fixture itself
      const report = buildFallbackReport(result)
      expect(report.shortResult.trim().length).toBeGreaterThan(0)
      expect(report.fullReport.trim().length).toBeGreaterThan(0)
      expect(report.aiGenerated).toBe(false)
    })
  }
})
