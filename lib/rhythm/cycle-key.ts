/**
 * F10 — the cycle key. One cycle per company per ISO week: 'YYYY-Www' (e.g. '2026-W29').
 * With founder_id it forms the idempotency key (operating_rhythm_runs unique constraint).
 *
 * Pure — the caller passes the date — so it is deterministic and unit-testable.
 */

/** ISO-8601 week: the week belongs to the year of its Thursday. */
function isoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const day = d.getUTCDay() || 7 // Sunday (0) → 7
  d.setUTCDate(d.getUTCDate() + 4 - day) // move to the Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7)
  return { year: d.getUTCFullYear(), week }
}

export function weekCycleKey(date: Date): string {
  const { year, week } = isoWeek(date)
  return `${year}-W${String(week).padStart(2, '0')}`
}
