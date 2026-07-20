/**
 * F12 — the briefing generator (compose via F06 → LLM → persist), with the LLM and data
 * access mocked. The real compose path (composeBriefingPrompt over P001) runs unmocked.
 *
 * The live LLM call is exercised only when F10 wires it — these prove the orchestration:
 * verdict produced, the no-change short briefing, and a failure that writes nothing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

jest.mock('@/lib/llm/router', () => ({ routedText: jest.fn() }))
jest.mock('@/lib/assets/versioning', () => ({
  getCurrentAsset: jest.fn(),
  getAssetVersionsForExecution: jest.fn(),
}))
jest.mock('@/lib/briefings/briefings', () => ({
  // Echo the args back as the "persisted" briefing so tests can assert what was written.
  persistBriefing: jest.fn(async (_admin, args) => ({ id: 'b1', createdAt: 'now', ...args })),
}))

import { routedText } from '@/lib/llm/router'
import { getCurrentAsset, getAssetVersionsForExecution } from '@/lib/assets/versioning'
import { persistBriefing } from '@/lib/briefings/briefings'
import { generateBriefing, parseBriefing, BriefingGenerationError } from '@/lib/briefings/generate'

const admin = {} as unknown as SupabaseClient
const PROGRAM_ROW = '00000000-0000-0000-0000-0000000000aa' // programs-table UUID
const baseArgs = {
  founderId: 'f1', templateId: 'P001' as const, programRowId: PROGRAM_ROW,
  executionId: 'run-1', contractId: 'c1', context: { companyName: 'Acme' },
}

const mockRouted = routedText as jest.Mock
const mockChanged = getAssetVersionsForExecution as jest.Mock
const mockCurrent = getCurrentAsset as jest.Mock
const mockPersist = persistBriefing as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
  mockCurrent.mockResolvedValue({ id: 'v-cur', assetId: 'AS001', content: '# ICP\nsome content' })
})

describe('F12 parseBriefing', () => {
  const wrap = (json: string) => `Here is the briefing prose.\n\n\`\`\`json\n${json}\n\`\`\``

  it('extracts verdict, summary and sections', () => {
    const p = parseBriefing(wrap('{"verdict":"On track","summary":"Good progress.","sections":[{"heading":"H","detail":"D"}]}'))
    expect(p.verdict).toBe('On track')
    expect(p.summary).toBe('Good progress.')
    expect(p.sections).toEqual([{ heading: 'H', detail: 'D' }])
  })

  it('throws when there is no JSON tail', () => {
    expect(() => parseBriefing('just prose, no block')).toThrow(BriefingGenerationError)
  })

  it('throws when the verdict is missing', () => {
    expect(() => parseBriefing(wrap('{"summary":"x"}'))).toThrow(BriefingGenerationError)
  })
})

describe('F12 generateBriefing', () => {
  it('generates a briefing from changed assets, with DB-sourced asset links', async () => {
    mockChanged.mockResolvedValue([
      { id: 'v-1', assetId: 'AS001' },
      { id: 'v-2', assetId: 'AS002' },
    ])
    mockRouted.mockResolvedValue('prose\n\n```json\n{"verdict":"3 partners engaged","summary":"s","sections":[]}\n```')

    await generateBriefing(admin, baseArgs)

    expect(mockRouted).toHaveBeenCalledTimes(1)
    // The prompt itself must carry the DB's authoritative deliverables list (run-4 lesson:
    // without it, the briefing claimed eight documents that never existed).
    const prompt = String(mockRouted.mock.calls[0][1][0].content)
    expect(prompt).toContain('What this cycle ACTUALLY produced')
    expect(prompt).toContain('- AS001 — ICP Profiles')
    expect(prompt).toContain('- AS002 — Pains & Gains Matrix')
    const written = mockPersist.mock.calls[0][1]
    expect(written.verdict).toBe('3 partners engaged')
    expect(written.executiveId).toBe('growth') // P001 is owned by the growth executive
    // B1 guard: the DB program_id column must get the UUID, never the Registry id.
    expect(written.programId).toBe(PROGRAM_ROW)
    expect(written.programId).not.toBe('P001')
    // Links come from the DB rows, not the model.
    expect(written.body.changedAssets).toEqual([
      { assetId: 'AS001', versionId: 'v-1', name: 'ICP Profiles' },
      { assetId: 'AS002', versionId: 'v-2', name: 'Pains & Gains Matrix' },
    ])
  })

  it('writes a short "no change" briefing without calling the LLM when nothing changed', async () => {
    mockChanged.mockResolvedValue([]) // no asset versions this run

    await generateBriefing(admin, baseArgs)

    expect(mockRouted).not.toHaveBeenCalled() // never silence, never spend
    const written = mockPersist.mock.calls[0][1]
    expect(written.verdict).toBe('No material change this cycle.')
    expect(written.body.changedAssets).toEqual([])
  })

  it('on generation failure writes NO briefing (assets stay intact)', async () => {
    mockChanged.mockResolvedValue([{ id: 'v-1', assetId: 'AS001' }])
    mockRouted.mockRejectedValue(new Error('anthropic down'))

    await expect(generateBriefing(admin, baseArgs)).rejects.toThrow(BriefingGenerationError)
    expect(mockPersist).not.toHaveBeenCalled() // no briefing row; the generator only READ assets
  })
})
