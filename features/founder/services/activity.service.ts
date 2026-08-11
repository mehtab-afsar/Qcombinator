/**
 * Activity Service — fetches agent_activity timestamps for the academy heatmap.
 */

import { createClient } from '@/lib/supabase/client'

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
