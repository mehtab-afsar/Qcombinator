'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  CheckCircle, X, Send, TrendingUp, ChevronRight,
  Inbox, MessageSquare,
} from 'lucide-react'
import { bg, surf, bdr, ink, muted, green, amber, red } from '@/lib/constants/colors'
import { MessageGroupBlock, buildGroups } from '@/features/shared/components/MessageBubble'
import { createClient } from '@/lib/supabase/client'

// ─── types ────────────────────────────────────────────────────────────────────
interface PendingRequest {
  id: string
  founderId: string
  founderName: string
  startupName: string
  oneLiner: string
  stage: string
  industry: string
  qScore: number
  qScoreBreakdown: { market: number; product: number; goToMarket: number; financial: number; team: number; traction: number }
  personalMessage?: string
  requestedDate: string
}

interface Conversation {
  id: string
  founderId: string
  founderName: string
  startupName: string
  stage: string
  industry: string
  qScore: number
  connectedAt: string
  personalMessage?: string
  lastMessage?: { body: string; created_at: string; senderId: string } | null
}

interface Message {
  id: string
  sender_id: string
  body: string
  read_at: string | null
  created_at: string
}

type Panel = { type: 'request'; data: PendingRequest } | { type: 'conversation'; data: Conversation } | null

// ─── helpers ──────────────────────────────────────────────────────────────────
function relDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'Just now'
  if (h < 24) return `${h}h ago`
  if (d === 1) return 'Yesterday'
  if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function qColor(n: number) { return n >= 70 ? green : n >= 50 ? amber : red }
function qBg(n: number)    { return n >= 70 ? '#F0FDF4' : n >= 50 ? '#FFFBEB' : '#FEF2F2' }
function qBorder(n: number){ return n >= 70 ? '#86EFAC' : n >= 50 ? '#FDE68A' : '#FECACA' }

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ─── component ────────────────────────────────────────────────────────────────
export default function InvestorMessagesPage() {
  const router = useRouter()
  const [requests,      setRequests]      = useState<PendingRequest[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [panel,         setPanel]         = useState<Panel>(null)
  const [activeTab,     setActiveTab]     = useState<'requests' | 'conversations'>('requests')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [messages,      setMessages]      = useState<Message[]>([])
  const [msgLoading,    setMsgLoading]    = useState(false)
  const [msgInput,      setMsgInput]      = useState('')
  const [sending,       setSending]       = useState(false)
  const [myUserId,      setMyUserId]      = useState<string | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)
  const bottomRef   = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── load ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const { getAuthUserId } = await import('@/features/auth/services/auth.service')
        const uid = await getAuthUserId()
        if (uid) setMyUserId(uid)

        const [pendingRes, portfolioRes] = await Promise.all([
          fetch('/api/investor/connections'),
          fetch('/api/investor/portfolio'),
        ])
        if (pendingRes.ok) {
          const d = await pendingRes.json()
          setRequests(d.requests ?? [])
        }
        if (portfolioRes.ok) {
          const d = await portfolioRes.json()
          setConversations(
            (d.companies ?? []).map((c: {
              id: string; connectionId?: string; founderName: string; name: string;
              stage: string; sector: string; qScore: number;
              connectedAt: string; personalMessage?: string;
              lastMessage?: { body: string; created_at: string; senderId: string } | null;
            }) => ({
              id:              c.connectionId ?? c.id,
              founderId:       c.id,
              founderName:     c.founderName,
              startupName:     c.name,
              stage:           c.stage,
              industry:        c.sector,
              qScore:          c.qScore,
              connectedAt:     c.connectedAt,
              personalMessage: c.personalMessage,
              lastMessage:     c.lastMessage ?? null,
            }))
          )
        }
      } catch { /* silently fail */ } finally { setLoading(false) }
    }
    load()
  }, [])

  // Auto-open first unread / first request
  useEffect(() => {
    if (loading) return
    if (requests.length > 0 && !panel) {
      setActiveTab('requests')
      setPanel({ type: 'request', data: requests[0] })
    } else if (conversations.length > 0 && !panel) {
      setActiveTab('conversations')
      setPanel({ type: 'conversation', data: conversations[0] })
    }
  }, [loading]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages + subscribe to Realtime when conversation selected
  useEffect(() => {
    if (!panel || panel.type !== 'conversation') { setMessages([]); return }
    const connectionId = panel.data.id

    setMsgLoading(true)
    fetch(`/api/messages?connectionId=${connectionId}`)
      .then(r => r.ok ? r.json() : { messages: [] })
      .then(d => setMessages(d.messages ?? []))
      .catch(() => {})
      .finally(() => setMsgLoading(false))

    // Realtime subscription — append incoming messages without re-fetching
    let supabase: ReturnType<typeof createClient>
    let channel: ReturnType<ReturnType<typeof createClient>['channel']>
    try {
      supabase = createClient()
      channel = supabase
        .channel(`messages:${connectionId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `connection_id=eq.${connectionId}` },
          (payload) => {
            const newMsg = payload.new as Message
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
            // Update last message preview in sidebar
            setConversations(prev => prev.map(c =>
              c.id === connectionId
                ? { ...c, lastMessage: { body: newMsg.body, created_at: newMsg.created_at, senderId: newMsg.sender_id } }
                : c
            ))
          }
        )
        .subscribe()
    } catch { /* Realtime not available — graceful degradation */ }

    return () => {
      try { if (channel!) supabase!.removeChannel(channel!) } catch { /* ignore */ }
    }
  }, [panel])

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [msgInput])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleAccept = useCallback(async (req: PendingRequest) => {
    setActionLoading(req.id)
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'accept' }),
      })
      if (res.ok) {
        const newConv: Conversation = {
          id: req.id, founderId: req.founderId,
          founderName: req.founderName, startupName: req.startupName,
          stage: req.stage, industry: req.industry, qScore: req.qScore,
          connectedAt: new Date().toISOString(),
          personalMessage: req.personalMessage,
        }
        setRequests(prev => prev.filter(r => r.id !== req.id))
        setConversations(prev => [newConv, ...prev])
        setPanel({ type: 'conversation', data: newConv })
        setActiveTab('conversations')
        showToast(`Connected with ${req.founderName}`)
      }
    } catch { /* noop */ } finally { setActionLoading(null) }
  }, [])

  const handleDecline = useCallback(async (req: PendingRequest) => {
    setActionLoading(req.id)
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'decline' }),
      })
      if (res.ok) {
        setRequests(prev => {
          const remaining = prev.filter(r => r.id !== req.id)
          if (panel?.type === 'request' && panel.data.id === req.id) {
            setPanel(remaining.length > 0 ? { type: 'request', data: remaining[0] } : null)
          }
          return remaining
        })
        showToast('Request declined')
      }
    } catch { /* noop */ } finally { setActionLoading(null) }
  }, [panel])

  async function handleSend() {
    if (!panel || panel.type !== 'conversation' || !msgInput.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ connectionId: panel.data.id, body: msgInput.trim() }),
      })
      if (res.ok) {
        const d = await res.json()
        setMessages(prev => [...prev, d.message])
        setMsgInput('')
        // Update last message preview in conversation list
        setConversations(prev => prev.map(c =>
          c.id === panel.data.id
            ? { ...c, lastMessage: { body: msgInput.trim(), created_at: new Date().toISOString(), senderId: myUserId ?? '' } }
            : c
        ))
      } else {
        showToast('Failed to send')
      }
    } catch { showToast('Failed to send') } finally { setSending(false) }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', background: bg, color: ink, overflow: 'hidden' }}>

      {/* ── LEFT PANEL ────────────────────────────────────────────────── */}
      <div style={{
        width: 320, flexShrink: 0, borderRight: `1px solid ${bdr}`,
        display: 'flex', flexDirection: 'column', height: '100%',
      }}>
        {/* left header */}
        <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
          <h1 style={{ fontSize: 18, fontWeight: 600, color: ink, letterSpacing: '-0.02em', marginBottom: 16 }}>
            Messages
          </h1>
          {/* tabs */}
          <div style={{ display: 'flex', gap: 2, padding: '3px', background: surf, border: `1px solid ${bdr}`, borderRadius: 10, marginBottom: 12 }}>
            {([
              { key: 'requests'      as const, label: 'Requests',      count: requests.length      },
              { key: 'conversations' as const, label: 'Conversations', count: conversations.length },
            ]).map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                  background: activeTab === t.key ? bg : 'transparent',
                  color: activeTab === t.key ? ink : muted,
                  boxShadow: activeTab === t.key ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'all .12s',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px',
                    background: t.key === 'requests' ? red : surf,
                    color: t.key === 'requests' ? '#fff' : muted,
                  }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 20px' }}>
          {loading ? (
            <div style={{ padding: '40px 12px', textAlign: 'center' }}>
              <p style={{ fontSize: 12, color: muted }}>Loading…</p>
            </div>
          ) : activeTab === 'requests' ? (
            requests.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <Inbox style={{ height: 28, width: 28, color: muted, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>No pending requests yet</p>
              </div>
            ) : requests.map(req => {
              const isActive = panel?.type === 'request' && panel.data.id === req.id
              return (
                <button
                  key={req.id}
                  onClick={() => { setPanel({ type: 'request', data: req }); setActiveTab('requests') }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isActive ? '#EEF2FF' : 'transparent',
                    transition: 'background .1s', textAlign: 'left', fontFamily: 'inherit',
                    marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = surf }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: surf, border: `1px solid ${bdr}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: ink,
                  }}>
                    {initials(req.startupName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{req.startupName}</p>
                      <p style={{ fontSize: 10, color: muted, flexShrink: 0, marginLeft: 6 }}>{relDate(req.requestedDate)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <p style={{ fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{req.founderName} · {req.industry}</p>
                      {req.qScore > 0 && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: qBg(req.qScore), color: qColor(req.qScore), border: `1px solid ${qBorder(req.qScore)}`, flexShrink: 0 }}>
                          Q{req.qScore}
                        </span>
                      )}
                    </div>
                    {req.personalMessage && (
                      <p style={{ fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                        &quot;{req.personalMessage}&quot;
                      </p>
                    )}
                  </div>
                </button>
              )
            })
          ) : (
            conversations.length === 0 ? (
              <div style={{ padding: '48px 16px', textAlign: 'center' }}>
                <MessageSquare style={{ height: 28, width: 28, color: muted, margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>No conversations yet</p>
                <button
                  onClick={() => setActiveTab('requests')}
                  style={{ marginTop: 12, fontSize: 12, color: '#4F46E5', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  View requests →
                </button>
              </div>
            ) : conversations.map(conv => {
              const isActive = panel?.type === 'conversation' && panel.data.id === conv.id
              return (
                <button
                  key={conv.id}
                  onClick={() => setPanel({ type: 'conversation', data: conv })}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: isActive ? '#EEF2FF' : 'transparent',
                    transition: 'background .1s', textAlign: 'left', fontFamily: 'inherit',
                    marginBottom: 2,
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = surf }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: surf, border: `1px solid ${bdr}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: ink,
                  }}>
                    {initials(conv.startupName)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{conv.startupName}</p>
                      <p style={{ fontSize: 10, color: muted, flexShrink: 0, marginLeft: 6 }}>
                        {conv.lastMessage ? relDate(conv.lastMessage.created_at) : relDate(conv.connectedAt)}
                      </p>
                    </div>
                    <p style={{ fontSize: 11, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {conv.lastMessage
                        ? `${conv.lastMessage.senderId === myUserId ? 'You: ' : `${conv.founderName}: `}${conv.lastMessage.body}`
                        : `${conv.founderName} · ${conv.industry}`}
                    </p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL ───────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <AnimatePresence mode="wait">
          {!panel ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 40 }}
            >
              <MessageSquare style={{ height: 40, width: 40, color: muted, marginBottom: 16 }} />
              <p style={{ fontSize: 15, fontWeight: 500, color: ink, marginBottom: 6 }}>Select a conversation</p>
              <p style={{ fontSize: 13, color: muted }}>Choose a request or conversation from the left to get started.</p>
            </motion.div>

          ) : panel.type === 'request' ? (
            /* ── REQUEST DETAIL ─────────────────────────────────────── */
            <motion.div
              key={`req-${panel.data.id}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* header */}
              <div style={{ padding: '18px 28px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ink }}>
                  {initials(panel.data.startupName)}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 2 }}>{panel.data.startupName}</p>
                  <p style={{ fontSize: 12, color: muted }}>{panel.data.founderName} · {panel.data.industry} · {panel.data.stage}</p>
                </div>
                <button
                  onClick={() => router.push(`/investor/startup/${panel.data.founderId}`)}
                  style={{ marginLeft: 'auto', padding: '7px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 12, fontWeight: 500, color: ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <TrendingUp style={{ height: 12, width: 12 }} /> Full profile
                </button>
              </div>

              {/* body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px', maxWidth: 640, width: '100%', margin: '0 auto' }}>
                {/* connection request label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: muted }}>Connection Request</span>
                  <span style={{ fontSize: 10, color: muted, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, padding: '2px 9px' }}>{relDate(panel.data.requestedDate)}</span>
                </div>

                {/* Q-Score display */}
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: '20px 22px', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div>
                      <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Q-Score</p>
                      <p style={{ fontSize: 32, fontWeight: 300, color: qColor(panel.data.qScore), letterSpacing: '-0.04em', lineHeight: 1 }}>
                        {panel.data.qScore}
                      </p>
                    </div>
                    <div style={{ width: 1, height: 40, background: bdr }} />
                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {Object.entries(panel.data.qScoreBreakdown).map(([dim, score]) => (
                        <div key={dim} style={{ textAlign: 'center' }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: qColor(score as number), lineHeight: 1 }}>{score as number}</p>
                          <p style={{ fontSize: 9, color: muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>
                            {dim === 'goToMarket' ? 'GTM' : dim}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginLeft: 'auto', padding: '4px 12px', borderRadius: 999, background: qBg(panel.data.qScore), border: `1px solid ${qBorder(panel.data.qScore)}` }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: qColor(panel.data.qScore) }}>
                        {panel.data.qScore >= 70 ? 'Strong' : panel.data.qScore >= 50 ? 'Moderate' : 'Early stage'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* tags */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{panel.data.stage}</span>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB' }}>{panel.data.industry}</span>
                </div>

                {/* one-liner */}
                {panel.data.oneLiner && (
                  <p style={{ fontSize: 14, color: ink, lineHeight: 1.65, marginBottom: 20 }}>
                    {panel.data.oneLiner}
                  </p>
                )}

                {/* personal message */}
                {panel.data.personalMessage && (
                  <div style={{ borderLeft: `3px solid ${bdr}`, paddingLeft: 16, marginBottom: 28 }}>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 6, fontWeight: 500 }}>Personal note from {panel.data.founderName}</p>
                    <p style={{ fontSize: 14, color: ink, lineHeight: 1.7, fontStyle: 'italic' }}>
                      &quot;{panel.data.personalMessage}&quot;
                    </p>
                  </div>
                )}
              </div>

              {/* accept / decline footer */}
              <div style={{ padding: '16px 28px', borderTop: `1px solid ${bdr}`, display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: bg }}>
                <button
                  onClick={() => handleDecline(panel.data)}
                  disabled={actionLoading === panel.data.id}
                  style={{ padding: '9px 20px', borderRadius: 9, border: `1px solid #FECACA`, background: '#FEF2F2', fontSize: 13, fontWeight: 500, color: red, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <X style={{ height: 12, width: 12 }} /> Decline
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAccept(panel.data)}
                    disabled={actionLoading === panel.data.id}
                    style={{ padding: '9px 20px', borderRadius: 9, border: `1px solid ${bdr}`, background: surf, fontSize: 13, fontWeight: 500, color: ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: actionLoading === panel.data.id ? 0.6 : 1 }}
                  >
                    <CheckCircle style={{ height: 12, width: 12 }} />
                    Accept
                  </button>
                  <button
                    onClick={async () => {
                      await handleAccept(panel.data)
                    }}
                    disabled={actionLoading === panel.data.id}
                    style={{ padding: '9px 24px', borderRadius: 9, border: 'none', background: ink, fontSize: 13, fontWeight: 600, color: bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: actionLoading === panel.data.id ? 0.6 : 1 }}
                  >
                    <CheckCircle style={{ height: 12, width: 12 }} />
                    {actionLoading === panel.data.id ? 'Accepting…' : 'Accept & Reply →'}
                  </button>
                </div>
              </div>
            </motion.div>

          ) : (
            /* ── CONVERSATION THREAD ────────────────────────────────── */
            <motion.div
              key={`conv-${panel.data.id}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            >
              {/* header */}
              <div style={{ padding: '14px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ink }}>
                  {initials(panel.data.startupName)}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 1 }}>{panel.data.startupName}</p>
                  <p style={{ fontSize: 11, color: muted }}>{panel.data.founderName} · {panel.data.industry}</p>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ padding: '3px 10px', borderRadius: 999, background: qBg(panel.data.qScore), border: `1px solid ${qBorder(panel.data.qScore)}` }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: qColor(panel.data.qScore) }}>Q {panel.data.qScore}</span>
                  </div>
                  <button
                    onClick={() => router.push(`/investor/startup/${panel.data.founderId}`)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 11, fontWeight: 500, color: ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Profile <ChevronRight style={{ height: 10, width: 10 }} />
                  </button>
                </div>
              </div>

              {/* messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {/* connection accepted pill */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 11, color: muted, background: surf, padding: '4px 14px', borderRadius: 999, border: `1px solid ${bdr}` }}>
                    Connected · {relDate(panel.data.connectedAt)}
                  </span>
                </div>

                {/* initial personal message from founder */}
                {panel.data.personalMessage && (
                  <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: ink, flexShrink: 0 }}>
                      {initials(panel.data.founderName)}
                    </div>
                    <div style={{ maxWidth: '72%' }}>
                      <p style={{ fontSize: 10, color: muted, marginBottom: 4 }}>{panel.data.founderName} · Connection note</p>
                      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: '3px 12px 12px 12px', padding: '10px 14px' }}>
                        <p style={{ fontSize: 13, color: ink, lineHeight: 1.65, margin: 0 }}>{panel.data.personalMessage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {msgLoading && (
                  <p style={{ fontSize: 12, color: muted, textAlign: 'center', padding: '20px 0' }}>Loading messages…</p>
                )}

                {buildGroups(messages, myUserId ?? '').map((group, gi) => (
                  <MessageGroupBlock
                    key={group.messages[0].id}
                    group={group}
                    senderInitials={initials(panel.data.founderName)}
                    myInitials="Me"
                    isFirst={gi === 0}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* compose */}
              <div style={{ padding: '12px 20px', borderTop: `1px solid ${bdr}`, flexShrink: 0, background: bg }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-end', gap: 10,
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '10px 14px',
                  transition: 'border-color .12s',
                }}>
                  <textarea
                    ref={textareaRef}
                    value={msgInput}
                    onChange={e => setMsgInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder={`Message ${panel.data.founderName}…`}
                    rows={1}
                    style={{
                      flex: 1, border: 'none', outline: 'none', resize: 'none', overflow: 'hidden',
                      background: 'transparent', fontSize: 13, color: ink,
                      fontFamily: 'inherit', lineHeight: 1.6, maxHeight: 140,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {msgInput.length > 3500 && (
                      <span style={{ fontSize: 10, color: msgInput.length > 4000 ? red : muted }}>
                        {msgInput.length}/4000
                      </span>
                    )}
                    <button
                      onClick={handleSend}
                      disabled={!msgInput.trim() || sending || msgInput.length > 4000}
                      style={{
                        width: 32, height: 32, borderRadius: 8, border: 'none',
                        background: msgInput.trim() && !sending ? ink : bdr,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: msgInput.trim() && !sending ? 'pointer' : 'default',
                        transition: 'background .12s',
                      }}
                    >
                      <Send style={{ height: 13, width: 13, color: msgInput.trim() ? bg : muted }} />
                    </button>
                  </div>
                </div>
                <p style={{ fontSize: 10, color: muted, marginTop: 5, paddingLeft: 2 }}>⌘+Enter to send</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: ink, color: bg, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
