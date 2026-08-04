/**
 * Calendar date math for the workshop calendar. No date library exists anywhere in this
 * codebase (confirmed) — native Date only, matching the app's existing convention.
 *
 * Days are keyed by their UTC calendar date, matching how workshop times are already
 * labeled ("4:00 PM UTC") — a workshop at 11:30 PM UTC should land on the same day for
 * every viewer regardless of local timezone, not shift depending on the browser's clock.
 */
import type { Workshop } from '@/features/academy/types/academy.types'

export interface CalendarCell {
  date: Date
  dateKey: string
  inMonth: boolean
  isToday: boolean
}

/** 'YYYY-MM-DD' from a date's UTC calendar day. */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** The UTC day key a workshop falls on, or null if it has no real start time yet. */
export function workshopDateKey(w: Workshop): string | null {
  if (!w.startsAt) return null
  const d = new Date(w.startsAt)
  if (Number.isNaN(d.getTime())) return null
  return toDateKey(d)
}

/** "August 2026" for the month containing `monthAnchor`. */
export function monthLabel(monthAnchor: Date): string {
  return monthAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** A new Date anchored to the first of the next/previous month (UTC), preserving no day drift. */
export function shiftMonth(monthAnchor: Date, delta: number): Date {
  return new Date(Date.UTC(monthAnchor.getUTCFullYear(), monthAnchor.getUTCMonth() + delta, 1))
}

/**
 * A 6-row × 7-col (42-cell) grid for the month containing `monthAnchor`, starting on Sunday,
 * including leading/trailing days from adjacent months so every week row is full.
 */
export function getMonthGrid(monthAnchor: Date): CalendarCell[] {
  const year  = monthAnchor.getUTCFullYear()
  const month = monthAnchor.getUTCMonth()
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const startOffset  = firstOfMonth.getUTCDay() // 0 = Sunday
  const gridStart     = new Date(Date.UTC(year, month, 1 - startOffset))

  const todayKey = toDateKey(new Date())

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(Date.UTC(gridStart.getUTCFullYear(), gridStart.getUTCMonth(), gridStart.getUTCDate() + i))
    const dateKey = toDateKey(date)
    return {
      date,
      dateKey,
      inMonth: date.getUTCMonth() === month,
      isToday: dateKey === todayKey,
    }
  })
}
