'use client'

/**
 * PRD 2 Stage 2 — consumes POST /api/rhythm/run?stream=1's SSE response via readSSE
 * (data: {...}\n\n, ending [DONE]) — the one SSE-consumption method this codebase has, not a
 * second one.
 */

import { useCallback, useState } from 'react'
import { readSSE } from '@/features/shared/lib/readSSE'
import type { LiveStream } from './live-stream'

export interface StreamedRhythmResult {
  runId: string
  cycleKey: string
  done: boolean
}

export function useStreamedRhythmStep() {
  const [streaming, setStreaming] = useState(false)
  // null, never {text:'',assetId:null} — "nothing is streaming" and "a stream with no text yet"
  // must stay distinguishable. See live-stream.ts on why conflating them was the bug.
  const [stream, setStream] = useState<LiveStream | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = useCallback(async (): Promise<StreamedRhythmResult | null> => {
    setStreaming(true)
    setError(null)
    setStream(null)
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
      // The route sends the owning asset id twice over: once up-front as its own `begin` event,
      // so the panel can open before the first token, and again on every delta so a consumer
      // that missed `begin` still pairs text with the right document.
      let assetId: string | null = null
      await readSSE(res.body, evt => {
        if (evt.type === 'begin') {
          assetId = (evt.assetId as string | null) ?? null
        } else if (evt.type === 'delta') {
          accumulated += evt.text as string
          if (evt.assetId != null) assetId = evt.assetId as string
          setStream({ text: accumulated, assetId })
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

  return { streaming, stream, error, run }
}
