"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, ChevronRight, ChevronDown, Flame, ArrowUp, Minus, LayoutGrid, List, MessageSquare, Send, X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '@/lib/constants/colors'
import { Avatar } from '@/features/shared/components/Avatar'

// ─── types ────────────────────────────────────────────────────────────────────
interface Founder {
  id: string;
  name: string;
  tagline: string;
  qScore: number;
  rawQScore: number;
  qScoreDaysSince: number | null;
  qScoreCalculatedAt: string | null;
  stage: string;
  sector: string;
  location: string;
  fundingGoal: string;
  teamSize: number | null;
  matchScore: number;
  lastActive: string;
  founder: { name: string };
  highlights: string[];
  hasScore: boolean;
  agentActionsThisWeek: number;
  totalDeliverables: number;
  isActiveFounder: boolean;
  stripeVerified: boolean;
  signalStrength: number | null;
  integrityIndex: number | null;
  momentumScore: number | null;
  behaviouralScore: number | null;
  visibilityGated: boolean;
  weightedQScore: number;
  qScorePercentile: number;
  matchesPreferences: boolean;
  companyLogoUrl: string | null;
  avatarUrl: string | null;
  isHot?: boolean;
}

const PIPELINE_STAGES = [
  { value: 'watching',  label: 'Watching',  color: muted    },
  { value: 'meeting',   label: 'Meeting',   color: amber    },
  { value: 'in_dd',     label: 'In DD',     color: '#7C3AED' },
  { value: 'portfolio', label: 'Portfolio', color: green    },
  { value: 'passed',    label: 'Passed',    color: red      },
];

function qScoreColor(s: number) {
  return s >= 70 ? green : s >= 50 ? amber : red;
}

function momentumBadge(score: number | null) {
  if (score === null) return null;
  if (score >= 10) return { color: red,   bg: "#FEF2F2", label: `+${score} Hot`,    Icon: Flame   };
  if (score >= 4)  return { color: green, bg: "#ECFDF5", label: `+${score} Rising`, Icon: ArrowUp };
  if (score >= -3) return { color: muted, bg: surf,      label: "Steady",           Icon: Minus   };
  return               { color: amber, bg: "#FFFBEB", label: `${score} Falling`, Icon: Minus   };
}

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function _freshnessDot(daysAgo: number | null) {
  if (daysAgo === null) return muted;
  if (daysAgo < 30)  return green;
  if (daysAgo < 90)  return amber;
  return red;
}

// ─── founder card (compact horizontal) ───────────────────────────────────────
function FounderCard({
  founder, pipelineStage, onPipelineChange, onView, onMessage,
}: {
  founder: Founder;
  pipelineStage: string | null;
  onPipelineChange: (id: string, stage: string) => void;
  onView: (id: string) => void;
  onMessage: (founder: Founder) => void;
}) {
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const scoreColor = founder.hasScore ? qScoreColor(founder.weightedQScore) : muted;
  const mb = momentumBadge(founder.momentumScore);
  const MIcon = mb?.Icon;
  const activePipeline = PIPELINE_STAGES.find(s => s.value === pipelineStage) ?? null;

  return (
    <div
      style={{
        background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
        display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
        cursor: "pointer", transition: "background .12s, border-color .12s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = surf;
        (e.currentTarget as HTMLElement).style.borderColor = blue;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = bg;
        (e.currentTarget as HTMLElement).style.borderColor = bdr;
      }}
      onClick={() => onView(founder.id)}
    >
      {/* avatar */}
      <Avatar url={founder.companyLogoUrl} name={founder.name} size={36} radius={8} />

      {/* name + meta */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
          {founder.name}
        </p>
        {founder.tagline ? (
          <p style={{ fontSize: 10, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>
            {founder.tagline}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{founder.stage}</span>
          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{founder.sector}</span>
          {mb && MIcon && (
            <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "1px 6px", background: mb.bg, borderRadius: 999 }}>
              <MIcon style={{ height: 9, width: 9, color: mb.color }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: mb.color }}>{mb.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* score */}
      <div style={{ textAlign: "right", flexShrink: 0, minWidth: 44 }}>
        {founder.hasScore ? (
          <>
            <p style={{ fontSize: 20, fontWeight: 700, color: scoreColor, lineHeight: 1, letterSpacing: "-0.03em" }}>{founder.weightedQScore}</p>
            <p style={{ fontSize: 9, color: muted, marginTop: 1 }}>Q-Score</p>
            {founder.qScorePercentile > 0 && (
              <p style={{ fontSize: 9, color: muted, marginTop: 1 }}>top {100 - founder.qScorePercentile}%</p>
            )}
          </>
        ) : (
          <p style={{ fontSize: 10, color: muted }}>—</p>
        )}
      </div>

      {/* pipeline dropdown */}
      <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
        <button
          onClick={e => { e.stopPropagation(); setPipelineOpen(o => !o); }}
          style={{
            padding: "4px 8px", fontSize: 11, fontWeight: activePipeline ? 600 : 400,
            background: surf, border: `1px solid ${bdr}`, borderRadius: 6,
            color: activePipeline ? activePipeline.color : muted,
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          {activePipeline ? activePipeline.label : "+ Pipeline"}
          <ChevronDown style={{ height: 9, width: 9, flexShrink: 0 }} />
        </button>

        {pipelineOpen && (
          <>
            <div onClick={() => setPipelineOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 48 }} />
            <div style={{
              position: "absolute", top: "calc(100% + 4px)", right: 0, zIndex: 49,
              background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,0.1)", padding: "4px 0", minWidth: 140,
            }}>
              {PIPELINE_STAGES.map(stage => (
                <button
                  key={stage.value}
                  onClick={() => { setPipelineOpen(false); onPipelineChange(founder.id, stage.value); }}
                  style={{ display: "flex", alignItems: "center", gap: 7, width: "100%", padding: "7px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 12, color: stage.color, fontFamily: "inherit", textAlign: "left", fontWeight: 500 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: stage.color, flexShrink: 0 }} />
                  {stage.label}
                </button>
              ))}
              {pipelineStage && (
                <>
                  <div style={{ height: 1, background: bdr, margin: "4px 0" }} />
                  <button
                    onClick={() => { setPipelineOpen(false); onPipelineChange(founder.id, ""); }}
                    style={{ display: "block", width: "100%", padding: "7px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: 11, color: muted, fontFamily: "inherit", textAlign: "left" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* message */}
      <button
        onClick={e => { e.stopPropagation(); onMessage(founder); }}
        title="Message founder"
        style={{
          height: 30, width: 30, display: "flex", alignItems: "center", justifyContent: "center",
          background: surf, border: `1px solid ${bdr}`, borderRadius: 7, cursor: "pointer", flexShrink: 0,
        }}
      >
        <MessageSquare style={{ height: 12, width: 12, color: muted }} />
      </button>

      {/* view */}
      <button
        onClick={e => { e.stopPropagation(); onView(founder.id); }}
        style={{
          height: 30, width: 30, display: "flex", alignItems: "center", justifyContent: "center",
          background: surf, border: `1px solid ${bdr}`, borderRadius: 7, cursor: "pointer", flexShrink: 0,
        }}
      >
        <ChevronRight style={{ height: 12, width: 12, color: muted }} />
      </button>
    </div>
  );
}

// ─── table row ────────────────────────────────────────────────────────────────
function TableRow({ founder, pipelineStage, onPipelineChange, onView, isLast }: {
  founder: Founder;
  pipelineStage: string | null;
  onPipelineChange: (id: string, stage: string) => void;
  onView: (id: string) => void;
  isLast: boolean;
}) {
  const mb = momentumBadge(founder.momentumScore);
  const MIcon = mb?.Icon;
  return (
    <div
      style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px 120px 130px 34px", gap: 10, padding: "14px 16px", alignItems: "center", borderBottom: isLast ? "none" : `1px solid ${bdr}`, background: bg, cursor: "pointer" }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = bg}
      onClick={() => onView(founder.id)}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <Avatar url={founder.companyLogoUrl} name={founder.name} size={34} radius={8} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{founder.name}</p>
          <p style={{ fontSize: 11, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{founder.sector} · {founder.stage}</p>
        </div>
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: founder.hasScore ? qScoreColor(founder.weightedQScore) : muted }}>{founder.hasScore ? founder.weightedQScore : "—"}</p>
      {mb && MIcon ? (
        <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: mb.bg, borderRadius: 999, width: "fit-content" }}>
          <MIcon style={{ height: 9, width: 9, color: mb.color }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: mb.color }}>{mb.label}</span>
        </div>
      ) : <span style={{ fontSize: 12, color: muted }}>—</span>}
      <p style={{ fontSize: 12, color: muted }}>{founder.location || "—"}</p>
      <select
        value={pipelineStage ?? ""}
        onChange={e => { e.stopPropagation(); onPipelineChange(founder.id, e.target.value); }}
        onClick={e => e.stopPropagation()}
        style={{ padding: "4px 7px", fontSize: 11, fontWeight: 600, background: surf, border: `1px solid ${bdr}`, borderRadius: 6, color: PIPELINE_STAGES.find(s => s.value === (pipelineStage ?? ""))?.color ?? muted, cursor: "pointer", fontFamily: "inherit", outline: "none" }}
      >
        <option value="">— Add</option>
        {PIPELINE_STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
      <button onClick={e => { e.stopPropagation(); onView(founder.id); }} style={{ height: 30, width: 30, display: "flex", alignItems: "center", justifyContent: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 7, cursor: "pointer" }}>
        <ChevronRight style={{ height: 12, width: 12, color: muted }} />
      </button>
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────
export default function DealFlowPage() {
  const router = useRouter();
  const [founders,       setFounders]       = useState<Founder[]>([]);
  const [pipelineMap,    setPipelineMap]    = useState<Record<string, string>>({});
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState("");
  const [selectedStage,  setSelectedStage]  = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [activeTab,      setActiveTab]      = useState<"all" | "hot" | "pipeline">("all");
  const [viewMode,       setViewMode]       = useState<"cards" | "table">("cards");
  // Outreach
  const [outreachFounder,  setOutreachFounder]  = useState<Founder | null>(null);
  const [outreachMsg,      setOutreachMsg]      = useState('');
  const [outreachSending,  setOutreachSending]  = useState(false);
  const [outreachDone,     setOutreachDone]     = useState(false);

  async function handleSendOutreach() {
    if (!outreachFounder || !outreachMsg.trim() || outreachSending) return
    setOutreachSending(true)
    try {
      const res = await fetch('/api/investor/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ founderId: outreachFounder.id, message: outreachMsg.trim() }),
      })
      if (res.ok) setOutreachDone(true)
    } finally {
      setOutreachSending(false)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch("/api/investor/deal-flow").then(r => { if (!r.ok) throw new Error(String(r.status)); return r.json() }),
      fetch("/api/investor/pipeline").then(r => r.ok ? r.json() : { pipelineMap: {} }).catch(() => ({ pipelineMap: {} })),
    ]).then(([flowData, pipeData]) => {
      if (pipeData.pipelineMap) setPipelineMap(pipeData.pipelineMap);
      if (flowData.founders) {
        setFounders(flowData.founders.map((f: Founder & { lastActive: string }) => ({
          ...f,
          tagline: f.tagline || f.sector,
          stage:   f.stage || "Unknown",
          sector:  f.sector || "Other",
        })));
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function updatePipelineStage(founderId: string, stage: string) {
    if (!stage) {
      setPipelineMap(prev => { const n = { ...prev }; delete n[founderId]; return n; });
      fetch(`/api/investor/pipeline?founderId=${founderId}`, { method: "DELETE" }).catch(() => {});
      return;
    }
    setPipelineMap(prev => ({ ...prev, [founderId]: stage }));
    fetch("/api/investor/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ founderId, stage }),
    }).catch(() => {});
  }

  // Stats computed client-side
  const totalFounders = founders.length;
  const highSignal    = founders.filter(f => f.weightedQScore >= 70 && f.hasScore).length;
  const newThisWeek   = founders.filter(f => daysSince(f.lastActive) <= 7).length;
  const inPipeline    = founders.filter(f => pipelineMap[f.id]).length;

  const filtered = founders.filter(f => {
    const matchSearch  = !searchTerm || f.name.toLowerCase().includes(searchTerm.toLowerCase()) || f.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage   = selectedStage  === "all" || f.stage.toLowerCase().replace(/\s+/g, "-") === selectedStage;
    const matchSector  = selectedSector === "all" || f.sector.toLowerCase().replace(/[/\s]+/g, "-") === selectedSector;
    const matchTab     = activeTab === "all"
      || (activeTab === "hot"      && !!f.isHot)
      || (activeTab === "pipeline" && !!pipelineMap[f.id]);
    return matchSearch && matchStage && matchSector && matchTab;
  });

  const hotCount      = founders.filter(f => !!f.isHot).length;
  const pipelineCount = founders.filter(f => !!pipelineMap[f.id]).length;

  const tabs = [
    { key: "all"      as const, label: `All (${founders.length})` },
    { key: "hot"      as const, label: `Hot 🔥 (${hotCount})`, tooltip: "High Q-Score (80+), Stripe-verified revenue, or strong weekly momentum" },
    { key: "pipeline" as const, label: `In My Pipeline (${pipelineCount})` },
  ];

  const uniqueStages  = [...new Set(founders.map(f => f.stage).filter(Boolean))].sort();
  const uniqueSectors = [...new Set(founders.map(f => f.sector).filter(Boolean))].sort();

  return (
    <>
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 28px 72px" }}>
      <div style={{ maxWidth: 1060, margin: "0 auto" }}>

        {/* ── header ───────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 6 }}>Deal Flow</p>
            <h1 style={{ fontSize: "clamp(1.6rem,3.5vw,2.2rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 4 }}>
              Investment opportunities.
            </h1>
            <p style={{ fontSize: 13, color: muted }}>Founders matched to your thesis, scored and ranked by Q-Score.</p>
          </div>
        </div>

        {/* ── stats strip ───────────────────────────────────────────────── */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, background: bdr, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden", marginBottom: 20 }}>
            {[
              { label: "Total Founders",  value: totalFounders, accent: ink   },
              { label: "High Signal 70+", value: highSignal,    accent: green },
              { label: "New (7 days)",    value: newThisWeek,   accent: blue  },
              { label: "In My Pipeline",  value: inPipeline,    accent: amber },
            ].map((s, i) => (
              <div key={i} style={{ background: bg, padding: "20px 22px" }}>
                <p style={{ fontSize: 26, fontWeight: 300, color: s.accent, letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}


        {/* ── controls row ─────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 13, width: 13, color: muted }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search companies, sectors…"
              style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: surf, border: `1px solid ${bdr}`, borderRadius: 9, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={{ padding: "9px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 9, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit" }}>
            <option value="all">All Stages</option>
            {uniqueStages.map(s => <option key={s} value={s.toLowerCase().replace(/\s+/g, "-")}>{s}</option>)}
          </select>
          <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)} style={{ padding: "9px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 9, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit" }}>
            <option value="all">All Sectors</option>
            {uniqueSectors.map(s => <option key={s} value={s.toLowerCase().replace(/[/\s]+/g, "-")}>{s}</option>)}
          </select>

          {/* view toggle */}
          <div style={{ display: "flex", padding: "3px", background: surf, border: `1px solid ${bdr}`, borderRadius: 9, gap: 2 }}>
            {[{ mode: "cards" as const, Icon: LayoutGrid }, { mode: "table" as const, Icon: List }].map(({ mode, Icon }) => (
              <button key={mode} onClick={() => setViewMode(mode)}
                style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 7, border: "none", cursor: "pointer", background: viewMode === mode ? bg : "transparent", boxShadow: viewMode === mode ? "0 1px 4px rgba(0,0,0,0.08)" : "none", transition: "all .12s" }}>
                <Icon style={{ height: 14, width: 14, color: viewMode === mode ? ink : muted }} />
              </button>
            ))}
          </div>
        </div>

        {/* ── tabs ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
          {tabs.map(tab => (
            <div key={tab.key} style={{ position: "relative" }} title={'tooltip' in tab ? (tab as { tooltip?: string }).tooltip : undefined}>
              <button onClick={() => setActiveTab(tab.key)}
                style={{ padding: "10px 16px", fontSize: 12, fontWeight: 500, color: activeTab === tab.key ? ink : muted, background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.key ? `2px solid ${ink}` : "2px solid transparent", transition: "color .15s", fontFamily: "inherit" }}>
                {tab.label}
              </button>
            </div>
          ))}
        </div>

        {/* ── content ──────────────────────────────────────────────────── */}
        {loading ? (
          <div style={{ padding: "80px 0", textAlign: "center", color: muted, fontSize: 13 }}>Loading deal flow…</div>
        ) : founders.length === 0 ? (
          <div style={{ padding: "60px 24px", textAlign: "center", border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 14px 14px" }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>No founders yet</p>
            <p style={{ fontSize: 13, color: muted, lineHeight: 1.65 }}>
              Founders appear here after completing their Q-Score assessment.<br />Check back soon — new founders are assessed daily.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 14px 14px" }}>
            <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>No founders match your filters</p>
            <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>Try removing stage or sector filters, or check back tomorrow — new founders are assessed daily.</p>
            <button onClick={() => { setSearchTerm(""); setSelectedStage("all"); setSelectedSector("all"); setActiveTab("all"); }}
              style={{ marginTop: 16, padding: "8px 18px", background: ink, color: bg, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Clear filters
            </button>
          </div>
        ) : viewMode === "cards" ? (
          <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {filtered.map((founder, i) => (
              <motion.div key={founder.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                <FounderCard
                  founder={founder}
                  pipelineStage={pipelineMap[founder.id] ?? null}
                  onPipelineChange={updatePipelineStage}
                  onView={id => router.push(`/investor/startup/${id}`)}
                  onMessage={f => { setOutreachFounder(f); setOutreachMsg(''); setOutreachDone(false); }}
                />
              </motion.div>
            ))}
          </div>
        ) : (
          <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 14px 14px", overflow: "hidden" }}>
            {/* table header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 70px 110px 120px 130px 34px", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${bdr}`, background: surf }}>
              {["Company", "Q-Score", "Momentum", "Location", "Pipeline", ""].map((h, i) => (
                <p key={i} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600 }}>{h}</p>
              ))}
            </div>
            {filtered.map((founder, i) => (
              <TableRow
                key={founder.id}
                founder={founder}
                pipelineStage={pipelineMap[founder.id] ?? null}
                onPipelineChange={updatePipelineStage}
                onView={id => router.push(`/investor/startup/${id}`)}
                isLast={i === filtered.length - 1}
              />
            ))}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <p style={{ marginTop: 40, fontSize: 11, color: muted, opacity: 0.5, textAlign: "center" }}>
            {filtered.length} founder{filtered.length !== 1 ? "s" : ""} shown · Updated in real-time
          </p>
        )}
      </div>
    </div>

    <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    {/* Outreach modal */}
    {outreachFounder && (
      <div
        onClick={() => setOutreachFounder(null)}
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      >
        <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxWidth: 480, background: bg, borderRadius: 16, border: `1px solid ${bdr}`, padding: "28px 28px 24px", boxShadow: "0 24px 64px rgba(0,0,0,0.12)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <MessageSquare style={{ height: 16, width: 16, color: blue }} />
              <p style={{ fontSize: 15, fontWeight: 600, color: ink }}>Message {outreachFounder.founder.name}</p>
            </div>
            <button onClick={() => setOutreachFounder(null)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
              <X style={{ height: 16, width: 16 }} />
            </button>
          </div>
          {outreachDone ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ fontSize: 22 }}>✓</p>
              <p style={{ fontSize: 14, color: green, fontWeight: 600, marginTop: 8 }}>Message sent!</p>
              <p style={{ fontSize: 13, color: muted, marginTop: 4 }}>
                {outreachFounder.founder.name} will see your message in their inbox.
              </p>
              <button onClick={() => setOutreachFounder(null)} style={{ marginTop: 18, padding: "9px 22px", borderRadius: 8, border: `1px solid ${bdr}`, background: surf, fontSize: 13, color: ink, cursor: "pointer", fontFamily: "inherit" }}>
                Close
              </button>
            </div>
          ) : (
            <>
              <p style={{ fontSize: 13, color: muted, marginBottom: 14, lineHeight: 1.55 }}>
                Introduce yourself and explain why you&apos;re interested in {outreachFounder.name}.
              </p>
              <textarea
                value={outreachMsg}
                onChange={e => setOutreachMsg(e.target.value)}
                placeholder={`Hi ${outreachFounder.founder.name.split(' ')[0]}, I came across ${outreachFounder.name} and would love to learn more…`}
                rows={5}
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: `1.5px solid ${bdr}`, background: surf, fontSize: 13, color: ink, fontFamily: "inherit", outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                onFocus={e => (e.currentTarget.style.borderColor = blue)}
                onBlur={e => (e.currentTarget.style.borderColor = bdr)}
              />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button onClick={() => setOutreachFounder(null)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", fontSize: 13, color: muted, cursor: "pointer", fontFamily: "inherit" }}>
                  Cancel
                </button>
                <button
                  onClick={handleSendOutreach}
                  disabled={!outreachMsg.trim() || outreachSending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 20px", borderRadius: 8, border: "none", background: outreachMsg.trim() ? blue : bdr, color: "#fff", fontSize: 13, fontWeight: 600, cursor: outreachMsg.trim() ? "pointer" : "not-allowed", opacity: outreachSending ? 0.6 : 1, fontFamily: "inherit" }}
                >
                  {outreachSending ? <Loader2 style={{ height: 13, width: 13, animation: "spin 1s linear infinite" }} /> : <Send style={{ height: 13, width: 13 }} />}
                  {outreachSending ? "Sending…" : "Send Message"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )}
    </>
  );
}
