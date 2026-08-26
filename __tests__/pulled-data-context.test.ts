/**
 * `pulledDataContextFor` (lib/rhythm/run.ts) — the narrow gate for a founder-triggered Connector
 * pull. Unlike `founderContactsContextFor`/`leadsContextFor`, there's no Registry-derived
 * allowlist: the cache is already scoped to one row per (founder, action), so this is a no-op for
 * literally every Action nobody has ever pulled data in for — same result, simpler gate.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const mockGetPulledDataContext = jest.fn()
jest.mock('@/lib/actions/pulled-data', () => ({
  ...jest.requireActual('@/lib/actions/pulled-data'),
  getPulledDataContext: (...args: unknown[]) => mockGetPulledDataContext(...args),
}))

import { pulledDataContextFor } from '@/lib/rhythm/run'

const admin = {} as unknown as SupabaseClient

beforeEach(() => {
  jest.clearAllMocks()
})

describe('pulledDataContextFor — the gate', () => {
  it('populates when the founder has pulled real data in for this Action', async () => {
    mockGetPulledDataContext.mockResolvedValue('Pulled at your request...\n\nNo matching threads found.')
    const result = await pulledDataContextFor(admin, 'f1', 'monitor_and_classify_responses')
    expect(result).toEqual({ pulledData: 'Pulled at your request...\n\nNo matching threads found.' })
    expect(mockGetPulledDataContext).toHaveBeenCalledWith(admin, 'f1', 'monitor_and_classify_responses')
  })

  it('is a no-op when nothing has ever been pulled for this Action', async () => {
    mockGetPulledDataContext.mockResolvedValue(null)
    const result = await pulledDataContextFor(admin, 'f1', 'monitor_lead_generation')
    expect(result).toEqual({})
  })

  it('is a no-op for an Action that never accepts a pull at all', async () => {
    mockGetPulledDataContext.mockResolvedValue(null)
    const result = await pulledDataContextFor(admin, 'f1', 'validate_icps')
    expect(result).toEqual({})
  })

  it('fails soft — a fetch error never breaks the Action, just omits the field', async () => {
    mockGetPulledDataContext.mockRejectedValue(new Error('db unreachable'))
    const result = await pulledDataContextFor(admin, 'f1', 'monitor_and_classify_responses')
    expect(result).toEqual({})
  })
})
