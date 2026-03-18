/**
 * Workspace Service — fetches agent artifacts for the workspace page
 */

import { createClient } from '@/lib/supabase/client'

export interface WorkspaceArtifact {
  id: string
  agent_id: string
  artifact_type: string
  title: string
  created_at: string
}

export async function fetchWorkspaceArtifacts(): Promise<WorkspaceArtifact[]> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('agent_artifacts')
    .select('id, agent_id, artifact_type, title, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (data ?? []) as WorkspaceArtifact[]
}
