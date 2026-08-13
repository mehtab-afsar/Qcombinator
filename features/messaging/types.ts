// One canonical message shape — re-exported, not redefined, from the one place that
// already does this correctly (buildGroups/MessageGroupBlock stay untouched).
export type { ChatMessage } from '@/features/shared/components/MessageBubble'

export interface LastMessagePreview {
  body: string
  createdAt: string
  senderId: string
}

/** A row in the sidebar list — a pending request or an accepted conversation, for
 *  either role. `ConversationListItem` renders both shapes off this one type. */
export interface ConversationSummary {
  id: string
  /** Startup name (founder's view of an investor... no — the OTHER party's display
   *  name: investor name+firm for founders, startup name for investors). */
  displayName: string
  subtitle?: string
  personalMessage?: string | null
  /** Whether the CURRENT viewer wrote personalMessage — false when it's the other party's note. */
  personalMessageFromMe?: boolean
  status: string
  createdAt: string
  lastMessage?: LastMessagePreview | null
  unreadCount?: number
}

/** The investor-only richer decision view (Q-Score, tags, one-liner) — kept as its
 *  own type rather than forced into ConversationSummary, since founders have no
 *  symmetric "decide" surface (see the mini-PRD's asymmetry note). */
export interface PendingRequestDetail extends ConversationSummary {
  founderId: string
  founderName: string
  startupName: string
  oneLiner?: string
  stage: string
  industry: string
  qScore: number
  qScoreBreakdown: { p1: number; p2: number; p3: number; p4: number; p5: number; p6: number }
}

export type MessagingPanel =
  | { type: 'request'; data: PendingRequestDetail }
  | { type: 'conversation'; data: ConversationSummary }
  | null
