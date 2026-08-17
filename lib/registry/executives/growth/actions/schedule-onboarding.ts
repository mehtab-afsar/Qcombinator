import type { ActionDef } from '../../../types'

/**
 * schedule_onboarding — produce a structured onboarding plan (sessions,
 * milestones, owners, timeline) for a newly signed customer, built on the
 * Customer Success Framework's Onboarding Framework.
 *
 * Internal plan, not a live calendar booking — there is no calendar
 * Connector registered (only gmail, slack, stripe, posthog are —
 * lib/connectors/registry.ts), and this Action's deliverable is a
 * ready-to-schedule plan a human still has to put on the calendar.
 * `irreversible: false`, no `connector`.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only
 * the name came from the Program Registry.
 */
export const SCHEDULE_ONBOARDING: ActionDef = {
  id: 'schedule_onboarding',
  name: 'Schedule Onboarding',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'schedule_onboarding',
}
