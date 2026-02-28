'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  Inbox, CheckCircle, Users, ChevronRight,
  ArrowLeft, MessageSquare, TrendingUp,
  RefreshCw, Send, X,
} from 'lucide-react'

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2'
const surf  = '#F0EDE6'
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const green = '#16A34A'
const amber = '#D97706'
const red   = '#DC2626'

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

interface AcceptedConversation {
  id: string
  founderId: string
  founderName: string
  startupName: string
  stage: string
  industry: string
  qScore: number
  connectedAt: string
  personalMessage?: string
}

type Tab = 'requests' | 'conversations'

// ─── helpers ──────────────────────────────────────────────────────────────────
function relDate(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime()
  const days  = Math.floor(diff / 86400000)
  const hours = Math.floor(diff / 3600000)
  if (hours < 1)  return 'Just now'
  if (hours < 24) return `${hours}h ago`
  if (days === 1) return 'Yesterday'
  if (days < 30)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function qColor(n: number) {
  return n >= 70 ? green : n >= 50 ? amber : red
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ─── component ────────────────────────────────────────────────────────────────
export default function InvestorMessagesPage() {
  const router = useRouter()
  const [tab,           setTab]           = useState<Tab>('requests')
  const [requests,      setRequests]      = useState<PendingRequest[]>([])
  const [conversations, setConversations] = useState<AcceptedConversation[]>([])
  const [loading,       setLoading]       = useState(true)
  const [selected,      setSelected]      = useState<AcceptedConversation | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast,         setToast]         = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
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
              id: string; founderName: string; name: string;
              stage: string; sector: string; qScore: number;
              connectedAt: string;
            }) => ({
              id: c.id,
              founderId: c.id,
              founderName: c.founderName,
              startupName: c.name,
              stage: c.stage,
              industry: c.sector,
              qScore: c.qScore,
              connectedAt: c.connectedAt,
            }))
          )
        }
      } catch { /* silently fail */ } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAccept(req: PendingRequest) {
    setActionLoading(req.id)
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'accept' }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== req.id))
        setConversations(prev => [{
          id: req.founderId,
          founderId: req.founderId,
          founderName: req.founderName,
          startupName: req.startupName,
          stage: req.stage,
          industry: req.industry,
          qScore: req.qScore,
          connectedAt: new Date().toISOString(),
          personalMessage: req.personalMessage,
        }, ...prev])
        showToast(`Connected with ${req.founderName}`)
        setTab('conversations')
      }
    } catch { /* noop */ } finally {
      setActionLoading(null)
    }
  }

  async function handleDecline(req: PendingRequest) {
    setActionLoading(req.id)
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: req.id, action: 'decline' }),
      })
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.id !== req.id))
        showToast('Request declined')
      }
    } catch { /* noop */ } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw style={{ height: 20, width: 20, color: muted, margin: '0 auto 12px', animation: 'spin 1s linear infinite' }} />
          <p style={{ fontSize: 13, color: muted }}>Loading inbox…</p>
        </div>
      </div>
    )
  }

  // ── conversation thread view ──────────────────────────────────────────────
  if (selected) {
    return (
      <div style={{ minHeight: '100vh', background: bg, color: ink }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${bdr}`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, background: bg }}>
          <button
            onClick={() => setSelected(null)}
            style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${bdr}`, background: surf, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <ArrowLeft style={{ height: 14, width: 14, color: muted }} />
          </button>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ink }}>
            {initials(selected.startupName)}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{selected.startupName}</p>
            <p style={{ fontSize: 11, color: muted }}>{selected.founderName} · {selected.stage} · {selected.industry}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              onClick={() => router.push(`/investor/startup/${selected.founderId}`)}
              style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 12, fontWeight: 500, color: ink, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              <TrendingUp style={{ height: 12, width: 12 }} /> Full profile
            </button>
          </div>
        </div>

        {/* Thread */}
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
          {/* Q-Score badge */}
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: '14px 18px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <TrendingUp style={{ height: 14, width: 14, color: muted }} />
            <span style={{ fontSize: 12, color: muted }}>Q-Score</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: qColor(selected.qScore) }}>{selected.qScore || '—'}</span>
            <span style={{ fontSize: 11, color: muted, marginLeft: 'auto' }}>Connected {relDate(selected.connectedAt)}</span>
          </div>

          {/* Initial message from founder */}
          {selected.personalMessage && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ink, flexShrink: 0 }}>
                  {initials(selected.founderName)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{selected.founderName} · Initial message</p>
                  <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: '4px 12px 12px 12px', padding: '12px 16px' }}>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{selected.personalMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Connection accepted notice */}
          <div style={{ textAlign: 'center', padding: '12px 0', marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: muted, background: surf, padding: '4px 14px', borderRadius: 999, border: `1px solid ${bdr}` }}>
              Connection accepted · {relDate(selected.connectedAt)}
            </span>
          </div>

          {/* Draft reply area */}
          <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 11, color: muted, fontWeight: 500 }}>Reply to {selected.founderName}</p>
            </div>
            <textarea
              placeholder={`Message ${selected.founderName} about ${selected.startupName}…`}
              rows={4}
              style={{
                width: '100%', border: 'none', outline: 'none', resize: 'none',
                background: 'transparent', padding: '14px 16px',
                fontSize: 13, color: ink, fontFamily: 'inherit', lineHeight: 1.6,
                boxSizing: 'border-box',
              }}
            />
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${bdr}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: 11, color: muted }}>Replies coming soon — use email for now</p>
              <button
                style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: ink, color: bg, fontSize: 12, fontWeight: 500, cursor: 'not-allowed', opacity: 0.6, display: 'flex', alignItems: 'center', gap: 5 }}
                disabled
              >
                <Send style={{ height: 11, width: 11 }} /> Send
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── main inbox ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '40px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 8 }}>
            Investor · Messages
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink, marginBottom: 6 }}>
            Inbox.
          </h1>
          <p style={{ fontSize: 14, color: muted }}>Connection requests from founders and accepted conversations.</p>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${bdr}`, marginBottom: 24 }}>
          {([
            { key: 'requests' as Tab, label: `Requests (${requests.length})`, icon: Inbox },
            { key: 'conversations' as Tab, label: `Conversations (${conversations.length})`, icon: MessageSquare },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 16px', fontSize: 12, fontWeight: 500,
                color: tab === t.key ? ink : muted,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: tab === t.key ? `2px solid ${ink}` : '2px solid transparent',
                transition: 'color .15s', fontFamily: 'inherit',
              }}
            >
              <t.icon style={{ height: 13, width: 13 }} />
              {t.label}
              {t.key === 'requests' && requests.length > 0 && (
                <span style={{ background: red, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '1px 6px', marginLeft: 2 }}>
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── requests tab ── */}
        {tab === 'requests' && (
          <>
            {requests.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: `1px dashed ${bdr}`, borderRadius: 16 }}>
                <Inbox style={{ height: 36, width: 36, color: muted, margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>No pending requests</p>
                <p style={{ fontSize: 13, color: muted }}>New connection requests from founders will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {requests.map((req, i) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}
                  >
                    {/* top row */}
                    <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 11, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: ink, flexShrink: 0 }}>
                        {initials(req.startupName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>{req.startupName}</p>
                          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: surf, color: muted, border: `1px solid ${bdr}`, borderRadius: 999, padding: '2px 8px' }}>
                            {req.stage}
                          </span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: qColor(req.qScore), background: qColor(req.qScore) === green ? '#F0FDF4' : qColor(req.qScore) === amber ? '#FFFBEB' : '#FEF2F2', border: `1px solid ${qColor(req.qScore) === green ? '#86EFAC' : qColor(req.qScore) === amber ? '#FDE68A' : '#FECACA'}`, borderRadius: 999, padding: '2px 8px' }}>
                            Q {req.qScore}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: muted, marginBottom: 2 }}>
                          {req.founderName} · {req.industry} · {relDate(req.requestedDate)}
                        </p>
                        {req.personalMessage && (
                          <p style={{ fontSize: 13, color: ink, lineHeight: 1.5, marginTop: 10, padding: '10px 14px', background: surf, borderRadius: 8, border: `1px solid ${bdr}` }}>
                            &quot;{req.personalMessage}&quot;
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Q-Score breakdown */}
                    <div style={{ padding: '10px 20px', borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}`, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {Object.entries(req.qScoreBreakdown).map(([dim, score]) => (
                        <div key={dim} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontSize: 10, color: muted, textTransform: 'capitalize' }}>{dim === 'goToMarket' ? 'GTM' : dim}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: qColor(score as number) }}>{score as number}</span>
                        </div>
                      ))}
                    </div>

                    {/* action buttons */}
                    <div style={{ padding: '12px 20px', display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => router.push(`/investor/startup/${req.founderId}`)}
                        style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${bdr}`, background: 'transparent', fontSize: 12, fontWeight: 500, color: muted, cursor: 'pointer' }}
                      >
                        View profile
                      </button>
                      <button
                        onClick={() => handleDecline(req)}
                        disabled={actionLoading === req.id}
                        style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid #FECACA`, background: '#FEF2F2', fontSize: 12, fontWeight: 500, color: red, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                      >
                        <X style={{ height: 11, width: 11 }} /> Decline
                      </button>
                      <button
                        onClick={() => handleAccept(req)}
                        disabled={actionLoading === req.id}
                        style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: ink, fontSize: 12, fontWeight: 500, color: bg, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: actionLoading === req.id ? 0.6 : 1 }}
                      >
                        <CheckCircle style={{ height: 11, width: 11 }} />
                        {actionLoading === req.id ? 'Connecting…' : 'Accept'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── conversations tab ── */}
        {tab === 'conversations' && (
          <>
            {conversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', border: `1px dashed ${bdr}`, borderRadius: 16 }}>
                <Users style={{ height: 36, width: 36, color: muted, margin: '0 auto 16px' }} />
                <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 6 }}>No conversations yet</p>
                <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>Accept connection requests to start conversations with founders.</p>
                <button
                  onClick={() => setTab('requests')}
                  style={{ padding: '9px 20px', borderRadius: 999, border: 'none', background: ink, color: bg, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                >
                  View requests
                </button>
              </div>
            ) : (
              <div style={{ border: `1px solid ${bdr}`, borderRadius: 14, overflow: 'hidden' }}>
                {conversations.map((conv, i) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => setSelected(conv)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '16px 20px', cursor: 'pointer',
                      borderBottom: i < conversations.length - 1 ? `1px solid ${bdr}` : 'none',
                      background: bg, transition: 'background .12s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = surf }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = bg }}
                  >
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: ink, flexShrink: 0 }}>
                      {initials(conv.startupName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{conv.startupName}</p>
                        <span style={{ fontSize: 10, color: muted, background: surf, border: `1px solid ${bdr}`, borderRadius: 999, padding: '1px 7px' }}>{conv.stage}</span>
                      </div>
                      <p style={{ fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.founderName} · {conv.industry}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: qColor(conv.qScore) }}>{conv.qScore || '—'}</p>
                        <p style={{ fontSize: 10, color: muted }}>Q-Score</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 11, color: muted }}>{relDate(conv.connectedAt)}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'flex-end', marginTop: 2 }}>
                          <CheckCircle style={{ height: 10, width: 10, color: green }} />
                          <p style={{ fontSize: 10, color: green }}>Connected</p>
                        </div>
                      </div>
                      <ChevronRight style={{ height: 14, width: 14, color: muted }} />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}

        {/* empty state overall */}
        {requests.length === 0 && conversations.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{ fontSize: 12, color: muted }}>
              Founders can find you in Deal Flow once they complete their Q-Score assessment.
            </p>
          </div>
        )}
      </div>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: ink, color: bg, borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 500, zIndex: 9999, whiteSpace: 'nowrap' }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
