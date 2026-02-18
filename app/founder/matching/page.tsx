'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Lock,
  Send,
  ArrowRight,
  ChevronDown,
} from 'lucide-react'
import Link from 'next/link'
import { ConnectionRequestModal } from '@/features/matching/components/ConnectionRequestModal'
import { ConnectionStatusBadge, ConnectionStatus } from '@/features/matching/components/ConnectionStatusBadge'
import { useQScore } from '@/features/qscore/hooks/useQScore'

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2"
const surf  = "#F0EDE6"
const bdr   = "#E2DDD5"
const ink   = "#18160F"
const muted = "#8A867C"
const blue  = "#2563EB"

// ─── types ────────────────────────────────────────────────────────────────────
interface Investor {
  id: string
  name: string
  firm: string
  matchScore: number
  investmentFocus: string[]
  checkSize: string
  location: string
  portfolio: string[]
  responseRate: number
  thesis: string
  connectionStatus: ConnectionStatus
}

// ─── DB row shape ─────────────────────────────────────────────────────────────
interface DBInvestor {
  id: string
  name: string
  firm: string
  title: string
  location: string
  check_sizes: string[]
  stages: string[]
  sectors: string[]
  geography: string[]
  thesis: string | null
  portfolio: string[]
  response_rate: number
}

// Map a DB row → UI Investor, computing a naive match score
function mapInvestor(row: DBInvestor): Investor {
  return {
    id: row.id,
    name: row.name,
    firm: row.firm,
    matchScore: 70 + Math.floor(row.response_rate / 10),  // simple proxy for demo
    investmentFocus: row.sectors.slice(0, 3),
    checkSize: row.check_sizes[0] ?? 'Varies',
    location: row.location,
    portfolio: row.portfolio.slice(0, 3),
    responseRate: row.response_rate,
    thesis: row.thesis ?? '',
    connectionStatus: 'none',
  }
}

// ─── component ────────────────────────────────────────────────────────────────

export default function InvestorMatching() {
  const [searchTerm,       setSearchTerm]       = useState('')
  const [selectedFocus,    setSelectedFocus]    = useState('all')
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null)
  const [isModalOpen,      setIsModalOpen]      = useState(false)
  const [investors,        setInvestors]        = useState<Investor[]>([])
  const [loadingInvestors, setLoadingInvestors] = useState(true)
  const { qScore } = useQScore()
  const founderQScore = qScore?.overall ?? 62   // use 62 as demo default so gate is visible
  const isLocked = founderQScore < 65

  // Fetch investors from DB on mount
  useEffect(() => {
    fetch('/api/investors')
      .then(r => r.json())
      .then(data => {
        if (data.investors) setInvestors(data.investors.map(mapInvestor))
      })
      .catch(console.error)
      .finally(() => setLoadingInvestors(false))
  }, [])

  const handleConnectClick = (investor: Investor) => {
    if (isLocked) return
    setSelectedInvestor(investor)
    setIsModalOpen(true)
  }

  const handleConnectionSubmit = (_message: string) => {
    if (!selectedInvestor) return
    setInvestors(prev =>
      prev.map(inv =>
        inv.id === selectedInvestor.id
          ? { ...inv, connectionStatus: 'pending' as ConnectionStatus }
          : inv
      )
    )
    setIsModalOpen(false)
    setSelectedInvestor(null)
  }

  const filtered = investors.filter(inv => {
    const matchSearch = searchTerm === '' ||
      inv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.firm.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.investmentFocus.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchFocus = selectedFocus === 'all' ||
      inv.investmentFocus.some(f => f.toLowerCase().includes(selectedFocus.toLowerCase()))
    return matchSearch && matchFocus
  })

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 24px 64px", position: "relative" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>
            Investor Marketplace
          </p>
          <h1 style={{ fontSize: "clamp(1.6rem,4vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 8 }}>
            {loadingInvestors ? 'Loading investors…' : `${filtered.length} investors matched to your profile.`}
          </h1>
          <div style={{ display: "flex", gap: 20 }}>
            {[
              { value: "1,247", label: "active investors" },
              { value: "89%",   label: "match accuracy" },
              { value: "6.2×",  label: "higher response rate" },
            ].map((s) => (
              <div key={s.label} style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{s.value}</span>
                <span style={{ fontSize: 12, color: muted }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── search + filter bar ─────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24, flexWrap: "wrap" }}>
          {/* search */}
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 14, width: 14, color: muted }} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search investors, firms, or focus…"
              style={{ width: "100%", paddingLeft: 36, paddingRight: 14, paddingTop: 10, paddingBottom: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 10, fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          {/* focus filter */}
          <div style={{ position: "relative" }}>
            <select
              value={selectedFocus}
              onChange={(e) => setSelectedFocus(e.target.value)}
              style={{ appearance: "none", WebkitAppearance: "none", paddingLeft: 14, paddingRight: 34, paddingTop: 10, paddingBottom: 10, background: surf, border: `1px solid ${bdr}`, borderRadius: 10, fontSize: 13, color: ink, cursor: "pointer", outline: "none" }}
            >
              <option value="all">All Focus Areas</option>
              <option value="ai-ml">AI / ML</option>
              <option value="saas">SaaS</option>
              <option value="healthtech">HealthTech</option>
              <option value="fintech">FinTech</option>
              <option value="climate">Climate</option>
            </select>
            <ChevronDown style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", height: 12, width: 12, color: muted, pointerEvents: "none" }} />
          </div>
        </div>

        {/* ── investor list ───────────────────────────────────────────── */}
        <div style={{ position: "relative" }}>
          {/* lock overlay */}
          <AnimatePresence>
            {isLocked && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  position: "absolute", inset: 0, zIndex: 10,
                  backdropFilter: "blur(8px)",
                  WebkitBackdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 14,
                  background: "rgba(249,247,242,0.75)",
                }}
              >
                <div style={{ textAlign: "center", maxWidth: 340, padding: "0 24px" }}>
                  <div style={{ height: 48, width: 48, borderRadius: 12, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <Lock style={{ height: 20, width: 20, color: muted }} />
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 300, letterSpacing: "-0.02em", color: ink, marginBottom: 8 }}>
                    Marketplace unlocks at Q-Score 65
                  </h3>
                  <p style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
                    You&apos;re at {founderQScore}. Just {65 - founderQScore} more points to access 500+ verified investors.
                  </p>
                  <Link href="/founder/assessment"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "12px 24px", background: ink, color: bg, borderRadius: 999, fontSize: 14, fontWeight: 500, textDecoration: "none" }}
                  >
                    Improve my Q-Score <ArrowRight style={{ height: 14, width: 14 }} />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* column header */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 120px 110px", gap: 12, padding: "8px 0", borderBottom: `1px solid ${bdr}`, marginBottom: 2 }}>
            {["Investor", "Match", "Focus", "Check size", ""].map((h) => (
              <p key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, fontWeight: 600 }}>{h}</p>
            ))}
          </div>

          {/* rows */}
          {filtered.map((investor, i) => (
            <motion.div
              key={investor.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{ borderBottom: `1px solid ${bdr}` }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 110px 120px 110px", gap: 12, padding: "16px 0", alignItems: "center" }}>

                {/* investor info */}
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 2 }}>{investor.name}</p>
                  <p style={{ fontSize: 12, color: muted }}>{investor.firm} · {investor.location}</p>
                </div>

                {/* match % */}
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: blue, marginBottom: 3 }}>{investor.matchScore}%</p>
                  <div style={{ height: 3, background: surf, borderRadius: 999, overflow: "hidden", border: `1px solid ${bdr}` }}>
                    <div style={{ height: "100%", width: `${investor.matchScore}%`, background: blue, borderRadius: 999 }} />
                  </div>
                </div>

                {/* focus tags */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {investor.investmentFocus.slice(0, 2).map((f) => (
                    <span key={f} style={{ fontSize: 10, padding: "2px 7px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted, whiteSpace: "nowrap" }}>{f}</span>
                  ))}
                </div>

                {/* check size */}
                <p style={{ fontSize: 13, color: ink }}>{investor.checkSize}</p>

                {/* action */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  {investor.connectionStatus !== 'none' && (
                    <ConnectionStatusBadge status={investor.connectionStatus} />
                  )}
                  {investor.connectionStatus === 'none' && (
                    <button
                      onClick={() => handleConnectClick(investor)}
                      disabled={isLocked}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "7px 14px",
                        background: isLocked ? surf : ink,
                        color: isLocked ? muted : bg,
                        border: `1px solid ${isLocked ? bdr : ink}`,
                        borderRadius: 999,
                        fontSize: 12, fontWeight: 500,
                        cursor: isLocked ? "not-allowed" : "pointer",
                        transition: "opacity .15s",
                        whiteSpace: "nowrap",
                      }}
                      onMouseEnter={(e) => { if (!isLocked) (e.currentTarget as HTMLElement).style.opacity = "0.8"; }}
                      onMouseLeave={(e) => { if (!isLocked) (e.currentTarget as HTMLElement).style.opacity = "1"; }}
                    >
                      <Send style={{ height: 11, width: 11 }} />
                      Connect
                    </button>
                  )}
                </div>

              </div>

              {/* expandable thesis */}
              <p style={{ fontSize: 12, color: muted, paddingBottom: 12, paddingLeft: 0, lineHeight: 1.5, maxWidth: 480 }}>{investor.thesis}</p>
            </motion.div>
          ))}

          {filtered.length === 0 && (
            <p style={{ textAlign: "center", padding: "40px 0", color: muted, fontSize: 14 }}>No investors match your current filters.</p>
          )}
        </div>

        {/* ── bottom cta ─────────────────────────────────────────────── */}
        {!isLocked && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            style={{ marginTop: 40, padding: "20px", background: surf, border: `1px solid ${bdr}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>Improve your score to unlock more matches</p>
              <p style={{ fontSize: 12, color: muted }}>Higher Q-Scores get shown to more investors and receive more unsolicited interest.</p>
            </div>
            <Link href="/founder/assessment"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 13, color: ink, textDecoration: "none", fontWeight: 500, flexShrink: 0, marginLeft: 16, transition: "border-color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
            >
              Complete assessment <ArrowRight style={{ height: 13, width: 13 }} />
            </Link>
          </motion.div>
        )}

      </div>

      {/* connection modal */}
      {selectedInvestor && (
        <ConnectionRequestModal
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedInvestor(null); }}
          onSubmit={handleConnectionSubmit}
          investorName={selectedInvestor.name}
          startupOneLiner="AI-powered platform helping early-stage founders improve their Q-Score and connect with aligned investors"
          keyMetrics={[
            `Q-Score: ${founderQScore}/100`,
            'Go-to-Market Score: 45 (Improving)',
            'Product-Market Fit validation in progress',
            '3 months runway, seeking seed round',
          ]}
          matchReason={`Your startup's focus on ${selectedInvestor.investmentFocus[0]} aligns with ${selectedInvestor.firm}'s thesis. ${selectedInvestor.name} has a ${selectedInvestor.responseRate}% response rate.`}
        />
      )}
    </div>
  )
}
