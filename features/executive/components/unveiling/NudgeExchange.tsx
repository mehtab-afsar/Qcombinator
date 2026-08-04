'use client'

/**
 * "Nudge this" — a short reshape exchange, opened from ProposedDirection, never the
 * default path (UX_SPEC_the_frame.md §3.2). Calls /api/strategy/nudge (streamed),
 * which revises the read + mission/priorities/goals without re-running S001.
 */

import { useEffect, useState } from 'react'
import { ink, muted, bdr, blue, red, white } from '@/lib/constants/colors'
import { FONT_SERIF } from '@/features/onboarding/theme'
import { useStreamedProposal, type StreamedProposal } from '../../hooks/useStreamedProposal'

export function NudgeExchange({
  previous, onRevised, onCancel,
}: {
  previous: { mission: string; priorities: string[]; goals: string[] }
  onRevised: (revised: StreamedProposal) => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')
  const { streaming, readText, proposal, error, run } = useStreamedProposal()

  useEffect(() => {
    if (proposal) onRevised(proposal)
    // Fires once per completed stream — onRevised is a stable callback from the parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposal])

  async function submit() {
    if (!note.trim() || streaming) return
    await run('/api/strategy/nudge', { previous, note: note.trim() })
  }

  const started = streaming || readText.length > 0

  return (
    <div style={{ border: `1px solid ${bdr}`, borderRadius: 10, padding: 16, marginTop: 14 }}>
      {!started && (
        <>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() } }}
            placeholder="What would you change?"
            rows={2}
            maxLength={500}
            style={{
              width: '100%', border: `1px solid ${bdr}`, borderRadius: 8, padding: 10,
              fontSize: 14, color: ink, fontFamily: 'inherit', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button
              onClick={() => void submit()}
              disabled={!note.trim()}
              style={{
                background: blue, color: white, border: 'none', borderRadius: 8,
                padding: '8px 16px', fontSize: 13, fontWeight: 500,
                cursor: note.trim() ? 'pointer' : 'default', opacity: note.trim() ? 1 : 0.6,
              }}
            >
              Send
            </button>
            <button
              onClick={onCancel}
              style={{ background: 'none', border: 'none', color: muted, fontSize: 13, cursor: 'pointer', padding: '8px 4px' }}
            >
              Cancel
            </button>
          </div>
        </>
      )}
      {started && (
        <p style={{ fontFamily: FONT_SERIF, fontSize: 15, lineHeight: 1.7, color: ink, margin: 0 }}>
          {readText}
          {streaming && <span style={{ color: muted }}>▍</span>}
        </p>
      )}
      {error && <p style={{ color: red, fontSize: 13, marginTop: 10 }}>{error}</p>}
    </div>
  )
}
