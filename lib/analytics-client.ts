'use client'

/**
 * Browser-side analytics.
 *
 * Separate from `lib/analytics.ts` because that module imports `posthog-node`, which has no
 * business in a browser bundle. The **event taxonomy is still single-sourced** — `AnalyticsEvent`
 * is imported as a type, which is erased at compile time, so no server code follows it here
 * (CLAUDE.md §4: one source of truth per fact).
 *
 * Same two rules as the server module: never throw into a render, and never send anything
 * private. A briefing's verdict is the model's narrative about the founder's company — its id and
 * age travel; its words do not.
 */

import posthog from 'posthog-js'
import type { AnalyticsEvent } from '@/lib/analytics'

function capture(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>): void {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return
  try {
    posthog.capture(event, properties)
  } catch {
    /* A dropped event is a gap in a chart. A thrown one breaks the page. */
  }
}

/**
 * ⚠️ THE RETENTION SIGNAL — the number Phase 4 is decided on (ADR-016).
 *
 * "Did the founder come back and engage?" For this product, engagement is reading the work the
 * Operating Rhythm produced. The founder navigated to the Command View and a briefing was there:
 * that is a deliberate act, not a passive impression.
 *
 * ⚠️ Fire ONCE PER BRIEFING per mount — never on every re-render, and never from the dashboard
 * card, which appears whether or not anyone looks at it. Counting impressions as returns would
 * make the retention gate read healthy when it is not, which is the single failure this whole
 * measurement exists to prevent.
 *
 * `ageHours` is how stale the briefing was when it was finally read. A cohort that reads within
 * a day and a cohort that reads a fortnight late both "retain", and they are not the same product.
 */
export function trackBriefingOpened(briefingId: string, createdAt: string): void {
  const created = Date.parse(createdAt)
  capture('briefing_opened', {
    briefingId,
    ageHours: Number.isNaN(created) ? -1 : Math.max(0, Math.round((Date.now() - created) / 3_600_000)),
  })
}
