/**
 * `action_log.dedupe_key` — idempotency for a run that has no execution_id.
 *
 * action_log's existing guard is `action_log_one_execution`, a partial unique index on
 * (action_id, execution_id) **WHERE execution_id IS NOT NULL**. The founder-triggered ad-hoc path
 * (lib/actions/direct.ts) runs outside any cycle, so its execution_id is null and that index does
 * not apply to it *at all* — which is the failure this column exists to prevent, and exactly the
 * kind of gap that looks fine in review because the index is right there in the schema.
 *
 * Three things have to line up for it to work, and they live in three different places:
 *   1. the column and its partial unique index exist (migration),
 *   2. `generateAction` actually persists the key it was handed (this is the one that was missing),
 *   3. the key is scoped per founder, not global.
 */

jest.mock('@/lib/llm/router', () => ({ routedCall: jest.fn() }))
jest.mock('@/lib/actions/log', () => {
  const actual = jest.requireActual('@/lib/actions/log')
  return { ...actual, recordAttempt: jest.fn() }
})
jest.mock('@/lib/actions/payload-vault', () => ({ storePayload: jest.fn().mockResolvedValue('vault-ref-1') }))
jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAction } from '@/lib/actions/generate'
import { recordAttempt } from '@/lib/actions/log'
import { routedCall } from '@/lib/llm/router'

const admin = {} as unknown as SupabaseClient
const m = (fn: unknown) => fn as jest.Mock

const program = {
  id: 'prog1', contractId: 'c1', templateId: 'P005' as const, owner: 'growth',
  objective: 'o', successMetric: 's', status: 'active' as const,
}
const args = (over: Record<string, unknown> = {}) => ({
  founderId: 'f1', program, actionId: 'follow_up_prospects' as never,
  executionId: null, activePrograms: ['P005' as const],
  context: { strategy: 'Mid-market procurement teams in EMEA.' },
  ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
  m(routedCall).mockResolvedValue({ text: 'Drafted three follow-ups.', toolCall: null, stopReason: 'end_turn' })
  m(recordAttempt).mockImplementation(async (_a: unknown, a: Record<string, unknown>) => ({ id: 'log1', ...a }))
})

describe('generateAction persists the key it was handed', () => {
  it('⚠️ writes dedupeKey onto the log row — declaring the arg is not enough', () => {
    // The defect this catches: GenerateActionArgs.dedupeKey accepted, documented, threaded from
    // directActionRun, and then dropped on the floor at the recordAttempt call. Every other test
    // in the suite still passes; idempotency silently does not exist.
    return generateAction(admin, args({ dedupeKey: 'followup:sig-1' })).then(() => {
      expect(m(recordAttempt).mock.calls[0][1].dedupeKey).toBe('followup:sig-1')
    })
  })

  it('writes null, not undefined, when there is no key — a cycle run is unaffected', async () => {
    await generateAction(admin, args({ executionId: 'run-1' }))
    expect(m(recordAttempt).mock.calls[0][1].dedupeKey).toBeNull()
  })

  it('an ad-hoc run logs a null execution_id rather than a synthesised one', async () => {
    // A fake `direct_<uuid>` would fail the FK to operating_rhythm_runs. Null is the honest value.
    await generateAction(admin, args({ dedupeKey: 'followup:sig-1' }))
    expect(m(recordAttempt).mock.calls[0][1].executionId).toBeNull()
  })
})

describe('the column the code depends on', () => {
  const sql = readFileSync(
    join(__dirname, '..', 'supabase/migrations/20260904000002_action_log_dedupe_key.sql'), 'utf8',
  )

  it('adds the column additively, so existing rows and rollback are both fine', () => {
    expect(sql).toContain('add column if not exists dedupe_key')
    expect(sql).toContain('drop column if exists dedupe_key')
  })

  it('⚠️ is unique per founder, not globally — one founder cannot block another\'s key', () => {
    expect(sql).toMatch(/on action_log \(founder_id, dedupe_key\)/)
  })

  it('is partial, so every existing null-keyed row stays legal', () => {
    // Without the WHERE clause the second null-keyed row in the whole table would collide.
    expect(sql).toMatch(/where dedupe_key is not null/i)
  })
})
