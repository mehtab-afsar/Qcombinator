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
import { AlertCircle, Check, Loader2, X } from 'lucide-react'
import { surf, bdr, ink, muted, green, amber, red } from '@/lib/constants/colors'

interface PendingAction {
  id: string
  actionId: string
  provider: string | null
  payloadHash: string | null
  request: { recipientCount?: number; recipientDomains?: string[]; subjectLength?: number }
  createdAt: string
}

/** Mirrors APPROVAL_TTL_MS in lib/actions/approve.ts — an approval is about a moment too. */
const APPROVAL_TTL_MS = 24 * 60 * 60 * 1000

export function ActionsPanel() {
  const [pending, setPending] = useState<PendingAction[]>([])
  const [loaded, setLoaded] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/actions')
      if (!res.ok) return // 404 = flag off; leave the last good state rather than flash an error
      const data = await res.json()
      setPending(data.pending ?? [])
    } catch {
      /* transient — the next load retries */
    } finally {
      setLoaded(true)
    }
  }, [])

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

  // Nothing waiting is the normal state — say nothing rather than occupy the page with an
  // empty box the founder has to parse every visit.
  if (!loaded || pending.length === 0) return null

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <AlertCircle size={17} color={amber} />
        <h2 style={{ color: ink, fontSize: 17, fontWeight: 600, margin: 0 }}>
          Waiting for you {pending.length > 1 && `(${pending.length})`}
        </h2>
      </div>
      <p style={{ color: muted, fontSize: 14, marginTop: 8, lineHeight: 1.6, maxWidth: 560 }}>
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
    </div>
  )
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
    <div style={{ background: '#fff', border: `1px solid ${bdr}`, borderRadius: 10, padding: 16 }}>
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
        <button onClick={() => onDecide('approve')} disabled={busy || count === 0} style={approveBtn(busy || count === 0)}>
          {busy ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
          {count === 0 ? 'Nothing to send' : 'Approve and send'}
        </button>
        <button onClick={() => onDecide('decline')} disabled={busy} style={declineBtn}>
          <X size={14} /> Decline
        </button>
      </div>
    </div>
  )
}

/** 'interview_customers' → 'Interview customers'. The Registry name isn't sent to the client. */
function humanLabel(actionId: string): string {
  const words = actionId.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const card: React.CSSProperties = {
  background: surf, border: `1px solid ${amber}`, borderRadius: 12, padding: 24, marginTop: 20,
}

const approveBtn = (disabled: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: disabled ? bdr : green, color: disabled ? muted : '#fff',
  border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 14, fontWeight: 500,
  cursor: disabled ? 'default' : 'pointer',
})

const declineBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  background: 'none', color: ink, border: `1px solid ${bdr}`,
  borderRadius: 8, padding: '9px 16px', fontSize: 14, cursor: 'pointer',
}
