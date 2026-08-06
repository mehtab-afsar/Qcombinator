'use client'

/**
 * F09 Activation — decides Activation vs the Command View.
 *
 * Reload-safe by construction, not by client state: Activation shows iff the founder's latest
 * run is still 'running' AND it started at or after the current contract's confirmedAt. A run
 * from a PREVIOUS mandate that's still finishing (rare, but the weekly cron can overlap a new
 * confirm) must never be mistaken for this mandate's activation — the timestamp comparison is
 * what tells them apart. A refresh mid-activation lands back here and reaches the same answer,
 * because it's derived from server state, not "did I already show this."
 *
 * Composed in place of the direct <CommandView> render in app/founder/executive/page.tsx.
 */

import { useEffect, useState } from 'react'
import { ActivationScreen } from './ActivationScreen'
import { CommandView } from './CommandView'
import { bg } from '@/lib/constants/colors'
import type { Contract, ProgramInstance } from '../types/executive.types'

interface RunProgress {
  runId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
}

type Mode = 'loading' | 'activation' | 'command'

export function ActivationGate({
  contract, programs, onChangeDirection, busy,
}: {
  contract: Contract
  programs: ProgramInstance[]
  onChangeDirection: () => void
  busy: boolean
}) {
  const [mode, setMode] = useState<Mode>('loading')

  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/rhythm/run')
        if (!res.ok) { if (live) setMode('command'); return }
        const data = await res.json()
        const run: RunProgress | null = data.progress ?? null
        const activating = !!run
          && run.status === 'running'
          && !!contract.confirmedAt
          && new Date(run.startedAt) >= new Date(contract.confirmedAt)
        if (live) setMode(activating ? 'activation' : 'command')
      } catch {
        if (live) setMode('command') // fail toward the known-good, always-available view
      }
    })()
    return () => { live = false }
  }, [contract.id, contract.confirmedAt])

  if (mode === 'loading') return null // avoids a flash between the two views

  if (mode === 'activation') {
    return (
      <div style={{ background: bg, borderRadius: 12, padding: '8px 0' }}>
        <ActivationScreen onComplete={() => setMode('command')} />
      </div>
    )
  }

  return (
    <CommandView
      contract={contract}
      programs={programs}
      busy={busy}
      onChangeDirection={onChangeDirection}
    />
  )
}
