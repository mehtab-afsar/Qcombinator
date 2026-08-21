'use client'

/**
 * Executive Team's own tab bar — one tab per executive, all 5, always (F09 IA restructuring).
 *
 * "Where did Operations go?" — nowhere. Matches ExecutiveCard's existing philosophy: idle
 * executives (today: everyone but Growth) are shown quieter, never hidden and never faked busy.
 * The CEO tab is the root Command View (/founder/executive) — it already IS the whole-company
 * Read/Direction/Mandate/Confirm flow (Unveiling + CommandView); the other 4 route to the
 * existing generic detail page (/founder/executive/[executiveId]).
 *
 * Route-aware wrapper around the one shared TabNav — not a second tab primitive
 * (CLAUDE.md "one of each"). Reads executives/programs/pending actions from the shared
 * ExecutiveWorkspaceProvider (features/executive/hooks/useExecutiveWorkspace.tsx) instead of
 * self-fetching — those three endpoints are founder-wide and already loaded by the time this
 * mounts, so this no longer re-asks the server on every render.
 */

import { useRouter, usePathname } from 'next/navigation'
import { TabNav } from '@/features/shared/components/TabNav'
import { amber, ink, bdr } from '@/lib/constants/colors'
import { SHORT_LABEL, Dot } from '../lib/executiveLabels'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'

function routeFor(executiveId: string): string {
  return executiveId === 'ceo' ? '/founder/executive' : `/founder/executive/${executiveId}`
}

export function ExecutiveTabBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { executives, programs, actions } = useExecutiveWorkspace()

  if (executives.length === 0) return null

  const activeIds = new Set(programs.map(p => p.owner))
  const needsYouIds = new Set(actions.pending.filter(a => a.executiveId).map(a => a.executiveId as string))

  const tabs = executives.map(e => ({
    id: routeFor(e.id),
    label: SHORT_LABEL[e.id] ?? e.id.toUpperCase(),
    indicator: (
      <Dot color={needsYouIds.has(e.id) ? amber : activeIds.has(e.id) ? ink : bdr} />
    ),
  }))

  // Both /founder/executive and /founder/executive/[id] should highlight — prefix-match the
  // CEO tab's own root route the same way the sidebar's isNavActive does.
  const active = tabs.find(t => t.id === pathname)?.id
    ?? (pathname === '/founder/executive' || pathname.startsWith('/founder/executive/') ? '/founder/executive' : '')

  return <TabNav tabs={tabs} active={active} onChange={router.push} style={{ marginBottom: 20 }} />
}
