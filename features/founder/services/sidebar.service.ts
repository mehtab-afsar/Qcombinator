/**
 * Founder Sidebar Service — API calls for sidebar badges
 * Pure async functions, no React
 */

import { SidebarNotification } from '../types/founder.types'

/** Fetches notifications from the activity feed. */
export async function fetchNotifications(): Promise<SidebarNotification[]> {
  const res = await fetch('/api/notifications')
  const d = await res.json()
  return d.notifications ?? []
}
