/**
 * Messaging Utilities — pure functions, no React
 */

const amber = "#D97706"
const blue  = "#2563EB"
const red   = "#DC2626"

/** Returns up to 2 uppercase initials from a name string. */
export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

/** Returns a colour for a Q-Score value. */
export function qScoreColor(score: number): string {
  if (score >= 70) return blue
  if (score >= 50) return amber
  return red
}
