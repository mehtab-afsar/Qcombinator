/**
 * F07b — assembling Company Context for S001 (lib/mandate/strategy-proposal.ts).
 *
 * Mirrors how __tests__/executive-contract.test.ts mocks lib/mandate/generate — the
 * generation itself is covered by strategy-proposal-generation.test.ts; this file is
 * only about what proposeStrategy reads and hands to it.
 */

jest.mock('@/lib/mandate/generate', () => ({
  ...jest.requireActual('@/lib/mandate/generate'),
  generateStrategyProposal: jest.fn(),
}))

import { readFileSync } from 'fs'
import { generateStrategyProposal, MandateGenerationError } from '@/lib/mandate/generate'
import { proposeStrategy } from '@/lib/mandate/strategy-proposal'

const mockGenerate = generateStrategyProposal as jest.Mock

const FOUNDER = 'f1'

function fakeSupabase(tables: {
  founder_profiles?: { company_name?: string } | null
  qscore_history?: Record<string, number> | null
}) {
  return {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: tables.founder_profiles ?? null, error: null }),
          order: () => ({
            limit: () => ({
              maybeSingle: () => Promise.resolve({
                data: table === 'qscore_history' ? tables.qscore_history ?? null : null,
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
  } as unknown as Parameters<typeof proposeStrategy>[0]
}

beforeEach(() => jest.clearAllMocks())

describe('proposeStrategy', () => {
  const scoreRow = {
    overall_score: 62,
    p1_score: 78, p2_score: 32, p3_score: 55, p4_score: 61, p5_score: 40, p6_score: 70,
  }

  it('reads the real Q-Score and passes it through as read-only context', async () => {
    mockGenerate.mockResolvedValue({ mission: 'm', priorities: ['p'], goals: [], document: 'doc' })

    await proposeStrategy(
      fakeSupabase({ founder_profiles: { company_name: 'Acme' }, qscore_history: scoreRow }),
      FOUNDER,
      {},
    )

    expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
      companyName: 'Acme',
      qScore: expect.objectContaining({ overall: 62 }),
    }))
  })

  it('summarises the score honestly — weakest and strongest dimension, nothing invented', async () => {
    mockGenerate.mockResolvedValue({ mission: 'm', priorities: ['p'], goals: [], document: 'doc' })

    await proposeStrategy(fakeSupabase({ qscore_history: scoreRow }), FOUNDER, {})

    // p2 (32) is the lowest score above, p1 (78) is the highest.
    const sent = mockGenerate.mock.calls[0][0]
    expect(sent.qScore.summary).toContain('Weakest: Market Potential (32)')
    expect(sent.qScore.summary).toContain('Strongest: Market Readiness (78)')
  })

  it('refuses to propose when there is no Q-Score yet', async () => {
    await expect(
      proposeStrategy(fakeSupabase({ qscore_history: null }), FOUNDER, {}),
    ).rejects.toThrow(MandateGenerationError)
    await expect(
      proposeStrategy(fakeSupabase({ qscore_history: null }), FOUNDER, {}),
    ).rejects.toThrow(/no Q-Score/i)
    expect(mockGenerate).not.toHaveBeenCalled()
  })

  it('passes the founder-supplied traction as new information, trimmed', async () => {
    mockGenerate.mockResolvedValue({ mission: 'm', priorities: ['p'], goals: [], document: 'doc' })

    await proposeStrategy(
      fakeSupabase({ qscore_history: scoreRow }),
      FOUNDER,
      { currentTraction: '  11 pilots, 4 paying  ' },
    )

    expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({
      newInformation: '11 pilots, 4 paying',
    }))
  })

  it('omits newInformation entirely when no traction was supplied', async () => {
    mockGenerate.mockResolvedValue({ mission: 'm', priorities: ['p'], goals: [], document: 'doc' })

    await proposeStrategy(fakeSupabase({ qscore_history: scoreRow }), FOUNDER, {})

    expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ newInformation: undefined }))
  })
})

// ─── The route follows the same established shape as every other new-model route ──
//
// F07 "the unveiling" (UX_SPEC_the_frame.md §3) rewrote this route from one blocking
// JSON response to an SSE stream (Layer 1, "the read," types in live — see
// STRATEGY_READ_DELIMITER in lib/prompts/composer/mandate.ts). The gate/auth/validate
// order and the "never saves" property are unchanged, so those assertions stay as-is;
// this block adds the streaming-specific properties alongside them.

describe('POST /api/strategy/propose is gated and validated the same way as every route here', () => {
  const routeSrc = readFileSync('app/api/strategy/propose/route.ts', 'utf8')

  it('uses the single shared flag guard, not its own copy', () => {
    expect(routeSrc).toContain("from '@/lib/api/response'")
    expect(routeSrc).toContain('newModelOff()')
  })

  it('validates input with Zod and authenticates before touching data', () => {
    expect(routeSrc).toContain('parseBody(req, proposeSchema)')
    expect(routeSrc).toContain('verifyAuth()')
    // The user-scoped client — RLS enforces tenancy rather than this route
    // remembering to. An admin client would bypass the guarantee.
    expect(routeSrc).toContain('await createClient()')
    expect(routeSrc).not.toContain('createAdminClient')
  })

  it('never persists anything — proposing is not saving', () => {
    // The founder's own review-and-edit, then their own POST /api/strategy, is the
    // only thing that writes. This route must not call saveStrategy.
    expect(routeSrc).not.toContain('saveStrategy')
    expect(routeSrc).not.toMatch(/\.insert\(/)
  })

  it('generation is routed through routedStream — the router, not a hardcoded model', () => {
    expect(routeSrc).toContain("from '@/lib/llm/router'")
    expect(routeSrc).toContain('routedStream(')
    expect(routeSrc).not.toMatch(/claude-[a-z0-9-]+/i)
  })

  it('streams the same data:/[DONE] framing already established for SSE in this codebase', () => {
    expect(routeSrc).toContain('data: ')
    expect(routeSrc).toContain('[DONE]')
    expect(routeSrc).toContain("'Content-Type': 'text/event-stream'")
  })

  it('a generation failure is a soft `done` event, never a bare 500 mid-stream', () => {
    // The stream has already sent a 200 + headers by the time generation can fail —
    // a thrown error here must not become an unhandled rejection the client can't read.
    expect(routeSrc).toContain("type: 'done', error: message")
  })
})
