/**
 * AI Enhancement Service — fetches Q-Score + profile data for the AI enhancement page
 */

import { createClient } from '@/lib/supabase/client'

export interface AiEnhancementData {
  overallScore: number
  teamScore: number
  marketScore: number
  tractionScore: number
  gtmScore: number
  productScore: number
  startupName: string
}

export async function fetchAiEnhancementData(): Promise<AiEnhancementData | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: qs }, { data: fp }] = await Promise.all([
    supabase
      .from('qscore_history')
      .select('overall_score, team_score, market_score, traction_score, gtm_score, product_score')
      .eq('user_id', user.id)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from('founder_profiles')
      .select('startup_name')
      .eq('user_id', user.id)
      .single(),
  ])

  if (!qs) return null

  return {
    overallScore: qs.overall_score ?? 0,
    teamScore:    qs.team_score    ?? 0,
    marketScore:  qs.market_score  ?? 0,
    tractionScore: qs.traction_score ?? 0,
    gtmScore:     qs.gtm_score     ?? 0,
    productScore: qs.product_score ?? 0,
    startupName:  fp?.startup_name ?? '',
  }
}
