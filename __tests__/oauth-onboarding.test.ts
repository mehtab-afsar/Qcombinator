/**
 * Every Google sign-up was skipping onboarding entirely.
 *
 * FOUND 4 Aug 2026 by actually completing real sign-ups against the live site — invisible to
 * every other check, because it's a property about which PAGE a founder lands on, not whether an
 * API call succeeds. /auth/callback stubs a founder_profiles row for every fresh OAuth sign-up on
 * purpose (onboarding_completed: false, so the founder isn't orphaned if they navigate away
 * mid-form) — and the onboarding page's own guard treated "a row exists" as "already onboarded,"
 * which is true for every OAuth sign-up the instant it lands, before a single field is filled in.
 *
 * Guards two things: the redirect check reads onboarding_completed, not row existence — and the
 * completion path for an OAuth founder can never be the account-creation route, since that route
 * tries to register their already-existing Google email a second time and collides.
 *
 * SAME BUG CLASS RECURRED 11 Aug 2026, in the two gatekeepers this file didn't yet cover:
 * /auth/callback itself (the route that CREATES the stub row) and middleware.ts's founder gate
 * (which runs on every /founder/** page). Both checked "does a founder_profiles row exist,"
 * which the stub satisfies instantly — so a repeat Google sign-in, a session refresh, or just
 * typing /founder/dashboard into the address bar mid-onboarding landed an unfinished founder on
 * the dashboard, same as before, just via a different door.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('the onboarding redirect guard checks completion, not row existence', () => {
  const src = read('app/founder/onboarding/page.tsx')

  it('reads onboarding_completed from the fetched row', () => {
    const guard = src.slice(src.indexOf('.select(\'onboarding_completed\')'), src.indexOf('.select(\'onboarding_completed\')') + 400)
    expect(guard).toContain('fp.onboarding_completed')
  })

  it('does NOT redirect to dashboard merely because a profile row exists', () => {
    // The exact bug: `if (fp) router.replace(...)` — true for every fresh OAuth stub.
    expect(src).not.toMatch(/if\s*\(\s*fp\s*\)\s*router\.replace/)
  })

  it('an unfinished OAuth founder is routed into the form, not dashboard', () => {
    const effect = src.slice(src.indexOf('useEffect(() => {\n    const sb = createClient()'))
    const guardBlock = effect.slice(0, effect.indexOf('}, [])'))
    expect(guardBlock).toMatch(/setIsOAuthUser\(true\)/)
    expect(guardBlock).toMatch(/setPage\(2\)/)
  })
})

describe('completing an OAuth profile never re-registers the account', () => {
  const src = read('app/founder/onboarding/page.tsx')

  it('branches to complete-profile for an OAuth founder, not signup', () => {
    const submit = src.slice(src.indexOf('async function handleSubmit'), src.indexOf('async function handleSubmit') + 1500)
    expect(submit).toContain("isOAuthUser ? '/api/auth/complete-profile' : '/api/auth/signup'")
  })

  it('an OAuth founder is not asked to sign in with a password they never set', () => {
    const submit = src.slice(src.indexOf('async function handleSubmit'), src.indexOf('router.push(\'/founder/getting-started\')'))
    expect(submit).toMatch(/if\s*\(\s*!isOAuthUser\s*\)\s*\{/)
  })
})

describe('the complete-profile route', () => {
  const src = read('app/api/auth/complete-profile/route.ts')

  it('requires an authenticated session', () => {
    expect(src).toContain('verifyAuth()')
  })

  it('validates the body — no raw req.json() passthrough', () => {
    expect(src).toContain('completeProfileSchema')
  })

  it('refuses to run twice for the same founder', () => {
    expect(src).toContain('existing.onboarding_completed')
  })

  it('never accepts email or password — that would mean creating a second account', () => {
    const schema = read('lib/api/validate.ts')
    const block = schema.slice(schema.indexOf('completeProfileSchema = z.object({'))
    const body = block.slice(0, block.indexOf('})'))
    expect(body).not.toMatch(/\bemail\s*:/)
    expect(body).not.toMatch(/\bpassword\s*:/)
  })
})

describe('the OAuth callback route routes on completion, not row existence', () => {
  const src = read('app/auth/callback/route.ts')

  it('selects onboarding_completed alongside the row, not just id', () => {
    expect(src).toContain(".select('id, onboarding_completed')")
  })

  it('does NOT redirect to dashboard merely because a profile row exists', () => {
    // The exact bug: `if (founderProfile) redirect(dashboard)` — true for every fresh stub.
    expect(src).not.toMatch(/if\s*\(\s*founderProfile\s*\)\s*\{\s*return NextResponse\.redirect\(`\$\{origin\}\/founder\/dashboard`\)/)
  })

  it('branches on onboarding_completed when a row already exists', () => {
    const block = src.slice(src.indexOf('if (founderProfile) {'), src.indexOf('if (founderProfile) {') + 700)
    expect(block).toContain('founderProfile.onboarding_completed')
    expect(block).toContain('/founder/onboarding')
    expect(block).toContain('/founder/dashboard')
  })
})

describe('the founder-side middleware gate checks completion, not row existence', () => {
  const src = read('middleware.ts')

  it('selects onboarding_completed alongside user_id for the founder gate', () => {
    expect(src).toContain(".select('user_id, onboarding_completed')")
  })

  it('sends an incomplete founder back to onboarding even though a row exists', () => {
    const block = src.slice(src.indexOf(".select('user_id, onboarding_completed')"), src.indexOf('isEmailConfirmed(user)'))
    expect(block).toMatch(/if\s*\(\s*!fp\.onboarding_completed\s*\)/)
    expect(block).toContain('/founder/onboarding')
  })
})

describe('signup and OAuth completion share one implementation, not two', () => {
  it('the email/password route no longer defines its own copy of the shared helpers', () => {
    const src = read('app/api/auth/signup/route.ts')
    expect(src).not.toContain('async function enrichOnboardingText')
    expect(src).not.toContain('async function autoLinkPortfolioByEmail')
    expect(src).toContain("from '@/features/founder/services/complete-onboarding.service'")
  })

  it('both routes import the same mapping and side-effect functions', () => {
    const signup = read('app/api/auth/signup/route.ts')
    const complete = read('app/api/auth/complete-profile/route.ts')
    for (const fn of ['mapStage', 'mapIndustry', 'mapRevenue']) {
      expect(signup).toContain(fn)
      expect(complete).toContain(fn)
    }
    for (const fn of ['enrichOnboardingText', 'autoLinkPortfolioByEmail']) {
      expect(signup).toContain(fn)
      expect(complete).toContain(fn)
    }
  })

  it('an OAuth completion fires the same signup analytics event, tagged correctly', () => {
    const src = read('app/api/auth/complete-profile/route.ts')
    expect(src).toMatch(/notifyAndTrackSignup\([^)]*'google'/)
    const signupSrc = read('app/api/auth/signup/route.ts')
    expect(signupSrc).toMatch(/notifyAndTrackSignup\([^)]*'email'/)
  })
})
