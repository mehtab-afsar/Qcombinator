/**
 * lib/entities/leads.ts — the spine's first entity writer (docs/AGI_ACTIONS_PRD.md, slice 1).
 *
 * Before this module every Action's structured output was discarded; this is the code that turns
 * a model's fenced JSON into real, founder-owned rows. Three properties matter enough to pin:
 *
 *  1. `dedupeKey` is stable and normalising — it is the ONLY thing stopping a weekly cycle from
 *     duplicating every lead it already found last week.
 *  2. A malformed block yields [] and never throws — an Action's analysis genuinely succeeded,
 *     and throwing here would fail the whole Program stage (lib/rhythm/run.ts).
 *  3. A payload that simply isn't a leads payload yields null, not [] — that distinguishes "the
 *     ~60 Actions that don't produce leads" from "an Action that tried and got it wrong."
 *
 * fakeAdmin mirrors __tests__/contacts-context.test.ts's hand-rolled chained-thenable rather than
 * jest.mock'ing Supabase — same convention, same reason.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { dedupeKey, parseModelLeads, upsertLeads } from '@/lib/entities/leads'

jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

type UpsertCall = { rows: Record<string, unknown>[]; options: Record<string, unknown> }

/** Records what upsert was called with, and replays a canned result. */
function fakeAdmin(result: { data?: unknown[]; error?: { message: string } | null }) {
  const calls: UpsertCall[] = []
  const admin = {
    from: () => ({
      upsert: (rows: Record<string, unknown>[], options: Record<string, unknown>) => {
        calls.push({ rows, options })
        return { select: async () => ({ data: result.data ?? null, error: result.error ?? null }) }
      },
    }),
  } as unknown as SupabaseClient
  return { admin, calls }
}

describe('dedupeKey', () => {
  it('normalises case and surrounding whitespace', () => {
    expect(dedupeKey('  Acme Corp ', ' VP of Engineering ')).toBe('acme corp|vp of engineering')
  })

  it('treats a missing title as empty rather than dropping the key', () => {
    expect(dedupeKey('Acme Corp')).toBe('acme corp|')
    expect(dedupeKey('Acme Corp', null)).toBe('acme corp|')
  })

  it('separates company from title so two roles at one company are distinct leads', () => {
    expect(dedupeKey('Acme', 'CTO')).not.toBe(dedupeKey('Acme', 'CEO'))
  })

  it('is stable across the same input — the whole point of an idempotency key', () => {
    expect(dedupeKey('Acme', 'CTO')).toBe(dedupeKey('acme', 'cto'))
  })
})

describe('parseModelLeads', () => {
  it('returns null when the payload is not a leads payload at all', () => {
    // The ordinary case for the ~60 Actions that produce prose, not records.
    expect(parseModelLeads({ body: 'some analysis' })).toBeNull()
    expect(parseModelLeads(null)).toBeNull()
    expect(parseModelLeads('a string')).toBeNull()
  })

  it('parses a well-formed block', () => {
    const leads = parseModelLeads({
      leads: [{ company: 'Acme Corp', title: 'VP Engineering', score: 88, rationale: 'Strong fit.' }],
    })
    expect(leads).toHaveLength(1)
    expect(leads![0]).toEqual({
      company: 'Acme Corp', title: 'VP Engineering', score: 88, rationale: 'Strong fit.',
    })
  })

  it('accepts company alone — a researched lead legitimately has no name or score', () => {
    expect(parseModelLeads({ leads: [{ company: 'Acme' }] })).toEqual([{ company: 'Acme' }])
  })

  it('returns [] rather than throwing when the block is malformed', () => {
    // An Action that DECLARED produces:'lead' and got the shape wrong is a real problem, but a
    // non-fatal one — the analysis still succeeded.
    expect(parseModelLeads({ leads: [{ title: 'CTO' }] })).toEqual([])       // no company
    expect(parseModelLeads({ leads: [{ company: 'A', score: 500 }] })).toEqual([]) // out of range
    expect(parseModelLeads({ leads: 'not an array' })).toEqual([])
  })

  it('accepts an empty list — "I ranked nothing this cycle" is a valid answer', () => {
    expect(parseModelLeads({ leads: [] })).toEqual([])
  })
})

describe('upsertLeads', () => {
  it('writes nothing and calls no client for an empty list', async () => {
    const { admin, calls } = fakeAdmin({ data: [] })
    expect(await upsertLeads(admin, 'f1', [])).toBe(0)
    expect(calls).toHaveLength(0)
  })

  it('maps fields, stamps provenance, and marks the source as AI research', async () => {
    const { admin, calls } = fakeAdmin({ data: [{ id: 'l1' }] })
    await upsertLeads(
      admin, 'f1',
      [{ company: 'Acme', title: 'CTO', score: 90, rationale: 'why' }],
      { programId: 'prog1', executionId: 'run1' },
    )

    expect(calls[0].rows[0]).toMatchObject({
      founder_id: 'f1',
      company: 'Acme',
      title: 'CTO',
      score: 90,
      rationale: 'why',
      source: 'ai_research',
      status: 'researched',
      program_id: 'prog1',
      execution_id: 'run1',
      dedupe_key: 'acme|cto',
    })
  })

  it('never overwrites an existing row — a founder edit must survive a weekly re-run', async () => {
    const { admin, calls } = fakeAdmin({ data: [] })
    await upsertLeads(admin, 'f1', [{ company: 'Acme' }])
    expect(calls[0].options).toEqual({ onConflict: 'founder_id,dedupe_key', ignoreDuplicates: true })
  })

  it('returns the number actually inserted, not the number offered', async () => {
    // Two offered, one already existed — ignoreDuplicates means only the new row comes back.
    const { admin } = fakeAdmin({ data: [{ id: 'l1' }] })
    const written = await upsertLeads(admin, 'f1', [{ company: 'Acme' }, { company: 'Globex' }])
    expect(written).toBe(1)
  })

  it('reports 0 rather than throwing when the write fails', async () => {
    // Failing here would fail the whole Program stage for work that genuinely succeeded.
    const { admin } = fakeAdmin({ error: { message: 'db down' } })
    await expect(upsertLeads(admin, 'f1', [{ company: 'Acme' }])).resolves.toBe(0)
  })

  it('reports 0 rather than throwing when the client itself throws', async () => {
    const admin = { from: () => { throw new Error('boom') } } as unknown as SupabaseClient
    await expect(upsertLeads(admin, 'f1', [{ company: 'Acme' }])).resolves.toBe(0)
  })
})
