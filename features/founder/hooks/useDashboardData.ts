'use client'

/**
 * useDashboardData
 * Fetches all analytics for the dashboard page.
 */

import { useState, useEffect } from 'react'
import { fetchDashboardData, DashboardData, PendingRow } from '../services/dashboard.service'

export function useDashboardData() {
  const [data,    setData]    = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function removePendingAction(actionId: string) {
    setData(prev => prev
      ? { ...prev, pendingActions: prev.pendingActions.filter((a: PendingRow) => a.id !== actionId) }
      : prev
    )
  }

  return { data, loading, removePendingAction }
}
