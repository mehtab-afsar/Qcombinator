/**
 * lib/comparables/market-signals.ts — recent, sector-matched funding news for Company Context.
 */

import { getMarketSignalContext } from '@/lib/comparables/market-signals'

interface FakeSignalRow {
  company_name: string | null
  sector: string | null
  stage: string | null
  round_amount: string | null
  investors: string[] | null
  summary: string | null
  source_url: string
  published_at: string | null
}

function signal(overrides: Partial<FakeSignalRow> = {}): FakeSignalRow {
  return {
    company_name: 'Acme Robotics',
    sector: 'fintech',
    stage: 'Series A',
    round_amount: '$10M',
    investors: ['Acme Ventures'],
    summary: 'Acme Robotics raised a Series A to expand.',
    source_url: 'https://techcrunch.com/article',
    published_at: new Date().toISOString(),
    ...overrides,
  }
}

/** Minimal fake admin client covering the two queries market-signals.ts issues. */
function makeMockAdmin(founder: { industry: string | null } | null, signals: FakeSignalRow[]) {
  const gteSpy = jest.fn((_col: string, _val: string) => ({
    order: jest.fn(() => ({
      limit: jest.fn(async () => ({ data: signals })),
    })),
  }))
  const eqSpy = jest.fn(() => ({ gte: gteSpy }))

  const from = jest.fn((table: string) => {
    if (table === 'founder_profiles') {
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            maybeSingle: jest.fn(async () => ({ data: founder })),
          })),
        })),
      }
    }
    return {
      select: jest.fn(() => ({ eq: eqSpy })),
    }
  })

  return { admin: { from } as unknown as Parameters<typeof getMarketSignalContext>[0], eqSpy, gteSpy }
}

describe('getMarketSignalContext', () => {
  it('returns null when the founder has no profile row', async () => {
    const { admin } = makeMockAdmin(null, [])
    expect(await getMarketSignalContext(admin, 'ghost')).toBeNull()
  })

  it('returns null when nothing matches the founder\'s sector bucket', async () => {
    const { admin } = makeMockAdmin({ industry: 'fintech' }, [signal({ sector: 'climate' })])
    expect(await getMarketSignalContext(admin, 'f1')).toBeNull()
  })

  it('matches on sector BUCKET, not exact string — "Fintech" (raw news text) matches "fintech" (founder industry)', async () => {
    const { admin } = makeMockAdmin({ industry: 'fintech' }, [signal({ sector: 'Fintech' })])
    const result = await getMarketSignalContext(admin, 'f1')
    expect(result).not.toBeNull()
    expect(result).toContain('Acme Robotics')
  })

  it('queries only event_type = funding and a 30-day window at the DB level', async () => {
    const { admin, eqSpy, gteSpy } = makeMockAdmin({ industry: 'fintech' }, [signal()])
    await getMarketSignalContext(admin, 'f1')
    expect(eqSpy).toHaveBeenCalledWith('event_type', 'funding')
    const [, dateArg] = gteSpy.mock.calls[0]
    expect(new Date(dateArg).getTime()).toBeLessThan(Date.now())
    expect(new Date(dateArg).getTime()).toBeGreaterThan(Date.now() - 31 * 24 * 60 * 60 * 1000)
  })

  it('caps at 5 items even when more match', async () => {
    const many = Array.from({ length: 8 }, (_, i) => signal({ company_name: `Co ${i}` }))
    const { admin } = makeMockAdmin({ industry: 'fintech' }, many)
    const result = await getMarketSignalContext(admin, 'f1')
    const itemLines = result!.split('\n').filter(l => l.startsWith('- '))
    expect(itemLines).toHaveLength(5)
  })

  it('always leads with the unverified-third-party hedge', async () => {
    const { admin } = makeMockAdmin({ industry: 'fintech' }, [signal()])
    const result = await getMarketSignalContext(admin, 'f1')
    expect(result).toMatch(/^Recent third-party news \(unverified/)
  })

  it('includes the source URL for each item (attribution)', async () => {
    const { admin } = makeMockAdmin({ industry: 'fintech' }, [signal({ source_url: 'https://techcrunch.com/xyz' })])
    const result = await getMarketSignalContext(admin, 'f1')
    expect(result).toContain('https://techcrunch.com/xyz')
  })

  it('never fabricates content — a null summary/investors just omits that part cleanly', async () => {
    const { admin } = makeMockAdmin({ industry: 'fintech' }, [
      signal({ summary: null, investors: [] }),
    ])
    const result = await getMarketSignalContext(admin, 'f1')
    expect(result).not.toContain('undefined')
    expect(result).not.toContain('null')
  })
})
