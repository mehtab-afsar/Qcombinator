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
  /** True if /api/investors itself failed (non-2xx or network error) — lets callers tell a
   *  genuinely empty match list apart from a failed fetch that only looks empty. */
  investorsFetchFailed: boolean
}

/** Fetches founder profile (for sector/stage), connection statuses, and investor list. */
export async function loadMatchingData(founderQScore: number): Promise<MatchingLoadResult> {
  let founderSector = 'saas'
  let founderStage  = 'mvp'
  let investorsFetchFailed = false

  const { createClient: create } = await import('@/lib/supabase/client')
  const supabase = create()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch profile, connections, investors, and vector scores in parallel
  const [profileResult, connectionsResult, invResult, vectorResult] = await Promise.all([
    user
      ? supabase.from('founder_profiles').select('industry, stage').eq('user_id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? fetch('/api/connections').then(r => r.ok ? r.json() : { connections: {} })
      : Promise.resolve({ connections: {} }),
    // Was missing the .ok guard its sibling fetches above/below already have — a transient
    // 401 (session not hydrated yet on first load) returned {error: ...} with no `investors`
    // key, which silently collapsed to an empty list ("0 investors") with no retry, instead of
    // being treated as a failed fetch the way the same race is already handled elsewhere here.
    // Still resolves to an empty list on failure (siblings above/below never block the page on
    // one fetch), but now flags investorsFetchFailed so the caller can tell "no investors" apart
    // from "the fetch failed" instead of both reading as a confident zero.
    fetch('/api/investors')
      .then(r => {
        if (r.ok) return r.json()
        investorsFetchFailed = true
        return { investors: [] }
      })
      .catch(() => {
        investorsFetchFailed = true
        return { investors: [] }
      }),
    fetch('/api/matching/scores').then(r => r.ok ? r.json() : { scores: {} }).catch(() => ({ scores: {} })),
  ])

  if (profileResult.data) {
    const profile = (profileResult as { data: { industry?: string; stage?: string } | null }).data
    if (profile?.industry) founderSector = profile.industry
    if (profile?.stage)    founderStage  = profile.stage
  }

  const connectionStatuses: Record<string, ConnectionStatus> =
    (connectionsResult as { connections?: Record<string, ConnectionStatus> }).connections ?? {}

  const vectorScores: Record<string, number> =
    (vectorResult as { scores?: Record<string, number> }).scores ?? {}

  const invData = invResult

  const investors: MatchingInvestor[] = (invData.investors ?? []).map((row: DBInvestor) =>
    mapInvestor(
      row,
      founderQScore,
      founderSector,
      founderStage,
      (connectionStatuses[row.id] as ConnectionStatus) ?? 'none',
      vectorScores[row.id],
    )
  ).sort((a: MatchingInvestor, b: MatchingInvestor) => b.matchScore - a.matchScore)

  return { investors, founderSector, founderStage, investorsFetchFailed }
}
