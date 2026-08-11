/**
 * B3 + B5 — unit tests against the REAL modules. rhythm.test.ts mocks judge and runs to test
 * the orchestrator; the sanitiser and the retry logic must therefore be tested here, unmocked.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { parseAssetContent, generateAssetContent } from '@/lib/rhythm/judge'
import { createOrResumeRun, CycleAlreadyRanError, RunError, StepLimitOpenError } from '@/lib/rhythm/runs'
import { STEP_LIMIT_EXCEEDED } from '@/lib/rhythm/limits'
import { buildDigest, type CycleSignals } from '@/lib/rhythm/delta'
import { routedCall, routedStream } from '@/lib/llm/router'
import { persistAssetVersion } from '@/lib/assets/versioning'

// Mocked ONLY for the truncation-guard tests below; parseAssetContent/buildDigest/
// createOrResumeRun tests don't touch these modules.
jest.mock('@/lib/llm/router', () => ({ routedCall: jest.fn(), routedStream: jest.fn() }))
jest.mock('@/lib/assets/versioning', () => ({ persistAssetVersion: jest.fn() }))

// ─── B3 — sanitise model output before persisting ─────────────────────────────

describe('B3 parseAssetContent (markdown) — the artefact, not the chat', () => {
  const DOC = '# ICP Profiles\n\nSegment A: mid-market procurement.'

  it('clean output is untouched', () => {
    expect(parseAssetContent(DOC, 'markdown')).toBe(DOC)
  })

  it('strips a fence wrapping the whole document', () => {
    expect(parseAssetContent('```markdown\n' + DOC + '\n```', 'markdown')).toBe(DOC)
    expect(parseAssetContent('```\n' + DOC + '\n```', 'markdown')).toBe(DOC)
  })

  it('strips a conversational preamble ("Here\'s your updated ICP: …")', () => {
    const messy = "Here's your updated ICP document:\n\n" + DOC
    expect(parseAssetContent(messy, 'markdown')).toBe(DOC)
  })

  it('strips a preamble in front of a fenced document (both at once)', () => {
    const messy = 'Sure! I\'ve updated it as requested:\n\n```markdown\n' + DOC + '\n```'
    expect(parseAssetContent(messy, 'markdown')).toBe(DOC)
  })

  it('leaves a document that legitimately starts with prose alone (conservative)', () => {
    // No heading/fence to anchor on → nothing is stripped. Over-stripping is the worse bug.
    const proseDoc = 'Our ideal customer is a mid-market procurement lead.\n\nThey buy when…'
    expect(parseAssetContent(proseDoc, 'markdown')).toBe(proseDoc)
  })

  it('still rejects an empty asset', () => {
    expect(() => parseAssetContent('   ', 'markdown')).toThrow(/empty asset/)
  })
})

// ─── Truncation guard — a cut document is never persisted ─────────────────────

describe('generateAssetContent — truncation is a loud failure, never a stored document', () => {
  const admin = {} as unknown as SupabaseClient
  const program = {
    id: 'row-1', contractId: 'c1', templateId: 'P001' as const, owner: 'growth',
    objective: 'o', successMetric: 's', status: 'active' as const,
  }
  const args = {
    founderId: 'f1', program, assetId: 'AS001' as const, executionId: 'run-1',
    contractId: 'c1', activePrograms: ['P001' as const], context: {},
  }

  beforeEach(() => jest.clearAllMocks())

  it('stopReason max_tokens → JudgementError, nothing persisted, NO retry (runs 2+3 lessons)', async () => {
    ;(routedCall as jest.Mock).mockResolvedValue({ text: '# Cut docum', toolCall: null, stopReason: 'max_tokens' })
    await expect(generateAssetContent(admin, args)).rejects.toThrow(/token cap/)
    expect(persistAssetVersion).not.toHaveBeenCalled()
    // Truncation is deterministic — retrying the same prompt doubles the spend for nothing.
    expect(routedCall).toHaveBeenCalledTimes(1)
  })

  it('a transient failure (timeout) still earns one retry', async () => {
    ;(routedCall as jest.Mock)
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ text: '# Doc\n\nComplete.', toolCall: null, stopReason: 'end_turn' })
    ;(persistAssetVersion as jest.Mock).mockResolvedValue({ id: 'v1' })
    await expect(generateAssetContent(admin, args)).resolves.toBeDefined()
    expect(routedCall).toHaveBeenCalledTimes(2)
  })

  it('a complete response (end_turn) persists normally', async () => {
    ;(routedCall as jest.Mock).mockResolvedValue({ text: '# ICP Profiles\n\nComplete document.', toolCall: null, stopReason: 'end_turn' })
    ;(persistAssetVersion as jest.Mock).mockResolvedValue({ id: 'v1' })
    await generateAssetContent(admin, args)
    expect(persistAssetVersion).toHaveBeenCalledTimes(1)
    expect((persistAssetVersion as jest.Mock).mock.calls[0][1].content).toContain('Complete document')
  })

  it('a provider that omits stopReason is not treated as truncated', async () => {
    ;(routedCall as jest.Mock).mockResolvedValue({ text: '# Doc\n\nBody.', toolCall: null })
    ;(persistAssetVersion as jest.Mock).mockResolvedValue({ id: 'v1' })
    await expect(generateAssetContent(admin, args)).resolves.toBeDefined()
  })
})

// ─── PRD 2 Stage 2 — streaming (onDelta) is a transport choice, not a second path ─────

/** Same event shape AnthropicProvider.stream() yields via routedStream. */
async function* fakeStream(chunks: string[], stopReason = 'end_turn') {
  for (const c of chunks) yield { type: 'delta' as const, text: c }
  yield { type: 'done' as const, toolCall: null, stopReason }
}

describe('generateAssetContent — streaming (onDelta) mirrors the non-streamed path exactly', () => {
  const admin = {} as unknown as SupabaseClient
  const program = {
    id: 'row-1', contractId: 'c1', templateId: 'P001' as const, owner: 'growth',
    objective: 'o', successMetric: 's', status: 'active' as const,
  }
  const args = {
    founderId: 'f1', program, assetId: 'AS001' as const, executionId: 'run-1',
    contractId: 'c1', activePrograms: ['P001' as const], context: {},
  }

  beforeEach(() => jest.clearAllMocks())

  it('onDelta fires per chunk and the persisted content matches the accumulated text', async () => {
    const chunks = ['# ICP Profiles\n\n', 'Segment A: ', 'mid-market.']
    ;(routedStream as jest.Mock).mockReturnValue(fakeStream(chunks))
    ;(persistAssetVersion as jest.Mock).mockResolvedValue({ id: 'v1' })
    const seen: string[] = []
    await generateAssetContent(admin, { ...args, onDelta: text => seen.push(text) })
    expect(seen).toEqual(chunks)
    expect(routedStream).toHaveBeenCalledTimes(1)
    expect(routedCall).not.toHaveBeenCalled()
    expect((persistAssetVersion as jest.Mock).mock.calls[0][1].content).toBe(chunks.join(''))
  })

  it('a streamed max_tokens stop reason is a loud failure too — nothing persisted, no retry', async () => {
    ;(routedStream as jest.Mock).mockReturnValue(fakeStream(['# Cut docum'], 'max_tokens'))
    await expect(generateAssetContent(admin, { ...args, onDelta: () => {} })).rejects.toThrow(/token cap/)
    expect(persistAssetVersion).not.toHaveBeenCalled()
    // Same non-retry rule as the non-streamed truncation test above — deterministic, not transient.
    expect(routedStream).toHaveBeenCalledTimes(1)
  })

  it('no onDelta → the non-streaming path is used, unchanged (regression)', async () => {
    ;(routedCall as jest.Mock).mockResolvedValue({ text: '# Doc\n\nBody.', toolCall: null, stopReason: 'end_turn' })
    ;(persistAssetVersion as jest.Mock).mockResolvedValue({ id: 'v1' })
    await generateAssetContent(admin, args)
    expect(routedCall).toHaveBeenCalledTimes(1)
    expect(routedStream).not.toHaveBeenCalled()
  })
})

// ─── ADR-028 — the delta digest (pure) ────────────────────────────────────────

describe('ADR-028 buildDigest', () => {
  const none: CycleSignals = { founderEdits: [], uploads: [], qscore: null, metricUpdates: [] }

  it('no founder activity → no digest, no new input (the honest no-change week)', () => {
    expect(buildDigest(none)).toEqual({ digest: undefined, hasNewInput: false })
  })

  it('a founder asset edit is the strongest signal and names the asset', () => {
    const d = buildDigest({ ...none, founderEdits: [{ assetId: 'AS001', createdAt: '2026-07-18T10:00:00Z' }] })
    expect(d.hasNewInput).toBe(true)
    expect(d.digest).toContain('AS001')
    expect(d.digest).toContain('ICP Profiles') // resolved from the Registry
    expect(d.digest).toContain('2026-07-18')
  })

  it('uploads, a Q-Score move, and metric updates each register', () => {
    const d = buildDigest({
      founderEdits: [],
      uploads: [{ artifactType: 'pitch_deck', title: 'Seed deck v3', createdAt: '2026-07-17T00:00:00Z' }],
      qscore: { from: 61, to: 66, at: '2026-07-17T12:00:00Z' },
      metricUpdates: [{ at: '2026-07-16T00:00:00Z' }],
    })
    expect(d.hasNewInput).toBe(true)
    expect(d.digest).toContain('pitch_deck')
    expect(d.digest).toContain('61 → 66')
    expect(d.digest).toContain('metrics were updated 1 time')
  })

  it('an unknown asset id degrades to the id, never throws', () => {
    const d = buildDigest({ ...none, founderEdits: [{ assetId: 'AS999', createdAt: '2026-07-18T00:00:00Z' }] })
    expect(d.digest).toContain('AS999')
  })
})

// ─── B5 + FU-004 — a failed OR stalled week is retryable; a live one is resumed ────

/** Minimal fake of the supabase query chains createOrResumeRun uses, recording the ops performed. */
function fakeAdmin(opts: {
  existing?: { id: string; status: string; last_step_at?: string; failure_reason?: string; step_count?: number } | null
  insertError?: { code?: string; message: string }
}): { admin: SupabaseClient; ops: string[] } {
  const ops: string[] = []
  const row = {
    id: 'run-new', founder_id: 'f1', contract_id: null, cycle_key: '2026-W30',
    status: 'running', stages: {}, started_at: 'now', completed_at: null, last_step_at: 'now',
    step_count: 0, failure_reason: null,
  }
  const existingRow = opts.existing && {
    founder_id: 'f1', contract_id: null, cycle_key: '2026-W30',
    started_at: 'now', completed_at: null, stages: {}, last_step_at: 'now',
    step_count: 0, failure_reason: null,
    ...opts.existing,
  }
  const client = {
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            maybeSingle: async () => {
              ops.push('select')
              return { data: existingRow ?? null, error: null }
            },
          }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: async () => {
            ops.push('delete')
            return { error: null }
          },
        }),
      }),
      insert: () => ({
        select: () => ({
          single: async () => {
            ops.push('insert')
            return opts.insertError
              ? { data: null, error: opts.insertError }
              : { data: row, error: null }
          },
        }),
      }),
    }),
  }
  return { admin: client as unknown as SupabaseClient, ops }
}

const ARGS = { founderId: 'f1', contractId: null, cycleKey: '2026-W30' }
const FRESH = new Date().toISOString()
const STALE = new Date(Date.now() - 15 * 60 * 1000).toISOString() // past the 10-minute threshold

describe('B5 + FU-004 createOrResumeRun — retry and resume semantics', () => {
  it('a COMPLETED week stays blocked (idempotency unchanged)', async () => {
    const { admin, ops } = fakeAdmin({ existing: { id: 'r1', status: 'completed', last_step_at: FRESH } })
    await expect(createOrResumeRun(admin, ARGS)).rejects.toBeInstanceOf(CycleAlreadyRanError)
    expect(ops).toEqual(['select']) // nothing deleted, nothing inserted
  })

  it('a RUNNING week with a fresh last_step_at is RESUMED, not blocked (chunking)', async () => {
    const { admin, ops } = fakeAdmin({ existing: { id: 'r1', status: 'running', last_step_at: FRESH } })
    const run = await createOrResumeRun(admin, ARGS)
    expect(run.id).toBe('r1')
    expect(ops).toEqual(['select']) // nothing deleted, nothing (re)inserted — same row continues
  })

  it('a RUNNING week with a STALE last_step_at is treated as abandoned and cleared (FU-004)', async () => {
    const { admin, ops } = fakeAdmin({ existing: { id: 'r1', status: 'running', last_step_at: STALE } })
    const run = await createOrResumeRun(admin, ARGS)
    expect(ops).toEqual(['select', 'delete', 'insert']) // stale row removed, fresh run created
    expect(run.id).toBe('run-new')
  })

  it('a FAILED week is cleared and re-run', async () => {
    const { admin, ops } = fakeAdmin({ existing: { id: 'r1', status: 'failed', last_step_at: FRESH } })
    const run = await createOrResumeRun(admin, ARGS)
    expect(ops).toEqual(['select', 'delete', 'insert']) // stale row removed, fresh run created
    expect(run.id).toBe('run-new')
  })

  it('no existing run → plain create', async () => {
    const { admin, ops } = fakeAdmin({ existing: null })
    await createOrResumeRun(admin, ARGS)
    expect(ops).toEqual(['select', 'insert'])
  })

  it('two concurrent retries: the loser of the insert race is still rejected (23505)', async () => {
    const { admin } = fakeAdmin({ existing: null, insertError: { code: '23505', message: 'dup' } })
    await expect(createOrResumeRun(admin, ARGS)).rejects.toBeInstanceOf(CycleAlreadyRanError)
  })

  it('a tripped circuit breaker is NOT auto-retried — the fuse does not reset itself', async () => {
    // Without this branch, the delete-and-retry path below would hand the same runaway a brand
    // new step budget on every cron tick and every manual click, forever.
    const { admin, ops } = fakeAdmin({
      existing: { id: 'r1', status: 'failed', last_step_at: FRESH, failure_reason: STEP_LIMIT_EXCEEDED },
    })
    await expect(createOrResumeRun(admin, ARGS)).rejects.toBeInstanceOf(StepLimitOpenError)
    expect(ops).toEqual(['select']) // nothing deleted, nothing inserted, no fresh budget
  })

  it('a resumed running run keeps its step count — bouncing the chain cannot defeat the fuse', async () => {
    const { admin } = fakeAdmin({ existing: { id: 'r1', status: 'running', last_step_at: FRESH, step_count: 9 } })
    const run = await createOrResumeRun(admin, ARGS)
    expect(run.id).toBe('r1')
    expect(run.stepCount).toBe(9)
  })

  it('a run row missing step_count coerces to 0, never NaN (deploy-order safety)', async () => {
    const { admin } = fakeAdmin({ existing: null })
    const run = await createOrResumeRun(admin, ARGS)
    expect(run.stepCount).toBe(0)
    expect(run.failureReason).toBeNull()
  })

  it('a read failure is surfaced, never swallowed', async () => {
    const broken = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: null, error: { message: 'db down' } }) }),
          }),
        }),
      }),
    } as unknown as SupabaseClient
    await expect(createOrResumeRun(broken, ARGS)).rejects.toBeInstanceOf(RunError)
  })
})
