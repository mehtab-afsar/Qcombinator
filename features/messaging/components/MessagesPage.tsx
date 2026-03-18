'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, Paperclip, MoreVertical, Star,
  MessageCircle, Calendar, TrendingUp,
  ChevronRight, ArrowLeft, X, Check, Users,
  Inbox, UserPlus, Globe, Clock, CheckCheck,
  Heart, MessageSquare, Sparkles,
} from 'lucide-react'

import { useConversations }         from '../hooks/useConversations'
import { useMessages }              from '../hooks/useMessages'
import { initials, qScoreColor }    from '../utils'
import { RoleBadge }                from './RoleBadge'
import { Conversation, Message, NetworkPost, InboxTab } from '../types/messaging.types'

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2"
const surf  = "#F0EDE6"
const bdr   = "#E2DDD5"
const ink   = "#18160F"
const muted = "#8A867C"
const blue  = "#2563EB"
const green = "#16A34A"
const amber = "#D97706"
const red   = "#DC2626"

// Alias so existing JSX `qCol(...)` calls resolve without rename
const qCol = qScoreColor

// ─── component ────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const router = useRouter()

  // ── UI state ────────────────────────────────────────────────────────────────
  const [tab,          setTab]          = useState<InboxTab>('connections')
  const [selected,     setSelected]     = useState<Conversation | null>(null)
  const [messageInput, setMessageInput] = useState('')
  const [searchTerm,   setSearchTerm]   = useState('')
  const [showProfile,  setShowProfile]  = useState(true)
  const [networkPosts, setNetworkPosts] = useState<NetworkPost[]>([])
  const [likedPosts,   setLikedPosts]   = useState<Set<string>>(new Set())
  const [replyingTo,   setReplyingTo]   = useState<string | null>(null)
  const [replyInput,   setReplyInput]   = useState('')
  const [composeText,  setComposeText]  = useState('')
  const [composeOpen,  setComposeOpen]  = useState(false)
  const bottomRef                       = useRef<HTMLDivElement>(null)

  // ── data hooks ──────────────────────────────────────────────────────────────
  const {
    conversations, setConversations,
    requests,
    handleAccept, handleDecline, handleAcceptSlot,
    updateLastMessage,
  } = useConversations()

  const {
    realMessages, myUserId, msgLoading, sending, handleSend,
  } = useMessages(selected, updateLastMessage)

  // Scroll to bottom when conversation changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected])

  // ── derived ─────────────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(c => {
    if (!searchTerm) return true
    const q = searchTerm.toLowerCase()
    return c.participant.name.toLowerCase().includes(q) ||
           c.participant.company.toLowerCase().includes(q)
  })

  const pendingRequests = requests.filter(r => r.status === 'pending')

  // ── handlers ────────────────────────────────────────────────────────────────
  const onAccept = (reqId: string) => {
    const newConv = handleAccept(reqId)
    if (newConv) { setTab('connections'); setSelected(newConv) }
  }

  const onAcceptSlot = (convId: string, msgId: string, slot: string) => {
    handleAcceptSlot(convId, msgId, slot)
    // also sync the currently-selected conversation view
    if (selected?.id === convId) {
      setSelected(prev => prev ? {
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === msgId ? { ...msg, meetingStatus: 'confirmed' as const, confirmedSlot: slot } : msg
        ),
      } : null)
    }
  }

  const onSendMessage = async () => {
    if (!messageInput.trim() || !selected) return
    const body = messageInput.trim()
    setMessageInput('')
    await handleSend(body, selected, (updatedConv) => {
      // Local-only update (pending connections)
      setSelected(updatedConv)
      setConversations(prev => prev.map(c => c.id === selected.id ? updatedConv : c))
    })
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  // ── render a single message bubble ──────────────────────────────────────────
  const renderMessage = (msg: Message, idx: number, all: Message[]) => {
    const isUser   = msg.sender === 'user'
    const prevSame = idx > 0 && all[idx - 1].sender === msg.sender
    const p        = selected!.participant

    const bubbleWrap = (content: React.ReactNode) => (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18 }}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          gap: 8,
          marginBottom: prevSame ? 4 : 14,
          paddingLeft:  isUser ? 56 : 0,
          paddingRight: isUser ? 0  : 56,
        }}
      >
        {!isUser && (
          <div style={{
            height: 28, width: 28, borderRadius: 8, flexShrink: 0,
            background: prevSame ? 'transparent' : surf,
            border: prevSame ? 'none' : `1px solid ${bdr}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: muted,
          }}>
            {!prevSame ? initials(p.name) : ''}
          </div>
        )}
        {content}
      </motion.div>
    )

    if (msg.type === 'meeting-request') {
      const confirmed = msg.meetingStatus === 'confirmed'
      return bubbleWrap(
        <div style={{
          maxWidth: 380, padding: '14px 16px',
          background: isUser ? ink : bg,
          border: `1px solid ${isUser ? 'transparent' : bdr}`,
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          boxShadow: isUser ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Calendar style={{ height: 12, width: 12, color: isUser ? 'rgba(249,247,242,0.5)' : muted }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: isUser ? 'rgba(249,247,242,0.6)' : muted }}>
              Meeting Request
            </span>
          </div>
          <p style={{ fontSize: 13, color: isUser ? bg : ink, marginBottom: 12, lineHeight: 1.5 }}>
            {msg.content}
          </p>
          {confirmed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: isUser ? 'rgba(22,163,74,0.15)' : '#F0FDF4', borderRadius: 10, border: `1px solid ${isUser ? 'rgba(22,163,74,0.3)' : '#BBF7D0'}` }}>
              <CheckCheck style={{ height: 14, width: 14, color: green, flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 1 }}>Meeting Confirmed</p>
                <p style={{ fontSize: 11, color: isUser ? 'rgba(249,247,242,0.7)' : muted }}>{msg.confirmedSlot}</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msg.meetingSlots?.map(slot => (
                <div key={slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '8px 12px', background: isUser ? 'rgba(249,247,242,0.06)' : surf, border: `1px solid ${isUser ? 'rgba(249,247,242,0.12)' : bdr}`, borderRadius: 9 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Clock style={{ height: 11, width: 11, color: isUser ? 'rgba(249,247,242,0.5)' : muted, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: isUser ? 'rgba(249,247,242,0.85)' : ink, fontWeight: 500 }}>{slot}</span>
                  </div>
                  {!isUser && (
                    <button
                      onClick={() => onAcceptSlot(selected!.id, msg.id, slot)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 14px', fontSize: 11, fontWeight: 700, background: green, color: '#fff', border: 'none', borderRadius: 999, cursor: 'pointer', flexShrink: 0, transition: 'opacity 0.15s', letterSpacing: '0.02em' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      <Check style={{ height: 10, width: 10 }} />
                      Confirm
                    </button>
                  )}
                </div>
              ))}
              {!isUser && (
                <button style={{ fontSize: 11, color: muted, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '4px 0', textDecoration: 'underline' }}>
                  Propose a different time →
                </button>
              )}
            </div>
          )}
          <p style={{ fontSize: 10, marginTop: 10, color: isUser ? 'rgba(249,247,242,0.3)' : muted }}>{msg.timestamp}</p>
        </div>
      )
    }

    if (msg.type === 'document') {
      return bubbleWrap(
        <div style={{ maxWidth: 360, padding: '12px 14px', background: isUser ? ink : surf, border: `1px solid ${isUser ? ink : bdr}`, borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }}>
          <p style={{ fontSize: 13, color: isUser ? bg : ink, marginBottom: 10, lineHeight: 1.5 }}>{msg.content}</p>
          {msg.attachments?.map((att, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: isUser ? 'rgba(249,247,242,0.08)' : bg, border: `1px solid ${bdr}`, borderRadius: 8, marginBottom: 4 }}>
              <div style={{ height: 30, width: 30, background: surf, border: `1px solid ${bdr}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Paperclip style={{ height: 11, width: 11, color: muted }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: isUser ? bg : ink }}>{att.name}</p>
                <p style={{ fontSize: 10, color: isUser ? 'rgba(249,247,242,0.5)' : muted }}>{att.type} · {att.size}</p>
              </div>
              <button style={{ padding: '4px 10px', fontSize: 10, fontWeight: 600, background: isUser ? 'rgba(249,247,242,0.15)' : ink, border: 'none', borderRadius: 999, cursor: 'pointer', color: bg, flexShrink: 0 }}>Download</button>
            </div>
          ))}
          <p style={{ fontSize: 10, marginTop: 6, color: isUser ? 'rgba(249,247,242,0.3)' : muted }}>{msg.timestamp}</p>
        </div>
      )
    }

    return bubbleWrap(
      <div style={{ maxWidth: 380, padding: '10px 14px', background: isUser ? ink : surf, border: `1px solid ${isUser ? ink : bdr}`, borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px' }}>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: isUser ? bg : ink }}>{msg.content}</p>
        <p style={{ fontSize: 10, marginTop: 5, color: isUser ? 'rgba(249,247,242,0.35)' : muted, textAlign: 'right' }}>{msg.timestamp}</p>
      </div>
    )
  }

  // ─ build mapped messages list for accepted connections ─────────────────────
  const allMapped = realMessages.map(r => ({
    id: r.id, content: r.body,
    timestamp: new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    sender: r.sender_id === myUserId ? 'user' as const : 'other' as const,
    type: 'text' as const,
  }))

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg }}>

      {/* ── top bar ── */}
      <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: '7px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ height: 7, width: 7, background: green, borderRadius: '50%' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: ink }}>Signal Network</span>
          </div>
          <span style={{ fontSize: 11, color: muted }}>— your Edge Alpha connection hub</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: muted }}>
            {pendingRequests.length > 0 && (
              <span style={{ color: blue, fontWeight: 600 }}>{pendingRequests.length} pending requests · </span>
            )}
            {conversations.reduce((a, c) => a + c.unread, 0)} unread
          </span>
          <button
            onClick={() => router.back()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: muted, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500, fontFamily: 'inherit' }}
          >
            <ArrowLeft style={{ height: 12, width: 12 }} />
            Back
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── left panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: 320, background: surf, borderRight: `1px solid ${bdr}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}
        >
          <div style={{ padding: '16px 16px 0', borderBottom: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 18, fontWeight: 300, color: ink, letterSpacing: '-0.025em', marginBottom: 14 }}>Messages</p>
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', height: 12, width: 12, color: muted, pointerEvents: 'none' }} />
              <input
                placeholder="Search…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: bg, border: `1px solid ${bdr}`, borderRadius: 8, outline: 'none', color: ink, fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
              {[
                { id: 'connections' as InboxTab, icon: Inbox,    label: 'Inbox',    count: conversations.reduce((a, c) => a + c.unread, 0) },
                { id: 'requests'    as InboxTab, icon: UserPlus, label: 'Requests', count: pendingRequests.length },
                { id: 'network'     as InboxTab, icon: Globe,    label: 'Network',  count: 0 },
              ].map(t => {
                const active = tab === t.id
                const Icon   = t.icon
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 6px', fontSize: 11, fontWeight: active ? 600 : 400, color: active ? ink : muted, background: 'transparent', border: 'none', borderBottom: active ? `2px solid ${ink}` : '2px solid transparent', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit', position: 'relative' }}
                  >
                    <Icon style={{ height: 12, width: 12 }} />
                    {t.label}
                    {t.count > 0 && (
                      <span style={{ minWidth: 16, height: 16, padding: '0 4px', background: active ? ink : blue, color: bg, borderRadius: 999, fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        {t.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* ── CONNECTIONS tab ── */}
          {tab === 'connections' && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {filteredConvs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <Users style={{ height: 28, width: 28, color: muted, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: muted }}>No conversations yet</p>
                  <button onClick={() => setTab('requests')} style={{ fontSize: 11, color: blue, background: 'none', border: 'none', cursor: 'pointer', marginTop: 6, textDecoration: 'underline' }}>
                    Check your requests →
                  </button>
                </div>
              ) : filteredConvs.map((conv, i) => {
                const active = selected?.id === conv.id
                return (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(conv)}
                    style={{ padding: '13px 16px', borderBottom: `1px solid ${bdr}`, cursor: 'pointer', transition: 'background 0.12s', background: active ? bg : 'transparent', borderLeft: `3px solid ${active ? ink : 'transparent'}` }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = `${bg}99` }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ height: 40, width: 40, borderRadius: 12, background: active ? surf : bg, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: muted }}>
                          {initials(conv.participant.name)}
                        </div>
                        {conv.participant.qScore && (
                          <div style={{ position: 'absolute', bottom: -2, right: -2, height: 12, width: 12, borderRadius: '50%', background: qCol(conv.participant.qScore), border: `2px solid ${active ? bg : surf}` }} title={`Q-Score ${conv.participant.qScore}`} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{conv.participant.name}</span>
                            {conv.starred && <Star style={{ height: 9, width: 9, color: amber }} />}
                          </div>
                          <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{conv.timestamp}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                          <p style={{ fontSize: 11, color: muted }}>{conv.participant.company}</p>
                          <RoleBadge type={conv.participant.type} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                          <p style={{ fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{conv.lastMessage}</p>
                          {conv.unread > 0 && (
                            <span style={{ minWidth: 18, height: 18, padding: '0 5px', background: ink, color: bg, borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{conv.unread}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* ── REQUESTS tab ── */}
          {tab === 'requests' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
              {requests.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <UserPlus style={{ height: 28, width: 28, color: muted, margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, color: muted }}>No connection requests yet</p>
                </div>
              ) : requests.map((req, i) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ background: req.status === 'pending' ? bg : surf, border: `1px solid ${req.status === 'pending' ? bdr : 'transparent'}`, borderRadius: 14, padding: '14px 14px', marginBottom: 10, opacity: req.status !== 'pending' ? 0.55 : 1 }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                    <div style={{ height: 38, width: 38, borderRadius: 11, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: muted, flexShrink: 0 }}>
                      {initials(req.from.name)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{req.from.name}</span>
                        <RoleBadge type={req.from.type} />
                        {req.from.qScore && <span style={{ fontSize: 10, color: qCol(req.from.qScore), fontWeight: 700 }}>Q:{req.from.qScore}</span>}
                      </div>
                      <p style={{ fontSize: 11, color: muted }}>{req.from.title} · {req.from.company}</p>
                      {req.from.stage && <p style={{ fontSize: 11, color: muted }}>{req.from.stage} · {req.from.sector}</p>}
                    </div>
                    <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{req.timestamp}</span>
                  </div>
                  <div style={{ background: surf, borderRadius: 9, padding: '9px 12px', marginBottom: 12, borderLeft: `3px solid ${bdr}` }}>
                    <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, fontStyle: 'italic' }}>&ldquo;{req.note}&rdquo;</p>
                  </div>
                  {req.status === 'pending' ? (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => onAccept(req.id)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', fontSize: 12, fontWeight: 700, background: ink, color: bg, border: 'none', borderRadius: 9, cursor: 'pointer', transition: 'opacity 0.15s' }} onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')} onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                        <Check style={{ height: 12, width: 12 }} />
                        Accept
                      </button>
                      <button onClick={() => handleDecline(req.id)} style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', fontSize: 12, fontWeight: 500, background: 'transparent', color: muted, border: `1px solid ${bdr}`, borderRadius: 9, cursor: 'pointer', transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = muted)} onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>
                        <X style={{ height: 12, width: 12 }} />
                        Decline
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: req.status === 'accepted' ? '#F0FDF4' : surf, borderRadius: 8 }}>
                      {req.status === 'accepted'
                        ? <><Check style={{ height: 11, width: 11, color: green }} /><span style={{ fontSize: 11, color: green, fontWeight: 600 }}>Connected — go to Inbox</span></>
                        : <><X style={{ height: 11, width: 11, color: muted }} /><span style={{ fontSize: 11, color: muted }}>Declined</span></>
                      }
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* ── NETWORK tab (left sidebar) ── */}
          {tab === 'network' && (
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 12px' }}>
              <p style={{ fontSize: 11, color: muted, marginBottom: 14, paddingLeft: 2 }}>Trending topics</p>
              {['enterprise-sales', 'due-diligence', 'q-score', 'fundraising', 'ai-ml', 'gtm', 'market', 'pilots', 'tips'].map(tag => (
                <div key={tag} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', marginBottom: 6, borderRadius: 9, background: bg, border: `1px solid ${bdr}`, cursor: 'pointer' }}>
                  <span style={{ fontSize: 12, color: ink }}>#{tag}</span>
                  <TrendingUp style={{ height: 10, width: 10, color: muted }} />
                </div>
              ))}
              <div style={{ marginTop: 20, padding: '12px 10px', borderRadius: 10, background: surf, border: `1px solid ${bdr}` }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 4 }}>Share an insight</p>
                <p style={{ fontSize: 11, color: muted }}>Help the ecosystem by posting what&apos;s working for you.</p>
                <button onClick={() => setComposeOpen(true)} style={{ marginTop: 10, width: '100%', padding: '7px 0', fontSize: 11, fontWeight: 600, background: ink, color: bg, border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                  + Write post
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* ── main panel ── */}
        {tab === 'connections' && selected ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* chat header */}
              <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{ height: 36, width: 36, borderRadius: 10, background: bg, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: muted }}>
                      {initials(selected.participant.name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>{selected.participant.name}</p>
                        <RoleBadge type={selected.participant.type} />
                      </div>
                      <p style={{ fontSize: 11, color: muted }}>{selected.participant.title} · {selected.participant.company}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <button
                      onClick={() => setShowProfile(v => !v)}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 11, fontWeight: 500, background: showProfile ? ink : 'transparent', color: showProfile ? bg : muted, border: `1px solid ${showProfile ? ink : bdr}`, borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s' }}
                    >
                      <TrendingUp style={{ height: 11, width: 11 }} />
                      Profile
                    </button>
                    <button style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `1px solid ${bdr}`, borderRadius: 8, cursor: 'pointer' }}>
                      <MoreVertical style={{ height: 13, width: 13, color: muted }} />
                    </button>
                  </div>
                </div>
              </div>

              {/* messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 12px', background: bg }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>Today</span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                </div>
                {msgLoading && (
                  <div style={{ textAlign: 'center', padding: '20px 0', color: muted, fontSize: 12 }}>Loading messages…</div>
                )}
                {selected.connectionId
                  ? allMapped.map((m, idx) => renderMessage(m, idx, allMapped))
                  : selected.messages.map((msg, idx) => renderMessage(msg, idx, selected.messages))
                }
                <div ref={bottomRef} />
              </div>

              {/* input */}
              <div style={{ background: surf, borderTop: `1px solid ${bdr}`, padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button style={{ height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: `1px solid ${bdr}`, borderRadius: 8, cursor: 'pointer', flexShrink: 0, transition: 'border-color 0.15s' }} onMouseEnter={e => (e.currentTarget.style.borderColor = ink)} onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}>
                    <Paperclip style={{ height: 13, width: 13, color: muted }} />
                  </button>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <textarea
                      placeholder="Write a message…"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSendMessage() } }}
                      rows={1}
                      style={{ width: '100%', padding: '9px 14px', fontSize: 13, color: ink, lineHeight: 1.5, background: bg, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', minHeight: 38, maxHeight: 120, overflowY: 'auto', transition: 'border-color 0.15s' }}
                      onFocus={e => (e.currentTarget.style.borderColor = muted)}
                      onBlur={e  => (e.currentTarget.style.borderColor = bdr)}
                    />
                  </div>
                  <button
                    onClick={onSendMessage}
                    disabled={!messageInput.trim() || sending}
                    style={{ height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: messageInput.trim() && !sending ? ink : surf, border: `1px solid ${messageInput.trim() && !sending ? ink : bdr}`, borderRadius: 8, cursor: messageInput.trim() && !sending ? 'pointer' : 'default', transition: 'all 0.15s', flexShrink: 0 }}
                  >
                    <Send style={{ height: 13, width: 13, color: messageInput.trim() && !sending ? bg : muted }} />
                  </button>
                </div>
                <p style={{ fontSize: 10, color: muted, marginTop: 6 }}>
                  {selected?.connectionId ? `Enter to send · Shift+Enter for new line · ${messageInput.length}/4000` : 'Enter to send · Shift+Enter for new line'}
                </p>
              </div>
            </div>

            {/* profile side panel */}
            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 248 }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ borderLeft: `1px solid ${bdr}`, background: surf, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}
                >
                  <div style={{ padding: '14px 16px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600 }}>Profile</p>
                    <button onClick={() => setShowProfile(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                      <X style={{ height: 13, width: 13, color: muted }} />
                    </button>
                  </div>
                  <div style={{ padding: '18px 16px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ textAlign: 'center', marginBottom: 18 }}>
                      <div style={{ height: 52, width: 52, borderRadius: 15, margin: '0 auto 10px', background: bg, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: muted }}>
                        {initials(selected.participant.name)}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 2 }}>{selected.participant.name}</p>
                      <p style={{ fontSize: 11, color: muted }}>{selected.participant.title}</p>
                      <p style={{ fontSize: 11, color: muted }}>{selected.participant.company}</p>
                      <div style={{ marginTop: 8 }}><RoleBadge type={selected.participant.type} /></div>
                    </div>
                    {selected.participant.qScore && (
                      <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, padding: '14px', marginBottom: 12, textAlign: 'center' }}>
                        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: muted, fontWeight: 600, marginBottom: 6 }}>Q-Score</p>
                        <div style={{ position: 'relative', height: 72, width: 72, margin: '0 auto 6px' }}>
                          <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 72 72">
                            <circle cx="36" cy="36" r="30" fill="none" stroke={bdr} strokeWidth="4" />
                            <motion.circle
                              cx="36" cy="36" r="30" fill="none"
                              stroke={qCol(selected.participant.qScore)}
                              strokeWidth="4" strokeLinecap="round"
                              strokeDasharray={`${2 * Math.PI * 30}`}
                              initial={{ strokeDashoffset: 2 * Math.PI * 30 }}
                              animate={{ strokeDashoffset: 2 * Math.PI * 30 * (1 - selected.participant.qScore / 100) }}
                              transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
                            />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span style={{ fontSize: 20, fontWeight: 600, color: ink }}>{selected.participant.qScore}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: 10, color: muted }}>Investment Readiness</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {[
                        { label: 'Stage',   value: selected.participant.stage },
                        { label: 'Seeking', value: selected.participant.seeking },
                        { label: 'Sector',  value: selected.participant.sector },
                      ].filter(i => i.value).map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', background: bg, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                          <span style={{ fontSize: 11, color: muted }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: ink }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                    {selected.participant.type === 'founder' && (
                      <Link href={`/investor/startup/${selected.id}`} replace style={{ textDecoration: 'none' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, padding: '9px 12px', background: ink, borderRadius: 10, cursor: 'pointer' }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: bg }}>Full Profile</span>
                          <ChevronRight style={{ height: 13, width: 13, color: 'rgba(249,247,242,0.5)' }} />
                        </div>
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        ) : tab === 'connections' && !selected ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} style={{ textAlign: 'center' }}>
              <div style={{ height: 60, width: 60, background: surf, border: `1px solid ${bdr}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <MessageCircle style={{ height: 24, width: 24, color: muted }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 300, color: ink, letterSpacing: '-0.02em', marginBottom: 6 }}>No conversation selected</p>
              <p style={{ fontSize: 12, color: muted }}>Pick a conversation from the sidebar</p>
            </motion.div>
          </div>

        ) : tab === 'requests' ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} style={{ textAlign: 'center' }}>
              <div style={{ height: 60, width: 60, background: surf, border: `1px solid ${bdr}`, borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <UserPlus style={{ height: 24, width: 24, color: muted }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 300, color: ink, letterSpacing: '-0.02em', marginBottom: 6 }}>
                {pendingRequests.length} connection request{pendingRequests.length !== 1 ? 's' : ''}
              </p>
              <p style={{ fontSize: 12, color: muted }}>Accept to start a conversation</p>
            </motion.div>
          </div>

        ) : (
          /* ── NETWORK feed ── */
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: bg }}>
            <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: '14px 24px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 400, color: ink, letterSpacing: '-0.02em' }}>Ecosystem Network</p>
                <p style={{ fontSize: 11, color: muted }}>Insights from founders &amp; investors — open to the whole ecosystem</p>
              </div>
              <button onClick={() => setComposeOpen(v => !v)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 12, fontWeight: 600, background: ink, color: bg, border: 'none', borderRadius: 999, cursor: 'pointer' }}>
                <Sparkles style={{ height: 12, width: 12 }} />
                Share insight
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 24px' }}>
              <AnimatePresence>
                {composeOpen && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ border: `1px solid ${bdr}`, borderRadius: 14, padding: '16px 18px', background: surf }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 10 }}>Share an insight with the ecosystem</p>
                      <textarea placeholder="What's working for you? A lesson, a tactic, a question…" value={composeText} onChange={e => setComposeText(e.target.value)} rows={4} style={{ width: '100%', padding: '10px 12px', fontSize: 13, color: ink, background: bg, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
                        <button onClick={() => { setComposeOpen(false); setComposeText('') }} style={{ padding: '7px 16px', fontSize: 12, background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 999, cursor: 'pointer', color: muted }}>Cancel</button>
                        <button
                          onClick={() => {
                            if (!composeText.trim()) return
                            const newPost: NetworkPost = { id: `u-${Date.now()}`, author: { id: 'me', name: 'You', title: 'Member', company: 'Edge Alpha', type: 'founder' }, content: composeText.trim(), timestamp: 'Just now', likes: 0, replies: 0, tags: [] }
                            setNetworkPosts(prev => [newPost, ...prev])
                            setComposeText(''); setComposeOpen(false)
                          }}
                          style={{ padding: '7px 16px', fontSize: 12, fontWeight: 600, background: ink, color: bg, border: 'none', borderRadius: 999, cursor: 'pointer' }}
                        >Post</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {networkPosts.map((post, i) => {
                const liked    = likedPosts.has(post.id)
                const replying = replyingTo === post.id
                return (
                  <motion.div key={post.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ border: `1px solid ${bdr}`, borderRadius: 16, padding: '18px 20px', marginBottom: 14, background: surf }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ height: 40, width: 40, borderRadius: 12, background: bg, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: muted, flexShrink: 0 }}>
                        {initials(post.author.name)}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>{post.author.name}</span>
                          <RoleBadge type={post.author.type} />
                          {post.author.qScore && <span style={{ fontSize: 11, color: qCol(post.author.qScore), fontWeight: 700 }}>Q-Score {post.author.qScore}</span>}
                        </div>
                        <p style={{ fontSize: 12, color: muted }}>{post.author.company} · {post.author.stage ?? ''}{post.author.stage && post.author.sector ? ' · ' : ''}{post.author.sector ?? ''} · {post.timestamp}</p>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, marginBottom: 14 }}>{post.content}</p>
                    {post.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                        {post.tags.map(tag => <span key={tag} style={{ fontSize: 11, padding: '3px 10px', background: bg, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>#{tag}</span>)}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, borderTop: `1px solid ${bdr}`, paddingTop: 12 }}>
                      <button
                        onClick={() => {
                          setLikedPosts(prev => {
                            const next = new Set(prev)
                            if (next.has(post.id)) { next.delete(post.id); setNetworkPosts(p => p.map(x => x.id === post.id ? { ...x, likes: x.likes - 1 } : x)) }
                            else { next.add(post.id); setNetworkPosts(p => p.map(x => x.id === post.id ? { ...x, likes: x.likes + 1 } : x)) }
                            return next
                          })
                        }}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 500, background: liked ? '#FEF2F2' : 'transparent', color: liked ? red : muted, border: `1px solid ${liked ? '#FECACA' : bdr}`, borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s' }}
                      >
                        <Heart style={{ height: 12, width: 12 }} fill={liked ? red : 'none'} />
                        {post.likes}
                      </button>
                      <button onClick={() => setReplyingTo(replying ? null : post.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', fontSize: 12, fontWeight: 500, background: replying ? surf : 'transparent', color: replying ? ink : muted, border: `1px solid ${bdr}`, borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <MessageSquare style={{ height: 12, width: 12 }} />
                        {post.replies} {post.replies === 1 ? 'reply' : 'replies'}
                      </button>
                    </div>
                    <AnimatePresence>
                      {replying && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'flex-end' }}>
                            <textarea placeholder={`Reply to ${post.author.name}…`} value={replyInput} onChange={e => setReplyInput(e.target.value)} rows={2} style={{ flex: 1, padding: '8px 12px', fontSize: 12, color: ink, background: bg, border: `1px solid ${bdr}`, borderRadius: 10, outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', lineHeight: 1.6 }} />
                            <button onClick={() => { if (!replyInput.trim()) return; setNetworkPosts(p => p.map(x => x.id === post.id ? { ...x, replies: x.replies + 1 } : x)); setReplyInput(''); setReplyingTo(null) }} style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, background: ink, color: bg, border: 'none', borderRadius: 9, cursor: 'pointer', flexShrink: 0 }}>Reply</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
