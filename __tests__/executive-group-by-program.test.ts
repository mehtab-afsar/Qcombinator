import { groupByProgram, itemsForProgram, UNASSIGNED_PROGRAM } from '@/features/executive/lib/groupByProgram'

interface Item { id: string; programTemplateId: string | null }
const item = (id: string, programTemplateId: string | null): Item => ({ id, programTemplateId })

describe('groupByProgram', () => {
  it('buckets items under their own Program id', () => {
    const groups = groupByProgram([item('a', 'P001'), item('b', 'P002'), item('c', 'P001')])
    expect(groups.get('P001')?.map(i => i.id)).toEqual(['a', 'c'])
    expect(groups.get('P002')?.map(i => i.id)).toEqual(['b'])
  })

  it('buckets a null Program under UNASSIGNED_PROGRAM rather than dropping the item', () => {
    const groups = groupByProgram([item('a', null)])
    expect(groups.get(UNASSIGNED_PROGRAM)?.map(i => i.id)).toEqual(['a'])
  })

  it('returns an empty map for no items', () => {
    expect(groupByProgram([]).size).toBe(0)
  })

  it('preserves within-program order', () => {
    const groups = groupByProgram([item('a', 'P001'), item('b', 'P001'), item('c', 'P001')])
    expect(groups.get('P001')?.map(i => i.id)).toEqual(['a', 'b', 'c'])
  })
})

describe('itemsForProgram', () => {
  it('filters to exactly one Program', () => {
    const items = [item('a', 'P001'), item('b', 'P002'), item('c', 'P001')]
    expect(itemsForProgram(items, 'P001').map(i => i.id)).toEqual(['a', 'c'])
  })

  it('returns [] when nothing matches', () => {
    expect(itemsForProgram([item('a', 'P001')], 'P999')).toEqual([])
  })
})
