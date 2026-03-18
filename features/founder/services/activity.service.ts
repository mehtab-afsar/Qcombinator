/**
 * Activity Service — fetches agent activity feed from Supabase
 */

import { createClient } from '@/lib/supabase/client'

export interface ActivityRow {
  id: string
  user_id: string
  agent_id: string
  action_type: string
  description: string
  metadata?: Record<string, unknown> | null
  created_at: string
}


export async function fetchActivityFeed(): Promise<{ rows: ActivityRow[]; userId: string | null }> {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return { rows: [], userId: null }

  const { data, error } = await supabase
    .from('agent_activity')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { rows: [], userId: user.id }
  return { rows: (data ?? []) as ActivityRow[], userId: user.id }
}
