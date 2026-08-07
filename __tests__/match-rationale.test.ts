/**
 * features/matching/services/match-rationale.ts
 *
 * Covers the switch from a raw inline prompt to composeAdhocPrompt() + routedText(), and
 * guards the deterministic fallback (unchanged logic, still must fire on any LLM failure).
 */

const mockRoutedText = jest.fn()
jest.mock('@/lib/llm/router', () => ({ routedText: mockRoutedText }))

import { generateMatchRationale, type MatchRationaleInput } from '@/features/matching/services/match-rationale'

const baseInput: MatchRationaleInput = {
  investorName: 'Jane Doe',
  investorFirm: 'Acme Ventures',
  investorThesis: 'API-first fintech infrastructure for emerging markets.',
  investorSectors: ['fintech'],
  investorStages: ['seed', 'series-a'],
  investorPortfolio: ['PayCo', 'LendCo'],
  matchScore: 82,
  founderSector: 'fintech',
  founderStage: 'seed',
  founderQScore: 74,
  startupOneLiner: 'Payments infrastructure for African SMBs.',
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('generateMatchRationale', () => {
  it('calls routedText with the summarisation task class and a short token budget', async () => {
    mockRoutedText.mockResolvedValue('This is a strong match because...')
    await generateMatchRationale(baseInput)

    expect(mockRoutedText).toHaveBeenCalledTimes(1)
    const [taskClass, , overrides] = mockRoutedText.mock.calls[0]
    expect(taskClass).toBe('summarisation')
    expect(overrides).toEqual({ maxTokens: 200 })
  })

  it('sends a composeAdhocPrompt-shaped message pair — system instructions, fenced user data', async () => {
    mockRoutedText.mockResolvedValue('...')
    await generateMatchRationale(baseInput)

    const [, messages] = mockRoutedText.mock.calls[0]
    expect(messages).toHaveLength(2)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('startup fundraising advisor')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('<data>')
    expect(messages[1].content).toContain('Jane Doe (Acme Ventures)')
    expect(messages[1].content).toContain('Match score: 82%')
  })

  it('trims the model output', async () => {
    mockRoutedText.mockResolvedValue('  padded text  \n')
    const result = await generateMatchRationale(baseInput)
    expect(result).toBe('padded text')
  })

  it('falls back to a deterministic sector-aware sentence when the LLM call throws', async () => {
    mockRoutedText.mockRejectedValue(new Error('provider down'))
    const result = await generateMatchRationale(baseInput)
    expect(result).toContain('Jane Doe')
    expect(result).toContain('fintech')
    expect(result).toContain('PayCo and LendCo')
  })

  it('fallback still works with no sector overlap and no portfolio', async () => {
    mockRoutedText.mockRejectedValue(new Error('provider down'))
    const result = await generateMatchRationale({
      ...baseInput,
      investorSectors: ['climate'],
      investorPortfolio: [],
    })
    expect(result).toContain('seed stage') // founderStage-based fallback sentence
    expect(result).toContain('82% match score')
  })
})
