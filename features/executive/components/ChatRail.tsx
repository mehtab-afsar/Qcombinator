'use client'

/**
 * CANVAS_SPEC §4.6 — the chat rail. The 7th and last cockpit section.
 *
 * ⚠️ STATELESS — this is the checkable half of the no-thread rule the route's own docstring
 * explains (app/api/executive/[executiveId]/chat/route.ts). The turn log below is local
 * component state for the founder's own reference only; it is NEVER sent back to the server.
 * Each submission is one independent call. If you're tempted to add a "previous turns" field to
 * the request, stop — that's ADR-034's adviser chat again, not this.
 *
 * Not a slide-over. CANVAS_SPEC calls this a "rail," which sits inline and quiet at the foot of
 * the cockpit, the same weight as ActivityLog — not a modal like AssetWorkspacePanel.
 */

import { useState } from 'react'
import { Send } from 'lucide-react'
import { ink, muted, bdr, bg, blue, white } from '@/lib/constants/colors'
import { radius } from '@/features/shared/tokens'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { fetchWithTimeout, isTimeoutError } from '@/features/shared/lib/fetchWithTimeout'

type TurnKind = 'you' | 'answer' | 'initiated' | 'declined' | 'error'
interface Turn { id: string; kind: TurnKind; text: string }

export function ChatRail({ executiveId }: { executiveId: string }) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    const message = draft.trim()
    if (!message || busy) return
    setDraft('')
    setBusy(true)
    const mine: Turn = { id: `${Date.now()}-you`, kind: 'you', text: message }
    setTurns(t => [...t, mine])

    try {
      const res = await fetchWithTimeout(`/api/executive/${executiveId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (!res.ok) {
        setTurns(t => [...t, { id: `${Date.now()}-err`, kind: 'error', text: data.error ?? 'Could not reach your team.' }])
        return
      }
      if (data.kind === 'answer') {
        setTurns(t => [...t, { id: `${Date.now()}-a`, kind: 'answer', text: data.text }])
      } else if (data.kind === 'initiated') {
        setTurns(t => [...t, {
          id: `${Date.now()}-i`, kind: 'initiated',
          text: 'Starting this week’s cycle now — ',
        }])
      } else {
        setTurns(t => [...t, { id: `${Date.now()}-d`, kind: 'declined', text: data.reason }])
      }
    } catch (err) {
      setTurns(t => [...t, {
        id: `${Date.now()}-err`, kind: 'error',
        text: isTimeoutError(err) ? 'That took too long. Try again.' : 'Could not reach the server. Try again.',
      }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionCard title="Ask or command">
      <p style={{ color: muted, fontSize: 13, margin: '0 0 14px', lineHeight: 1.6 }}>
        Ask what happened, or tell your team to run the cycle now. Each message stands on its
        own — nothing here is a conversation your team remembers between messages.
      </p>

      {turns.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          {turns.map(t => <TurnRow key={t.id} turn={t} />)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void send() }}
          placeholder="e.g. why did the ICP change? or: run the cycle now"
          maxLength={500}
          disabled={busy}
          style={{
            flex: 1, background: bg, border: `1px solid ${bdr}`, borderRadius: radius.md,
            padding: '10px 12px', color: ink, fontSize: 14,
          }}
        />
        <button
          onClick={() => void send()}
          disabled={busy || !draft.trim()}
          aria-label="Send"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 40, background: blue, border: 'none', borderRadius: radius.md,
            cursor: busy || !draft.trim() ? 'default' : 'pointer',
            opacity: busy || !draft.trim() ? 0.6 : 1,
          }}
        >
          <Send size={15} color={white} />
        </button>
      </div>
    </SectionCard>
  )
}

function TurnRow({ turn }: { turn: Turn }) {
  if (turn.kind === 'you') {
    return (
      <p style={{ color: ink, fontSize: 14, fontWeight: 500, margin: 0, textAlign: 'right' }}>
        {turn.text}
      </p>
    )
  }
  const color = turn.kind === 'error' ? muted : turn.kind === 'declined' ? muted : ink
  return (
    <p style={{ color, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
      {turn.text}
      {turn.kind === 'initiated' && (
        <a href="#rhythm-cycle" style={{ color: blue }}>watch it run</a>
      )}
    </p>
  )
}
