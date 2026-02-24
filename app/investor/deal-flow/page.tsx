"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, TrendingUp, Sparkles, ChevronRight } from "lucide-react";
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
  stage: string;
  sector: string;
  location: string;
  fundingGoal: string;
  valuation: string;
  matchScore: number;
  addedDate: string;
  founder: { name: string; title: string };
  highlights: string[];
  momentum: "hot" | "trending" | "steady";
  viewed: boolean;
}

function momentumStyle(m: Deal["momentum"]) {
  if (m === "hot")      return { color: red,   bg: "#FEF2F2", label: "Hot",      Icon: Sparkles }
  if (m === "trending") return { color: amber, bg: "#FFFBEB", label: "Trending", Icon: TrendingUp }
  return                       { color: muted, bg: surf,      label: "Steady",   Icon: undefined }
}

// ─── component ────────────────────────────────────────────────────────────────
export default function DealFlowPage() {
  const router = useRouter();
  const [searchTerm,     setSearchTerm]     = useState("");
  const [selectedStage,  setSelectedStage]  = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [activeTab,      setActiveTab]      = useState<"all" | "hot" | "new" | "high-match">("all");
  const [deals,          setDeals]          = useState<Deal[]>([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    fetch("/api/investor/deal-flow")
      .then(r => r.json())
      .then(data => {
        if (data.founders && data.founders.length > 0) {
          setDeals(data.founders.map((f: {
            id: string; name: string; tagline: string; qScore: number; stage: string;
            sector: string; location: string; fundingGoal: string; lastActive: string;
            founder: { name: string }; hasScore: boolean;
          }) => ({
            id: f.id,
            name: f.name,
            tagline: f.tagline || f.sector,
            qScore: f.qScore,
            stage: f.stage || "Unknown",
            sector: f.sector || "Other",
            location: f.location || "",
            fundingGoal: f.fundingGoal || "",
            valuation: "",
            matchScore: Math.min(99, f.qScore + 10),
            addedDate: new Date(f.lastActive).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            founder: { name: f.founder?.name || "Founder", title: "Founder" },
            highlights: [f.sector, f.stage].filter(Boolean) as string[],
            momentum: (f.qScore >= 80 ? "hot" : f.qScore >= 65 ? "trending" : "steady") as Deal["momentum"],
            viewed: false,
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
      || (activeTab === "new"        && !d.viewed)
      || (activeTab === "high-match" && d.matchScore >= 90);
    return matchSearch && matchStage && matchSector && matchTab;
  });

  const tabs = [
    { key: "all"        as const, label: `All (${deals.length})` },
    { key: "hot"        as const, label: `Hot (${deals.filter(d => d.momentum === "hot").length})` },
    { key: "new"        as const, label: `New (${deals.filter(d => !d.viewed).length})` },
    { key: "high-match" as const, label: `High Match (${deals.filter(d => d.matchScore >= 90).length})` },
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

        {/* filters */}
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
        </div>

        {/* tabs */}
        <div style={{ display: "flex", borderBottom: `1px solid ${bdr}`, marginBottom: 0 }}>
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{ padding: "10px 16px", fontSize: 12, fontWeight: 500, color: activeTab === tab.key ? ink : muted, background: "transparent", border: "none", cursor: "pointer", borderBottom: activeTab === tab.key ? `2px solid ${ink}` : "2px solid transparent", transition: "color .15s", fontFamily: "inherit" }}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* table header */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 120px 120px 44px", gap: 12, padding: "10px 16px", borderBottom: `1px solid ${bdr}` }}>
          {["Company", "Q-Score", "Match", "Stage", "Seeking", ""].map((h, i) => (
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
                <div style={{ display: "grid", gridTemplateColumns: "2fr 80px 80px 120px 120px 44px", gap: 12, padding: "16px 16px", alignItems: "center" }}>

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
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.name}</p>
                        {MIcon && (
                          <div style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 7px", background: ms.bg, borderRadius: 999 }}>
                            <MIcon style={{ height: 9, width: 9, color: ms.color }} />
                            <span style={{ fontSize: 10, color: ms.color, fontWeight: 600 }}>{ms.label}</span>
                          </div>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{deal.founder.name} · {deal.location}</p>
                    </div>
                  </div>

                  {/* q-score */}
                  <p style={{ fontSize: 15, fontWeight: 700, color: deal.qScore >= 85 ? green : deal.qScore >= 78 ? blue : muted }}>{deal.qScore}</p>

                  {/* match */}
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{deal.matchScore}%</p>
                    <div style={{ height: 3, background: bdr, borderRadius: 99, marginTop: 3, width: "80%" }}>
                      <div style={{ height: "100%", background: blue, borderRadius: 99, width: `${deal.matchScore}%` }} />
                    </div>
                  </div>

                  {/* stage */}
                  <p style={{ fontSize: 12, color: muted }}>{deal.stage} · {deal.sector}</p>

                  {/* seeking */}
                  <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>{deal.fundingGoal}</p>

                  {/* arrow */}
                  <button onClick={() => router.push(`/investor/startup/${deal.id}`)} style={{ height: 32, width: 32, display: "flex", alignItems: "center", justifyContent: "center", background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: "pointer" }}>
                    <ChevronRight style={{ height: 13, width: 13, color: muted }} />
                  </button>
                </div>

                {/* highlights */}
                <div style={{ display: "flex", gap: 6, padding: "0 16px 14px 76px", flexWrap: "wrap" }}>
                  {deal.highlights.map((h, hi) => (
                    <span key={hi} style={{ fontSize: 11, color: muted, padding: "2px 9px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999 }}>{h}</span>
                  ))}
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
