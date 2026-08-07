/**
 * lib/rhythm/preview.ts — real content previews for a live run's steps (the fix for
 * PRD §3's "Activation — THE MISSING MOMENT": watching the team work must show real
 * artefact content, not just a status word).
 */

import { summarizeAssetContent, summarizeActionMetadata, buildStepPreviews } from '@/lib/rhythm/preview'
import type { RhythmRun } from '@/lib/rhythm/runs'
import type { ProgressStep } from '@/lib/rhythm/progress'

describe('summarizeAssetContent', () => {
  it('markdown: uses the first heading, stripped of #s', () => {
    expect(summarizeAssetContent('# ICP Profiles\n\nDetail here.', 'markdown')).toBe('ICP Profiles')
  })

  it('markdown: falls back to the first ~160 chars when there is no heading', () => {
    const text = 'A'.repeat(200)
    const result = summarizeAssetContent(text, 'markdown')
    expect(result.endsWith('…')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(161)
  })

  it('markdown: empty/non-string content degrades to a generic label, never throws', () => {
    expect(summarizeAssetContent('', 'markdown')).toBe('Updated')
    expect(summarizeAssetContent(null, 'markdown')).toBe('Updated')
    expect(summarizeAssetContent(undefined, 'markdown')).toBe('Updated')
  })

  it('json: uses an obvious title/summary/headline key when present', () => {
    expect(summarizeAssetContent({ title: 'Q3 Channel Strategy' }, 'json')).toBe('Q3 Channel Strategy')
    expect(summarizeAssetContent({ summary: 'Focus on outbound.' }, 'json')).toBe('Focus on outbound.')
  })

  it('json: never fabricates a summary of arbitrary structure — degrades to a generic label', () => {
    expect(summarizeAssetContent({ foo: 'bar', nested: { a: 1 } }, 'json')).toBe('Updated')
    expect(summarizeAssetContent([1, 2, 3], 'json')).toBe('Updated')
    expect(summarizeAssetContent(null, 'json')).toBe('Updated')
  })
})

describe('summarizeActionMetadata', () => {
  it('builds a human line from redacted recipient metadata, never raw content', () => {
    expect(summarizeActionMetadata({ recipientCount: 3, recipientDomains: ['acme.com'] }, 'Interview Customers'))
      .toBe('Interview Customers — 3 recipients at acme.com')
  })

  it('singular recipient reads naturally', () => {
    expect(summarizeActionMetadata({ recipientCount: 1, recipientDomains: ['acme.com'] }, 'Interview Customers'))
      .toBe('Interview Customers — 1 recipient at acme.com')
  })

  it('no metadata (non-email action, or an empty request) falls back to just the action name', () => {
    expect(summarizeActionMetadata({}, 'Approve GTM Plan')).toBe('Approve GTM Plan')
    expect(summarizeActionMetadata(null, 'Approve GTM Plan')).toBe('Approve GTM Plan')
    expect(summarizeActionMetadata(undefined, 'Approve GTM Plan')).toBe('Approve GTM Plan')
  })
})

// ─── buildStepPreviews — orchestration, against a minimal fake Supabase client ─────

function fakeSupabase(byTable: Record<string, unknown[]>) {
  const builder = (table: string) => {
    const rows = byTable[table] ?? []
    const chain: PromiseLike<{ data: unknown[]; error: null }> & Record<string, unknown> = {
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      then: (onfulfilled) => Promise.resolve({ data: rows, error: null }).then(onfulfilled),
    }
    return chain
  }
  return { from: builder } as unknown as import('@supabase/supabase-js').SupabaseClient
}

const run: RhythmRun = {
  id: 'run1', founderId: 'f1', contractId: 'c1', cycleKey: '2026-W30', status: 'running',
  stages: {}, startedAt: '2026-07-21T11:50:00Z', completedAt: null, lastStepAt: '2026-07-21T11:59:00Z',
  stepCount: 0, failureReason: null,
}

const assetStep = (state: ProgressStep['state']): ProgressStep => ({
  key: 'P001:AS001', label: 'ICP Profiles', templateId: 'P001', executiveId: 'growth',
  kind: 'asset', assetId: 'AS001', actionId: null, preview: null, state,
})
const briefingStep = (state: ProgressStep['state']): ProgressStep => ({
  key: 'P001:briefing', label: 'Executive briefing', templateId: 'P001', executiveId: 'growth',
  kind: 'briefing', assetId: null, actionId: null, preview: null, state,
})
const actionStep = (state: ProgressStep['state']): ProgressStep => ({
  key: 'P001:interview_customers', label: 'Interview Customers', templateId: 'P001', executiveId: 'growth',
  kind: 'action', assetId: null, actionId: 'interview_customers', preview: null, state,
})

describe('buildStepPreviews', () => {
  it('maps a done asset step to its real content summary', async () => {
    const client = fakeSupabase({
      asset_versions: [{ id: 'v1', founder_id: 'f1', asset_id: 'AS001', program_id: null, execution_id: 'run1', version: 1, is_current: true, content: '# ICP Profiles\n\nDetail.', registry_version: null, executive_id: 'growth', authored_by: 'program', previous_version_id: null, source_refs: [], update_reason: null, created_at: '2026-07-21T12:00:00Z' }],
      action_log: [],
      executive_briefings: [],
    })
    const previews = await buildStepPreviews(client, run, [assetStep('done')], [])
    expect(previews.get('P001:AS001')).toBe('ICP Profiles')
  })

  it('maps a done briefing step to its verdict, via the templateId -> programs row-id join', async () => {
    const client = fakeSupabase({
      asset_versions: [],
      action_log: [],
      executive_briefings: [{ id: 'b1', founder_id: 'f1', program_id: 'prog-row-1', execution_id: 'run1', contract_id: 'c1', executive_id: 'growth', verdict: '3 partners engaged', body: {}, created_at: '2026-07-21T12:00:00Z' }],
    })
    const previews = await buildStepPreviews(client, run, [briefingStep('done')], [{ id: 'prog-row-1', templateId: 'P001' }])
    expect(previews.get('P001:briefing')).toBe('3 partners engaged')
  })

  it('maps a done action step to its redacted metadata summary', async () => {
    const client = fakeSupabase({
      asset_versions: [],
      action_log: [{ id: 'a1', founder_id: 'f1', program_id: null, execution_id: 'run1', action_id: 'interview_customers', provider: 'gmail', irreversible: true, status: 'executed', payload_hash: 'x', request: { recipientCount: 2, recipientDomains: ['acme.com'] }, result: null, approved_by: null, approved_at: null, created_at: '2026-07-21T12:00:00Z' }],
      executive_briefings: [],
    })
    const previews = await buildStepPreviews(client, run, [actionStep('done')], [])
    expect(previews.get('P001:interview_customers')).toBe('Interview Customers — 2 recipients at acme.com')
  })

  it('skips steps that are not settled (pending/active/failed) — no preview for in-flight work', async () => {
    const client = fakeSupabase({ asset_versions: [], action_log: [], executive_briefings: [] })
    const previews = await buildStepPreviews(client, run, [assetStep('active'), assetStep('pending'), assetStep('failed')], [])
    expect(previews.size).toBe(0)
  })

  it('a settled step with no matching row degrades to no preview, never throws', async () => {
    const client = fakeSupabase({ asset_versions: [], action_log: [], executive_briefings: [] })
    const previews = await buildStepPreviews(client, run, [assetStep('done'), briefingStep('skipped'), actionStep('done')], [])
    expect(previews.size).toBe(0)
  })

  it('returns an empty map immediately when nothing is settled — no reads fired', async () => {
    const client = fakeSupabase({ asset_versions: [], action_log: [], executive_briefings: [] })
    const previews = await buildStepPreviews(client, run, [assetStep('pending')], [])
    expect(previews.size).toBe(0)
  })
})
