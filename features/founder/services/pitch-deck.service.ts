/**
 * Pitch Deck Service — fetches agent artifacts needed to build the pitch deck
 */

import { createClient } from '@/lib/supabase/client'

const RELEVANT_TYPES = [
  'gtm_playbook',
  'brand_messaging',
  'financial_summary',
  'competitive_matrix',
  'hiring_plan',
] as const

export type PitchArtifactType = typeof RELEVANT_TYPES[number]

export interface PitchDeckData {
  artifacts: Record<string, Record<string, unknown>>
  companyName: string
  artifactCount: number
  userId: string | null
}

export async function fetchPitchDeckArtifacts(): Promise<PitchDeckData> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { artifacts: {}, companyName: 'Your Company', artifactCount: 0, userId: null }

  const { data: rows } = await supabase
    .from('agent_artifacts')
    .select('artifact_type, content, title')
    .eq('user_id', user.id)
    .in('artifact_type', RELEVANT_TYPES as unknown as string[])
    .order('created_at', { ascending: false })

  const artifacts: Record<string, Record<string, unknown>> = {}
  for (const row of (rows || [])) {
    if (!artifacts[row.artifact_type]) {
      artifacts[row.artifact_type] = row.content as Record<string, unknown>
    }
  }

  // Derive company name from GTM playbook headline if available
  let companyName = 'Your Company'
  const gtm = artifacts.gtm_playbook as { messaging?: { headline?: string }[] } | undefined
  if (gtm?.messaging?.[0]?.headline) {
    const parts = gtm.messaging[0].headline.split(' for ')
    if (parts[0]) companyName = parts[0]
  }

  return {
    artifacts,
    companyName,
    artifactCount: Object.keys(artifacts).length,
    userId: user.id,
  }
}
