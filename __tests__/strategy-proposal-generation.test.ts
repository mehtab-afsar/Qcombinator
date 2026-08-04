/**
 * F07b — generating a Strategy proposal by actually running S001.
 *
 * Mirrors __tests__/mandate-generation.test.ts exactly (same shape as S002's own
 * generation tests) — this is deliberately not a new testing pattern.
 */

// ⚠️ MOCK @/lib/llm/router — NOT @/lib/claude. See mandate-generation.test.ts for why
// this specific mock target matters: routedText(taskClass, messages, opts), messages
// is the SECOND argument.
jest.mock('@/lib/llm/router', () => ({ routedText: jest.fn() }))
jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import { routedText } from '@/lib/llm/router'
import { generateStrategyProposal, MandateGenerationError } from '@/lib/mandate/generate'
import { composeMandatePrompt } from '@/lib/prompts/compose'

const mockLlm = routedText as jest.Mock

const context = { companyName: 'Acme', qScore: { overall: 62, summary: 'Weakest: Go To Market (32).' } }

const goodJson = {
  mission: 'We help mid-market procurement teams cut manual overhead.',
  priorities: ['Win 10 design partners', 'Prove the ICP'],
  goals: ['£40k MRR by Q4'],
}

const reply = (doc: string, json: unknown) =>
  `${doc}\n\n\`\`\`json\n${JSON.stringify(json)}\n\`\`\``

beforeEach(() => jest.clearAllMocks())

// ─── The happy path ───────────────────────────────────────────────────────────

describe('generateStrategyProposal', () => {
  it('returns the document AND the structured fields', async () => {
    mockLlm.mockResolvedValue(reply('# Executive Strategy Session\n\n## Executive Summary\n...', goodJson))

    const result = await generateStrategyProposal(context)

    expect(result.mission).toBe(goodJson.mission)
    expect(result.priorities).toEqual(goodJson.priorities)
    expect(result.goals).toEqual(goodJson.goals)
    expect(result.document).toContain('# Executive Strategy Session')
    // The JSON tail is stripped from the document — the founder reads prose.
    expect(result.document).not.toContain('```json')
  })

  it('routes as a reasoning task and never hardcodes a model', async () => {
    mockLlm.mockResolvedValue(reply('doc', goodJson))
    await generateStrategyProposal(context)

    // CLAUDE.md §2: models only through lib/llm/router.ts.
    expect(mockLlm).toHaveBeenCalledWith('reasoning', expect.any(Array), expect.any(Object))
  })

  it('sends the composed S001 package, not an ad-hoc prompt', async () => {
    mockLlm.mockResolvedValue(reply('doc', goodJson))
    await generateStrategyProposal(context)

    const sent = mockLlm.mock.calls[0][1][0].content as string
    expect(sent).toContain('S001')
    expect(sent).toContain('Executive Strategy Session')
    expect(sent).toContain('Machine-readable summary')
    // The founder's own words (and their Q-Score) arrive as data, not orders (CLAUDE.md §3).
    expect(sent).toContain('<data>')
  })

  it('reads the real Q-Score into the prompt — the whole point of proposing, not asking', async () => {
    mockLlm.mockResolvedValue(reply('doc', goodJson))
    await generateStrategyProposal(context)

    const sent = mockLlm.mock.calls[0][1][0].content as string
    expect(sent).toContain('Q-Score')
    expect(sent).toContain('62')
  })
})

// ─── Nothing the model returns is trusted ─────────────────────────────────────

describe('nothing the model proposes is trusted', () => {
  it('rejects a proposal with no mission', async () => {
    mockLlm.mockResolvedValue(reply('doc', { ...goodJson, mission: '' }))
    await expect(generateStrategyProposal(context)).rejects.toThrow(/did not produce a direction/)
  })

  it('rejects a proposal with no priorities', async () => {
    mockLlm.mockResolvedValue(reply('doc', { ...goodJson, priorities: [] }))
    await expect(generateStrategyProposal(context)).rejects.toThrow(/named no priorities/)
  })

  it('drops junk goal entries rather than storing them', async () => {
    mockLlm.mockResolvedValue(reply('doc', { ...goodJson, goals: ['Real goal', '', '   ', 42, null] }))
    const result = await generateStrategyProposal(context)
    expect(result.goals).toEqual(['Real goal'])
  })

  it('a missing goals array is fine — only mission and priorities are required', async () => {
    const { goals: _goals, ...withoutGoals } = goodJson
    mockLlm.mockResolvedValue(reply('doc', withoutGoals))
    const result = await generateStrategyProposal(context)
    expect(result.goals).toEqual([])
  })

  it('rejects a response with no JSON tail', async () => {
    mockLlm.mockResolvedValue('# Executive Strategy Session\n\nJust prose, no summary.')
    await expect(generateStrategyProposal(context)).rejects.toThrow(/without its machine-readable summary/)
  })

  it('rejects a malformed JSON tail', async () => {
    mockLlm.mockResolvedValue('doc\n\n```json\n{ not valid\n```')
    await expect(generateStrategyProposal(context)).rejects.toThrow(/not valid JSON/)
  })

  it('takes the LAST fenced block', async () => {
    const echoed = '# Doc\n\n```\nStep 1\n↓\nStep 6\n```\n\nMore prose.'
    mockLlm.mockResolvedValue(reply(echoed, goodJson))

    const result = await generateStrategyProposal(context)
    expect(result.mission).toBe(goodJson.mission)
    expect(result.document).toContain('Step 1')
  })
})

// ─── Failure must not strand the founder ──────────────────────────────────────

describe('when the model is unavailable', () => {
  it('raises a MandateGenerationError the caller can fall back from', async () => {
    // No deterministic fallback exists for a Strategy the way it does for a Contract
    // (there is nothing to build one FROM) — the caller falls back to a blank,
    // founder-authored form instead. This error is that cue.
    mockLlm.mockRejectedValue(new Error('503 upstream'))
    await expect(generateStrategyProposal(context)).rejects.toThrow(MandateGenerationError)
    await expect(generateStrategyProposal(context)).rejects.toThrow(/Could not draft your direction right now/)
  })
})

// ─── The JSON tail lives in the Composer, not the workbook ────────────────────

describe('the strategy structured tail', () => {
  it('is absent unless asked for', () => {
    const plain = composeMandatePrompt({ kind: 'strategy', context: {} })
    expect(plain.text).not.toContain('Machine-readable summary')
  })

  it('is appended last, after the prompt and the context', () => {
    const withTail = composeMandatePrompt({ kind: 'strategy', structuredTail: 'strategy', context: {} })
    expect(withTail.text).toContain('Machine-readable summary')
    expect(withTail.text.indexOf('Machine-readable summary'))
      .toBeGreaterThan(withTail.text.indexOf('# Company Context'))
  })

  it('does not alter the workbook prompt (ADR-010)', () => {
    const withTail = composeMandatePrompt({ kind: 'strategy', structuredTail: 'strategy', context: {} })
    expect(withTail.layers[0].text).not.toContain('Machine-readable summary')
    expect(withTail.layers[0].sourceRef).toBe('S001')
  })

  it('the contract tail and the strategy tail do not leak into each other', () => {
    const contractPkg = composeMandatePrompt({ kind: 'contract', structuredTail: 'contract', context: {} })
    const strategyPkg = composeMandatePrompt({ kind: 'strategy', structuredTail: 'strategy', context: {} })
    expect(contractPkg.text).not.toContain('Top Strategic Priorities')
    expect(strategyPkg.text).not.toContain('activePrograms')
  })
})
