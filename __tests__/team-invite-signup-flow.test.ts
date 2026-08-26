/**
 * A team invite for someone with no Edge Alpha account yet was a dead end.
 *
 * Two compounding bugs, hit by actually clicking through a real invite email:
 *
 * 1. middleware.ts redirected an unauthenticated visitor to /founder/join (a protected route by
 *    default) straight to /login — losing the ?teamToken= query string in the process, since it
 *    built the `next` redirect param from `pathname` alone, not pathname + search. The invite
 *    page's own logic (which already handles a logged-out visitor correctly) never got to run.
 *
 * 2. Both the invite page and the login page's "no account yet" path pointed at `/signup` — a
 *    route that has never existed in this app (a straight 404). The real account-creation form is
 *    `app/founder/onboarding/page.tsx`, which — even once linked correctly — didn't read
 *    ?teamToken= from the URL at all, so it always ran the normal "create your own company" flow.
 *    The backend (app/api/auth/signup/route.ts) already had correct join-not-create logic gated
 *    on `teamToken` being present in the request body; the frontend just never sent it.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('middleware preserves the query string when bouncing an unauthenticated request to login', () => {
  const src = read('middleware.ts')

  it('builds the next= param from pathname + search, not pathname alone', () => {
    expect(src).toContain("loginUrl.searchParams.set('next', pathname + request.nextUrl.search)")
  })

  it('the old query-string-dropping version is gone', () => {
    expect(src).not.toContain("loginUrl.searchParams.set('next', pathname)")
  })
})

describe('/founder/join is reachable without being logged in, same as /investor/join', () => {
  const src = read('middleware.ts')

  it('is listed in PUBLIC_PREFIXES', () => {
    const idx = src.indexOf('const PUBLIC_PREFIXES')
    const block = src.slice(idx, idx + 200)
    expect(block).toContain("'/founder/join'")
    expect(block).toContain("'/investor/join'")
  })
})

describe('a logged-out invitee is sent to the real onboarding form, not the nonexistent /signup route', () => {
  const src = read('app/founder/join/page.tsx')

  it('no reference to /signup remains', () => {
    expect(src).not.toContain('/signup?teamToken=')
  })

  it('both the auto-redirect and the "create an account first" link point at /founder/onboarding', () => {
    const matches = src.match(/\/founder\/onboarding\?teamToken=/g) ?? []
    expect(matches.length).toBe(2)
  })
})

describe('the onboarding form reads teamToken from the URL and forwards it on signup', () => {
  const src = read('app/founder/onboarding/page.tsx')

  it('reads teamToken via useSearchParams', () => {
    expect(src).toContain("const teamToken = searchParams.get('teamToken')")
  })

  it('is wrapped in Suspense — required for useSearchParams in the App Router', () => {
    expect(src).toContain('<Suspense>')
    expect(src).toContain('<FounderOnboardingForm />')
  })

  it('the email/password signup body includes teamToken when present', () => {
    const idx = src.indexOf('email: form.email.trim()')
    const block = src.slice(idx, idx + 700)
    expect(block).toContain('...(teamToken ? { teamToken } : {})')
  })
})
