/**
 * Investor Sidebar Service — API calls for sidebar badges
 * Pure async functions, no React
 */

/**
 * Fetches combined unread count (unread messages + pending connection requests)
 * for the investor Messages badge.
 */
export async function fetchInvestorMessageCount(): Promise<number> {
  try {
    const res = await fetch('/api/investor/messages/unread')
    if (!res.ok) return 0
    const d = await res.json()
    return typeof d.total === 'number' ? d.total : 0
  } catch {
    return 0
  }
}
