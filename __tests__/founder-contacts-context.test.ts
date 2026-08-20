/**
 * `founderContactsContextFor` (lib/rhythm/run.ts) — the narrow gate that decides which Actions
 * actually see the founder's real contact list. Deliberately NOT part of `baseContext`: it must
 * populate for the two Gmail-send Actions and stay empty for literally everything else (every
 * Asset, every Briefing, every other Action, including the Slack one) — that narrowness is the
 * whole point of the design (see the field's own doc comment in lib/prompts/types.ts).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const mockGetFounderContactsContext = jest.fn()
jest.mock('@/lib/contacts/context', () => ({
  getFounderContactsContext: (...args: unknown[]) => mockGetFounderContactsContext(...args),
}))

import { founderContactsContextFor } from '@/lib/rhythm/run'

const admin = {} as unknown as SupabaseClient

beforeEach(() => {
  jest.clearAllMocks()
})

describe('founderContactsContextFor — the gate', () => {
  it('populates for generate_personalized_outreach (P005, gmail)', async () => {
    mockGetFounderContactsContext.mockResolvedValue('Jane Doe <jane@acme.com>')
    const result = await founderContactsContextFor(admin, 'f1', 'generate_personalized_outreach')
    expect(result).toEqual({ founderContacts: 'Jane Doe <jane@acme.com>' })
    expect(mockGetFounderContactsContext).toHaveBeenCalledWith(admin, 'f1')
  })

  it('populates for interview_customers (P001, gmail) — the second real-send Action', async () => {
    mockGetFounderContactsContext.mockResolvedValue('Jane Doe <jane@acme.com>')
    const result = await founderContactsContextFor(admin, 'f1', 'interview_customers')
    expect(result).toEqual({ founderContacts: 'Jane Doe <jane@acme.com>' })
  })

  it('is a no-op for post_team_update — irreversible + connector, but Slack, not Gmail', async () => {
    const result = await founderContactsContextFor(admin, 'f1', 'post_team_update')
    expect(result).toEqual({})
    expect(mockGetFounderContactsContext).not.toHaveBeenCalled()
  })

  it('is a no-op for an ordinary internal Action', async () => {
    const result = await founderContactsContextFor(admin, 'f1', 'validate_icps')
    expect(result).toEqual({})
    expect(mockGetFounderContactsContext).not.toHaveBeenCalled()
  })

  it('is a no-op when the founder has no contacts yet', async () => {
    mockGetFounderContactsContext.mockResolvedValue(null)
    const result = await founderContactsContextFor(admin, 'f1', 'generate_personalized_outreach')
    expect(result).toEqual({})
  })

  it('fails soft — a fetch error never breaks the Action, just omits the field', async () => {
    mockGetFounderContactsContext.mockRejectedValue(new Error('db unreachable'))
    const result = await founderContactsContextFor(admin, 'f1', 'generate_personalized_outreach')
    expect(result).toEqual({})
  })
})
