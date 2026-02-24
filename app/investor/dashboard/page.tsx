'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, TrendingUp, Inbox, ChevronRight, CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { ConnectionRequestCard } from '@/features/investor/components/ConnectionRequestCard'
import { MeetingSchedulerModal } from '@/features/investor/components/MeetingSchedulerModal'
import { DeclineFeedbackForm } from '@/features/investor/components/DeclineFeedbackForm'

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = '#F9F7F2'
const surf  = '#F0EDE6'
const bdr   = '#E2DDD5'
const ink   = '#18160F'
const muted = '#8A867C'
const blue  = '#2563EB'
const green = '#16A34A'
const amber = '#D97706'

// ─── types ────────────────────────────────────────────────────────────────────
interface Startup {
  id: string
  name: string
  tagline: string
  logo: string
  qScore: number
  stage: string
  sector: string
  location: string
  fundingGoal: string
  traction: string
  matchScore: number
  lastActive: string
  founder: { name: string; avatar: string; background: string }
  metrics: { revenue: string; growth: string; customers: number; team: number }
  tags: string[]
  status: 'new' | 'reviewing' | 'interested' | 'passed'
}

interface ConnectionRequest {
  id: string
  founderName: string
  startupName: string
  oneLiner: string
  qScore: number
  qScorePercentile: number
  qScoreBreakdown: { market: number; product: number; goToMarket: number; financial: number; team: number; traction: number }
  personalMessage: string | undefined
  requestedDate: string
  stage: string
  industry: string
  fundingTarget: string
}

// ─── status helpers ────────────────────────────────────────────────────────────
function statusStyle(status: Startup['status']) {
  switch (status) {
    case 'new':       return { color: blue,  bg: '#EFF6FF', label: 'New',       Icon: AlertCircle }
    case 'reviewing': return { color: amber, bg: '#FFFBEB', label: 'Reviewing', Icon: Clock }
    case 'interested':return { color: green, bg: '#F0FDF4', label: 'Interested',Icon: CheckCircle }
    case 'passed':    return { color: muted, bg: surf,      label: 'Passed',    Icon: XCircle }
  }
}

// ─── component ────────────────────────────────────────────────────────────────
export default function InvestorDashboard() {
  const router = useRouter()
  const [searchTerm,     setSearchTerm]     = useState('')
  const [selectedStage,  setSelectedStage]  = useState('all')
  const [selectedSector, setSelectedSector] = useState('all')
  const [activeTab,      setActiveTab]      = useState<'all' | Startup['status']>('all')

  const [connectionRequests, setConnectionRequests] = useState<ConnectionRequest[]>([])
  const [selectedRequest,    setSelectedRequest]    = useState<ConnectionRequest | null>(null)
  const [showScheduler,      setShowScheduler]      = useState(false)
  const [showDeclineForm,    setShowDeclineForm]    = useState(false)
  const [dealFlow,           setDealFlow]           = useState<Startup[]>([])
  const [loading,            setLoading]            = useState(true)

  useEffect(() => {
    let done = 0
    const tryDone = () => { done++; if (done >= 2) setLoading(false) }

    // Fetch real connection requests
    fetch('/api/investor/connections')
      .then(r => r.json())
      .then(data => { if (data.requests) setConnectionRequests(data.requests) })
      .catch(() => {})
      .finally(tryDone)

    // Fetch real deal flow
    fetch('/api/investor/deal-flow')
      .then(r => r.json())
      .then(data => {
        if (data.founders && data.founders.length > 0) {
          setDealFlow(data.founders.map((f: {
            id: string; name: string; tagline: string; qScore: number; stage: string;
            sector: string; location: string; fundingGoal: string; lastActive: string;
            founder: { name: string }; status: 'new'
          }) => ({
            id: f.id, name: f.name, tagline: f.tagline, logo: '',
            qScore: f.qScore, stage: f.stage, sector: f.sector,
            location: f.location, fundingGoal: f.fundingGoal, traction: '',
            matchScore: Math.min(99, f.qScore + 10),
            lastActive: new Date(f.lastActive).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            founder: { name: f.founder.name, avatar: '', background: '' },
            metrics: { revenue: '', growth: '', customers: 0, team: 0 },
            tags: [f.sector], status: f.status,
          })))
        }
      })
      .catch(() => {})
      .finally(tryDone)
  }, [])

  const handleAcceptRequest = (requestId: string) => {
    const req = connectionRequests.find(r => r.id === requestId)
    if (req) { setSelectedRequest(req); setShowScheduler(true) }
  }

  const handleDeclineRequest = (requestId: string) => {
    const req = connectionRequests.find(r => r.id === requestId)
    if (req) { setSelectedRequest(req); setShowDeclineForm(true) }
  }

  const handleScheduleMeeting = (_date: string, _time: string, _notes: string) => {
    if (!selectedRequest) return
    // Persist to DB
    fetch('/api/investor/connections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: selectedRequest.id, action: 'accept' }),
    }).catch(() => {})
    setConnectionRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
    setShowScheduler(false)
    setSelectedRequest(null)
  }

  const handleDeclineWithFeedback = (reasons: string[], feedback: string) => {
    if (!selectedRequest) return
    // Persist to DB
    fetch('/api/investor/connections', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestId: selectedRequest.id,
        action: 'decline',
        feedback: { reasons, text: feedback },
      }),
    }).catch(() => {})
    setConnectionRequests(prev => prev.filter(r => r.id !== selectedRequest.id))
    setShowDeclineForm(false)
    setSelectedRequest(null)
  }

  const filtered = dealFlow.filter(s => {
    const matchSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.sector.toLowerCase().includes(searchTerm.toLowerCase())
    const matchStage  = selectedStage  === 'all' || s.stage.toLowerCase().replace(/\s+/g, '-') === selectedStage
    const matchSector = selectedSector === 'all' || s.sector.toLowerCase().replace(/\//g, '-') === selectedSector
    const matchTab    = activeTab      === 'all' || s.status === activeTab
    return matchSearch && matchStage && matchSector && matchTab
  })

  const tabs: { key: 'all' | Startup['status']; label: string }[] = [
    { key: 'all',       label: `All (${dealFlow.length})` },
    { key: 'new',       label: `New (${dealFlow.filter(s => s.status === 'new').length})` },
    { key: 'reviewing', label: `Reviewing (${dealFlow.filter(s => s.status === 'reviewing').length})` },
    { key: 'interested',label: `Interested (${dealFlow.filter(s => s.status === 'interested').length})` },
    { key: 'passed',    label: `Passed (${dealFlow.filter(s => s.status === 'passed').length})` },
  ]

  return (
    <div style={{ minHeight: '100vh', background: bg, color: ink, padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* ── header ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, fontWeight: 600, marginBottom: 8 }}>
            Investor Portal
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem,4vw,2.4rem)', fontWeight: 300, letterSpacing: '-0.03em', color: ink, marginBottom: 6 }}>
            Deal flow.
          </h1>
          <p style={{ fontSize: 14, color: muted }}>Founders with completed Q-Score assessments, ranked by score.</p>
        </div>

        {/* ── stats row ────────────────────────────────────────────────── */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden', marginBottom: 32 }}>
            {[
              { label: 'Total Deals',   value: dealFlow.length, accent: ink   },
              { label: 'New',           value: dealFlow.filter(s => s.status === 'new').length, accent: green },
              { label: 'Avg Q-Score',   value: dealFlow.length ? Math.round(dealFlow.reduce((a, s) => a + s.qScore, 0) / dealFlow.length) : '—', accent: blue },
              { label: 'Requests',      value: connectionRequests.length, accent: amber },
            ].map((s, i) => (
              <div key={i} style={{ background: bg, padding: '20px 20px' }}>
                <p style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{s.label}</p>
                <p style={{ fontSize: 22, fontWeight: 700, color: s.accent }}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── connection requests ───────────────────────────────────────── */}
        {connectionRequests.length > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ height: 32, width: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Inbox style={{ height: 14, width: 14, color: blue }} />
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>
                Connection Requests
              </p>
              <div style={{ background: blue, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>
                {connectionRequests.length} new
              </div>
            </div>

            <div style={{ border: `1px solid ${bdr}`, borderRadius: 12, overflow: 'hidden' }}>
              {connectionRequests.map((request, i) => (
                <div key={request.id} style={{ borderBottom: i < connectionRequests.length - 1 ? `1px solid ${bdr}` : 'none' }}>
                  <ConnectionRequestCard
                    request={request}
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── loading skeleton ──────────────────────────────────────────── */}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0', color: muted, fontSize: 13 }}>
            Loading deal flow…
          </div>
        )}

        {/* ── empty state / welcome ─────────────────────────────────────── */}
        {!loading && dealFlow.length === 0 && (
          <div style={{ border: `1px solid ${bdr}`, borderRadius: 14, padding: '40px 36px', textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.18em', color: muted, marginBottom: 20 }}>Getting started</p>
            <h2 style={{ fontSize: 22, fontWeight: 300, letterSpacing: '-0.02em', color: ink, marginBottom: 12 }}>
              Welcome to Qcombinator
            </h2>
            <p style={{ fontSize: 14, color: muted, lineHeight: 1.65, maxWidth: 440, margin: '0 auto 32px' }}>
              Founders complete a Q-Score assessment before appearing in your deal flow. Once they do, you&apos;ll see them here ranked by score with full breakdowns.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 560, margin: '0 auto 32px', textAlign: 'left' }}>
              {[
                { step: '01', title: 'Founders assess', body: 'Founders complete a 7-topic interview. Q calculates a score across market, product, GTM, team, financial, and traction.' },
                { step: '02', title: 'You get matched', body: 'Scored founders appear in your deal flow, ranked by Q-Score. Filter by stage, sector, or location.' },
                { step: '03', title: 'Connect & close', body: 'Send or accept connection requests, message founders directly, and schedule intro calls — all inside the platform.' },
              ].map(({ step, title, body }) => (
                <div key={step} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '16px 16px' }}>
                  <p style={{ fontSize: 10, color: muted, fontWeight: 700, letterSpacing: '0.12em', marginBottom: 8 }}>{step}</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 6 }}>{title}</p>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.55 }}>{body}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 12, color: muted, opacity: 0.6 }}>Check back soon — new founders are assessed every day.</p>
          </div>
        )}

        {/* ── deal flow ────────────────────────────────────────────────── */}
        {!loading && dealFlow.length > 0 && <div>
          {/* section header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>Deal Flow Pipeline</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp style={{ height: 13, width: 13, color: muted }} />
              <span style={{ fontSize: 12, color: muted }}>Sorted by match score</span>
            </div>
          </div>

          {/* filter bar */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {/* search */}
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', height: 13, width: 13, color: muted }} />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search company, sector…"
                style={{
                  width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9,
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                }}
              />
            </div>

            {/* stage select */}
            <select
              value={selectedStage}
              onChange={e => setSelectedStage(e.target.value)}
              style={{ padding: '9px 12px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="all">All Stages</option>
              <option value="pre-seed">Pre-Seed</option>
              <option value="seed">Seed</option>
              <option value="series-a">Series A</option>
              <option value="series-b">Series B</option>
            </select>

            {/* sector select */}
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value)}
              style={{ padding: '9px 12px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: 'none', fontFamily: 'inherit' }}
            >
              <option value="all">All Sectors</option>
              <option value="ai-ml">AI/ML</option>
              <option value="healthcare">Healthcare</option>
              <option value="fintech">Fintech</option>
              <option value="climate">Climate</option>
              <option value="saas">SaaS</option>
              <option value="cybersecurity">Cybersecurity</option>
            </select>
          </div>

          {/* status tabs */}
          <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px', fontSize: 12, fontWeight: 500,
                  color: activeTab === tab.key ? ink : muted,
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.key ? `2px solid ${ink}` : '2px solid transparent',
                  transition: 'color .15s',
                  fontFamily: 'inherit',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 110px 120px 100px 44px', gap: 12, padding: '10px 16px', borderBottom: `1px solid ${bdr}` }}>
            {['Company', 'Q-Score', 'Match', 'Stage', 'Revenue', 'Status', ''].map((h, i) => (
              <p key={i} style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: muted, fontWeight: 600 }}>{h}</p>
            ))}
          </div>

          {/* startup rows */}
          <div style={{ border: `1px solid ${bdr}`, borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: muted, fontSize: 14 }}>No deals match your filters.</div>
            ) : filtered.map((startup, i) => {
              const ss = statusStyle(startup.status)
              const StatusIcon = ss.Icon
              const initials = startup.name.split(' ').map(n => n[0]).join('').slice(0, 2)
              return (
                <motion.div
                  key={startup.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${bdr}` : 'none', background: bg }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = bg}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 110px 120px 100px 44px', gap: 12, padding: '14px 16px', alignItems: 'center' }}>

                    {/* company */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                      <div style={{ height: 36, width: 36, borderRadius: 9, background: surf, border: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: ink, flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: ink, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{startup.name}</p>
                        <p style={{ fontSize: 12, color: muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{startup.founder.name} · {startup.sector}</p>
                      </div>
                    </div>

                    {/* q-score */}
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700, color: startup.qScore >= 80 ? green : startup.qScore >= 70 ? blue : muted }}>{startup.qScore}</p>
                    </div>

                    {/* match */}
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{startup.matchScore}%</p>
                      <div style={{ height: 3, background: bdr, borderRadius: 99, marginTop: 3, width: '80%' }}>
                        <div style={{ height: '100%', background: blue, borderRadius: 99, width: `${startup.matchScore}%` }} />
                      </div>
                    </div>

                    {/* stage */}
                    <p style={{ fontSize: 12, color: muted }}>{startup.stage}</p>

                    {/* revenue */}
                    <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{startup.metrics.revenue}</p>

                    {/* status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: ss.bg, border: `1px solid ${bdr}`, borderRadius: 999, width: 'fit-content' }}>
                      <StatusIcon style={{ height: 10, width: 10, color: ss.color }} />
                      <span style={{ fontSize: 11, color: ss.color, fontWeight: 500 }}>{ss.label}</span>
                    </div>

                    {/* arrow */}
                    <button
                      onClick={() => router.push(`/investor/startup/${startup.id}`)}
                      style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: 'pointer' }}
                    >
                      <ChevronRight style={{ height: 13, width: 13, color: muted }} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>}

        {/* footnote */}
        {!loading && dealFlow.length > 0 && (
          <p style={{ marginTop: 48, fontSize: 11, color: muted, opacity: 0.5, textAlign: 'center' }}>
            {filtered.length} startups shown · Powered by Q-Score Algorithm v2
          </p>
        )}
      </div>

      {/* ── modals ───────────────────────────────────────────────────────── */}
      {selectedRequest && (
        <MeetingSchedulerModal
          isOpen={showScheduler}
          onClose={() => { setShowScheduler(false); setSelectedRequest(null) }}
          onSchedule={handleScheduleMeeting}
          founderName={selectedRequest.founderName}
          startupName={selectedRequest.startupName}
        />
      )}

      {selectedRequest && (
        <DeclineFeedbackForm
          isOpen={showDeclineForm}
          onClose={() => { setShowDeclineForm(false); setSelectedRequest(null) }}
          onSubmit={handleDeclineWithFeedback}
          founderName={selectedRequest.founderName}
          startupName={selectedRequest.startupName}
        />
      )}
    </div>
  )
}
