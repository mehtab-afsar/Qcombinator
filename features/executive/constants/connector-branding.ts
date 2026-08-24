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

import { GmailIcon, SlackIcon, PostHogIcon, StripeIcon, ApolloIcon, type BrandIcon } from './brand-icons'

export type ConnectorCategory = 'communicate' | 'read' | 'payments' | 'leads'

export const CATEGORY_LABELS: Readonly<Record<ConnectorCategory, string>> = {
  communicate: 'Communicate',
  read: 'Read & analyze',
  payments: 'Payments',
  leads: 'Find people',
}

/** Fixed display order — categories render in this sequence, regardless of registry order. */
export const CATEGORY_ORDER: readonly ConnectorCategory[] = ['communicate', 'leads', 'read', 'payments']

export interface ConnectorBranding {
  label: string
  icon: BrandIcon
  color: string
  category: ConnectorCategory
  /**
   * How this provider is connected. Everything so far is `'oauth'` — a redirect to the provider.
   * `'api_key'` means the founder pastes a key instead, which needs a completely different
   * affordance in the panel (a form, not a redirect). Absent means `'oauth'`.
   */
  auth?: 'oauth' | 'api_key'
  /** Where the founder finds their key, for `auth: 'api_key'` providers. */
  keyHint?: string
}

export const CONNECTOR_BRANDING: Readonly<Record<string, ConnectorBranding>> = {
  gmail: { label: 'Gmail', icon: GmailIcon, color: '#EA4335', category: 'communicate' },
  slack: { label: 'Slack', icon: SlackIcon, color: '#4A154B', category: 'communicate' },
  gmail_read: { label: 'Gmail (read)', icon: GmailIcon, color: '#EA4335', category: 'read' },
  posthog: { label: 'PostHog', icon: PostHogIcon, color: '#F54E00', category: 'read' },
  stripe: { label: 'Stripe', icon: StripeIcon, color: '#635BFF', category: 'payments' },
  apollo: {
    label: 'Apollo',
    icon: ApolloIcon,
    color: '#3B4EFF',
    category: 'leads',
    auth: 'api_key',
    keyHint: 'Apollo → Settings → Integrations → API',
  },
}
