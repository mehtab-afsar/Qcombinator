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

/**
 * Every real agent_activity timestamp in the last `days` — deliberately no .limit(), unlike
 * fetchActivityFeed() above, since a heatmap needs the full range to be honest, not the most
 * recent 50. Returns raw timestamps; the heatmap buckets them by day itself (features/academy's
 * toDateKey, so it buckets the same way the workshop calendar next to it does).
 */
export async function fetchActivityHeatmap(days = 371): Promise<string[]> {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) return []

  const since = new Date()
  since.setUTCDate(since.getUTCDate() - days)

  const { data, error } = await supabase
    .from('agent_activity')
    .select('created_at')
    .eq('user_id', user.id)
    .gte('created_at', since.toISOString())

  if (error) return []
  return (data ?? []).map(r => r.created_at as string)
}
