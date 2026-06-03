'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface GettingStartedProgress {
  completed: number
  total:     number
  pct:       number
  allDone:   boolean
}

export function useGettingStarted(): GettingStartedProgress {
  const TOTAL = 7
  const [completed, setCompleted] = useState(0)

  useEffect(() => {
    async function load() {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data } = await sb
        .from('founder_profiles')
        .select('onboarding_completed, profile_builder_completed, startup_profile_data')
        .eq('user_id', user.id)
        .single()

      if (!data) return

      let done = 1 // account always done
      if (data.onboarding_completed)      done++
      if (data.onboarding_completed)      done++ // startup info covered by onboarding
      if (data.profile_builder_completed) done++

      const profileData = data.startup_profile_data as Record<string, unknown> | null
      if (profileData?.pitch_deck_url)    done++
      if (profileData?.mrr)               done++

      // team — check startup_members
      const { count } = await sb
        .from('startup_members')
        .select('*', { count: 'exact', head: true })
        .eq('startup_id', user.id)
      if ((count ?? 0) > 1) done++

      setCompleted(Math.min(done, TOTAL))
    }
    void load()
  }, [])

  const pct    = Math.round((completed / TOTAL) * 100)
  const allDone = completed >= TOTAL

  return { completed, total: TOTAL, pct, allDone }
}
