/**
 * Server-side PostHog analytics for API routes.
 * Use this for tracking events in server-side code (API routes, webhooks, etc.)
 *
 * For client-side tracking use the PostHogProvider in app/layout.tsx.
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

// ─── V1 Launch Events ────────────────────────────────────────────────────────

export function trackFounderSignedUp(userId: string, props?: { method?: 'email' | 'google' }) {
  getPostHog()?.capture({ distinctId: userId, event: 'founder_signed_up', properties: props })
}

export function trackOnboardingCompleted(userId: string, props?: { step?: number }) {
  getPostHog()?.capture({ distinctId: userId, event: 'onboarding_completed', properties: props })
}

export function trackProfileBuilderCompleted(userId: string, props?: { qScore?: number }) {
  getPostHog()?.capture({ distinctId: userId, event: 'profile_builder_completed', properties: props })
}

export function trackAgentMessageSent(userId: string, props: { agentId: string; isFirstMessage?: boolean }) {
  getPostHog()?.capture({ distinctId: userId, event: 'agent_message_sent', properties: props })
}

export function trackArtifactGenerated(userId: string, props: { agentId: string; artifactType: string; version?: number }) {
  getPostHog()?.capture({ distinctId: userId, event: 'artifact_generated', properties: props })
}

export function trackQScoreMilestone(userId: string, props: { milestone: 40 | 65 | 80; score: number }) {
  getPostHog()?.capture({ distinctId: userId, event: 'q_score_milestone_reached', properties: props })
}

export function trackInvestorMatchViewed(userId: string, props?: { investorId?: string }) {
  getPostHog()?.capture({ distinctId: userId, event: 'investor_match_viewed', properties: props })
}

export function trackConnectionRequestSent(userId: string, props?: { investorId?: string }) {
  getPostHog()?.capture({ distinctId: userId, event: 'connection_request_sent', properties: props })
}

export function trackUpgradedToPremium(userId: string, props?: { plan?: string }) {
  getPostHog()?.capture({ distinctId: userId, event: 'upgraded_to_premium', properties: props })
}

export function trackChurned(userId: string, props?: { plan?: string }) {
  getPostHog()?.capture({ distinctId: userId, event: 'churned', properties: props })
}

export function trackQScoreBadgeShared(userId: string) {
  getPostHog()?.capture({ distinctId: userId, event: 'q_score_badge_shared' })
}
