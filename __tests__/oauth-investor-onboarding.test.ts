/**
 * Google sign-up from the INVESTOR onboarding page landed on founder onboarding instead.
 *
 * FOUND 11 Aug 2026, fixed twice the same day. First pass: for a brand-new user (no
 * founder_profiles row, no investor_profiles row) the callback's fallback was unconditional —
 * create a founder_profiles stub, redirect to /founder/onboarding. There was no investor branch
 * at all, so a new investor was indistinguishable from a new founder. Fixed by adding the
 * intent=investor branch below, but only ahead of the *founder-stub* fallback — the founder-
 * profile-exists check still ran first, so a user who already had a founder_profiles row (e.g.
 * testing investor onboarding with the same Google account they use as a founder) still got
 * routed straight to /founder/onboarding regardless of intent. Second pass: dual-role is an
 * explicitly supported case (app/api/investor/onboarding/route.ts's own comment — "a founder who
 * also angel-invests"; middleware.ts gates each side purely on whether that side's row exists) —
 * so intent=investor must outrank an existing founder_profiles row too, not just the stub
 * fallback. Moved the intent check ahead of the founder-profile lookup entirely.
 *
 * Same bug class as oauth-onboarding.test.ts (row-existence vs. completion) — this is a sibling
 * gap in the same file, not a new pattern: the callback route knew how to route an EXISTING
 * investor, but had no way to originate one, and then couldn't originate a *second* profile for
 * an existing founder either.
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')

describe('the investor onboarding page tags its Google sign-up', () => {
  const src = read('app/investor/onboarding/page.tsx')

  it('passes ?intent=investor on the OAuth redirect — the only signal the callback gets', () => {
    expect(src).toContain('/auth/callback?intent=investor')
  })

  it('detects an OAuth return (session, no investor_profiles row yet) and skips the Account step', () => {
    const effect = src.slice(src.indexOf('useEffect(() => {\n    import(\'@/features/auth/services/auth.service\')'))
    const guardBlock = effect.slice(0, effect.indexOf('}, [router])'))
    expect(guardBlock).toMatch(/setIsOAuthUser\(true\)/)
    expect(guardBlock).toMatch(/setStep\(2\)/)
    // Set directly, not via go() — this is the initial mount, not a user-triggered transition.
    expect(guardBlock).not.toMatch(/go\(2\)/)
  })

  it('does NOT bounce an OAuth return to the dashboard just because a session exists', () => {
    // The exact founder-side bug's shape, restated for investor: `if (s) router.replace(...)`
    // would be true for every Google sign-up the instant it lands, before onboarding runs.
    expect(src).not.toMatch(/if\s*\(\s*s\s*\)\s*router\.replace/)
  })

  it('prefills email from the session — the final submit sends form.email regardless of signup method', () => {
    const effect = src.slice(src.indexOf('useEffect(() => {\n    import(\'@/features/auth/services/auth.service\')'))
    const guardBlock = effect.slice(0, effect.indexOf('}, [router])'))
    expect(guardBlock).toMatch(/setForm\(f => \(\{ \.\.\.f, email: s\.user\.email! \}\)\)/)
  })

  it('hides "Back to Account" for an OAuth user on step 2 — there is no Account step to return to', () => {
    expect(src).toMatch(/step > 1 && !\(isOAuthUser && step === 2\)/)
  })
})

describe('the OAuth callback route recognizes investor intent for a brand-new sign-up', () => {
  const src = read('app/auth/callback/route.ts')

  it('reads the intent param', () => {
    expect(src).toContain("searchParams.get('intent')")
  })

  it('checks intent BEFORE falling into the founder-stub branch', () => {
    const intentCheck = src.indexOf("intent === 'investor'")
    const founderStub = src.indexOf('New OAuth user with no profile')
    expect(intentCheck).toBeGreaterThan(-1)
    expect(founderStub).toBeGreaterThan(-1)
    expect(intentCheck).toBeLessThan(founderStub)
  })

  it('sends a brand-new investor to /investor/onboarding, not /founder/onboarding', () => {
    // Bounded to the intent branch's own if-block, not all the way to the founder-stub fallback —
    // the founder-profile lookup now legitimately sits between the two (see the ordering test
    // below), so a wider slice would false-fail on code that's correct, just relocated.
    const block = src.slice(src.indexOf("intent === 'investor'"), src.indexOf("const { data: founderProfile }"))
    expect(block).toContain('/investor/onboarding')
    expect(block).not.toContain('/founder/onboarding')
  })

  it('does NOT create a founder_profiles stub on the investor path', () => {
    const block = src.slice(src.indexOf("intent === 'investor'"), src.indexOf("const { data: founderProfile }"))
    expect(block).not.toContain("from('founder_profiles').insert")
  })

  it('is checked right after the investor-profile lookup, before the founder-profile lookup', () => {
    // An existing investor_profiles row still wins outright (they're already onboarded on that
    // side — go straight to the dashboard). But intent must outrank founder_profiles: dual-role
    // is supported, so an existing founder explicitly signaling investor intent should not be
    // shunted into founder onboarding just because that row happens to exist.
    const intentIdx = src.indexOf("intent === 'investor'")
    const investorCheckIdx = src.indexOf("from('investor_profiles')")
    const founderCheckIdx = src.indexOf("from('founder_profiles')\n    .select")
    expect(investorCheckIdx).toBeGreaterThan(-1)
    expect(investorCheckIdx).toBeLessThan(intentIdx)
    expect(founderCheckIdx).toBeGreaterThan(-1)
    expect(founderCheckIdx).toBeGreaterThan(intentIdx)
  })

  it('sends an existing founder who signals investor intent to /investor/onboarding, not /founder/onboarding — dual-role is supported', () => {
    const block = src.slice(src.indexOf("intent === 'investor'"), src.indexOf("from('founder_profiles')\n    .select"))
    expect(block).toContain('/investor/onboarding')
  })
})
