/**
 * Auth Service — thin wrappers around Supabase auth operations
 * Used by onboarding pages and other auth flows
 */

import { createClient } from '@/lib/supabase/client'

/** Returns the current session, or null if not authenticated */
export async function getSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/** Returns the current authenticated user ID, or null */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/** Sign in with email + password */
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

/** Sign out */
export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
}
