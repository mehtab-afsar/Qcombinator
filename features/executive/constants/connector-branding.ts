/**
 * Display-only branding for connectors listed in `ConnectorsPanel`. Deliberately NOT in
 * `lib/connectors/**` — a provider's name, icon and brand color are a UI concern, not part of
 * what makes a Connector work, so this stays in `features/` (see the lib/features boundary audit
 * this was written to respect).
 *
 * Uses `lucide-react` icons tinted with each brand's real color rather than sourcing actual brand
 * SVGs/logos — avoids any trademark-asset question while still reading as "branded", consistent
 * with the icon-driven style used everywhere else in this app.
 *
 * A provider not listed here still renders — `ConnectorsPanel` falls back to a generic plug icon
 * and a capitalized id — so adding a 5th connector needs a registry entry to function and this
 * map only to look right; the panel never breaks for missing branding.
 */

import { Mail, MailSearch, MessageSquare, CreditCard, BarChart3, type LucideIcon } from 'lucide-react'

export interface ConnectorBranding {
  label: string
  icon: LucideIcon
  color: string
}

export const CONNECTOR_BRANDING: Readonly<Record<string, ConnectorBranding>> = {
  gmail: { label: 'Gmail', icon: Mail, color: '#EA4335' },
  gmail_read: { label: 'Gmail (read)', icon: MailSearch, color: '#EA4335' },
  slack: { label: 'Slack', icon: MessageSquare, color: '#4A154B' },
  stripe: { label: 'Stripe', icon: CreditCard, color: '#635BFF' },
  posthog: { label: 'PostHog', icon: BarChart3, color: '#F54E00' },
}
