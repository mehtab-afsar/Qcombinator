/**
 * The pre-launch signup gate — who may bring an account into existence while the product is
 * still in development.
 *
 * Two properties carry the weight, and neither is about the happy path:
 *
 *  1. IT FAILS CLOSED. No configuration at all means signup is shut. The failure worth designing
 *     against is "we thought it was gated and it wasn't", not "we locked ourselves out" — the
 *     second is visible in seconds, the first is invisible until strangers are inside.
 *
 *  2. THE ALLOWLIST IS SERVER-ONLY. It holds real people's email addresses. A NEXT_PUBLIC_ name
 *     would inline them into the JS bundle for anyone to read, so the test asserts on the
 *     variable NAME, not just the behaviour.
 */

import { readFileSync } from 'fs'
import { join } from 'path'
import { isSignupOpen, signupAllowed } from '@/lib/auth/signup-access'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

// No module reset needed: both functions read process.env inside their own body, so changing
// the environment between tests is enough.
const ORIGINAL = { ...process.env }
afterEach(() => { process.env = { ...ORIGINAL } })

describe('it fails closed', () => {
  it('⚠️ no configuration at all means NOBODY can sign up', () => {
    delete process.env.SIGNUP_MODE
    delete process.env.SIGNUP_ALLOWLIST
        expect(isSignupOpen()).toBe(false)
    expect(signupAllowed('stranger@example.com')).toBe(false)
  })

  it('a typo in the mode does not accidentally open it', () => {
    for (const mode of ['OPEN ', 'true', '1', 'yes', 'opened', '']) {
      process.env.SIGNUP_MODE = mode
      // Only the exact word, case- and whitespace-insensitive, counts.
      const expected = mode.trim().toLowerCase() === 'open'
      expect(isSignupOpen()).toBe(expected)
    }
  })

  it('an empty or malformed email is refused, never waved through', () => {
    process.env.SIGNUP_ALLOWLIST = 'dana@acme.com'
        expect(signupAllowed('')).toBe(false)
    expect(signupAllowed('   ')).toBe(false)
    expect(signupAllowed(null)).toBe(false)
    expect(signupAllowed(undefined)).toBe(false)
  })
})

describe('the allowlist', () => {
  beforeEach(() => { delete process.env.SIGNUP_MODE })

  it('lets an allowed address through and refuses everyone else', () => {
    process.env.SIGNUP_ALLOWLIST = 'dana@acme.com, sam@globex.io'
    
    expect(signupAllowed('dana@acme.com')).toBe(true)
    expect(signupAllowed('sam@globex.io')).toBe(true)
    expect(signupAllowed('stranger@example.com')).toBe(false)
  })

  it('ignores case and stray whitespace, which is how a pasted list actually arrives', () => {
    process.env.SIGNUP_ALLOWLIST = '  Dana@Acme.com ,, sam@globex.io  '
    
    expect(signupAllowed('DANA@ACME.COM')).toBe(true)
    expect(signupAllowed(' dana@acme.com ')).toBe(true)
    expect(signupAllowed('sam@globex.io')).toBe(true)
  })

  it('matches whole addresses only — no substring or domain slippage', () => {
    process.env.SIGNUP_ALLOWLIST = 'dana@acme.com'
    
    expect(signupAllowed('evil-dana@acme.com')).toBe(false)
    expect(signupAllowed('dana@acme.com.evil.net')).toBe(false)
    expect(signupAllowed('acme.com')).toBe(false)
  })

  it('once launched, everyone is in and the list stops mattering', () => {
    process.env.SIGNUP_MODE = 'open'
    process.env.SIGNUP_ALLOWLIST = ''
    expect(signupAllowed('anyone@example.com')).toBe(true)
  })
})

describe('the list never reaches the browser', () => {
  it('⚠️ is not a NEXT_PUBLIC_ variable — those are inlined into the JS bundle', () => {
    const src = read('lib/auth/signup-access.ts')
    expect(src).toContain('process.env.SIGNUP_ALLOWLIST')
    expect(src).not.toContain('NEXT_PUBLIC_SIGNUP_ALLOWLIST')
    expect(src).not.toMatch(/NEXT_PUBLIC_[A-Z_]*ALLOW/)
  })

  it('nothing in the client bundle reads the allowlist', () => {
    // The landing page receives a resolved boolean from the server, never the list itself.
    for (const f of [
      'features/landing/components/LandingPage.tsx',
      'features/landing/components/Nav.tsx',
      'features/landing/components/Pricing.tsx',
      'features/landing/components/FinalCta.tsx',
    ]) {
      expect(read(f)).not.toContain('SIGNUP_ALLOWLIST')
    }
  })
})

describe('every route that can create an account is gated', () => {
  // The whole point: gating only /api/auth/signup would leave "Continue with Google" wide open,
  // because the OAuth callback writes a founder_profiles stub without ever passing through it.
  const GATED = [
    'app/api/auth/signup/route.ts',
    'app/api/auth/investor-signup/route.ts',
    'app/auth/callback/route.ts',
    'app/api/investor/onboarding/route.ts',
  ]

  it.each(GATED)('%s calls the shared gate', file => {
    expect(read(file)).toContain("from '@/lib/auth/signup-access'")
    expect(read(file)).toContain('signupAllowed(')
  })

  it('the password routes refuse BEFORE creating the auth user', () => {
    for (const file of ['app/api/auth/signup/route.ts', 'app/api/auth/investor-signup/route.ts']) {
      const src = read(file)
      expect(src.indexOf('signupAllowed(')).toBeLessThan(src.indexOf('auth.admin.createUser'))
    }
  })

  it('the OAuth callback signs a refused newcomer out rather than leaving them a session', () => {
    // Google mints the session before this route runs; redirecting away without signing out
    // would leave them holding valid cookies for a profile-creating API.
    const src = read('app/auth/callback/route.ts')
    const gate = src.slice(src.indexOf('!signupAllowed('))
    expect(gate.slice(0, 300)).toContain('signOut()')
  })

  it('the OAuth gate refuses only NEW people — an existing account still signs in', () => {
    // Including the dual-role founder who also invests, which the branch below it supports.
    const src = read('app/auth/callback/route.ts')
    expect(src).toContain('!investorProfile && !founderProfile && !signupAllowed(user.email)')
  })

  it('no route logs the email address itself', () => {
    // CLAUDE.md §3 — no PII in logs. The domain is enough to tell a stranger from a typo.
    for (const file of GATED) {
      const src = read(file)
      const refusals = src.split('\n').filter(l => l.includes('pre-launch gate') && l.includes('log.'))
      for (const line of refusals) expect(line).not.toMatch(/\{\s*email\s*\}/)
    }
  })
})
