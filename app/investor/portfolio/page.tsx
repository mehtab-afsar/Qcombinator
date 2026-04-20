"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, ArrowUpRight, ChevronRight, AlertCircle, CheckCircle,
  RefreshCw, Users, Check, X, MessageSquare, Clock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { ScoreBadge } from '@/features/shared/components/Badge'

// ─── portfolio types ──────────────────────────────────────────────────────────
interface Company {
  id: string;
  name: string;
  sector: string;
  stage: string;
  founderName: string;
  description: string;
  qScore: number;
  qScoreBreakdown: { team: number; market: number; traction: number; gtm: number; product: number };
  health: "excellent" | "good" | "concern" | "critical";
  connectedAt: string;
  metrics: { revenue: string; growth: string; burnRate: string; runway: string };
  companyLogoUrl?: string | null;
  avatarUrl?: string | null;
}

// ─── connection request types ─────────────────────────────────────────────────
type ReqStatus = 'pending' | 'viewed' | 'accepted' | 'declined' | 'meeting_scheduled';

interface ConnectionRequest {
  id: string;
  founderId: string;
  founderName: string;
  startupName: string;
  industry: string;
  stage: string;
  tagline: string;
  qScore: number;
  qScorePercentile: number;
  qScoreBreakdown: { market: number; product: number; goToMarket: number; financial: number; team: number; traction: number };
  status: ReqStatus;
  personalMessage?: string;
  requestedDate: string;
  avatarUrl: string | null;
  companyLogoUrl: string | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function healthStyle(h: Company["health"]) {
  if (h === "excellent") return { color: green, label: "Strong",   Icon: CheckCircle }
  if (h === "good")      return { color: blue,  label: "Good",     Icon: CheckCircle }
  if (h === "concern")   return { color: amber, label: "Watch",    Icon: AlertCircle }
  return                        { color: red,   label: "Critical", Icon: AlertCircle }
}

function relativeDate(iso: string) {
  const diff  = Date.now() - new Date(iso).getTime();
  const days  = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30)  return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

function scoreColor(s: number) { return s >= 70 ? green : s >= 50 ? amber : red; }

// ─── decline modal ────────────────────────────────────────────────────────────
const DECLINE_REASONS = [
  "Outside our investment thesis", "Stage too early", "Stage too late",
  "Sector not a fit", "Q-Score too low", "Already have a similar portfolio company",
  "Not raising / timing", "Other",
];

function DeclineModal({ founderName, onConfirm, onCancel, loading }: {
  founderName: string;
  onConfirm: (reasons: string[], text: string) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [text, setText] = useState("");
  const toggle = (r: string) =>
    setReasons(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  return (
    <>
      <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 59, background: "rgba(0,0,0,0.22)" }} />
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 60, width: 460, background: bg, border: `1px solid ${bdr}`,
        borderRadius: 14, padding: "28px", boxShadow: "0 20px 60px rgba(0,0,0,0.14)",
      }}>
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>Decline request</p>
        <h2 style={{ fontSize: "1.3rem", fontWeight: 300, letterSpacing: "-0.02em", color: ink, marginBottom: 6 }}>
          Passing on {founderName}?
        </h2>
        <p style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
          Optionally share why — this helps founders improve.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {DECLINE_REASONS.map(r => (
            <button key={r} onClick={() => toggle(r)} style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12,
              cursor: "pointer",
              border: `1px solid ${reasons.includes(r) ? ink : bdr}`,
              background: reasons.includes(r) ? ink : "transparent",
              color: reasons.includes(r) ? bg : muted,
              transition: "all 0.12s",
            }}>{r}</button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Additional notes (optional)…"
          style={{
            width: "100%", minHeight: 70, padding: "10px 12px",
            border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink,
            resize: "none", outline: "none", background: surf, boxSizing: "border-box",
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{
            padding: "8px 18px", borderRadius: 8, fontSize: 13,
            background: "transparent", border: `1px solid ${bdr}`, cursor: "pointer", color: muted,
          }}>Cancel</button>
          <button onClick={() => onConfirm(reasons, text)} disabled={loading} style={{
            padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: ink, color: bg, border: "none",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
          }}>{loading ? "Declining…" : "Decline"}</button>
        </div>
      </div>
    </>
  );
}

// ─── request row ─────────────────────────────────────────────────────────────
const DIM_LABELS: [keyof ConnectionRequest['qScoreBreakdown'], string][] = [
  ['market', 'Market'], ['product', 'Product'], ['goToMarket', 'GTM'],
  ['financial', 'Financial'], ['team', 'Team'], ['traction', 'Traction'],
];

function RequestRow({ req, onAccept, onDecline, actionLoading, showDeclined }: {
  req: ConnectionRequest;
  onAccept: (id: string) => void;
  onDecline: (req: ConnectionRequest) => void;
  actionLoading: string | null;
  showDeclined?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = req.status === 'pending' || req.status === 'viewed';
  const busy = actionLoading === req.id;

  return (
    <div style={{
      borderBottom: `1px solid ${bdr}`,
      opacity: req.status === 'declined' ? 0.65 : 1,
      transition: "background 0.1s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${bdr}25`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px" }}>
        <Avatar url={req.companyLogoUrl ?? req.avatarUrl ?? null} name={req.startupName} size={36} radius={8} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {req.startupName}
            </span>
            {req.qScore > 0 && <ScoreBadge score={req.qScore} />}
            {showDeclined && (
              <span style={{ fontSize: 10, color: red, padding: "1px 6px", borderRadius: 5, border: `1px solid ${red}22`, background: `${red}0e` }}>
                Declined
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: muted, margin: 0 }}>
            <strong style={{ color: ink, fontWeight: 500 }}>{req.founderName}</strong>
            {req.industry ? ` · ${req.industry}` : ""}
            {req.stage ? ` · ${req.stage}` : ""}
          </p>
          {req.tagline && (
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>
              {req.tagline}
            </p>
          )}
        </div>

        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3, color: muted, marginBottom: 2, justifyContent: "flex-end" }}>
            <Clock style={{ width: 10, height: 10 }} />
            <span style={{ fontSize: 11 }}>{timeAgo(req.requestedDate)}</span>
          </div>
          {req.qScorePercentile > 0 && (
            <span style={{ fontSize: 10, color: muted }}>top {100 - req.qScorePercentile}%</span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <Link href={`/investor/startup/${req.founderId}`} style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            fontSize: 12, color: muted, textDecoration: "none", fontWeight: 500,
          }}>
            View <ChevronRight style={{ width: 11, height: 11 }} />
          </Link>

          {isPending && (
            <>
              <button onClick={() => onDecline(req)} disabled={busy} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 11px", borderRadius: 7, fontSize: 12,
                background: "transparent", border: `1px solid ${bdr}`, color: muted,
                cursor: "pointer", opacity: busy ? 0.5 : 1,
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = red; (e.currentTarget as HTMLElement).style.color = red; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr; (e.currentTarget as HTMLElement).style.color = muted; }}
              >
                <X style={{ width: 11, height: 11 }} /> Decline
              </button>
              <button onClick={() => onAccept(req.id)} disabled={busy} style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                padding: "6px 13px", borderRadius: 7, fontSize: 12, fontWeight: 500,
                background: ink, border: "none", color: bg,
                cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.5 : 1,
              }}>
                {busy
                  ? <RefreshCw style={{ width: 11, height: 11, animation: "spin 1s linear infinite" }} />
                  : <Check style={{ width: 11, height: 11 }} />}
                Accept
              </button>
            </>
          )}

          {req.qScore > 0 && (
            <button onClick={() => setExpanded(v => !v)} style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "6px 10px", borderRadius: 7, fontSize: 12,
              background: "transparent", border: `1px solid ${expanded ? ink : bdr}`,
              color: expanded ? ink : muted, cursor: "pointer", transition: "all 0.12s",
            }}>
              <TrendingUp style={{ width: 11, height: 11 }} />
            </button>
          )}
        </div>
      </div>

      {req.personalMessage && (
        <div style={{ margin: "0 16px 12px", padding: "10px 14px", background: `${bdr}30`, borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <MessageSquare style={{ width: 12, height: 12, color: muted, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: ink, margin: 0, lineHeight: 1.6 }}>
              &quot;{req.personalMessage}&quot;
            </p>
          </div>
        </div>
      )}

      {expanded && req.qScore > 0 && (
        <div style={{ padding: "14px 16px", borderTop: `1px solid ${bdr}`, background: `${bdr}18` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 10 }}>
            Q-Score breakdown
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            {DIM_LABELS.map(([key, label]) => {
              const val = req.qScoreBreakdown[key];
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: muted }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: scoreColor(val) }}>{val}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: bdr, overflow: "hidden" }}>
                    <div style={{ width: `${val}%`, height: "100%", background: scoreColor(val) }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function PortfolioPage() {
  const router = useRouter();

  // portfolio state
  const [companies,    setCompanies]    = useState<Company[]>([]);
  const [loadingPort,  setLoadingPort]  = useState(true);
  const [expandedId,   setExpandedId]   = useState<string | null>(null);

  // connections state
  const [requests,     setRequests]     = useState<ConnectionRequest[]>([]);
  const [loadingReqs,  setLoadingReqs]  = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<ConnectionRequest | null>(null);
  const [declineBusy,   setDeclineBusy]   = useState(false);

  // shared
  const [tab,    setTab]    = useState<'requests' | 'connected' | 'declined'>('requests');
  const [toast,  setToast]  = useState<{ msg: string; ok: boolean } | null>(null);

  const loadPortfolio = useCallback(async () => {
    setLoadingPort(true);
    try {
      const d = await fetch("/api/investor/portfolio").then(r => r.json());
      if (d.companies) setCompanies(d.companies);
    } catch { /* ignore */ }
    finally { setLoadingPort(false); }
  }, []);

  const loadRequests = useCallback(async () => {
    setLoadingReqs(true);
    try {
      const d = await fetch("/api/investor/connections").then(r => r.json());
      setRequests(d.requests ?? []);
    } catch { setRequests([]); }
    finally { setLoadingReqs(false); }
  }, []);

  useEffect(() => {
    loadPortfolio();
    loadRequests();
  }, [loadPortfolio, loadRequests]);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  async function handleAccept(requestId: string) {
    setActionLoading(requestId);
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action: 'accept' }),
      });
      if (!res.ok) throw new Error();
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'meeting_scheduled' as ReqStatus } : r));
      showToast('Connection accepted — the founder will be notified.', true);
      loadPortfolio(); // refresh portfolio list
    } catch { showToast('Failed to accept. Please try again.', false); }
    finally { setActionLoading(null); }
  }

  async function handleDeclineConfirm(reasons: string[], text: string) {
    if (!declineTarget) return;
    setDeclineBusy(true);
    try {
      const res = await fetch('/api/investor/connections', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: declineTarget.id, action: 'decline', feedback: { reasons, text } }),
      });
      if (!res.ok) throw new Error();
      setRequests(prev => prev.map(r => r.id === declineTarget.id ? { ...r, status: 'declined' as ReqStatus } : r));
      showToast('Request declined.', true);
    } catch { showToast('Failed to decline. Please try again.', false); }
    finally { setDeclineBusy(false); setDeclineTarget(null); }
  }

  // derived counts
  const pendingCount  = requests.filter(r => r.status === 'pending' || r.status === 'viewed').length;
  const declinedCount = requests.filter(r => r.status === 'declined').length;

  // portfolio stats
  const avgQScore   = companies.length ? Math.round(companies.reduce((s, c) => s + c.qScore, 0) / companies.length) : 0;
  const strongCount = companies.filter(c => c.qScore >= 60).length;

  const loading = loadingPort && loadingReqs;

  const tabs = [
    { key: 'requests'  as const, label: `Requests (${pendingCount})`    },
    { key: 'connected' as const, label: `Connected (${companies.length})` },
    { key: 'declined'  as const, label: `Declined (${declinedCount})`   },
  ];

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ fontSize: 13, color: muted }}>Loading…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 28px 72px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 6 }}>
              Investor · Portfolio
            </p>
            <h1 style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 4 }}>
              Your connections.
            </h1>
            <p style={{ fontSize: 13, color: muted }}>Manage incoming requests and founders you&apos;ve connected with.</p>
          </div>
        </div>

        {/* stats strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
          {[
            { label: "Connected",   value: companies.length, accent: ink   },
            { label: "Avg Q-Score", value: avgQScore || "—", accent: blue  },
            { label: "High Q (60+)",value: strongCount,      accent: green },
            { label: "Pending",     value: pendingCount,     accent: amber },
          ].map((s, i) => (
            <div key={i} style={{ background: bg, padding: "18px 20px" }}>
              <p style={{ fontSize: 24, fontWeight: 300, color: s.accent, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 5 }}>{s.value}</p>
              <p style={{ fontSize: 11, color: muted }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
              background: "transparent", border: "none",
              borderBottom: tab === t.key ? `2px solid ${ink}` : "2px solid transparent",
              color: tab === t.key ? ink : muted,
              marginBottom: -1, transition: "all 0.15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Requests tab ── */}
        {tab === 'requests' && (
          <>
            {pendingCount === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 20px", border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
                <Users style={{ height: 28, width: 28, color: muted, margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, fontWeight: 300, color: ink, marginBottom: 6 }}>No pending requests</p>
                <p style={{ fontSize: 13, color: muted }}>Founders will appear here when they request to connect.</p>
              </div>
            ) : (
              <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                {requests
                  .filter(r => r.status === 'pending' || r.status === 'viewed')
                  .map(req => (
                    <RequestRow
                      key={req.id}
                      req={req}
                      onAccept={handleAccept}
                      onDecline={r => setDeclineTarget(r)}
                      actionLoading={actionLoading}
                    />
                  ))}
              </div>
            )}
          </>
        )}

        {/* ── Connected tab ── */}
        {tab === 'connected' && (
          <>
            {companies.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 24px", border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
                <Users style={{ height: 28, width: 28, color: muted, margin: "0 auto 12px" }} />
                <p style={{ fontSize: 14, fontWeight: 300, color: ink, marginBottom: 6 }}>No connections yet</p>
                <p style={{ fontSize: 13, color: muted, marginBottom: 20 }}>
                  Accept requests to build your network here.
                </p>
                <button onClick={() => setTab('requests')} style={{
                  padding: "9px 20px", borderRadius: 8, border: "none",
                  background: ink, color: bg, fontSize: 13, cursor: "pointer",
                }}>
                  View Requests
                </button>
              </div>
            ) : (
              <>
                {/* table header */}
                <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 90px 90px 44px", gap: 8, padding: "10px 16px", borderBottom: `1px solid ${bdr}`, borderLeft: `1px solid ${bdr}`, borderRight: `1px solid ${bdr}` }}>
                  {["Company", "Q-Score", "Stage", "Connected", ""].map((h, i) => (
                    <p key={i} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600, margin: 0 }}>{h}</p>
                  ))}
                </div>
                <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                  {companies.map((company, i) => {
                    const hs     = healthStyle(company.health);
                    const HIcon  = hs.Icon;
                    const isOpen = expandedId === company.id;
                    const initials = company.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

                    return (
                      <motion.div
                        key={company.id}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        style={{ borderBottom: i < companies.length - 1 ? `1px solid ${bdr}` : "none", background: isOpen ? surf : bg }}
                        onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = surf; }}
                        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = bg; }}
                      >
                        <div
                          style={{ display: "grid", gridTemplateColumns: "2fr 80px 90px 90px 44px", gap: 8, padding: "14px 16px", alignItems: "center", cursor: "pointer" }}
                          onClick={() => setExpandedId(isOpen ? null : company.id)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                            {company.companyLogoUrl || company.avatarUrl ? (
                              <Avatar url={company.companyLogoUrl ?? company.avatarUrl ?? null} name={company.name} size={36} radius={8} />
                            ) : (
                              <div style={{ height: 36, width: 36, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: ink, flexShrink: 0 }}>
                                {initials}
                              </div>
                            )}
                            <div style={{ minWidth: 0 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>{company.name}</p>
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <HIcon style={{ height: 10, width: 10, color: hs.color }} />
                                <span style={{ fontSize: 11, color: hs.color }}>{hs.label}</span>
                                <span style={{ fontSize: 11, color: muted }}>· {company.sector}</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <p style={{ fontSize: 15, fontWeight: 300, color: company.qScore >= 60 ? green : company.qScore >= 40 ? amber : red, letterSpacing: "-0.02em" }}>
                              {company.qScore || "—"}
                            </p>
                          </div>

                          <p style={{ fontSize: 12, color: muted }}>{company.stage}</p>

                          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <TrendingUp style={{ height: 10, width: 10, color: muted }} />
                            <p style={{ fontSize: 11, color: muted }}>{relativeDate(company.connectedAt)}</p>
                          </div>

                          <button
                            onClick={e => { e.stopPropagation(); router.push(`/investor/startup/${company.id}`); }}
                            style={{ height: 30, width: 30, display: "flex", alignItems: "center", justifyContent: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 7, cursor: "pointer" }}
                          >
                            <ChevronRight style={{ height: 12, width: 12, color: muted }} />
                          </button>
                        </div>

                        {isOpen && (
                          <div style={{ padding: "0 16px 16px 66px", borderTop: `1px solid ${bdr}` }}>
                            {company.description && (
                              <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginTop: 12, marginBottom: 14 }}>
                                {company.description}
                              </p>
                            )}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 14 }}>
                              {[
                                { label: "Revenue",   value: company.metrics.revenue },
                                { label: "Growth",    value: company.metrics.growth },
                                { label: "Burn Rate", value: company.metrics.burnRate },
                                { label: "Runway",    value: company.metrics.runway },
                              ].map((m, mi) => (
                                <div key={mi} style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 8, padding: "10px 12px" }}>
                                  <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{m.label}</p>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: m.value === "—" ? muted : ink }}>{m.value}</p>
                                </div>
                              ))}
                            </div>
                            <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, marginBottom: 8 }}>Q-Score Breakdown</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                              {Object.entries(company.qScoreBreakdown).map(([dim, score]) => (
                                <div key={dim} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 8, background: bg, border: `1px solid ${bdr}` }}>
                                  <p style={{ fontSize: 11, color: muted, textTransform: "capitalize", margin: 0 }}>{dim}</p>
                                  <p style={{ fontSize: 12, fontWeight: 600, color: score >= 60 ? green : score >= 40 ? amber : red, margin: 0 }}>{score}</p>
                                </div>
                              ))}
                            </div>
                            <button
                              onClick={() => router.push(`/investor/startup/${company.id}`)}
                              style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 16px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 12, cursor: "pointer" }}
                            >
                              Full profile <ArrowUpRight style={{ height: 12, width: 12 }} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Declined tab ── */}
        {tab === 'declined' && (
          <>
            {declinedCount === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 20px", border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
                <p style={{ fontSize: 13, color: muted }}>No declined requests.</p>
              </div>
            ) : (
              <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                {requests
                  .filter(r => r.status === 'declined')
                  .map(req => (
                    <RequestRow
                      key={req.id}
                      req={req}
                      onAccept={handleAccept}
                      onDecline={r => setDeclineTarget(r)}
                      actionLoading={actionLoading}
                      showDeclined
                    />
                  ))}
              </div>
            )}
          </>
        )}

        <p style={{ marginTop: 40, fontSize: 11, color: muted, opacity: 0.5, textAlign: "center" }}>
          {companies.length} connected · {pendingCount} pending
        </p>
      </div>

      {declineTarget && (
        <DeclineModal
          founderName={declineTarget.founderName}
          onConfirm={handleDeclineConfirm}
          onCancel={() => setDeclineTarget(null)}
          loading={declineBusy}
        />
      )}

      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 70, padding: "11px 20px", borderRadius: 9,
          background: ink, color: bg, fontSize: 13,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
        }}>
          {toast.ok ? <Check style={{ width: 13, height: 13 }} /> : <AlertCircle style={{ width: 13, height: 13 }} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
