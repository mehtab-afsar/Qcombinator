'use client'

import { useState, useEffect } from 'react'
import type { TeamRole } from './permissions'

interface TeamRoleState {
  role:      TeamRole | null
  loading:   boolean
}

export function useTeamRole(): TeamRoleState {
  const [role,    setRole]    = useState<TeamRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/team/members')
      .then(r => r.json())
      .then(d => setRole(d.myRole ?? 'owner'))
      .catch(() => setRole('owner'))  // fail-open: assume owner on error
      .finally(() => setLoading(false))
  }, [])

  return { role, loading }
}
