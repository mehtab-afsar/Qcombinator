/**
 * useReadinessReport — triggers the multi-agent synthesis endpoint.
 *
 * Fans out to 4 specialist agents in parallel (Felix, Patel, Atlas, Nova),
 * then Sage synthesises into one investor-grade readiness report.
 *
 * Usage:
 *   const { report, loading, error, generate } = useReadinessReport(founderId)
 *   <button onClick={generate}>Generate deep-dive</button>
 */

import { useState, useCallback } from 'react'
import type { ReadinessReport } from '@/app/api/investor/ai-analysis/readiness/route'

export interface UseReadinessReport {
  report:   ReadinessReport | null
  loading:  boolean
  error:    string | null
  generate: () => Promise<void>
}

export function useReadinessReport(founderId: string): UseReadinessReport {
  const [report,  setReport]  = useState<ReadinessReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!founderId || loading) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/investor/ai-analysis/readiness', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ founderId }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Request failed: ${res.status}`)
      }

      const data = await res.json() as { report: ReadinessReport }
      setReport(data.report)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading(false)
    }
  }, [founderId, loading])

  return { report, loading, error, generate }
}
