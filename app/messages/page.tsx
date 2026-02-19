'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Send, Paperclip, MoreVertical, Star, Archive,
  MessageCircle, Calendar, User, Building2, TrendingUp,
  ChevronRight, ArrowLeft, X,
} from 'lucide-react'

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2"
const surf  = "#F0EDE6"
const bdr   = "#E2DDD5"
const ink   = "#18160F"
const muted = "#8A867C"
const blue  = "#2563EB"
const green = "#16A34A"
const amber = "#D97706"

// ─── types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string
  content: string
  timestamp: string
  sender: 'user' | 'other'
  type: 'text' | 'document' | 'meeting-request'
  attachments?: Array<{ name: string; type: string; size: string }>
}

interface Conversation {
  id: string
  participant: {
    name: string
    title: string
    company: string
    type: 'founder' | 'investor'
    qScore: number
    stage: string
    seeking: string
    sector: string
  }
  lastMessage: string
  timestamp: string
  unread: number
  status: 'active' | 'archived' | 'important'
  messages: Message[]
}

// ─── mock data ────────────────────────────────────────────────────────────────
const mockConversations: Conversation[] = [
  {
    id: '1',
    participant: {
      name: 'Sarah Chen', title: 'CEO & Co-founder', company: 'TechFlow AI',
      type: 'founder', qScore: 84, stage: 'Series A', seeking: '$5M', sector: 'B2B SaaS',
    },
    lastMessage: "I'd love to schedule a call to discuss our Series A round.",
    timestamp: '2h ago', unread: 2, status: 'important',
    messages: [
      { id: '1', content: "Hi! I noticed your interest in TechFlow AI from our Q Combinator profile. I'd love to connect and discuss our Series A fundraising round.", timestamp: '10:30 AM', sender: 'other', type: 'text' },
      { id: '2', content: "Hello Sarah, thank you for reaching out. I've reviewed your company profile and I'm very impressed with your traction and team. I'd be interested in learning more about your current funding round.", timestamp: '11:45 AM', sender: 'user', type: 'text' },
      { id: '3', content: "That's great to hear! We're raising $5M for our Series A at a $25M pre-money valuation. Would you be available for a call this week?", timestamp: '2:15 PM', sender: 'other', type: 'text' },
      { id: '4', content: "I'd like to schedule a meeting to discuss this further. Here are my available times.", timestamp: '2:16 PM', sender: 'other', type: 'meeting-request' },
    ],
  },
  {
    id: '2',
    participant: {
      name: 'Dr. Michael Rodriguez', title: 'CEO', company: 'HealthSync',
      type: 'founder', qScore: 71, stage: 'Seed', seeking: '$2M', sector: 'HealthTech',
    },
    lastMessage: "I've attached our updated pitch deck with the latest metrics.",
    timestamp: '1 day ago', unread: 0, status: 'active',
    messages: [
      {
        id: '1', content: "Thank you for expressing interest in HealthSync. I've attached our latest pitch deck.", timestamp: 'Yesterday 3:20 PM', sender: 'other', type: 'document',
        attachments: [{ name: 'HealthSync_Pitch_Deck_Jan_2024.pdf', type: 'PDF', size: '8.2 MB' }],
      },
    ],
  },
  {
    id: '3',
    participant: {
      name: 'Alex Thompson', title: 'CEO', company: 'GreenLogistics',
      type: 'founder', qScore: 67, stage: 'Pre-Seed', seeking: '$750K', sector: 'Climate',
    },
    lastMessage: 'Looking forward to our call tomorrow at 2 PM.',
    timestamp: '2 days ago', unread: 0, status: 'active',
    messages: [
      { id: '1', content: "Great meeting you at the virtual pitch event! As discussed, I'm sending over our investor materials.", timestamp: '2 days ago 4:30 PM', sender: 'other', type: 'text' },
    ],
  },
]

type FilterType = 'all' | 'unread' | 'important'
const FILTERS: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Unread' },
  { id: 'important', label: 'Starred' },
]

function qScoreColor(s: number) {
  if (s >= 70) return blue
  if (s >= 50) return amber
  return '#DC2626'
}

// ─── component ────────────────────────────────────────────────────────────────
export default function MessagesPage() {
  const [selected, setSelected]         = useState<Conversation | null>(mockConversations[0])
  const [messageInput, setMessageInput] = useState('')
  const [searchTerm, setSearchTerm]     = useState('')
  const [filter, setFilter]             = useState<FilterType>('all')
  const [showDetail, setShowDetail]     = useState(true)
  const bottomRef                       = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [selected])

  const filtered = mockConversations.filter(c => {
    if (filter === 'unread'    && c.unread === 0)           return false
    if (filter === 'important' && c.status !== 'important') return false
    if (searchTerm &&
        !c.participant.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !c.participant.company.toLowerCase().includes(searchTerm.toLowerCase())) return false
    return true
  })

  const handleSend = () => {
    if (!messageInput.trim() || !selected) return
    selected.messages.push({
      id:        Date.now().toString(),
      content:   messageInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sender:    'user',
      type:      'text',
    })
    setMessageInput('')
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const initials = (name: string) => name.split(' ').map(n => n[0]).join('')

  const renderMessage = (msg: Message, idx: number, all: Message[]) => {
    const isUser   = msg.sender === 'user'
    const prevSame = idx > 0 && all[idx - 1].sender === msg.sender
    const p        = selected!.participant

    const bubble = (content: React.ReactNode) => (
      <motion.div
        key={msg.id}
        initial={{ opacity: 0, y: 6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        style={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          alignItems: 'flex-end',
          gap: 8,
          marginBottom: prevSame ? 4 : 14,
          paddingLeft: isUser ? 48 : 0,
          paddingRight: isUser ? 0 : 48,
        }}
      >
        {/* avatar for received — only on last consecutive */}
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
      return bubble(
        <div style={{
          maxWidth: 360, padding: '14px 16px',
          background: isUser ? ink : surf,
          border: `1px solid ${isUser ? ink : bdr}`,
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
          color: isUser ? bg : ink,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
            <Calendar style={{ height: 12, width: 12, color: isUser ? 'rgba(249,247,242,0.6)' : muted }} />
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: isUser ? 'rgba(249,247,242,0.7)' : muted }}>
              Meeting Request
            </span>
          </div>
          <p style={{ fontSize: 13, fontWeight: 500, color: isUser ? bg : ink, marginBottom: 12 }}>
            {msg.content}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Wed, Jan 17 — 2:00 PM PST', 'Thu, Jan 18 — 10:00 AM PST', 'Fri, Jan 19 — 3:00 PM PST'].map(slot => (
              <div key={slot} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 10px', background: isUser ? 'rgba(249,247,242,0.07)' : bg, border: `1px solid ${isUser ? 'rgba(249,247,242,0.15)' : bdr}`, borderRadius: 8 }}>
                <span style={{ fontSize: 12, color: isUser ? 'rgba(249,247,242,0.85)' : ink }}>{slot}</span>
                <button style={{
                  padding: '3px 12px', fontSize: 11, fontWeight: 600,
                  background: isUser ? 'rgba(249,247,242,0.15)' : ink,
                  color: isUser ? bg : bg,
                  border: 'none', borderRadius: 999, cursor: 'pointer',
                }}>Accept</button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 10, marginTop: 10, color: isUser ? 'rgba(249,247,242,0.35)' : muted }}>{msg.timestamp}</p>
        </div>
      )
    }

    if (msg.type === 'document') {
      return bubble(
        <div style={{
          maxWidth: 360, padding: '12px 14px',
          background: isUser ? ink : surf,
          border: `1px solid ${isUser ? ink : bdr}`,
          borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
        }}>
          <p style={{ fontSize: 13, color: isUser ? bg : ink, marginBottom: 10, lineHeight: 1.5 }}>{msg.content}</p>
          {msg.attachments?.map((att, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', background: isUser ? 'rgba(249,247,242,0.08)' : bg, border: `1px solid ${bdr}`, borderRadius: 8, marginBottom: 4 }}>
              <div style={{ height: 30, width: 30, background: surf, border: `1px solid ${bdr}`, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Paperclip style={{ height: 11, width: 11, color: muted }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: ink }}>{att.name}</p>
                <p style={{ fontSize: 10, color: muted }}>{att.type} · {att.size}</p>
              </div>
              <button style={{ padding: '4px 10px', fontSize: 10, fontWeight: 500, background: 'none', border: `1px solid ${bdr}`, borderRadius: 999, cursor: 'pointer', color: ink, flexShrink: 0 }}>
                Download
              </button>
            </div>
          ))}
          <p style={{ fontSize: 10, marginTop: 6, color: isUser ? 'rgba(249,247,242,0.35)' : muted }}>{msg.timestamp}</p>
        </div>
      )
    }

    return bubble(
      <div style={{
        maxWidth: 380, padding: '10px 14px',
        background: isUser ? ink : surf,
        border: `1px solid ${isUser ? ink : bdr}`,
        borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
      }}>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: isUser ? bg : ink }}>{msg.content}</p>
        <p style={{ fontSize: 10, marginTop: 5, color: isUser ? 'rgba(249,247,242,0.35)' : muted, textAlign: 'right' }}>{msg.timestamp}</p>
      </div>
    )
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: bg, fontFamily: 'inherit' }}>

      {/* ── top notice ── */}
      <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: '7px 20px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ height: 6, width: 6, background: amber, borderRadius: '50%', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: muted }}>
            <span style={{ fontWeight: 600, color: ink }}>Demo Mode — </span>
            Real messages appear after investor connections are accepted.
          </span>
        </div>
        <Link href="/founder/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: muted, textDecoration: 'none', fontWeight: 500 }}>
          <ArrowLeft style={{ height: 12, width: 12 }} />
          Dashboard
        </Link>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── sidebar ── */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
          style={{ width: 320, background: surf, borderRight: `1px solid ${bdr}`, display: 'flex', flexDirection: 'column', flexShrink: 0 }}
        >
          {/* header */}
          <div style={{ padding: '18px 18px 12px', borderBottom: `1px solid ${bdr}` }}>
            <div style={{ marginBottom: 14 }}>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: muted, fontWeight: 600, marginBottom: 3 }}>Messages</p>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <p style={{ fontSize: 20, fontWeight: 300, color: ink, letterSpacing: '-0.025em' }}>Inbox</p>
                {mockConversations.some(c => c.unread > 0) && (
                  <span style={{ fontSize: 11, color: muted }}>
                    {mockConversations.reduce((a, c) => a + c.unread, 0)} unread
                  </span>
                )}
              </div>
            </div>

            {/* search */}
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', height: 12, width: 12, color: muted, pointerEvents: 'none' }} />
              <input
                placeholder="Search…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 8, paddingBottom: 8,
                  fontSize: 12, background: bg, border: `1px solid ${bdr}`, borderRadius: 8,
                  outline: 'none', color: ink, fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* filters */}
            <div style={{ display: 'flex', gap: 4 }}>
              {FILTERS.map(f => {
                const active = filter === f.id
                const count  = f.id === 'unread' ? mockConversations.filter(c => c.unread > 0).length
                             : f.id === 'important' ? mockConversations.filter(c => c.status === 'important').length
                             : mockConversations.length
                return (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '5px 11px', fontSize: 11, fontWeight: active ? 600 : 400,
                      background: active ? ink : 'transparent',
                      color: active ? bg : muted,
                      border: `1px solid ${active ? ink : bdr}`,
                      borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    {f.label}
                    <span style={{ fontSize: 10, opacity: active ? 0.6 : 0.7 }}>{count}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* conversation list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: muted }}>No conversations found</p>
              </div>
            ) : filtered.map((conv, i) => {
              const active = selected?.id === conv.id
              const qCol   = qScoreColor(conv.participant.qScore)
              return (
                <motion.div
                  key={conv.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelected(conv)}
                  style={{
                    padding: '14px 18px', borderBottom: `1px solid ${bdr}`,
                    cursor: 'pointer', transition: 'background 0.12s',
                    background: active ? bg : 'transparent',
                    borderLeft: `3px solid ${active ? ink : 'transparent'}`,
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = `${bg}99` }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {/* avatar */}
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{
                        height: 42, width: 42, borderRadius: 13,
                        background: active ? surf : bg, border: `1px solid ${bdr}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 700, color: muted,
                      }}>
                        {initials(conv.participant.name)}
                      </div>
                      {/* q-score ring dot */}
                      <div style={{
                        position: 'absolute', bottom: -2, right: -2,
                        height: 14, width: 14, borderRadius: '50%',
                        background: qCol, border: `2px solid ${active ? bg : surf}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }} title={`Q-Score ${conv.participant.qScore}`} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: ink }}>{conv.participant.name}</span>
                          {conv.status === 'important' && <Star style={{ height: 10, width: 10, color: amber }} />}
                          {conv.status === 'archived'  && <Archive style={{ height: 10, width: 10, color: muted }} />}
                        </div>
                        <span style={{ fontSize: 10, color: muted, flexShrink: 0 }}>{conv.timestamp}</span>
                      </div>
                      <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>
                        {conv.participant.company} · <span style={{ color: qCol, fontWeight: 600 }}>{conv.participant.qScore}</span>
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                        <p style={{ fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {conv.lastMessage}
                        </p>
                        {conv.unread > 0 && (
                          <span style={{
                            minWidth: 18, height: 18, padding: '0 5px', background: ink, color: bg,
                            borderRadius: 999, fontSize: 10, fontWeight: 700, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>{conv.unread}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* ── chat + detail ── */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

            {/* chat column */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

              {/* chat header */}
              <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      height: 36, width: 36, borderRadius: 10,
                      background: bg, border: `1px solid ${bdr}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, color: muted,
                    }}>
                      {initials(selected.participant.name)}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>{selected.participant.name}</p>
                        <span style={{
                          padding: '2px 8px', fontSize: 9, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.1em',
                          background: bg, border: `1px solid ${bdr}`, borderRadius: 999, color: muted,
                        }}>
                          {selected.participant.type}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: muted }}>{selected.participant.title} · {selected.participant.company}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button
                      onClick={() => setShowDetail(v => !v)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        padding: '6px 12px', fontSize: 11, fontWeight: 500,
                        background: showDetail ? ink : 'transparent',
                        color: showDetail ? bg : muted,
                        border: `1px solid ${showDetail ? ink : bdr}`,
                        borderRadius: 999, cursor: 'pointer', transition: 'all 0.15s',
                      }}
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

              {/* messages area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px 12px', background: bg }}>
                {/* date divider */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                  <span style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                    Today
                  </span>
                  <div style={{ flex: 1, height: 1, background: bdr }} />
                </div>

                {selected.messages.map((msg, idx) => renderMessage(msg, idx, selected.messages))}
                <div ref={bottomRef} />
              </div>

              {/* input */}
              <div style={{ background: surf, borderTop: `1px solid ${bdr}`, padding: '12px 20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                  <button style={{
                    height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: `1px solid ${bdr}`, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                    transition: 'border-color 0.15s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = ink)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = bdr)}
                  >
                    <Paperclip style={{ height: 13, width: 13, color: muted }} />
                  </button>

                  <div style={{ flex: 1, position: 'relative' }}>
                    <textarea
                      placeholder="Write a message…"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
                      }}
                      rows={1}
                      style={{
                        width: '100%', padding: '9px 14px', fontSize: 13, color: ink, lineHeight: 1.5,
                        background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
                        outline: 'none', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
                        minHeight: 38, maxHeight: 120, overflowY: 'auto',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = muted)}
                      onBlur={e => (e.currentTarget.style.borderColor = bdr)}
                    />
                  </div>

                  <button
                    onClick={handleSend}
                    disabled={!messageInput.trim()}
                    style={{
                      height: 36, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: messageInput.trim() ? ink : surf,
                      border: `1px solid ${messageInput.trim() ? ink : bdr}`,
                      borderRadius: 8, cursor: messageInput.trim() ? 'pointer' : 'default',
                      transition: 'all 0.15s', flexShrink: 0,
                    }}
                  >
                    <Send style={{ height: 13, width: 13, color: messageInput.trim() ? bg : muted }} />
                  </button>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7 }}>
                  <span style={{ fontSize: 10, color: muted }}>Enter to send · Shift+Enter for new line</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 10, color: muted }}>AI insights coming soon</span>
                    <span style={{ height: 5, width: 5, background: green, borderRadius: '50%', display: 'inline-block' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* ── detail panel ── */}
            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 260 }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  style={{ borderLeft: `1px solid ${bdr}`, background: surf, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}
                >
                  <div style={{ padding: '16px 18px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600 }}>Profile</p>
                    <button
                      onClick={() => setShowDetail(false)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <X style={{ height: 13, width: 13, color: muted }} />
                    </button>
                  </div>

                  <div style={{ padding: '20px 18px', overflowY: 'auto', flex: 1 }}>
                    {/* avatar + name */}
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                      <div style={{
                        height: 56, width: 56, borderRadius: 16, margin: '0 auto 10px',
                        background: bg, border: `1px solid ${bdr}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 18, fontWeight: 700, color: muted,
                      }}>
                        {initials(selected.participant.name)}
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 2 }}>{selected.participant.name}</p>
                      <p style={{ fontSize: 11, color: muted }}>{selected.participant.title}</p>
                      <p style={{ fontSize: 11, color: muted }}>{selected.participant.company}</p>
                    </div>

                    {/* q-score */}
                    <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, padding: '16px', marginBottom: 12, textAlign: 'center' }}>
                      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: muted, fontWeight: 600, marginBottom: 8 }}>Q-Score</p>
                      <div style={{ position: 'relative', height: 80, width: 80, margin: '0 auto 8px' }}>
                        <svg style={{ position: 'absolute', inset: 0, transform: 'rotate(-90deg)' }} viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="34" fill="none" stroke={bdr} strokeWidth="5" />
                          <motion.circle
                            cx="40" cy="40" r="34" fill="none"
                            stroke={qScoreColor(selected.participant.qScore)}
                            strokeWidth="5" strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 34}`}
                            initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                            animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - selected.participant.qScore / 100) }}
                            transition={{ duration: 1, delay: 0.1, ease: 'easeOut' }}
                          />
                        </svg>
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 22, fontWeight: 600, color: ink, lineHeight: 1 }}>{selected.participant.qScore}</span>
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: muted }}>Investment Readiness</p>
                    </div>

                    {/* details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {[
                        { label: 'Stage',   value: selected.participant.stage },
                        { label: 'Seeking', value: selected.participant.seeking },
                        { label: 'Sector',  value: selected.participant.sector },
                      ].map(item => (
                        <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: bg, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                          <span style={{ fontSize: 11, color: muted }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: ink }}>{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* cta */}
                    <Link href={`/investor/startup/${selected.id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        marginTop: 16, padding: '10px 14px',
                        background: ink, borderRadius: 10, cursor: 'pointer',
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: bg }}>Full Profile</span>
                        <ChevronRight style={{ height: 13, width: 13, color: 'rgba(249,247,242,0.5)' }} />
                      </div>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* empty state */
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              style={{ textAlign: 'center' }}
            >
              <div style={{ height: 64, width: 64, background: surf, border: `1px solid ${bdr}`, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
                <MessageCircle style={{ height: 26, width: 26, color: muted }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 300, color: ink, letterSpacing: '-0.02em', marginBottom: 6 }}>No conversation selected</p>
              <p style={{ fontSize: 12, color: muted }}>Pick a conversation from the sidebar to get started</p>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  )
}
