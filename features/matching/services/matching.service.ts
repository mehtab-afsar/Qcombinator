/**
 * Matching Service — founder profile + investor data fetching
 * Pure async functions, no React
 */

import { DBInvestor, MatchingInvestor, ConnectionStatus } from '../types/matching.types'
import { mapInvestor } from '../utils/matching'

export interface MatchingLoadResult {
  investors: MatchingInvestor[]
  founderSector: string
  founderStage: string
}

/** Fetches founder profile (for sector/stage), connection statuses, and investor list. */
export async function loadMatchingData(founderQScore: number): Promise<MatchingLoadResult> {
  let founderSector = 'saas'
  let founderStage  = 'mvp'

  const { createClient: create } = await import('@/lib/supabase/client')
  const supabase = create()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('founder_profiles')
      .select('industry, stage')
      .eq('user_id', user.id)
      .maybeSingle()
    if (profile?.industry) founderSector = profile.industry
    if (profile?.stage)    founderStage  = profile.stage
  }

  // Fetch existing connection statuses
  let connectionStatuses: Record<string, ConnectionStatus> = {}
  if (user) {
    const res = await fetch('/api/connections')
    if (res.ok) {
      const json = await res.json()
      connectionStatuses = json.connections ?? {}
    }
  }

  // Fetch investors
  const invRes  = await fetch('/api/investors')
  const invData = await invRes.json()

  const investors: MatchingInvestor[] = (invData.investors ?? []).map((row: DBInvestor) =>
    mapInvestor(
      row,
      founderQScore,
      founderSector,
      founderStage,
      (connectionStatuses[row.id] as ConnectionStatus) ?? 'none',
    )
  ).sort((a: MatchingInvestor, b: MatchingInvestor) => b.matchScore - a.matchScore)

  return { investors, founderSector, founderStage }
}
