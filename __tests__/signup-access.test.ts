/**
 * The pre-launch signup gate — who may bring an account into existence while the product is
 * still in development, and how it is flipped without a deploy.
 *
 * Three properties carry the weight, and none of them is the happy path:
 *
 *  1. IT FAILS CLOSED, at every step. No row, an unreadable row, a thrown client, a blank email
 *     — all mean "no". The failure worth designing against is "we thought it was gated and it
 *     wasn't": invisible until strangers are inside, where locking ourselves out is obvious in
 *     seconds.
 *
 *  2. THE ALLOWLIST NEVER REACHES THE BROWSER. It is other people's email addresses.
 *
 *  3. EVERY ACCOUNT-CREATING ROUTE IS GATED — four of them. Gating only /api/auth/signup would
 *     leave "Continue with Google" wide open, since the OAuth callback writes a profile itself.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

// ─── The settings row, faked ────────────────────────────────────────────────
// One chainable stub standing in for the service-role client, so each test states exactly what
// the database returned — including the failure shapes, which are the interesting ones.

type Row = { signup_open: boolean; signup_allowlist: string } | null
let result: { data: Row; error: { message: string } | null } = { data: null, error: null }
let throws = false

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => {
    if (throws) throw new Error('no service role key')
    return {
      from: () => ({ select: () => ({ maybeSingle: async () => result }) }),
    }
  },
}))

import { isSignupOpen, signupAllowed } from '@/lib/auth/signup-access'

const row = (over: Partial<NonNullable<Row>> = {}) => {
  result = { data: { signup_open: false, signup_allowlist: '', ...over }, error: null }
}

beforeEach(() => {
  throws = false
  result = { data: null, error: null }
})

describe('it fails closed', () => {
  it('⚠️ no settings row at all means NOBODY can sign up', () => {
    // The state right after the migration, and after any accident that empties the table.
    return Promise.all([
      expect(isSignupOpen()).resolves.toBe(false),
      expect(signupAllowed('stranger@example.com')).resolves.toBe(false),
    ])
  })

  it('⚠️ a database error means closed — never open', async () => {
    result = { data: null, error: { message: 'connection refused' } }
    await expect(isSignupOpen()).resolves.toBe(false)
    await expect(signupAllowed('dana@acme.com')).resolves.toBe(false)
  })

  it('⚠️ a thrown client means closed, not a 500 in the middle of signup', async () => {
    throws = true
    await expect(isSignupOpen()).resolves.toBe(false)
    await expect(signupAllowed('dana@acme.com')).resolves.toBe(false)
  })

  it('an empty or malformed email is refused, never waved through', async () => {
    row({ signup_allowlist: 'dana@acme.com' })
    await expect(signupAllowed('')).resolves.toBe(false)
    await expect(signupAllowed('   ')).resolves.toBe(false)
    await expect(signupAllowed(null)).resolves.toBe(false)
    await expect(signupAllowed(undefined)).resolves.toBe(false)
  })

  it('a non-boolean in the open column is not truthy-coerced into "open"', async () => {
    // Reading a column as `=== true` rather than trusting it, because this one decides whether
    // the product is public.
    result = { data: { signup_open: 'yes' as unknown as boolean, signup_allowlist: '' }, error: null }
    await expect(isSignupOpen()).resolves.toBe(false)
  })
})

describe('the allowlist', () => {
  it('lets an allowed address through and refuses everyone else', async () => {
    row({ signup_allowlist: 'dana@acme.com, sam@globex.io' })
    await expect(signupAllowed('dana@acme.com')).resolves.toBe(true)
    await expect(signupAllowed('sam@globex.io')).resolves.toBe(true)
    await expect(signupAllowed('stranger@example.com')).resolves.toBe(false)
  })

  it('ignores case and stray whitespace, which is how a pasted list actually arrives', async () => {
    row({ signup_allowlist: '  Dana@Acme.com ,, sam@globex.io  ' })
    await expect(signupAllowed('DANA@ACME.COM')).resolves.toBe(true)
    await expect(signupAllowed(' dana@acme.com ')).resolves.toBe(true)
    await expect(signupAllowed('sam@globex.io')).resolves.toBe(true)
  })

  it('matches whole addresses only — no substring or domain slippage', async () => {
    row({ signup_allowlist: 'dana@acme.com' })
    await expect(signupAllowed('evil-dana@acme.com')).resolves.toBe(false)
    await expect(signupAllowed('dana@acme.com.evil.net')).resolves.toBe(false)
    await expect(signupAllowed('acme.com')).resolves.toBe(false)
  })

  it('once the toggle is on, everyone is in and the list stops mattering', async () => {
    row({ signup_open: true, signup_allowlist: '' })
    await expect(isSignupOpen()).resolves.toBe(true)
    await expect(signupAllowed('anyone@example.com')).resolves.toBe(true)
  })
})

describe('the toggle takes effect without a deploy', () => {
  it('a flip between two calls changes the answer — nothing is cached', async () => {
    // The whole reason this moved out of environment variables. A cached read would make the
    // switch appear not to work, which is precisely the confusion it exists to prevent.
    row({ signup_open: false })
    await expect(isSignupOpen()).resolves.toBe(false)
    row({ signup_open: true })
    await expect(isSignupOpen()).resolves.toBe(true)
  })

  it('reads no environment variable — the row is the single source of truth', () => {
    const src = read('lib/auth/signup-access.ts')
    expect(src).not.toContain('process.env.SIGNUP_MODE')
    expect(src).not.toContain('process.env.SIGNUP_ALLOWLIST')
    expect(src).toContain("from('app_settings')")
  })

  it('the landing page re-renders on a timer, or a stale CTA would outlive the flip', () => {
    const src = read('app/page.tsx')
    expect(src).toMatch(/export const revalidate = \d+/)
    expect(src).toContain('await isSignupOpen()')
  })
})

describe('the list never reaches the browser', () => {
  it('⚠️ the settings table is service-role only — RLS on, no policies', () => {
    const sql = read('supabase/migrations/20260827000002_app_settings.sql')
    expect(sql).toContain('enable row level security')
    // A policy here would be the bug: it would hand founders the allowlist, or the flag.
    expect(sql).not.toMatch(/create policy/i)
  })

  it('exactly one row is possible, so there is never a second opinion', () => {
    const sql = read('supabase/migrations/20260827000002_app_settings.sql')
    expect(sql).toContain('boolean primary key default true check (id)')
  })

  it('the migration cannot itself open signup', () => {
    const sql = read('supabase/migrations/20260827000002_app_settings.sql')
    expect(sql).toContain('signup_open       boolean not null default false')
  })

  it('nothing in the client bundle reads the allowlist', () => {
    // The landing page receives a resolved boolean from the server, never the list itself.
    for (const f of [
      'features/landing/components/LandingPage.tsx',
      'features/landing/components/Nav.tsx',
      'features/landing/components/Pricing.tsx',
      'features/landing/components/FinalCta.tsx',
    ]) {
      expect(read(f)).not.toContain('allowlist')
      expect(read(f)).not.toContain('app_settings')
    }
  })
})

describe('every route that can create an account is gated', () => {
  const GATED = [
    'app/api/auth/signup/route.ts',
    'app/api/auth/investor-signup/route.ts',
    'app/auth/callback/route.ts',
    'app/api/investor/onboarding/route.ts',
  ]

  it.each(GATED)('%s calls the shared gate, and awaits it', file => {
    const src = read(file)
    expect(src).toContain("from '@/lib/auth/signup-access'")
    // `if (!signupAllowed(...))` on a promise is always false — it would silently admit everyone.
    expect(src).toContain('await signupAllowed(')
    expect(src).not.toMatch(/!signupAllowed\(/)
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
    const gate = src.slice(src.indexOf('await signupAllowed('))
    expect(gate.slice(0, 300)).toContain('signOut()')
  })

  it('the OAuth gate refuses only NEW people — an existing account still signs in', () => {
    // Including the dual-role founder who also invests, which the branch below it supports.
    const src = read('app/auth/callback/route.ts')
    expect(src).toContain('!investorProfile && !founderProfile && !(await signupAllowed(user.email))')
  })

  it('no route logs the email address itself', () => {
    // CLAUDE.md §3 — no PII in logs. The domain is enough to tell a stranger from a typo.
    for (const file of GATED) {
      const refusals = read(file).split('\n').filter(l => l.includes('pre-launch gate') && l.includes('log.'))
      for (const line of refusals) expect(line).not.toMatch(/\{\s*email\s*\}/)
    }
  })
})
