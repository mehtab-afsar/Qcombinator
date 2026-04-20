"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ChevronRight, Check, X, MessageSquare, TrendingUp,
  Clock, AlertCircle, Users, RefreshCw,
} from "lucide-react";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from "@/lib/constants/colors";
import { Avatar } from "@/features/shared/components/Avatar";
import { ScoreBadge } from "@/features/shared/components/Badge";
import { SectionSpinner } from "@/features/shared/components/Spinner";

// ─── types ────────────────────────────────────────────────────────────────────
type Status = 'pending' | 'viewed' | 'accepted' | 'declined' | 'meeting_scheduled';

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
  qScoreBreakdown: {
    market: number; product: number; goToMarket: number;
    financial: number; team: number; traction: number;
  };
  status: Status;
  personalMessage?: string;
  requestedDate: string;
  respondedDate?: string | null;
  avatarUrl: string | null;
  companyLogoUrl: string | null;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
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
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function statusColor(status: Status): string {
  switch (status) {
    case 'pending':           return amber;
    case 'viewed':            return blue;
    case 'meeting_scheduled':
    case 'accepted':          return green;
    case 'declined':          return red;
    default:                  return muted;
  }
}

function statusLabel(status: Status): string {
  switch (status) {
    case 'pending':           return 'Pending';
    case 'viewed':            return 'Viewed';
    case 'meeting_scheduled':
    case 'accepted':          return 'Accepted';
    case 'declined':          return 'Declined';
    default:                  return status;
  }
}

const DIM_LABELS: [keyof ConnectionRequest['qScoreBreakdown'], string][] = [
  ['market', 'Market'], ['product', 'Product'], ['goToMarket', 'GTM'],
  ['financial', 'Financial'], ['team', 'Team'], ['traction', 'Traction'],
];

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
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 400,
              cursor: "pointer",
              border: `1px solid ${reasons.includes(r) ? ink : bdr}`,
              background: reasons.includes(r) ? ink : "transparent",
              color: reasons.includes(r) ? bg : muted,
              transition: "all 0.12s",
            }}>
              {r}
            </button>
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
function RequestRow({ req, onAccept, onDecline, actionLoading }: {
  req: ConnectionRequest;
  onAccept: (id: string) => void;
  onDecline: (req: ConnectionRequest) => void;
  actionLoading: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const isPending = req.status === 'pending' || req.status === 'viewed';
  const busy = actionLoading === req.id;
  const sc = statusColor(req.status);

  return (
    <div style={{
      borderBottom: `1px solid ${bdr}`,
      opacity: req.status === 'declined' ? 0.65 : 1,
      transition: "background 0.1s",
    }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${bdr}25`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
    >
      {/* Main row */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 20px" }}>
        <Avatar url={req.companyLogoUrl ?? req.avatarUrl ?? null} name={req.startupName} size={38} radius={9} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {req.startupName}
            </span>
            {req.qScore > 0 && <ScoreBadge score={req.qScore} />}
            <span style={{ fontSize: 10, fontWeight: 500, color: sc, padding: "1px 6px", borderRadius: 5, border: `1px solid ${sc}22`, background: `${sc}0e` }}>
              {statusLabel(req.status)}
            </span>
          </div>
          <p style={{ fontSize: 12, color: muted, margin: 0 }}>
            <strong style={{ color: ink, fontWeight: 500 }}>{req.founderName}</strong>
            {req.industry ? ` · ${req.industry}` : ""}
            {req.stage ? ` · ${req.stage}` : ""}
          </p>
          {req.tagline && (
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 400 }}>
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

          {!isPending && req.qScore > 0 && (
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

      {/* Personal message */}
      {req.personalMessage && (
        <div style={{ margin: "0 20px 12px", padding: "10px 14px", background: `${bdr}30`, borderRadius: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <MessageSquare style={{ width: 12, height: 12, color: muted, flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontSize: 12, color: ink, margin: 0, lineHeight: 1.6 }}>
              &quot;{req.personalMessage}&quot;
            </p>
          </div>
        </div>
      )}

      {/* Q-Score breakdown */}
      {expanded && req.qScore > 0 && (
        <div style={{ padding: "14px 20px", borderTop: `1px solid ${bdr}`, background: `${bdr}18` }}>
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
export default function InvestorConnectionsPage() {
  const [requests,      setRequests]      = useState<ConnectionRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState<'pending' | 'accepted' | 'declined' | 'all'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [declineTarget, setDeclineTarget] = useState<ConnectionRequest | null>(null);
  const [declineBusy,   setDeclineBusy]   = useState(false);
  const [toast,         setToast]         = useState<{ msg: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/investor/connections');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRequests(data.requests ?? []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

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
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'meeting_scheduled' as Status } : r));
      showToast('Connection accepted — the founder will be notified.', true);
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
      setRequests(prev => prev.map(r => r.id === declineTarget.id ? { ...r, status: 'declined' as Status } : r));
      showToast('Request declined.', true);
    } catch { showToast('Failed to decline. Please try again.', false); }
    finally { setDeclineBusy(false); setDeclineTarget(null); }
  }

  const pendingCount  = requests.filter(r => r.status === 'pending' || r.status === 'viewed').length;
  const acceptedCount = requests.filter(r => r.status === 'meeting_scheduled' || r.status === 'accepted').length;
  const declinedCount = requests.filter(r => r.status === 'declined').length;

  const filtered = requests.filter(r => {
    if (tab === 'pending')  return r.status === 'pending' || r.status === 'viewed';
    if (tab === 'accepted') return r.status === 'meeting_scheduled' || r.status === 'accepted';
    if (tab === 'declined') return r.status === 'declined';
    return true;
  });

  const tabs = [
    { key: 'pending'  as const, label: `Pending (${pendingCount})`   },
    { key: 'accepted' as const, label: `Accepted (${acceptedCount})` },
    { key: 'declined' as const, label: `Declined (${declinedCount})` },
    { key: 'all'      as const, label: `All (${requests.length})`    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 28px 72px" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 6 }}>
              Investor · Connections
            </p>
            <h1 style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 4 }}>
              Connection requests.
            </h1>
            <p style={{ fontSize: 13, color: muted }}>Founders who want to connect with you, scored and ready to review.</p>
          </div>
          <button onClick={load} disabled={loading} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 8, fontSize: 12,
            background: surf, border: `1px solid ${bdr}`, color: muted,
            cursor: "pointer", alignSelf: "flex-start", marginTop: 4,
          }}>
            <RefreshCw style={{ width: 12, height: 12, animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        {/* stats strip */}
        {!loading && requests.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
            {[
              { label: "Total",    value: requests.length, accent: ink   },
              { label: "Pending",  value: pendingCount,    accent: amber },
              { label: "Accepted", value: acceptedCount,   accent: green },
              { label: "Declined", value: declinedCount,   accent: red   },
            ].map((s, i) => (
              <div key={i} style={{ background: bg, padding: "18px 20px" }}>
                <p style={{ fontSize: 24, fontWeight: 300, color: s.accent, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 5 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <SectionSpinner label="Loading connections…" minHeight={280} />
        ) : requests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", border: `1px dashed ${bdr}`, borderRadius: 14 }}>
            <Users style={{ height: 32, width: 32, color: muted, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 300, letterSpacing: "-0.01em", color: ink, marginBottom: 6 }}>No connection requests yet</p>
            <p style={{ fontSize: 13, color: muted, marginBottom: 20, lineHeight: 1.6 }}>
              Founders will appear here when they request to connect with you.
            </p>
            <Link href="/investor/deal-flow" style={{
              display: "inline-flex", padding: "9px 20px", background: ink, color: bg,
              borderRadius: 8, textDecoration: "none", fontSize: 13,
            }}>
              Browse Deal Flow
            </Link>
          </div>
        ) : (
          <>
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

            {/* list */}
            {filtered.length === 0 ? (
              <div style={{ padding: "48px 20px", textAlign: "center", border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px" }}>
                <AlertCircle style={{ width: 24, height: 24, color: muted, margin: "0 auto 10px", display: "block" }} />
                <p style={{ fontSize: 13, color: muted }}>No {tab} requests</p>
              </div>
            ) : (
              <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
                {filtered.map(req => (
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
