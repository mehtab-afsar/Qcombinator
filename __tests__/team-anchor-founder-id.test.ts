/**
 * Team Management, Phase 2 — getAnchorFounderId().
 *
 * Every product table (executive_contracts, asset_versions, operating_rhythm_runs,
 * action_log, qscore_history, executive_briefings) anchors its rows to the STARTUP
 * OWNER's founder_id, never to whichever teammate happens to be logged in. Widening
 * those tables' RLS (20260811000002) makes the rows readable across the team, but a
 * caller still has to ask for the right id — a teammate's own founder_id slot on
 * those tables is empty, so querying with their own auth.user.id finds nothing.
 *
 * getAnchorFounderId resolves that id: founder_profiles.startup_id -> startups.owner_user_id.
 */

import { getAnchorFounderId } from '@/lib/team/founder-permissions'

function mockSupabase(responses: {
  founderProfile?: { startup_id: string | null } | null
  startup?: { owner_user_id: string | null } | null
}) {
  return {
    from: jest.fn((table: string) => {
      if (table === 'founder_profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: responses.founderProfile ?? null }),
            }),
          }),
        }
      }
      if (table === 'startups') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: responses.startup ?? null }),
            }),
          }),
        }
      }
      throw new Error(`unexpected table in test: ${table}`)
    }),
  }
}

describe('getAnchorFounderId', () => {
  it('resolves to the startup owner, not the caller — the whole point of this function', async () => {
    const client = mockSupabase({
      founderProfile: { startup_id: 'startup-1' },
      startup: { owner_user_id: 'owner-user-id' },
    })
    const result = await getAnchorFounderId('teammate-user-id', client as never)
    expect(result).toBe('owner-user-id')
  })

  it('returns null for a user with no startup yet, not a throw', async () => {
    const client = mockSupabase({ founderProfile: { startup_id: null } })
    const result = await getAnchorFounderId('pre-onboarding-user', client as never)
    expect(result).toBeNull()
  })

  it('returns null for a user with no founder_profiles row at all', async () => {
    const client = mockSupabase({ founderProfile: null })
    const result = await getAnchorFounderId('unknown-user', client as never)
    expect(result).toBeNull()
  })

  it('returns null rather than throwing if the startup row is missing owner_user_id', async () => {
    const client = mockSupabase({
      founderProfile: { startup_id: 'startup-1' },
      startup: { owner_user_id: null },
    })
    const result = await getAnchorFounderId('teammate-user-id', client as never)
    expect(result).toBeNull()
  })

  it('the owner querying their own data resolves to their own id (identity case)', async () => {
    const client = mockSupabase({
      founderProfile: { startup_id: 'startup-1' },
      startup: { owner_user_id: 'owner-user-id' },
    })
    const result = await getAnchorFounderId('owner-user-id', client as never)
    expect(result).toBe('owner-user-id')
  })
})
