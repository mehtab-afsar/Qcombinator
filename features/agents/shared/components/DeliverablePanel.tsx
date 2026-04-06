'use client'

import { useState, useRef } from 'react'
import { FileText, X, Highlighter, Share2, Download, RefreshCw } from 'lucide-react'
import { bg, surf, bdr, ink, muted, blue, green, amber, red } from '../constants/colors'
import { ARTIFACT_META } from '../constants/artifact-meta'
import { computeQualityScore, artifactToText } from '../utils'
import { CopyBtn } from './CopyBtn'
import { ShareModal } from './ShareModal'
import type { ArtifactCritiqueMetadata } from '../../types/agent.types'
import { ICPRenderer } from '../../patel/components/ICPRenderer'
import { OutreachRenderer } from '../../patel/components/OutreachRenderer'
import { BattleCardRenderer } from '../../patel/components/BattleCardRenderer'
import { PlaybookRenderer } from '../../patel/components/PlaybookRenderer'
import { SalesScriptRenderer } from '../../susi/components/SalesScriptRenderer'
import { BrandMessagingRenderer } from '../../maya/components/BrandMessagingRenderer'
import { FinancialSummaryRenderer } from '../../felix/components/FinancialSummaryRenderer'
import { LegalChecklistRenderer } from '../../leo/components/LegalChecklistRenderer'
import { HiringPlanRenderer } from '../../harper/components/HiringPlanRenderer'
import { PMFSurveyRenderer } from '../../nova/components/PMFSurveyRenderer'
import { CompetitiveMatrixRenderer } from '../../atlas/components/CompetitiveMatrixRenderer'
import { StrategicPlanRenderer } from '../../sage/components/StrategicPlanRenderer'
import type { ArtifactData } from '../../types/agent.types'

export function DeliverablePanel({
  artifact,
  artifactHistory,
  onSelectArtifact,
  onClose,
  onRefine,
  agentName = "the agent",
  userId,
  actionsOnly = false,
}: {
  artifact: ArtifactData;
  artifactHistory: ArtifactData[];
  onSelectArtifact: (a: ArtifactData) => void;
  onClose: () => void;
  onRefine: (feedback: string) => void;
  agentName?: string;
  userId?: string;
  actionsOnly?: boolean;
}) {
  const [refineInput,       setRefineInput]       = useState("");
  const [reviseMode,        setReviseMode]        = useState(false);
  const [selectedText,      setSelectedText]      = useState("");
  const [reviseInstruction, setReviseInstruction] = useState("");
  const [showShare,         setShowShare]         = useState(false);
  const [showCritique,      setShowCritique]      = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const critique = artifact.critiqueMetadata as ArtifactCritiqueMetadata | undefined;

  const meta    = ARTIFACT_META[artifact.type];
  const Icon    = meta?.icon || FileText;
  const quality = computeQualityScore(artifact);

  const handleContentMouseUp = () => {
    if (!reviseMode) return;
    const sel = window.getSelection()?.toString().trim() ?? "";
    if (sel.length > 5) setSelectedText(sel);
  };

  const submitRevision = () => {
    if (!reviseInstruction.trim() || !selectedText) return;
    const msg = `Please revise the following section of the ${meta?.label ?? "document"}:\n\n"${selectedText.slice(0, 300)}${selectedText.length > 300 ? "…" : ""}"\n\nInstruction: ${reviseInstruction.trim()}`;
    onRefine(msg);
    setReviseInstruction("");
    setSelectedText("");
    setReviseMode(false);
  };

  const handleHTMLDownload = () => {
    const c = artifact.content as Record<string, unknown>;
    const title = (c.title as string | undefined) ?? "Landing Page";
    const pos = c.positioning as Record<string, unknown> | undefined;
    const msg = (c.messaging as { audience?: string; headline?: string; valueProps?: string[] }[] | undefined) ?? [];
    const icp = c.icp as Record<string, unknown> | undefined;
    const headline = (msg[0]?.headline) ?? (pos?.statement as string | undefined) ?? "The product built for you";
    const valueProps: string[] = msg[0]?.valueProps ?? (pos?.differentiators as string[] | undefined) ?? [];
    const icpText = (icp?.summary as string | undefined) ?? "";
    const differentiators: string[] = (pos?.differentiators as string[] | undefined) ?? [];
    const companyName = title.replace(/^GTM Playbook:\s*/i, "").trim() || "Your Company";

    const featureCards = valueProps.slice(0, 3).map(vp => `
      <div class="feature-card">
        <div class="feature-icon">✦</div>
        <p>${vp}</p>
      </div>`).join("");

    const diffList = differentiators.slice(0, 4).map(d => `<li>${d}</li>`).join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${companyName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; }
    nav { display: flex; justify-content: space-between; align-items: center; padding: 20px 48px; border-bottom: 1px solid #E2DDD5; background: #F9F7F2; position: sticky; top: 0; z-index: 10; }
    nav .logo { font-weight: 700; font-size: 18px; }
    nav a { text-decoration: none; color: #18160F; font-size: 14px; font-weight: 500; padding: 8px 18px; border: 1px solid #E2DDD5; border-radius: 999px; transition: background .15s; }
    nav a:hover { background: #E2DDD5; }
    .hero { max-width: 820px; margin: 0 auto; padding: 100px 24px 80px; text-align: center; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; background: #F0EDE6; border: 1px solid #E2DDD5; border-radius: 999px; padding: 5px 14px; margin-bottom: 24px; color: #8A867C; }
    h1 { font-size: clamp(2rem, 5vw, 3.2rem); font-weight: 300; line-height: 1.2; letter-spacing: -.02em; margin-bottom: 20px; color: #18160F; }
    .subtitle { font-size: 18px; font-weight: 300; color: #8A867C; line-height: 1.6; max-width: 580px; margin: 0 auto 36px; }
    .cta-row { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .cta-primary { padding: 14px 32px; background: #18160F; color: #F9F7F2; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; transition: opacity .15s; }
    .cta-primary:hover { opacity: .85; }
    .cta-secondary { padding: 14px 24px; background: transparent; color: #18160F; border: 1px solid #E2DDD5; border-radius: 10px; font-size: 15px; cursor: pointer; text-decoration: none; display: inline-block; transition: background .15s; }
    .cta-secondary:hover { background: #F0EDE6; }
    .features { max-width: 1000px; margin: 80px auto; padding: 0 24px; display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; }
    .feature-card { background: #fff; border: 1px solid #E2DDD5; border-radius: 16px; padding: 28px 24px; }
    .feature-icon { font-size: 24px; margin-bottom: 14px; }
    .feature-card p { font-size: 15px; color: #18160F; line-height: 1.6; font-weight: 300; }
    .icp-section { max-width: 760px; margin: 0 auto 80px; padding: 0 24px; text-align: center; }
    .icp-section h2 { font-size: 24px; font-weight: 300; margin-bottom: 14px; }
    .icp-section p { font-size: 15px; font-weight: 300; color: #8A867C; line-height: 1.7; }
    .why { max-width: 640px; margin: 0 auto 100px; padding: 0 24px; }
    .why h2 { font-size: 22px; font-weight: 500; margin-bottom: 16px; }
    .why ul { list-style: none; }
    .why ul li { padding: 10px 0; border-bottom: 1px solid #E2DDD5; font-size: 15px; color: #18160F; font-weight: 300; }
    .why ul li::before { content: "→  "; color: #2563EB; font-weight: 700; }
    footer { padding: 32px; text-align: center; border-top: 1px solid #E2DDD5; font-size: 12px; color: #8A867C; }
  </style>
</head>
<body>
  <nav>
    <div class="logo">${companyName}</div>
    <a href="#waitlist">Get early access</a>
  </nav>
  <div class="hero">
    <div class="badge">Now in early access</div>
    <h1>${headline}</h1>
    <p class="subtitle">${icpText || "Built for the teams who move fast and need clarity."}</p>
    <div class="cta-row">
      <a href="#waitlist" class="cta-primary" id="waitlist">Get early access →</a>
      <a href="#" class="cta-secondary">See how it works</a>
    </div>
  </div>
  ${featureCards ? `<div class="features">${featureCards}</div>` : ""}
  ${icpText ? `<div class="icp-section"><h2>Made for teams like yours</h2><p>${icpText}</p></div>` : ""}
  ${diffList ? `<div class="why"><h2>Why ${companyName}?</h2><ul>${diffList}</ul></div>` : ""}
  <footer>
    <p>${companyName} · Built with Edge Alpha</p>
  </footer>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${companyName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_landing.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCSV = () => {
    const c = artifact.content as Record<string, unknown>;
    const rows: string[][] = [["Metric", "Value"]];

    const addRow = (label: string, val: unknown) => {
      if (val == null || val === "") return;
      rows.push([label, String(val)]);
    };

    const scalars: Record<string, string> = {
      mrr:            "MRR ($)",
      arr:            "ARR ($)",
      monthlyBurn:    "Monthly Burn ($)",
      runway:         "Runway (months)",
      grossMargin:    "Gross Margin (%)",
      cac:            "CAC ($)",
      ltv:            "LTV ($)",
      ltvCacRatio:    "LTV:CAC Ratio",
      paybackPeriod:  "Payback Period (months)",
      fundingAsk:     "Funding Ask ($)",
      useOfFunds:     "Use of Funds Summary",
    };
    for (const [key, label] of Object.entries(scalars)) {
      if (c[key] != null) addRow(label, c[key]);
    }

    const ue = c.unitEconomics as Record<string, unknown> | undefined;
    if (ue) {
      for (const [k, v] of Object.entries(ue)) {
        addRow(`Unit Economics — ${k}`, v);
      }
    }

    const rp = c.revenueProjections as Array<Record<string, unknown>> | undefined;
    if (rp && rp.length > 0) {
      rows.push(["", ""]);
      rows.push(["Revenue Projections", ""]);
      const headers = Object.keys(rp[0]);
      rows.push(headers);
      for (const row of rp) rows.push(headers.map(h => String(row[h] ?? "")));
    }

    const csv = rows.map(r =>
      r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${artifact.title.replace(/[^a-z0-9]/gi, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderContent = () => {
    switch (artifact.type) {
      case "icp_document":       return <ICPRenderer data={artifact.content} />;
      case "outreach_sequence":  return <OutreachRenderer data={artifact.content} artifactId={artifact.id ?? undefined} sequenceName={artifact.title} />;
      case "battle_card":        return <BattleCardRenderer data={artifact.content} />;
      case "gtm_playbook":       return <PlaybookRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      case "sales_script":       return <SalesScriptRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      case "brand_messaging":    return <BrandMessagingRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      case "financial_summary":  return <FinancialSummaryRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      case "legal_checklist":    return <LegalChecklistRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      case "hiring_plan":        return <HiringPlanRenderer data={artifact.content} artifactId={artifact.id ?? undefined} userId={userId ?? undefined} />;
      case "pmf_survey":         return <PMFSurveyRenderer data={artifact.content} artifactId={artifact.id ?? undefined} userId={userId ?? undefined} />;
      case "competitive_matrix": return <CompetitiveMatrixRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      case "strategic_plan":     return <StrategicPlanRenderer data={artifact.content} artifactId={artifact.id ?? undefined} />;
      default:                   return <pre style={{ fontSize: 11, color: muted, whiteSpace: "pre-wrap" }}>{JSON.stringify(artifact.content, null, 2)}</pre>;
    }
  };

  return (
    <div style={{
      width: 420, flexShrink: 0,
      borderLeft: `1px solid ${bdr}`,
      background: bg,
      display: "flex", flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* panel header */}
      {actionsOnly ? (
        <div style={{ flexShrink: 0 }}>
          <div style={{ height: 3, background: "linear-gradient(90deg, #2563EB, #818CF8, #2563EB)", backgroundSize: "200% 100%", borderRadius: "0 0 2px 2px" }} />
          <div style={{ padding: "14px 18px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ height: 34, width: 34, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg, #EFF6FF, #EDE9FE)", border: "1.5px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: blue }}>
                {agentName[0]}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 2 }}>{agentName}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ height: 6, width: 6, borderRadius: "50%", background: green }} />
                  <p style={{ fontSize: 10, color: muted, fontWeight: 500, letterSpacing: "0.02em" }}>AI Actions ready</p>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: "none", border: `1px solid ${bdr}`, cursor: "pointer", color: muted, display: "flex", padding: "5px 6px", borderRadius: 7, transition: "border-color .15s, color .15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ink; (e.currentTarget as HTMLElement).style.color = ink; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; (e.currentTarget as HTMLElement).style.color = muted; }}
            >
              <X size={14} />
            </button>
          </div>
          <div style={{ height: 1, background: bdr }} />
        </div>
      ) : (
        <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
          {/* Full deliverable header */}
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon size={14} style={{ color: meta?.color || blue }} />
                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: meta?.color || blue }}>
                  {meta?.label || artifact.type}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <button
                  onClick={() => { setReviseMode(m => !m); setSelectedText(""); setReviseInstruction(""); }}
                  title="Revise mode: select text to rewrite a section"
                  style={{
                    background: reviseMode ? amber : "none",
                    border: `1px solid ${reviseMode ? amber : bdr}`,
                    borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: reviseMode ? "#fff" : muted,
                    transition: "background .15s, color .15s",
                  }}
                >
                  <Highlighter size={11} />
                  {reviseMode ? "Revising" : "Revise"}
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  title="Share with co-founder"
                  style={{
                    background: "none", border: `1px solid ${bdr}`,
                    borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 4,
                    fontSize: 11, color: muted,
                    transition: "border-color .15s, color .15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = blue; (e.currentTarget as HTMLElement).style.borderColor = blue; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = muted; (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                >
                  <Share2 size={11} />
                  Share
                </button>
                {artifact.type === "financial_summary" && (
                  <button
                    onClick={handleCSV}
                    title="Download as CSV — open in Excel or Google Sheets"
                    style={{
                      background: "none", border: `1px solid ${bdr}`,
                      borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 11, color: green,
                      transition: "border-color .15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = green; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                  >
                    <Download size={11} />
                    CSV
                  </button>
                )}
                {artifact.type === "gtm_playbook" && (
                  <button
                    onClick={handleHTMLDownload}
                    title="Download a ready-to-host landing page HTML file"
                    style={{
                      background: "none", border: `1px solid ${bdr}`,
                      borderRadius: 6, padding: "4px 8px", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 4,
                      fontSize: 11, color: blue,
                      transition: "border-color .15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = blue; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                  >
                    <Download size={11} />
                    HTML
                  </button>
                )}
                <CopyBtn text={artifactToText(artifact)} />
                <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: muted, display: "flex", padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: ink, lineHeight: 1.3 }}>
              {artifact.title || meta?.label}
            </p>

            {/* quality score bar */}
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, height: 4, borderRadius: 999, background: bdr, overflow: "hidden" }}>
                <div style={{
                  width: `${quality.pct}%`, height: "100%", borderRadius: 999,
                  background: quality.pct >= 90 ? green : quality.pct >= 70 ? blue : quality.pct >= 50 ? amber : red,
                  transition: "width .4s ease",
                }} />
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, flexShrink: 0,
                color: quality.pct >= 90 ? green : quality.pct >= 70 ? blue : quality.pct >= 50 ? amber : red,
              }}>
                {quality.pct}% · {quality.label}
              </span>
            </div>
            {quality.missing.length > 0 && quality.pct < 90 && (
              <p style={{ fontSize: 10, color: muted, marginTop: 4, lineHeight: 1.4 }}>
                Missing: {quality.missing.slice(0, 3).join(", ")}{quality.missing.length > 3 ? ` +${quality.missing.length - 3} more` : ""}
                {" — "}<span style={{ color: blue }}>ask {agentName} to complete it</span>
              </p>
            )}

            {/* Quality Review (from self-critique pass) */}
            {critique && (
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setShowCritique(v => !v)}
                  style={{
                    fontSize: 10, fontWeight: 600, color: blue,
                    background: "none", border: "none", padding: 0,
                    cursor: "pointer", textDecoration: "underline", fontFamily: "inherit",
                  }}
                >
                  {showCritique ? "Hide" : "Show"} Quality Review
                  {critique.overallRating === 'excellent' ? ' ✓' : critique.overallRating === 'needs_improvement' ? ' ⚠' : ''}
                </button>
                {showCritique && (
                  <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 8, background: surf, border: `1px solid ${bdr}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                      AI Quality Review · {critique.overallRating.replace(/_/g, ' ')}
                    </div>
                    {critique.sections.map(s => (
                      <div key={s.section} style={{ display: "flex", gap: 8, marginBottom: 5, alignItems: "flex-start" }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "1px 5px", borderRadius: 4, flexShrink: 0,
                          background: s.rating === 'complete' ? '#DCFCE7' : s.rating === 'adequate' ? '#EFF6FF' : s.rating === 'weak' ? '#FEF3C7' : '#FEE2E2',
                          color: s.rating === 'complete' ? green : s.rating === 'adequate' ? blue : s.rating === 'weak' ? amber : red,
                        }}>
                          {s.rating.toUpperCase()}
                        </span>
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: ink }}>{s.section}</span>
                          {s.improvement && (
                            <div style={{ fontSize: 11, color: muted, marginTop: 1, lineHeight: 1.4 }}>{s.improvement}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        </div>
      )}

      {/* artifact tabs (if multiple) */}
      {artifactHistory.length > 1 && (
        <div style={{ display: "flex", gap: 6, padding: "10px 18px", borderBottom: `1px solid ${bdr}`, overflowX: "auto", flexShrink: 0 }}>
          {artifactHistory.map((a, i) => {
            const m = ARTIFACT_META[a.type];
            const AIcon = m?.icon || FileText;
            const isActive = a.id === artifact.id;
            return (
              <button
                key={a.id || i}
                onClick={() => onSelectArtifact(a)}
                style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500,
                  background: isActive ? surf : "transparent",
                  border: `1px solid ${isActive ? bdr : "transparent"}`,
                  color: isActive ? ink : muted,
                  cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                <AIcon size={11} />
                {m?.label || a.type}
              </button>
            );
          })}
        </div>
      )}

      {/* revise mode hint */}
      {reviseMode && (
        <div style={{ padding: "8px 18px", background: "#FFFBEB", borderBottom: `1px solid #F5E6B8`, flexShrink: 0 }}>
          <p style={{ fontSize: 11, color: "#92400E" }}>
            <Highlighter size={11} style={{ display: "inline", marginRight: 4 }} />
            {selectedText
              ? `Selected: "${selectedText.slice(0, 60)}${selectedText.length > 60 ? "…" : ""}" — type your instruction below`
              : "Select any text in the document below to rewrite just that section"}
          </p>
        </div>
      )}

      {/* scrollable content */}
      <div
        ref={contentRef}
        onMouseUp={handleContentMouseUp}
        style={{
          flex: 1, overflowY: "auto", padding: "18px",
          userSelect: reviseMode ? "text" : "auto",
          cursor: reviseMode ? "text" : "default",
        }}
      >
        {renderContent()}
      </div>

      {/* bottom: revision bar (when text selected) OR regular refine */}
      <div style={{ padding: "12px 18px", borderTop: `1px solid ${bdr}`, flexShrink: 0 }}>
        {reviseMode && selectedText ? (
          /* revision instruction input */
          <div>
            <p style={{ fontSize: 10, color: amber, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
              Rewrite instruction
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={reviseInstruction}
                onChange={(e) => setReviseInstruction(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submitRevision(); }}
                placeholder={`e.g. "make this more concise" or "add urgency"`}
                autoFocus
                style={{
                  flex: 1, padding: "9px 12px", borderRadius: 8,
                  background: "#FFFBEB", border: `1px solid ${amber}`, fontSize: 12,
                  color: ink, outline: "none", fontFamily: "inherit",
                }}
              />
              <button
                onClick={submitRevision}
                disabled={!reviseInstruction.trim()}
                style={{
                  padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: reviseInstruction.trim() ? amber : surf,
                  color: reviseInstruction.trim() ? "#fff" : muted,
                  border: "none", cursor: reviseInstruction.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                <RefreshCw size={12} /> Apply
              </button>
            </div>
          </div>
        ) : (
          /* standard refine input */
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={refineInput}
              onChange={(e) => setRefineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && refineInput.trim()) {
                  onRefine(refineInput.trim());
                  setRefineInput("");
                }
              }}
              placeholder={reviseMode ? "Select text above to rewrite it…" : `Ask ${agentName} to refine this…`}
              disabled={reviseMode && !selectedText}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: 8,
                background: surf, border: `1px solid ${bdr}`, fontSize: 12,
                color: ink, outline: "none", fontFamily: "inherit",
                opacity: reviseMode && !selectedText ? 0.5 : 1,
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = blue; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = bdr; }}
            />
            <button
              onClick={() => { if (refineInput.trim()) { onRefine(refineInput.trim()); setRefineInput(""); } }}
              disabled={!refineInput.trim() || (reviseMode && !selectedText)}
              style={{
                padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: refineInput.trim() ? blue : surf,
                color: refineInput.trim() ? "#fff" : muted,
                border: "none", cursor: refineInput.trim() ? "pointer" : "not-allowed",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <RefreshCw size={12} /> Refine
            </button>
          </div>
        )}
      </div>

      {/* share modal */}
      {showShare && <ShareModal artifact={artifact} onClose={() => setShowShare(false)} />}
    </div>
  );
}
