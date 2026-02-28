"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ExternalLink, ChevronRight } from "lucide-react";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

// ─── stage config ─────────────────────────────────────────────────────────────
const STAGES = ['watching', 'interested', 'meeting', 'in_dd', 'portfolio', 'passed'] as const
type Stage = typeof STAGES[number]

const STAGE_CONFIG: Record<Stage, { label: string; color: string; bg: string; border: string; dot: string }> = {
  watching:   { label: 'Watching',   color: muted,     bg: surf,      border: bdr,      dot: muted   },
  interested: { label: 'Interested', color: blue,      bg: '#EFF6FF', border: '#BFDBFE', dot: blue    },
  meeting:    { label: 'Meeting',    color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', dot: '#7C3AED' },
  in_dd:      { label: 'In DD',      color: amber,     bg: '#FFFBEB', border: '#FDE68A', dot: amber   },
  portfolio:  { label: 'Portfolio',  color: green,     bg: '#ECFDF5', border: '#86EFAC', dot: green   },
  passed:     { label: 'Passed',     color: red,       bg: '#FEF2F2', border: '#FECACA', dot: red     },
}

// ─── types ────────────────────────────────────────────────────────────────────
interface PipelineEntry {
  id: string;
  founder_user_id: string;
  stage: Stage;
  notes: string | null;
  updated_at: string;
}

interface FounderProfile {
  user_id: string;
  startup_name: string;
  full_name: string;
  industry: string;
  stage: string;
  qScore: number;
}

interface EnrichedEntry extends PipelineEntry {
  profile: FounderProfile | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  return `${d}d ago`;
}

function qColor(n: number) {
  return n >= 75 ? green : n >= 55 ? amber : red;
}

// ─── entry card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onStageChange, onRemove }: {
  entry: EnrichedEntry;
  onStageChange: (founderId: string, stage: Stage) => void;
  onRemove: (founderId: string) => void;
}) {
  const [stageOpen, setStageOpen] = useState(false);
  const p = entry.profile;

  return (
    <div style={{
      background: bg, border: `1px solid ${bdr}`, borderRadius: 12,
      padding: "14px 16px", marginBottom: 10, position: "relative",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        {/* Avatar */}
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: ink, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: bg }}>
            {(p?.startup_name ?? "?").charAt(0).toUpperCase()}
          </span>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 700, color: ink }}>
              {p?.startup_name ?? "Unknown"}
            </span>
            {(p?.qScore ?? 0) > 0 && (
              <span style={{
                fontSize: 11, fontWeight: 700, color: qColor(p?.qScore ?? 0),
                background: `${qColor(p?.qScore ?? 0)}14`, padding: "1px 7px", borderRadius: 999,
              }}>
                Q{p?.qScore}
              </span>
            )}
            <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: muted, marginLeft: "auto" }}>
              {timeAgo(entry.updated_at)}
            </span>
          </div>
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: muted, margin: "3px 0 0" }}>
            {p?.full_name ?? "—"} · {p?.industry ?? "—"} · {p?.stage ?? "—"}
          </p>
          {entry.notes && (
            <p style={{
              fontFamily: "system-ui, sans-serif", fontSize: 11, color: ink,
              margin: "6px 0 0", lineHeight: 1.5, borderLeft: `2px solid ${amber}`,
              paddingLeft: 8,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {entry.notes}
            </p>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${bdr}` }}>

        {/* Stage change */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setStageOpen(o => !o)}
            style={{ fontSize: 11, fontWeight: 600, color: STAGE_CONFIG[entry.stage].color, background: STAGE_CONFIG[entry.stage].bg, border: `1px solid ${STAGE_CONFIG[entry.stage].border}`, borderRadius: 999, padding: "3px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            {STAGE_CONFIG[entry.stage].label}
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          {stageOpen && (
            <>
              <div onClick={() => setStageOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48 }} />
              <div style={{ position: "absolute", left: 0, top: "calc(100% + 4px)", zIndex: 49, background: bg, border: `1px solid ${bdr}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: "4px 0", minWidth: 140 }}>
                {STAGES.filter(s => s !== entry.stage).map(stage => (
                  <button
                    key={stage}
                    onClick={() => { setStageOpen(false); onStageChange(entry.founder_user_id, stage); }}
                    style={{ display: "block", width: "100%", padding: "7px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: STAGE_CONFIG[stage].color, textAlign: "left", fontWeight: 500 }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = STAGE_CONFIG[stage].bg}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    Move to {STAGE_CONFIG[stage].label}
                  </button>
                ))}
                <div style={{ height: 1, background: bdr, margin: "4px 0" }} />
                <button
                  onClick={() => { setStageOpen(false); onRemove(entry.founder_user_id); }}
                  style={{ display: "block", width: "100%", padding: "7px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: red, textAlign: "left" }}
                >
                  Remove
                </button>
              </div>
            </>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* View profile link */}
        <Link
          href={`/investor/startup/${entry.founder_user_id}`}
          style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}
        >
          View profile <ChevronRight style={{ height: 10, width: 10 }} />
        </Link>
      </div>
    </div>
  );
}

// ─── stage column ─────────────────────────────────────────────────────────────
function StageColumn({ stage, entries, onStageChange, onRemove }: {
  stage: Stage;
  entries: EnrichedEntry[];
  onStageChange: (founderId: string, stage: Stage) => void;
  onRemove: (founderId: string) => void;
}) {
  const cfg = STAGE_CONFIG[stage];
  return (
    <div style={{ minWidth: 280, flex: 1 }}>
      {/* Column header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        padding: "8px 12px", background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot, flexShrink: 0 }} />
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 700, color: cfg.color, flex: 1 }}>
          {cfg.label}
        </span>
        <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 11, color: cfg.color, opacity: 0.7, fontWeight: 600 }}>
          {entries.length}
        </span>
      </div>

      {/* Cards */}
      {entries.length === 0 ? (
        <div style={{ padding: "20px 12px", textAlign: "center", border: `1.5px dashed ${bdr}`, borderRadius: 10 }}>
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, color: muted, margin: 0 }}>
            No founders here yet
          </p>
        </div>
      ) : (
        entries.map(e => (
          <EntryCard key={e.id} entry={e} onStageChange={onStageChange} onRemove={onRemove} />
        ))
      )}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
export default function InvestorPipelinePage() {
  const [entries,  setEntries]  = useState<EnrichedEntry[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");

  useEffect(() => {
    (async () => {
      try {
        const [pipelineRes, foundersRes] = await Promise.all([
          fetch('/api/investor/pipeline').then(r => r.json()),
          fetch('/api/investor/deal-flow').then(r => r.json()),
        ]);

        const raw: PipelineEntry[] = pipelineRes.pipeline ?? [];
        const deals = (foundersRes.deals ?? []) as Array<{
          founderId: string; name: string; founder: string;
          sector: string; stage: string; qScore: number;
        }>;

        // Build a profile map from deal flow
        const profileMap: Record<string, FounderProfile> = {};
        for (const d of deals) {
          profileMap[d.founderId] = {
            user_id: d.founderId,
            startup_name: d.name,
            full_name: d.founder,
            industry: d.sector,
            stage: d.stage,
            qScore: d.qScore,
          };
        }

        setEntries(raw.map(e => ({ ...e, profile: profileMap[e.founder_user_id] ?? null })));
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleStageChange(founderId: string, stage: Stage) {
    setEntries(prev => prev.map(e => e.founder_user_id === founderId ? { ...e, stage } : e));
    await fetch('/api/investor/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId, stage }),
    });
  }

  function handleRemove(founderId: string) {
    setEntries(prev => prev.filter(e => e.founder_user_id !== founderId));
    fetch(`/api/investor/pipeline?founderId=${founderId}`, { method: 'DELETE' });
  }

  // Group by stage
  const byStage = STAGES.reduce((acc, s) => {
    acc[s] = entries.filter(e => e.stage === s);
    return acc;
  }, {} as Record<Stage, EnrichedEntry[]>);

  const activeStages = STAGES.filter(s => s !== 'passed');

  return (
    <div style={{ minHeight: "100vh", background: bg }}>

      {/* Header */}
      <div style={{ background: surf, borderBottom: `1px solid ${bdr}`, padding: "0 28px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
          <h1 style={{ fontFamily: "system-ui, sans-serif", fontSize: 17, fontWeight: 700, color: ink, margin: 0, flex: 1 }}>
            Deal Pipeline
          </h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {entries.length > 0 && (
              <div style={{ background: `${blue}14`, border: `1px solid ${blue}30`, borderRadius: 12, padding: "2px 10px", fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: blue }}>
                {entries.length} founders
              </div>
            )}
            {/* View toggle */}
            <div style={{ display: "flex", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, overflow: "hidden" }}>
              {(["kanban", "list"] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setViewMode(v)}
                  style={{ padding: "5px 12px", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600, background: viewMode === v ? ink : "transparent", color: viewMode === v ? bg : muted, transition: "all 0.15s" }}
                >
                  {v === "kanban" ? "Kanban" : "List"}
                </button>
              ))}
            </div>
            <Link href="/investor/deal-flow" style={{ fontSize: 12, fontWeight: 600, color: blue, textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Browse founders <ExternalLink style={{ height: 11, width: 11 }} />
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "24px 28px 80px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", border: `3px solid ${bdr}`, borderTopColor: blue, animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, color: muted }}>Loading pipeline…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 32px", border: `1.5px dashed ${bdr}`, borderRadius: 16 }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>📋</div>
            <h2 style={{ fontFamily: "system-ui, sans-serif", fontSize: 18, fontWeight: 700, color: ink, margin: "0 0 10px" }}>
              Your pipeline is empty
            </h2>
            <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 14, color: muted, margin: "0 0 20px", lineHeight: 1.6, maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
              Browse the deal flow and add founders to your pipeline to track them through stages.
            </p>
            <Link href="/investor/deal-flow" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: ink, color: bg, borderRadius: 999, textDecoration: "none", fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 600 }}>
              Browse Deal Flow
            </Link>
          </div>
        ) : viewMode === "kanban" ? (
          /* Kanban view */
          <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 16 }}>
            {activeStages.map(stage => (
              <StageColumn
                key={stage}
                stage={stage}
                entries={byStage[stage]}
                onStageChange={handleStageChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        ) : (
          /* List view grouped by stage */
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            {STAGES.filter(s => byStage[s].length > 0).map(stage => {
              const cfg = STAGE_CONFIG[stage];
              return (
                <div key={stage}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: cfg.dot }} />
                    <span style={{ fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 700, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span style={{ fontSize: 11, color: muted }}>({byStage[stage].length})</span>
                    <div style={{ flex: 1, height: 1, background: bdr }} />
                  </div>
                  <div style={{ maxWidth: 720 }}>
                    {byStage[stage].map(e => (
                      <EntryCard key={e.id} entry={e} onStageChange={handleStageChange} onRemove={handleRemove} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Passed section (always at bottom in list mode) */}
        {!loading && entries.length > 0 && viewMode === "list" && byStage.passed.length > 0 && (
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${bdr}` }}>
            <details>
              <summary style={{ fontFamily: "system-ui, sans-serif", fontSize: 12, fontWeight: 600, color: muted, cursor: "pointer", marginBottom: 12 }}>
                Passed ({byStage.passed.length})
              </summary>
              <div style={{ maxWidth: 720, marginTop: 12 }}>
                {byStage.passed.map(e => (
                  <EntryCard key={e.id} entry={e} onStageChange={handleStageChange} onRemove={handleRemove} />
                ))}
              </div>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
