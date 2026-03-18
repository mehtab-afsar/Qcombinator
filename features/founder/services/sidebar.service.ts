/**
 * Founder Sidebar Service — API calls for sidebar badges
 * Pure async functions, no React
 */

import { SidebarNotification } from '../types/founder.types'

/** Fetches count of pending connection requests for the Messages badge. */
export async function fetchPendingConnectionCount(): Promise<number> {
  const res = await fetch('/api/connections')
  const d = await res.json()
  const statuses = Object.values(d.connections ?? {}) as string[]
  return statuses.filter(s => s === 'pending').length
}

/** Fetches notifications from the activity feed. */
export async function fetchNotifications(): Promise<SidebarNotification[]> {
  const res = await fetch('/api/notifications')
  const d = await res.json()
  return d.notifications ?? []
}
