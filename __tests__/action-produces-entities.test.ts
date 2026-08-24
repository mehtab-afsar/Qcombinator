/**
 * `ActionDef.produces` — an Action's structured output becomes real records
 * (docs/AGI_ACTIONS_PRD.md, spine slice 1).
 *
 * Kept out of action-gate.test.ts deliberately: that file guards ONE property (nothing
 * irreversible executes without approval) and should stay about that. This file guards the new
 * one, in the same mocking style.
 *
 * The properties that matter:
 *  - an Action declaring `produces` writes rows and records how many
 *  - an Action NOT declaring it writes nothing — the ~60 unchanged Actions stay unchanged
 *  - a malformed block does NOT fail the Action (it would fail the whole Program stage), but the
 *    count still surfaces, so "0 leads" is visible rather than silent
 *  - writing an entity never touches the irreversible path
 */

jest.mock('@/lib/llm/router', () => ({ routedCall: jest.fn() }))
jest.mock('@/lib/actions/log', () => {
  const actual = jest.requireActual('@/lib/actions/log')
  return { ...actual, recordAttempt: jest.fn() }
})
jest.mock('@/lib/entities/leads', () => {
  const actual = jest.requireActual('@/lib/entities/leads')
  return { ...actual, upsertLeads: jest.fn() }
})
jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import type { SupabaseClient } from '@supabase/supabase-js'
import { generateAction } from '@/lib/actions/generate'
import { recordAttempt } from '@/lib/actions/log'
import { upsertLeads } from '@/lib/entities/leads'
import { routedCall } from '@/lib/llm/router'
import { getAction } from '@/lib/registry'

const admin = {} as unknown as SupabaseClient
const m = (fn: unknown) => fn as jest.Mock

const program = {
  id: 'prog1', contractId: 'c1', templateId: 'P005' as const, owner: 'growth',
  objective: 'o', successMetric: 's', status: 'active' as const,
}
const args = (actionId: string) => ({
  founderId: 'f1', program, actionId: actionId as never, executionId: 'run-1',
  activePrograms: ['P005' as const],
  context: { strategy: 'Mid-market procurement teams in EMEA.' },
})

const reply = (text: string) => ({ text, toolCall: null, stopReason: 'end_turn' })

const LEADS_REPLY = reply(
  'Ranked three accounts.\n\n```json\n' +
  '{"leads":[{"company":"Acme Corp","title":"VP Engineering","score":88,"rationale":"Strong fit."},' +
  '{"company":"Globex","title":"CTO","score":71,"rationale":"Weaker signal."}]}\n```',
)

beforeEach(() => {
  jest.clearAllMocks()
  m(recordAttempt).mockImplementation(async (_a: unknown, a: Record<string, unknown>) => ({ id: 'log1', ...a }))
  m(upsertLeads).mockResolvedValue(2)
})

describe('the Registry declares which Actions produce records', () => {
  it('score_and_prioritize_leads produces leads, and is still reversible', () => {
    // Writing an internal, founder-owned row is not a Connector side effect — nothing leaves the
    // building, so ADR-004's boundary does not apply and this must NOT be irreversible.
    const action = getAction('score_and_prioritize_leads')
    expect(action.produces).toBe('lead')
    expect(action.irreversible).toBe(false)
    expect(action.connector).toBeUndefined()
  })

  it('it is the only Action that produces anything, for now', () => {
    // A second producer is a deliberate decision, not something that drifts in.
    const producers = ['find_target_companies', 'find_decision_makers', 'research_account',
      'monitor_and_classify_responses', 'follow_up_prospects', 'qualify_leads', 'update_crm',
      'validate_icps', 'prioritize_features']
      .filter(id => getAction(id).produces !== undefined)
    expect(producers).toEqual([])
  })
})

describe('an Action that declares produces:lead writes real rows', () => {
  it('parses the block, writes the leads, and stamps provenance', async () => {
    m(routedCall).mockResolvedValue(LEADS_REPLY)

    await generateAction(admin, args('score_and_prioritize_leads'))

    expect(upsertLeads).toHaveBeenCalledTimes(1)
    const [, founderId, leads, provenance] = m(upsertLeads).mock.calls[0]
    expect(founderId).toBe('f1')
    expect(leads).toHaveLength(2)
    expect(leads[0]).toMatchObject({ company: 'Acme Corp', title: 'VP Engineering', score: 88 })
    expect(provenance).toEqual({ programId: 'prog1', executionId: 'run-1' })
  })

  it('records how many rows landed, so the founder can see it', async () => {
    m(routedCall).mockResolvedValue(LEADS_REPLY)

    await generateAction(admin, args('score_and_prioritize_leads'))

    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.status).toBe('executed')
    expect(recorded.result.entitiesWritten).toBe(2)
    // The prose analysis is still recorded — records are additive, they don't replace the read.
    expect(recorded.result.summary).toBeTruthy()
  })

  it('a malformed block does NOT fail the Action, and reports 0', async () => {
    // Failing here would fail the entire Program stage (lib/rhythm/run.ts) for an analysis that
    // genuinely succeeded. It must degrade, visibly.
    m(routedCall).mockResolvedValue(reply('Ranked.\n\n```json\n{"leads":[{"title":"CTO"}]}\n```'))
    m(upsertLeads).mockResolvedValue(0)

    await expect(generateAction(admin, args('score_and_prioritize_leads'))).resolves.toBeTruthy()

    expect(m(upsertLeads).mock.calls[0][2]).toEqual([]) // nothing valid survived
    expect(m(recordAttempt).mock.calls[0][1].result.entitiesWritten).toBe(0)
  })

  it('no JSON block at all reports 0 rather than throwing', async () => {
    m(routedCall).mockResolvedValue(reply('I ranked them in prose and forgot the block.'))

    await expect(generateAction(admin, args('score_and_prioritize_leads'))).resolves.toBeTruthy()

    expect(upsertLeads).not.toHaveBeenCalled()
    expect(m(recordAttempt).mock.calls[0][1].result.entitiesWritten).toBe(0)
  })
})

describe('every other Action is untouched', () => {
  it('an Action with no `produces` writes no entities and records no count', async () => {
    m(routedCall).mockResolvedValue(reply('An ordinary analysis, no JSON.'))

    await generateAction(admin, args('qualify_leads'))

    expect(upsertLeads).not.toHaveBeenCalled()
    const recorded = m(recordAttempt).mock.calls[0][1]
    expect(recorded.result.summary).toBeTruthy()
    expect(recorded.result.entitiesWritten).toBeUndefined()
  })

  it('even when it happens to emit a leads-shaped block, it writes nothing', async () => {
    // The Registry decides what produces records — never the model's output shape.
    m(routedCall).mockResolvedValue(LEADS_REPLY)

    await generateAction(admin, args('qualify_leads'))

    expect(upsertLeads).not.toHaveBeenCalled()
    expect(m(recordAttempt).mock.calls[0][1].result.entitiesWritten).toBeUndefined()
  })
})
