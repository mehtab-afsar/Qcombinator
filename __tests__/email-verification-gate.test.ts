/**
 * Email verification existed as infrastructure — send, resend, consume-token, a status
 * endpoint, even a dismissible banner — but nothing actually BLOCKED access. A founder who
 * signed up with a stranger's email had the exact same dashboard as one who'd verified;
 * clicking the confirmation link was cosmetic. Investors had no block at all.
 *
 * These pin the actual gate: middleware must check Supabase's own user.email_confirmed_at
 * (lib/auth/email-confirmed.ts) on every /founder/** and /investor/** page, not just a
 * dashboard root, and each redirect target must itself be exempt from the gate — otherwise an
 * unconfirmed user has no page that will load at all.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('middleware actually blocks an unconfirmed founder', () => {
  const src = read('middleware.ts')

  it('checks isEmailConfirmed(user), not just role', () => {
    expect(src).toContain('isEmailConfirmed')
    expect(src).toMatch(/if\s*\(\s*!isEmailConfirmed\(user\)\s*\)/)
  })

  it('redirects an unconfirmed founder to /founder/verify-email', () => {
    const i = src.indexOf("return NextResponse.redirect(new URL('/founder/onboarding', request.url))")
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

describe('middleware blocks an unconfirmed investor the same way (previously it did not at all)', () => {
  const src = read('middleware.ts')

  it('investor verify-email is in the same exemption list as founder', () => {
    const exemptList = src.slice(src.indexOf('CONFIRMATION_GATE_EXEMPT = ['), src.indexOf(']', src.indexOf('CONFIRMATION_GATE_EXEMPT = [')))
    expect(exemptList).toContain('/investor/verify-email')
  })

  it('the investor branch redirects to /investor/verify-email when unconfirmed', () => {
    const i = src.indexOf("pathname === '/investor' || pathname.startsWith('/investor/')")
    const gate = src.slice(i, i + 700)
    expect(gate).toMatch(/if\s*\(\s*!isEmailConfirmed\(user\)\s*\)/)
    expect(gate).toContain("'/investor/verify-email'")
  })
})

describe('lib/auth/email-confirmed.ts is the one place this fact is read', () => {
  const src = read('lib/auth/email-confirmed.ts')

  it('reads Supabase\'s native email_confirmed_at, not a hand-rolled column', () => {
    expect(src).toMatch(/email_confirmed_at/)
  })
})

describe('an OAuth founder never sees the gate', () => {
  it('/auth/callback does not manually stamp email_confirmed_at — Supabase already marks a Google sign-in confirmed natively', () => {
    const src = read('app/auth/callback/route.ts')
    // The old version hand-stamped this on the stub profile insert; that stamping is gone
    // because the gate now reads the Supabase auth user directly, which Google sign-ins are
    // already confirmed on by the time this route runs. If this string reappears, the two
    // signals (custom stamp vs. Supabase-native) have drifted apart again.
    expect(src).not.toContain('email_confirmed_at:')
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

describe.each([
  ['founder', 'app/founder/verify-email/page.tsx', '/founder/getting-started'],
  ['investor', 'app/investor/verify-email/page.tsx', '/investor/dashboard'],
])('the %s verify-email page', (_role, path, nextRoute) => {
  const src = read(path)

  it('polls status rather than requiring a manual refresh', () => {
    // The confirmation link opens in a NEW tab — this one has to notice on its own.
    expect(src).toMatch(/setInterval\(check,\s*POLL_MS\)/)
  })

  it('moves on automatically once confirmed', () => {
    const pattern = new RegExp(`emailConfirmed\\)[\\s\\S]{0,300}router\\.replace\\('${nextRoute.replace('/', '\\/')}'\\)`)
    expect(src).toMatch(pattern)
  })

  it('offers resend through the shared endpoint, not a role-specific one', () => {
    expect(src).toContain("fetch('/api/auth/resend-confirmation'")
  })

  it('gives an unconfirmed user a way out if they used the wrong address', () => {
    expect(src).toMatch(/signOut\(\)/)
  })

  it('checks status through the one shared endpoint, not a role-specific one', () => {
    expect(src).toContain("fetch('/api/auth/email-status')")
  })
})

describe('email-status reports what the verify-email pages need — one endpoint for both roles', () => {
  const src = read('app/api/auth/email-status/route.ts')

  it('returns the address being verified, not just a boolean', () => {
    expect(src).toMatch(/email:\s*auth\.user\.email/)
  })

  it('has no role-specific table lookup left — confirmation lives on the Supabase user', () => {
    expect(src).not.toContain('founder_profiles')
    expect(src).not.toContain('investor_profiles')
  })
})

describe('resend-confirmation uses Supabase\'s own native resend, not a hand-rolled token', () => {
  const src = read('app/api/auth/resend-confirmation/route.ts')

  it('calls supabase.auth.resend for a signup confirmation', () => {
    expect(src).toMatch(/auth\.resend\(\s*\{\s*type:\s*'signup'/)
  })

  it('has no hand-rolled token generation left', () => {
    expect(src).not.toContain('randomUUID')
    expect(src).not.toContain('email_confirm_token')
  })
})
