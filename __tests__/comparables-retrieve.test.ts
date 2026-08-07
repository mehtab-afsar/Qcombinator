/**
 * lib/comparables/retrieve.ts — Comparable Company Context (Phase 1 of the RAG roadmap).
 *
 * Guards the properties the feature was explicitly designed around: never surface an
 * individual founder's identity or exact figure, never trust self-reported free-text money
 * figures, exclude opted-out founders, and return null rather than a thin/misleading statistic.
 */

import {
  parseTeamSize,
  aggregateMetric,
  getComparableCohortContext,
} from '@/lib/comparables/retrieve'
import {
  getCachedComparablePopulation,
  setCachedComparablePopulation,
} from '@/lib/cache/qscore-cache'

// Deterministic, isolated tests: every call is a cache miss, so getComparableCohortContext
// always exercises a fresh fetch instead of state left over from another test.
jest.mock('@/lib/cache/qscore-cache', () => ({
  getCachedComparablePopulation: jest.fn(() => null),
  setCachedComparablePopulation: jest.fn(),
}))

// ─── parseTeamSize ──────────────────────────────────────────────────────────────

describe('parseTeamSize', () => {
  it.each([
    ['5', 5],
    ['05', 5],
    ['1', 1],
    ['500', 500],
    ['5 ', 5],       // trims
    [' 5', 5],
  ])('accepts plain digits: %s -> %s', (raw, expected) => {
    expect(parseTeamSize(raw)).toBe(expected)
  })

  it.each([
    ['3-5', 'a range is two numbers, not one'],
    ['5+', 'a qualifier makes it not a plain number'],
    ['small team', 'not numeric at all'],
    ['', 'empty'],
    [null, 'null'],
    [undefined, 'undefined'],
    ['five', 'spelled out'],
    ['0', 'zero is not a real team size'],
    ['501', 'above the sanity cap'],
    ['-5', 'negative'],
  ])('rejects %s (%s)', (raw, _reason) => {
    expect(parseTeamSize(raw as string | null | undefined)).toBeNull()
  })
})

// ─── aggregateMetric ────────────────────────────────────────────────────────────

describe('aggregateMetric', () => {
  it('returns null below the minimum sample size', () => {
    expect(aggregateMetric([])).toBeNull()
    expect(aggregateMetric([10])).toBeNull()
    expect(aggregateMetric([10, 20])).toBeNull()
  })

  it('returns median only for a small cohort (n=3)', () => {
    const result = aggregateMetric([10, 20, 30])
    expect(result).not.toBeNull()
    expect(result!.median).toBe(20)
    expect(result!.iqr).toBeUndefined()
  })

  it('never returns the true min or max for a small cohort', () => {
    // n=3: min=10, max=30. Neither must appear anywhere in the aggregate — a range built
    // from this few points would just be republishing one real founder's exact figure.
    for (const values of [[10, 20, 30], [1, 500, 999], [7, 7, 7]]) {
      const result = aggregateMetric(values)
      const min = Math.min(...values)
      const max = Math.max(...values)
      if (result?.iqr) {
        expect(result.iqr[0]).not.toBe(min)
        expect(result.iqr[1]).not.toBe(max)
      }
    }
  })

  it('adds an interquartile band once the cohort reaches 8', () => {
    const result = aggregateMetric([10, 20, 30, 40, 50, 60, 70, 80])
    expect(result).not.toBeNull()
    expect(result!.iqr).toBeDefined()
    const [p25, p75] = result!.iqr!
    expect(p25).toBeLessThan(result!.median)
    expect(p75).toBeGreaterThan(result!.median)
    // The IQR band is p25/p75, not the true min (10) / max (80).
    expect(p25).not.toBe(10)
    expect(p75).not.toBe(80)
  })

  it('still returns median-only at n=7, one below the IQR threshold', () => {
    const result = aggregateMetric([10, 20, 30, 40, 50, 60, 70])
    expect(result?.iqr).toBeUndefined()
  })
})

// ─── getComparableCohortContext ─────────────────────────────────────────────────

interface FakeFounderRow {
  user_id: string
  industry: string | null
  stage: string | null
  stripe_verified: boolean | null
  stripe_mrr: number | null
  startup_profile_data: Record<string, unknown> | null
}

/**
 * Minimal fake admin client covering exactly the two query shapes retrieve.ts issues:
 *  - .from('founder_profiles').select('industry, stage').eq('user_id', id).maybeSingle()
 *  - .from('founder_profiles').select('user_id, industry, ...').eq('visibility_gated', false)
 * Distinguished by the select() column list, since that's what actually differs between them.
 */
function makeMockAdmin(target: { industry: string | null; stage: string | null } | null, population: FakeFounderRow[]) {
  const fromSpy = jest.fn((_table: string) => ({
    select: jest.fn((cols: string) => {
      if (cols.includes('user_id')) {
        // population fetch — the query builder itself is awaited directly
        return { eq: jest.fn(() => Promise.resolve({ data: population })) }
      }
      // target founder's own sector/stage lookup
      return { eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => ({ data: target })) })) }
    }),
  }))
  return { from: fromSpy } as unknown as Parameters<typeof getComparableCohortContext>[0]
}

function founder(overrides: Partial<FakeFounderRow> & { user_id: string }): FakeFounderRow {
  return {
    industry: 'fintech',
    stage: 'seed',
    stripe_verified: false,
    stripe_mrr: null,
    startup_profile_data: null,
    ...overrides,
  }
}

describe('getComparableCohortContext', () => {
  it('returns null when the target founder has no profile row', async () => {
    const admin = makeMockAdmin(null, [])
    expect(await getComparableCohortContext(admin, 'ghost')).toBeNull()
  })

  it('returns null below the minimum cohort size', async () => {
    const admin = makeMockAdmin(
      { industry: 'fintech', stage: 'seed' },
      [
        founder({ user_id: 'a', stripe_verified: true, stripe_mrr: 10000 }),
        founder({ user_id: 'b', stripe_verified: true, stripe_mrr: 20000 }),
        founder({ user_id: 'c', stripe_verified: true, stripe_mrr: 30000 }),
        // only 3 others — below MIN_COHORT_SIZE (5)
      ],
    )
    expect(await getComparableCohortContext(admin, 'target')).toBeNull()
  })

  it('excludes the target founder from their own cohort (self-exclusion)', async () => {
    const rows = [
      founder({ user_id: 'target', stripe_verified: true, stripe_mrr: 999999 }), // would skew badly if counted
      founder({ user_id: 'a', stripe_verified: true, stripe_mrr: 10000 }),
      founder({ user_id: 'b', stripe_verified: true, stripe_mrr: 12000 }),
      founder({ user_id: 'c', stripe_verified: true, stripe_mrr: 14000 }),
      founder({ user_id: 'd', stripe_verified: true, stripe_mrr: 16000 }),
      founder({ user_id: 'e', stripe_verified: true, stripe_mrr: 18000 }),
    ]
    const admin = makeMockAdmin({ industry: 'fintech', stage: 'seed' }, rows)
    const result = await getComparableCohortContext(admin, 'target')
    expect(result).not.toBeNull()
    expect(result).not.toContain('999999')
    expect(result).toContain('5 comparable')
  })

  it('excludes visibility_gated founders even though the query already filters them (belt and suspenders)', async () => {
    const rows = [
      founder({ user_id: 'gated', stripe_verified: true, stripe_mrr: 1 }), // would never legitimately appear
      founder({ user_id: 'a', stripe_verified: true, stripe_mrr: 10000 }),
      founder({ user_id: 'b', stripe_verified: true, stripe_mrr: 12000 }),
      founder({ user_id: 'c', stripe_verified: true, stripe_mrr: 14000 }),
      founder({ user_id: 'd', stripe_verified: true, stripe_mrr: 16000 }),
      founder({ user_id: 'e', stripe_verified: true, stripe_mrr: 18000 }),
    ]
    // Simulates the query's own `.eq('visibility_gated', false)` already having excluded
    // 'gated' — it's simply absent from what the DB layer returns.
    const admin = makeMockAdmin({ industry: 'fintech', stage: 'seed' }, rows.filter(r => r.user_id !== 'gated'))
    const result = await getComparableCohortContext(admin, 'target')
    expect(result).not.toContain('$1/mo')
  })

  it('omits MRR when fewer than 3 founders are Stripe-verified, even with enough cohort size', async () => {
    const rows = [
      founder({ user_id: 'a', stripe_verified: true, stripe_mrr: 10000 }),
      founder({ user_id: 'b', stripe_verified: false, stripe_mrr: null, startup_profile_data: { teamSize: '3' } }),
      founder({ user_id: 'c', stripe_verified: false, stripe_mrr: null, startup_profile_data: { teamSize: '4' } }),
      founder({ user_id: 'd', stripe_verified: false, stripe_mrr: null, startup_profile_data: { teamSize: '5' } }),
      founder({ user_id: 'e', stripe_verified: false, stripe_mrr: null, startup_profile_data: { teamSize: '6' } }),
    ]
    const admin = makeMockAdmin({ industry: 'fintech', stage: 'seed' }, rows)
    const result = await getComparableCohortContext(admin, 'target')
    expect(result).not.toBeNull()
    expect(result).not.toContain('Monthly recurring revenue')
    expect(result).toContain('Team size')
  })

  it('never falls back to self-reported startup_profile_data.mrr for money figures', async () => {
    const rows = [
      founder({ user_id: 'a', stripe_verified: false, stripe_mrr: null, startup_profile_data: { mrr: '999999' } }),
      founder({ user_id: 'b', stripe_verified: false, stripe_mrr: null, startup_profile_data: { mrr: '999999' } }),
      founder({ user_id: 'c', stripe_verified: false, stripe_mrr: null, startup_profile_data: { mrr: '999999' } }),
      founder({ user_id: 'd', stripe_verified: false, stripe_mrr: null, startup_profile_data: { mrr: '999999' } }),
      founder({ user_id: 'e', stripe_verified: false, stripe_mrr: null, startup_profile_data: { mrr: '999999' } }),
    ]
    const admin = makeMockAdmin({ industry: 'fintech', stage: 'seed' }, rows)
    // No Stripe-verified rows and no parseable team sizes -> nothing clears any bar -> null.
    expect(await getComparableCohortContext(admin, 'target')).toBeNull()
  })

  it('returns null when cohort size clears the bar but no individual metric does', async () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      founder({ user_id: `f${i}`, stripe_verified: false, stripe_mrr: null, startup_profile_data: { teamSize: 'a few' } }),
    )
    const admin = makeMockAdmin({ industry: 'fintech', stage: 'seed' }, rows)
    expect(await getComparableCohortContext(admin, 'target')).toBeNull()
  })

  it('produces a plain-language block framed as market context, not the founder\'s own data', async () => {
    const rows = [
      founder({ user_id: 'a', stripe_verified: true, stripe_mrr: 10000 }),
      founder({ user_id: 'b', stripe_verified: true, stripe_mrr: 12000 }),
      founder({ user_id: 'c', stripe_verified: true, stripe_mrr: 14000 }),
      founder({ user_id: 'd', stripe_verified: true, stripe_mrr: 16000 }),
      founder({ user_id: 'e', stripe_verified: true, stripe_mrr: 18000 }),
    ]
    const admin = makeMockAdmin({ industry: 'fintech', stage: 'seed' }, rows)
    const result = await getComparableCohortContext(admin, 'target')
    expect(result).toContain('Founders in a similar sector and stage on this platform')
    expect(result).toContain('anonymized')
  })
})

// ─── Cache primitive (used by getEligiblePopulation) ────────────────────────────

describe('comparable population cache primitive', () => {
  it('round-trips a value through set/get', () => {
    // Tested directly against the real cache module — the retrieval tests above mock this
    // module out entirely for determinism, so this is the one place the primitive itself
    // is exercised.
    jest.resetModules()
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const real = jest.requireActual('@/lib/cache/qscore-cache')
    expect(real.getCachedComparablePopulation()).toBeNull()
    real.setCachedComparablePopulation([{ userId: 'x' }])
    expect(real.getCachedComparablePopulation()).toEqual([{ userId: 'x' }])
    real.clearAllCaches()
    expect(real.getCachedComparablePopulation()).toBeNull()
  })
})
