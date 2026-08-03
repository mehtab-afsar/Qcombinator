/**
 * Email verification existed as infrastructure — send, resend, consume-token, a status
 * endpoint, even a dismissible banner — but nothing actually BLOCKED access. A founder who
 * signed up with a stranger's email had the exact same dashboard as one who'd verified;
 * clicking the confirmation link was cosmetic.
 *
 * These pin the actual gate: middleware must check founder_profiles.email_confirmed_at on every
 * /founder/** page, not just the dashboard root, and the redirect target must itself be exempt
 * from the gate — otherwise an unconfirmed founder has no page that will load at all.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('middleware actually blocks an unconfirmed founder', () => {
  const src = read('middleware.ts')

  it('checks email_confirmed_at, not just role', () => {
    expect(src).toContain('email_confirmed_at')
    expect(src).toMatch(/if\s*\(\s*!fp\.email_confirmed_at\s*\)/)
  })

  it('redirects an unconfirmed founder to /founder/verify-email', () => {
    const i = src.indexOf('if (!fp.email_confirmed_at)')
    const gate = src.slice(i, i + 500)
    expect(gate).toContain("'/founder/verify-email'")
  })

  it('the check runs on every /founder/** page, not only the dashboard root', () => {
    // The bug this replaces: `pathname === '/founder/dashboard' || pathname === '/founder'`
    // scoped the WHOLE role+confirmation check to one page. A founder could be blocked on
    // /founder/dashboard and still load every other founder page freely.
    expect(src).toMatch(/pathname === '\/founder' \|\| pathname\.startsWith\('\/founder\/'\)/)
  })

  it('verify-email is exempt from its own gate — or nothing can ever unblock', () => {
    expect(src).toContain('CONFIRMATION_GATE_EXEMPT')
    const exemptList = src.slice(src.indexOf('CONFIRMATION_GATE_EXEMPT = ['), src.indexOf(']', src.indexOf('CONFIRMATION_GATE_EXEMPT = [')))
    expect(exemptList).toContain('/founder/verify-email')
    // And the gate condition must actually consult it, not just declare it unused.
    expect(src).toMatch(/!CONFIRMATION_GATE_EXEMPT\.includes\(pathname\)/)
  })
})

describe('an OAuth founder never sees the gate', () => {
  it('/auth/callback marks the email confirmed immediately, before onboarding starts', () => {
    const src = read('app/auth/callback/route.ts')
    // Set alongside the stub insert, not as a follow-up — there must be no window where a
    // fresh OAuth founder is (briefly or otherwise) treated as unconfirmed.
    expect(src).toContain('email_confirmed_at:   now')
  })
})

describe('the onboarding form routes each path to the right next step', () => {
  const src = read('app/founder/onboarding/page.tsx')

  it('a completed email/password sign-up is sent to verify-email, not straight into the product', () => {
    const finish = src.slice(src.indexOf("router.push(isOAuthUser"), src.indexOf("router.push(isOAuthUser") + 120)
    expect(finish).toContain("'/founder/verify-email'")
  })

  it('an OAuth founder — already verified by Google — is not sent through the same gate', () => {
    const finish = src.slice(src.indexOf("router.push(isOAuthUser"), src.indexOf("router.push(isOAuthUser") + 120)
    expect(finish).toContain("'/founder/getting-started'")
  })
})

describe('the verify-email page', () => {
  const src = read('app/founder/verify-email/page.tsx')

  it('polls status rather than requiring a manual refresh', () => {
    // The confirmation link opens in a NEW tab — this one has to notice on its own.
    expect(src).toMatch(/setInterval\(check,\s*POLL_MS\)/)
  })

  it('moves on automatically once confirmed', () => {
    expect(src).toMatch(/emailConfirmed\)[\s\S]{0,300}router\.replace\('\/founder\/getting-started'\)/)
  })

  it('offers resend through the existing endpoint, not a new one', () => {
    expect(src).toContain("fetch('/api/auth/resend-confirmation'")
  })

  it('gives an unconfirmed founder a way out if they used the wrong address', () => {
    expect(src).toMatch(/signOut\(\)/)
  })
})

describe('email-status reports what the verify-email page needs to render', () => {
  const src = read('app/api/founder/email-status/route.ts')

  it('returns the address being verified, not just a boolean', () => {
    expect(src).toMatch(/email:\s*auth\.user\.email/)
  })
})
