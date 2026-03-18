/**
 * Investor scoring utilities — pure functions, no React
 */

const green = "#16A34A"
const blue  = "#2563EB"
const amber = "#D97706"
const red   = "#DC2626"

/** Returns a colour for a Q-Score value (investor thresholds). */
export function qScoreColor(score: number): string {
  if (score >= 80) return green
  if (score >= 70) return blue
  if (score >= 60) return amber
  return red
}
