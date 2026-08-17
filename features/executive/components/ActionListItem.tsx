'use client'

/**
 * The presentational half of ActionsPanel — one pending Action's approve/decline card, and one
 * completed/idle Action's status row. Split out because ActionsPanel.tsx was at CLAUDE.md's
 * ~300-line ceiling; these four (ActionCard, ActionStatusRow, statusLook, humanLabel) were
 * already pure/presentational with no closure over ActionsPanel's own state, so the split is a
 * plain extraction, not a redesign.
 */

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, X, Clock, Circle, ChevronDown } from 'lucide-react'
import { bdr, ink, muted, bg, amber, red, green } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { Button } from '@/features/shared/components/Button'
import type { PendingAction, ActionSummary } from './ActionsPanel'

/** Mirrors APPROVAL_TTL_MS in lib/actions/approve.ts — an approval is about a moment too. */
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000

/** One line, honest status — done, waiting on you, or not run yet. No approve/decline here;
 *  that control only exists on the actual pending card above, never duplicated. A completed
 *  internal Action with a real analysis (Gap A/B — the work was always done, just discarded
 *  before this) expands in place to show it, rather than opening a second surface. */
export function ActionStatusRow({ action }: { action: ActionSummary }) {
  const { icon, color, note } = statusLook(action.status)
  const [open, setOpen] = useState(false)
  const expandable = action.status === 'executed' && !!action.summary

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md }}>
      <div
        onClick={expandable ? () => setOpen(o => !o) : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '10px 14px',
          cursor: expandable ? 'pointer' : 'default',
        }}
      >
        <span style={{ display: 'flex', width: 16 }}>{icon}</span>
        <span style={{ color: ink, flex: 1 }}>{action.name}</span>
        {action.irreversible && (
          <span style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {action.provider ? `via ${action.provider}` : 'external'}
          </span>
        )}
        <span style={{ color, fontSize: 12 }}>{note}</span>
        {expandable && (
          <ChevronDown
            size={13} color={muted}
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s', flexShrink: 0 }}
          />
        )}
      </div>
      {expandable && open && (
        // Rendered as markdown, not raw pre-wrap text — the analysis text routinely comes back
        // with real headings/tables/emphasis (judge.ts's own prompts ask for structured
        // analysis), and showing the literal #/**/| characters read as "a dump of text," the
        // same gap fixed in ActivationScreen's reading pane.
        <div style={{
          color: muted, fontFamily: FONT_SERIF, fontSize: 13, lineHeight: 1.6,
          margin: 0, padding: '0 14px 14px', borderTop: `1px solid ${bdr}`, paddingTop: 12,
        }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{action.summary}</ReactMarkdown>
        </div>
      )}
    </div>
  )
}

export function statusLook(status: ActionSummary['status']): { icon: React.ReactNode; color: string; note: string } {
  switch (status) {
    case 'executed':
      return { icon: <Check size={15} color={green} />, color: green, note: 'done' }
    case 'pending_approval':
      return { icon: <Clock size={15} color={amber} />, color: amber, note: 'waiting on you' }
    case 'declined':
      return { icon: <X size={15} color={muted} />, color: muted, note: 'declined' }
    case 'failed':
      return { icon: <X size={15} color={red} />, color: red, note: 'failed' }
    case 'never_run':
      return { icon: <Circle size={9} color={bdr} />, color: muted, note: 'not run yet' }
    default:
      return { icon: <Circle size={9} color={bdr} />, color: muted, note: status }
  }
}

export function ActionCard(
  { entry, busy, onDecide }:
  { entry: PendingAction; busy: boolean; onDecide: (d: 'approve' | 'decline') => void },
) {
  const count = entry.request.recipientCount ?? 0
  const domains = entry.request.recipientDomains ?? []
  const expiresIn = APPROVAL_TTL_MS - (Date.now() - new Date(entry.createdAt).getTime())
  const hours = Math.max(0, Math.floor(expiresIn / 3_600_000))

  return (
    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'baseline' }}>
        <span style={{ color: ink, fontSize: 15, fontWeight: 600 }}>{humanLabel(entry.actionId)}</span>
        {entry.provider && (
          <span style={{ color: muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4 }}>
            via {entry.provider}
          </span>
        )}
      </div>

      {/* Counts and domains, never addresses — the log stores none, so this cannot show any. */}
      <p style={{ color: muted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
        {count === 0
          ? 'No recipients — your team could not find contacts to reach. Nothing will send.'
          : `${count} recipient${count === 1 ? '' : 's'}${domains.length ? ` at ${domains.join(', ')}` : ''}.`}
      </p>

      <p style={{ color: hours < 4 ? amber : muted, fontSize: 12, marginTop: 6 }}>
        {hours > 0
          ? `Expires in about ${hours} hour${hours === 1 ? '' : 's'}.`
          : 'Expires shortly — after that your team will prepare a fresh one.'}
      </p>

      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <Button
          variant="primary" size="sm" loading={busy} disabled={count === 0}
          icon={<Check size={14} />} onClick={() => onDecide('approve')}
        >
          {count === 0 ? 'Nothing to send' : 'Approve and send'}
        </Button>
        <Button
          variant="secondary" size="sm" disabled={busy}
          icon={<X size={14} />} onClick={() => onDecide('decline')}
        >
          Decline
        </Button>
      </div>
    </div>
  )
}

/** 'interview_customers' → 'Interview customers'. The Registry name isn't sent to the client. */
function humanLabel(actionId: string): string {
  const words = actionId.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}
