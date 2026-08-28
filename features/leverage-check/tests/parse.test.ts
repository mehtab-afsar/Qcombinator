import { parseLeverageCheckResponse } from '../report/parse'

describe('parseLeverageCheckResponse', () => {
  it('splits well-formed SHORT_RESULT / FULL_REPORT text cleanly', () => {
    const raw = 'SHORT_RESULT\nYou are a 3.4x founder.\n\nFULL_REPORT\nYOUR DIAGNOSIS\nHere is the full report.'
    const result = parseLeverageCheckResponse(raw)
    expect(result).not.toBeNull()
    expect(result?.shortResult).toBe('You are a 3.4x founder.')
    expect(result?.fullReport).toBe('YOUR DIAGNOSIS\nHere is the full report.')
    expect(result?.aiGenerated).toBe(true)
  })

  it('returns null when the FULL_REPORT marker is missing entirely', () => {
    const raw = 'SHORT_RESULT\nJust a short result, no marker at all.'
    expect(parseLeverageCheckResponse(raw)).toBeNull()
  })

  it('returns null when the short-result half is empty after trim', () => {
    const raw = 'SHORT_RESULT\n\nFULL_REPORT\nSomething here.'
    expect(parseLeverageCheckResponse(raw)).toBeNull()
  })

  it('returns null when the full-report half is empty after trim', () => {
    const raw = 'SHORT_RESULT\nSomething here.\n\nFULL_REPORT\n   '
    expect(parseLeverageCheckResponse(raw)).toBeNull()
  })

  it('does not leak the marker text itself into either half', () => {
    const raw = 'SHORT_RESULT\nteaser text\nFULL_REPORT\nreport text'
    const result = parseLeverageCheckResponse(raw)
    expect(result?.shortResult).not.toContain('FULL_REPORT')
    expect(result?.fullReport).not.toContain('FULL_REPORT')
    expect(result?.shortResult).not.toContain('SHORT_RESULT')
  })
})
