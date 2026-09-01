import { calculateQScoreLite } from '../scoring/aggregate'
import { INDICATOR_DEFINITIONS } from '../scoring/indicators'
import type { IndicatorExtraction } from '../scoring/types'

const DOMAIN = 'acme.com'
const RECENT_DATE = new Date().toISOString()

function nullExtraction(id: IndicatorExtraction['id']): IndicatorExtraction {
  return { id, rawScore: null, citedUrls: [], directness: null, reasoning: '' }
}

function maxExtraction(id: IndicatorExtraction['id']): IndicatorExtraction {
  return {
    id,
    rawScore: 5,
    citedUrls: ['https://patents.google.com/x', 'https://uspto.gov/y'], // 2 direct-tier, distinct domains
    directness: 'direct',
    reasoning: 'strong evidence',
  }
}

describe('calculateQScoreLite — total extraction failure', () => {
  it('returns a defined 0/0, not NaN, when every indicator is null', () => {
    const extractions = INDICATOR_DEFINITIONS.map(d => nullExtraction(d.id))
    const result = calculateQScoreLite(extractions, new Map(), DOMAIN)
    expect(result.qslScore).toBe(0)
    expect(result.confidencePct).toBe(0)
    expect(result.activeIndicatorCount).toBe(0)
    expect(Number.isNaN(result.qslScore)).toBe(false)
    expect(Number.isNaN(result.confidencePct)).toBe(false)
  })
})

describe('calculateQScoreLite — full evidence on every indicator', () => {
  it('reaches 100/100 when every indicator has max score and max evidence weight', () => {
    const extractions = INDICATOR_DEFINITIONS.map(d => maxExtraction(d.id))
    const dates = new Map<string, string>()
    for (const url of ['https://patents.google.com/x', 'https://uspto.gov/y']) dates.set(url, RECENT_DATE)

    const result = calculateQScoreLite(extractions, dates, DOMAIN)
    expect(result.qslScore).toBe(100)
    expect(result.confidencePct).toBe(100)
    expect(result.activeIndicatorCount).toBe(20)
  })
})

describe('calculateQScoreLite — missing evidence lowers confidence, never the score', () => {
  it('keeps qslScore at 100 (renormalized over active only) while confidence drops to reflect the missing half', () => {
    const dates = new Map<string, string>()
    for (const url of ['https://patents.google.com/x', 'https://uspto.gov/y']) dates.set(url, RECENT_DATE)

    // First 10 indicators (definition order) fully scored; last 10 null.
    const extractions = INDICATOR_DEFINITIONS.map((d, i) =>
      i < 10 ? maxExtraction(d.id) : nullExtraction(d.id)
    )
    const result = calculateQScoreLite(extractions, dates, DOMAIN)

    expect(result.qslScore).toBe(100) // active-only renormalization: still a perfect score on what was found
    expect(result.activeIndicatorCount).toBe(10)
    expect(result.confidencePct).toBe(50) // 10/20 indicators contributed max evidence weight → 50%
  })

  it('groups indicators back under their parameter, with per-parameter active/total counts correct', () => {
    const dates = new Map<string, string>()
    for (const url of ['https://patents.google.com/x', 'https://uspto.gov/y']) dates.set(url, RECENT_DATE)

    // Definition order: [0-3]=founder_team, [4-7]=market_attractiveness,
    // [8-11]=product_technical_depth, [12-15]=commercial_momentum, [16-19]=company_readiness.
    // First 10 active covers founder_team + market_attractiveness fully, and half of
    // product_technical_depth — commercial_momentum and company_readiness are entirely null.
    const extractions = INDICATOR_DEFINITIONS.map((d, i) =>
      i < 10 ? maxExtraction(d.id) : nullExtraction(d.id)
    )
    const result = calculateQScoreLite(extractions, dates, DOMAIN)

    const byId = Object.fromEntries(result.parameters.map(p => [p.id, p]))
    expect(byId.founder_team).toMatchObject({ score: 100, activeCount: 4, totalCount: 4 })
    expect(byId.market_attractiveness).toMatchObject({ score: 100, activeCount: 4, totalCount: 4 })
    expect(byId.product_technical_depth).toMatchObject({ score: 100, activeCount: 2, totalCount: 4 })
    expect(byId.commercial_momentum).toMatchObject({ score: null, activeCount: 0, totalCount: 4 })
    expect(byId.company_readiness).toMatchObject({ score: null, activeCount: 0, totalCount: 4 })
  })
})
