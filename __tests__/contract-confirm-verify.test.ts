/**
 * confirmContract's "trust but verify" guard — found live (2026-08-06): a call to
 * confirm_executive_contract returned successfully (no `error` from supabase.rpc) with a row
 * whose status was still 'draft' and zero Programs activated. No exception was raised anywhere,
 * so the founder would have been told their mandate was confirmed when it genuinely wasn't. Root
 * cause wasn't pinned with certainty — RLS policies, the RPC's own atomicity, and
 * MandateHardens's Strict-Mode draft guard were all checked and are correct, and an identical
 * re-invocation succeeded cleanly — but "no error was raised" and "the mutation actually
 * happened" turned out not to be the same guarantee. This tests the defensive fix: never return
 * success without checking the RPC's own returned row actually reflects it.
 */

const contractRow = (over: Record<string, unknown> = {}) => ({
  id: 'c1', founder_id: 'f1', strategy_id: 's1', epoch: 1, version: 1, is_current: true,
  status: 'draft', priorities: ['Win 10 design partners'], success_metrics: ['£40k MRR'],
  responsibilities: [{ executive: 'growth', mandate: 'GTM' }], active_programs: ['P001'],
  previous_contract_id: null, confirmed_at: null, created_at: '2026-08-06T00:00:00Z',
  contract_document: null, ...over,
})

const programRow = (over: Record<string, unknown> = {}) => ({
  id: 'p1', contract_id: 'c1', template_id: 'P001', owner: 'growth',
  objective: 'GTM', success_metric: 'Revenue', status: 'active', ...over,
})

interface Builder {
  select: (...args: unknown[]) => Builder
  eq: (...args: unknown[]) => Builder
  maybeSingle: () => Promise<{ data: unknown; error: { message: string } | null }>
  then: (resolve: (v: { data: unknown; error: { message: string } | null }) => void) => void
}

/**
 * @param rpcResult what supabase.rpc('confirm_executive_contract', ...) resolves to.
 * @param programsAfterConfirm what a subsequent `.from('programs')` read returns — the SEPARATE
 *   read confirmContract does after the RPC, exactly like the live bug: the RPC can claim
 *   success while this read (or the RPC's own returned row) tells a different, truer story.
 */
function mockClient(
  currentContractRow: unknown,
  rpcResult: { data: unknown; error: { message: string } | null },
  programsAfterConfirm: unknown[],
) {
  const rpc = jest.fn(() => Promise.resolve(rpcResult))
  const from = jest.fn((table: string) => {
    const builder = {} as Builder
    builder.select = jest.fn(() => builder)
    builder.eq = jest.fn(() => builder)
    builder.maybeSingle = jest.fn(() => Promise.resolve({ data: currentContractRow, error: null }))
    // getProgramsForContract awaits the builder directly (no .maybeSingle()) — make it thenable.
    builder.then = (resolve) => resolve({
      data: table === 'programs' ? programsAfterConfirm : [],
      error: null,
    })
    return builder
  })
  return { from, rpc }
}

import { confirmContract, ContractError } from '@/lib/mandate/contract'

describe('confirmContract — verifies the RPC actually confirmed, not just that it didn\'t error', () => {
  it('succeeds normally when the RPC genuinely confirms and activates a Program', async () => {
    const client = mockClient(
      contractRow(),
      { data: contractRow({ status: 'confirmed', confirmed_at: '2026-08-06T01:00:00Z' }), error: null },
      [programRow()],
    )
    const result = await confirmContract(client as never, 'f1', 'c1')
    expect(result.contract.status).toBe('confirmed')
    expect(result.programs).toHaveLength(1)
  })

  it('throws instead of a false success when the RPC reports no error but the returned row is still draft', async () => {
    // The exact live bug: rpc() resolved with { error: null } and a row whose status never
    // actually flipped.
    const client = mockClient(
      contractRow(),
      { data: contractRow({ status: 'draft' }), error: null },
      [],
    )
    await expect(confirmContract(client as never, 'f1', 'c1')).rejects.toThrow(ContractError)
    await expect(confirmContract(client as never, 'f1', 'c1')).rejects.toThrow(/still a draft/)
  })

  it('throws instead of a false success when confirmed but somehow zero Programs activated', async () => {
    // The atomic guarantee this function's own docstring promises, verified independently: a
    // confirmed contract with nothing to run would bill the founder's trust silently forever.
    const client = mockClient(
      contractRow(),
      { data: contractRow({ status: 'confirmed', confirmed_at: '2026-08-06T01:00:00Z' }), error: null },
      [], // no programs row, despite a "successful" confirm
    )
    await expect(confirmContract(client as never, 'f1', 'c1')).rejects.toThrow(ContractError)
    await expect(confirmContract(client as never, 'f1', 'c1')).rejects.toThrow(/no team was activated/)
  })

  it('still propagates a genuine RPC error as before (unchanged behavior)', async () => {
    const client = mockClient(
      contractRow(),
      { data: null, error: { message: 'connection reset' } },
      [],
    )
    await expect(confirmContract(client as never, 'f1', 'c1')).rejects.toThrow(ContractError)
  })
})
