/**
 * Pre-launch signup gate — who may create an account while the product is still in development.
 *
 * ⚠️ SERVER ONLY. The allowlist holds real people's email addresses, so none of this may ever be
 * exposed to the browser. That is also why it doesn't live in lib/feature-flags.ts, whose whole
 * convention is NEXT_PUBLIC_FF_* — the flag pattern is right, the exposure is not. The landing
 * page receives a resolved boolean from the server, never the list.
 *
 * ⚠️ FAILS CLOSED (CLAUDE.md §3), at every step: no row, an unreadable row, a database error, a
 * missing email — all mean "no". A deploy or an outage that leaves this uncertain leaves the
 * product locked, never open. The failure worth designing against is "we thought it was gated
 * and it wasn't": that one is invisible until strangers are inside, where locking ourselves out
 * is obvious within seconds.
 *
 * Both values live in the single `app_settings` row (migration 20260827000002) rather than in
 * environment variables, because Vercel bakes env vars into a deployment: opening the product,
 * and far more often letting one more tester in, would each have needed a redeploy. They are
 * edited by hand in the Supabase table editor and take effect on the next request.
 *
 * THIS is the lock, and it is applied at every boundary that can bring an account into
 * existence. There are four, not one:
 *   1. app/api/auth/signup            — founder, email + password
 *   2. app/api/auth/investor-signup   — investor, email + password
 *   3. app/auth/callback              — Google OAuth, which writes a founder_profiles stub
 *                                       directly and never passes through (1)
 *   4. app/api/investor/onboarding    — the route that actually writes an investor profile
 * Gating only the first would leave "Continue with Google" wide open. The UI reflects the gate
 * (the landing page stops offering a signup CTA) but the UI is cosmetic.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { log } from '@/lib/logger'

interface SignupSettings {
  open: boolean
  allowlist: string[]
}

/** What we assume when we cannot find out. Closed, with nobody allowed. */
const CLOSED: SignupSettings = { open: false, allowlist: [] }

/**
 * Read the single settings row. Never throws — every failure resolves to CLOSED, so a database
 * blip cannot accidentally open signup.
 *
 * Deliberately NOT cached: this is consulted only on account creation (rare) and once per
 * landing-page render (which is itself revalidated on a timer). Caching it would mean flipping
 * the toggle appeared not to work, which is exactly the confusion a runtime switch exists to
 * avoid.
 */
async function readSettings(): Promise<SignupSettings> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('app_settings')
      .select('signup_open, signup_allowlist')
      .maybeSingle()

    if (error) {
      log.warn('signup gate: settings read failed — treating as closed', { err: error.message })
      return CLOSED
    }
    if (!data) return CLOSED // no row yet: closed, same as a failed read

    return {
      open: data.signup_open === true,
      allowlist: String(data.signup_allowlist ?? '')
        .split(',')
        .map(entry => entry.trim().toLowerCase())
        .filter(Boolean),
    }
  } catch (err) {
    log.warn('signup gate: settings read threw — treating as closed', { err: (err as Error)?.message })
    return CLOSED
  }
}

/**
 * Is signup open to the general public? Used by the landing page to decide whether to offer a
 * signup CTA at all — cosmetic; `signupAllowed` is what actually admits anyone.
 */
export async function isSignupOpen(): Promise<boolean> {
  return (await readSettings()).open
}

/**
 * May this email create an account right now?
 *
 * Open to everyone once launched; otherwise only to an allowlisted address, matched whole and
 * case-insensitively. A missing or blank email is refused rather than passed through — the
 * caller validates the address properly, and this must not be where an empty string gets the
 * benefit of the doubt.
 */
export async function signupAllowed(email: string | null | undefined): Promise<boolean> {
  const settings = await readSettings()
  if (settings.open) return true
  if (typeof email !== 'string') return false
  const normalised = email.trim().toLowerCase()
  if (!normalised) return false
  return settings.allowlist.includes(normalised)
}

/**
 * What a refused visitor is told. Says the product isn't open rather than "you are not on the
 * list": it is the honest reason, it doesn't invite anyone to guess at which address might work,
 * and it tells an invited tester what to do when they've used the wrong address — the one
 * genuinely confusing case.
 */
export const SIGNUP_CLOSED_MESSAGE =
  'Edge Alpha isn’t open for new accounts yet. If you’ve been given early access, sign up with the email address it was granted to.'
