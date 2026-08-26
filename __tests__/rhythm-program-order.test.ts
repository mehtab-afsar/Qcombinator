/**
 * `orderPrograms` — the fix for an ordering that was only ever correct by luck.
 *
 * getProgramsForContract (lib/mandate/contract.ts) issues a bare SELECT with no ORDER BY, and
 * Postgres guarantees nothing about the order of such a result: it can shift with a plan change,
 * a vacuum, or an updated row. The engine walks that result to decide which Program to work
 * next; lib/rhythm/progress.ts walks `contract.activePrograms` to decide which step to show as
 * running. Two orders, one of them non-deterministic — and when they disagree the founder is
 * shown the wrong step as active, which (before the ownership fix) meant another executive's
 * live document text rendering under their own document's name.
 */

import { orderPrograms } from '@/lib/rhythm/context'
import type { ProgramInstance } from '@/lib/mandate/contract'

const program = (templateId: string): ProgramInstance => ({
  id: `uuid-${templateId}`,
  contractId: 'c1',
  templateId: templateId as ProgramInstance['templateId'],
  owner: 'growth',
  objective: 'o',
  successMetric: 'm',
  status: 'active',
})

const ids = (rows: ProgramInstance[]) => rows.map(r => r.templateId)

describe('orderPrograms — activePrograms is the one authority', () => {
  it('reorders rows that came back from Postgres in any order', () => {
    const rows = [program('P003'), program('P001'), program('P002')]
    expect(ids(orderPrograms(rows, ['P001', 'P002', 'P003']))).toEqual(['P001', 'P002', 'P003'])
  })

  it('exactly reverses when the contract says so — it follows the contract, not the Registry', () => {
    const rows = [program('P001'), program('P002')]
    expect(ids(orderPrograms(rows, ['P002', 'P001']))).toEqual(['P002', 'P001'])
  })

  it('a row not named in activePrograms sorts LAST, and is never dropped', () => {
    // Running a Program late is a far smaller failure than silently not running it at all.
    const rows = [program('P009'), program('P001')]
    expect(ids(orderPrograms(rows, ['P001']))).toEqual(['P001', 'P009'])
  })

  it('several unnamed rows all still survive', () => {
    const rows = [program('P008'), program('P009'), program('P001')]
    const out = orderPrograms(rows, ['P001'])
    expect(out).toHaveLength(3)
    expect(out[0].templateId).toBe('P001')
  })

  it('does not mutate the caller\'s array', () => {
    const rows = [program('P003'), program('P001')]
    orderPrograms(rows, ['P001', 'P003'])
    expect(ids(rows)).toEqual(['P003', 'P001'])
  })

  it('empty inputs, and an activePrograms naming things that are not there', () => {
    expect(orderPrograms([], ['P001'])).toEqual([])
    expect(ids(orderPrograms([program('P001')], []))).toEqual(['P001'])
    expect(ids(orderPrograms([program('P001')], ['P002', 'P001']))).toEqual(['P001'])
  })

  it('duplicate templateIds do not crash', () => {
    expect(orderPrograms([program('P001'), program('P001')], ['P001'])).toHaveLength(2)
  })
})
