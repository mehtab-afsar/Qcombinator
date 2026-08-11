'use client'

/**
 * F09 Activation — "is the founder's latest run the just-triggered first run of THIS mandate?"
 *
 * Reload-safe by construction, not by client state: the answer is derived from server state (the
 * run's own `startedAt` vs. the contract's `confirmedAt`), so a refresh mid-activation reaches the
 * same answer rather than "did I already show this." A run from a PREVIOUS mandate that's still
 * finishing (rare, but the weekly cron can overlap a new confirm) must never be mistaken for this
 * mandate's activation — the timestamp comparison is what tells them apart.
 *
 * Extracted from ActivationGate.tsx (the CEO tab's own use of this check) so a second consumer —
 * the per-executive cockpit page — doesn't need a second copy (CLAUDE.md "no duplicated logic").
 */

import { useEffect, useState } from 'react'
import type { Contract } from '../types/executive.types'

interface RunProgress {
  runId: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
}

export type ActivationCheckState = 'loading' | 'activation' | 'settled'

/**
 * The actual decision, pure and directly unit-tested — no React, no IO. The hook below is a thin
 * fetch-and-store wrapper around this; this is where the real behavior (and any future bug in it)
 * actually lives, matching this session's own pattern for this class of function
 * (matchesInitiateIntent, dedupeActionAttempts) over introducing a React-hook-testing dependency
 * this codebase doesn't otherwise use.
 */
export function isActivating(run: RunProgress | null, confirmedAt: string | null): boolean {
  return !!run
    && !!confirmedAt
    && run.status === 'running'
    && new Date(run.startedAt) >= new Date(confirmedAt)
}

/**
 * Accepts `Contract | null` so callers can call this unconditionally (React's rules of hooks —
 * it cannot be called only once a contract has loaded). No confirmed contract means there is
 * nothing to activate; settles immediately without a network round-trip.
 */
export function useActivationCheck(contract: Contract | null): ActivationCheckState {
  const [state, setState] = useState<ActivationCheckState>('loading')
  const confirmedAt = contract?.status === 'confirmed' ? contract.confirmedAt : null
  const contractId = contract?.id ?? null

  useEffect(() => {
    if (!contractId || !confirmedAt) { setState('settled'); return }
    let live = true
    void (async () => {
      try {
        const res = await fetch('/api/rhythm/run')
        if (!res.ok) { if (live) setState('settled'); return }
        const data = await res.json()
        const run: RunProgress | null = data.progress ?? null
        if (live) setState(isActivating(run, confirmedAt) ? 'activation' : 'settled')
      } catch {
        if (live) setState('settled') // fail toward the known-good, always-available view
      }
    })()
    return () => { live = false }
  }, [contractId, confirmedAt])

  return state
}
