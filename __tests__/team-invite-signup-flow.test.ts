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
 *
 * 3. Same gap on the Google sign-up path, which doesn't go through app/api/auth/signup at all —
 *    app/auth/callback/route.ts creates the workspace instead. It always created a fresh
 *    "Untitled Startup" for a brand-new Google sign-up with no teamToken awareness whatsoever, so
 *    "Continue with Google" on the invite-aware onboarding form still silently gave the invitee
 *    their own separate company. Fixed the same way as #2: the onboarding page's Google button now
 *    carries ?teamToken= through the OAuth redirect, and the callback route joins the inviter's
 *    workspace instead of creating a new one when it's present and valid.
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

  it('the Google button carries teamToken through the OAuth redirect', () => {
    const idx = src.indexOf("signInWithOAuth({ provider: 'google'")
    const block = src.slice(Math.max(0, idx - 300), idx + 100)
    expect(block).toContain('teamToken')
    expect(block).toContain('/auth/callback')
  })
})

describe('a brand-new Google sign-up via a team invite joins the inviter\'s workspace, not a fresh one', () => {
  const src = read('app/auth/callback/route.ts')

  it('reads teamToken from the callback URL', () => {
    expect(src).toContain("const teamToken = searchParams.get('teamToken')")
  })

  it('skips creating a default "Untitled Startup" when a teamToken is present', () => {
    const idx = src.indexOf("insert({ name: 'Untitled Startup'")
    const guard = src.slice(Math.max(0, idx - 200), idx)
    expect(guard).toContain('if (!teamToken)')
  })

  it('validates the invite (not accepted, not expired) before joining', () => {
    expect(src).toContain('!invite.accepted_at && new Date(invite.expires_at) > new Date()')
  })

  it('joins startup_members with the invited role and marks the invite accepted', () => {
    const idx = src.indexOf('team invite startup_members upsert failed')
    const block = src.slice(Math.max(0, idx - 300), idx + 600)
    expect(block).toContain('role: invite.role')
    expect(src).toContain("admin.from('team_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)")
  })
})
