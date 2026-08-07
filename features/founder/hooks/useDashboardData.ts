'use client'

/**
 * useDashboardData
 * Fetches all analytics for the dashboard page.
 */

import { useState, useEffect } from 'react'
import { fetchDashboardData, DashboardData, PendingRow } from '../services/dashboard.service'
import { log } from '@/lib/logger'

export function useDashboardData() {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<Error | null>(null)

  useEffect(() => {
    fetchDashboardData()
      .then(d => { setData(d); setError(null) })
      .catch((err: unknown) => {
        const e = err instanceof Error ? err : new Error(String(err))
        log.error('useDashboardData: fetchDashboardData failed', { err: e })
        setError(e)
      })
      .finally(() => setLoading(false))
  }, [])

  function removePendingAction(actionId: string) {
    setData(prev => prev
      ? { ...prev, pendingActions: prev.pendingActions.filter((a: PendingRow) => a.id !== actionId) }
      : prev
    )
  }

  return { data, loading, error, removePendingAction }
}
