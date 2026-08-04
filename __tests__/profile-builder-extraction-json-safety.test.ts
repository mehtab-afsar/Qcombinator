/**
 * A founder's own words often contain a quote mark (naming a customer, quoting feedback,
 * a company name). Without an explicit escape-quotes rule, the model sometimes emitted a
 * bare " inside a JSON string value, which broke JSON.parse in
 * app/api/profile-builder/upload/route.ts and silently dropped the whole section's
 * extracted data — the founder saw "complete at least one section" even after uploading a
 * real document. Same failure mode, same fix, as the strategy-proposal JSON tail
 * (see __tests__/strategy-proposal-generation.test.ts).
 */

import {
  EXTRACTION_PROMPTS,
  PITCH_EXTRACTION_PROMPT,
} from '@/lib/profile-builder/extraction-prompts'

describe('every extraction prompt tells the model to escape quotes and stay valid JSON', () => {
  it.each([1, 2, 3, 4, 5] as const)('section %i', section => {
    expect(EXTRACTION_PROMPTS[section]).toContain('valid, parseable JSON')
    expect(EXTRACTION_PROMPTS[section]).toContain('escape it as \\"')
  })

  it('the pitch prompt', () => {
    expect(PITCH_EXTRACTION_PROMPT).toContain('valid, parseable JSON')
    expect(PITCH_EXTRACTION_PROMPT).toContain('escape it as \\"')
  })
})
