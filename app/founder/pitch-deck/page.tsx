"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Presentation, Download, RefreshCw, ChevronLeft, ChevronRight,
  Sparkles, AlertCircle, CheckCircle2, ArrowRight, Layers,
} from "lucide-react";
import Link from "next/link";

// ─── palette ──────────────────────────────────────────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
// ─── slide definitions ────────────────────────────────────────────────────────
const SLIDE_KEYS = [
  "cover", "problem", "solution", "market", "product",
  "traction", "business_model", "competition", "team", "ask",
] as const;

type SlideKey = typeof SLIDE_KEYS[number];

interface Slide {
  key: SlideKey;
  label: string;
  headline: string;
  bullets: string[];
  note: string;
  sourceArtifacts: string[];
  dataConfidence: "high" | "medium" | "low" | "none";
}

// ─── helpers to build slides from raw artifact content ───────────────────────
function buildSlides(artifacts: Record<string, Record<string, unknown>>): Slide[] {
  const gtm       = (artifacts.gtm_playbook       || {}) as Record<string, unknown>;
  const brand     = (artifacts.brand_messaging    || {}) as Record<string, unknown>;
  const financial = (artifacts.financial_summary  || {}) as Record<string, unknown>;
  const matrix    = (artifacts.competitive_matrix || {}) as Record<string, unknown>;
  const hiring    = (artifacts.hiring_plan        || {}) as Record<string, unknown>;

  // typed helpers
  const str  = (v: unknown, fb = "") => (typeof v === "string" ? v : fb);
  const arr  = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  const num  = (v: unknown, fb = 0): number => (typeof v === "number" ? v : fb);

  const taglines = arr((brand as {taglines?: unknown}).taglines);
  const tagline  = taglines[0] ? str((taglines[0] as Record<string, unknown>).tagline) : "";

  const messaging = arr((gtm as {messaging?: unknown}).messaging);
  const firstMsg  = messaging[0] as Record<string, unknown> | undefined;
  const headline  = firstMsg ? str(firstMsg.headline) : "";
  const valueProps: string[] = firstMsg
    ? arr(firstMsg.valueProps).map(v => str(v)).filter(Boolean)
    : [];

  const positioning = (gtm as {positioning?: Record<string, unknown>}).positioning || {};
  const posStmt     = str(positioning.statement) || str((brand as Record<string, unknown>).positioningStatement);
  const differentiators: string[] = arr(positioning.differentiators).map(d => str(d)).filter(Boolean);

  const icp = (gtm as {icp?: Record<string, unknown>}).icp || {};
  const icpSummary   = str(icp.summary);
  const painPoints   = arr(icp.painPoints).map(p => str(p)).filter(Boolean);

  const elevatorPitch = (brand as {elevatorPitch?: Record<string, unknown>}).elevatorPitch || {};
  const oneLiner      = str(elevatorPitch.oneLiner || elevatorPitch.thirtySecond);

  const competitors = arr((matrix as {competitors?: unknown}).competitors);
  const whitespace  = str((matrix as {whitespace?: unknown}).whitespace);

  const snap       = (financial as {snapshot?: Record<string, string>}).snapshot || {};
  const mrrStr     = snap.mrr || snap.MRR || "";
  const burnStr    = snap.monthlyBurn || snap.burn || "";
  const runwayStr  = snap.runway || "";
  const fundraising = (financial as {fundraisingRecommendation?: Record<string, string>}).fundraisingRecommendation || {};
  const askAmount  = str(fundraising.amount);
  const askRationale = str(fundraising.rationale);
  const useOfFunds = arr((financial as {useOfFunds?: unknown}).useOfFunds);
  const keyInsights = arr((financial as {keyInsights?: unknown}).keyInsights).map(s => str(s)).filter(Boolean);

  const nextHires  = arr((hiring as {nextHires?: unknown}).nextHires);
  const cultureValues = arr((hiring as {cultureValues?: unknown}).cultureValues).map(v => str(v)).filter(Boolean);

  function confidence(keys: string[]): "high" | "medium" | "low" | "none" {
    const present = keys.filter(k => artifacts[k]).length;
    if (present === 0) return "none";
    if (present >= keys.length) return "high";
    if (present >= keys.length / 2) return "medium";
    return "low";
  }

  return [
    {
      key: "cover",
      label: "Cover",
      headline: tagline || headline || "Your Company Name",
      bullets: [
        oneLiner || posStmt || "One sentence describing what you do.",
        "Presented by [Founder Name]",
        new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      ].filter(Boolean),
      note: tagline || oneLiner ? "Built from your brand messaging." : "Add your tagline in the Brand Agent.",
      sourceArtifacts: ["brand_messaging", "gtm_playbook"],
      dataConfidence: confidence(["brand_messaging", "gtm_playbook"]),
    },
    {
      key: "problem",
      label: "Problem",
      headline: "The Problem",
      bullets: painPoints.length > 0
        ? painPoints.slice(0, 4)
        : ["Describe the core problem your target customers face.", "How painful is it? How frequent?", "Why hasn't it been solved?"],
      note: icpSummary || "Pain points sourced from your ICP document.",
      sourceArtifacts: ["gtm_playbook", "competitive_matrix"],
      dataConfidence: confidence(["gtm_playbook"]),
    },
    {
      key: "solution",
      label: "Solution",
      headline: posStmt || headline || "Your Solution",
      bullets: valueProps.length > 0
        ? valueProps.slice(0, 4)
        : differentiators.length > 0
        ? differentiators.slice(0, 4)
        : ["Describe your product in clear terms.", "What's the core value you deliver?", "Why now?"],
      note: "Built from your GTM positioning and brand messaging.",
      sourceArtifacts: ["gtm_playbook", "brand_messaging"],
      dataConfidence: confidence(["gtm_playbook", "brand_messaging"]),
    },
    {
      key: "market",
      label: "Market",
      headline: "A Massive Market",
      bullets: [
        whitespace ? `Market gap: ${whitespace}` : "Define your TAM, SAM, SOM.",
        icpSummary ? `ICP: ${icpSummary}` : "Describe your beachhead segment.",
        `${competitors.length} established players — fragmented opportunity`,
        "Why is the timing right now?",
      ].filter(Boolean),
      note: whitespace ? "Market gap sourced from your competitive analysis." : "Run the Atlas agent to fill this slide.",
      sourceArtifacts: ["competitive_matrix", "gtm_playbook"],
      dataConfidence: confidence(["competitive_matrix"]),
    },
    {
      key: "product",
      label: "Product",
      headline: "Built Differently",
      bullets: differentiators.length > 0
        ? differentiators.slice(0, 4)
        : valueProps.slice(0, 4).length > 0
        ? valueProps.slice(0, 4)
        : ["Core differentiating feature #1", "Core differentiating feature #2", "What you can't easily copy"],
      note: "Sourced from positioning differentiators and brand value props.",
      sourceArtifacts: ["gtm_playbook", "brand_messaging"],
      dataConfidence: confidence(["gtm_playbook"]),
    },
    {
      key: "traction",
      label: "Traction",
      headline: "Early Signals",
      bullets: [
        mrrStr ? `MRR: ${mrrStr}` : null,
        burnStr ? `Monthly burn: ${burnStr}` : null,
        runwayStr ? `Runway: ${runwayStr}` : null,
        ...keyInsights.slice(0, 2),
      ].filter(Boolean) as string[],
      note: mrrStr ? "Metrics sourced from Felix's financial summary." : "Run the Felix agent to populate this slide.",
      sourceArtifacts: ["financial_summary"],
      dataConfidence: confidence(["financial_summary"]),
    },
    {
      key: "business_model",
      label: "Business Model",
      headline: "How We Make Money",
      bullets: useOfFunds.length > 0
        ? useOfFunds.slice(0, 4).map(f => {
            const item = f as Record<string, unknown>;
            return `${str(item.category)}: ${num(item.percentage)}% — ${str(item.rationale).substring(0, 60)}`;
          })
        : keyInsights.slice(0, 4),
      note: "Use of funds and unit economics from Felix.",
      sourceArtifacts: ["financial_summary", "gtm_playbook"],
      dataConfidence: confidence(["financial_summary"]),
    },
    {
      key: "competition",
      label: "Competition",
      headline: "Competitive Landscape",
      bullets: competitors.slice(0, 5).map(c => {
        const comp = c as Record<string, unknown>;
        const strengths = arr(comp.strengths).map(s => str(s))[0] || "";
        return `${str(comp.name)} — ${str(comp.positioning || strengths).substring(0, 60)}`;
      }).filter(Boolean).length > 0
        ? competitors.slice(0, 5).map(c => {
            const comp = c as Record<string, unknown>;
            return `${str(comp.name)} — ${str(comp.positioning).substring(0, 60) || arr(comp.strengths).map(s => str(s))[0]?.substring(0, 60) || ""}`;
          }).filter(Boolean)
        : ["No competitive data yet — run the Atlas agent."],
      note: whitespace ? `Our wedge: ${whitespace}` : "Run Atlas to complete this slide.",
      sourceArtifacts: ["competitive_matrix"],
      dataConfidence: confidence(["competitive_matrix"]),
    },
    {
      key: "team",
      label: "Team",
      headline: "The Team",
      bullets: (() => {
        const hireLines = nextHires.slice(0, 4).map(h => {
          const hire = h as Record<string, unknown>;
          return `Hiring: ${str(hire.role)}${str(hire.level) ? ` (${str(hire.level)})` : ""}`;
        }).filter(Boolean);
        return hireLines.length > 0
          ? [...cultureValues.slice(0, 2), ...hireLines.slice(0, 2)]
          : ["[Founder 1] — CEO", "[Founder 2] — CTO", "Advisors: [Name, background]"];
      })(),
      note: "Customize with real team names. Culture values from Harper.",
      sourceArtifacts: ["hiring_plan"],
      dataConfidence: confidence(["hiring_plan"]),
    },
    {
      key: "ask",
      label: "The Ask",
      headline: askAmount ? `Raising ${askAmount}` : "The Ask",
      bullets: [
        askAmount ? `Raising ${askAmount}` : "Define your raise amount.",
        askRationale || "What milestones does this get you to?",
        ...useOfFunds.slice(0, 3).map(f => {
          const item = f as Record<string, unknown>;
          return `${str(item.category)}: ${num(item.percentage)}%`;
        }),
        runwayStr ? `Extends runway to ${runwayStr}` : "",
      ].filter(Boolean),
      note: askAmount ? "Raise amount from Felix's fundraising recommendation." : "Felix can calculate your ideal raise.",
      sourceArtifacts: ["financial_summary"],
      dataConfidence: confidence(["financial_summary"]),
    },
  ];
}

// ─── HTML escape helper (prevents XSS in downloaded deck) ────────────────────
function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─── slide HTML generator ─────────────────────────────────────────────────────
function generateDeckHTML(slides: Slide[], companyName: string): string {
  const slideHTML = slides.map((slide, i) => {
    const isFirst = i === 0;
    const bullets = slide.bullets.filter(Boolean);
    return `
    <section class="slide ${isFirst ? 'cover' : ''}" id="slide-${i + 1}">
      <div class="slide-num">${i + 1} / ${slides.length}</div>
      <div class="slide-content">
        <p class="slide-label">${escapeHtml(slide.label.toUpperCase())}</p>
        <h2 class="slide-headline">${escapeHtml(slide.headline)}</h2>
        <ul class="slide-bullets">
          ${bullets.map(b => `<li>${escapeHtml(b)}</li>`).join("\n          ")}
        </ul>
        ${slide.note ? `<p class="slide-note">${escapeHtml(slide.note)}</p>` : ""}
      </div>
    </section>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(companyName || "Pitch Deck")}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #111; color: white; }
  .nav { position: fixed; bottom: 32px; right: 32px; display: flex; gap: 8px; z-index: 100; }
  .nav button { width: 40px; height: 40px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.1); color: white; font-size: 18px; cursor: pointer; backdrop-filter: blur(8px); }
  .nav button:hover { background: rgba(255,255,255,0.2); }
  .slide { display: none; width: 100vw; height: 100vh; padding: 80px; position: relative; background: linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%); }
  .slide.active { display: flex; flex-direction: column; justify-content: center; }
  .slide.cover { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%); }
  .slide-num { position: absolute; top: 32px; right: 40px; font-size: 12px; color: rgba(255,255,255,0.3); }
  .slide-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.2em; color: rgba(255,255,255,0.4); margin-bottom: 16px; }
  .slide-headline { font-size: clamp(32px, 5vw, 64px); font-weight: 800; line-height: 1.1; color: white; margin-bottom: 32px; max-width: 900px; }
  .slide.cover .slide-headline { font-size: clamp(40px, 6vw, 80px); background: linear-gradient(to right, white, rgba(255,255,255,0.7)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .slide-bullets { list-style: none; display: flex; flex-direction: column; gap: 14px; max-width: 800px; }
  .slide-bullets li { font-size: clamp(16px, 2vw, 24px); color: rgba(255,255,255,0.85); padding-left: 24px; position: relative; line-height: 1.5; }
  .slide-bullets li::before { content: "→"; position: absolute; left: 0; color: #818cf8; }
  .slide.cover .slide-bullets li::before { color: rgba(255,255,255,0.4); }
  .slide-note { position: absolute; bottom: 32px; left: 80px; font-size: 12px; color: rgba(255,255,255,0.25); font-style: italic; }
  @media print {
    .nav { display: none; }
    .slide { display: flex !important; page-break-after: always; height: 100vh; }
  }
</style>
</head>
<body>
${slideHTML}
<div class="nav">
  <button onclick="prev()">‹</button>
  <button onclick="next()">›</button>
</div>
<script>
  let cur = 0;
  const slides = document.querySelectorAll('.slide');
  function show(i) {
    slides.forEach(s => s.classList.remove('active'));
    cur = Math.max(0, Math.min(i, slides.length - 1));
    slides[cur].classList.add('active');
  }
  function next() { show(cur + 1); }
  function prev() { show(cur - 1); }
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') prev();
  });
  show(0);
<\/script>
</body>
</html>`;
}

// ─── confidence badge ─────────────────────────────────────────────────────────
function ConfidenceDot({ level }: { level: Slide["dataConfidence"] }) {
  const colors: Record<string, string> = {
    high: green, medium: amber, low: "#DC2626", none: muted,
  };
  const labels: Record<string, string> = {
    high: "Data-backed", medium: "Partial data", low: "Sparse data", none: "No data",
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, color: colors[level], fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: colors[level], display: "inline-block" }} />
      {labels[level]}
    </span>
  );
}

// ─── slide preview card ────────────────────────────────────────────────────────
function SlideCard({ slide, active, onClick }: { slide: Slide; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%", textAlign: "left", background: active ? "white" : surf,
        border: `1px solid ${active ? blue : bdr}`, borderRadius: 10,
        padding: "12px 14px", cursor: "pointer",
        boxShadow: active ? `0 0 0 2px ${blue}22` : "none",
        transition: "all 0.15s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: active ? blue : muted }}>
          {slide.label}
        </p>
        <ConfidenceDot level={slide.dataConfidence} />
      </div>
      <p style={{ fontSize: 12, fontWeight: 600, color: ink, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {slide.headline}
      </p>
    </button>
  );
}

// ─── main slide preview ────────────────────────────────────────────────────────
function SlidePreview({ slide }: { slide: Slide }) {
  const isCover = slide.key === "cover";
  return (
    <motion.div
      key={slide.key}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: isCover
          ? "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4f46e5 100%)"
          : "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 100%)",
        borderRadius: 16,
        padding: "48px 52px",
        minHeight: 380,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* slide number */}
      <p style={{ position: "absolute", top: 20, right: 24, fontSize: 11, color: "rgba(255,255,255,0.2)" }}>
        {SLIDE_KEYS.indexOf(slide.key) + 1} / {SLIDE_KEYS.length}
      </p>

      {/* label */}
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.35)", marginBottom: 12 }}>
        {slide.label}
      </p>

      {/* headline */}
      <h2 style={{
        fontSize: isCover ? 40 : 32,
        fontWeight: 800,
        color: "white",
        lineHeight: 1.1,
        marginBottom: 28,
        maxWidth: 560,
        background: isCover ? "linear-gradient(to right, white, rgba(255,255,255,0.75))" : undefined,
        WebkitBackgroundClip: isCover ? "text" : undefined,
        WebkitTextFillColor: isCover ? "transparent" : undefined,
      }}>
        {slide.headline}
      </h2>

      {/* bullets */}
      <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 10, maxWidth: 560 }}>
        {slide.bullets.filter(Boolean).map((b, i) => (
          <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: isCover ? "rgba(255,255,255,0.4)" : "#818cf8", fontWeight: 700, flexShrink: 0, fontSize: 14 }}>→</span>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.82)", lineHeight: 1.5 }}>{b}</p>
          </li>
        ))}
      </ul>

      {/* source note */}
      {slide.note && (
        <p style={{ position: "absolute", bottom: 18, left: 52, fontSize: 10, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>
          {slide.note}
        </p>
      )}
    </motion.div>
  );
}

// ─── page component ────────────────────────────────────────────────────────────
export default function PitchDeckPage() {
  const [slides, setSlides]             = useState<Slide[]>([]);
  const [activeSlide, setActiveSlide]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [companyName, setCompanyName]   = useState("Your Company");
  const [artifactCount, setArtifactCount] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setSlides(buildSlides({})); setLoading(false); return; }

        // Fetch the latest artifact of each relevant type
        const relevantTypes = [
          "gtm_playbook", "brand_messaging", "financial_summary",
          "competitive_matrix", "hiring_plan",
        ];

        const { data: rows } = await supabase
          .from("agent_artifacts")
          .select("artifact_type, content, title")
          .eq("user_id", user.id)
          .in("artifact_type", relevantTypes)
          .order("created_at", { ascending: false });

        const artifacts: Record<string, Record<string, unknown>> = {};
        for (const row of (rows || [])) {
          if (!artifacts[row.artifact_type]) {
            artifacts[row.artifact_type] = row.content as Record<string, unknown>;
          }
        }
        setArtifactCount(Object.keys(artifacts).length);

        // Try to extract company name from GTM
        const gtm   = artifacts.gtm_playbook   as { messaging?: { headline?: string }[] } | undefined;
        if (gtm?.messaging?.[0]?.headline) {
          const parts = gtm.messaging[0].headline.split(" for ");
          if (parts[0]) setCompanyName(parts[0]);
        }

        setSlides(buildSlides(artifacts));
      } catch (e) {
        console.error("Pitch deck load error:", e);
        setSlides(buildSlides({}));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function handleDownload() {
    const html = generateDeckHTML(slides, companyName);
    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `${companyName.replace(/\s+/g, "_").toLowerCase()}_pitch_deck.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handlePrev() { setActiveSlide(i => Math.max(0, i - 1)); }
  function handleNext() { setActiveSlide(i => Math.min(SLIDE_KEYS.length - 1, i + 1)); }

  const current = slides[activeSlide];
  const highCount   = slides.filter(s => s.dataConfidence === "high").length;
  const missingCount = slides.filter(s => s.dataConfidence === "none").length;

  if (loading) {
    return (
      <div style={{ background: bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <RefreshCw size={24} color={muted} />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: "100vh", padding: "32px 40px" }}>
      {/* header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <Presentation size={20} color={blue} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: ink }}>Pitch Deck</h1>
            {artifactCount > 0 && (
              <span style={{ padding: "2px 8px", borderRadius: 999, background: "#EFF6FF", color: blue, fontSize: 11, fontWeight: 600 }}>
                {artifactCount} agent{artifactCount !== 1 ? "s" : ""} connected
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: muted }}>
            Auto-built from your agent deliverables. Edit company name, then download.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={handleDownload}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 18px", borderRadius: 9, background: ink, border: "none",
              fontSize: 13, fontWeight: 600, color: "white", cursor: "pointer",
            }}
          >
            <Download size={15} />
            Download HTML
          </button>
        </div>
      </div>

      {/* company name editor */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
        <span style={{ fontSize: 12, color: muted }}>Company name:</span>
        <input
          value={companyName}
          onChange={e => setCompanyName(e.target.value)}
          style={{
            fontSize: 14, fontWeight: 600, color: ink,
            background: "white", border: `1px solid ${bdr}`, borderRadius: 8,
            padding: "6px 12px", outline: "none", width: 220,
          }}
          placeholder="Your Company"
        />
      </div>

      {/* readiness bar */}
      <div style={{ background: surf, borderRadius: 12, padding: "14px 18px", border: `1px solid ${bdr}`, marginBottom: 28, display: "flex", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={16} color={green} />
          <span style={{ fontSize: 13, color: ink }}><strong>{highCount}</strong> slides data-backed</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={16} color={missingCount > 0 ? amber : green} />
          <span style={{ fontSize: 13, color: ink }}>
            {missingCount > 0
              ? <><strong>{missingCount}</strong> slides need agent work</>
              : "All slides have data"}
          </span>
        </div>
        {missingCount > 0 && (
          <Link href="/founder/agents" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: blue, fontWeight: 600, textDecoration: "none" }}>
            Run missing agents <ArrowRight size={13} />
          </Link>
        )}
      </div>

      {/* main layout */}
      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 24 }}>
        {/* slide nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 4 }}>
            <Layers size={12} style={{ display: "inline", marginRight: 4 }} />
            10 Slides
          </p>
          {slides.map((slide, i) => (
            <SlideCard
              key={slide.key}
              slide={slide}
              active={i === activeSlide}
              onClick={() => setActiveSlide(i)}
            />
          ))}
        </div>

        {/* slide preview + nav */}
        <div>
          <AnimatePresence mode="wait">
            {current && <SlidePreview key={current.key} slide={current} />}
          </AnimatePresence>

          {/* prev / next */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
            <button
              onClick={handlePrev}
              disabled={activeSlide === 0}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`,
                background: activeSlide === 0 ? surf : "white", color: activeSlide === 0 ? muted : ink,
                fontSize: 13, fontWeight: 600, cursor: activeSlide === 0 ? "default" : "pointer",
              }}
            >
              <ChevronLeft size={15} /> Previous
            </button>

            {/* data sources for this slide */}
            <div style={{ display: "flex", gap: 6 }}>
              {current?.sourceArtifacts.map(a => (
                <span key={a} style={{ padding: "4px 8px", borderRadius: 6, background: surf, border: `1px solid ${bdr}`, fontSize: 10, color: muted, fontWeight: 500 }}>
                  {a.replace(/_/g, " ")}
                </span>
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={activeSlide === SLIDE_KEYS.length - 1}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`,
                background: activeSlide === SLIDE_KEYS.length - 1 ? surf : "white",
                color: activeSlide === SLIDE_KEYS.length - 1 ? muted : ink,
                fontSize: 13, fontWeight: 600,
                cursor: activeSlide === SLIDE_KEYS.length - 1 ? "default" : "pointer",
              }}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>

          {/* agent CTA if slide has no data */}
          {current?.dataConfidence === "none" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ marginTop: 16, background: "#FFFBEB", borderRadius: 10, padding: "14px 16px", border: `1px solid #FDE68A`, display: "flex", alignItems: "center", gap: 12 }}
            >
              <Sparkles size={16} color={amber} />
              <p style={{ fontSize: 13, color: "#92400E", flex: 1 }}>
                This slide has no data yet. Run the{" "}
                {current.sourceArtifacts.map((a, i) => (
                  <span key={a}>
                    <Link href={`/founder/agents/${a.split("_")[0] === "gtm" ? "patel" : a.split("_")[0] === "brand" ? "maya" : a.split("_")[0] === "financial" ? "felix" : a.split("_")[0] === "competitive" ? "atlas" : a.split("_")[0] === "hiring" ? "harper" : a.split("_")[0]}`} style={{ color: blue, fontWeight: 600, textDecoration: "none" }}>
                      {a.replace(/_/g, " ")}
                    </Link>
                    {i < current.sourceArtifacts.length - 1 ? " or " : ""}
                  </span>
                ))}{" "}
                agent to populate it.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
