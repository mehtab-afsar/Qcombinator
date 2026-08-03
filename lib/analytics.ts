/**
 * Server-side analytics.
 *
 * ⚠️ THE ONE THING THIS EXISTS FOR. Phase 4 is decided by **week-4 retention** (ADR-016), and
 * retention cannot be measured backwards. Every other gap on the project is recoverable by doing
 * the work later; this one is not. If nothing is capturing before the first founder arrives, the
 * pilot finishes and the question has no answer.
 *
 * Rebuilt 4 Aug 2026. The previous taxonomy tracked the adviser layer — and **8 of its 11 events
 * had no caller at all**, so the file described a measurement plan rather than performing one.
 * Two of them (`agent_message_sent`, `artifact_generated`) could never fire again after ADR-034.
 *
 * ── Rules ────────────────────────────────────────────────────────────────────────────────
 *
 * **Never break a request.** Analytics is the least important thing in any code path it appears
 * in. `capture` swallows everything, including a misconfigured key. A dropped event is a gap in a
 * chart; a thrown one is a founder's mandate failing to confirm.
 *
 * **No PII, ever** (CLAUDE.md §3) — the same rule `action_log` follows. Counts, types, ids and
 * durations. Never a subject line, a recipient address, an asset body or a briefing verdict. The
 * distinct id is the founder's UUID, which is already how the surviving events identify people.
 *
 * **Events describe what HAPPENED, not what was shown.** `briefing_opened` means a founder came
 * back and read something; it is the retention signal, and it must not be fired by a render.
 */

import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getPostHog(): PostHog | null {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return null
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

/** Every event name in the product, in one place — so the taxonomy is reviewable as a list. */
export type AnalyticsEvent =
  // ── Activation: the founder hands over autonomy ────────────────────────────────────────
  | 'strategy_set'
  | 'mandate_drafted'
  | 'mandate_confirmed'      // ← ACTIVATION. Everything downstream is impossible before this.
  | 'epoch_issued'           // redirected the team rather than approving its work (ADR-002/003)
  // ── The system working, unattended ─────────────────────────────────────────────────────
  | 'cycle_completed'
  | 'cycle_failed'
  | 'briefing_generated'
  | 'asset_version_created'
  // ── The founder coming BACK — what week-4 retention is actually made of ────────────────
  | 'briefing_opened'        // ← THE retention signal: they returned and read the work
  | 'action_approved'
  | 'action_declined'
  | 'asset_edited_by_founder'
  // ── Acting in the real world ───────────────────────────────────────────────────────────
  | 'connector_connected'
  | 'connector_revoked'
  | 'action_executed'
  // ── Surviving non-executive surfaces ───────────────────────────────────────────────────
  | 'founder_signed_up'
  | 'upgraded_to_premium'
  | 'churned'

/**
 * Send one event. Failures are swallowed on purpose — see the header.
 *
 * Not exported: callers use the named helpers below, so every event's property shape is declared
 * once and cannot drift between call sites.
 */
function capture(
  event: AnalyticsEvent,
  founderId: string,
  properties?: Record<string, string | number | boolean | null>,
): void {
  try {
    getPostHog()?.capture({ distinctId: founderId, event, properties })
  } catch {
    /* Analytics must never be the reason a request fails. */
  }
}

// ─── Activation ──────────────────────────────────────────────────────────────────────────

export function trackStrategySet(founderId: string, props: { priorities: number; goals: number }): void {
  capture('strategy_set', founderId, props)
}

export function trackMandateDrafted(founderId: string, props: { epoch: number; programs: number }): void {
  capture('mandate_drafted', founderId, props)
}

/**
 * ACTIVATION — the single confirmation in the whole product (ADR-002).
 *
 * `daysSinceSignup` is the activation-latency number, recorded here rather than derived later
 * because a founder's signup date is in a different system and joining the two in PostHog is
 * exactly the kind of analysis nobody does under time pressure.
 */
export function trackMandateConfirmed(
  founderId: string,
  props: { epoch: number; programs: number; daysSinceSignup: number | null },
): void {
  capture('mandate_confirmed', founderId, props)
}

export function trackEpochIssued(founderId: string, props: { fromEpoch: number; toEpoch: number }): void {
  capture('epoch_issued', founderId, props)
}

// ─── The system working ──────────────────────────────────────────────────────────────────

export function trackCycleCompleted(
  founderId: string,
  props: { programs: number; steps: number; durationMs: number; assets: number; actions: number },
): void {
  capture('cycle_completed', founderId, props)
}

/** `reason` is a code (`step_limit_exceeded`, …), never a raw error message — those carry data. */
export function trackCycleFailed(founderId: string, props: { reason: string; steps: number }): void {
  capture('cycle_failed', founderId, props)
}

export function trackBriefingGenerated(
  founderId: string,
  props: { programId: string; changedAssets: number },
): void {
  capture('briefing_generated', founderId, props)
}

export function trackAssetVersionCreated(
  founderId: string,
  props: { assetId: string; version: number; authoredBy: 'program' | 'founder' },
): void {
  capture('asset_version_created', founderId, props)
}

// ─── The founder coming back ─────────────────────────────────────────────────────────────

// `briefing_opened` is fired from the BROWSER — see lib/analytics-client.ts. It marks a
// founder deliberately returning to read the work, which a server route cannot observe.

export function trackActionApproved(founderId: string, props: { actionId: string; irreversible: boolean }): void {
  capture('action_approved', founderId, props)
}

export function trackActionDeclined(founderId: string, props: { actionId: string }): void {
  capture('action_declined', founderId, props)
}

export function trackAssetEditedByFounder(founderId: string, props: { assetId: string; version: number }): void {
  capture('asset_edited_by_founder', founderId, props)
}

// ─── Acting in the real world ────────────────────────────────────────────────────────────

export function trackConnectorConnected(founderId: string, props: { provider: string }): void {
  capture('connector_connected', founderId, props)
}

export function trackConnectorRevoked(founderId: string, props: { provider: string }): void {
  capture('connector_revoked', founderId, props)
}

/**
 * `outcome` mirrors `action_log`, `unknown` included. A send we cannot prove landed is not a
 * success and not a failure, and flattening it to either would put a number in a dashboard that
 * the audit log itself refuses to assert.
 */
export function trackActionExecuted(
  founderId: string,
  props: { actionId: string; provider: string; outcome: 'executed' | 'unknown' | 'failed' },
): void {
  capture('action_executed', founderId, props)
}

// ─── Surviving non-executive surfaces ────────────────────────────────────────────────────

export function trackFounderSignedUp(founderId: string, props?: { method?: 'email' | 'google' }): void {
  capture('founder_signed_up', founderId, props ?? {})
}

export function trackUpgradedToPremium(founderId: string, props?: { plan?: string }): void {
  capture('upgraded_to_premium', founderId, { plan: props?.plan ?? null })
}

export function trackChurned(founderId: string, props?: { plan?: string }): void {
  capture('churned', founderId, { plan: props?.plan ?? null })
}
