/**
 * `getLeadsContext` — the leads table read BACK into a prompt, closing the half of the PRD's
 * "structured results" spine item that slice 1 left open. Until this, leads were written and never
 * read: every downstream step in P005's chain reasoned from the previous step's prose summary, so
 * it could not see a lead's real status, its score, or whether enrichment had since found a person.
 *
 * The property that carries the most weight here is the NEGATIVE one: no email address may ever
 * render. Recipients come from founder_contacts, the founder-vouched path; a pipeline is for
 * deciding who to work next, and every prompt this reaches is somewhere an address could come to
 * rest — including inside a persisted document, with no link back to the row that would tell
 * anyone it needs cleaning up when the lead is deleted.
 *
 * fakeAdmin mirrors __tests__/contacts-context.test.ts's hand-rolled chainable.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLeadsContext } from '@/lib/entities/leads'

const lead = (over: Record<string, unknown> = {}) => ({
  company: 'Acme Corp', title: 'VP Engineering', contact_name: 'Dana Whitfield',
  email_status: 'verified', score: 88, status: 'researched', ...over,
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

describe('the pipeline a lead-working Action sees', () => {
  it('renders company, role, who, status and fit', async () => {
    const text = await getLeadsContext(fakeAdmin({ data: [lead()] }), 'f1')

    expect(text).toContain('Acme Corp')
    expect(text).toContain('VP Engineering')
    expect(text).toContain('Dana Whitfield')
    expect(text).toContain('researched')
    expect(text).toContain('fit 88')
  })

  it('says an email is on file WITHOUT printing it', async () => {
    // ⚠️ The safety property. The address is genuinely on the row here — it must still not appear.
    const rows = [{ ...lead(), email: 'dana@acme.com' }]
    const text = await getLeadsContext(fakeAdmin({ data: rows }), 'f1')

    expect(text).toContain('verified email on file')
    expect(text).not.toContain('dana@acme.com')
    expect(text).not.toContain('@')
  })

  it('says plainly when a lead has no email yet', async () => {
    const text = await getLeadsContext(fakeAdmin({ data: [lead({ email_status: 'none' })] }), 'f1')
    expect(text).toContain('no email yet')
  })

  it('tells the model the pipeline outranks any earlier summary', async () => {
    // The whole point: a chained step should reason from the live table, not the prior step's prose.
    const text = await getLeadsContext(fakeAdmin({ data: [lead()] }), 'f1')
    expect(text).toMatch(/rather than from any\s+earlier summary/i)
  })

  it('handles a lead with no role or name without dangling punctuation', async () => {
    const text = await getLeadsContext(
      fakeAdmin({ data: [lead({ title: null, contact_name: null, score: null })] }),
      'f1',
    )
    // Scoped to the lead LINE — the preamble legitimately contains prose punctuation.
    const line = text!.split('\n').find(l => l.startsWith('- '))!
    expect(line).toBe('- Acme Corp · researched · verified email on file')
    expect(line).not.toContain('—')   // no orphaned "who" separator
    expect(line).not.toContain('fit') // no orphaned score
  })
})

describe('a long pipeline does not blow out every prompt', () => {
  it('caps, and says that it capped', async () => {
    // A founder with hundreds of leads must not push every other layer out of the context window,
    // and the model must know it is seeing a top slice rather than the whole pipeline.
    const many = Array.from({ length: 60 }, (_, i) => lead({ company: `Co ${i}` }))
    const text = await getLeadsContext(fakeAdmin({ data: many }), 'f1')

    expect(text).toMatch(/Showing the top 40 by fit score; there are more\./)
    expect(text).toContain('Co 0')
    expect(text).not.toContain('Co 55')
  })

  it('says nothing about truncation when everything fits', async () => {
    const text = await getLeadsContext(fakeAdmin({ data: [lead(), lead({ company: 'Globex' })] }), 'f1')
    expect(text).not.toMatch(/there are more/)
  })
})

describe('the carve-out: pipeline data never reaches a persisted document', () => {
  const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

  it('only the Action path builds pipeline context — never the Asset or Briefing path', () => {
    // ⚠️ Same carve-out, same reason, as founderContactsContextFor: an Asset persists as a
    // document, so lead data reaching one would be a second silent copy of personal data with no
    // link back to the row telling anyone it needs cleaning up when the lead is deleted. The
    // spread must appear exactly once, at the Action call site.
    const src = read('lib/rhythm/run.ts')
    expect(src.match(/\.\.\.leads/g) ?? []).toHaveLength(1)

    // The asset generation call must not receive it.
    const assetCall = src.slice(src.indexOf('await generateAssetContent(admin, {'))
    expect(assetCall.slice(0, 400)).not.toContain('leads')
  })

  it('nothing outside the rhythm builds it either', () => {
    // directAssetRework (the founder-triggered "Direct the AI" path) produces a persisted Asset
    // too — it must not acquire pipeline context by some other route.
    expect(read('lib/rhythm/direct.ts')).not.toContain('pipelineLeads')
    expect(read('lib/rhythm/context.ts')).not.toContain('pipelineLeads')
  })
})

describe('it never breaks a cycle', () => {
  it('returns null when the founder has no leads', async () => {
    await expect(getLeadsContext(fakeAdmin({ data: [] }), 'f1')).resolves.toBeNull()
  })

  it('returns null, not a throw, on a query error', async () => {
    await expect(
      getLeadsContext(fakeAdmin({ error: { message: 'db down' } }), 'f1'),
    ).resolves.toBeNull()
  })
})
