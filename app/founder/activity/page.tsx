"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const purple = "#7C3AED";

// ─── agent metadata ───────────────────────────────────────────────────────────
const AGENT_META: Record<string, { label: string; description: string; color: string }> = {
  patel:  { label: "Patel",  description: "GTM · Sent emails, deployed pages",           color: blue   },
  susi:   { label: "Susi",   description: "Sales · Sent proposals, updated pipeline",    color: green  },
  felix:  { label: "Felix",  description: "Finance · Sent investor updates",             color: green  },
  maya:   { label: "Maya",   description: "Brand · Deployed websites, wrote blog posts", color: purple },
  leo:    { label: "Leo",    description: "Legal · Generated NDAs",                      color: amber  },
  harper: { label: "Harper", description: "HR · Screened applications",                  color: green  },
  nova:   { label: "Nova",   description: "PMF · Surveys, experiments",                  color: purple },
  atlas:  { label: "Atlas",  description: "Intel · Tracked competitors",                  color: blue   },
  sage:   { label: "Sage",   description: "Strategy · Sent investor updates, synced OKRs", color: purple },
};

// ─── relative time ────────────────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff    = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1)   return "Yesterday";
  return `${days}d ago`;
}

// ─── group by date ────────────────────────────────────────────────────────────
function dateLabel(dateStr: string): string {
  const d   = new Date(dateStr);
  const now = new Date();
  // Use calendar-day comparison without mutating date objects (avoids DST edge cases)
  const dayD   = new Date(d.getFullYear(),   d.getMonth(),   d.getDate()).getTime();
  const dayNow = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const diff   = Math.round((dayNow - dayD) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ─── types ────────────────────────────────────────────────────────────────────
interface ActivityRow {
  id: string;
  user_id: string;
  agent_id: string;
  action_type: string;
  description: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

interface Group {
  label: string;
  items: ActivityRow[];
}

// ─── helper: build action description ────────────────────────────────────────
function actionDescription(row: ActivityRow): string {
  // Use description from DB column directly
  if (row.description) return row.description;
  // Fall back to metadata fields if description is missing
  if (row.metadata) {
    const m = row.metadata as Record<string, string>;
    if (typeof m.message === "string" && m.message) return m.message;
    if (typeof m.summary === "string" && m.summary) return m.summary;
  }
  return row.action_type;
}

// ─── agent avatar ─────────────────────────────────────────────────────────────
function AgentAvatar({ agentId }: { agentId: string }) {
  const meta  = AGENT_META[agentId.toLowerCase()] ?? { label: agentId, color: muted };
  const letter = meta.label.charAt(0).toUpperCase();

  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
      background: `${meta.color}18`, border: `1.5px solid ${meta.color}40`,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: 14, fontWeight: 700, color: meta.color,
    }}>
      {letter}
    </div>
  );
}

// ─── activity item ────────────────────────────────────────────────────────────
function ActivityItem({ row }: { row: ActivityRow }) {
  const agentKey = row.agent_id.toLowerCase();
  const meta     = AGENT_META[agentKey] ?? { label: row.agent_id, description: "", color: muted };

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 14,
      padding: "14px 20px",
      borderBottom: `1px solid ${bdr}`,
    }}>
      {/* Timeline line + avatar */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
        <AgentAvatar agentId={agentKey} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 13, fontWeight: 700, color: meta.color,
          }}>
            {meta.label}
          </span>
          <span style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 11, color: muted,
          }}>
            {meta.description.split("·")[0].trim()}
          </span>
          <span style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 11, color: muted, marginLeft: "auto",
            whiteSpace: "nowrap",
          }}>
            {timeAgo(row.created_at)}
          </span>
        </div>
        <p style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 13, color: ink, margin: "4px 0 0",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}>
          {actionDescription(row)}
        </p>
      </div>
    </div>
  );
}

// ─── group section ────────────────────────────────────────────────────────────
function DateGroup({ group }: { group: Group }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {/* Date label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12, marginBottom: 0,
        padding: "10px 20px",
        background: surf, borderBottom: `1px solid ${bdr}`,
        borderTop: `1px solid ${bdr}`,
      }}>
        <span style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 11, fontWeight: 700, color: muted,
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>
          {group.label}
        </span>
        <div style={{ flex: 1, height: 1, background: bdr }} />
        <span style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 11, color: muted,
        }}>
          {group.items.length} {group.items.length === 1 ? "action" : "actions"}
        </span>
      </div>

      {/* Items */}
      {group.items.map((row) => (
        <ActivityItem key={row.id} row={row} />
      ))}
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function ActivityPage() {
  const router = useRouter();

  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [groups,        setGroups]        = useState<Group[]>([]);
  const [agentFilter,   setAgentFilter]   = useState<string>("all");
  const [sendingDigest, setSendingDigest] = useState(false);
  const [digestToast,   setDigestToast]   = useState<{ ok: boolean; msg: string } | null>(null);

  async function handleSendDigest() {
    setSendingDigest(true);
    setDigestToast(null);
    try {
      const res = await fetch("/api/digest/weekly", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to send");
      setDigestToast({ ok: true, msg: `Weekly digest sent to ${data.email} ✓` });
    } catch (err) {
      setDigestToast({ ok: false, msg: err instanceof Error ? err.message : "Failed to send digest" });
    } finally {
      setSendingDigest(false);
      setTimeout(() => setDigestToast(null), 5000);
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();

        // Auth check
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) {
          router.replace("/auth/login");
          return;
        }

        // Fetch activity
        const { data, error: fetchErr } = await supabase
          .from("agent_activity")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (fetchErr) throw new Error(fetchErr.message);

        const rows = (data ?? []) as ActivityRow[];
        setGroups(buildGroups(rows));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load activity");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function buildGroups(rows: ActivityRow[]): Group[] {
    const map = new Map<string, ActivityRow[]>();
    for (const row of rows) {
      const label = dateLabel(row.created_at);
      if (!map.has(label)) map.set(label, []);
      map.get(label)!.push(row);
    }
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }

  // Filter rows by selected agent
  const filteredGroups: Group[] = agentFilter === "all"
    ? groups
    : groups
        .map(g => ({ ...g, items: g.items.filter(r => r.agent_id.toLowerCase() === agentFilter) }))
        .filter(g => g.items.length > 0);

  const totalCount = filteredGroups.reduce((s, g) => s + g.items.length, 0);

  // ─── loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "50%",
            border: `3px solid ${bdr}`, borderTopColor: blue,
            animation: "spin 0.8s linear infinite",
            margin: "0 auto 16px",
          }} />
          <p style={{ color: muted, fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 14 }}>
            Loading activity…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ─── error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{
          background: surf, border: `1px solid ${bdr}`, borderRadius: 12,
          padding: 40, maxWidth: 440, textAlign: "center",
        }}>
          <p style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: "#DC2626", fontSize: 14, margin: 0 }}>
            {error}
          </p>
        </div>
      </div>
    );
  }

  // ─── main render ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: bg }}>
      {/* Page header */}
      <div style={{
        background: surf, borderBottom: `1px solid ${bdr}`,
        padding: "0 24px", position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{
          maxWidth: 800, margin: "0 auto",
          display: "flex", alignItems: "center", gap: 16,
          height: 56,
        }}>
          {/* Back button */}
          <button
            onClick={() => router.push("/founder/dashboard")}
            style={{
              background: "none", border: `1px solid ${bdr}`, borderRadius: 8,
              padding: "6px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, color: muted,
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = ink;
              e.currentTarget.style.borderColor = ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = muted;
              e.currentTarget.style.borderColor = bdr;
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Dashboard
          </button>

          {/* Title */}
          <h1 style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 17, fontWeight: 700, color: ink, margin: 0, flex: 1,
          }}>
            Agent Activity
          </h1>

          {/* Count badge */}
          {totalCount > 0 && (
            <div style={{
              background: `${blue}14`, border: `1px solid ${blue}30`,
              borderRadius: 12, padding: "2px 10px",
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 12, fontWeight: 600, color: blue,
            }}>
              {totalCount}
            </div>
          )}

          {/* Send weekly digest */}
          <button
            onClick={handleSendDigest}
            disabled={sendingDigest}
            style={{
              background: sendingDigest ? surf : ink,
              border: `1.5px solid ${sendingDigest ? bdr : ink}`,
              borderRadius: 8, padding: "6px 14px", cursor: sendingDigest ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 6,
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 12, fontWeight: 600,
              color: sendingDigest ? muted : "#F9F7F2",
              transition: "all 0.15s",
              opacity: sendingDigest ? 0.7 : 1,
            }}
          >
            {sendingDigest ? (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 0.8s linear infinite" }}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                Sending…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                Send Digest
              </>
            )}
          </button>
        </div>
      </div>

      {/* Toast */}
      {digestToast && (
        <div style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 9999,
          background: digestToast.ok ? ink : "#DC2626",
          color: "#F9F7F2",
          borderRadius: 10, padding: "12px 20px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          fontSize: 13, fontWeight: 500,
          boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
          display: "flex", alignItems: "center", gap: 10,
          maxWidth: 380,
          animation: "fadeIn 0.2s ease",
        }}>
          {digestToast.ok ? "✉️" : "⚠️"} {digestToast.msg}
        </div>
      )}
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Body */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "24px 24px 80px" }}>

        {/* Agent filter pills */}
        {groups.length > 0 && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
            <FilterPill label="All agents" value="all" current={agentFilter} onClick={setAgentFilter} />
            {Object.entries(AGENT_META).map(([key, meta]) => (
              <FilterPill key={key} label={meta.label} value={key} current={agentFilter} onClick={setAgentFilter} color={meta.color} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {filteredGroups.length === 0 && (
          <div style={{
            background: surf, border: `1px solid ${bdr}`, borderRadius: 14,
            padding: "52px 32px", textAlign: "center",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: `${blue}10`, border: `1.5px solid ${blue}30`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px", fontSize: 24,
            }}>
              {agentFilter === "all" ? "🤖" : AGENT_META[agentFilter]?.label.charAt(0) ?? "?"}
            </div>
            <h3 style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 17, fontWeight: 600, color: ink, margin: "0 0 10px",
            }}>
              {agentFilter === "all"
                ? "No agent activity yet"
                : `No activity from ${AGENT_META[agentFilter]?.label ?? agentFilter} yet`}
            </h3>
            <p style={{
              fontFamily: "system-ui, -apple-system, sans-serif",
              fontSize: 14, color: muted, margin: 0, lineHeight: 1.65,
              maxWidth: 380, marginLeft: "auto", marginRight: "auto",
            }}>
              {agentFilter === "all"
                ? "Start a conversation with an agent to see actions here."
                : `Start a conversation with ${AGENT_META[agentFilter]?.label ?? agentFilter} to see their actions here.`}
            </p>
            {agentFilter !== "all" && (
              <button
                onClick={() => setAgentFilter("all")}
                style={{
                  marginTop: 20, background: "none", border: `1px solid ${bdr}`,
                  borderRadius: 8, padding: "8px 18px", cursor: "pointer",
                  fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 13, color: muted,
                }}
              >
                Show all activity
              </button>
            )}
          </div>
        )}

        {/* Activity groups */}
        {filteredGroups.length > 0 && (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden" }}>
            {filteredGroups.map((group) => (
              <DateGroup key={group.label} group={group} />
            ))}
            {/* Remove last bottom border gap */}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── filter pill ──────────────────────────────────────────────────────────────
function FilterPill({
  label,
  value,
  current,
  onClick,
  color,
}: {
  label: string;
  value: string;
  current: string;
  onClick: (v: string) => void;
  color?: string;
}) {
  const active = current === value;
  const c      = color ?? blue;

  return (
    <button
      onClick={() => onClick(value)}
      style={{
        background: active ? `${c}18` : surf,
        border: `1.5px solid ${active ? c : bdr}`,
        borderRadius: 20,
        padding: "5px 14px",
        cursor: "pointer",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 12, fontWeight: active ? 600 : 400,
        color: active ? c : muted,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}
