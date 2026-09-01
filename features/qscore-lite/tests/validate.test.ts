import { qScoreLiteSubmitSchema } from '../scoring/validate'

describe('qScoreLiteSubmitSchema', () => {
  it('accepts a bare domain', () => {
    expect(qScoreLiteSubmitSchema.safeParse({ companyName: 'Acme', url: 'acme.com' }).success).toBe(true)
  })

  it('accepts a full URL with protocol, www, and a path', () => {
    const result = qScoreLiteSubmitSchema.safeParse({ companyName: 'Acme', url: 'https://www.acme.com/pricing' })
    expect(result.success).toBe(true)
  })

  it('rejects an empty company name', () => {
    expect(qScoreLiteSubmitSchema.safeParse({ companyName: '', url: 'acme.com' }).success).toBe(false)
  })

  it('rejects a company name over 120 characters', () => {
    const result = qScoreLiteSubmitSchema.safeParse({ companyName: 'a'.repeat(121), url: 'acme.com' })
    expect(result.success).toBe(false)
  })

  it('rejects an empty URL', () => {
    expect(qScoreLiteSubmitSchema.safeParse({ companyName: 'Acme', url: '' }).success).toBe(false)
  })

  it('rejects a garbage URL that cannot be parsed even with https:// prepended', () => {
    const result = qScoreLiteSubmitSchema.safeParse({ companyName: 'Acme', url: 'not a url at all !!!' })
    expect(result.success).toBe(false)
  })

  it('rejects a missing field entirely', () => {
    expect(qScoreLiteSubmitSchema.safeParse({ companyName: 'Acme' }).success).toBe(false)
  })
})
