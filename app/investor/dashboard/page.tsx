"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  Users, Bell, Briefcase, TrendingUp, ArrowRight,
  MessageSquare, ChevronRight, Zap, Star, Clock, Plus,
} from "lucide-react"
import { motion } from "framer-motion"

import { bg, surf, bdr, ink, muted, blue, green, amber, alpha } from "@/lib/constants/colors"
import { PIPELINE_STAGE_COLORS } from "@/features/investor/constants/pipeline"
import { Avatar } from "@/features/shared/components/Avatar"
import { ScoreBadge } from "@/features/shared/components/Badge"
import { StatCard } from "@/features/shared/components/StatCard"
import { SectionCard } from "@/features/shared/components/SectionCard"
import { StatCardSkeleton, RowSkeleton } from "@/features/shared/components/Skeleton"
import { WelcomeModal, INVESTOR_WELCOME_SLIDES } from "@/components/ui/WelcomeModal"

// ─── types ────────────────────────────────────────────────────────────────────
interface DashboardData {
  investorName: string
  firmName: string
  subscriptionTier: string
  pipeline: PipelineRow[]
  pipelineTotal: number
  pendingRequests: number
  unreadMessages: number
  topFounders: TopFounder[]
  dealFlowTotal: number
  highSignalCount: number
  portfolioCount: number
  inDDCount: number
  meetingCount: number
  recentPipeline: RecentEntry[]
}

interface PipelineRow { stage: string; count: number }

interface TopFounder {
  id: string
  name: string
  sector: string
  stage: string
  qScore: number
  tagline?: string
  matchScore?: number
  companyLogoUrl?: string | null
  avatarUrl?: string | null
}

interface RecentEntry {
  id: string
  founder_user_id: string
  stage: string
  updated_at: string
  profile: {
    startup_name: string
    industry: string
    qScore: number
    companyLogoUrl?: string | null
    avatarUrl?: string | null
  } | null
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const STAGE_ORDER = ["watching", "meeting", "in_dd", "portfolio", "passed"]

function getGreeting(name?: string) {
  const h = new Date().getHours()
  const s = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
  const first = name?.split(" ")[0]
  return first ? `${s}, ${first}.` : `${s}.`
}

function timeLabel() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return "today"
  if (d === 1) return "yesterday"
  if (d < 7) return `${d}d ago`
  return `${Math.floor(d / 7)}w ago`
}

// ─── section header ───────────────────────────────────────────────────────────
function SectionHeader({ title, href, linkLabel = "View all" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <h2 style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>{title}</h2>
      {href && (
        <Link href={href} style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 600, display: "flex", alignItems: "center", gap: 3 }}>
          {linkLabel} <ArrowRight style={{ width: 10, height: 10 }} />
        </Link>
      )}
    </div>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function InvestorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'pending' | 'verified' | 'rejected' | null>(null)

  useEffect(() => {
    async function load() {
      try {
        // Single consolidated call replaces 4 separate endpoints (profile, pipeline, unread, billing)
        // Deal-flow stays separate — it has its own 5-min cache and is the heaviest query
        const [dashRes, dealRes] = await Promise.allSettled([
          fetch("/api/investor/dashboard").then(r => r.json()),
          fetch("/api/investor/deal-flow").then(r => r.json()),
        ])

        const dash     = dashRes.status  === "fulfilled" ? dashRes.value   : {}
        const deal     = dealRes.status  === "fulfilled" ? dealRes.value   : { founders: [] }

        const profile  = (dash as Record<string, unknown>).profile ?? null
        const pipeResp = { pipeline: (dash as Record<string, unknown>).pipeline ?? [], pipelineMap: (dash as Record<string, unknown>).pipelineMap ?? {} }
        const pipeline = (pipeResp.pipeline ?? []) as Array<{ founder_user_id: string; stage: string; updated_at: string; id: string; notes: string | null }>
        const unread   = { unreadMessages: (dash as Record<string, unknown>).unreadMessages ?? 0, pendingRequests: (dash as Record<string, unknown>).pendingRequests ?? 0 }
        const billing  = { subscriptionTier: (dash as Record<string, unknown>).subscriptionTier ?? "free" }
        const verif = (profile as Record<string, unknown> | null)?.verification_status as string | undefined
        if (verif === 'pending' || verif === 'verified' || verif === 'rejected') {
          setVerificationStatus(verif)
        }

        // Build founder map from deal-flow
        type DealFounder = {
          id: string; name: string; sector: string; stage: string; qScore: number
          tagline?: string; matchScore?: number
          companyLogoUrl?: string | null; avatarUrl?: string | null; hasScore?: boolean
          weightedQScore?: number
        }
        const allFounders = (deal.founders ?? []) as DealFounder[]
        const founderMap = new Map<string, DealFounder>()
        for (const f of allFounders) founderMap.set(f.id, f)

        // Stage counts
        const stageCounts: Record<string, number> = {}
        for (const row of pipeline) {
          stageCounts[row.stage] = (stageCounts[row.stage] ?? 0) + 1
        }
        const stageRows = STAGE_ORDER
          .map(stage => ({ stage, count: stageCounts[stage] ?? 0 }))
          .filter(r => r.count > 0)

        // Top 6 founders by match/q-score
        const topFounders = allFounders
          .slice(0, 6)
          .map(f => ({
            id: f.id, name: f.name, sector: f.sector, stage: f.stage,
            qScore: f.qScore, tagline: f.tagline, matchScore: f.matchScore,
            companyLogoUrl: f.companyLogoUrl ?? null, avatarUrl: f.avatarUrl ?? null,
          }))

        // Recent pipeline entries (last 5 updated)
        const sortedPipeline = [...pipeline].sort((a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        ).slice(0, 5)

        const recentPipeline: RecentEntry[] = sortedPipeline.map(e => {
          const f = founderMap.get(e.founder_user_id)
          return {
            id: e.id,
            founder_user_id: e.founder_user_id,
            stage: e.stage,
            updated_at: e.updated_at,
            profile: f ? {
              startup_name: f.name,
              industry: f.sector,
              qScore: f.qScore,
              companyLogoUrl: f.companyLogoUrl ?? null,
              avatarUrl: f.avatarUrl ?? null,
            } : null,
          }
        })

        const profileData = profile as { full_name?: string; firm_name?: string } | null
        const billingData = billing as { subscriptionTier?: string }
        const unreadData  = unread  as { unreadMessages?: number; pendingRequests?: number }
        setData({
          investorName:    profileData?.full_name ?? "",
          firmName:        profileData?.firm_name ?? "",
          subscriptionTier: billingData.subscriptionTier        ?? "free",
          pipeline:        stageRows,
          pipelineTotal:   pipeline.length,
          pendingRequests: unreadData.pendingRequests            ?? 0,
          unreadMessages:  unreadData.unreadMessages             ?? 0,
          topFounders,
          dealFlowTotal:   allFounders.length,
          highSignalCount: allFounders.filter(f => (f.weightedQScore ?? f.qScore) >= 60 && f.hasScore).length,
          portfolioCount:  stageCounts["portfolio"] ?? 0,
          inDDCount:       stageCounts["in_dd"]     ?? 0,
          meetingCount:    stageCounts["meeting"]   ?? 0,
          recentPipeline,
        })
      } catch {
        setData(null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, padding: "32px 28px 80px" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto" }}>
          {/* Header skeleton */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ width: 80, height: 10, borderRadius: 4, background: "#E2DDD5", marginBottom: 10 }} />
            <div style={{ width: 260, height: 28, borderRadius: 6, background: "#E2DDD5" }} />
          </div>
          {/* Stat cards skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 28 }}>
            {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          {/* Main content skeleton */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
            <div style={{ background: "#F0EDE6", border: "1px solid #E2DDD5", borderRadius: 14, overflow: "hidden" }}>
              {[...Array(5)].map((_, i) => <RowSkeleton key={i} />)}
            </div>
            <div style={{ background: "#F0EDE6", border: "1px solid #E2DDD5", borderRadius: 14, overflow: "hidden" }}>
              {[...Array(4)].map((_, i) => <RowSkeleton key={i} withAvatar={false} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const d = data ?? {
    investorName: "", firmName: "", subscriptionTier: "free",
    pipeline: [], pipelineTotal: 0, pendingRequests: 0,
    unreadMessages: 0, topFounders: [], dealFlowTotal: 0,
    highSignalCount: 0, portfolioCount: 0, inDDCount: 0, meetingCount: 0,
    recentPipeline: [],
  }

  const activeInPipeline = d.pipelineTotal - (d.pipeline.find(r => r.stage === "passed")?.count ?? 0)
  const maxStageCount = Math.max(...d.pipeline.map(r => r.count), 1)

  return (
    <div style={{ minHeight: "100vh", background: bg, padding: "32px 28px 80px" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto" }}>

        {/* ── Header ───────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 4, fontFamily: "inherit" }}>
            {timeLabel()}
          </p>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 400, fontFamily: "var(--font-display)", letterSpacing: "-0.02em", color: ink, margin: 0 }}>
              {getGreeting(d.investorName)}
            </h1>
            {d.firmName && (
              <span style={{ fontSize: 12, color: muted, fontFamily: "inherit" }}>{d.firmName}</span>
            )}
          </div>
        </motion.div>

        {/* ── Stat row ─────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12, marginBottom: 28 }}>
          {[
            { icon: Briefcase, label: "Active pipeline", color: blue, value: activeInPipeline, sub: activeInPipeline === 0 ? "Browse deal flow →" : `${d.portfolioCount} portfolio · ${d.inDDCount} in DD · ${d.meetingCount} meetings`, href: "/investor/pipeline" },
            { icon: Star, label: "High-signal founders", color: green, value: d.highSignalCount, sub: d.highSignalCount === 0 ? "Adjust your criteria →" : "Q-Score ≥ 60 in deal flow", href: "/investor/deal-flow" },
            { icon: Users, label: "Pending connections", color: PIPELINE_STAGE_COLORS.in_dd.color, value: d.pendingRequests, sub: d.pendingRequests === 0 ? "Explore founders →" : "awaiting your review", href: "/investor/connections" },
            { icon: MessageSquare, label: "Unread messages", color: amber, value: d.unreadMessages, sub: d.unreadMessages === 0 ? "No messages yet" : "from founders", href: "/investor/messages" },
            { icon: TrendingUp, label: "Deal flow", color: ink, value: d.dealFlowTotal, sub: "founders available", href: "/investor/deal-flow" },
          ].map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 + i * 0.07 }}
            >
              <StatCard icon={card.icon} label={card.label} color={card.color} value={card.value} sub={card.sub} href={card.href} />
            </motion.div>
          ))}
        </div>

        {/* ── Q-Score distribution chart ───────────────────────────────── */}
        {d.topFounders.length > 0 && (() => {
          const bands = [
            { range: "0–30",  color: "#EF4444", bg: "#FEF2F2", count: d.topFounders.filter(f => f.qScore < 30).length },
            { range: "30–50", color: "#F59E0B", bg: "#FFFBEB", count: d.topFounders.filter(f => f.qScore >= 30 && f.qScore < 50).length },
            { range: "50–70", color: "#3B82F6", bg: "#EFF6FF", count: d.topFounders.filter(f => f.qScore >= 50 && f.qScore < 70).length },
            { range: "70–85", color: "#10B981", bg: "#F0FDF4", count: d.topFounders.filter(f => f.qScore >= 70 && f.qScore < 85).length },
            { range: "85+",   color: "#065F46", bg: "#ECFDF5", count: d.topFounders.filter(f => f.qScore >= 85).length },
          ]
          const maxCount = Math.max(...bands.map(b => b.count), 1)
          return (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55 }}
              style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 14, padding: "20px 24px 20px", marginBottom: 20 }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, margin: 0 }}>Q-Score Distribution</p>
                  <p style={{ fontSize: 11, color: muted, marginTop: 3, margin: 0 }}>
                    Top {d.topFounders.length} founders in your deal flow
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: green, display: "block", lineHeight: 1 }}>
                    {d.highSignalCount}
                  </span>
                  <span style={{ fontSize: 10, color: muted }}>high-signal (≥60)</span>
                </div>
              </div>

              {/* bars */}
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end", height: 100 }}>
                {bands.map(band => {
                  const pct = maxCount > 0 ? (band.count / maxCount) * 100 : 0
                  return (
                    <div key={band.range} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: band.count > 0 ? band.color : "#D1D5DB",
                        minHeight: 20, display: "flex", alignItems: "flex-end",
                      }}>
                        {band.count > 0 ? band.count : "—"}
                      </span>
                      <div style={{ width: "100%", flex: 1, display: "flex", alignItems: "flex-end", minHeight: 40 }}>
                        <div style={{
                          width: "100%",
                          height: `${Math.max(pct, band.count > 0 ? 8 : 0)}%`,
                          background: band.count > 0 ? band.color : "#F3F4F6",
                          borderRadius: "6px 6px 3px 3px",
                          minHeight: band.count > 0 ? 6 : 0,
                          transition: "height 0.4s ease",
                        }} />
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* x-axis labels */}
              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                {bands.map(band => (
                  <div key={band.range} style={{ flex: 1, textAlign: "center" }}>
                    <span style={{
                      fontSize: 10, fontWeight: 500,
                      color: band.count > 0 ? band.color : muted,
                      background: band.count > 0 ? band.bg : "transparent",
                      padding: "2px 4px", borderRadius: 4,
                    }}>
                      {band.range}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })()}

        {/* ── Upgrade banner (free tier only) ─────────────────────────── */}
        {d.subscriptionTier === 'free' && (
          <div style={{ padding: '12px 18px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Zap style={{ height: 14, width: 14, color: blue, flexShrink: 0 }} />
              <span style={{ fontSize: 13, color: blue, fontWeight: 500 }}>Upgrade to Pro to unlock deal flow, AI analysis, and founder deep-dives — $99/month</span>
            </div>
            <a href="/investor/billing" style={{ padding: '7px 16px', borderRadius: 8, background: blue, color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Upgrade</a>
          </div>
        )}

        {/* ── Main grid ────────────────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 300px", gap: 18, alignItems: "start" }}>

          {/* ── Top founder matches ───────────────────────────────────── */}
          <SectionCard
            style={{ gridColumn: "1 / 3" }}
            title=""
            action={<SectionHeader title="Top matches for you" href="/investor/deal-flow" />}
            noPadding
          >
            {d.topFounders.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p style={{ fontSize: 13, color: muted, marginBottom: 16, fontFamily: "inherit" }}>
                  No founders yet — they appear here as founders complete onboarding.
                </p>
                <Link href="/investor/deal-flow" style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 20px",
                  background: ink, color: bg, borderRadius: 999, textDecoration: "none",
                  fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                }}>
                  <Plus style={{ width: 12, height: 12 }} /> Browse Deal Flow
                </Link>
              </div>
            ) : (
              <div>
                {d.topFounders.map((f, i) => (
                  <Link
                    key={f.id}
                    href={`/investor/startup/${f.id}`}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <div style={{
                      padding: "13px 20px",
                      borderBottom: i < d.topFounders.length - 1 ? `1px solid ${bdr}` : "none",
                      display: "flex", alignItems: "center", gap: 12,
                      transition: "background 0.12s",
                    }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${blue}05`)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <Avatar url={f.companyLogoUrl ?? f.avatarUrl ?? null} name={f.name} size={38} radius={9} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                            {f.name}
                          </span>
                          {f.qScore > 0 && <ScoreBadge score={f.qScore} />}
                          {f.matchScore && f.matchScore >= 80 && (
                            <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 6px", borderRadius: 999, background: "#F0FDF4", color: "#166534", fontFamily: "inherit" }}>
                              {f.matchScore}% match
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 11, color: muted, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                          {[f.sector, f.stage].filter(Boolean).join(" · ")}
                          {f.tagline ? ` — ${f.tagline}` : ""}
                        </p>
                      </div>
                      <ChevronRight style={{ width: 13, height: 13, color: muted, flexShrink: 0 }} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>

          {/* ── Right column ──────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* Pipeline breakdown */}
            <SectionCard
              title=""
              action={<SectionHeader title="Pipeline stages" href="/investor/pipeline" linkLabel="Manage" />}
              noPadding
              bodyStyle={{ padding: "10px 0" }}
            >
              {d.pipeline.length === 0 ? (
                <div style={{ padding: "16px 18px", textAlign: "center" }}>
                  <p style={{ fontSize: 12, color: muted, margin: "0 0 10px" }}>No companies tracked yet</p>
                  <Link href="/investor/deal-flow" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 600 }}>
                    Browse deal flow →
                  </Link>
                </div>
              ) : (
                STAGE_ORDER.map(stage => {
                  const row = d.pipeline.find(r => r.stage === stage)
                  if (!row || row.count === 0) return null
                  const sc = PIPELINE_STAGE_COLORS[stage as keyof typeof PIPELINE_STAGE_COLORS]
                  const stageColor = sc?.color ?? muted
                  const stageLabel = sc?.label ?? stage
                  return (
                    <div key={stage} style={{ padding: "8px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ width: 7, height: 7, borderRadius: "50%", background: stageColor, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: ink, flex: 1 }}>{stageLabel}</span>
                      <div style={{ width: 52, height: 4, borderRadius: 99, background: bdr, overflow: "hidden" }}>
                        <div style={{ width: `${(row.count / maxStageCount) * 100}%`, height: "100%", background: stageColor, borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: ink, minWidth: 14, textAlign: "right" }}>{row.count}</span>
                    </div>
                  )
                })
              )}
            </SectionCard>

            {/* Quick actions */}
            <SectionCard title="Quick actions">
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[
                  { href: "/investor/deal-flow",   icon: TrendingUp,    label: "Browse deal flow",        color: blue   },
                  { href: "/investor/pipeline",    icon: Briefcase,     label: "Manage pipeline",          color: green  },
                  { href: "/investor/connections", icon: Users,         label: "Review connections",       color: PIPELINE_STAGE_COLORS.in_dd.color },
                  { href: "/investor/messages",    icon: MessageSquare, label: "Open messages",            color: amber  },
                  { href: "/investor/settings",    icon: Zap,           label: "Investment preferences",   color: muted  },
                ].map(item => (
                  <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 9,
                      padding: "8px 10px", borderRadius: 8,
                      transition: "background 0.12s", cursor: "pointer",
                    }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = surf)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <item.icon style={{ width: 14, height: 14, color: item.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: ink, fontFamily: "inherit" }}>{item.label}</span>
                      <ChevronRight style={{ width: 11, height: 11, color: muted, marginLeft: "auto" }} />
                    </div>
                  </Link>
                ))}
              </div>
            </SectionCard>
          </div>
        </div>

        {/* ── Recent pipeline activity ─────────────────────────────────── */}
        {d.recentPipeline.length > 0 && (
          <SectionCard
            style={{ marginTop: 18 }}
            title=""
            action={<SectionHeader title="Recently tracked" href="/investor/pipeline" linkLabel="See pipeline" />}
            noPadding
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 0 }}>
              {d.recentPipeline.map((entry, i) => {
                const sc2 = PIPELINE_STAGE_COLORS[entry.stage as keyof typeof PIPELINE_STAGE_COLORS]
                const stageDot = sc2?.color ?? muted
                const stageLabel = sc2?.label ?? entry.stage
                const p = entry.profile
                return (
                  <Link key={entry.id} href={`/investor/startup/${entry.founder_user_id}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "14px 20px",
                      borderRight: (i + 1) % 4 !== 0 ? `1px solid ${bdr}` : "none",
                      borderBottom: `1px solid ${bdr}`,
                      display: "flex", alignItems: "center", gap: 10,
                      transition: "background 0.12s",
                    }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = `${blue}04`)}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                    >
                      <Avatar url={p?.companyLogoUrl ?? p?.avatarUrl ?? null} name={p?.startup_name ?? "?"} size={32} radius={8} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: ink, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "inherit" }}>
                          {p?.startup_name ?? "Unknown"}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: stageDot, flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: muted, fontFamily: "inherit" }}>{stageLabel}</span>
                          <span style={{ fontSize: 10, color: muted, fontFamily: "inherit" }}>·</span>
                          <Clock style={{ width: 9, height: 9, color: muted }} />
                          <span style={{ fontSize: 10, color: muted, fontFamily: "inherit" }}>{timeAgo(entry.updated_at)}</span>
                        </div>
                      </div>
                      {(p?.qScore ?? 0) > 0 && <ScoreBadge score={p!.qScore} />}
                    </div>
                  </Link>
                )
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Verification status banner ─────────────────────────────────── */}
        {verificationStatus === 'pending' && (
          <div style={{
            marginTop: 18, padding: "14px 20px",
            background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Clock style={{ width: 16, height: 16, color: "#D97706", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#92400E", margin: 0 }}>Profile under review</p>
              <p style={{ fontSize: 12, color: "#B45309", margin: "2px 0 0" }}>
                We verify all investors to ensure quality matching. This typically takes 24–48 hours. You can browse deal flow in the meantime.
              </p>
            </div>
          </div>
        )}
        {verificationStatus === 'rejected' && (
          <div style={{
            marginTop: 18, padding: "14px 20px",
            background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 12,
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <Bell style={{ width: 16, height: 16, color: "#DC2626", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#991B1B", margin: 0 }}>Verification unsuccessful</p>
              <p style={{ fontSize: 12, color: "#B91C1C", margin: "2px 0 0" }}>
                We were unable to verify your investor profile. Please contact support to resolve this.
              </p>
            </div>
          </div>
        )}

        {/* ── Notifications banner (pending requests) ───────────────────── */}
        {d.pendingRequests > 0 && (
          <Link href="/investor/connections" style={{ textDecoration: "none" }}>
            <div style={{
              marginTop: 18, padding: "14px 20px",
              background: alpha(blue, 0.06), border: `1px solid ${alpha(blue, 0.25)}`, borderRadius: 12,
              display: "flex", alignItems: "center", gap: 12,
              transition: "box-shadow 0.15s",
            }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.boxShadow = `0 4px 12px ${alpha(blue, 0.12)}`)}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = "none")}
            >
              <Bell style={{ width: 16, height: 16, color: blue, flexShrink: 0 }} />
              <p style={{ flex: 1, fontSize: 13, color: blue, margin: 0 }}>
                <strong>{d.pendingRequests} founder{d.pendingRequests !== 1 ? "s" : ""}</strong> have requested a connection — view and respond to their profiles.
              </p>
              <ChevronRight style={{ width: 14, height: 14, color: blue, flexShrink: 0 }} />
            </div>
          </Link>
        )}

      </div>

      <WelcomeModal
        storageKey="qc_investor_welcome_v1"
        slides={INVESTOR_WELCOME_SLIDES}
      />
    </div>
  )
}
