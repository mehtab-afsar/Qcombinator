import { createClient, createAdminClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type AuthResult =
  | { ok: true;  user: User }
  | { ok: false; error: string; status: 401 | 500 }

export type InvestorAuthResult =
  | { ok: true;  user: User }
  | { ok: false; error: string; status: 401 | 403 | 500 }

export type AdminAuthResult =
  | { ok: true;  user: User }
  | { ok: false; error: string; status: 401 | 403 | 500 }

/**
 * Verifies the caller has a valid Supabase session.
 * Call at the top of every protected route handler before any business logic.
 *
 * Usage:
 *   const auth = await verifyAuth()
 *   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
 *   const { user } = auth
 */
export async function verifyAuth(): Promise<AuthResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { ok: false, error: 'Unauthorized', status: 401 }
    return { ok: true, user }
  } catch {
    return { ok: false, error: 'Auth check failed', status: 500 }
  }
}

/**
 * Verifies the caller has a valid session AND an investor_profiles row.
 * Use on investor-only writes that don't otherwise touch investor_profiles — without this,
 * a logged-in user with no investor account at all (e.g. a founder who never onboarded as an
 * investor) can silently create investor-shaped rows (watchlist entries, portfolio companies,
 * scoring weights) under their own id. Dual-role accounts (a founder who's also a real,
 * onboarded investor) pass this fine — it checks for the row, not for "founder-only."
 *
 * Usage:
 *   const auth = await verifyInvestor(createAdminClient())
 *   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
 */
export async function verifyInvestor(admin: ReturnType<typeof createAdminClient>): Promise<InvestorAuthResult> {
  const auth = await verifyAuth()
  if (!auth.ok) return auth

  const { data, error } = await admin
    .from('investor_profiles')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) return { ok: false, error: 'Auth check failed', status: 500 }
  if (!data) return { ok: false, error: 'Investor account required', status: 403 }
  return { ok: true, user: auth.user }
}

/**
 * Verifies the caller has a valid session AND is a platform admin (email in ADMIN_EMAILS).
 * The single source of truth for "is this a human admin" — three routes each had their own
 * copy-pasted version of this check before (one of them checking a role value the database
 * schema doesn't even allow, which meant it could never pass for anyone). Not for
 * service-to-service auth (cron jobs, webhooks) — those verify a shared secret instead, a
 * different concern from "which logged-in human is an admin."
 *
 * Usage:
 *   const auth = await verifyAdmin()
 *   if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
 */
export async function verifyAdmin(): Promise<AdminAuthResult> {
  const auth = await verifyAuth()
  if (!auth.ok) return auth

  const adminEmails = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean)

  if (!adminEmails.includes(auth.user.email ?? '')) {
    return { ok: false, error: 'Forbidden', status: 403 }
  }
  return { ok: true, user: auth.user }
}
