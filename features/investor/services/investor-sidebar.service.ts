/**
 * Investor Sidebar Service — API calls for sidebar badges
 * Pure async functions, no React
 */

/** Fetches count of pending connection requests for the investor Messages badge. */
export async function fetchInvestorMessageCount(): Promise<number> {
  const res = await fetch('/api/investor/connections')
  const d = await res.json()
  return Array.isArray(d.requests) ? d.requests.length : 0
}
