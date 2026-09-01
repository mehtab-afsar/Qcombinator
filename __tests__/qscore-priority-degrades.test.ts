/**
 * GET /api/qscore/priority — what a founder sees when the LLM is unavailable.
 *
 * This is written from a real incident. A founder's dashboard showed `500` twice, which looked
 * like a broken product; the actual cause was an unpaid Anthropic bill. The route already knew
 * how to build priorities from the lowest-scoring dimensions without a model — but that fallback
 * only covered the LLM returning UNPARSEABLE TEXT, not the call THROWING. So every failure that
 * isn't "the model said something odd" — expired key, unpaid balance, rate limit, provider
 * outage — reached the catch-all and became a 500.
 *
 * An LLM being unavailable is ordinary, not exceptional. The properties pinned here:
 *   1. a thrown LLM call still returns priorities, with a 200
 *   2. the degraded result is NOT cached — the cache lasts six hours, so caching a fallback
 *      written during a ten-minute outage would keep serving it long after the cause was fixed
 *   3. the response says it is degraded, rather than passing a fallback off as an AI answer
 */

const mockRoutedText = jest.fn()
const mockUpdate = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))

jest.mock('@/lib/llm/router', () => ({ routedText: (...a: unknown[]) => mockRoutedText(...a) }))
jest.mock('@/lib/auth/verify', () => ({
  verifyAuth: async () => ({ ok: true, user: { id: 'user-1' } }),
}))

/** A founder well past the score-15 threshold, so the route takes the LLM path. */
const SCORE_ROW = {
  id: 'score-1', overall_score: 21,
  p1_score: 40, p2_score: 12, p3_score: 8, p4_score: 55, p5_score: 30, p6_score: 19,
  ai_actions: null, calculated_at: '2026-09-01T14:15:41Z',
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      // Every query in the route is a chain ending in .single() or .limit(); one chainable
      // stands in for all of them, resolving to whatever this table should return.
      const rows = table === 'founder_profiles'
        ? [{ startup_name: 'Acme', industry: 'saas', stage: 'mvp', weekly_goal: null }]
        : table === 'qscore_history' ? [SCORE_ROW] : []
      const chain: Record<string, unknown> = {
        select: () => chain,
        eq: () => chain,
        gte: () => chain,
        order: () => chain,
        limit: () => chain,
        single: async () => ({ data: rows[0] ?? null, error: null }),
        maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
        update: mockUpdate,
        then: (resolve: (v: unknown) => unknown) => resolve({ data: rows, error: null }),
      }
      return chain
    },
  }),
}))

import { GET } from '@/app/api/qscore/priority/route'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('when the LLM is unavailable', () => {
  const outage = () => mockRoutedText.mockRejectedValue(
    new Error('Your credit balance is too low to access the Anthropic API.'),
  )

  it('⚠️ returns priorities and a 200 — never the 500 the founder actually saw', async () => {
    outage()
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(body.priorities)).toBe(true)
    expect(body.priorities.length).toBeGreaterThan(0)
  })

  it('falls back to the founder\'s own weakest dimensions, so the advice is still real', async () => {
    outage()
    const body = await (await GET()).json()

    // p3 (8) and p2 (12) are the lowest scores in the fixture — those are what needs work.
    const titles = body.priorities.map((p: { title: string }) => p.title).join(' | ')
    expect(titles).toContain('IP & Defensibility')
    expect(titles).toContain('Market Potential')
  })

  it('⚠️ does NOT cache the degraded result', async () => {
    // The cache lives six hours. Caching a fallback produced during a brief outage would keep
    // being served long after the billing was fixed — the founder would "fix" it and see no
    // change until the next day.
    outage()
    await GET()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('says it is degraded rather than passing the fallback off as an AI answer', async () => {
    outage()
    expect((await (await GET()).json()).degraded).toBe(true)
  })
})

describe('when the LLM is working', () => {
  it('uses its answer, caches it, and is not marked degraded', async () => {
    mockRoutedText.mockResolvedValue(JSON.stringify({
      priorities: [{ title: 'Talk to 3 customers today', why: 'w', action: 'a', urgency: 'high' }],
    }))

    const body = await (await GET()).json()

    expect(body.priorities[0].title).toBe('Talk to 3 customers today')
    expect(body.degraded).toBe(false)
    expect(mockUpdate).toHaveBeenCalled()
  })
})
