/**
 * "Add to Google Calendar" link — the entire scope of calendar sync for this feature.
 * No OAuth, no connector, no backend Google API call: this is a plain, well-known Google
 * URL template (calendar.google.com/calendar/render?action=TEMPLATE) that opens Google
 * Calendar pre-filled; the user saves it themselves on Google's own site.
 */
import type { Workshop } from '@/features/academy/types/academy.types'

/** "2026-08-14T16:00:00.000Z" → "20260814T160000Z" (Google's required dates= format). */
function toGCalUTC(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

/** Best-effort minutes from a free-text duration like "90 minutes" or "1 hour". Defaults to 60. */
function parseDurationMinutes(duration: string): number {
  const hourMatch = duration.match(/(\d+(?:\.\d+)?)\s*hour/i)
  if (hourMatch) return Math.round(parseFloat(hourMatch[1]) * 60)
  const minMatch = duration.match(/(\d+)\s*min/i)
  if (minMatch) return parseInt(minMatch[1], 10)
  return 60
}

export function buildGoogleCalendarUrl(w: Workshop): string {
  // Grid-selected workshops always have startsAt (the grid only places workshops that do —
  // see features/academy/lib/calendarDate.ts), but this stays safe standalone too.
  const startIso = w.startsAt ?? `${w.date}T12:00:00Z`
  const endIso    = w.endsAt ?? new Date(new Date(startIso).getTime() + parseDurationMinutes(w.duration) * 60_000).toISOString()

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: w.title,
    dates: `${toGCalUTC(startIso)}/${toGCalUTC(endIso)}`,
    details: `${w.description}\n\nInstructor: ${w.instructor} (${w.instructorTitle})`,
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
