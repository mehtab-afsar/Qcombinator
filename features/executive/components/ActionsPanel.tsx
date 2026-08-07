'use client'

/**
 * Actions awaiting the founder (F14) — the ONE human checkpoint in this product.
 *
 * ⚠️ This is NOT an approval gate on Programs. ADR-002 removed per-cycle sign-off; ADR-004 put a
 * checkpoint at the Connector boundary only, on irreversible external effects. Nothing here
 * approves a cycle, an Asset or a Briefing — and if it ever does, the gate the PRD deliberately
 * deleted has been rebuilt.
 *
 * What the founder needs before saying yes: what will be sent, to how many people, and through
 * what. Deliberately shows counts and domains rather than addresses — the audit log holds no
 * addresses either (CLAUDE.md §3), so the screen cannot show what the system does not store.
 *
 * Approving does not send. It records consent; execution happens separately and re-checks
 * everything, so a stale tab cannot push work through.
 */

import { useCallback, useEffect, useState } from 'react'
import { Check, X, Clock, Circle } from 'lucide-react'
import { bdr, ink, muted, bg, amber, red, green, purple, alpha } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Button } from '@/features/shared/components/Button'
import { Badge } from '@/features/shared/components/Badge'

interface PendingAction {
  id: string
  actionId: string
  provider: string | null
  payloadHash: string | null
  request: { recipientCount?: number; recipientDomains?: string[]; subjectLength?: number }
  createdAt: string
  /** Resolved server-side via attachOwners (lib/actions/log.ts) — action_log itself has no
   *  executive column, only programId. Used to filter this panel to one executive's items on
   *  the detail page; absent (undefined) filtering shows everyone's, as on the roster page. */
  executiveId?: string | null
}

/** Mirrors app/api/actions/route.ts's allActionsForFounder — every Action in the mandate's
 *  active Programs, not just what's pending. 'never_run' is a client-side status, not a DB
 *  value: the Registry knows the action exists before the engine has ever attempted it. */
interface ActionSummary {
  actionId: string
  name: string
  irreversible: boolean
  executiveId: string | null
  status: 'pending_approval' | 'approved' | 'sending' | 'executed' | 'failed' | 'declined' | 'unknown' | 'never_run'
  provider: string | null
  createdAt: string | null
}

/** Mirrors APPROVAL_TTL_MS in lib/actions/approve.ts — an approval is about a moment too. */
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000

/**
 * @param executiveId scope to one executive's pending actions (the detail page). Omitted on the
 *   roster page, where this is the cross-team "waiting for you" checkpoint — the one place
 *   showing everyone's at once is correct, not an oversight.
 */
export function ActionsPanel({ executiveId }: { executiveId?: string } = {}) {
  const [pending, setPending] = useState<PendingAction[]>([])
  const [all, setAll] = useState<ActionSummary[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/actions')
      if (!res.ok) return // 404 = flag off; leave the last good state rather than flash an error
      const data = await res.json()
      const pendingAll: PendingAction[] = data.pending ?? []
      const summaryAll: ActionSummary[] = data.all ?? []
      setPending(executiveId ? pendingAll.filter(a => a.executiveId === executiveId) : pendingAll)
      setAll(executiveId ? summaryAll.filter(a => a.executiveId === executiveId) : summaryAll)
    } catch {
      /* transient — the next load retries */
    } finally {
      setLoaded(true)
    }
  }, [executiveId])

  useEffect(() => { void load() }, [load])

  async function decide(entry: PendingAction, decision: 'approve' | 'decline') {
    setBusyId(entry.id)
    setError(null)
    try {
      const res = await fetch('/api/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // The hash of what THIS screen showed. If the payload was regenerated since, the server
        // refuses — consent does not transfer to a version the founder never saw.
        body: JSON.stringify({ entryId: entry.id, decision, payloadHash: entry.payloadHash }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not record your decision.'); return }
      await load()
    } catch {
      setError('Could not reach the server. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  if (!loaded) return null

  if (pending.length === 0) {
    // FU-009: this used to return null the moment nothing was pending, which hid the 4 internal
    // actions entirely — not "nothing to show," a founder just had no way to see the team had
    // done that work. Show honest status for all of them; say nothing only when there is
    // genuinely no Program with any Actions defined at all.
    if (all.length === 0) return null
    return (
      <SectionCard title="Your team's actions" style={{ background: alpha(purple, 0.04) }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {all.map(a => <ActionStatusRow key={a.actionId} action={a} />)}
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard
      title="Needs your approval"
      style={{ background: alpha(purple, 0.04) }}
      action={<Badge variant="amber">{pending.length}</Badge>}
    >
      {/* UX_SPEC §6: the team addressing the founder directly, not chrome — serif per the rule
          applied in RhythmPanel.tsx's StatusLine. Deliberately stops here; recipient counts and
          statuses below stay in the default sans, since those are facts, not someone talking. */}
      <p style={{ color: muted, fontFamily: FONT_SERIF, fontSize: 14, lineHeight: 1.6, maxWidth: 560 }}>
        Your team prepared these but will not send anything until you say so. This is the only
        thing in the product that waits for you.
      </p>

      {error && <p style={{ color: red, fontSize: 13, marginTop: 10 }}>{error}</p>}

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {pending.map(entry => (
          <ActionCard
            key={entry.id}
            entry={entry}
            busy={busyId === entry.id}
            onDecide={decision => void decide(entry, decision)}
          />
        ))}
      </div>

      {all.length > pending.length && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${bdr}` }}>
          <p style={{ color: muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.4, margin: '0 0 10px' }}>
            The rest of the team&rsquo;s actions
          </p>
          <div style={{ display: 'grid', gap: 10 }}>
            {all.filter(a => a.status !== 'pending_approval').map(a => <ActionStatusRow key={a.actionId} action={a} />)}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

/** One line, honest status — done, waiting on you, or not run yet. No approve/decline here;
 *  that control only exists on the actual pending card above, never duplicated. */
function ActionStatusRow({ action }: { action: ActionSummary }) {
  const { icon, color, note } = statusLook(action.status)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, fontSize: 14,
      background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md, padding: '10px 14px',
    }}>
      <span style={{ display: 'flex', width: 16 }}>{icon}</span>
      <span style={{ color: ink, flex: 1 }}>{action.name}</span>
      {action.irreversible && (
        <span style={{ color: muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {action.provider ? `via ${action.provider}` : 'external'}
        </span>
      )}
      <span style={{ color, fontSize: 12 }}>{note}</span>
    </div>
  )
}

function statusLook(status: ActionSummary['status']): { icon: React.ReactNode; color: string; note: string } {
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

function ActionCard(
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

