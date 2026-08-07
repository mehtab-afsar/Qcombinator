/**
 * app/api/cron/ingest-market-signals/route.ts — parseExtractionResponse, the one genuinely
 * risky part of the pipeline (untrusted LLM output over untrusted external text).
 */

import { parseExtractionResponse } from '@/app/api/cron/ingest-market-signals/route'

describe('parseExtractionResponse', () => {
  it('parses a well-formed funding response', () => {
    const raw = JSON.stringify({
      eventType: 'funding',
      companyName: 'Acme Robotics',
      sector: 'robotics',
      stage: 'Series A',
      roundAmount: '$10M',
      investors: ['Acme Ventures'],
      summary: 'Acme Robotics raised a Series A.',
    })
    expect(parseExtractionResponse(raw)).toEqual({
      eventType: 'funding',
      companyName: 'Acme Robotics',
      sector: 'robotics',
      stage: 'Series A',
      roundAmount: '$10M',
      investors: ['Acme Ventures'],
      summary: 'Acme Robotics raised a Series A.',
    })
  })

  it('parses an "other" classification with null fields', () => {
    const raw = JSON.stringify({
      eventType: 'other', companyName: null, sector: null, stage: null,
      roundAmount: null, investors: [], summary: null,
    })
    expect(parseExtractionResponse(raw)!.eventType).toBe('other')
  })

  it('tolerates the model wrapping JSON in prose or markdown fences', () => {
    const raw = 'Here is the answer:\n```json\n' + JSON.stringify({
      eventType: 'acquisition', companyName: null, sector: null, stage: null,
      roundAmount: null, investors: [], summary: null,
    }) + '\n```'
    expect(parseExtractionResponse(raw)!.eventType).toBe('acquisition')
  })

  it('returns null (not a throw) for truncated/malformed JSON', () => {
    expect(parseExtractionResponse('{"eventType":"funding","companyName":')).toBeNull()
  })

  it('returns null for a response with no JSON object at all', () => {
    expect(parseExtractionResponse('I cannot answer that.')).toBeNull()
  })

  it('returns null for an invalid eventType value', () => {
    const raw = JSON.stringify({ eventType: 'rumor', companyName: null })
    expect(parseExtractionResponse(raw)).toBeNull()
  })

  it('defaults missing optional fields rather than throwing', () => {
    const raw = JSON.stringify({ eventType: 'funding' })
    const result = parseExtractionResponse(raw)
    expect(result).not.toBeNull()
    expect(result!.investors).toEqual([])
    expect(result!.companyName).toBeNull()
  })

  it('defaults investors to [] when the model returns a non-array', () => {
    const raw = JSON.stringify({ eventType: 'funding', investors: 'Acme Ventures' })
    expect(parseExtractionResponse(raw)!.investors).toEqual([])
  })
})
