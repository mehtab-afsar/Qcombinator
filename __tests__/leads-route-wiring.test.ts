/**
 * Source-scanning guards for the leads vertical — same convention as
 * __tests__/founder-contacts-route-wiring.test.ts and __tests__/action-route-wiring.test.ts.
 *
 * ⚠️ INCLUDING A DOOR GUARD, which the contacts vertical never got. `/founder/contacts` shipped
 * with exactly one reference to it in the entire repo — a static banner behind a program-panel
 * condition — and nothing in the test suite would have noticed if that one line had been deleted.
 * This codebase has that failure documented as "the door problem." `/founder/leads` has no
 * sidebar entry either (the sidebar is deliberately five items), so LeadsPanel IS its door, and
 * the door is tested.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('the leads routes are tenancy-safe', () => {
  const list = read('app/api/leads/route.ts')
  const item = read('app/api/leads/[id]/route.ts')

  it('both use the RLS-scoped client, never the service role', () => {
    // The admin client would bypass exactly the guarantee RLS provides here.
    for (const src of [list, item]) {
      expect(src).toContain("from '@/lib/supabase/server'")
      expect(src).toContain('await createClient()')
      expect(src).not.toContain('createAdminClient')
    }
  })

  it('every handler authenticates first', () => {
    for (const src of [list, item]) {
      expect(src).toContain('verifyAuth()')
    }
  })

  it('writes stamp the caller as owner and never trust a client-supplied founder_id', () => {
    expect(list).toContain('founder_id: auth.user.id')
  })

  it('mutations on one row are scoped to the caller as defense-in-depth', () => {
    // RLS already does this; the explicit .eq is the second lock.
    const scoped = item.match(/\.eq\('founder_id', auth\.user\.id\)/g) ?? []
    expect(scoped.length).toBeGreaterThanOrEqual(2) // PATCH and DELETE
  })

  it('input is validated with the shared Zod schemas, not ad hoc', () => {
    expect(list).toContain('parseBody(req, founderLeadPostSchema)')
    expect(item).toContain('parseBody(req, founderLeadPatchSchema)')
  })

  it('caps how many leads one founder can hold', () => {
    expect(list).toContain('MAX_LEADS_PER_FOUNDER')
  })
})

describe('leads never become email recipients by accident', () => {
  it('the recipient context builder reads contacts, not leads', () => {
    // THE load-bearing separation (see the founder_leads migration header). If a future change
    // points Company Context at founder_leads, an AI-invented row becomes an email recipient and
    // generate.ts's assertRecipientsInContext stops meaning anything.
    const context = read('lib/contacts/context.ts')
    expect(context).toContain('founder_contacts')
    expect(context).not.toContain('founder_leads')
  })

  it('the leads entity writer never writes an email address', () => {
    // The model is given no email field at all, deliberately — see the prompt's own rules.
    const entity = read('lib/entities/leads.ts')
    const schemaBlock = entity.slice(entity.indexOf('modelLeadSchema'), entity.indexOf('modelLeadsPayloadSchema'))
    expect(schemaBlock).not.toContain('email')
  })

  it('the prompt tells the model roles-only, never a real person or address', () => {
    const prompt = read('lib/prompts/executives/growth/actions/score-and-prioritize-leads.ts')
    expect(prompt).toMatch(/never a person/i)
    expect(prompt).toMatch(/never invent an email/i)
  })
})

describe('the door to /founder/leads exists', () => {
  it('LeadsPanel links to the full page', () => {
    const panel = read('features/executive/components/LeadsPanel.tsx')
    expect(panel).toContain('/founder/leads')
  })

  it('the executive page actually renders LeadsPanel', () => {
    // The whole failure mode this guards: a finished page with nothing linking to it. tsc and
    // the rest of the suite cannot see a missing link — only this can.
    const page = read('app/founder/executive/[executiveId]/page.tsx')
    expect(page).toContain("import { LeadsPanel }")
    expect(page).toContain('<LeadsPanel />')
  })

  it('the page itself is reachable and offers a way back', () => {
    const page = read('app/founder/leads/page.tsx')
    expect(page).toContain('/founder/executive')
  })
})
