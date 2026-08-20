/**
 * founderContactPostSchema (lib/api/validate.ts) — the boundary check for what a founder can
 * put into their own contact list. Caps matter here specifically because this text lands
 * directly in a Gmail-send Action's prompt (lib/contacts/context.ts) — unbounded input is
 * unbounded spend, same reasoning strategySchema documents for S001.
 */

import { founderContactPostSchema } from '@/lib/api/validate'

const valid = { name: 'Jane Doe', email: 'jane@acme.com' }

describe('founderContactPostSchema', () => {
  it('accepts the minimal required fields', () => {
    expect(founderContactPostSchema.safeParse(valid).success).toBe(true)
  })

  it('accepts the optional fields too', () => {
    const result = founderContactPostSchema.safeParse({
      ...valid, company: 'Acme', title: 'VP Engineering', notes: 'Met at a conference.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a missing name', () => {
    expect(founderContactPostSchema.safeParse({ email: 'jane@acme.com' }).success).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(founderContactPostSchema.safeParse({ name: 'Jane', email: 'not-an-email' }).success).toBe(false)
  })

  it('rejects a name over 200 characters', () => {
    const result = founderContactPostSchema.safeParse({ ...valid, name: 'x'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('rejects notes over 1000 characters — this text reaches an LLM prompt directly', () => {
    const result = founderContactPostSchema.safeParse({ ...valid, notes: 'x'.repeat(1_001) })
    expect(result.success).toBe(false)
  })

  it('trims whitespace from the name', () => {
    const result = founderContactPostSchema.safeParse({ ...valid, name: '  Jane Doe  ' })
    expect(result.success && result.data.name).toBe('Jane Doe')
  })
})
