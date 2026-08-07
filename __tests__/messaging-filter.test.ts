import { filterBySearch } from '@/features/messaging/lib/filter'
import type { ConversationSummary } from '@/features/messaging/types'

const items: ConversationSummary[] = [
  { id: '1', displayName: 'Aurora Metrics', subtitle: 'Acme Ventures', status: 'accepted', createdAt: '2026-01-01' },
  { id: '2', displayName: 'Nimbus Health', subtitle: 'Blue Horizon Capital', status: 'pending', createdAt: '2026-01-02' },
  { id: '3', displayName: 'Vantage Robotics', subtitle: undefined, status: 'accepted', createdAt: '2026-01-03' },
]

describe('filterBySearch', () => {
  it('returns every item when the query is empty', () => {
    expect(filterBySearch(items, '')).toHaveLength(3)
  })

  it('returns every item when the query is only whitespace', () => {
    expect(filterBySearch(items, '   ')).toHaveLength(3)
  })

  it('matches on displayName, case-insensitively', () => {
    const result = filterBySearch(items, 'aurora')
    expect(result.map(i => i.id)).toEqual(['1'])
  })

  it('matches on subtitle', () => {
    const result = filterBySearch(items, 'Blue Horizon')
    expect(result.map(i => i.id)).toEqual(['2'])
  })

  it('returns no items when nothing matches', () => {
    expect(filterBySearch(items, 'nonexistent')).toHaveLength(0)
  })

  it('handles an undefined subtitle without throwing', () => {
    const result = filterBySearch(items, 'vantage')
    expect(result.map(i => i.id)).toEqual(['3'])
  })
})
