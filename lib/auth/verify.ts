import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type AuthResult =
  | { ok: true;  user: User }
  | { ok: false; error: string; status: 401 | 500 }

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
