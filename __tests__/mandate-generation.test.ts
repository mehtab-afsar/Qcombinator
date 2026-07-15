/**
 * F08b — generating the Executive Contract by actually running S002.
 *
 * The first LLM call in the new model, so these tests are mostly about not
 * trusting it: the model proposes, the Registry disposes.
 */

// ⚠️ MOCK @/lib/llm/router — NOT @/lib/claude.
// Phase 0 found two reconciliation tests that mocked @/lib/claude while the
// engine called routedText. The mock intercepted nothing, the real call ran, and
// the tests failed silently for months. routedText(taskClass, messages, opts) —
// note `messages` is the SECOND argument.
jest.mock('@/lib/llm/router', () => ({ routedText: jest.fn() }))
jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import { routedText } from '@/lib/llm/router'
import { generateMandate, MandateGenerationError } from '@/lib/mandate/generate'
import { composeMandatePrompt } from '@/lib/prompts/compose'

const mockLlm = routedText as jest.Mock

const context = { strategy: 'Win mid-market procurement in EMEA.' }

const goodJson = {
  priorities: ['Win 10 design partners', 'Prove the ICP'],
  successMetrics: ['£40k MRR by Q4'],
  responsibilities: [{ executive: 'growth', mandate: 'Own the commercial engine' }],
  activePrograms: ['P001'],
}

const reply = (doc: string, json: unknown) =>
  `${doc}\n\n\`\`\`json\n${JSON.stringify(json)}\n\`\`\``

beforeEach(() => jest.clearAllMocks())

// ─── The happy path ───────────────────────────────────────────────────────────

describe('generateMandate', () => {
  it('returns the document AND the structured fields', async () => {
    mockLlm.mockResolvedValue(reply('# Executive Contract\n\n### Mission\nCut overhead.', goodJson))

    const result = await generateMandate(context)

    expect(result.priorities).toEqual(['Win 10 design partners', 'Prove the ICP'])
    expect(result.activePrograms).toEqual(['P001'])
    expect(result.document).toContain('# Executive Contract')
    // The JSON tail is stripped from the document — the founder reads prose.
    expect(result.document).not.toContain('```json')
  })

  it('routes as a reasoning task and never hardcodes a model', async () => {
    mockLlm.mockResolvedValue(reply('doc', goodJson))
    await generateMandate(context)

    // CLAUDE.md §2: models only through lib/llm/router.ts.
    expect(mockLlm).toHaveBeenCalledWith('reasoning', expect.any(Array), expect.any(Object))
  })

  it('sends the composed S002 package, not an ad-hoc prompt', async () => {
    mockLlm.mockResolvedValue(reply('doc', goodJson))
    await generateMandate(context)

    const [, messages] = mockLlm.mock.calls[0]
    const sent = messages[0].content as string
    expect(sent).toContain('S002')
    expect(sent).toContain('Executive Contract')
    expect(sent).toContain('Machine-readable summary')
    // The founder's own words arrive as data, not orders (CLAUDE.md §3).
    expect(sent).toContain('<data>')
  })

  it('tells the model which programs actually exist', async () => {
    // Without the catalogue it is guessing at what it may activate.
    mockLlm.mockResolvedValue(reply('doc', goodJson))
    await generateMandate(context)

    const sent = mockLlm.mock.calls[0][1][0].content as string
    expect(sent).toContain('Programs available to activate')
    expect(sent).toContain('P001')
  })
})

// ─── The model proposes, the Registry disposes ────────────────────────────────

describe('nothing the model returns is trusted', () => {
  it('REJECTS an invented program', async () => {
    // The whole reason this validation exists. An LLM will happily activate
    // 'P042 — Customer Delight'; if that reached the database, the Rhythm would
    // try to run it at 3am, for one founder, weeks later.
    mockLlm.mockResolvedValue(reply('doc', { ...goodJson, activePrograms: ['P042'] }))

    await expect(generateMandate(context)).rejects.toThrow(MandateGenerationError)
    await expect(generateMandate(context)).rejects.toThrow(/'P042', which is not a real program/)
  })

  it('rejects an unknown executive in responsibilities', async () => {
    mockLlm.mockResolvedValue(reply('doc', {
      ...goodJson,
      responsibilities: [{ executive: 'chief_vibes_officer', mandate: 'vibes' }],
    }))
    await expect(generateMandate(context)).rejects.toThrow(/responsibility to no executive/)
  })

  it.each([
    ['no priorities',     { ...goodJson, priorities: [] },     /named no priorities/],
    ['no metrics',        { ...goodJson, successMetrics: [] }, /named no success metrics/],
    ['no programs',       { ...goodJson, activePrograms: [] }, /activated no programs/],
  ])('rejects a mandate with %s', async (_label, json, match) => {
    mockLlm.mockResolvedValue(reply('doc', json))
    await expect(generateMandate(context)).rejects.toThrow(match)
  })

  it('rejects a response with no JSON tail', async () => {
    mockLlm.mockResolvedValue('# Executive Contract\n\nJust prose, no summary.')
    await expect(generateMandate(context)).rejects.toThrow(/without its machine-readable summary/)
  })

  it('rejects a malformed JSON tail', async () => {
    mockLlm.mockResolvedValue('doc\n\n```json\n{ not valid\n```')
    await expect(generateMandate(context)).rejects.toThrow(/not valid JSON/)
  })

  it('takes the LAST fenced block — S002 contains one of its own', async () => {
    // S002's prompt has a fenced "Output Structure" diagram, which the model may
    // echo. Matching the first block would parse the diagram and fail.
    const echoed = '# Doc\n\n```\nExecutive Summary\n↓\nFounder Approval\n```\n\nMore prose.'
    mockLlm.mockResolvedValue(reply(echoed, goodJson))

    const result = await generateMandate(context)
    expect(result.activePrograms).toEqual(['P001'])
    expect(result.document).toContain('Executive Summary')
  })

  it('drops junk entries rather than storing them', async () => {
    mockLlm.mockResolvedValue(reply('doc', {
      ...goodJson,
      priorities: ['Real priority', '', '   ', 42, null],
    }))
    const result = await generateMandate(context)
    expect(result.priorities).toEqual(['Real priority'])
  })
})

// ─── Failure must not strand the founder ──────────────────────────────────────

describe('when the model is unavailable', () => {
  it('raises a MandateGenerationError the caller can fall back from', async () => {
    // The LLM layer has no failover (Anthropic-only — an accepted risk, ADR-019
    // / Architecture.md §5). An outage must not stop a founder setting direction.
    mockLlm.mockRejectedValue(new Error('503 upstream'))
    await expect(generateMandate(context)).rejects.toThrow(MandateGenerationError)
    await expect(generateMandate(context)).rejects.toThrow(/Could not draft your mandate right now/)
  })
})

// ─── The JSON tail lives in the Composer, not the workbook ────────────────────

describe('the structured tail', () => {
  it('is absent unless asked for', async () => {
    const plain = composeMandatePrompt({ kind: 'contract', context: {} })
    expect(plain.text).not.toContain('Machine-readable summary')
  })

  it('is appended last, after the prompt and the context', async () => {
    const withTail = composeMandatePrompt({ kind: 'contract', structuredTail: 'contract', context: {} })
    expect(withTail.text).toContain('Machine-readable summary')
    expect(withTail.text.indexOf('Machine-readable summary'))
      .toBeGreaterThan(withTail.text.indexOf('# Company Context'))
  })

  it('forbids inventing a program id, in the prompt itself', async () => {
    // Belt and braces: the instruction asks, the Registry enforces.
    const withTail = composeMandatePrompt({ kind: 'contract', structuredTail: 'contract', context: {} })
    expect(withTail.text).toMatch(/Do not invent one/i)
  })

  it('does not alter the workbook prompt (ADR-010)', () => {
    // The tail is a runtime need — our schema — not part of the executive's
    // design. S002's own text stays clean.
    const withTail = composeMandatePrompt({ kind: 'contract', structuredTail: 'contract', context: {} })
    expect(withTail.layers[0].text).not.toContain('Machine-readable summary')
    expect(withTail.layers[0].sourceRef).toBe('S002')
  })
})
