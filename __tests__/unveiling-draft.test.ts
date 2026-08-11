// This repo's jest config runs testEnvironment: 'node' (no jsdom anywhere) — a minimal in-memory
// Storage stand-in, not a new devDependency for 5 tests of a thin wrapper.
class MemoryStorage {
  private store = new Map<string, string>()
  getItem(k: string): string | null { return this.store.has(k) ? this.store.get(k)! : null }
  setItem(k: string, v: string): void { this.store.set(k, v) }
  removeItem(k: string): void { this.store.delete(k) }
}
;(global as unknown as { sessionStorage: MemoryStorage }).sessionStorage = new MemoryStorage()

import { loadUnveilingDraft, saveUnveilingDraft, clearUnveilingDraft } from '@/features/executive/lib/unveiling-draft'

const candidate = { read: 'the read', mission: 'm', priorities: ['p1'], goals: ['g1'], document: 'doc' }

describe('unveiling-draft (sessionStorage)', () => {
  beforeEach(() => clearUnveilingDraft())

  it('null when nothing has been saved', () => {
    expect(loadUnveilingDraft()).toBeNull()
  })

  it('round-trips a saved candidate', () => {
    saveUnveilingDraft(candidate)
    expect(loadUnveilingDraft()).toEqual(candidate)
  })

  it('clear actually removes it', () => {
    saveUnveilingDraft(candidate)
    clearUnveilingDraft()
    expect(loadUnveilingDraft()).toBeNull()
  })

  it('a corrupted/non-JSON stored value degrades to null rather than throwing', () => {
    sessionStorage.setItem('unveiling-draft', 'not json{{{')
    expect(loadUnveilingDraft()).toBeNull()
  })

  it('a save with no candidate field degrades to null', () => {
    sessionStorage.setItem('unveiling-draft', JSON.stringify({}))
    expect(loadUnveilingDraft()).toBeNull()
  })
})
