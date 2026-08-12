'use client'

/**
 * PRD 2 Stage 2 — consumes POST /api/rhythm/run?stream=1's SSE response via readSSE
 * (data: {...}\n\n, ending [DONE]) — the one SSE-consumption method this codebase has, not a
 * second one.
 */

import { useCallback, useState } from 'react'
import { readSSE } from '@/features/shared/lib/readSSE'

export interface StreamedRhythmResult {
  runId: string
  cycleKey: string
  done: boolean
}

export function useStreamedRhythmStep() {
  const [streaming, setStreaming] = useState(false)
  const [liveText, setLiveText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (): Promise<StreamedRhythmResult | null> => {
    setStreaming(true)
    setError(null)
    setLiveText('')
    try {
      const res = await fetch('/api/rhythm/run?stream=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({}))
        setError(errBody.error ?? `Request failed (${res.status})`)
        return null
      }
      let result: StreamedRhythmResult | null = null
      let accumulated = ''
      await readSSE(res.body, evt => {
        if (evt.type === 'delta') {
          accumulated += evt.text as string
          setLiveText(accumulated)
        } else if (evt.type === 'done') {
          if (evt.error) setError(evt.error as string)
          else result = { runId: evt.runId as string, cycleKey: evt.cycleKey as string, done: evt.done as boolean }
        }
      })
      return result
    } catch {
      setError('Could not reach the server. Try again.')
      return null
    } finally {
      setStreaming(false)
    }
  }, [])

  return { streaming, liveText, error, run }
}
