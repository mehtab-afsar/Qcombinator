'use client'

/**
 * Shared executive-team data — executives, the current contract/programs, actions and documents
 * — fetched ONCE per founder session (mounted in app/founder/layout.tsx) instead of
 * independently by every component that needs it.
 *
 * Before this, ExecutiveTabBar / app/founder/executive/[executiveId]/page.tsx / ExecutiveRoster /
 * ExecutiveEntryCard / ProgramOverviewGrid / BirdsEyeStats / ActionsPanel each independently
 * re-fetched /api/executives, /api/contracts and/or /api/actions on every mount. Since switching
 * executive tabs remounts the [executiveId] page (a param change, not a layout change), that meant
 * every tab switch blanked the screen and re-asked the server for the same founder-wide, cheap
 * data it already had seconds earlier. This layout stays mounted across that navigation, so one
 * fetch here now serves every consumer below it.
 *
 * Documents joined for a second reason beyond the round trips: FOUR components fetched
 * /api/assets once on mount and never again (ProgramAssetsPanel, CommandView,
 * ProgramOverviewGrid, the Documents Hub), each keeping its own private, quietly-ageing copy.
 * During a cycle that meant a founder watching the step list tick past six documents while the
 * Documents panel beside it still read "Not generated yet" for three of them — the data had been
 * written the whole time; nothing had asked for it again since mount. One copy, refreshed on
 * every `generation` bump, is the fix; keeping four and remembering to refresh each is not.
 *
 * Same Provider+hook shape as features/auth/hooks/useAuth.tsx / features/qscore/hooks/useQScore.tsx
 * — this codebase's one existing convention for shared client state, not a new one.
 */

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useCycleLive } from '../lib/useCycleLive'
import type { Contract, ExecutiveSummary, ProgramInstance } from '../types/executive.types'
import type { PendingAction, ActionSummary } from '../components/ActionsPanel'
import type { ArtifactCardData } from '../components/ArtifactCard'

interface ActionsState {
  pending: PendingAction[]
  all: ActionSummary[]
}

/**
 * One row of GET /api/assets, in full. Consumers narrow it structurally to whatever they render
 * (ArtifactCardData, CommandView's AssetSummary, ProgramOverviewGrid's two fields) rather than
 * each re-declaring a partial shape over the same payload.
 */
export interface WorkspaceAsset extends ArtifactCardData {
  outputSchema: 'markdown' | 'json'
}

interface ExecutiveWorkspace {
  executives: ExecutiveSummary[]
  contract: Contract | null
  programs: ProgramInstance[]
  actions: ActionsState
  /** Every Registry asset for the contract's active Programs, generated or not — the same list
   *  GET /api/assets returns, refreshed as a cycle writes them. */
  assets: WorkspaceAsset[]
  /** Executives/contract/programs have settled — loaded from the API, found disabled, or there's
   *  no signed-in founder. Mirrors QScoreProvider's `loading` (inverted) so every consumer treats
   *  "not yet known" and "genuinely empty" the same way it always has. */
  loaded: boolean
  /** Actions load a beat after the roster — kept separate so a consumer that only cares about
   *  actions (ActionsPanel) doesn't wait on the roster fetch to know it's still loading. */
  actionsLoaded: boolean
  /** Documents settle alongside actions — same reasoning as actionsLoaded. */
  assetsLoaded: boolean
  /** The Executive model isn't switched on for this deployment (the APIs 404). */
  disabled: boolean
  refreshContract: () => Promise<void>
  refreshActions: () => Promise<void>
  refreshAssets: () => Promise<void>
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
  const [assets, setAssets] = useState<WorkspaceAsset[]>([])
  const [loaded, setLoaded] = useState(false)
  const [actionsLoaded, setActionsLoaded] = useState(false)
  const [assetsLoaded, setAssetsLoaded] = useState(false)
  const [disabled, setDisabled] = useState(false)
  // A cycle moving (this founder's own click, another tab, or the weekly cron) creates actions
  // and documents — `generation` bumps on a live transition AND on every step that lands, which
  // is what keeps documents current mid-run rather than only once the cycle ends
  // (features/executive/lib/useCycleLive.ts).
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

  const refreshAssets = useCallback(async () => {
    try {
      const res = await fetch('/api/assets')
      if (!res.ok) return // 404 = flag off; leave the last good state rather than blanking it
      setAssets((await res.json()).assets ?? [])
    } catch {
      /* transient — the next generation bump retries */
    } finally {
      setAssetsLoaded(true)
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

  // Documents: same shape, same trigger. Separate effect so a slow /api/assets never delays
  // actions (and vice versa) — they settle independently, as their two *Loaded flags promise.
  useEffect(() => {
    if (authLoading) return
    if (!user) { setAssetsLoaded(true); return }
    void refreshAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshAssets is a stable useCallback; generation is the real trigger
  }, [authLoading, user, generation])

  const value: ExecutiveWorkspace = {
    executives, contract, programs, actions, assets, loaded, actionsLoaded, assetsLoaded, disabled,
    refreshContract, refreshActions, refreshAssets,
  }

  return <ExecutiveWorkspaceContext.Provider value={value}>{children}</ExecutiveWorkspaceContext.Provider>
}
