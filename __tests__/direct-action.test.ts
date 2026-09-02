/**
 * `directActionRun` — the founder's click, and the one thing it must never be able to do.
 *
 * The notice-and-ask loop needs a path that runs a single Action outside any cycle. That path
 * bypasses the Operating Rhythm, and the Rhythm is where ADR-004's approval boundary lives — so
 * the safety story cannot be "nothing irreversible happens to be reachable from here". It has to
 * be enforced. These tests are that enforcement, checked from two directions:
 *
 *  - **at runtime**, by asking every irreversible Action in the Registry to run and expecting a
 *    refusal (so a new sending Action inherits the refusal the day it is added), and
 *  - **structurally**, by proving the refusal happens before the mandate is even read — nothing
 *    about the founder's state can order it differently.
 *
 * `lib/rhythm/direct.ts` (the Asset sibling) earns the same guarantee for free, because it has no
 * path into `lib/actions` at all. This file earns it the hard way, because it does.
 */

jest.mock('@/lib/mandate/contract', () => ({
  getCurrentContract: jest.fn(),
  getProgramsForContract: jest.fn(),
}))
jest.mock('@/lib/rhythm/context', () => ({ buildContext: jest.fn() }))
jest.mock('@/lib/rhythm/action-context', () => ({
  founderContactsContextFor: jest.fn(),
  leadsContextFor: jest.fn(),
  pulledDataContextFor: jest.fn(),
  outreachRepliesContextFor: jest.fn(),
}))
jest.mock('@/lib/actions/generate', () => ({ generateAction: jest.fn() }))
jest.mock('@/lib/actions/log', () => {
  const actual = jest.requireActual('@/lib/actions/log')
  return { ...actual, findByDedupeKey: jest.fn() }
})

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { directActionRun, DirectActionError } from '@/lib/actions/direct'
import { getCurrentContract, getProgramsForContract } from '@/lib/mandate/contract'
import { buildContext } from '@/lib/rhythm/context'
import {
  founderContactsContextFor,
  leadsContextFor,
  pulledDataContextFor,
  outreachRepliesContextFor,
} from '@/lib/rhythm/action-context'
import { generateAction } from '@/lib/actions/generate'
import { findByDedupeKey, AlreadyExecutedError } from '@/lib/actions/log'
import { getAction, listPrograms, type ActionId } from '@/lib/registry'

const m = (fn: unknown) => fn as jest.Mock

/** A client that fails loudly if touched — so "nothing was queried" is provable, not assumed. */
const forbiddenAdmin = new Proxy({}, {
  get() { throw new Error('directActionRun touched the database') },
}) as unknown as SupabaseClient

const admin = {} as unknown as SupabaseClient

const CONTRACT = {
  id: 'c1', founderId: 'f1', version: 1, status: 'confirmed' as const,
  activePrograms: ['P005'] as never[],
}
const PROGRAM = {
  id: 'prog1', contractId: 'c1', templateId: 'P005', owner: 'growth',
  objective: 'o', successMetric: 's', status: 'active' as const,
}

// Every Action the Registry declares, reached through the Programs that own them.
const ALL_ACTION_IDS: ActionId[] = [...new Set(listPrograms().flatMap(p => p.actions))]
const IRREVERSIBLE = ALL_ACTION_IDS.filter(id => getAction(id).irreversible)

beforeEach(() => {
  jest.clearAllMocks()
  m(getCurrentContract).mockResolvedValue(CONTRACT)
  m(getProgramsForContract).mockResolvedValue([PROGRAM])
  m(buildContext).mockResolvedValue({ strategy: 'Mid-market procurement teams in EMEA.' })
  m(founderContactsContextFor).mockResolvedValue({})
  m(leadsContextFor).mockResolvedValue({})
  m(pulledDataContextFor).mockResolvedValue({})
  m(outreachRepliesContextFor).mockResolvedValue({ outreachReplies: 'acme.com replied' })
  m(generateAction).mockResolvedValue({ id: 'log1', status: 'completed' })
  m(findByDedupeKey).mockResolvedValue(null)
})

describe('⚠️ nothing reached from here can send, spend or publish', () => {
  it('the Registry actually has irreversible Actions to refuse', () => {
    // Guards the guard: if this list were ever empty the sweep below would pass vacuously.
    expect(IRREVERSIBLE.length).toBeGreaterThan(0)
    expect(IRREVERSIBLE).toContain('generate_personalized_outreach')
  })

  it.each(IRREVERSIBLE)('refuses %s, and never reaches the model', async actionId => {
    await expect(directActionRun(admin, { founderId: 'f1', actionId }))
      .rejects.toMatchObject({ name: 'DirectActionError', code: 'not_directable' })

    expect(generateAction).not.toHaveBeenCalled()
  })

  it('refuses before it reads anything at all — the check cannot be reordered by state', async () => {
    // The client throws on any property access. Reaching the refusal with it proves the decision
    // is made from the Registry alone: no contract, no programs, no context, no model call.
    await expect(
      directActionRun(forbiddenAdmin, { founderId: 'f1', actionId: 'generate_personalized_outreach' }),
    ).rejects.toBeInstanceOf(DirectActionError)

    expect(getCurrentContract).not.toHaveBeenCalled()
  })

  it('says why in words a founder can act on, without naming ADR-004', async () => {
    const err = await directActionRun(admin, {
      founderId: 'f1', actionId: 'generate_personalized_outreach',
    }).catch((e: DirectActionError) => e)

    expect((err as DirectActionError).message).toMatch(/approval/i)
    expect((err as DirectActionError).message).not.toMatch(/ADR|irreversible/i)
  })

  it('the refusal is the first statement in the function, above every lookup', () => {
    // The runtime tests above cover today's Registry; this covers tomorrow's edit. Moving the
    // check below the contract read would still pass every test above on the happy path.
    const src = readFileSync(join(__dirname, '..', 'lib/actions/direct.ts'), 'utf8')
    const body = src.slice(src.indexOf('export async function directActionRun'))

    expect(body.indexOf('irreversible')).toBeLessThan(body.indexOf('getCurrentContract'))
  })
})

describe('it re-derives scope from the contract, never from the caller', () => {
  it('refuses when there is no mandate at all', async () => {
    m(getCurrentContract).mockResolvedValue(null)
    await expect(directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' }))
      .rejects.toMatchObject({ code: 'no_mandate' })
  })

  it('refuses a draft mandate — an unconfirmed contract is not an operating one', async () => {
    m(getCurrentContract).mockResolvedValue({ ...CONTRACT, status: 'draft' })
    await expect(directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' }))
      .rejects.toMatchObject({ code: 'no_mandate' })
  })

  it('refuses an Action whose Program the founder did not activate', async () => {
    m(getCurrentContract).mockResolvedValue({ ...CONTRACT, activePrograms: ['P001'] })
    await expect(directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' }))
      .rejects.toMatchObject({ code: 'not_in_mandate' })
    expect(generateAction).not.toHaveBeenCalled()
  })

  it('refuses when the owning Program exists but is paused', async () => {
    m(getProgramsForContract).mockResolvedValue([{ ...PROGRAM, status: 'paused' }])
    await expect(directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' }))
      .rejects.toMatchObject({ code: 'program_inactive' })
  })
})

describe('a permitted Action runs like a cycle step, minus the cycle', () => {
  it('generates with executionId null — an ad-hoc run belongs to no run row', async () => {
    await directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' })

    const [, args] = m(generateAction).mock.calls[0]
    expect(args.executionId).toBeNull()
    expect(args.founderId).toBe('f1')
    expect(args.program).toBe(PROGRAM)
  })

  it('carries the dedupeKey through, because execution_id cannot dedupe a null', async () => {
    await directActionRun(admin, {
      founderId: 'f1', actionId: 'follow_up_prospects', dedupeKey: 'replies:2026-09-03',
    })
    expect(m(generateAction).mock.calls[0][1].dedupeKey).toBe('replies:2026-09-03')
  })

  it('sees the same narrow context a cycle step would, replies included', async () => {
    await directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' })

    const { context } = m(generateAction).mock.calls[0][1]
    expect(context.strategy).toContain('EMEA')
    expect(context.outreachReplies).toBe('acme.com replied')
  })

  it('a failing injector degrades the context, it does not fail the run', async () => {
    // A lookup falling over must not cost the founder their click.
    m(outreachRepliesContextFor).mockRejectedValue(new Error('db down'))

    await directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' })

    expect(generateAction).toHaveBeenCalledTimes(1)
    expect(m(generateAction).mock.calls[0][1].context.outreachReplies).toBeUndefined()
  })
})

describe('a repeat click costs nothing', () => {
  it('⚠️ stops at the indexed read — the second click never reaches the model', async () => {
    // The property worth having, and the one the unique index alone does NOT give: generateAction
    // calls Anthropic before it writes, so without the pre-check a double click is paid for twice
    // and only then collides on the insert.
    m(findByDedupeKey).mockResolvedValue({ id: 'log1', actionId: 'follow_up_prospects' })

    await expect(directActionRun(admin, {
      founderId: 'f1', actionId: 'follow_up_prospects', dedupeKey: 'replies:sig-1',
    })).rejects.toBeInstanceOf(AlreadyExecutedError)

    expect(generateAction).not.toHaveBeenCalled()
  })

  it('scopes the lookup to the founder as well as the key', async () => {
    await directActionRun(admin, {
      founderId: 'f1', actionId: 'follow_up_prospects', dedupeKey: 'replies:sig-1',
    })
    expect(findByDedupeKey).toHaveBeenCalledWith(admin, 'f1', 'replies:sig-1')
  })

  it('does not read at all when no key was supplied — nothing to dedupe on', async () => {
    await directActionRun(admin, { founderId: 'f1', actionId: 'follow_up_prospects' })
    expect(findByDedupeKey).not.toHaveBeenCalled()
    expect(generateAction).toHaveBeenCalledTimes(1)
  })

  it('checks before it reads the mandate — the cheapest exit comes first', async () => {
    m(findByDedupeKey).mockResolvedValue({ id: 'log1' })

    await directActionRun(admin, {
      founderId: 'f1', actionId: 'follow_up_prospects', dedupeKey: 'replies:sig-1',
    }).catch(() => {})

    expect(getCurrentContract).not.toHaveBeenCalled()
  })
})
