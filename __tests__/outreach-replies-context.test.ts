/**
 * Replies reaching the model — the passive half of the loop.
 *
 * Two separate things are pinned here, and they fail in opposite directions:
 *
 *  1. **`getOutreachRepliesContext`** renders rows as prompt text. It must never throw (a lookup
 *     cannot be allowed to break a cycle) and must never render an address.
 *  2. **`outreachRepliesContextFor`** decides WHICH Actions may see it. The gate is derived from
 *     the Registry rather than a list of ids, so it maintains itself — and it is narrow, because
 *     an Asset that saw this would persist someone's words into a document with no link back to
 *     the row saying when to delete them.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getOutreachRepliesContext } from '@/lib/signals/context'

const row = (over: Record<string, unknown> = {}) => ({
  action_id: 'generate_personalized_outreach',
  reply_from_domain: 'acme.com',
  reply_excerpt: 'Interested — can we talk Thursday?',
  replied_at: '2026-09-01T10:00:00Z',
  detected_at: '2026-09-01T11:00:00Z',
  ...over,
})

function fakeAdmin(result: { data?: unknown[]; error?: { message: string } | null }): SupabaseClient {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: async () => ({ data: result.data ?? null, error: result.error ?? null }),
  }
  return { from: () => chain } as unknown as SupabaseClient
}

describe('what the model is shown', () => {
  it('renders who replied, when, and what they said', async () => {
    const text = (await getOutreachRepliesContext(fakeAdmin({ data: [row()] }), 'f1'))!

    expect(text).toContain('acme.com')
    expect(text).toContain('Thursday')
    expect(text).toContain('2026-09-01')
  })

  it('⚠️ never renders an address, even though one exists on the reply', async () => {
    // The safety property. The table holds a domain by construction, but this asserts the
    // rendering layer does not reintroduce one from anywhere else.
    const text = (await getOutreachRepliesContext(fakeAdmin({ data: [row()] }), 'f1'))!
    expect(text).not.toMatch(/[a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,}/i)
  })

  it('tells the model this is real, not its own reasoning', async () => {
    // Without this a model treats it as another summary to be re-derived, which is exactly what
    // the feature exists to stop.
    const text = (await getOutreachRepliesContext(fakeAdmin({ data: [row()] }), 'f1'))!
    expect(text).toMatch(/This is real/i)
  })

  it('handles a reply with no domain and no excerpt without dangling punctuation', async () => {
    const text = (await getOutreachRepliesContext(
      fakeAdmin({ data: [row({ reply_from_domain: null, reply_excerpt: null })] }), 'f1',
    ))!
    const line = text.split('\n').find(l => l.startsWith('- '))!
    expect(line).toBe('- 2026-09-01 · someone replied')
    expect(line).not.toContain('""')
  })
})

describe('it never breaks a cycle', () => {
  it('returns null when there are no replies', async () => {
    await expect(getOutreachRepliesContext(fakeAdmin({ data: [] }), 'f1')).resolves.toBeNull()
  })

  it('returns null, not a throw, on a query error', async () => {
    await expect(
      getOutreachRepliesContext(fakeAdmin({ error: { message: 'db down' } }), 'f1'),
    ).resolves.toBeNull()
  })
})

describe('the gate: which Actions may see replies', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  const src = () => read('lib/rhythm/action-context.ts')

  it('⚠️ is derived from the Registry, not a hardcoded id list', () => {
    // The property that keeps this from rotting: it asks whether the Program has an Action that
    // sends email. A Program that later gains one inherits this; one that loses it loses this.
    const fn = src().slice(src().indexOf('export async function outreachRepliesContextFor'))
    expect(fn).toContain("connector === 'gmail'")
    expect(fn).not.toContain("'P005'")
    expect(fn).not.toContain("'P001'")
  })

  it('⚠️ only the Action path gets it — never an Asset or a Briefing', () => {
    // An Asset persists as a document. Someone's words landing in one would be a second, silent
    // copy with no link back to the row that says when to delete it — the same carve-out
    // founderContacts and pipelineLeads already earn.
    const run = read('lib/rhythm/run.ts')
    expect(run.match(/\.\.\.replies/g) ?? []).toHaveLength(1)

    const assetCall = run.slice(run.indexOf('await generateAssetContent(admin, {'))
    expect(assetCall.slice(0, 400)).not.toContain('replies')
  })

  it('nothing outside the rhythm builds it either', () => {
    // directAssetRework produces a persisted Asset too — it must not acquire this by another route.
    expect(read('lib/rhythm/direct.ts')).not.toContain('outreachReplies')
    expect(read('lib/rhythm/context.ts')).not.toContain('outreachReplies')
  })
})
