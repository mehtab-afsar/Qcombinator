"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Sparkles, ChevronRight, Settings2, Flame, ArrowUp, Minus } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const red   = "#DC2626";
const amber = "#D97706";

// ─── types ────────────────────────────────────────────────────────────────────
interface Deal {
  id: string;
  name: string;
  tagline: string;
  qScore: number;
  rawQScore: number;
  qScoreDaysSince: number | null;
  stage: string;
  sector: string;
  location: string;
  fundingGoal: string;
  teamSize: number | null;
  matchScore: number;
  addedDate: string;
  founder: { name: string; title: string };
  highlights: string[];
  momentum: "hot" | "trending" | "steady";
  viewed: boolean;
  agentActionsThisWeek: number;
  totalDeliverables: number;
  isActiveFounder: boolean;
  stripeVerified:   boolean;
  signalStrength:   number | null;
  integrityIndex:   number | null;
  momentumScore:    number | null;
  behaviouralScore: number | null;
  visibilityGated:  boolean;
  weightedQScore:   number;
  pipelineStage:    string | null;
}

function momentumStyle(m: Deal["momentum"]) {
  if (m === "hot")      return { color: red,   bg: "#FEF2F2", label: "Hot",      Icon: Sparkles }
  if (m === "trending") return { color: amber, bg: "#FFFBEB", label: "Trending", Icon: TrendingUp }
  return                       { color: muted, bg: surf,      label: "Steady",   Icon: undefined }
}

function momentumBadge(score: number | null) {
  if (score === null) return null;
  if (score >= 10)  return { color: red,   bg: "#FEF2F2", label: `+${score} Hot`,    Icon: Flame };
  if (score >= 4)   return { color: green, bg: "#ECFDF5", label: `+${score} Rising`, Icon: ArrowUp };
  if (score >= -3)  return { color: muted, bg: surf,      label: "Steady",           Icon: Minus };
  return                   { color: amber, bg: "#FFFBEB", label: `${score} Falling`, Icon: TrendingUp };
}

const PIPELINE_STAGES = [
  { value: 'watching',   label: 'Watching',   color: muted  },
  { value: 'interested', label: 'Interested', color: blue   },
  { value: 'meeting',    label: 'Meeting',    color: amber  },
  { value: 'in_dd',      label: 'In DD',      color: '#7C3AED' },
  { value: 'portfolio',  label: 'Portfolio',  color: green  },
  { value: 'passed',     label: 'Passed',     color: red    },
];

// ─── component ────────────────────────────────────────────────────────────────
export default function DealFlowPage() {
  const router = useRouter();
  const [searchTerm,     setSearchTerm]     = useState("");
  const [selectedStage,  setSelectedStage]  = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [activeTab,      setActiveTab]      = useState<"all" | "hot" | "rising" | "new" | "high-match" | "active">("all");
  const [deals,          setDeals]          = useState<Deal[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [showWeights,    setShowWeights]    = useState(false);
  const [pipelineMap,    setPipelineMap]    = useState<Record<string, string>>({});
  const [weights, setWeights] = useState({
    weight_market: 20, weight_product: 18, weight_gtm: 17,
    weight_financial: 18, weight_team: 15, weight_traction: 12,
  });
  const [savingWeights, setSavingWeights] = useState(false);

  // Load pipeline + weights on mount
  useEffect(() => {
    Promise.all([
      fetch("/api/investor/pipeline").then(r => r.json()),
      fetch("/api/investor/weights").then(r => r.json()),
    ]).then(([pipeData, wData]) => {
      if (pipeData.pipelineMap) setPipelineMap(pipeData.pipelineMap);
      if (wData.weights) setWeights(wData.weights);
    }).catch(() => {});
  }, []);

  async function saveWeights() {
    setSavingWeights(true);
    try {
      await fetch("/api/investor/weights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(weights),
      });
      setShowWeights(false);
    } finally {
      setSavingWeights(false);
    }
  }

  async function updatePipelineStage(founderId: string, stage: string) {
    setPipelineMap(prev => ({ ...prev, [founderId]: stage }));
    await fetch("/api/investor/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ founderId, stage }),
    }).catch(() => {});
  }

  useEffect(() => {
    fetch("/api/investor/deal-flow")
      .then(r => r.json())
      .then(data => {
        if (data.founders && data.founders.length > 0) {
          setDeals(data.founders.map((f: {
            id: string; name: string; tagline: string; qScore: number; rawQScore?: number; qScoreDaysSince?: number | null; stage: string;
            sector: string; location: string; fundingGoal: string; teamSize: number | null;
            matchScore: number; highlights: string[]; lastActive: string;
            founder: { name: string }; hasScore: boolean;
            agentActionsThisWeek: number; totalDeliverables: number; isActiveFounder: boolean;
            stripeVerified?: boolean; signalStrength?: number | null; integrityIndex?: number | null;
            momentumScore?: number | null; behaviouralScore?: number | null; visibilityGated?: boolean; weightedQScore?: number;
          }) => ({
            id: f.id,
            name: f.name,
            tagline: f.tagline || f.sector,
            qScore: f.qScore,
            rawQScore: f.rawQScore ?? f.qScore,
            qScoreDaysSince: f.qScoreDaysSince ?? null,
            stage: f.stage || "Unknown",
            sector: f.sector || "Other",
            location: f.location || "",
            fundingGoal: f.fundingGoal || "",
            teamSize: f.teamSize ?? null,
            matchScore: f.matchScore,
            addedDate: new Date(f.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            founder: { name: f.founder?.name || "Founder", title: "Founder" },
            highlights: f.highlights?.length ? f.highlights : [f.sector, f.stage].filter(Boolean) as string[],
            momentum: (f.qScore >= 80 ? "hot" : f.qScore >= 65 ? "trending" : "steady") as Deal["momentum"],
            viewed: false,
            agentActionsThisWeek: f.agentActionsThisWeek ?? 0,
            totalDeliverables:    f.totalDeliverables ?? 0,
            isActiveFounder:      f.isActiveFounder ?? false,
            stripeVerified:       f.stripeVerified   ?? false,
            signalStrength:       f.signalStrength   ?? null,
            integrityIndex:       f.integrityIndex   ?? null,
            momentumScore:        f.momentumScore    ?? null,
            behaviouralScore:     f.behaviouralScore ?? null,
            visibilityGated:      f.visibilityGated  ?? false,
            weightedQScore:       f.weightedQScore   ?? f.qScore,
            pipelineStage:        null,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = deals.filter(d => {
    const matchSearch  = !searchTerm || d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.sector.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStage   = selectedStage  === "all" || d.stage.toLowerCase().replace(/\s+/g, "-") === selectedStage;
    const matchSector  = selectedSector === "all" || d.sector.toLowerCase().replace(/\//g, "-").replace(/\s+/g, "-") === selectedSector;
    const matchTab     = activeTab === "all"
      || (activeTab === "hot"        && d.momentum === "hot")
      || (activeTab === "rising"     && (d.momentumScore ?? 0) >= 4)
      || (activeTab === "new"        && !d.viewed)
      || (activeTab === "high-match" && d.matchScore >= 90)
      || (activeTab === "active"     && d.isActiveFounder);
    return matchSearch && matchStage && matchSector && matchTab;
  });

  const tabs = [
    { key: "all"        as const, label: `All (${deals.length})` },
    { key: "hot"        as const, label: `Hot 🔥 (${deals.filter(d => d.momentum === "hot").length})` },
    { key: "rising"     as const, label: `Rising ↑ (${deals.filter(d => (d.momentumScore ?? 0) >= 4).length})` },
    { key: "new"        as const, label: `New (${deals.filter(d => !d.viewed).length})` },
    { key: "high-match" as const, label: `High Match (${deals.filter(d => d.matchScore >= 90).length})` },
    { key: "active"     as const, label: `Active (${deals.filter(d => d.isActiveFounder).length})` },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "40px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* header */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 8 }}>
            Deal Flow
          </p>
          <h1 style={{ fontSize: "clamp(1.8rem,4vw,2.4rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink, marginBottom: 6 }}>
            Investment opportunities.
          </h1>
          <p style={{ fontSize: 14, color: muted }}>Discover and evaluate new startups matched to your thesis.</p>
        </div>

        {/* filters + weight config button */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
            <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", height: 13, width: 13, color: muted }} />
            <input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search companies, sectors…"
              style={{ width: "100%", paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, background: surf, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
          <select value={selectedStage} onChange={e => setSelectedStage(e.target.value)} style={{ padding: "9px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit" }}>
            <option value="all">All Stages</option>
            <option value="pre-seed">Pre-Seed</option>
            <option value="seed">Seed</option>
            <option value="series-a">Series A</option>
            <option value="series-b">Series B</option>
          </select>
          <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)} style={{ padding: "9px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, fontSize: 13, color: ink, outline: "none", fontFamily: "inherit" }}>
            <option value="all">All Sectors</option>
            <option value="ai-ml">AI/ML</option>
            <option value="healthcare">Healthcare</option>
            <option value="cybersecurity">Cybersecurity</option>
            <option value="cleantech">CleanTech</option>
            <option value="hr-tech">HR Tech</option>
            <option value="agtech">AgTech</option>
          </select>
          <button onClick={() => setShowWeights(v => !v)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", background: showWeights ? ink : surf, color: showWeights ? bg : muted, border: `1px solid ${showWeights ? ink : bdr}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
            <Settings2 style={{ height: 12, width: 12 }} />
            Weights
          </button>
        </div>

        {/* ── Parameter weight config panel ────────────────────────────── */}
        {showWeights && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 12, padding: "18px 20px", marginBottom: 16 }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 12 }}>
              Your scoring weights — customise how each dimension is weighted in your Q-Score view
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {([
                { key: "weight_market",   label: "Market"    },
                { key: "weight_product",  label: "Product"   },
                { key: "weight_gtm",      label: "GTM"       },
                { key: "weight_financial",label: "Financial" },
                { key: "weight_team",     label: "Team"      },
                { key: "weight_traction", label: "Traction"  },
              ] as { key: keyof typeof weights; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: muted }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{weights[key]}</span>
                  </div>
                  <input
                    type="range" min={0} max={40} value={weights[key]}
                    onChange={e => setWeights(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                    style={{ width: "100%", accentColor: blue }}
                  />
                </div>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 11, color: muted }}>
                  Total: {Object.values(weights).reduce((a, b) => a + b, 0)} (normalised to 100%)
                </span>
                <button
                  onClick={() => setWeights({ weight_market: 20, weight_product: 18, weight_gtm: 17, weight_financial: 18, weight_team: 15, weight_traction: 12 })}
                  style={{ fontSize: 11, color: muted, background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontFamily: "inherit", padding: 0 }}
                >
                  Reset to defaults
                </button>
              </div>
              <button onClick={saveWeights} disabled={savingWeights} style={{ padding: "7px 18px", background: ink, color: bg, border: "none", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", opacity: savingWeights ? 0.6 : 1 }}>
                {savingWeights ? "Saving…" : "Save weights"}
              </button>
            </div>
          </motion.div>
        )}

        {/* tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 500, color: activeTab === tab.key ? ink : muted, background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.key ? `2px solid ${ink}` : "2px solid transparent", transition: "color .15s", fontFamily: "inherit" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 120px 140px 44px", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${bdr}` }}>
          {["Company", "Q-Score", "Momentum", "Stage", "Pipeline", ""].map((h, i) => (
            <p key={i} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600 }}>{h}</p>
          ))}
        </div>

        {/* rows */}
        <div style={{ border: `1px solid ${bdr}`, borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: "60px 16px", textAlign: "center", color: muted, fontSize: 13 }}>Loading deal flow…</div>
          ) : deals.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center" }}>
              <p style={{ fontSize: 14, fontWeight: 500, color: ink, marginBottom: 8 }}>No founders yet</p>
              <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                Founders appear here after completing their Q-Score assessment.<br />Check back soon — new founders are assessed daily.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px 16px", textAlign: "center", color: muted, fontSize: 14 }}>No deals match your filters.</div>
          ) : filtered.map((deal, i) => {
            const ms = momentumStyle(deal.momentum);
            const MIcon = ms.Icon;
            const initials = deal.name.split(" ").map(n => n[0]).join("").slice(0, 2);
            return (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${bdr}` : "none", background: bg }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = surf}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = bg}
              >
                <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 120px 140px 44px", gap: 12, padding: "16px 16px", alignItems: "center" }}>

                  {/* company */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ height: 38, width: 38, borderRadius: 9, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: ink }}>
                        {initials}
                      </div>
                      {!deal.viewed && (
                        <div style={{ position: "absolute", top: -3, right: -3, height: 8, width: 8, background: blue, borderRadius: "50%", border: `2px solid ${bg}` }} />
                      )}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2, flexWrap: "wrap" }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</p>
                        {MIcon && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", background: ms.bg, borderRadius: 999 }}>
                            <MIcon style={{ height: 9, width: 9, color: ms.color }} />
                            <span style={{ fontSize: 10, color: ms.color, fontWeight: 600 }}>{ms.label}</span>
                          </div>
                        )}
                        {deal.isActiveFounder && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", background: "#ECFDF5", borderRadius: 999, border: "1px solid #A7F3D0" }}>
                            <span style={{ fontSize: 9 }}>🤖</span>
                            <span style={{ fontSize: 10, color: green, fontWeight: 600 }}>{deal.agentActionsThisWeek} actions this week</span>
                          </div>
                        )}
                        {deal.stripeVerified && (
                          <div title="Revenue verified via Stripe" style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", background: "#EFF6FF", borderRadius: 999, border: "1px solid #BFDBFE" }}>
                            <span style={{ fontSize: 9 }}>✓</span>
                            <span style={{ fontSize: 10, color: blue, fontWeight: 600 }}>Stripe verified</span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {deal.founder.name} · {deal.location}{deal.totalDeliverables > 0 ? ` · ${deal.totalDeliverables} deliverable${deal.totalDeliverables !== 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* q-score (custom weighted if investor set weights) */}
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 700, color: deal.weightedQScore >= 80 ? green : deal.weightedQScore >= 65 ? blue : muted }}>
                      {deal.weightedQScore}
                    </p>
                    {deal.weightedQScore !== deal.qScore && (
                      <p style={{ fontSize: 9, color: muted }}>raw {deal.rawQScore}</p>
                    )}
                    {deal.qScoreDaysSince !== null && (
                      <p style={{ fontSize: 9, color: deal.qScoreDaysSince < 30 ? green : deal.qScoreDaysSince < 90 ? amber : red }}>
                        {deal.qScoreDaysSince}d ago
                      </p>
                    )}
                  </div>

                  {/* momentum */}
                  {(() => {
                    const mb = momentumBadge(deal.momentumScore);
                    if (!mb) return <p style={{ fontSize: 12, color: muted }}>—</p>;
                    const MIcon = mb.Icon;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", background: mb.bg, borderRadius: 999, width: "fit-content" }}>
                        <MIcon style={{ height: 10, width: 10, color: mb.color }} />
                        <span style={{ fontSize: 10, fontWeight: 700, color: mb.color }}>{mb.label}</span>
                      </div>
                    );
                  })()}

                  {/* stage */}
                  <p style={{ fontSize: 12, color: muted }}>{deal.stage} · {deal.sector}</p>

                  {/* pipeline stage selector */}
                  <select
                    value={pipelineMap[deal.id] ?? ""}
                    onChange={e => { e.stopPropagation(); updatePipelineStage(deal.id, e.target.value); }}
                    onClick={e => e.stopPropagation()}
                    style={{
                      padding: "5px 8px", fontSize: 11, fontWeight: 600,
                      background: surf, border: `1px solid ${bdr}`, borderRadius: 6,
                      color: PIPELINE_STAGES.find(s => s.value === (pipelineMap[deal.id] ?? ""))?.color ?? muted,
                      cursor: "pointer", fontFamily: "inherit", width: "100%",
                    }}
                  >
                    <option value="">— Add to pipeline</option>
                    {PIPELINE_STAGES.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  {/* arrow */}
                  <button onClick={() => router.push(`/investor/startup/${deal.id}`)} style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: "pointer" }}>
                    <ChevronRight style={{ height: 13, width: 13, color: muted }} />
                  </button>
                </div>

                {/* ── 4-signal row + highlights ──────────────────────────── */}
                <div style={{ display: "flex", gap: 6, padding: "0 16px 14px 76px", flexWrap: "wrap" }}>
                  {/* Readiness Score */}
                  <span title="Readiness Score — overall Q-Score (effective, decay-adjusted)" style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: deal.weightedQScore >= 80 ? "#ECFDF5" : deal.weightedQScore >= 60 ? "#EFF6FF" : surf, color: deal.weightedQScore >= 80 ? green : deal.weightedQScore >= 60 ? blue : muted, border: `1px solid ${deal.weightedQScore >= 80 ? "#A7F3D0" : deal.weightedQScore >= 60 ? "#BFDBFE" : bdr}` }}>
                    Readiness {deal.weightedQScore}
                  </span>
                  {/* Score freshness */}
                  {deal.qScoreDaysSince !== null && (
                    <span
                      title={`Score updated ${deal.qScoreDaysSince} days ago`}
                      style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: surf, color: deal.qScoreDaysSince < 30 ? green : deal.qScoreDaysSince < 90 ? amber : red, border: `1px solid ${deal.qScoreDaysSince < 30 ? "#A7F3D0" : deal.qScoreDaysSince < 90 ? "#FDE68A" : "#FECACA"}` }}
                    >
                      {deal.qScoreDaysSince < 30 ? "Fresh" : deal.qScoreDaysSince < 90 ? `${deal.qScoreDaysSince}d old` : `Stale ${deal.qScoreDaysSince}d`}
                    </span>
                  )}
                  {/* Signal Strength */}
                  {deal.signalStrength !== null && (
                    <span title="Signal Strength — weighted data-source confidence" style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: deal.signalStrength >= 75 ? "#ECFDF5" : deal.signalStrength >= 50 ? "#FFFBEB" : surf, color: deal.signalStrength >= 75 ? green : deal.signalStrength >= 50 ? amber : muted, border: `1px solid ${deal.signalStrength >= 75 ? "#A7F3D0" : deal.signalStrength >= 50 ? "#FDE68A" : bdr}` }}>
                      Signal {deal.signalStrength}
                    </span>
                  )}
                  {/* Momentum */}
                  {deal.momentumScore !== null && (
                    <span title="Momentum — 30-day score delta vs same-stage cohort" style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: deal.momentumScore >= 10 ? "#FEF2F2" : deal.momentumScore >= 4 ? "#ECFDF5" : surf, color: deal.momentumScore >= 10 ? red : deal.momentumScore >= 4 ? green : muted, border: `1px solid ${deal.momentumScore >= 10 ? "#FECACA" : deal.momentumScore >= 4 ? "#A7F3D0" : bdr}` }}>
                      Momentum {deal.momentumScore > 0 ? `+${deal.momentumScore}` : deal.momentumScore}
                    </span>
                  )}
                  {/* Integrity */}
                  {deal.integrityIndex !== null && (
                    <span title="Integrity Index — corroborated vs flagged claims" style={{ fontSize: 11, padding: "2px 9px", borderRadius: 999, background: deal.integrityIndex >= 80 ? "#ECFDF5" : deal.integrityIndex >= 60 ? "#FFFBEB" : "#FEF2F2", color: deal.integrityIndex >= 80 ? green : deal.integrityIndex >= 60 ? amber : red, border: `1px solid ${deal.integrityIndex >= 80 ? "#A7F3D0" : deal.integrityIndex >= 60 ? "#FDE68A" : "#FECACA"}` }}>
                      Integrity {deal.integrityIndex}
                    </span>
                  )}
                  {/* Highlights */}
                  {deal.highlights.map((h, hi) => (
                    <span key={hi} style={{ fontSize: 11, color: muted, padding: "2px 9px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999 }}>{h}</span>
                  ))}
                  {deal.teamSize && (
                    <span style={{ fontSize: 11, color: muted, padding: "2px 9px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999 }}>
                      {deal.teamSize} person team
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p style={{ marginTop: 48, fontSize: 11, color: muted, opacity: 0.5, textAlign: "center" }}>
          {filtered.length} deals shown · Updated in real-time
        </p>
      </div>
    </div>
  );
}
