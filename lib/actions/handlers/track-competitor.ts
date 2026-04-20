import type { SupabaseClient } from '@supabase/supabase-js';

interface TrackCompetitorArgs {
  competitor_name: string;
  competitor_url?: string;
  notes?: string;
}

export async function handler(
  userId: string,
  args: unknown,
  supabase: SupabaseClient,
): Promise<{ tracked: boolean; id: string | null; delegated: boolean }> {
  const { competitor_name, competitor_url, notes } = (args ?? {}) as TrackCompetitorArgs;
  if (!competitor_name) throw new Error('competitor_name is required');

  // Upsert into tracked_competitors table (created by atlas weekly-scan infra)
  const { data, error } = await supabase
    .from('tracked_competitors')
    .upsert({
      user_id: userId,
      name: competitor_name,
      url: competitor_url ?? null,
      notes: notes ?? null,
      added_by: 'atlas',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,name' })
    .select('id')
    .maybeSingle();

  if (error) throw new Error(`Failed to track competitor: ${error.message}`);

  // Trigger Atlas weekly scan delegation so it runs on the next cron cycle
  await supabase.from('delegation_tasks').insert({
    from_agent: 'atlas',
    to_agent: 'atlas',
    user_id: userId,
    instruction: `Run a fresh competitive intelligence scan on ${competitor_name}${competitor_url ? ` (${competitor_url})` : ''}. Generate a competitor_weekly artifact.`,
    payload_type: 'competitor_scan',
    payload_data: { competitor_name, competitor_url },
    priority: 'background',
  });

  void supabase.from('agent_activity').insert({
    user_id: userId,
    agent_id: 'atlas',
    action_type: 'competitor_tracked',
    description: `Now tracking ${competitor_name}`,
    metadata: { competitor_name, competitor_url, id: (data as { id: string } | null)?.id },
  });

  return {
    tracked: true,
    id: (data as { id: string } | null)?.id ?? null,
    delegated: true,
  };
}
