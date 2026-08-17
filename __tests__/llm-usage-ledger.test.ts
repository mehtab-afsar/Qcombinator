/**
 * Phase 10 Part 1 — the AI Usage/Cost Ledger. Before this, `routedCall`'s response type
 * discarded the Anthropic SDK's own usage field entirely; nothing tracked spend anywhere.
 *
 * Two things matter here: (1) routedCall/routedStream stay no-ops for every one of their ~22
 * existing callers that omit usageContext, and (2) when usageContext IS supplied, a real row
 * gets written — but a write failure must never surface as a broken LLM call.
 */

jest.mock('@/lib/llm/providers', () => ({ getProvider: jest.fn() }))
jest.mock('@/lib/supabase/server', () => ({ createAdminClient: jest.fn() }))
jest.mock('@/lib/logger', () => ({ log: { error: jest.fn(), warn: jest.fn(), info: jest.fn() } }))

import { routedCall, routedStream } from '@/lib/llm/router'
import { getProvider } from '@/lib/llm/providers'
import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'
import { estimateCost, MODEL_PRICING } from '@/lib/llm/pricing'

const m = (fn: unknown) => fn as jest.Mock

function fakeAdmin(insertImpl: (row: Record<string, unknown>) => Promise<{ error: Error | null }>) {
  const insert = jest.fn(insertImpl)
  return { from: jest.fn(() => ({ insert })), _insert: insert }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('estimateCost', () => {
  it('computes from the pricing table', () => {
    const cost = estimateCost('claude-sonnet-4-5', { inputTokens: 1_000_000, outputTokens: 1_000_000 })
    expect(cost).toBeCloseTo(MODEL_PRICING['claude-sonnet-4-5'].inputPer1M + MODEL_PRICING['claude-sonnet-4-5'].outputPer1M)
  })

  it('returns null for a model not in the table — usage is still real even if pricing is not known', () => {
    expect(estimateCost('some-future-model', { inputTokens: 100, outputTokens: 100 })).toBeNull()
  })
})

describe('routedCall — usage logging is opt-in and additive', () => {
  it('omitting usageContext never touches the admin client at all', async () => {
    m(getProvider).mockReturnValue({
      chat: jest.fn().mockResolvedValue({ text: 'hi', toolCall: null, usage: { inputTokens: 10, outputTokens: 5 }, model: 'claude-sonnet-4-5' }),
    })
    await routedCall({ taskClass: 'reasoning', messages: [{ role: 'user', content: 'x' }] })
    expect(createAdminClient).not.toHaveBeenCalled()
  })

  it('writes a real row when usageContext is supplied and the provider reports usage', async () => {
    m(getProvider).mockReturnValue({
      chat: jest.fn().mockResolvedValue({ text: 'hi', toolCall: null, usage: { inputTokens: 100, outputTokens: 50 }, model: 'claude-sonnet-4-5' }),
    })
    const admin = fakeAdmin(async () => ({ error: null }))
    m(createAdminClient).mockReturnValue(admin)

    await routedCall({
      taskClass: 'reasoning',
      messages: [{ role: 'user', content: 'x' }],
      usageContext: { founderId: 'f1', programId: 'prog1', actionId: 'interview_customers', executionId: 'run1' },
    })

    expect(admin._insert).toHaveBeenCalledTimes(1)
    const row = admin._insert.mock.calls[0][0]
    expect(row).toMatchObject({
      founder_id: 'f1', program_id: 'prog1', action_id: 'interview_customers', asset_id: null,
      execution_id: 'run1', model: 'claude-sonnet-4-5', input_tokens: 100, output_tokens: 50,
    })
    expect(row.estimated_cost_usd).toBeCloseTo(estimateCost('claude-sonnet-4-5', { inputTokens: 100, outputTokens: 50 })!)
  })

  it('no usage reported (e.g. the Groq fallback) is a silent no-op, not an error', async () => {
    m(getProvider).mockReturnValue({ chat: jest.fn().mockResolvedValue({ text: 'hi', toolCall: null }) })
    const admin = fakeAdmin(async () => ({ error: null }))
    m(createAdminClient).mockReturnValue(admin)

    await routedCall({ taskClass: 'reasoning', messages: [{ role: 'user', content: 'x' }], usageContext: { founderId: 'f1' } })

    expect(admin._insert).not.toHaveBeenCalled()
  })

  it('a write failure never throws — the LLM response is still returned', async () => {
    m(getProvider).mockReturnValue({
      chat: jest.fn().mockResolvedValue({ text: 'hi', toolCall: null, usage: { inputTokens: 10, outputTokens: 5 }, model: 'claude-sonnet-4-5' }),
    })
    m(createAdminClient).mockImplementation(() => { throw new Error('db unreachable') })

    const result = await routedCall({
      taskClass: 'reasoning', messages: [{ role: 'user', content: 'x' }], usageContext: { founderId: 'f1' },
    })

    expect(result.text).toBe('hi')
    expect(log.warn).toHaveBeenCalled()
  })
})

describe('routedStream — usage logs once the stream completes', () => {
  it('writes a row from the done event when usageContext is supplied', async () => {
    async function* fakeStream() {
      yield { type: 'delta' as const, text: 'hi' }
      yield { type: 'done' as const, toolCall: null, usage: { inputTokens: 20, outputTokens: 8 }, model: 'claude-haiku-4-5-20251001' }
    }
    m(getProvider).mockReturnValue({ stream: fakeStream })
    const admin = fakeAdmin(async () => ({ error: null }))
    m(createAdminClient).mockReturnValue(admin)

    const events = []
    for await (const event of routedStream('reasoning', [{ role: 'user', content: 'x' }], {}, { founderId: 'f1', assetId: 'AS001' })) {
      events.push(event)
    }

    expect(events).toHaveLength(2)
    expect(admin._insert).toHaveBeenCalledTimes(1)
    expect(admin._insert.mock.calls[0][0]).toMatchObject({ founder_id: 'f1', asset_id: 'AS001', input_tokens: 20, output_tokens: 8 })
  })

  it('omitting usageContext never touches the admin client', async () => {
    async function* fakeStream() {
      yield { type: 'done' as const, toolCall: null, usage: { inputTokens: 20, outputTokens: 8 }, model: 'claude-haiku-4-5-20251001' }
    }
    m(getProvider).mockReturnValue({ stream: fakeStream })

    for await (const _event of routedStream('reasoning', [{ role: 'user', content: 'x' }])) { /* drain */ }

    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
