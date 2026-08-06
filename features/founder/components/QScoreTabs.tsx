'use client'

/**
 * Q Score Dashboard's own sub-tabs — Overview, Improve my score, Profile Builder.
 *
 * Route-aware wrapper around the one shared TabNav (features/shared/components/TabNav.tsx),
 * not a new tab primitive (CLAUDE.md "one of each").
 *
 * Mounted on /founder/dashboard and /founder/improve-qscore only — NOT on
 * /founder/profile-builder itself. That route deliberately hides the whole app shell
 * (app/founder/layout.tsx's hideSidebar) for a focused, distraction-free intake flow; the
 * Profile Builder tab here is a doorway INTO that flow, not a persistent strip inside it.
 * Clicking it navigates away, same as clicking it used to in the main sidebar.
 */

import { useRouter, usePathname } from 'next/navigation'
import { BarChart3, TrendingUp, ClipboardList } from 'lucide-react'
import { TabNav } from '@/features/shared/components/TabNav'

const TABS = [
  { id: '/founder/dashboard',       label: 'Overview',          icon: BarChart3 },
  { id: '/founder/improve-qscore',  label: 'Improve my score',  icon: TrendingUp },
  { id: '/founder/profile-builder', label: 'Profile Builder',   icon: ClipboardList },
]

export function QScoreTabs() {
  const router = useRouter()
  const pathname = usePathname()

  return (
    <TabNav
      tabs={TABS}
      active={pathname}
      onChange={id => router.push(id)}
      style={{ marginBottom: 24 }}
    />
  )
}
