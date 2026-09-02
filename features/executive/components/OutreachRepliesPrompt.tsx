'use client'

/**
 * "Three people replied. Draft follow-ups?" — the ask half of notice-and-ask.
 *
 * ⚠️ THE BUTTON IS THE WHOLE POINT. The product noticed something on its own; it does not act on
 * its own. A detected reply writes a row and, at most, a notification — nothing is drafted until
 * this is pressed. That is what keeps ADR-028 intact (a cycle is fed by founder activity) while
 * still letting the team see something the founder hasn't yet.
 *
 * Shown on P005 beside ContactsPrompt, and only when there is something to say: a founder who has
 * never sent outreach, or whose outreach nobody answered, sees nothing here at all.
 *
 * Nothing it can start can send. `POST /api/actions/:id/direct` refuses any irreversible Action
 * before it reaches the model, so this button drafts and stops — the approval boundary is still
 * the only way anything leaves the building.
 */

import { useState } from 'react'
import { MailOpen, ArrowRight, Check } from 'lucide-react'
import { blue, green, ink, muted, alpha } from '@/lib/constants/colors'
import { useExecutiveWorkspace } from '../hooks/useExecutiveWorkspace'

const FOLLOW_UP_ACTION = 'follow_up_prospects'

const shell = (accent: string) => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '12px 16px', borderRadius: 8, background: alpha(accent, 0.06),
  border: `1px solid ${alpha(accent, 0.2)}`,
})

export function OutreachRepliesPrompt() {
  const { replies, refreshReplies, refreshActions, refreshAssets } = useExecutiveWorkspace()
  const [drafting, setDrafting] = useState(false)
  const [failed, setFailed] = useState(false)

  // Nothing has been answered. Say nothing — an empty state here would be noise on every
  // founder's screen to serve the few who have outreach running.
  if (replies.count === 0) return null

  const people = replies.count === 1 ? 'Someone' : `${replies.count} people`

  if (replies.handled) {
    return (
      <div style={shell(green)}>
        <Check size={16} color={green} style={{ flexShrink: 0 }} />
        <span style={{ color: muted, fontSize: 13.5, flex: 1 }}>
          Follow-ups drafted for {replies.count === 1 ? 'this reply' : 'these replies'}. They&rsquo;re
          in your team&rsquo;s work below.
        </span>
      </div>
    )
  }

  const draft = async () => {
    setDrafting(true)
    setFailed(false)
    try {
      const res = await fetch(`/api/actions/${FOLLOW_UP_ACTION}/direct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Minted server-side (lib/signals/replies-summary.ts) and passed back untouched, so a
        // double click, a second tab or a refresh mid-draft costs one indexed read, not a second
        // paid model call.
        body: JSON.stringify({ dedupeKey: replies.followUpKey }),
      })
      if (!res.ok) { setFailed(true); return }
      // The run is logged and the drafts exist; re-read what the screen shows about both.
      await Promise.all([refreshReplies(), refreshActions(), refreshAssets()])
    } catch {
      setFailed(true)
    } finally {
      setDrafting(false)
    }
  }

  return (
    <div style={shell(blue)}>
      <MailOpen size={16} color={blue} style={{ flexShrink: 0 }} />
      <span style={{ color: ink, fontSize: 13.5, flex: 1 }}>
        {failed
          ? 'That didn’t go through. Try again in a moment.'
          : `${people} replied to outreach your team sent.`}
      </span>
      <button
        onClick={draft}
        disabled={drafting}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'none', border: 'none', padding: 0,
          color: blue, fontSize: 13, fontWeight: 500,
          cursor: drafting ? 'default' : 'pointer', opacity: drafting ? 0.5 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {drafting ? 'Drafting…' : failed ? 'Retry' : 'Draft follow-ups'}
        {!drafting && <ArrowRight size={14} />}
      </button>
    </div>
  )
}
