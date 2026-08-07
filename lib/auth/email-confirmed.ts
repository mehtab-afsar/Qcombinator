import type { User } from '@supabase/supabase-js'

/**
 * The single source of truth for "has this user confirmed their email" — reads Supabase's own
 * native `email_confirmed_at` off the auth user, not a hand-rolled profile-table column. No
 * extra query needed anywhere a Supabase `User` is already in hand (API routes via verifyAuth(),
 * middleware via its own getUser() call), since this field comes back on every getUser() call.
 *
 * Deliberately its own file, not part of lib/auth/verify.ts — that file imports
 * lib/supabase/server.ts (next/headers, the admin client), which isn't safe to pull into
 * middleware.ts's edge runtime. This file has no runtime dependencies, only a type import.
 */
export function isEmailConfirmed(user: Pick<User, 'email_confirmed_at'>): boolean {
  return !!user.email_confirmed_at
}
