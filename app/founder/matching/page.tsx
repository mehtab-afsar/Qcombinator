'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Lock,
  Send,
  ArrowRight,
  ChevronDown,
  Sparkles,
  X,
  MapPin,
  Briefcase,
  DollarSign,
  TrendingUp,
} from 'lucide-react'
import Link from 'next/link'
import { ConnectionRequestModal } from '@/features/matching/components/ConnectionRequestModal'
import { ConnectionStatusBadge } from '@/features/matching/components/ConnectionStatusBadge'
import { ConnectionStatus, MatchingInvestor } from '@/features/matching/types/matching.types'
import { useQScore } from '@/features/qscore/hooks/useQScore'
import { useMatchingData } from '@/features/matching/hooks/useMatchingData'
import { bg, surf, bdr, ink, muted, blue, green, amber } from '@/lib/constants/colors'

type Investor = MatchingInvestor

// ─── component ────────────────────────────────────────────────────────────────

export default function InvestorMatching() {
  const [searchTerm,       setSearchTerm]       = useState('')
  const [selectedFocus,    setSelectedFocus]    = useState('all')
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null)
  const [isModalOpen,      setIsModalOpen]      = useState(false)
  const [rationaleMap,     setRationaleMap]     = useState<Record<string, string | 'loading'>>({})
  const [profileInvestor,  setProfileInvestor]  = useState<Investor | null>(null)

  const fetchRationale = async (investor: Investor) => {
    if (rationaleMap[investor.id] || isLocked) return
    setRationaleMap(prev => ({ ...prev, [investor.id]: 'loading' }))
    try {
      const res = await fetch('/api/connections/rationale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          investorName:    investor.name,
          investorFirm:    investor.firm,
          investorThesis:  investor.thesis,
          investorSectors: investor.investmentFocus,
          investorStages:  [],
          investorPortfolio: investor.portfolio,
          matchScore:      investor.matchScore,
          founderSector,
          founderStage,
          founderQScore,
        }),
      })
      const data = await res.json() as { rationale?: string }
      setRationaleMap(prev => ({ ...prev, [investor.id]: data.rationale || '' }))
    } catch {
      setRationaleMap(prev => ({ ...prev, [investor.id]: '' }))
    }
  }
  const { qScore } = useQScore()
  const founderQScore = qScore?.overall ?? 62   // use 62 as demo default so gate is visible
  const isLocked = founderQScore < 60

  const {
    investors, setInvestors,
    founderSector, founderStage,
    loadingInvestors,
  } = useMatchingData(founderQScore)

  const handleConnectClick = (investor: Investor) => {
    if (isLocked) return
    setSelectedInvestor(investor)
    setIsModalOpen(true)
    fetchRationale(investor)
  }

  const handleConnectionSubmit = async (message: string) => {
    if (!selectedInvestor) return
    try {
      const body: Record<string, unknown> = {
        personal_message: message,
        founder_qscore: founderQScore,
      }
      if (selectedInvestor.type === 'real') {
        body.investor_id = selectedInvestor.id
      } else {
        body.demo_investor_id = selectedInvestor.id
      }
      const res = await fetch('/api/connections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`${res.status}`)
      setInvestors(prev =>
        prev.map(inv =>
          inv.id === selectedInvestor.id
            ? { ...inv, connectionStatus: 'pending' as ConnectionStatus }
            : inv
        )
      )
    } catch (err) {
      console.error('Connection request failed:', err)
    }
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
                    Marketplace unlocks at Q-Score 60
                  </h3>
                  <p style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
                    You&apos;re at {founderQScore}. Just {60 - founderQScore} more points to access 500+ verified investors.
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

          {/* rich investor cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {filtered.map((investor, i) => {
            const matchColor = investor.matchScore >= 80 ? green : investor.matchScore >= 60 ? blue : amber
            const initials = investor.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
            const rationale = rationaleMap[investor.id]
            const rationaleText = (typeof rationale === 'string' && rationale !== 'loading')
              ? rationale.replace(/^#[^\n]*\n?/, '').trim()
              : null
            return (
            <motion.div
              key={investor.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onMouseEnter={() => fetchRationale(investor)}
              style={{
                background: surf, border: `1px solid ${bdr}`, borderRadius: 14,
                overflow: "hidden", transition: "box-shadow 0.15s, border-color 0.15s",
              }}
              onHoverStart={() => {}}
            >
              {/* card top row */}
              <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "flex-start", gap: 14 }}>
                {/* avatar — click opens profile */}
                <div
                  onClick={() => setProfileInvestor(investor)}
                  style={{
                    width: 44, height: 44, borderRadius: 12, background: `${matchColor}18`,
                    border: `1.5px solid ${matchColor}40`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, fontWeight: 700, color: matchColor, flexShrink: 0,
                    cursor: "pointer",
                  }}
                >
                  {initials}
                </div>

                {/* name + firm — click opens profile */}
                <div style={{ flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => setProfileInvestor(investor)}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: ink }}>{investor.name}</span>
                    {investor.type === 'real' && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "#DCFCE7", color: "#166534", letterSpacing: "0.05em" }}>LIVE</span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>{investor.firm}{investor.location ? ` · ${investor.location}` : ''}</p>
                </div>

                {/* match % + bar */}
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: matchColor, lineHeight: 1 }}>{investor.matchScore}%</div>
                  <div style={{ fontSize: 10, color: muted, marginBottom: 5 }}>match</div>
                  <div style={{ width: 72, height: 4, background: bdr, borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${investor.matchScore}%`, background: matchColor, borderRadius: 999 }} />
                  </div>
                </div>

                {/* connect button */}
                <div style={{ flexShrink: 0 }}>
                  {investor.connectionStatus !== 'none' ? (
                    <ConnectionStatusBadge status={investor.connectionStatus} />
                  ) : (
                    <button
                      onClick={() => handleConnectClick(investor)}
                      disabled={isLocked}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "8px 16px",
                        background: isLocked ? surf : ink,
                        color: isLocked ? muted : bg,
                        border: `1px solid ${isLocked ? bdr : ink}`,
                        borderRadius: 999, fontSize: 12, fontWeight: 500,
                        cursor: isLocked ? "not-allowed" : "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Send style={{ height: 11, width: 11 }} />
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {/* divider */}
              <div style={{ height: 1, background: bdr, margin: "0 20px" }} />

              {/* metadata row */}
              <div style={{ padding: "10px 20px", display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Check size</span>
                  <div style={{ fontSize: 12, color: ink, fontWeight: 500, marginTop: 2 }}>{investor.checkSize}</div>
                </div>
                <div>
                  <span style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Focus</span>
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {investor.investmentFocus.slice(0, 3).map((f: string) => (
                      <span key={f} style={{ fontSize: 10, padding: "2px 7px", background: bg, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* thesis */}
              {investor.thesis && (
                <div style={{ padding: "0 20px 12px" }}>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, margin: 0,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {investor.thesis}
                  </p>
                </div>
              )}

              {/* AI rationale */}
              {!isLocked && (rationaleText || rationale === 'loading') && (
                <>
                  <div style={{ height: 1, background: bdr, margin: "0 20px" }} />
                  <div style={{ padding: "12px 20px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                      <Sparkles size={12} color={blue} strokeWidth={2} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", letterSpacing: "0.08em" }}>Why this match</span>
                    </div>
                    {rationale === 'loading' ? (
                      <p style={{ fontSize: 12, color: muted, margin: 0, fontStyle: "italic" }}>Analysing match…</p>
                    ) : (
                      <p style={{ fontSize: 12, color: ink, lineHeight: 1.65, margin: 0 }}>{rationaleText}</p>
                    )}
                  </div>
                </>
              )}
            </motion.div>
            )
          })}
          </div>

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
          startupOneLiner={`${founderStage.charAt(0).toUpperCase() + founderStage.slice(1)}-stage ${founderSector.toUpperCase()} startup seeking funding`}
          keyMetrics={[
            `Q-Score: ${founderQScore}/100`,
            `Stage: ${founderStage}`,
            `Sector: ${founderSector}`,
            `Match score: ${selectedInvestor.matchScore}%`,
          ]}
          matchReason={
            (rationaleMap[selectedInvestor.id] && rationaleMap[selectedInvestor.id] !== 'loading')
              ? rationaleMap[selectedInvestor.id] as string
              : `${selectedInvestor.name} invests in ${selectedInvestor.investmentFocus.slice(0, 2).join(' and ')} at ${selectedInvestor.firm}. Response rate: ${selectedInvestor.responseRate}%. Match score: ${selectedInvestor.matchScore}%.`
          }
        />
      )}

      {/* ── Investor profile modal ────────────────────────────────────── */}
      {profileInvestor && (
        <div
          onClick={() => setProfileInvestor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 520, background: bg, borderRadius: 16, border: `1px solid ${bdr}`, overflow: "hidden", boxShadow: "0 24px 64px rgba(0,0,0,0.12)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
          >
            {/* header */}
            <div style={{ padding: "22px 24px 18px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "flex-start", gap: 14 }}>
              {(() => {
                const mc = profileInvestor.matchScore >= 80 ? green : profileInvestor.matchScore >= 60 ? blue : amber
                const ini = profileInvestor.name.split(' ').map((n: string) => n[0] ?? '').join('').slice(0, 2).toUpperCase()
                return (
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `${mc}18`, border: `1.5px solid ${mc}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 700, color: mc, flexShrink: 0 }}>
                    {ini}
                  </div>
                )
              })()}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 17, fontWeight: 700, color: ink }}>{profileInvestor.name}</span>
                  {profileInvestor.type === 'real' && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "#DCFCE7", color: "#166534", letterSpacing: "0.05em" }}>LIVE</span>
                  )}
                </div>
                <p style={{ fontSize: 13, color: muted, marginTop: 2 }}>
                  {profileInvestor.title && `${profileInvestor.title} · `}{profileInvestor.firm}
                </p>
                {profileInvestor.location && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }}>
                    <MapPin size={11} color={muted} />
                    <span style={{ fontSize: 12, color: muted }}>{profileInvestor.location}</span>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 22, fontWeight: 700, color: profileInvestor.matchScore >= 80 ? green : profileInvestor.matchScore >= 60 ? blue : amber, lineHeight: 1 }}>{profileInvestor.matchScore}%</div>
                  <div style={{ fontSize: 10, color: muted }}>match</div>
                </div>
                <button onClick={() => setProfileInvestor(null)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* body */}
            <div style={{ padding: "18px 24px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 18 }}>
              {/* criteria grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div style={{ background: surf, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <DollarSign size={11} color={muted} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Check Size</span>
                  </div>
                  <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{profileInvestor.checkSize || '—'}</p>
                </div>
                <div style={{ background: surf, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                    <TrendingUp size={11} color={muted} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Stages</span>
                  </div>
                  <p style={{ fontSize: 13, color: ink, fontWeight: 500 }}>{profileInvestor.stages.length > 0 ? profileInvestor.stages.join(', ') : '—'}</p>
                </div>
              </div>

              {/* focus sectors */}
              {profileInvestor.investmentFocus.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
                    <Briefcase size={11} color={muted} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Focus Areas</span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {profileInvestor.investmentFocus.map((f: string) => (
                      <span key={f} style={{ fontSize: 12, padding: "4px 10px", background: `${blue}0D`, border: `1px solid ${blue}30`, borderRadius: 999, color: blue, fontWeight: 500 }}>{f}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* thesis */}
              {profileInvestor.thesis && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Investment Thesis</p>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.65, margin: 0 }}>{profileInvestor.thesis}</p>
                </div>
              )}

              {/* portfolio */}
              {profileInvestor.portfolio && profileInvestor.portfolio.length > 0 && (
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Portfolio</p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {profileInvestor.portfolio.map((p: string) => (
                      <span key={p} style={{ fontSize: 12, padding: "4px 10px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, color: muted }}>{p}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* response rate */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: surf, borderRadius: 10, border: `1px solid ${bdr}` }}>
                <span style={{ fontSize: 12, color: muted }}>Response rate</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: profileInvestor.responseRate >= 70 ? green : amber }}>{profileInvestor.responseRate}%</span>
              </div>
            </div>

            {/* footer */}
            <div style={{ padding: "14px 24px", borderTop: `1px solid ${bdr}`, display: "flex", gap: 10 }}>
              <button onClick={() => setProfileInvestor(null)} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", fontSize: 13, color: muted, cursor: "pointer", fontFamily: "inherit" }}>
                Close
              </button>
              {profileInvestor.connectionStatus === 'none' && !isLocked && (
                <button
                  onClick={() => { setProfileInvestor(null); handleConnectClick(profileInvestor); }}
                  style={{ flex: 2, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "10px", borderRadius: 8, border: "none", background: ink, color: bg, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
                >
                  <Send size={13} /> Connect with {profileInvestor.name.split(' ')[0]}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
