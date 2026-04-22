'use client'

import { bg, surf, bdr, ink, muted } from '@/lib/constants/colors'

// ── types ─────────────────────────────────────────────────────────────────────
export interface ChatMessage {
  id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

export interface MessageGroup {
  senderId: string
  isMine: boolean
  messages: ChatMessage[]
  isLastRead: boolean // last msg in group has been read by other party
}

// ── helpers ───────────────────────────────────────────────────────────────────
const FIVE_MIN = 5 * 60 * 1000

export function buildGroups(messages: ChatMessage[], myUserId: string): MessageGroup[] {
  const groups: MessageGroup[] = []
  for (const msg of messages) {
    const last = groups[groups.length - 1]
    const isMine = msg.sender_id === myUserId
    const prevCreated = last?.messages[last.messages.length - 1]?.created_at
    const withinWindow = prevCreated
      ? new Date(msg.created_at).getTime() - new Date(prevCreated).getTime() < FIVE_MIN
      : false

    if (last && last.senderId === msg.sender_id && withinWindow) {
      last.messages.push(msg)
    } else {
      groups.push({ senderId: msg.sender_id, isMine, messages: [msg], isLastRead: false })
    }
  }
  // Mark read status per group: isMine group is "read" if any msg has read_at
  for (const g of groups) {
    if (g.isMine) g.isLastRead = g.messages.some(m => m.read_at !== null)
  }
  return groups
}

function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  if (d === 1) return 'Yesterday'
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── read receipt icon ─────────────────────────────────────────────────────────
function ReadReceipt({ isRead }: { isRead: boolean }) {
  return (
    <svg
      width="14" height="10" viewBox="0 0 14 10" fill="none"
      style={{ flexShrink: 0, opacity: isRead ? 1 : 0.4 }}
    >
      {/* first check */}
      <path d="M1 5L4 8L9 2" stroke={isRead ? '#4F46E5' : muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* second check (only shown if delivered/read — always shown, dim if unread) */}
      <path d="M5 5L8 8L13 2" stroke={isRead ? '#4F46E5' : muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── avatar ────────────────────────────────────────────────────────────────────
function Avatar({ initials: ini, dark = false }: { initials: string; dark?: boolean }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: dark ? ink : surf,
      border: `1px solid ${dark ? ink : bdr}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 10, fontWeight: 700,
      color: dark ? bg : ink,
    }}>
      {ini}
    </div>
  )
}

// ── MessageGroup component ────────────────────────────────────────────────────
interface MessageGroupProps {
  group: MessageGroup
  senderInitials: string
  myInitials: string
  isFirst: boolean
}

export function MessageGroupBlock({ group, senderInitials, myInitials, isFirst }: MessageGroupProps) {
  const { isMine, messages, isLastRead } = group
  const lastMsg = messages[messages.length - 1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: isFirst ? 0 : 12 }}>
      {messages.map((msg, idx) => {
        const isLastInGroup = idx === messages.length - 1
        const isFirstInGroup = idx === 0
        // Border radius: top-left tight for first mine, top-right tight for first other
        const br = isMine
          ? isFirstInGroup && messages.length > 1
            ? '16px 4px 16px 16px'
            : isLastInGroup && messages.length > 1
              ? '16px 16px 4px 16px'
              : messages.length === 1
                ? '16px 4px 16px 16px'
                : '16px 16px 4px 16px'
          : isFirstInGroup && messages.length > 1
            ? '4px 16px 16px 16px'
            : isLastInGroup && messages.length > 1
              ? '16px 16px 16px 4px'
              : messages.length === 1
                ? '4px 16px 16px 16px'
                : '16px 16px 16px 4px'

        return (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: isMine ? 'row-reverse' : 'row',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            {/* avatar column */}
            <div style={{ width: 28, flexShrink: 0 }}>
              {!isMine && isLastInGroup && <Avatar initials={senderInitials} />}
            </div>

            {/* bubble */}
            <div style={{ maxWidth: '68%' }}>
              <div style={{
                padding: '10px 14px',
                borderRadius: br,
                background: isMine ? ink : surf,
                border: `1px solid ${isMine ? ink : bdr}`,
                color: isMine ? bg : ink,
              }}>
                <p style={{ fontSize: 13, lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {msg.body}
                </p>
              </div>
            </div>

            {/* my avatar — hidden, just spacing */}
            {isMine && <div style={{ width: 28, flexShrink: 0 }} />}
          </div>
        )
      })}

      {/* timestamp + read receipt row — below last bubble */}
      <div style={{
        display: 'flex',
        justifyContent: isMine ? 'flex-end' : 'flex-start',
        alignItems: 'center',
        gap: 4,
        paddingLeft: isMine ? 0 : 36,
        paddingRight: isMine ? 36 : 0,
        marginTop: 2,
      }}>
        <span style={{ fontSize: 10, color: muted }}>{relDate(lastMsg.created_at)}</span>
        {isMine && <ReadReceipt isRead={isLastRead} />}
      </div>
    </div>
  )
}
