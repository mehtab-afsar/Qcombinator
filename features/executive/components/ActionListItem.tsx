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
import { Check, X, Clock, Circle, ChevronDown, Download } from 'lucide-react'
import { bdr, ink, muted, bg, amber, red, green, blue } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { Button } from '@/features/shared/components/Button'
import type { PendingAction, ActionSummary } from './ActionsPanel'

const PULL_SOURCE_LABEL: Record<'gmail_read' | 'posthog', string> = {
  gmail_read: 'Gmail',
  posthog: 'PostHog',
}

/** A founder-triggered pull of real Connector data for one Action — never automatic. Nothing
 *  runs until this button is clicked; see app/api/actions/[id]/pull-data/route.ts. */
function PullDataControl({ action }: { action: ActionSummary }) {
  const [query, setQuery] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [lastPulledAt, setLastPulledAt] = useState(action.lastPulledAt)

  async function pull() {
    setState('loading')
    try {
      const res = await fetch(`/api/actions/${action.actionId}/pull-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) { setState('error'); return }
      setLastPulledAt(data.pulledAt)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  if (!action.pullSource) return null
  const label = PULL_SOURCE_LABEL[action.pullSource]

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 12px', flexWrap: 'wrap' }}
    >
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={`Ask ${label} something specific (optional)`}
        style={{
          flex: 1, minWidth: 160, fontSize: 12, padding: '6px 10px', borderRadius: radius.sm,
          border: `1px solid ${bdr}`, background: bg, color: ink, fontFamily: 'inherit',
        }}
      />
      <Button variant="secondary" size="sm" loading={state === 'loading'} icon={<Download size={13} />} onClick={() => void pull()}>
        Pull from {label}
      </Button>
      {state === 'error' && <span style={{ color: red, fontSize: 11 }}>Could not pull real data.</span>}
      {lastPulledAt && state !== 'error' && (
        <span style={{ color: muted, fontSize: 11 }}>
          Last pulled {new Date(lastPulledAt).toLocaleDateString()}
        </span>
      )}
    </div>
  )
}

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
      {/* Always available, regardless of status — a founder can ground this Action in real data
          whether it's never run yet or already has a result, since the pull only affects the
          NEXT time it runs. Never automatic; see PullDataControl's own comment. */}
      <PullDataControl action={action} />
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

interface RealPayload {
  recipients?: ReadonlyArray<{ email: string; name?: string }>
  subject?: string
  body?: string
  channel?: string
}

/** Fetched on demand only — never pre-loaded — so the real content (subject/body/addresses)
 *  doesn't reach the browser until the founder actually asks to review it. Server-side ownership
 *  check happens in the route; this is purely "did the founder click to look." */
function ReviewContent({ entryId }: { entryId: string }) {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [payload, setPayload] = useState<RealPayload | null>(null)

  async function load() {
    setState('loading')
    try {
      const res = await fetch(`/api/actions/${entryId}/payload`)
      const data = await res.json()
      if (!res.ok) { setState('error'); return }
      setPayload(data.payload)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  if (!payload && state === 'idle') {
    return (
      <button
        onClick={() => void load()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
          padding: 0, marginTop: 10, cursor: 'pointer', color: blue, fontSize: 12, fontFamily: 'inherit',
        }}
      >
        Review the actual message <ChevronDown size={12} />
      </button>
    )
  }

  if (state === 'loading') {
    return <p style={{ color: muted, fontSize: 12, marginTop: 10 }}>Loading…</p>
  }

  if (state === 'error' || !payload) {
    return <p style={{ color: red, fontSize: 12, marginTop: 10 }}>Could not load the message content.</p>
  }

  return (
    <div style={{
      marginTop: 10, padding: 12, borderRadius: radius.md, border: `1px solid ${bdr}`,
      background: bg, fontSize: 13,
    }}>
      {payload.recipients && payload.recipients.length > 0 && (
        <p style={{ color: muted, margin: '0 0 8px' }}>
          <strong style={{ color: ink }}>To:</strong>{' '}
          {payload.recipients.map(r => r.name ? `${r.name} <${r.email}>` : r.email).join(', ')}
        </p>
      )}
      {payload.subject && (
        <p style={{ color: ink, fontWeight: 600, margin: '0 0 8px' }}>{payload.subject}</p>
      )}
      {payload.body && (
        <div style={{ color: muted, fontFamily: FONT_SERIF, lineHeight: 1.6 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{payload.body}</ReactMarkdown>
        </div>
      )}
    </div>
  )
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

      {/* Counts and domains here — never addresses; the log itself stores none. The real
          content, addresses included, is one click away via ReviewContent below, fetched fresh
          from the vault rather than ever living in this component's own props. */}
      <p style={{ color: muted, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
        {count === 0
          ? 'No recipients — your team could not find contacts to reach. Nothing will send.'
          : `${count} recipient${count === 1 ? '' : 's'}${domains.length ? ` at ${domains.join(', ')}` : ''}.`}
      </p>

      {count > 0 && <ReviewContent entryId={entry.id} />}

      <p style={{ color: hours < 4 ? amber : muted, fontSize: 12, marginTop: 10 }}>
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
