'use client'

import { useState, useEffect, useCallback } from 'react'

export interface UsageFeature {
  used:  number
  limit: number | null // null = unlimited
}

export interface UsageData {
  subscriptionTier:   'free' | 'premium'
  subscriptionStatus: string | null
  periodEnd:          string | null
  usage: {
    agentChat:          UsageFeature
    qscoreRecalc:       UsageFeature
    investorConnection: UsageFeature
  }
}

export function useUsage() {
  const [data,    setData]    = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/founder/billing/status')
      if (!res.ok) throw new Error('Failed to fetch usage')
      const json = await res.json() as UsageData
      setData(json)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void refresh() }, [refresh])

  const isPremium = data?.subscriptionTier === 'premium'

  function isAtLimit(feature: keyof UsageData['usage']): boolean {
    if (!data) return false
    const f = data.usage[feature]
    if (f.limit === null) return false
    return f.used >= f.limit
  }

  function isNearLimit(feature: keyof UsageData['usage'], threshold = 0.8): boolean {
    if (!data) return false
    const f = data.usage[feature]
    if (f.limit === null) return false
    return f.used / f.limit >= threshold
  }

  return { data, loading, error, refresh, isPremium, isAtLimit, isNearLimit }
}
