import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { log } from '@/lib/logger'
import type { Database } from '@/types/supabase'
// The anon/admin clients below are untyped: supabase-js resolves unknown tables
// to `any` when no Database generic is supplied. Typing them wholesale means
// updating 203 call sites for strict Json typing, so it is a migration rather
// than a single change. createTypedAdminClient() below is the typed path —
// adopt it per-route, money paths first.

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Validate environment variables
  if (!supabaseUrl || !supabaseAnonKey ||
      supabaseUrl === 'your-supabase-url-here' ||
      supabaseUrl === 'https://your-project.supabase.co') {
    log.error('⚠️  Supabase not configured! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
    throw new Error('Supabase not configured. Please check .env.local and SUPABASE_SETUP.md')
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Service-role client with the generated Database types wired in.
 *
 * Prefer this over createAdminClient()/getAdminClient() in any route where a
 * wrong column name or shape has real consequences — the untyped clients below
 * resolve every table to `any`, which is the root cause of the billing incident
 * class (EDGE_ALPHA_PRD.md §13.5).
 *
 * This is deliberately additive. The untyped clients stay because 203 files use
 * them and typing them all at once is a migration, not a Phase 0 task. Adopt
 * this one route at a time, starting with the paths that move money.
 *
 * Callers: app/api/webhooks/stripe/route.ts
 */
export function createTypedAdminClient(): SupabaseClient<Database> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Service-role client — bypasses RLS. Use only in server-side API routes
// where the caller's identity has already been verified via createClient().
// Untyped: prefer createTypedAdminClient() for new call sites.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Module-scope singleton — avoids repeated HTTP client initialization per request.
// Return type is cast to `any` because supabase-js 2.93+ resolves unknown tables as `never`
// when no generated Database type is provided. Wire in Database generic once all API routes
// are updated to handle strict Json typing. See types/supabase.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _adminSingleton: any = null

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdminClient(): any {
  if (!_adminSingleton) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    }
    _adminSingleton = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _adminSingleton
}
