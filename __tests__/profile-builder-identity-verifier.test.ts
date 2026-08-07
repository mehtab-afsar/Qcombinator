/**
 * verifyIdentityConsistency — catches a founder uploading a document for a different,
 * identifiable company than the one they registered (e.g. claims "Google," uploads an
 * Apple pitch deck) without any hardcoded company list. The prompt only ever sees this
 * founder's own registered identity vs. the document text, so it generalizes to any pair.
 */

jest.mock('@/lib/llm/router', () => ({ routedText: jest.fn() }))
jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))

import { routedText } from '@/lib/llm/router'
import { verifyIdentityConsistency, SYSTEM_PROMPT } from '@/lib/profile-builder/identity-verifier'

const mockLlm = routedText as jest.Mock

const identity = {
  companyName: 'Aurora Metrics',
  startupName: null,
  tagline: 'Real-time unit economics for early-stage SaaS',
  description: null,
}

const longDoc = 'Aurora Metrics helps early-stage SaaS founders track unit economics in real time. '.repeat(5)

describe('verifyIdentityConsistency', () => {
  beforeEach(() => mockLlm.mockReset())

  it('is plausible when no company/startup name is registered — nothing to compare', async () => {
    const result = await verifyIdentityConsistency(
      { companyName: null, startupName: null, tagline: null, description: null },
      longDoc,
    )
    expect(result).toEqual({ identityPlausible: true, identityMismatchReason: null })
    expect(mockLlm).not.toHaveBeenCalled()
  })

  it('is plausible when the document text is too short to judge', async () => {
    const result = await verifyIdentityConsistency(identity, 'Too short.')
    expect(result).toEqual({ identityPlausible: true, identityMismatchReason: null })
    expect(mockLlm).not.toHaveBeenCalled()
  })

  it('parses a well-formed mismatch response correctly', async () => {
    mockLlm.mockResolvedValue(JSON.stringify({
      identity_plausible: false,
      identity_mismatch_reason: 'This document describes a company called Vantage Robotics, not Aurora Metrics.',
    }))
    const result = await verifyIdentityConsistency(identity, longDoc)
    expect(result.identityPlausible).toBe(false)
    expect(result.identityMismatchReason).toMatch(/Vantage Robotics/)
  })

  it('parses a well-formed plausible response correctly', async () => {
    mockLlm.mockResolvedValue(JSON.stringify({ identity_plausible: true, identity_mismatch_reason: null }))
    const result = await verifyIdentityConsistency(identity, longDoc)
    expect(result).toEqual({ identityPlausible: true, identityMismatchReason: null })
  })

  it('fails open when the router call throws', async () => {
    mockLlm.mockRejectedValue(new Error('LLM outage'))
    const result = await verifyIdentityConsistency(identity, longDoc)
    expect(result).toEqual({ identityPlausible: true, identityMismatchReason: null })
  })

  it('fails open when the reply is not valid JSON', async () => {
    mockLlm.mockResolvedValue('not json at all')
    const result = await verifyIdentityConsistency(identity, longDoc)
    expect(result).toEqual({ identityPlausible: true, identityMismatchReason: null })
  })

  it('fails open when the reply fails Zod validation', async () => {
    mockLlm.mockResolvedValue(JSON.stringify({ identity_plausible: 'yes' })) // wrong type
    const result = await verifyIdentityConsistency(identity, longDoc)
    expect(result).toEqual({ identityPlausible: true, identityMismatchReason: null })
  })

  it('the system prompt names no specific company — config over code, not a blocklist', () => {
    const knownBrands = ['Google', 'Apple', 'Amazon', 'Microsoft', 'Meta', 'Tesla', 'OpenAI']
    for (const brand of knownBrands) {
      expect(SYSTEM_PROMPT).not.toContain(brand)
    }
  })
})
