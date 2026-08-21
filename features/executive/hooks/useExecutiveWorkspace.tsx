'use client'

/**
 * Shared executive-team data — executives, the current contract/programs, and actions — fetched
 * ONCE per founder session (mounted in app/founder/layout.tsx) instead of independently by every
 * component that needs it.
 *
 * Before this, ExecutiveTabBar / app/founder/executive/[executiveId]/page.tsx / ExecutiveRoster /
 * ExecutiveEntryCard / ProgramOverviewGrid / BirdsEyeStats / ActionsPanel each independently
 * re-fetched /api/executives, /api/contracts and/or /api/actions on every mount. Since switching
 * executive tabs remounts the [executiveId] page (a param change, not a layout change), that meant
 * every tab switch blanked the screen and re-asked the server for the same founder-wide, cheap
 * data it already had seconds earlier. This layout stays mounted across that navigation, so one
 * fetch here now serves every consumer below it.
 *
 * Same Provider+hook shape as features/auth/hooks/useAuth.tsx / features/qscore/hooks/useQScore.tsx
 * — this codebase's one existing convention for shared client state, not a new one.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCycleLive } from '../lib/useCycleLive'
import type { Contract, ExecutiveSummary, ProgramInstance } from '../types/executive.types'
import type { PendingAction, ActionSummary } from '../components/ActionsPanel'

interface ActionsState {
  pending: PendingAction[]
  all: ActionSummary[]
}

interface ExecutiveWorkspace {
  executives: ExecutiveSummary[]
  contract: Contract | null
  programs: ProgramInstance[]
  actions: ActionsState
  /** Executives/contract/programs have settled — loaded from the API, found disabled, or there's
   *  no signed-in founder. Mirrors QScoreProvider's `loading` (inverted) so every consumer treats
   *  "not yet known" and "genuinely empty" the same way it always has. */
  loaded: boolean
  /** Actions load a beat after the roster — kept separate so a consumer that only cares about
   *  actions (ActionsPanel) doesn't wait on the roster fetch to know it's still loading. */
  actionsLoaded: boolean
  /** The Executive model isn't switched on for this deployment (the APIs 404). */
  disabled: boolean
  refreshContract: () => Promise<void>
  refreshActions: () => Promise<void>
}

const ExecutiveWorkspaceContext = createContext<ExecutiveWorkspace | undefined>(undefined)

export function useExecutiveWorkspace(): ExecutiveWorkspace {
  const ctx = useContext(ExecutiveWorkspaceContext)
  if (ctx === undefined) {
    throw new Error('useExecutiveWorkspace must be used within an ExecutiveWorkspaceProvider')
  }
  return ctx
}

const EMPTY_ACTIONS: ActionsState = { pending: [], all: [] }

export function ExecutiveWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [executives, setExecutives] = useState<ExecutiveSummary[]>([])
  const [contract, setContract] = useState<Contract | null>(null)
  const [programs, setPrograms] = useState<ProgramInstance[]>([])
  const [actions, setActions] = useState<ActionsState>(EMPTY_ACTIONS)
  const [loaded, setLoaded] = useState(false)
  const [actionsLoaded, setActionsLoaded] = useState(false)
  const [disabled, setDisabled] = useState(false)
  // A cycle finishing (this founder's own click, another tab, or the weekly cron) can create new
  // actions — `generation` bumps on every live→settled transition, same signal ActionsPanel and
  // BriefingsPanel already poll for independently (features/executive/lib/useCycleLive.ts).
  const { generation } = useCycleLive()

  const loadRoster = useCallback(async () => {
    try {
      const [execRes, contractRes] = await Promise.all([fetch('/api/executives'), fetch('/api/contracts')])
      if (execRes.status === 404 || contractRes.status === 404) { setDisabled(true); return }
      if (execRes.ok) setExecutives((await execRes.json()).executives ?? [])
      if (contractRes.ok) {
        const data = await contractRes.json()
        setContract(data.contract ?? null)
        setPrograms(data.programs ?? [])
      }
    } catch {
      /* transient — every consumer keeps whatever it last had */
    }
  }, [])

  const refreshContract = useCallback(async () => {
    try {
      const res = await fetch('/api/contracts')
      if (!res.ok) return
      const data = await res.json()
      setContract(data.contract ?? null)
      setPrograms(data.programs ?? [])
    } catch {
      /* transient */
    }
  }, [])

  const refreshActions = useCallback(async () => {
    try {
      const res = await fetch('/api/actions')
      if (!res.ok) return // 404 = flag off; leave the last good (empty) state
      const data = await res.json()
      setActions({ pending: data.pending ?? [], all: data.all ?? [] })
    } catch {
      /* transient */
    } finally {
      setActionsLoaded(true)
    }
  }, [])

  // Executives + contract + programs: once, as soon as a founder session exists.
  useEffect(() => {
    if (authLoading) return
    if (!user) { setLoaded(true); return }
    let live = true
    void (async () => {
      await loadRoster()
      if (live) setLoaded(true)
    })()
    return () => { live = false }
  }, [authLoading, user, loadRoster])

  // Actions: once on the same condition, and again on every generation bump — one combined
  // effect, matching the exact `[load, generation]` shape ActionsPanel/BriefingsPanel already use,
  // so mounting doesn't fire a second, redundant fetch alongside this one.
  useEffect(() => {
    if (authLoading) return
    if (!user) { setActionsLoaded(true); return }
    void refreshActions()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshActions is a stable useCallback; generation is the real trigger
  }, [authLoading, user, generation])

  const value: ExecutiveWorkspace = {
    executives, contract, programs, actions, loaded, actionsLoaded, disabled,
    refreshContract, refreshActions,
  }

  return <ExecutiveWorkspaceContext.Provider value={value}>{children}</ExecutiveWorkspaceContext.Provider>
}
