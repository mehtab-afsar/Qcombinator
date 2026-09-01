import { computeEvidenceWeight, UNDATED_RECENCY } from '../scoring/evidence-weight'

const DOMAIN = 'acme.com'
const RECENT = new Date().toISOString()
const OLD = new Date('2015-01-01').toISOString()

describe('computeEvidenceWeight — individual factors', () => {
  it('reliability: single direct-tier URL scores 1.00', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://patents.google.com/x'],
      directness: 'direct',
      publishedDates: [RECENT],
      companyDomain: DOMAIN,
    })
    expect(r.reliability).toBe(1.00)
  })

  it('reliability: averages across multiple cited URLs of different tiers', () => {
    const r = computeEvidenceWeight({
      // direct (1.00) + unknown (0.25) → average 0.625
      citedUrls: ['https://patents.google.com/x', 'https://randomblog.example.com/post'],
      directness: 'direct',
      publishedDates: [RECENT, RECENT],
      companyDomain: DOMAIN,
    })
    expect(r.reliability).toBeCloseTo(0.625)
  })

  it('directness maps each label to its fixed scale value', () => {
    const base = { citedUrls: ['https://patents.google.com/x'], publishedDates: [RECENT], companyDomain: DOMAIN }
    expect(computeEvidenceWeight({ ...base, directness: 'direct' }).directness).toBe(1.00)
    expect(computeEvidenceWeight({ ...base, directness: 'strong_proxy' }).directness).toBe(0.75)
    expect(computeEvidenceWeight({ ...base, directness: 'indirect_proxy' }).directness).toBe(0.50)
    expect(computeEvidenceWeight({ ...base, directness: 'speculative' }).directness).toBe(0.25)
  })

  it('recency: a recent (<6mo) date scores 1.00', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://patents.google.com/x'], directness: 'direct',
      publishedDates: [RECENT], companyDomain: DOMAIN,
    })
    expect(r.recency).toBe(1.00)
  })

  it('recency: a >36mo-old date scores 0.25', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://patents.google.com/x'], directness: 'direct',
      publishedDates: [OLD], companyDomain: DOMAIN,
    })
    expect(r.recency).toBe(0.25)
  })

  it('recency: no published date anywhere defaults to the explicit undated constant (0.40)', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://patents.google.com/x'], directness: 'direct',
      publishedDates: [undefined], companyDomain: DOMAIN,
    })
    expect(r.recency).toBe(UNDATED_RECENCY)
    expect(UNDATED_RECENCY).toBe(0.40)
  })

  it('corroboration: 2+ distinct domains scores 1.00', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://patents.google.com/x', 'https://uspto.gov/y'],
      directness: 'direct', publishedDates: [RECENT, RECENT], companyDomain: DOMAIN,
    })
    expect(r.corroboration).toBe(1.00)
  })

  it('corroboration: a single reputable-tier domain scores 0.75', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://crunchbase.com/x'],
      directness: 'direct', publishedDates: [RECENT], companyDomain: DOMAIN,
    })
    expect(r.corroboration).toBe(0.75)
  })

  it('corroboration: a single unknown-tier domain scores 0.25', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://randomblog.example.com/post'],
      directness: 'direct', publishedDates: [RECENT], companyDomain: DOMAIN,
    })
    expect(r.corroboration).toBe(0.25)
  })

  it('two citations on the SAME domain count as one source for corroboration, not two', () => {
    const r = computeEvidenceWeight({
      citedUrls: ['https://crunchbase.com/x', 'https://crunchbase.com/y'],
      directness: 'direct', publishedDates: [RECENT, RECENT], companyDomain: DOMAIN,
    })
    expect(r.corroboration).toBe(0.75) // single distinct domain, reputable tier — not 1.00
  })
})

describe('computeEvidenceWeight — the full weighted formula', () => {
  it('matches the hand-computed value for a realistic mixed case', () => {
    // reliability: 1.00 (direct only), directness: 1.00, recency: 1.00, corroboration: 0.75
    // (single domain, direct tier ≥0.75) → 0.40*1 + 0.30*1 + 0.20*1 + 0.10*0.75 = 0.975
    const r = computeEvidenceWeight({
      citedUrls: ['https://patents.google.com/x'],
      directness: 'direct',
      publishedDates: [RECENT],
      companyDomain: DOMAIN,
    })
    expect(r.evidenceWeight).toBeCloseTo(0.975)
  })

  it('a weak, single, old, indirect citation scores near the floor', () => {
    // reliability: 0.25, directness: 0.25, recency: 0.25, corroboration: 0.25
    // → 0.40*0.25 + 0.30*0.25 + 0.20*0.25 + 0.10*0.25 = 0.25
    const r = computeEvidenceWeight({
      citedUrls: ['https://randomblog.example.com/post'],
      directness: 'speculative',
      publishedDates: [OLD],
      companyDomain: DOMAIN,
    })
    expect(r.evidenceWeight).toBeCloseTo(0.25)
  })
})
