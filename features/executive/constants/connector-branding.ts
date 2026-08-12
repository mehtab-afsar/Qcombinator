/**
 * Display-only branding for connectors listed in `ConnectorsPanel`. Deliberately NOT in
 * `lib/connectors/**` — a provider's name, icon, brand color and category are a UI concern, not
 * part of what makes a Connector work, so this stays in `features/` (see the lib/features
 * boundary audit this was written to respect).
 *
 * Real brand logomarks (`brand-icons.tsx`), same pattern as the `GoogleIcon` already used for
 * "Continue with Google" — see that file's docstring for sourcing.
 *
 * `category` groups the panel by what a connector lets the Executive DO, not by vendor —
 * `ConnectorsPanel` renders one section per category. A provider not listed here still renders —
 * the panel falls back to a generic plug icon, a capitalized id, and an "Other" section — so
 * adding a 6th connector needs a registry entry to function and this map only to look right.
 */

import { GmailIcon, SlackIcon, PostHogIcon, StripeIcon, type BrandIcon } from './brand-icons'

export type ConnectorCategory = 'communicate' | 'read' | 'payments'

export const CATEGORY_LABELS: Readonly<Record<ConnectorCategory, string>> = {
  communicate: 'Communicate',
  read: 'Read & analyze',
  payments: 'Payments',
}

/** Fixed display order — categories render in this sequence, regardless of registry order. */
export const CATEGORY_ORDER: readonly ConnectorCategory[] = ['communicate', 'read', 'payments']

export interface ConnectorBranding {
  label: string
  icon: BrandIcon
  color: string
  category: ConnectorCategory
}

export const CONNECTOR_BRANDING: Readonly<Record<string, ConnectorBranding>> = {
  gmail: { label: 'Gmail', icon: GmailIcon, color: '#EA4335', category: 'communicate' },
  slack: { label: 'Slack', icon: SlackIcon, color: '#4A154B', category: 'communicate' },
  gmail_read: { label: 'Gmail (read)', icon: GmailIcon, color: '#EA4335', category: 'read' },
  posthog: { label: 'PostHog', icon: PostHogIcon, color: '#F54E00', category: 'read' },
  stripe: { label: 'Stripe', icon: StripeIcon, color: '#635BFF', category: 'payments' },
}
