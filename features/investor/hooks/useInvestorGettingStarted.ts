'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface InvestorGettingStartedProgress {
  completed: number
  total:     number
  pct:       number
  allDone:   boolean
}

export function useInvestorGettingStarted(): InvestorGettingStartedProgress {
  const TOTAL = 6
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data } = await sb
        .from('investor_profiles')
        .select('onboarding_completed, thesis, sectors, stages')
        .eq('user_id', user.id)
        .single()

      if (!data) return

      let done = 1 // account always done

      const hasCriteria = (data.sectors?.length ?? 0) > 0 && (data.stages?.length ?? 0) > 0
      if (hasCriteria)              done++
      if (data.onboarding_completed) done++

      const hasThesis = !!data.thesis && (data.thesis as string).length > 20
      if (hasThesis) done++

      // weights — hardcoded false for now (feature not built yet)
      // team
      const { count } = await sb
        .from('investor_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('investor_user_id', user.id)
      if ((count ?? 0) > 0) done++

      setCompleted(Math.min(done, TOTAL))
    }
    void load()
  }, [])

  const pct     = Math.round((completed / TOTAL) * 100)
  const allDone  = completed >= TOTAL

  return { completed, total: TOTAL, pct, allDone }
}
