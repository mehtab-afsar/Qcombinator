/**
 * The notification type registry — one entry per type, one source of truth for its icon,
 * accent color, deep link, and which preference category (if any) gates it. Replaces two
 * separate maps that used to live in NotificationPanel.tsx (TYPE_COLOR, TYPE_ICON) plus
 * per-type deep-link branches hardcoded into NotifRow — a new type is now one entry here, not
 * a UI change.
 *
 * Imported by both the writer (lib/notifications/create.ts, server-side — for validation and
 * preference gating) and the panel (features/shared/components/NotificationPanel.tsx, client
 * — for icon/color/deep-link). Plain module, no directive, safe in both.
 *
 * `channel` documents intent, it doesn't send anything itself: an 'in-app+email' type still
 * needs its own explicit send*Email call at the write site (lib/email/send.ts already has
 * bespoke content per email; this registry doesn't try to generate email copy generically).
 */

import {
  Bell, MessageCircle, UserPlus, CheckCircle2, TrendingUp, Handshake, Link2, CreditCard,
  UserCog, UserX, CalendarCheck, AlertTriangle, Megaphone, Eye, ClipboardCheck, FileText,
  type LucideIcon,
} from 'lucide-react'
import { blue, green, amber, red, purple, cyan, muted } from '@/lib/constants/colors'

export type NotificationChannel = 'in-app' | 'in-app+email'

/** Groups types for the settings UI (Phase 4) — several types share one toggle. `null` means
 *  the type is never gated by preference (currently only the approval checkpoint). */
export type PreferenceCategory =
  | 'qscore_updates' | 'connection_req' | 'deal_flow_notifications' | 'investor_messages'
  | 'runway_alerts' | 'weekly_digest' | 'cycle_briefings'

export interface NotificationTypeConfig {
  icon: LucideIcon
  color: string
  /** Human label used in the preference settings UI (Phase 4). */
  label: string
  channel: NotificationChannel
  preferenceCategory: PreferenceCategory | null
  /** Reads a notification's metadata and returns where clicking it should go, or null for no
   *  link. `metadata.href`, when present, always wins over this — see NotifRow. */
  deepLink?: (metadata: Record<string, unknown> | undefined) => string | null
}

const agentPath = (metadata: Record<string, unknown> | undefined) => {
  const toAgent = metadata?.toAgent as string | undefined
  return toAgent ? `/founder/executive/${toAgent}` : '/founder/executive'
}

export const NOTIFICATION_REGISTRY = {
  message: {
    icon: MessageCircle, color: blue, label: 'Messages', channel: 'in-app',
    preferenceCategory: 'investor_messages',
    // Both directions (founder→investor, investor→founder) always pass metadata.href at write
    // time, since only the caller knows which side's inbox to route to — this is the fallback
    // for the rare row that doesn't have one.
    deepLink: () => '/founder/messages',
  },
  connection_request: {
    icon: UserPlus, color: blue, label: 'Connection requests', channel: 'in-app+email',
    preferenceCategory: 'connection_req',
    deepLink: () => '/investor/deal-flow',
  },
  connection_accepted: {
    icon: CheckCircle2, color: green, label: 'Connection requests', channel: 'in-app+email',
    preferenceCategory: 'connection_req',
    deepLink: () => '/founder/messages',
  },
  qscore_update: {
    icon: TrendingUp, color: green, label: 'Q-Score milestones', channel: 'in-app',
    preferenceCategory: 'qscore_updates',
    deepLink: () => '/founder/dashboard',
  },
  deal_flow: {
    icon: Bell, color: amber, label: 'Deal-flow matches', channel: 'in-app+email',
    preferenceCategory: 'deal_flow_notifications',
    deepLink: () => '/investor/deal-flow',
  },
  investor_outreach: {
    icon: Megaphone, color: purple, label: 'Investor outreach', channel: 'in-app',
    // A founder-facing notification — an investor reaching out first — not investor-facing
    // despite the name; the old inline insert linked nowhere, so this was never wrong in a
    // way anyone saw.
    preferenceCategory: 'investor_messages',
    deepLink: () => '/founder/matching',
  },
  startup_share: {
    icon: Link2, color: cyan, label: 'Shared profiles', channel: 'in-app',
    preferenceCategory: 'investor_messages',
    deepLink: (m) => (m?.founderId ? `/investor/startup/${m.founderId}` : null),
  },
  investor_view: {
    icon: Eye, color: amber, label: 'Profile views', channel: 'in-app',
    preferenceCategory: 'qscore_updates',
    deepLink: () => '/founder/dashboard',
  },
  investor_verified: {
    icon: CheckCircle2, color: green, label: 'Account status', channel: 'in-app',
    // An admin decision about the account itself, not an activity stream item — never gated.
    preferenceCategory: null,
    deepLink: () => '/investor/settings',
  },
  stripe_verify: {
    // Stripe's own brand purple — a deliberate exception to the app palette, not a token.
    icon: CreditCard, color: '#635BFF', label: 'Billing', channel: 'in-app',
    preferenceCategory: null,
    deepLink: () => '/founder/billing',
  },
  team_member_joined: {
    icon: UserPlus, color: green, label: 'Team changes', channel: 'in-app',
    preferenceCategory: null,
    deepLink: () => '/founder/settings',
  },
  team_role_changed: {
    icon: UserCog, color: blue, label: 'Team changes', channel: 'in-app',
    preferenceCategory: null,
    deepLink: () => '/founder/settings',
  },
  team_member_removed: {
    icon: UserX, color: red, label: 'Team changes', channel: 'in-app',
    preferenceCategory: null,
    deepLink: () => '/founder/settings',
  },
  cycle_completed: {
    icon: CheckCircle2, color: green, label: 'Cycle updates', channel: 'in-app',
    preferenceCategory: 'cycle_briefings',
    deepLink: agentPath,
  },
  cycle_failed: {
    icon: AlertTriangle, color: red, label: 'Cycle updates', channel: 'in-app',
    preferenceCategory: 'cycle_briefings',
    deepLink: agentPath,
  },
  workshop_registered: {
    icon: CalendarCheck, color: green, label: 'Academy', channel: 'in-app',
    preferenceCategory: null,
    deepLink: () => '/founder/academy',
  },
  // ── Not yet written anywhere (coverage plan Phase 2 / Phase 5) — registered now so the
  // writer + panel need no further changes once each is wired up at its real event.
  action_pending: {
    icon: ClipboardCheck, color: amber, label: 'Approvals', channel: 'in-app+email',
    // Deliberately not gated by preference — this is the product's one safety checkpoint
    // (ActionsPanel), matching CLAUDE.md: "no approval gates... except irreversible external
    // Actions." A founder can't opt out of being told one exists.
    preferenceCategory: null,
    deepLink: () => '/founder/executive',
  },
  briefing_published: {
    icon: FileText, color: muted, label: 'Cycle updates', channel: 'in-app',
    preferenceCategory: 'cycle_briefings',
    deepLink: agentPath,
  },
} as const satisfies Record<string, NotificationTypeConfig>

export type NotificationType = keyof typeof NOTIFICATION_REGISTRY

export const NOTIFICATION_TYPES = Object.keys(NOTIFICATION_REGISTRY) as NotificationType[]

export function isNotificationType(type: string): type is NotificationType {
  return type in NOTIFICATION_REGISTRY
}

/** Legacy icon-only entries for notification types with no live writer (most predate ADR-034's
 *  adviser-layer deletion) — kept so any old row still in the table renders with a real icon
 *  instead of the generic bell fallback, without pretending they're active types. */
export const LEGACY_ICONS: Record<string, LucideIcon> = {
  agent_complete: CheckCircle2,
  agent_action: Bell,
  price_change_alert: Bell,
  runway_alert: AlertTriangle,
  runway_cuts_analysis: AlertTriangle,
  deal_reminder: Handshake,
  investor_update_sent: Megaphone,
  outreach_sent: Megaphone,
  site_deployed: Bell,
  blog_published: Bell,
  nda_generated: FileText,
  safe_generated: FileText,
  term_sheet_analysis: FileText,
  data_room_generated: FileText,
  weekly_standup: Bell,
  offer_letter_sent: Megaphone,
  survey_created: ClipboardCheck,
  fake_door_deployed: Bell,
}
