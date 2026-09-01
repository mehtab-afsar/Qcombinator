import { parseExtractionResponse } from '../extraction/parse'
import { INDICATOR_DEFINITIONS } from '../scoring/indicators'

function fullValidPayload(): string {
  const indicators = INDICATOR_DEFINITIONS.map(d => ({
    id: d.id, rawScore: 3, citedUrls: ['https://example.com/x'], directness: 'direct', reasoning: 'x',
  }))
  return JSON.stringify({ indicators })
}

describe('parseExtractionResponse', () => {
  it('parses a well-formed response covering all 20 indicators', () => {
    const result = parseExtractionResponse(fullValidPayload())
    expect(result).not.toBeNull()
    expect(result).toHaveLength(20)
  })

  it('strips a ```json fence before parsing', () => {
    const fenced = '```json\n' + fullValidPayload() + '\n```'
    const result = parseExtractionResponse(fenced)
    expect(result).not.toBeNull()
    expect(result).toHaveLength(20)
  })

  it('falls back to a {...} regex match when the JSON is wrapped in extra prose', () => {
    const wrapped = 'Here is my analysis:\n' + fullValidPayload() + '\nHope that helps!'
    const result = parseExtractionResponse(wrapped)
    expect(result).not.toBeNull()
  })

  it('returns null when the response contains no JSON at all', () => {
    expect(parseExtractionResponse('Sorry, I cannot help with that.')).toBeNull()
  })

  it('returns null when an indicator is missing from the response', () => {
    const indicators = INDICATOR_DEFINITIONS.slice(0, 19).map(d => ({
      id: d.id, rawScore: 3, citedUrls: [], directness: 'direct', reasoning: 'x',
    }))
    const result = parseExtractionResponse(JSON.stringify({ indicators }))
    expect(result).toBeNull()
  })

  it('returns null when rawScore is non-null but directness is null (schema-invalid)', () => {
    const indicators = INDICATOR_DEFINITIONS.map(d => ({
      id: d.id, rawScore: 3, citedUrls: [], directness: null, reasoning: 'x',
    }))
    const result = parseExtractionResponse(JSON.stringify({ indicators }))
    expect(result).toBeNull()
  })

  it('returns null when rawScore is out of range', () => {
    const indicators = INDICATOR_DEFINITIONS.map((d, i) => ({
      id: d.id, rawScore: i === 0 ? 9 : 3, citedUrls: [], directness: 'direct', reasoning: 'x',
    }))
    const result = parseExtractionResponse(JSON.stringify({ indicators }))
    expect(result).toBeNull()
  })

  it('accepts a null rawScore with null directness (the honest "no evidence" case)', () => {
    const indicators = INDICATOR_DEFINITIONS.map(d => ({
      id: d.id, rawScore: null, citedUrls: [], directness: null, reasoning: 'not found',
    }))
    const result = parseExtractionResponse(JSON.stringify({ indicators }))
    expect(result).not.toBeNull()
    expect(result?.every(e => e.rawScore === null)).toBe(true)
  })

  it('accepts a null reasoning alongside a null rawScore — a real response shape seen live: the model reasonably omits an explanation when there is nothing to explain', () => {
    const indicators = INDICATOR_DEFINITIONS.map(d => ({
      id: d.id, rawScore: null, citedUrls: [], directness: null, reasoning: null,
    }))
    const result = parseExtractionResponse(JSON.stringify({ indicators }))
    expect(result).not.toBeNull()
    expect(result?.every(e => e.reasoning === null)).toBe(true)
  })

  it('still accepts a non-null reasoning alongside a non-null rawScore', () => {
    const indicators = INDICATOR_DEFINITIONS.map(d => ({
      id: d.id, rawScore: 4, citedUrls: ['https://example.com/x'], directness: 'direct', reasoning: 'clear evidence',
    }))
    const result = parseExtractionResponse(JSON.stringify({ indicators }))
    expect(result).not.toBeNull()
    expect(result?.every(e => e.reasoning === 'clear evidence')).toBe(true)
  })
})
