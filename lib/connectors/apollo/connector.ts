/**
 * Apollo.io — the SIXTH Connector, and the first that acquires DATA rather than sending a message.
 *
 * ⚠️ THE SPINE, SLICE 2 (docs/AGI_ACTIONS_PRD.md). Slice 1 gave Actions somewhere to write leads;
 * this gives those leads real, named people with verified work emails. It closes the half of the
 * founder's complaint slice 1 deliberately left open: *"I need to get the email of that guy."*
 *
 * Same shape as `posthog/connector.ts` and `gmail/read.ts`: `Connector` is implemented for
 * lifecycle purposes only (so the grant/vault/revoke machinery is reused unchanged), `send()`
 * honestly refuses, and the real capability is a plain exported function beside it. The
 * `ConnectorRequest` contract is email-shaped and cannot express "find a person" — see the PRD's
 * root cause #1. Generalising it is a later slice; this one works within it, as posthog does.
 *
 * ⚠️ FOUNDER-TRIGGERED ONLY, and that is a safety property, not a UX choice. Every call here
 * spends the founder's Apollo credits, and ADR-004 names *spend* as requiring a checkpoint.
 * Nothing in the Operating Rhythm may call these functions; the founder clicks, having been shown
 * the estimated cost. If a future Action ever wants to enrich autonomously, that needs ADR-004
 * revisited first — not a quiet import of this module.
 */

import { withCircuitBreaker } from '@/lib/circuit-breaker'
import { log } from '@/lib/logger'
import type { Connector, ConnectorOutcome, ConnectorRequest, ResolvedGrant } from '../types'

const API = 'https://api.apollo.io/api/v1'
const TIMEOUT_MS = 20_000

/** One lead as this module needs to see it — deliberately not the DB row type. */
export interface EnrichableLead {
  id: string
  company: string
  title: string | null
  apolloOrgId: string | null
}

export interface EnrichmentResult {
  leadId: string
  /** `found` — a real person with a work email. `no_person` / `no_company` / `no_email` are
   *  honest misses, not errors: Apollo genuinely may not have this person. */
  outcome: 'found' | 'no_company' | 'no_person' | 'no_email' | 'error'
  contactName?: string
  email?: string
  apolloOrgId?: string
  apolloPersonId?: string
}

async function apolloPost(grant: ResolvedGrant, path: string, body: unknown): Promise<unknown> {
  return withCircuitBreaker('apollo_io', async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          // Apollo authenticates by API key. `accessToken` carries it — see ./oauth.ts on why
          // the durable credential and the live one are the same string here.
          'x-api-key': grant.accessToken,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        throw new Error(`apollo ${path} failed with ${res.status}`)
      }
      return await res.json()
    } finally {
      clearTimeout(timer)
    }
  })
}

/**
 * Step 1 — company name → Apollo organization id.
 *
 * ⚠️ WHY THIS STEP EXISTS RATHER THAN ASKING THE MODEL FOR A DOMAIN. Apollo's people search
 * filters by domain or organization id, never by a free-text company name. The tempting shortcut
 * is to have the AI emit "acme.com" alongside the company — but a hallucinated domain aims real
 * outreach at the wrong company's staff. Apollo resolving its own data has no such failure mode.
 * Costs 1 credit per page; callers dedupe by company so five leads at one company pay once.
 */
export async function resolveOrganization(grant: ResolvedGrant, company: string): Promise<string | null> {
  const data = await apolloPost(grant, '/mixed_companies/search', {
    q_organization_name: company,
    per_page: 1,
    page: 1,
  }) as { organizations?: Array<{ id?: string }> }
  return data.organizations?.[0]?.id ?? null
}

/**
 * Step 2 — organization + role → a candidate person id. Free (0 credits), and returns no email:
 * Apollo obfuscates the last name and only tells us whether an email EXISTS (`has_email`).
 * Filtering on that here is what keeps step 3 from spending a credit on a person with no email.
 */
export async function findPersonAtOrganization(
  grant: ResolvedGrant,
  organizationId: string,
  title: string | null,
): Promise<string | null> {
  const data = await apolloPost(grant, '/mixed_people/api_search', {
    organization_ids: [organizationId],
    ...(title ? { person_titles: [title] } : {}),
    per_page: 5,
    page: 1,
  }) as { people?: Array<{ id?: string; has_email?: boolean }> }

  return data.people?.find(p => p.has_email && p.id)?.id ?? null
}

/**
 * Step 3 — person id → real name + work email. The only reliably credit-spending call
 * (1 credit when it finds something; 0 when it doesn't).
 *
 * ⚠️ `reveal_personal_emails` IS DELIBERATELY NOT SET. We want the work address, which
 * `person.email` returns by default. Personal emails cost extra AND are withheld in GDPR regions,
 * so asking for them would pay more for data we often can't have and shouldn't want for B2B
 * outreach.
 */
export async function revealPerson(
  grant: ResolvedGrant,
  personId: string,
): Promise<{ name: string; email: string } | null> {
  const data = await apolloPost(grant, '/people/match', { id: personId }) as {
    person?: { name?: string; first_name?: string; last_name?: string; email?: string }
  }
  const person = data.person
  if (!person?.email) return null
  const name = person.name?.trim()
    || [person.first_name, person.last_name].filter(Boolean).join(' ').trim()
  return { name: name || person.email, email: person.email }
}

/**
 * Enrich a batch, deduping company lookups so a batch at one company pays for one org search.
 *
 * Never throws for one lead's failure — a batch where Apollo doesn't know two of eight companies
 * should still enrich the other six. Each lead reports its own honest outcome.
 */
export async function enrichLeads(
  grant: ResolvedGrant,
  leads: readonly EnrichableLead[],
): Promise<EnrichmentResult[]> {
  const orgCache = new Map<string, string | null>()
  const results: EnrichmentResult[] = []

  for (const lead of leads) {
    try {
      const key = lead.company.trim().toLowerCase()
      let orgId = lead.apolloOrgId
      if (!orgId) {
        if (!orgCache.has(key)) orgCache.set(key, await resolveOrganization(grant, lead.company))
        orgId = orgCache.get(key) ?? null
      }
      if (!orgId) { results.push({ leadId: lead.id, outcome: 'no_company' }); continue }

      const personId = await findPersonAtOrganization(grant, orgId, lead.title)
      if (!personId) { results.push({ leadId: lead.id, outcome: 'no_person', apolloOrgId: orgId }); continue }

      const person = await revealPerson(grant, personId)
      if (!person) {
        results.push({ leadId: lead.id, outcome: 'no_email', apolloOrgId: orgId, apolloPersonId: personId })
        continue
      }

      results.push({
        leadId: lead.id,
        outcome: 'found',
        contactName: person.name,
        email: person.email,
        apolloOrgId: orgId,
        apolloPersonId: personId,
      })
    } catch (err) {
      log.warn('apollo enrichment failed for one lead', { leadId: lead.id, err: (err as Error)?.message })
      results.push({ leadId: lead.id, outcome: 'error' })
    }
  }

  return results
}

/** Cheap authenticated call used to verify a pasted key before it is stored. 0 credits. */
export async function verifyApolloKey(apiKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/mixed_people/api_search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache', 'x-api-key': apiKey },
      body: JSON.stringify({ per_page: 1, page: 1 }),
    })
    return res.ok
  } catch {
    return false
  }
}

export const apolloConnector: Connector = {
  provider: 'apollo',
  // Not OAuth scopes — Apollo's API key carries whatever the founder's plan allows. Listed for
  // the founder-facing panel's benefit, and to keep the Connector contract honest about what
  // this connection is permitted to do.
  scopes: ['people:read', 'organizations:read'],

  async send(_grant: ResolvedGrant, _request: ConnectorRequest): Promise<ConnectorOutcome> {
    return { status: 'rejected', reason: 'this connection only reads Apollo lead data, it cannot send' }
  },

  async reconcile(): Promise<boolean | null> {
    return null
  },

  async revoke(_grant: ResolvedGrant): Promise<void> {
    // Apollo has no token-revocation endpoint — an API key is revoked by the founder deleting it
    // in Apollo's own dashboard. Deliberately does NOT throw: `grants.ts` aborts the whole
    // disconnect if this throws, which would trap a founder who wants to disconnect. Deleting our
    // vaulted copy (which happens immediately after this returns) is the meaningful action on our
    // side — same reasoning posthog's revoke documents for its own missing endpoint.
    log.info('apollo revoke: no provider-side revocation exists; deleting our stored key')
  },
}
