/**
 * Pre-launch signup gate — who may create an account while the product is still in development.
 *
 * ⚠️ SERVER ONLY. The allowlist holds real people's email addresses, so it must never be a
 * NEXT_PUBLIC_ variable: those are inlined into the JavaScript bundle and readable by anyone who
 * opens devtools. That is why this does not live in lib/feature-flags.ts, whose entire convention
 * is NEXT_PUBLIC_FF_* — the flag pattern is right, the exposure is not.
 *
 * ⚠️ FAILS CLOSED (CLAUDE.md §3). With no configuration at all, signup is CLOSED. A deploy that
 * forgets to set anything is a locked product, never an open one — the failure mode of "we
 * thought it was gated and it wasn't" is the one that matters here.
 *
 * The UI reflects this (the landing page stops offering a signup CTA), but the UI is cosmetic.
 * THIS is the lock, and it is applied at every boundary that can bring an account into
 * existence — there are four, not one:
 *   1. app/api/auth/signup            — founder, email + password
 *   2. app/api/auth/investor-signup   — investor, email + password
 *   3. app/api/auth/complete-profile  — founder finishing an OAuth signup
 *   4. app/auth/callback              — Google OAuth, which creates a founder_profiles stub
 *                                       directly and never passes through (1)
 * Gating only the first would leave "Continue with Google" wide open.
 */

/**
 * Emails permitted to create an account, lowercased. Comma-separated in the environment:
 *   SIGNUP_ALLOWLIST="dana@acme.com, sam@globex.io"
 */
function allowlist(): string[] {
  return (process.env.SIGNUP_ALLOWLIST ?? '')
    .split(',')
    .map(entry => entry.trim().toLowerCase())
    .filter(Boolean)
}

/**
 * Is signup open to the general public? Only when explicitly opened — `SIGNUP_MODE=open`.
 * Anything else, including unset, means pre-launch.
 */
export function isSignupOpen(): boolean {
  return (process.env.SIGNUP_MODE ?? '').trim().toLowerCase() === 'open'
}

/**
 * May this email create an account right now?
 *
 * Open to everyone once launched; otherwise only to an allowlisted address. A missing or
 * malformed email is refused rather than passed through — the caller validates the address
 * properly, and this must not be the place where a blank string gets the benefit of the doubt.
 */
export function signupAllowed(email: string | null | undefined): boolean {
  if (isSignupOpen()) return true
  if (typeof email !== 'string') return false
  const normalised = email.trim().toLowerCase()
  if (!normalised) return false
  return allowlist().includes(normalised)
}

/**
 * What a refused visitor is told. Deliberately says the product isn't open rather than "you are
 * not on the list" — it is the honest reason, and it doesn't invite anyone to guess at which
 * address might work. It also tells an invited tester what to do when they've used the wrong
 * address, which is the one genuinely confusing case.
 */
export const SIGNUP_CLOSED_MESSAGE =
  'Edge Alpha isn’t open for new accounts yet. If you’ve been given early access, sign up with the email address it was granted to.'
