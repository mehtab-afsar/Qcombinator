/**
 * The Apollo enrichment chain — company → person → email (docs/AGI_ACTIONS_PRD.md, slice 2).
 *
 * `global.fetch` is stubbed with inline fixtures, the same approach
 * connector-posthog-oauth.test.ts uses. What matters most here is what we DON'T spend: Apollo
 * charges per company resolution and per revealed email, so the dedupe and the has_email filter
 * are cost-correctness properties, not optimisations.
 */

jest.mock('@/lib/logger', () => ({ log: { warn: jest.fn(), error: jest.fn(), info: jest.fn() } }))
jest.mock('@/lib/circuit-breaker', () => ({
  withCircuitBreaker: async (_service: string, fn: () => Promise<unknown>) => fn(),
}))

import { enrichLeads, type EnrichableLead } from '@/lib/connectors/apollo/connector'
import type { ResolvedGrant } from '@/lib/connectors/types'

const grant: ResolvedGrant = {
  grantId: 'g1', founderId: 'f1', provider: 'apollo',
  accessToken: 'apollo-key', accountEmail: null, scopes: [],
}

const lead = (over: Partial<EnrichableLead> = {}): EnrichableLead => ({
  id: 'l1', company: 'Acme Corp', title: 'VP Engineering', apolloOrgId: null, ...over,
})

/** Route each Apollo endpoint to a canned response, and record every call made. */
function stubApollo(responses: {
  companies?: unknown
  people?: unknown
  match?: unknown
}) {
  const calls: Array<{ path: string; body: Record<string, unknown> }> = []
  global.fetch = jest.fn(async (url: unknown, init: unknown) => {
    const path = String(url)
    const body = JSON.parse((init as { body: string }).body) as Record<string, unknown>
    calls.push({ path, body })
    const pick =
      path.includes('mixed_companies/search') ? responses.companies
      : path.includes('mixed_people/api_search') ? responses.people
      : responses.match
    return { ok: true, json: async () => pick ?? {} } as unknown as Response
  }) as unknown as typeof fetch
  return calls
}

const ORG_FOUND = { organizations: [{ id: 'org-1', primary_domain: 'acme.com' }] }
const PERSON_FOUND = { people: [{ id: 'per-1', has_email: true }] }
const MATCH_FOUND = { person: { name: 'Dana Whitfield', email: 'dana@acme.com' } }

const originalFetch = global.fetch
afterEach(() => { global.fetch = originalFetch; jest.clearAllMocks() })

describe('the happy path — company to verified email', () => {
  it('walks all three steps and returns the real person', async () => {
    stubApollo({ companies: ORG_FOUND, people: PERSON_FOUND, match: MATCH_FOUND })

    const [result] = await enrichLeads(grant, [lead()])

    expect(result).toEqual({
      leadId: 'l1',
      outcome: 'found',
      contactName: 'Dana Whitfield',
      email: 'dana@acme.com',
      apolloOrgId: 'org-1',
      apolloPersonId: 'per-1',
    })
  })

  it('authenticates by API key header, never a bearer token', async () => {
    stubApollo({ companies: ORG_FOUND, people: PERSON_FOUND, match: MATCH_FOUND })
    await enrichLeads(grant, [lead()])

    const init = (global.fetch as jest.Mock).mock.calls[0][1] as { headers: Record<string, string> }
    expect(init.headers['x-api-key']).toBe('apollo-key')
    expect(init.headers.Authorization).toBeUndefined()
  })

  it('never asks for personal emails — costs more and is withheld under GDPR', async () => {
    const calls = stubApollo({ companies: ORG_FOUND, people: PERSON_FOUND, match: MATCH_FOUND })
    await enrichLeads(grant, [lead()])

    const match = calls.find(c => c.path.includes('people/match'))!
    expect(match.body.reveal_personal_emails).toBeUndefined()
    expect(match.body.reveal_phone_number).toBeUndefined()
  })

  it('searches by the role we were given, scoped to the resolved organization', async () => {
    const calls = stubApollo({ companies: ORG_FOUND, people: PERSON_FOUND, match: MATCH_FOUND })
    await enrichLeads(grant, [lead({ title: 'Head of Product' })])

    const search = calls.find(c => c.path.includes('mixed_people/api_search'))!
    expect(search.body.organization_ids).toEqual(['org-1'])
    expect(search.body.person_titles).toEqual(['Head of Product'])
  })
})

describe('honest misses cost nothing extra', () => {
  it('stops at no_company when Apollo cannot resolve the name', async () => {
    const calls = stubApollo({ companies: { organizations: [] } })

    const [result] = await enrichLeads(grant, [lead()])

    expect(result).toEqual({ leadId: 'l1', outcome: 'no_company' })
    // Never proceeds to the paid reveal.
    expect(calls.some(c => c.path.includes('people/match'))).toBe(false)
  })

  it('stops at no_person when nobody at that company has an email on file', async () => {
    // has_email:false is the whole reason step 2 exists — revealing this person would burn a
    // credit to learn nothing.
    const calls = stubApollo({ companies: ORG_FOUND, people: { people: [{ id: 'per-9', has_email: false }] } })

    const [result] = await enrichLeads(grant, [lead()])

    expect(result).toMatchObject({ leadId: 'l1', outcome: 'no_person', apolloOrgId: 'org-1' })
    expect(calls.some(c => c.path.includes('people/match'))).toBe(false)
  })

  it('reports no_email when the reveal comes back empty, keeping the ids it learned', async () => {
    stubApollo({ companies: ORG_FOUND, people: PERSON_FOUND, match: { person: { name: 'Dana' } } })

    const [result] = await enrichLeads(grant, [lead()])

    expect(result).toMatchObject({
      leadId: 'l1', outcome: 'no_email', apolloOrgId: 'org-1', apolloPersonId: 'per-1',
    })
  })

  it('one lead failing never loses the rest of a paid-for batch', async () => {
    let call = 0
    global.fetch = jest.fn(async (url: unknown) => {
      call++
      if (call === 1) throw new Error('network blip')
      const path = String(url)
      const pick = path.includes('mixed_companies/search') ? ORG_FOUND
        : path.includes('mixed_people/api_search') ? PERSON_FOUND : MATCH_FOUND
      return { ok: true, json: async () => pick } as unknown as Response
    }) as unknown as typeof fetch

    const results = await enrichLeads(grant, [
      lead({ id: 'l1', company: 'Fails Ltd' }),
      lead({ id: 'l2', company: 'Acme Corp' }),
    ])

    expect(results[0]).toEqual({ leadId: 'l1', outcome: 'error' })
    expect(results[1].outcome).toBe('found')
  })
})

describe('cost control', () => {
  it('resolves each company once, however many leads sit at it', async () => {
    // Company resolution is the per-page credit charge. Three leads at Acme must not pay
    // three times.
    const calls = stubApollo({ companies: ORG_FOUND, people: PERSON_FOUND, match: MATCH_FOUND })

    await enrichLeads(grant, [
      lead({ id: 'l1', title: 'CTO' }),
      lead({ id: 'l2', title: 'VP Engineering' }),
      lead({ id: 'l3', company: 'acme corp', title: 'Head of Data' }), // case-insensitive
    ])

    expect(calls.filter(c => c.path.includes('mixed_companies/search'))).toHaveLength(1)
    expect(calls.filter(c => c.path.includes('mixed_people/api_search'))).toHaveLength(3)
  })

  it('skips company resolution entirely when the lead already knows its org', async () => {
    // The whole point of caching apollo_org_id on the row: re-enrichment never re-pays.
    const calls = stubApollo({ people: PERSON_FOUND, match: MATCH_FOUND })

    await enrichLeads(grant, [lead({ apolloOrgId: 'org-cached' })])

    expect(calls.some(c => c.path.includes('mixed_companies/search'))).toBe(false)
    const search = calls.find(c => c.path.includes('mixed_people/api_search'))!
    expect(search.body.organization_ids).toEqual(['org-cached'])
  })
})
