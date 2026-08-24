/**
 * AI SDR Milestone 1 — real action-to-action chaining. `dependencyContextFor` (lib/rhythm/run.ts)
 * is the whole mechanism: look up a dependency's own result within this execution and thread it
 * into the next Action's CompanyContext, or no-op for the vast majority of Actions that don't
 * declare `ActionDef.dependsOn` at all.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'

const mockLatestPerAction = jest.fn()
jest.mock('@/lib/actions/log', () => ({
  ...jest.requireActual('@/lib/actions/log'),
  latestPerAction: (...args: unknown[]) => mockLatestPerAction(...args),
}))

import { dependencyContextFor, leadsContextFor } from '@/lib/rhythm/run'

const admin = {} as unknown as SupabaseClient

const entry = (over: Record<string, unknown> = {}) => ({
  id: 'e1', founderId: 'f1', executionId: 'run1', actionId: 'find_target_companies',
  provider: null, irreversible: false, status: 'executed', payloadHash: null,
  request: {}, result: { kind: 'internal_analysis', completed: true, summary: 'Acme, Globex' },
  approvedBy: null, approvedAt: null, createdAt: 'x', ...over,
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('dependencyContextFor', () => {
  it('is a no-op for an Action with no dependsOn — the overwhelming majority', async () => {
    // validate_icps (P001) declares no dependsOn.
    const result = await dependencyContextFor(admin, 'f1', 'run1', 'validate_icps')
    expect(result).toEqual({})
    expect(mockLatestPerAction).not.toHaveBeenCalled()
  })

  it('threads the dependency\'s result.summary through, labeled with its own name', async () => {
    mockLatestPerAction.mockResolvedValue([entry()])
    const result = await dependencyContextFor(admin, 'f1', 'run1', 'find_decision_makers')
    expect(result).toEqual({
      dependencyResult: {
        actionId: 'find_target_companies',
        label: 'Find Target Companies',
        text: 'Acme, Globex',
      },
    })
  })

  it('is a no-op when the dependency has not run yet this execution', async () => {
    mockLatestPerAction.mockResolvedValue([]) // nothing recorded for this run yet
    const result = await dependencyContextFor(admin, 'f1', 'run1', 'find_decision_makers')
    expect(result).toEqual({})
  })

  it('is a no-op when the dependency ran but has no result yet (irreversible, pending_approval)', async () => {
    // Milestone 1 is scoped to fully-autonomous chains — an irreversible dependency's result
    // isn't set until a human approves and it executes (Milestone 2's concern).
    mockLatestPerAction.mockResolvedValue([entry({ status: 'pending_approval', result: null })])
    const result = await dependencyContextFor(admin, 'f1', 'run1', 'find_decision_makers')
    expect(result).toEqual({})
  })

  it('is a no-op when result exists but carries no summary field', async () => {
    mockLatestPerAction.mockResolvedValue([entry({ result: { providerId: 'x' } })])
    const result = await dependencyContextFor(admin, 'f1', 'run1', 'find_decision_makers')
    expect(result).toEqual({})
  })
})

// ─── The pipeline gate: which Actions may read the live leads table ───────────

jest.mock('@/lib/entities/leads', () => ({
  ...jest.requireActual('@/lib/entities/leads'),
  getLeadsContext: jest.fn(async () => 'PIPELINE'),
}))

describe('leadsContextFor — the gate', () => {
  it('gives a lead-producing Program\'s Actions the live pipeline', async () => {
    // P005 declares produces:'lead' on score_and_prioritize_leads, so every P005 Action qualifies.
    for (const id of ['qualify_leads', 'follow_up_prospects', 'update_crm', 'find_target_companies']) {
      expect(await leadsContextFor(admin, 'f1', id)).toEqual({ pipelineLeads: 'PIPELINE' })
    }
  })

  it('gives nothing to a Program that produces no leads', async () => {
    // P001 (validate_icps) and P016 (draft_prd) have no lead-producing Action anywhere in them.
    expect(await leadsContextFor(admin, 'f1', 'validate_icps')).toEqual({})
    expect(await leadsContextFor(admin, 'f1', 'draft_prd')).toEqual({})
  })

  it('derives the gate from `produces`, not a hardcoded id list', async () => {
    // The property that keeps this from rotting: the predicate asks the Registry whether this
    // Action's Program declares a lead producer. Delete `produces` from P005 and every P005
    // Action loses pipeline access automatically — no list to remember to update.
    const src = readFileSync(join(__dirname, '..', 'lib/rhythm/run.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function leadsContextFor'))
    expect(fn).toContain("produces === 'lead'")
    expect(fn).not.toContain("'P005'")
  })
})
