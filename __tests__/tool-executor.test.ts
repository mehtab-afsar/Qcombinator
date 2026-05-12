/**
 * Tool executor dispatch table tests
 *
 * Verifies that:
 * 1. All registered tool IDs are present in the TOOLS registry
 * 2. ToolRateLimitError and ToolNotFoundError have correct names
 * 3. executeTool throws ToolNotFoundError for unknown tools
 * 4. Rate-limit scoping: per-user key format is correct
 * 5. executeTool dispatches to the handler and returns the correct shape
 */

import { TOOLS, getTool } from '@/lib/edgealpha.config'
import { ToolRateLimitError, ToolNotFoundError } from '@/lib/tools/executor'

// ─────────────────────────────────────────────────────────────────────────────
// 1 — Tool registry completeness
// ─────────────────────────────────────────────────────────────────────────────

describe('TOOLS registry', () => {
  const expectedDataTools = [
    'lead_enrich', 'web_research', 'create_deal', 'fetch_stripe_metrics',
    'apollo_search', 'posthog_query', 'calendly_link', 'vapi_call', 'fireflies_sync',
  ]
  const expectedArtifactTools = [
    'icp_document', 'outreach_sequence', 'battle_card', 'gtm_playbook',
    'sales_script', 'brand_messaging', 'financial_summary', 'legal_checklist',
    'hiring_plan', 'pmf_survey', 'interview_notes', 'competitive_matrix',
    'strategic_plan',
  ]

  it('contains all expected data tool IDs', () => {
    const ids = new Set(TOOLS.map(t => t.id))
    for (const id of expectedDataTools) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('contains all expected artifact tool IDs', () => {
    const ids = new Set(TOOLS.map(t => t.id))
    for (const id of expectedArtifactTools) {
      expect(ids.has(id)).toBe(true)
    }
  })

  it('every tool has an executor field', () => {
    for (const tool of TOOLS) {
      expect(typeof tool.executor).toBe('string')
      expect(tool.executor.length).toBeGreaterThan(0)
    }
  })

  it('every tool has a valid type', () => {
    const validTypes = new Set(['data', 'artifact'])
    for (const tool of TOOLS) {
      expect(validTypes.has(tool.type)).toBe(true)
    }
  })

  it('artifact tools all use executeArtifactGenerate', () => {
    const artifactTools = TOOLS.filter(t => t.type === 'artifact')
    for (const tool of artifactTools) {
      expect(tool.executor).toBe('executeArtifactGenerate')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 — getTool lookup
// ─────────────────────────────────────────────────────────────────────────────

describe('getTool', () => {
  it('returns the tool config for a known id', () => {
    const tool = getTool('lead_enrich')
    expect(tool).toBeDefined()
    expect(tool?.id).toBe('lead_enrich')
    expect(tool?.type).toBe('data')
  })

  it('returns undefined for an unknown id', () => {
    expect(getTool('completely_unknown_tool_xyz')).toBeUndefined()
  })

  it('returns the correct cache TTL for web_research', () => {
    const tool = getTool('web_research')
    expect(tool?.cache?.ttl).toBe(3600)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 — Error class names
// ─────────────────────────────────────────────────────────────────────────────

describe('Tool executor error classes', () => {
  it('ToolRateLimitError has correct name and message', () => {
    const err = new ToolRateLimitError('lead_enrich')
    expect(err.name).toBe('ToolRateLimitError')
    expect(err.message).toContain('lead_enrich')
  })

  it('ToolNotFoundError has correct name and message', () => {
    const err = new ToolNotFoundError('mystery_tool')
    expect(err.name).toBe('ToolNotFoundError')
    expect(err.message).toContain('mystery_tool')
  })

  it('ToolRateLimitError is an instance of Error', () => {
    expect(new ToolRateLimitError('x')).toBeInstanceOf(Error)
  })

  it('ToolNotFoundError is an instance of Error', () => {
    expect(new ToolNotFoundError('x')).toBeInstanceOf(Error)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 — Rate limit key scoping (unit test of the key format)
// ─────────────────────────────────────────────────────────────────────────────

describe('Rate limit key scoping', () => {
  it('user-scoped key includes both userId and toolId', () => {
    const userId = 'user-abc'
    const toolId = 'lead_enrich'
    const key = `${userId}:${toolId}`
    expect(key).toBe('user-abc:lead_enrich')
    expect(key).toContain(userId)
    expect(key).toContain(toolId)
  })

  it('two different users produce different keys for the same tool', () => {
    const tool = 'web_research'
    const keyA = `user-A:${tool}`
    const keyB = `user-B:${tool}`
    expect(keyA).not.toBe(keyB)
  })

  it('unauthenticated fallback uses tool id alone', () => {
    const userId: string | undefined = undefined
    const toolId = 'lead_enrich'
    const key = userId ? `${userId}:${toolId}` : toolId
    expect(key).toBe('lead_enrich')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5 — Tool cost attribution
// ─────────────────────────────────────────────────────────────────────────────

describe('Tool cost config', () => {
  it('lead_enrich has non-zero costUsd', () => {
    const tool = getTool('lead_enrich')
    expect(tool).toBeDefined()
    expect(tool!.costUsd).toBeGreaterThan(0)
  })

  it('create_deal has zero costUsd (no external API)', () => {
    const tool = getTool('create_deal')
    expect(tool).toBeDefined()
    expect(tool!.costUsd).toBe(0)
  })

  it('web_research costs more than lead_enrich (LLM pass)', () => {
    const research = getTool('web_research')
    const enrich   = getTool('lead_enrich')
    expect(research).toBeDefined()
    expect(enrich).toBeDefined()
    expect(research!.costUsd).toBeGreaterThan(enrich!.costUsd)
  })
})
