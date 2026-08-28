import { leverageCheckAnswersSchema } from '../scoring/validate'

const VALID = { q1: 'A', q2: 'B', q3: 'C', q4: 'D', q5: 'A', q6: 'B', q7: 'C', q8: 'D' }

describe('leverageCheckAnswersSchema', () => {
  it('accepts a valid 8-key A-D payload', () => {
    expect(leverageCheckAnswersSchema.safeParse(VALID).success).toBe(true)
  })

  it('rejects a payload missing a key', () => {
    const { q8: _q8, ...missing } = VALID
    expect(leverageCheckAnswersSchema.safeParse(missing).success).toBe(false)
  })

  it('strips an extra unknown key rather than rejecting the payload (Zod default, matches every other schema in lib/api/validate.ts)', () => {
    const result = leverageCheckAnswersSchema.safeParse({ ...VALID, q9: 'A' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data).not.toHaveProperty('q9')
  })

  it('rejects an invalid answer letter', () => {
    expect(leverageCheckAnswersSchema.safeParse({ ...VALID, q1: 'E' }).success).toBe(false)
  })

  it('rejects a non-string answer', () => {
    expect(leverageCheckAnswersSchema.safeParse({ ...VALID, q1: 1 }).success).toBe(false)
  })
})
