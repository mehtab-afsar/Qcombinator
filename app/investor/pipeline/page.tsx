"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ExternalLink, X, ChevronDown } from "lucide-react";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'
import { ScoreBadge } from '@/features/shared/components/Badge'
import { EmptyState } from '@/features/shared/components/EmptyState'

// ─── stage config ─────────────────────────────────────────────────────────────
const STAGES = ['watching', 'meeting', 'in_dd', 'portfolio', 'passed'] as const
type Stage = typeof STAGES[number]

const STAGE_LABELS: Record<Stage, string> = {
  watching:  'Watching',
  meeting:   'Meeting',
  in_dd:     'In DD',
  portfolio: 'Portfolio',
  passed:    'Passed',
}

const STAGE_DOTS: Record<Stage, string> = {
  watching: blue, meeting: "#7C3AED", in_dd: amber, portfolio: green, passed: red,
}

function normaliseStage(s: string): Stage {
  if (s === 'interested') return 'watching'
  return STAGES.includes(s as Stage) ? (s as Stage) : 'watching'
}

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
  companyLogoUrl?: string | null;
  avatarUrl?: string | null;
  tagline?: string | null;
}

interface EnrichedEntry extends PipelineEntry {
  profile: FounderProfile | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

// ─── stage dropdown — fixed position to avoid overflow clipping ───────────────
function StageSelect({ stage, onChange }: { stage: Stage; onChange: (s: Stage) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "5px 10px", borderRadius: 7,
          fontSize: 12, fontWeight: 500, cursor: "pointer",
          background: "transparent", color: muted,
          border: `1px solid ${bdr}`,
          fontFamily: "system-ui, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        {STAGE_LABELS[stage]}
        <ChevronDown style={{ width: 10, height: 10, color: muted }} />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 98 }} />
          <div style={{
            position: "fixed", top: pos.top, left: pos.left,
            zIndex: 99, background: surf, border: `1px solid ${bdr}`,
            borderRadius: 10, boxShadow: "0 8px 28px rgba(0,0,0,0.10)",
            padding: "4px 0", minWidth: 152,
          }}>
            {STAGES.filter(s => s !== stage).map(s => (
              <button
                key={s}
                onClick={() => { setOpen(false); onChange(s); }}
                style={{
                  display: "flex", alignItems: "center",
                  width: "100%", padding: "9px 14px",
                  background: "transparent", border: "none", cursor: "pointer",
                  fontSize: 13, color: ink, textAlign: "left",
                  fontWeight: 400, fontFamily: "system-ui, sans-serif",
                  transition: "background 0.1s",
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${bdr}50`}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
              >
                Move to {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ─── row ──────────────────────────────────────────────────────────────────────
function PipelineRow({ entry, onStageChange, onRemove, isLast }: {
  entry: EnrichedEntry;
  onStageChange: (id: string, stage: Stage) => void;
  onRemove: (id: string) => void;
  isLast: boolean;
}) {
  const p = entry.profile;
  const metaParts = [p?.industry, p?.stage].filter(Boolean);

  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 20px",
        borderBottom: isLast ? "none" : `1px solid ${bdr}`,
        transition: "background 0.1s",
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `${bdr}30`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
    >
      <Avatar url={p?.companyLogoUrl ?? p?.avatarUrl ?? null} name={p?.startup_name ?? "?"} size={36} radius={8} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p?.startup_name ?? "Unknown"}
          </span>
          {(p?.qScore ?? 0) > 0 && <ScoreBadge score={p!.qScore} />}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
          {metaParts.map((t, i) => (
            <span key={i} style={{ fontSize: 10, padding: "1px 6px", background: surf, border: `1px solid ${bdr}`, borderRadius: 5, color: muted }}>
              {t}
            </span>
          ))}
          {p?.tagline && (
            <span style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 240 }}>
              {p.tagline}
            </span>
          )}
        </div>
      </div>

      <span style={{ fontSize: 11, color: muted, flexShrink: 0, minWidth: 56, textAlign: "right" }}>
        {timeAgo(entry.updated_at)}
      </span>

      <StageSelect stage={entry.stage} onChange={s => onStageChange(entry.founder_user_id, s)} />

      <Link
        href={`/investor/startup/${entry.founder_user_id}`}
        onClick={e => e.stopPropagation()}
        style={{
          fontSize: 12, color: muted, textDecoration: "none", flexShrink: 0,
          display: "inline-flex", alignItems: "center", gap: 3, fontWeight: 500,
        }}
      >
        View
      </Link>

      <button
        onClick={e => { e.stopPropagation(); onRemove(entry.founder_user_id); }}
        title="Remove"
        style={{
          width: 26, height: 26, borderRadius: 6, flexShrink: 0, background: "transparent",
          border: "none", cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", color: muted, transition: "color 0.1s",
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = red}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = muted}
      >
        <X style={{ height: 12, width: 12 }} />
      </button>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function InvestorPipelinePage() {
  const [entries,     setEntries]     = useState<EnrichedEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [activeStage, setActiveStage] = useState<Stage | "all">("all");

  const load = useCallback(async () => {
    try {
      const [pipelineRes, foundersRes] = await Promise.all([
        fetch('/api/investor/pipeline').then(r => r.json()),
        fetch('/api/investor/deal-flow').then(r => r.json()),
      ]);
      const raw: PipelineEntry[] = pipelineRes.pipeline ?? [];
      const founders = (foundersRes.founders ?? []) as Array<{
        id: string; name: string; founder: { name: string } | null;
        sector: string; stage: string; qScore: number;
        tagline?: string | null;
        companyLogoUrl?: string | null; avatarUrl?: string | null;
      }>;
      const profileMap: Record<string, FounderProfile> = {};
      for (const d of founders) {
        profileMap[d.id] = {
          user_id: d.id, startup_name: d.name, full_name: d.founder?.name ?? '',
          industry: d.sector, stage: d.stage, qScore: d.qScore,
          companyLogoUrl: d.companyLogoUrl ?? null, avatarUrl: d.avatarUrl ?? null,
          tagline: d.tagline ?? null,
        };
      }
      setEntries(raw.map(e => ({ ...e, stage: normaliseStage(e.stage), profile: profileMap[e.founder_user_id] ?? null })));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleStageChange(founderId: string, stage: Stage) {
    setEntries(prev => prev.map(e => e.founder_user_id === founderId ? { ...e, stage } : e));
    await fetch('/api/investor/pipeline', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ founderId, stage }),
    });
  }

  function handleRemove(founderId: string) {
    setEntries(prev => prev.filter(e => e.founder_user_id !== founderId));
    fetch(`/api/investor/pipeline?founderId=${founderId}`, { method: 'DELETE' });
  }

  const stageCounts = STAGES.reduce((acc, s) => {
    acc[s] = entries.filter(e => e.stage === s).length;
    return acc;
  }, {} as Record<Stage, number>);

  const filtered = activeStage === "all" ? entries : entries.filter(e => e.stage === activeStage);
  const stageOrder: Record<Stage, number> = { watching: 0, meeting: 1, in_dd: 2, portfolio: 3, passed: 4 };
  const sorted = [...filtered].sort((a, b) => {
    const sd = stageOrder[a.stage] - stageOrder[b.stage];
    return sd !== 0 ? sd : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const tabs: Array<{ key: Stage | 'all'; label: string }> = [
    { key: 'all', label: `All (${entries.length})` },
    ...STAGES.filter(s => stageCounts[s] > 0).map(s => ({ key: s, label: `${STAGE_LABELS[s]} (${stageCounts[s]})` })),
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 28px 72px" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 6 }}>
              Investor · Pipeline
            </p>
            <h1 style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 4 }}>
              Your pipeline.
            </h1>
            <p style={{ fontSize: 13, color: muted }}>Track and manage founders across every stage of your process.</p>
          </div>
          <Link href="/investor/deal-flow" style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 8, fontSize: 12, fontWeight: 500,
            background: surf, border: `1px solid ${bdr}`, color: ink,
            textDecoration: "none", alignSelf: "flex-start", marginTop: 4,
          }}>
            Browse founders <ExternalLink style={{ height: 11, width: 11, color: muted }} />
          </Link>
        </div>

        {/* stats strip */}
        {!loading && entries.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 12, overflow: "hidden", marginBottom: 28 }}>
            {[
              { label: "Total",     value: entries.length,            accent: ink     },
              { label: "Watching",  value: stageCounts.watching,      accent: blue    },
              { label: "Meeting",   value: stageCounts.meeting,       accent: "#7C3AED" },
              { label: "In DD",     value: stageCounts.in_dd,         accent: amber   },
              { label: "Portfolio", value: stageCounts.portfolio,     accent: green   },
            ].map((s, i) => (
              <div key={i} style={{ background: bg, padding: "18px 20px" }}>
                <p style={{ fontSize: 24, fontWeight: 300, color: s.accent, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 5 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: muted }}>Loading pipeline…</p>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon="📋"
            title="Your pipeline is empty"
            body="Browse the deal flow, view a founder's profile, and add them to your pipeline when you're ready."
            action={{ label: "Browse Deal Flow", href: "/investor/deal-flow" }}
          />
        ) : (
          <>
            {/* tabs */}
            <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
              {tabs.map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveStage(t.key)}
                  style={{
                    padding: "10px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    background: "transparent", border: "none",
                    borderBottom: activeStage === t.key ? `2px solid ${ink}` : "2px solid transparent",
                    color: activeStage === t.key ? ink : muted,
                    marginBottom: -1, transition: "all 0.15s",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* list */}
            <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden", background: bg }}>
              {sorted.length === 0 ? (
                <div style={{ padding: "40px 20px", textAlign: "center" }}>
                  <p style={{ fontSize: 13, color: muted }}>No founders in this stage.</p>
                </div>
              ) : (
                sorted.map((entry, i) => (
                  <PipelineRow
                    key={entry.id}
                    entry={entry}
                    onStageChange={handleStageChange}
                    onRemove={handleRemove}
                    isLast={i === sorted.length - 1}
                  />
                ))
              )}
            </div>

            {/* distribution bar */}
            {entries.length > 0 && (
              <div style={{ marginTop: 20, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted }}>Distribution</span>
                {STAGES.filter(s => stageCounts[s] > 0).map(s => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: STAGE_DOTS[s], flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: muted }}>{STAGE_LABELS[s]}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{stageCounts[s]}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
