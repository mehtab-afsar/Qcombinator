"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Send, TrendingUp, ChevronRight, Copy, Check, X, RefreshCw, FileText, Mail, Swords, BookOpen, Sparkles, DollarSign, Scale, Users, Search, Compass, BarChart3, Zap, Highlighter, Share2, Download, Upload, Loader2, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { getAgentById } from "@/features/agents/data/agents";

// ─── palette (matches investor dashboard exactly) ─────────────────────────────
const bg    = "#F9F7F2";
const surf  = "#F0EDE6";
const bdr   = "#E2DDD5";
const ink   = "#18160F";
const muted = "#8A867C";
const blue  = "#2563EB";
const green = "#16A34A";
const amber = "#D97706";
const red   = "#DC2626";

const pillarAccent: Record<string, string> = {
  "sales-marketing":    "#2563EB",
  "operations-finance": "#16A34A",
  "product-strategy":   "#7C3AED",
};

const pillarLabel: Record<string, string> = {
  "sales-marketing":    "Sales & Marketing",
  "operations-finance": "Operations & Finance",
  "product-strategy":   "Product & Strategy",
};

const dimensionLabel: Record<string, string> = {
  goToMarket: "GTM Score",
  financial:  "Financial Score",
  team:       "Team Score",
  product:    "Product Score",
  market:     "Market Score",
  traction:   "Traction Score",
};

// ─── types ────────────────────────────────────────────────────────────────────
interface UiMessage  { role: "agent" | "user"; text: string; }
interface ApiMessage { role: "user" | "assistant"; content: string; }

interface FinModel {
  mrr: string; growthRate: string; burn: string; grossMargin: string;
  cac: string; ltv: string; cash: string;
}

interface ArtifactData {
  id: string | null;
  type: "icp_document" | "outreach_sequence" | "battle_card" | "gtm_playbook"
      | "sales_script" | "brand_messaging" | "financial_summary" | "legal_checklist"
      | "hiring_plan" | "pmf_survey" | "competitive_matrix" | "strategic_plan";
  title: string;
  content: Record<string, unknown>;
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtNum(n: number, decimals = 0): string {
  if (!isFinite(n) || isNaN(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: decimals });
}

function healthColor(val: number, lo: number, hi: number): string {
  if (val >= hi) return green;
  if (val >= lo) return amber;
  return red;
}

// ─── copy-to-clipboard button ─────────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        background: "none", border: `1px solid ${bdr}`, borderRadius: 6,
        padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
        fontSize: 11, color: copied ? green : muted, transition: "color .15s",
      }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

// ─── artifact type meta ───────────────────────────────────────────────────────
const ARTIFACT_META: Record<string, { icon: typeof FileText; label: string; color: string }> = {
  icp_document:       { icon: FileText,  label: "ICP Document",         color: blue },
  outreach_sequence:  { icon: Mail,      label: "Outreach Sequence",    color: green },
  battle_card:        { icon: Swords,    label: "Battle Card",          color: red },
  gtm_playbook:       { icon: BookOpen,  label: "GTM Playbook",         color: amber },
  sales_script:       { icon: Zap,       label: "Sales Script",         color: green },
  brand_messaging:    { icon: Sparkles,  label: "Brand Messaging",      color: "#7C3AED" },
  financial_summary:  { icon: DollarSign,label: "Financial Summary",    color: green },
  legal_checklist:    { icon: Scale,     label: "Legal Checklist",      color: amber },
  hiring_plan:        { icon: Users,     label: "Hiring Plan",          color: blue },
  pmf_survey:         { icon: BarChart3, label: "PMF Research Kit",     color: "#7C3AED" },
  competitive_matrix: { icon: Search,    label: "Competitive Analysis", color: red },
  strategic_plan:     { icon: Compass,   label: "Strategic Plan",       color: blue },
};

// ─── quick generate questions per artifact type ────────────────────────────────
const QUICK_QUESTIONS: Record<string, string[]> = {
  icp_document:       ["Describe your product in one sentence", "Who are your 1-2 best current customers?", "What core problem do you solve for them?", "What is your pricing model?", "What industries or company sizes do you target?"],
  outreach_sequence:  ["What does your product do?", "Who are you reaching out to (role + company type)?", "What pain point do you address?", "What's your call-to-action (demo, trial, etc.)?", "Any traction or social proof to mention?"],
  battle_card:        ["Who is your main competitor?", "What are their key weaknesses?", "What's your #1 differentiator?", "What objections do prospects raise when comparing?", "What's your pricing vs. theirs?"],
  gtm_playbook:       ["What's your product and target market?", "What stage are you at (pre-revenue, early, scaling)?", "Which 2-3 channels have shown early traction?", "What's your CAC target and current burn?", "What's your 3-month launch goal?"],
  sales_script:       ["What's your product and primary use case?", "Who is the typical buyer (role + company size)?", "What are the top 3 objections you hear?", "What's your close/ask at the end of calls?", "What proof points or case studies do you have?"],
  brand_messaging:    ["What's your product and target audience?", "What's your category (project management, AI assistant, etc.)?", "What's your primary differentiator in one phrase?", "What emotion do you want customers to feel?", "Name 2-3 competitors and why you're better"],
  financial_summary:  ["Current MRR and growth rate?", "Monthly burn rate and runway?", "Team size and key hires planned?", "How will you use the funds you're raising?", "Key unit economics: CAC, LTV, gross margin?"],
  legal_checklist:    ["What's your entity type and state of incorporation?", "Do you have a co-founder agreement / vesting schedule?", "Have you assigned IP from all founders to the company?", "What fundraising instrument are you using (SAFE, note, equity)?", "Any regulatory or compliance concerns for your industry?"],
  hiring_plan:        ["What stage are you at and what's your current team?", "What are the 3 biggest gaps in the team right now?", "What's your hiring budget for the next 6 months?", "What roles do you plan to hire first?", "What's your target org structure in 12 months?"],
  pmf_survey:         ["What's your product and who uses it?", "How do you currently measure PMF (retention, NPS, revenue)?", "What's your biggest signal of product-market fit so far?", "What do your most engaged users have in common?", "What's the #1 thing users say when they love your product?"],
  competitive_matrix: ["Who are your top 3-5 competitors?", "What are the 5 key features customers evaluate?", "Where do you clearly win vs. each competitor?", "Where are you behind and what's the roadmap?", "How does your pricing compare?"],
  strategic_plan:     ["What's your 12-month vision for the company?", "What are your 3 biggest strategic bets?", "What are the top 3 risks to achieving this?", "What milestones would trigger a fundraise?", "What does success look like in 12 months (metrics)?"],
};

// ─── template gallery config per agent ────────────────────────────────────────
const AGENT_TEMPLATES: Record<string, {
  artifactType: ArtifactData["type"] | null;
  title: string;
  description: string;
  starterPrompt: string;
}[]> = {
  patel: [
    { artifactType: "icp_document",      title: "ICP Document",          description: "Define your ideal customer with firmographics, pain points, and buying triggers",        starterPrompt: "Let's build my Ideal Customer Profile — help me define who I'm targeting, their pain points, and what triggers them to buy." },
    { artifactType: "outreach_sequence", title: "Cold Outreach Sequence", description: "5-email cold drip personalized for your ICP",                                           starterPrompt: "I need a cold outreach email sequence — let's create 5 emails for reaching out to my ideal customers." },
    { artifactType: "battle_card",       title: "Competitor Battle Card", description: "One-pager for your top competitor — strengths, weaknesses, how to win",                starterPrompt: "Build me a battle card for my top competitor — I'll tell you who they are and we'll map their strengths, weaknesses, and how to position against them." },
    { artifactType: "gtm_playbook",      title: "GTM Playbook",           description: "Full go-to-market plan with channels, 90-day timeline, and KPIs",                      starterPrompt: "Let's create a full GTM playbook — I need a comprehensive go-to-market plan with channels, timeline, and success metrics." },
  ],
  susi: [
    { artifactType: "sales_script", title: "Discovery Call Script",     description: "Call framework with questions, objection handling, and close",                          starterPrompt: "Write a discovery call script for me — I need a structured call framework with great questions and how to handle objections." },
    { artifactType: "sales_script", title: "Objection Handling Guide",   description: "Top 10 objections your prospects raise — with winning responses",                      starterPrompt: "Build an objection handling guide — let's map the top objections I face in sales calls and craft winning responses to each." },
    { artifactType: "sales_script", title: "Pricing Recommendation",     description: "Tiered pricing structure with anchoring strategy and what's at each level",             starterPrompt: "Help me build a pricing recommendation — I need a tiered pricing structure with the right positioning and what's included at each level." },
  ],
  maya: [
    { artifactType: "brand_messaging", title: "Positioning Statement",   description: "Category, audience, differentiation, and proof in one crisp statement",               starterPrompt: "Let's craft my brand positioning statement — I need to nail my category, differentiation, and what makes us unique." },
    { artifactType: "brand_messaging", title: "Messaging Framework",     description: "Elevator pitch, one-liner, value props, and boilerplate copy",                        starterPrompt: "Build my messaging framework — I need an elevator pitch, one-liner, and key value propositions I can use everywhere." },
    { artifactType: "brand_messaging", title: "Investor Narrative",      description: "Story arc for your pitch — problem, insight, solution, traction",                     starterPrompt: "Help me craft my investor narrative — I need a compelling story arc for my pitch that covers the problem, my insight, and why we're winning." },
  ],
  felix: [
    { artifactType: "financial_summary", title: "Investor Financial Summary", description: "1-pager with key metrics for investor conversations",                             starterPrompt: "Build me an investor-ready financial summary — I need a 1-pager with my key metrics, unit economics, and financial story." },
    { artifactType: "financial_summary", title: "Fundraising Ask Calculator",  description: "How much to raise based on burn rate, milestones, and timeline",                 starterPrompt: "Help me calculate my fundraising ask — I need to figure out how much to raise based on my burn, milestones, and timeline." },
    { artifactType: "financial_summary", title: "Unit Economics Breakdown",    description: "CAC, LTV, payback period, and gross margin — all in one place",                  starterPrompt: "Break down my unit economics — let's calculate and analyze my CAC, LTV, payback period, and gross margin." },
  ],
  leo: [
    { artifactType: "legal_checklist", title: "Incorporation Checklist",     description: "Step-by-step for Delaware C-Corp — everything before raising",                    starterPrompt: "Walk me through the incorporation checklist — I need to make sure everything is set up correctly for my Delaware C-Corp." },
    { artifactType: "legal_checklist", title: "Fundraising Legal Checklist", description: "What to review before signing a SAFE, note, or term sheet",                       starterPrompt: "Build a fundraising legal checklist — I need to know what legal items to review and prepare before my fundraise." },
    { artifactType: "legal_checklist", title: "IP Assignment Guide",         description: "IP transfer from founders to company — before investors ask",                      starterPrompt: "Help me with IP assignment — I need to understand what intellectual property needs to be assigned from founders to the company." },
  ],
  harper: [
    { artifactType: "hiring_plan", title: "First 5 Hires Plan",          description: "Who to hire first based on your stage and biggest team gaps",                         starterPrompt: "Build my first 5 hires plan — let's figure out who I should hire first given my current stage and team gaps." },
    { artifactType: "hiring_plan", title: "Org Roadmap by Stage",         description: "Who to hire at $0, $500K, $1M, and $5M ARR",                                        starterPrompt: "Create an org roadmap for my company — I need to know who to hire at each revenue milestone." },
    { artifactType: "hiring_plan", title: "Compensation Framework",       description: "Salary bands and equity ranges by role and stage",                                    starterPrompt: "Help me build a compensation framework — I need salary bands and equity ranges for the roles I'm hiring." },
  ],
  nova: [
    { artifactType: "pmf_survey", title: "Customer Interview Script",    description: "20 sequenced questions to uncover real customer pain",                                 starterPrompt: "Write a customer interview script for me — I need 20 sequenced questions to uncover my customers' real pain points and needs." },
    { artifactType: "pmf_survey", title: "PMF Survey Kit",               description: "Sean Ellis test + custom questions ready to deploy",                                   starterPrompt: "Build me a PMF survey kit — I want to run the Sean Ellis test plus additional questions to measure product-market fit." },
    { artifactType: "pmf_survey", title: "Experiment Tracker",           description: "Hypothesis → test → metric → success criteria for your top bets",                    starterPrompt: "Create an experiment tracker — let's define hypotheses, tests, metrics, and success criteria for my top product bets." },
  ],
  atlas: [
    { artifactType: "competitive_matrix", title: "Competitive Matrix",    description: "Feature-by-feature comparison across your top 3-5 competitors",                      starterPrompt: "Build a competitive matrix — let's map features across my top competitors and show where I win." },
    { artifactType: "competitive_matrix", title: "Battle Cards",           description: "1-pager per competitor — strengths, weaknesses, how to sell against them",           starterPrompt: "Create battle cards for my competitors — I need a one-pager for each competitor showing their strengths, weaknesses, and how to win against them." },
    { artifactType: "competitive_matrix", title: "SWOT Analysis",          description: "Your company's strengths, weaknesses, opportunities, and threats",                   starterPrompt: "Do a SWOT analysis for my company — let's identify our strengths, weaknesses, opportunities, and threats." },
  ],
  sage: [
    { artifactType: "strategic_plan", title: "1-Page Strategic Plan",    description: "Vision, 3 big bets, milestones, and risks on one page",                               starterPrompt: "Build my 1-page strategic plan — I need my vision, 3 biggest strategic bets, milestones, and key risks." },
    { artifactType: "strategic_plan", title: "Quarterly OKRs",            description: "3-5 objectives with measurable key results for this quarter",                         starterPrompt: "Generate my quarterly OKRs — I need 3-5 objectives with measurable key results for this quarter." },
    { artifactType: "strategic_plan", title: "Product Roadmap",           description: "Now / Next / Later — aligned with your fundraising milestones",                       starterPrompt: "Create a product roadmap — I need a Now/Next/Later roadmap that aligns with my business milestones." },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════════
// ICP RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function ICPRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    summary?: string;
    buyerPersona?: { title?: string; role?: string; seniority?: string; dayInLife?: string; goals?: string[]; frustrations?: string[] };
    firmographics?: { companySize?: string; industry?: string[]; revenue?: string; geography?: string[]; techStack?: string[] };
    painPoints?: { pain: string; severity: string; currentSolution: string }[];
    buyingTriggers?: string[];
    channels?: { channel: string; priority: string; rationale: string }[];
    qualificationCriteria?: string[];
  };

  // Lead enrichment state
  type Lead = { name: string; email: string; title: string | null; confidence: number; linkedin: string | null };
  const [showEnrich, setShowEnrich]         = useState(false);
  const [enrichDomain, setEnrichDomain]     = useState("");
  const [enrichKey, setEnrichKey]           = useState("");
  const [enriching, setEnriching]           = useState(false);
  const [enrichLeads, setEnrichLeads]       = useState<Lead[] | null>(null);
  const [enrichOrg, setEnrichOrg]           = useState("");
  const [enrichError, setEnrichError]       = useState<string | null>(null);
  const [copiedLeads, setCopiedLeads]       = useState(false);
  const [addedToSeq,  setAddedToSeq]        = useState(false);

  async function handleEnrich() {
    if (!enrichDomain.trim() || enriching) return;
    setEnriching(true); setEnrichError(null); setEnrichLeads(null);
    try {
      const res = await fetch('/api/agents/patel/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: enrichDomain.trim(), hunterApiKey: enrichKey.trim() || undefined }),
      });
      const r = await res.json();
      if (res.ok) { setEnrichLeads(r.leads); setEnrichOrg(r.organization ?? enrichDomain); }
      else setEnrichError(r.error ?? 'Enrichment failed');
    } catch { setEnrichError('Network error'); }
    finally { setEnriching(false); }
  }

  function copyLeadsAsCSV() {
    if (!enrichLeads?.length) return;
    const csv = ['name,email,company,title', ...enrichLeads.map(l => `${l.name},${l.email},${enrichOrg},${l.title ?? ''}`)]
      .join('\n');
    navigator.clipboard.writeText(csv).catch(() => {});
    setCopiedLeads(true);
    setTimeout(() => setCopiedLeads(false), 2000);
  }

  const sevColor: Record<string, string> = { high: red, medium: amber, low: green };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  const pill = (text: string, accent = muted): React.CSSProperties => ({
    display: "inline-block", padding: "3px 10px", borderRadius: 999,
    fontSize: 11, background: surf, border: `1px solid ${bdr}`, color: accent, marginRight: 6, marginBottom: 5,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Summary */}
      {d.summary && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.summary}</p>
        </div>
      )}

      {/* Buyer Persona */}
      {d.buyerPersona && (
        <div>
          <p style={sectionHead}>Buyer Persona</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            {[
              { l: "Title", v: d.buyerPersona.title },
              { l: "Role", v: d.buyerPersona.role },
              { l: "Seniority", v: d.buyerPersona.seniority },
            ].filter(x => x.v).map(({ l, v }) => (
              <div key={l}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 3 }}>{l}</p>
                <p style={{ fontSize: 13, color: ink }}>{v}</p>
              </div>
            ))}
          </div>
          {d.buyerPersona.dayInLife && (
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.buyerPersona.dayInLife}</p>
          )}
          {d.buyerPersona.goals && d.buyerPersona.goals.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: green, marginBottom: 4 }}>Goals</p>
              {d.buyerPersona.goals.map((g, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {g}</p>
              ))}
            </div>
          )}
          {d.buyerPersona.frustrations && d.buyerPersona.frustrations.length > 0 && (
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: red, marginBottom: 4 }}>Frustrations</p>
              {d.buyerPersona.frustrations.map((f, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>• {f}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Firmographics */}
      {d.firmographics && (
        <div>
          <p style={sectionHead}>Firmographics</p>
          {d.firmographics.companySize && <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}>Size: {d.firmographics.companySize}</p>}
          {d.firmographics.revenue && <p style={{ fontSize: 12, color: ink, marginBottom: 6 }}>Revenue: {d.firmographics.revenue}</p>}
          <div style={{ marginTop: 6 }}>
            {(d.firmographics.industry || []).map(t => <span key={t} style={pill(t)}>{t}</span>)}
            {(d.firmographics.geography || []).map(t => <span key={t} style={pill(t, blue)}>{t}</span>)}
            {(d.firmographics.techStack || []).map(t => <span key={t} style={pill(t, amber)}>{t}</span>)}
          </div>
        </div>
      )}

      {/* Pain Points */}
      {d.painPoints && d.painPoints.length > 0 && (
        <div>
          <p style={sectionHead}>Pain Points</p>
          {d.painPoints.map((pp, i) => (
            <div key={i} style={{ padding: "10px 14px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{pp.pain}</p>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: sevColor[pp.severity] || muted }}>{pp.severity}</span>
              </div>
              <p style={{ fontSize: 11, color: muted }}>Current: {pp.currentSolution}</p>
            </div>
          ))}
        </div>
      )}

      {/* Buying Triggers */}
      {d.buyingTriggers && d.buyingTriggers.length > 0 && (
        <div>
          <p style={sectionHead}>Buying Triggers</p>
          {d.buyingTriggers.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>{i + 1}.</span>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{t}</p>
            </div>
          ))}
        </div>
      )}

      {/* Channels */}
      {d.channels && d.channels.length > 0 && (
        <div>
          <p style={sectionHead}>Recommended Channels</p>
          {d.channels.map((ch, i) => (
            <div key={i} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{ch.channel}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  padding: "2px 7px", borderRadius: 999,
                  background: ch.priority === "primary" ? blue : surf,
                  color: ch.priority === "primary" ? "#fff" : muted,
                }}>{ch.priority}</span>
              </div>
              <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{ch.rationale}</p>
            </div>
          ))}
        </div>
      )}

      {/* Qualification */}
      {d.qualificationCriteria && d.qualificationCriteria.length > 0 && (
        <div>
          <p style={sectionHead}>Qualification Criteria</p>
          {d.qualificationCriteria.map((q, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, paddingLeft: 10, lineHeight: 1.6 }}>✓ {q}</p>
          ))}
        </div>
      )}

      {/* ── Hunter.io Lead Enrichment ───────────────────────────────────────── */}
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showEnrich || enrichLeads ? 14 : 0 }}>
          <div>
            <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>Suggested Leads (Hunter.io)</p>
            <p style={{ fontSize: 11, color: muted }}>Enter a company domain — Patel finds decision-maker emails matching your ICP.</p>
          </div>
          <button onClick={() => { setShowEnrich(p => !p); setEnrichLeads(null); setEnrichError(null); }} style={{ padding: "6px 12px", borderRadius: 7, border: "none", background: blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
            {showEnrich ? "Close" : "Find Leads"}
          </button>
        </div>

        {showEnrich && !enrichLeads && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={enrichDomain}
                onChange={e => setEnrichDomain(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEnrich(); }}
                placeholder="acme.com"
                style={{ flex: 1, padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: "#fff", fontSize: 13, color: ink, outline: "none" }}
              />
              <button onClick={handleEnrich} disabled={!enrichDomain.trim() || enriching} style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                {enriching ? "Searching…" : "Search"}
              </button>
            </div>
            <div>
              <p style={{ fontSize: 10, color: muted, marginBottom: 4 }}>Hunter API Key (optional — uses shared key if blank)</p>
              <input value={enrichKey} onChange={e => setEnrichKey(e.target.value)} placeholder="Leave blank to use Edge Alpha's key (25 searches/mo)" style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: "#fff", fontSize: 12, color: ink, outline: "none", boxSizing: "border-box" }} />
            </div>
            {enrichError && <p style={{ fontSize: 12, color: red }}>{enrichError}</p>}
          </div>
        )}

        {enrichLeads && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{enrichLeads.length} leads at {enrichOrg}</p>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={copyLeadsAsCSV} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "#fff", fontSize: 11, fontWeight: 600, color: copiedLeads ? green : ink, cursor: "pointer" }}>
                  {copiedLeads ? "✓ Copied" : "Copy as CSV"}
                </button>
                <button
                  onClick={() => {
                    if (!enrichLeads?.length) return;
                    const csv = ['name,email,company,title', ...enrichLeads.map(l => `${l.name},${l.email},${enrichOrg},${l.title ?? ''}`)].join('\n');
                    sessionStorage.setItem('patel_enriched_leads', csv);
                    setAddedToSeq(true);
                    setTimeout(() => setAddedToSeq(false), 3000);
                  }}
                  style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: addedToSeq ? green : blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" }}
                >
                  {addedToSeq ? "✓ Added to Outreach!" : "Add to Outreach Sequence ↓"}
                </button>
                <button onClick={() => { setEnrichLeads(null); setShowEnrich(true); }} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid ${bdr}`, background: "#fff", fontSize: 11, color: muted, cursor: "pointer" }}>
                  New search
                </button>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {enrichLeads.map((lead, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#fff", borderRadius: 8, border: `1px solid ${bdr}` }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{lead.name}</p>
                    <p style={{ fontSize: 11, color: muted }}>{lead.email}{lead.title ? ` · ${lead.title}` : ''}</p>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: lead.confidence >= 80 ? "#F0FDF4" : "#FFFBEB", color: lead.confidence >= 80 ? green : amber }}>
                    {lead.confidence}%
                  </span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 10, color: muted, marginTop: 8 }}>Copy as CSV to paste into the Outreach Sequence sender above →</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTREACH SEQUENCE RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
interface OutreachContact { name: string; email: string; company?: string; title?: string }

function parseCSV(text: string): OutreachContact[] {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (!lines.length) return [];
  // Auto-detect header: if first line has no @ it's a header
  const firstLine = lines[0].toLowerCase();
  const hasHeader = !firstLine.includes('@') || firstLine.includes('email') || firstLine.includes('name');
  const dataLines = hasHeader ? lines.slice(1) : lines;
  return dataLines.map(line => {
    // Handle quoted CSV values
    const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const [name = '', email = '', company = '', title = ''] = cols;
    return { name: name || email.split('@')[0], email, company, title };
  }).filter(c => c.email.includes('@'));
}

function OutreachRenderer({ data, artifactId, sequenceName }: { data: Record<string, unknown>; artifactId?: string; sequenceName?: string }) {
  const d = data as {
    targetICP?: string;
    sequence?: { step: number; channel: string; timing: string; subject?: string | null; body: string; goal: string; tips: string[] }[];
  };

  const emailSteps = (d.sequence || []).filter(s => s.channel === 'email');

  // ── send panel state ──────────────────────────────────────────────────────
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [contacts,      setContacts]      = useState<OutreachContact[]>([]);
  const [csvText,       setCsvText]       = useState('');
  const [csvError,      setCsvError]      = useState('');
  const [selectedStep,  setSelectedStep]  = useState(0);
  const [fromName,      setFromName]      = useState('');
  const [fromEmail,     setFromEmail]     = useState('');
  const [sending,       setSending]       = useState(false);
  const [sendResult,    setSendResult]    = useState<{ sent: number; failed: number } | null>(null);
  const [previewIdx,    setPreviewIdx]    = useState(0);
  const [totalSent,     setTotalSent]     = useState(0);
  const [loadingStats,  setLoadingStats]  = useState(false);

  // Load total sent count on mount + pick up leads added from Hunter enrichment
  useEffect(() => {
    setLoadingStats(true);
    fetch('/api/agents/outreach/send')
      .then(r => r.json())
      .then(d => { if (d.stats) setTotalSent(d.stats.total) })
      .catch(() => {})
      .finally(() => setLoadingStats(false));
    // Pre-fill contacts from Hunter enrichment (set via sessionStorage)
    const stored = sessionStorage.getItem('patel_enriched_leads');
    if (stored) {
      const parsed = parseCSV(stored);
      if (parsed.length) {
        setCsvText(stored);
        setContacts(parsed);
        setShowSendPanel(true);
      }
      sessionStorage.removeItem('patel_enriched_leads');
    }
  }, [sendResult]);

  function handleCSVInput(text: string) {
    setCsvText(text);
    setCsvError('');
    const parsed = parseCSV(text);
    if (text.trim() && !parsed.length) {
      setCsvError('No valid emails found. Expected: name, email, company, title');
    } else {
      setContacts(parsed);
    }
  }

  function handleCSVFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      setCsvText(text);
      handleCSVInput(text);
    };
    reader.readAsText(file);
  }

  // Personalize a template for preview contact
  function personalize(text: string, contact: OutreachContact) {
    const firstName = contact.name.split(' ')[0] || contact.name;
    return text
      .replace(/\{\{firstName\}\}/gi, firstName)
      .replace(/\{\{first_name\}\}/gi, firstName)
      .replace(/\{\{name\}\}/gi, contact.name)
      .replace(/\{\{company\}\}/gi, contact.company || 'your company')
      .replace(/\{\{title\}\}/gi, contact.title || 'your role');
  }

  async function handleSend() {
    if (!contacts.length || !fromEmail || sending) return;
    const step = emailSteps[selectedStep];
    if (!step) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/agents/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts,
          steps: emailSteps.map(s => ({ subject: s.subject || '', body: s.body })),
          stepIndex: selectedStep,
          fromName,
          fromEmail,
          artifactId,
          sequenceName: sequenceName || d.targetICP || 'Outreach Sequence',
        }),
      });
      const result = await res.json();
      setSendResult({ sent: result.sent ?? 0, failed: result.failed ?? 0 });
      if (result.sent > 0) {
        setContacts([]);
        setCsvText('');
      }
    } catch {
      setSendResult({ sent: 0, failed: contacts.length });
    } finally {
      setSending(false);
    }
  }

  const chColor: Record<string, string> = { email: blue, linkedin: "#0A66C2", call: amber };
  const chLabel: Record<string, string> = { email: "Email", linkedin: "LinkedIn", call: "Call" };
  const previewContact = contacts[previewIdx] || { name: 'Alex Johnson', email: 'alex@acme.com', company: 'Acme Corp', title: 'Head of Operations' };
  const previewStep    = emailSteps[selectedStep];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* ── Send Emails CTA bar ─────────────────────────────────────── */}
      <div style={{ background: sending ? '#F0FDF4' : (sendResult?.sent ? '#F0FDF4' : '#EFF6FF'), border: `1px solid ${sendResult?.sent ? '#86EFAC' : '#BFDBFE'}`, borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ height: 36, width: 36, borderRadius: 9, background: sendResult?.sent ? '#DCFCE7' : '#DBEAFE', display: "flex", alignItems: "center", justifyContent: "center" }}>
            {sendResult?.sent
              ? <CheckCircle2 size={16} color={green} />
              : <PlayCircle size={16} color={blue} />
            }
          </div>
          <div>
            {sendResult?.sent ? (
              <p style={{ fontSize: 13, fontWeight: 600, color: green }}>
                Patel sent {sendResult.sent} email{sendResult.sent !== 1 ? 's' : ''} {sendResult.failed > 0 ? `· ${sendResult.failed} failed` : ''}
              </p>
            ) : (
              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>
                {emailSteps.length} email step{emailSteps.length !== 1 ? 's' : ''} ready to send
              </p>
            )}
            <p style={{ fontSize: 11, color: muted, marginTop: 1 }}>
              {loadingStats ? '…' : totalSent > 0 ? `${totalSent} emails sent total` : 'Add contacts and send — Patel personalizes each one'}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowSendPanel(v => !v); setSendResult(null); }}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer", background: ink, color: bg, border: "none", transition: "opacity .15s" }}
          onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
          onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
        >
          <Send size={12} /> {showSendPanel ? 'Close' : 'Send Emails'}
        </button>
      </div>

      {/* ── Send Panel ─────────────────────────────────────────────── */}
      {showSendPanel && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, padding: "20px", display: "flex", flexDirection: "column", gap: 18 }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: muted }}>Outreach Campaign</p>

          {/* Step selector */}
          {emailSteps.length > 1 && (
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 8 }}>Which step?</p>
              <div style={{ display: "flex", gap: 6 }}>
                {emailSteps.map((s, i) => (
                  <button key={i} onClick={() => setSelectedStep(i)}
                    style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", border: `1px solid ${selectedStep === i ? ink : bdr}`, background: selectedStep === i ? ink : bg, color: selectedStep === i ? bg : ink }}>
                    Step {i + 1} · {s.timing}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* From fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Your name (shows as sender)</p>
              <input value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Alex Chen"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${bdr}`, borderRadius: 7, fontSize: 13, color: ink, background: bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>Your email (reply-to)</p>
              <input value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="alex@yourstartup.com" type="email"
                style={{ width: "100%", padding: "8px 10px", border: `1px solid ${bdr}`, borderRadius: 7, fontSize: 13, color: ink, background: bg, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>

          {/* Contact upload */}
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <p style={{ fontSize: 11, color: muted }}>Contact list <span style={{ color: muted }}>(CSV: name, email, company, title)</span></p>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer", border: `1px solid ${bdr}`, background: bg, color: ink }}>
                <Upload size={11} /> Upload CSV
                <input type="file" accept=".csv,.txt" style={{ display: "none" }} onChange={handleCSVFile} />
              </label>
            </div>
            <textarea
              value={csvText}
              onChange={e => handleCSVInput(e.target.value)}
              placeholder={"Alex Johnson, alex@acme.com, Acme Corp, Head of Operations\nSarah Park, sarah@techflow.io, TechFlow, VP Engineering\n..."}
              rows={4}
              style={{ width: "100%", padding: "10px 12px", border: `1px solid ${csvError ? red : bdr}`, borderRadius: 8, fontSize: 12, color: ink, background: bg, resize: "vertical", outline: "none", fontFamily: "monospace", boxSizing: "border-box", lineHeight: 1.6 }}
            />
            {csvError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{csvError}</p>}
            {contacts.length > 0 && !csvError && (
              <p style={{ fontSize: 11, color: green, marginTop: 4 }}>
                <CheckCircle2 size={10} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                {contacts.length} contact{contacts.length !== 1 ? 's' : ''} ready · max 200 per send
              </p>
            )}
          </div>

          {/* Preview */}
          {contacts.length > 0 && previewStep && (
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Preview — {contacts[previewIdx]?.name || 'Contact 1'}
                </p>
                {contacts.length > 1 && (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setPreviewIdx(Math.max(0, previewIdx - 1))} disabled={previewIdx === 0}
                      style={{ padding: "2px 8px", fontSize: 11, border: `1px solid ${bdr}`, borderRadius: 5, cursor: "pointer", background: bg, color: muted, opacity: previewIdx === 0 ? 0.4 : 1 }}>←</button>
                    <span style={{ fontSize: 11, color: muted, lineHeight: "22px" }}>{previewIdx + 1}/{contacts.length}</span>
                    <button onClick={() => setPreviewIdx(Math.min(contacts.length - 1, previewIdx + 1))} disabled={previewIdx === contacts.length - 1}
                      style={{ padding: "2px 8px", fontSize: 11, border: `1px solid ${bdr}`, borderRadius: 5, cursor: "pointer", background: bg, color: muted, opacity: previewIdx === contacts.length - 1 ? 0.4 : 1 }}>→</button>
                  </div>
                )}
              </div>
              {previewStep.subject && (
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
                  Subject: {personalize(previewStep.subject, previewContact)}
                </p>
              )}
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                {personalize(previewStep.body, previewContact)}
              </p>
            </div>
          )}

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!contacts.length || !fromEmail || sending || !!sendResult?.sent}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              padding: "12px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              cursor: (!contacts.length || !fromEmail || sending || !!sendResult?.sent) ? "not-allowed" : "pointer",
              background: sendResult?.sent ? green : ink,
              color: bg, border: "none",
              opacity: (!contacts.length || !fromEmail) ? 0.5 : 1,
              transition: "all .15s",
            }}
          >
            {sending ? (
              <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Sending {contacts.length} emails…</>
            ) : sendResult?.sent ? (
              <><CheckCircle2 size={14} /> Sent {sendResult.sent} emails</>
            ) : (
              <><Send size={14} /> Send Step {selectedStep + 1} to {contacts.length || '—'} contact{contacts.length !== 1 ? 's' : ''}</>
            )}
          </button>
          {!fromEmail && contacts.length > 0 && (
            <p style={{ fontSize: 11, color: amber, textAlign: "center", marginTop: -10 }}>Enter your email above to enable sending</p>
          )}
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {d.targetICP && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 14px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 4 }}>Target</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{d.targetICP}</p>
        </div>
      )}

      {(d.sequence || []).map((step, i) => (
        <div key={i} style={{ position: "relative", paddingLeft: 20 }}>
          {i < (d.sequence?.length ?? 0) - 1 && (
            <div style={{ position: "absolute", left: 6, top: 20, bottom: -14, width: 1, background: bdr }} />
          )}
          <div style={{
            position: "absolute", left: 0, top: 6,
            width: 13, height: 13, borderRadius: "50%",
            background: chColor[step.channel] || muted,
            border: `2px solid ${bg}`,
          }} />

          <div style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: ink }}>{step.timing}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                  padding: "2px 8px", borderRadius: 999,
                  background: chColor[step.channel] || muted, color: "#fff",
                }}>{chLabel[step.channel] || step.channel}</span>
              </div>
              <CopyBtn text={step.body} />
            </div>

            {step.subject && (
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, marginBottom: 6 }}>
                Subject: {step.subject}
              </p>
            )}
            <p style={{ fontSize: 12, color: ink, lineHeight: 1.7, whiteSpace: "pre-wrap", marginBottom: 8 }}>{step.body}</p>
            <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}><strong>Goal:</strong> {step.goal}</p>
            {step.tips && step.tips.map((tip, ti) => (
              <p key={ti} style={{ fontSize: 11, color: muted, paddingLeft: 8 }}>💡 {tip}</p>
            ))}

            {step.channel === "email" && (
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${bdr}` }}>
                <a
                  href={`https://mail.google.com/mail/?view=cm&fs=1${step.subject ? `&su=${encodeURIComponent(step.subject)}` : ""}&body=${encodeURIComponent(step.body)}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#EFF6FF", color: blue, textDecoration: "none", border: `1px solid #BFDBFE` }}
                >
                  <Mail size={11} /> Send one in Gmail
                </a>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATTLE CARD RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function BattleCardRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    competitor?: string;
    overview?: string;
    positioningMatrix?: { dimension: string; us: string; them: string; verdict: string }[];
    objectionHandling?: { objection: string; response: string; proofPoint: string }[];
    strengths?: string[];
    weaknesses?: string[];
    winStrategy?: string;
    sources?: { title: string; url: string }[];
  };

  const verdictColor: Record<string, string> = { advantage: green, parity: amber, disadvantage: red };
  const verdictLabel: Record<string, string> = { advantage: "Win", parity: "Tie", disadvantage: "Lose" };

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {d.overview && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.overview}</p>
        </div>
      )}

      {/* Positioning Matrix */}
      {d.positioningMatrix && d.positioningMatrix.length > 0 && (
        <div>
          <p style={sectionHead}>Positioning Matrix</p>
          {/* header row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 50px", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {["Dimension", "Us", "Them", ""].map(h => (
              <div key={h} style={{ background: surf, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{h}</div>
            ))}
            {d.positioningMatrix.map((row, i) => (
              <>
                <div key={`d${i}`} style={{ background: "#fff", padding: "10px", fontSize: 12, fontWeight: 600, color: ink }}>{row.dimension}</div>
                <div key={`u${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: ink, lineHeight: 1.4 }}>{row.us}</div>
                <div key={`t${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: muted, lineHeight: 1.4 }}>{row.them}</div>
                <div key={`v${i}`} style={{ background: "#fff", padding: "10px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{
                    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
                    color: verdictColor[row.verdict] || muted,
                  }}>{verdictLabel[row.verdict] || row.verdict}</span>
                </div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Objection Handling */}
      {d.objectionHandling && d.objectionHandling.length > 0 && (
        <div>
          <p style={sectionHead}>Objection Handling</p>
          {d.objectionHandling.map((obj, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: red, marginBottom: 6 }}>&quot;{obj.objection}&quot;</p>
              <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 6 }}>{obj.response}</p>
              <p style={{ fontSize: 11, color: green }}>📊 {obj.proofPoint}</p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths / Weaknesses */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {d.strengths && d.strengths.length > 0 && (
          <div>
            <p style={{ ...sectionHead, color: amber }}>Their Strengths</p>
            {d.strengths.map((s, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 4 }}>• {s}</p>)}
          </div>
        )}
        {d.weaknesses && d.weaknesses.length > 0 && (
          <div>
            <p style={{ ...sectionHead, color: green }}>Their Weaknesses</p>
            {d.weaknesses.map((w, i) => <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 4 }}>• {w}</p>)}
          </div>
        )}
      </div>

      {/* Win Strategy */}
      {d.winStrategy && (
        <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: green, marginBottom: 6 }}>Win Strategy</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.winStrategy}</p>
        </div>
      )}

      {/* Sources */}
      {d.sources && d.sources.length > 0 && (
        <div>
          <p style={sectionHead}>Sources</p>
          {d.sources.map((s, i) => (
            <a key={i} href={s.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", fontSize: 11, color: blue, textDecoration: "none", marginBottom: 4, lineHeight: 1.4 }}>
              {s.title || s.url} ↗
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GTM PLAYBOOK RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function PlaybookRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    companyContext?: string;
    icp?: { summary?: string; segments?: string[] };
    positioning?: { statement?: string; differentiators?: string[] };
    channels?: { channel: string; priority: string; budget: string; expectedCAC: string }[];
    messaging?: { audience: string; headline: string; valueProps: string[] }[];
    metrics?: { metric: string; target: string; currentBaseline: string }[];
    ninetyDayPlan?: { phase: string; weeks: string; objectives: string[]; keyActions: string[]; successCriteria: string }[];
  };

  const [deploying, setDeploying]   = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/agents/landingpage/deploy?artifactId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.site?.url) setDeployedUrl(d.site.url); })
      .catch(() => {});
  }, [artifactId]);

  async function handleDeploy() {
    if (deploying) return;
    setDeploying(true); setDeployError(null);
    try {
      const res = await fetch('/api/agents/landingpage/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactType: 'gtm_playbook', artifactContent: data, siteName: 'startup-landing', agentId: 'patel', artifactId }),
      });
      const result = await res.json();
      if (res.ok) setDeployedUrl(result.url);
      else setDeployError(result.error ?? 'Deploy failed — check NETLIFY_API_KEY');
    } catch { setDeployError('Network error'); }
    finally { setDeploying(false); }
  }

  const sectionHead: React.CSSProperties = {
    fontSize: 10, fontWeight: 600, textTransform: "uppercase",
    letterSpacing: "0.14em", color: muted, marginBottom: 10,
  };

  const priColor: Record<string, string> = { primary: blue, secondary: amber, experimental: muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Deploy Landing Page CTA ── */}
      <div style={{ background: deployedUrl ? "#F0FDF4" : "#EFF6FF", border: `1px solid ${deployedUrl ? "#BBF7D0" : "#BFDBFE"}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          {deployedUrl ? (
            <><p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 2 }}>Landing page is live!</p>
              <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: green, textDecoration: "underline", wordBreak: "break-all" }}>{deployedUrl}</a></>
          ) : (
            <><p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>Deploy your landing page</p>
              <p style={{ fontSize: 11, color: muted }}>Turn this GTM strategy into a live landing page — deployed to Netlify in seconds.</p></>
          )}
          {deployError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{deployError}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {deployedUrl && <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${green}`, background: "transparent", color: green, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>View Live</a>}
          <button onClick={handleDeploy} disabled={deploying} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: deploying ? bdr : blue, color: deploying ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: deploying ? "not-allowed" : "pointer" }}>
            {deploying ? "Deploying…" : deployedUrl ? "Redeploy" : "Deploy Landing Page"}
          </button>
        </div>
      </div>
      {/* Company Context */}
      {d.companyContext && (
        <div style={{ background: surf, borderRadius: 10, padding: "14px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, lineHeight: 1.6, color: ink }}>{d.companyContext}</p>
        </div>
      )}

      {/* Positioning */}
      {d.positioning?.statement && (
        <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: blue, marginBottom: 6 }}>Positioning</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6, fontStyle: "italic" }}>{d.positioning.statement}</p>
          {d.positioning.differentiators && (
            <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
              {d.positioning.differentiators.map((diff, i) => (
                <span key={i} style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: 11,
                  background: "#DBEAFE", color: blue,
                }}>{diff}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ICP Segments */}
      {d.icp?.segments && d.icp.segments.length > 0 && (
        <div>
          <p style={sectionHead}>ICP Segments</p>
          {d.icp.summary && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 8 }}>{d.icp.summary}</p>}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.icp.segments.map((seg, i) => (
              <span key={i} style={{
                padding: "5px 12px", borderRadius: 999, fontSize: 12,
                background: surf, border: `1px solid ${bdr}`, color: ink,
              }}>{seg}</span>
            ))}
          </div>
        </div>
      )}

      {/* Channels */}
      {d.channels && d.channels.length > 0 && (
        <div>
          <p style={sectionHead}>Channel Strategy</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 60px 70px 70px", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {["Channel", "Priority", "Budget", "CAC"].map(h => (
              <div key={h} style={{ background: surf, padding: "8px 10px", fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
            ))}
            {d.channels.map((ch, i) => (
              <>
                <div key={`c${i}`} style={{ background: "#fff", padding: "10px", fontSize: 12, fontWeight: 600, color: ink }}>{ch.channel}</div>
                <div key={`p${i}`} style={{ background: "#fff", padding: "10px", display: "flex", alignItems: "center" }}>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: priColor[ch.priority] || muted }}>{ch.priority}</span>
                </div>
                <div key={`b${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: ink }}>{ch.budget}</div>
                <div key={`a${i}`} style={{ background: "#fff", padding: "10px", fontSize: 11, color: ink }}>{ch.expectedCAC}</div>
              </>
            ))}
          </div>
        </div>
      )}

      {/* Messaging */}
      {d.messaging && d.messaging.length > 0 && (
        <div>
          <p style={sectionHead}>Messaging</p>
          {d.messaging.map((msg, i) => (
            <div key={i} style={{ background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10, padding: "14px 16px", marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 600, color: blue, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{msg.audience}</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 6 }}>{msg.headline}</p>
              {msg.valueProps.map((vp, vi) => (
                <p key={vi} style={{ fontSize: 12, color: muted, lineHeight: 1.6, paddingLeft: 8 }}>• {vp}</p>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Metrics */}
      {d.metrics && d.metrics.length > 0 && (
        <div>
          <p style={sectionHead}>Key Metrics</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {d.metrics.map((m, i) => (
              <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{m.metric}</p>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>{m.target}</p>
                <p style={{ fontSize: 10, color: muted }}>Baseline: {m.currentBaseline}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 90-Day Plan */}
      {d.ninetyDayPlan && d.ninetyDayPlan.length > 0 && (
        <div>
          <p style={sectionHead}>90-Day Plan</p>
          {d.ninetyDayPlan.map((phase, i) => (
            <div key={i} style={{
              background: "#fff", border: `1px solid ${bdr}`, borderRadius: 10,
              padding: "16px", marginBottom: 10,
              borderLeft: `3px solid ${i === 0 ? blue : i === 1 ? amber : green}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{phase.phase}</p>
                <span style={{ fontSize: 11, color: muted }}>{phase.weeks}</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Objectives</p>
                {phase.objectives.map((o, oi) => <p key={oi} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8 }}>→ {o}</p>)}
              </div>
              <div style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Key Actions</p>
                {phase.keyActions.map((a, ai) => <p key={ai} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8 }}>• {a}</p>)}
              </div>
              <div style={{ background: "#F0FDF4", borderRadius: 6, padding: "8px 10px" }}>
                <p style={{ fontSize: 11, color: green }}>✓ {phase.successCriteria}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES SCRIPT RENDERER  (Susi — proposals + pipeline CRM)
// ═══════════════════════════════════════════════════════════════════════════════
type Deal = { id: string; company: string; contact_name?: string; contact_email?: string; contact_title?: string; stage: string; value?: string; notes?: string; next_action?: string };

function SalesScriptRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    targetPersona?: string;
    discoveryQuestions?: { question: string; purpose: string; probe?: string }[];
    pitchFramework?: { opener?: string; problemStatement?: string; solutionBridge?: string; valueProposition?: string; socialProof?: string; cta?: string };
    objections?: { objection: string; response: string; pivot?: string }[];
    closingLines?: string[];
    nextSteps?: string[];
  };

  // ── Proposal modal state ──
  const [showModal, setShowModal]         = useState(false);
  const [prospectName, setProspectName]   = useState("");
  const [prospectEmail, setProspectEmail] = useState("");
  const [prospectCompany, setProspectCompany] = useState("");
  const [dealValue, setDealValue]         = useState("");
  const [useCase, setUseCase]             = useState("");
  const [sending, setSending]             = useState(false);
  const [sendResult, setSendResult]       = useState<{ ok?: boolean; error?: string } | null>(null);

  // ── Pipeline state ──
  const [activeTab, setActiveTab]         = useState<"script" | "pipeline" | "webhook">("script");
  const [deals, setDeals]                 = useState<Record<string, Deal[]>>({ lead: [], qualified: [], proposal: [], negotiating: [], won: [], lost: [] });
  const [loadingDeals, setLoadingDeals]   = useState(false);
  const [movingDeal, setMovingDeal]       = useState<string | null>(null);
  const [webhookUserId, setWebhookUserId] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [founderInfo, setFounderInfo]     = useState<{ name: string; email: string; company: string } | null>(null);

  useEffect(() => {
    import('@/lib/supabase/client').then(({ createClient }) => {
      const sb = createClient();
      sb.auth.getUser().then(async ({ data }) => {
        if (!data?.user?.id) return;
        setWebhookUserId(data.user.id);
        const { data: fp } = await sb
          .from('founder_profiles')
          .select('full_name, startup_name')
          .eq('user_id', data.user.id)
          .single();
        setFounderInfo({
          name:    fp?.full_name    || data.user.user_metadata?.full_name || 'Founder',
          email:   data.user.email  || '',
          company: fp?.startup_name || 'My Startup',
        });
      }).catch(() => {});
    }).catch(() => {});
  }, []);

  const STAGES = ["lead", "qualified", "proposal", "negotiating", "won", "lost"] as const;
  const STAGE_LABELS: Record<string, string> = { lead: "Lead", qualified: "Qualified", proposal: "Proposal Sent", negotiating: "Negotiating", won: "Won", lost: "Lost" };
  const STAGE_COLORS: Record<string, string> = { lead: muted, qualified: blue, proposal: amber, negotiating: "#7C3AED", won: green, lost: red };

  const totalDeals = Object.values(deals).reduce((n, arr) => n + arr.length, 0);

  // Load deals when tab switches to pipeline
  useEffect(() => {
    if (activeTab !== "pipeline") return;
    setLoadingDeals(true);
    fetch("/api/agents/deals")
      .then(r => r.json())
      .then(d => { if (d.grouped) setDeals(d.grouped); })
      .catch(() => {})
      .finally(() => setLoadingDeals(false));
  }, [activeTab]);

  // Cross-agent: detect if Patel recently sent outreach (contacts to add to pipeline)
  const [patelUpdate, setPatelUpdate] = useState<{ description: string; created_at: string } | null>(null);
  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/agents/context?agentId=susi&since=${since}&limit=5`)
      .then(r => r.json())
      .then(d => {
        const event = (d.events ?? []).find((e: { agent_id: string; action_type: string; metadata?: Record<string, unknown> }) =>
          e.agent_id === 'patel' && ['send_outreach', 'outreach_drafted'].includes(e.action_type)
        );
        if (event) setPatelUpdate(event);
      })
      .catch(() => {});
  }, []);

  async function handleSendProposal() {
    if (!prospectEmail || !prospectName || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch("/api/agents/proposal/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectName, prospectEmail, prospectCompany, dealValue, useCase, salesScript: data, artifactId, yourName: founderInfo?.name ?? 'Founder', yourEmail: founderInfo?.email ?? '', yourCompany: founderInfo?.company ?? '' }),
      });
      const result = await res.json();
      if (res.ok) {
        setSendResult({ ok: true });
        // Refresh pipeline
        fetch("/api/agents/deals").then(r => r.json()).then(d => { if (d.grouped) setDeals(d.grouped); });
      } else {
        setSendResult({ error: result.error || "Failed to send" });
      }
    } catch {
      setSendResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  }

  async function handleMoveDeal(dealId: string, newStage: string) {
    setMovingDeal(dealId);
    try {
      await fetch("/api/agents/deals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: dealId, stage: newStage }),
      });
      const r = await fetch("/api/agents/deals");
      const d = await r.json();
      if (d.grouped) setDeals(d.grouped);
    } catch {} finally {
      setMovingDeal(null);
    }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const inputStyle: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Patel cross-agent context banner ── */}
      {patelUpdate && (
        <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 16 }}>📬</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: blue, margin: 0 }}>Patel sent outreach — add contacts to your pipeline?</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{patelUpdate.description}</p>
          </div>
          <button onClick={() => setActiveTab("pipeline")} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: blue, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Open Pipeline</button>
          <button onClick={() => setPatelUpdate(null)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Send Proposal CTA bar ── */}
      <div style={{ background: "#ECFDF5", border: `1px solid #A7F3D0`, borderRadius: 10, padding: "12px 16px", marginBottom: 16, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 2 }}>Ready to close a deal?</p>
          <p style={{ fontSize: 11, color: muted }}>Send a branded proposal to a prospect — tracked automatically in your pipeline.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setSendResult(null); }}
          style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Send Proposal
        </button>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display: "flex", gap: 4, marginBottom: 18, borderBottom: `1px solid ${bdr}`, paddingBottom: 0 }}>
        {(["script", "pipeline", "webhook"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "7px 16px", borderRadius: "8px 8px 0 0", border: `1px solid ${activeTab === tab ? bdr : "transparent"}`,
              borderBottom: activeTab === tab ? `1px solid ${bg}` : "none",
              background: activeTab === tab ? bg : "transparent",
              fontSize: 12, fontWeight: 600, color: activeTab === tab ? ink : muted,
              cursor: "pointer", marginBottom: -1,
            }}
          >
            {tab === "script" ? "Sales Script" : tab === "pipeline" ? `Pipeline${totalDeals > 0 ? ` (${totalDeals})` : ""}` : "Lead Webhook"}
          </button>
        ))}
      </div>

      {/* ── Sales Script tab ── */}
      {activeTab === "script" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {d.targetPersona && (
            <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Target Persona</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.targetPersona}</p>
            </div>
          )}
          {d.pitchFramework && (
            <div>
              <p style={sectionHead}>Pitch Framework</p>
              {Object.entries(d.pitchFramework).map(([k, v]) => v ? (
                <div key={k} style={{ borderBottom: `1px solid ${bdr}`, padding: "10px 0" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{v}</p>
                </div>
              ) : null)}
            </div>
          )}
          {d.discoveryQuestions && d.discoveryQuestions.length > 0 && (
            <div>
              <p style={sectionHead}>Discovery Questions</p>
              {d.discoveryQuestions.map((q, i) => (
                <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>Q{i + 1}: {q.question}</p>
                  <p style={{ fontSize: 11, color: muted, marginBottom: q.probe ? 4 : 0 }}>Purpose: {q.purpose}</p>
                  {q.probe && <p style={{ fontSize: 11, color: blue }}>Probe: {q.probe}</p>}
                </div>
              ))}
            </div>
          )}
          {d.objections && d.objections.length > 0 && (
            <div>
              <p style={sectionHead}>Objection Handling</p>
              {d.objections.map((o, i) => (
                <div key={i} style={{ background: "#FFF7ED", border: `1px solid #FED7AA`, borderRadius: 8, padding: "12px 14px", marginBottom: 8 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: amber, marginBottom: 4 }}>&quot;{o.objection}&quot;</p>
                  <p style={{ fontSize: 12, color: ink, lineHeight: 1.55, marginBottom: o.pivot ? 4 : 0 }}>{o.response}</p>
                  {o.pivot && <p style={{ fontSize: 11, color: green }}>Pivot: {o.pivot}</p>}
                </div>
              ))}
            </div>
          )}
          {d.closingLines && d.closingLines.length > 0 && (
            <div>
              <p style={sectionHead}>Closing Lines</p>
              {d.closingLines.map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: green, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.5, fontStyle: "italic" }}>&quot;{line}&quot;</p>
                </div>
              ))}
            </div>
          )}
          {d.nextSteps && d.nextSteps.length > 0 && (
            <div>
              <p style={sectionHead}>After the Call</p>
              {d.nextSteps.map((step, i) => (
                <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 10, marginBottom: 4 }}>→ {step}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pipeline CRM tab ── */}
      {activeTab === "pipeline" && (
        <div>
          {loadingDeals ? (
            <p style={{ fontSize: 13, color: muted, textAlign: "center", padding: "32px 0" }}>Loading pipeline…</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {STAGES.map(stage => {
                const stageDealList = deals[stage] ?? [];
                const stageColor = STAGE_COLORS[stage] ?? muted;
                return (
                  <div key={stage}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: stageColor, flexShrink: 0 }} />
                      <p style={{ fontSize: 11, fontWeight: 700, color: stageColor, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        {STAGE_LABELS[stage]}
                      </p>
                      <span style={{ fontSize: 10, color: muted }}>({stageDealList.length})</span>
                    </div>
                    {stageDealList.length === 0 ? (
                      <p style={{ fontSize: 12, color: muted, paddingLeft: 16, fontStyle: "italic" }}>No deals</p>
                    ) : (
                      stageDealList.map((deal) => (
                        <div key={deal.id} style={{ background: surf, borderRadius: 8, border: `1px solid ${bdr}`, padding: "10px 14px", marginBottom: 6, marginLeft: 16 }}>
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{deal.company}</p>
                              {deal.contact_name && <p style={{ fontSize: 11, color: muted }}>{deal.contact_name}{deal.contact_title ? ` · ${deal.contact_title}` : ""}</p>}
                            </div>
                            {deal.value && <span style={{ fontSize: 12, fontWeight: 700, color: green, flexShrink: 0 }}>{deal.value}</span>}
                          </div>
                          {deal.next_action && (
                            <p style={{ fontSize: 11, color: blue, marginBottom: 6 }}>→ {deal.next_action}</p>
                          )}
                          {/* Stage mover */}
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {STAGES.filter(s => s !== stage).map(s => (
                              <button
                                key={s}
                                onClick={() => handleMoveDeal(deal.id, s)}
                                disabled={movingDeal === deal.id}
                                style={{
                                  padding: "2px 8px", borderRadius: 4, border: `1px solid ${STAGE_COLORS[s]}`,
                                  background: "transparent", color: STAGE_COLORS[s], fontSize: 10, fontWeight: 600,
                                  cursor: "pointer", opacity: movingDeal === deal.id ? 0.5 : 1,
                                }}
                              >
                                → {STAGE_LABELS[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
              {totalDeals === 0 && (
                <div style={{ textAlign: "center", padding: "32px 16px" }}>
                  <p style={{ fontSize: 13, color: muted, marginBottom: 8 }}>No deals in your pipeline yet.</p>
                  <p style={{ fontSize: 11, color: muted }}>Send a proposal — it automatically creates a deal here.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Send Proposal Modal ── */}
      {showModal && (
        <div
          onClick={() => { if (!sending) setShowModal(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Send Sales Proposal</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>

            {sendResult?.ok ? (
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <p style={{ fontSize: 24, marginBottom: 12 }}>✅</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>Proposal sent!</p>
                <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Check your pipeline — a deal was created automatically.</p>
                <button
                  onClick={() => { setShowModal(false); setSendResult(null); setProspectName(""); setProspectEmail(""); setProspectCompany(""); setDealValue(""); setUseCase(""); setActiveTab("pipeline"); }}
                  style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  View Pipeline
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Prospect Name *</label>
                    <input value={prospectName} onChange={e => setProspectName(e.target.value)} placeholder="Jane Smith" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Email *</label>
                    <input value={prospectEmail} onChange={e => setProspectEmail(e.target.value)} placeholder="jane@company.com" type="email" style={inputStyle} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Company</label>
                    <input value={prospectCompany} onChange={e => setProspectCompany(e.target.value)} placeholder="Acme Corp" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Deal Value</label>
                    <input value={dealValue} onChange={e => setDealValue(e.target.value)} placeholder="$5,000/mo" style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Use Case / What they want to solve</label>
                  <textarea value={useCase} onChange={e => setUseCase(e.target.value)} placeholder="They're struggling with..." rows={3} style={{ ...inputStyle, resize: "vertical" }} />
                </div>
                {sendResult?.error && (
                  <p style={{ fontSize: 12, color: red }}>{sendResult.error}</p>
                )}
                <button
                  onClick={handleSendProposal}
                  disabled={!prospectEmail || !prospectName || sending}
                  style={{
                    padding: "10px 20px", borderRadius: 8, border: "none",
                    background: !prospectEmail || !prospectName ? bdr : green,
                    color: !prospectEmail || !prospectName ? muted : "#fff",
                    fontSize: 13, fontWeight: 700, cursor: !prospectEmail || !prospectName ? "not-allowed" : "pointer",
                    marginTop: 4,
                  }}
                >
                  {sending ? "Sending…" : "Send Proposal via Email"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Webhook tab ── */}
      {activeTab === "webhook" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "20px 22px", border: `1px solid #BFDBFE` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: blue, marginBottom: 6 }}>Inbound Lead Webhook</p>
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 16 }}>
              Add this URL to any form tool (Typeform, Tally, Webflow, etc.). When a lead submits, <strong>Susi auto-responds within 60 seconds</strong> with a personalized email and adds the lead to your pipeline.
            </p>
            {webhookUserId ? (
              <>
                <div style={{ background: "#fff", borderRadius: 8, padding: "10px 14px", border: `1px solid #BFDBFE`, fontFamily: "monospace", fontSize: 13, color: ink, wordBreak: "break-all", marginBottom: 10 }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'}/api/webhook/lead?uid={webhookUserId}
                </div>
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/api/webhook/lead?uid=${webhookUserId}`;
                    navigator.clipboard.writeText(url).catch(() => {});
                    setWebhookCopied(true);
                    setTimeout(() => setWebhookCopied(false), 2000);
                  }}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "none", background: webhookCopied ? green : blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                >
                  {webhookCopied ? "✓ Copied!" : "Copy Webhook URL"}
                </button>
              </>
            ) : (
              <p style={{ fontSize: 12, color: muted }}>Loading your webhook URL…</p>
            )}
          </div>
          <div style={{ background: surf, borderRadius: 10, padding: "16px 18px", border: `1px solid ${bdr}` }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Expected POST Body</p>
            <pre style={{ fontSize: 12, color: ink, lineHeight: 1.7, background: "#fff", borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, overflowX: "auto" }}>{`{
  "name":    "Alex Johnson",        // required
  "email":   "alex@acme.com",       // required
  "company": "Acme Corp",           // optional
  "message": "Interested in demo",  // optional
  "phone":   "+1 555-0100",         // optional
  "source":  "typeform"             // optional
}`}</pre>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              ["Susi responds", "Auto-sends a personalized reply to the lead within 60s"],
              ["You're notified", "You receive an email with the full lead details + Susi's response"],
              ["Pipeline updated", "Lead is auto-added to the Lead stage in your pipeline"],
            ].map(([title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: green, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>✓</span>
                <p style={{ fontSize: 12, color: ink }}><strong>{title}</strong> — {desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BRAND MESSAGING RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function BrandMessagingRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    positioningStatement?: string;
    taglines?: { tagline: string; reasoning: string }[];
    elevatorPitch?: { oneLiner?: string; thirtySecond?: string; twoMinute?: string };
    valueProps?: { headline: string; description: string; proof?: string }[];
    voiceGuide?: { personality?: string[]; doSay?: string[]; dontSay?: string[]; examplePhrases?: string[] };
    investorNarrative?: string;
  };

  const [deploying, setDeploying]     = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);
  const [deployError, setDeployError] = useState<string | null>(null);

  // Blog post state
  const [showBlogModal, setShowBlogModal]   = useState(false);
  const [blogTopic, setBlogTopic]           = useState("");
  const [writingBlog, setWritingBlog]       = useState(false);
  const [blogHtml, setBlogHtml]             = useState<string | null>(null);
  const [blogError, setBlogError]           = useState<string | null>(null);
  const [publishingBlog, setPublishingBlog] = useState(false);
  const [blogPublishedUrl, setBlogPublishedUrl] = useState<string | null>(null);
  const [blogPublishError, setBlogPublishError] = useState<string | null>(null);

  // Buffer scheduler state
  const [showBufferModal, setShowBufferModal] = useState(false);
  const [bufferToken, setBufferToken]         = useState("");
  const [scheduling, setScheduling]           = useState(false);
  const [bufferResult, setBufferResult]       = useState<{ scheduled: number; profiles: string[] } | null>(null);
  const [bufferError, setBufferError]         = useState<string | null>(null);

  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/agents/landingpage/deploy?artifactId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.site?.url) setDeployedUrl(d.site.url); })
      .catch(() => {});
  }, [artifactId]);

  async function handleDeploy() {
    if (deploying) return;
    setDeploying(true); setDeployError(null);
    try {
      const res = await fetch('/api/agents/landingpage/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactType: 'brand_messaging', artifactContent: data, siteName: 'brand-site', agentId: 'maya', artifactId }),
      });
      const result = await res.json();
      if (res.ok) setDeployedUrl(result.url);
      else setDeployError(result.error ?? 'Deploy failed — check NETLIFY_API_KEY');
    } catch { setDeployError('Network error'); }
    finally { setDeploying(false); }
  }

  async function handleWriteBlog() {
    if (!blogTopic.trim() || writingBlog) return;
    setWritingBlog(true); setBlogError(null); setBlogHtml(null);
    try {
      const res = await fetch('/api/agents/maya/blog-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: blogTopic.trim(), artifactId }),
      });
      const result = await res.json();
      if (res.ok) setBlogHtml(result.html);
      else setBlogError(result.error ?? 'Blog generation failed');
    } catch { setBlogError('Network error'); }
    finally { setWritingBlog(false); }
  }

  async function handlePublishBlog() {
    if (!blogHtml || publishingBlog) return;
    setPublishingBlog(true); setBlogPublishError(null);
    try {
      const res = await fetch('/api/agents/maya/blog-publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: blogHtml, title: blogTopic.trim(), topic: blogTopic.trim(), artifactId }),
      });
      const result = await res.json();
      if (res.ok) setBlogPublishedUrl(result.url);
      else setBlogPublishError(result.error ?? 'Publish failed');
    } catch { setBlogPublishError('Network error'); }
    finally { setPublishingBlog(false); }
  }

  function downloadBlog() {
    if (!blogHtml) return;
    const fullHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${blogTopic}</title><style>body{font-family:system-ui,sans-serif;max-width:680px;margin:60px auto;padding:0 24px;line-height:1.7;color:#111}h1{font-size:2rem;font-weight:700;line-height:1.2;margin-bottom:24px}h2{font-size:1.25rem;font-weight:600;margin-top:36px}p{margin-bottom:18px}blockquote{border-left:3px solid #7C3AED;padding-left:18px;color:#555;font-style:italic;margin:24px 0}</style></head><body>${blogHtml}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `blog-${blogTopic.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)}.html`;
    a.click(); URL.revokeObjectURL(url);
  }

  async function handleBufferSchedule() {
    if (!bufferToken.trim() || scheduling) return;
    setScheduling(true); setBufferError(null); setBufferResult(null);
    try {
      const res = await fetch('/api/agents/maya/buffer-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bufferToken: bufferToken.trim(), platforms: ['linkedin', 'twitter'], artifactId }),
      });
      const r = await res.json();
      if (res.ok) setBufferResult(r);
      else setBufferError(r.error ?? 'Scheduling failed');
    } catch { setBufferError('Network error'); }
    finally { setScheduling(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const purple = "#7C3AED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Deploy Website CTA (Maya P0) ── */}
      <div style={{ background: deployedUrl ? "#F5F3FF" : "#F5F3FF", border: `1px solid ${deployedUrl ? "#A78BFA" : "#DDD6FE"}`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          {deployedUrl ? (
            <><p style={{ fontSize: 12, fontWeight: 700, color: purple, marginBottom: 2 }}>Your website is live!</p>
              <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: purple, textDecoration: "underline", wordBreak: "break-all" }}>{deployedUrl}</a></>
          ) : (
            <><p style={{ fontSize: 12, fontWeight: 700, color: purple, marginBottom: 2 }}>Deploy your brand website</p>
              <p style={{ fontSize: 11, color: muted }}>Turn this brand messaging into a full website — hero, value props, waitlist CTA. Live in seconds.</p></>
          )}
          {deployError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{deployError}</p>}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          {deployedUrl && <a href={deployedUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${purple}`, background: "transparent", color: purple, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>View Site</a>}
          <button onClick={handleDeploy} disabled={deploying} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: deploying ? bdr : purple, color: deploying ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: deploying ? "not-allowed" : "pointer" }}>
            {deploying ? "Deploying…" : deployedUrl ? "Redeploy" : "Deploy Website"}
          </button>
        </div>
      </div>
      {d.positioningStatement && (
        <div style={{ background: "#F5F3FF", border: `1px solid #DDD6FE`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: purple, marginBottom: 6 }}>Positioning Statement</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7, fontStyle: "italic" }}>{d.positioningStatement}</p>
        </div>
      )}

      {d.taglines && d.taglines.length > 0 && (
        <div>
          <p style={sectionHead}>Tagline Options</p>
          {d.taglines.map((t, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink, marginBottom: 4 }}>&quot;{t.tagline}&quot;</p>
              <p style={{ fontSize: 11, color: muted }}>{t.reasoning}</p>
            </div>
          ))}
        </div>
      )}

      {d.elevatorPitch && (
        <div>
          <p style={sectionHead}>Elevator Pitch</p>
          {d.elevatorPitch.oneLiner && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>One-liner</p>
              <p style={{ fontSize: 14, fontWeight: 600, color: ink }}>{d.elevatorPitch.oneLiner}</p>
            </div>
          )}
          {d.elevatorPitch.thirtySecond && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>30-Second</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.elevatorPitch.thirtySecond}</p>
            </div>
          )}
          {d.elevatorPitch.twoMinute && (
            <div>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 4 }}>2-Minute</p>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.elevatorPitch.twoMinute}</p>
            </div>
          )}
        </div>
      )}

      {d.valueProps && d.valueProps.length > 0 && (
        <div>
          <p style={sectionHead}>Value Props</p>
          {d.valueProps.map((vp, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{vp.headline}</p>
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: vp.proof ? 4 : 0 }}>{vp.description}</p>
              {vp.proof && <p style={{ fontSize: 11, color: green }}>Proof: {vp.proof}</p>}
            </div>
          ))}
        </div>
      )}

      {d.voiceGuide && (
        <div>
          <p style={sectionHead}>Voice Guide</p>
          {d.voiceGuide.personality && d.voiceGuide.personality.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 10, color: muted, fontWeight: 600, textTransform: "uppercase", marginBottom: 6 }}>Personality</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {d.voiceGuide.personality.map((p, i) => (
                  <span key={i} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 12, background: "#F5F3FF", color: purple, border: `1px solid #DDD6FE` }}>{p}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {d.voiceGuide.doSay && d.voiceGuide.doSay.length > 0 && (
              <div style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 12px", border: `1px solid #BBF7D0` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: green, marginBottom: 6 }}>DO SAY</p>
                {d.voiceGuide.doSay.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>✓ {s}</p>)}
              </div>
            )}
            {d.voiceGuide.dontSay && d.voiceGuide.dontSay.length > 0 && (
              <div style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: `1px solid #FECACA` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: red, marginBottom: 6 }}>AVOID</p>
                {d.voiceGuide.dontSay.map((s, i) => <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>✗ {s}</p>)}
              </div>
            )}
          </div>
        </div>
      )}

      {d.investorNarrative && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: blue, marginBottom: 6 }}>Investor Narrative</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.investorNarrative}</p>
        </div>
      )}

      {/* ── Figma-ready social media templates ──────────────────────────────── */}
      <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "16px 18px", border: `1px solid #DDD6FE` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: purple, textTransform: "uppercase", letterSpacing: "0.1em" }}>Figma-Ready Social Templates</p>
          <button
            onClick={() => {
              const tagline = d.taglines?.[0]?.tagline || "Your tagline here";
              const oneLiner = d.elevatorPitch?.oneLiner || d.positioningStatement || "Transforming how the world works.";
              const brand = d.voiceGuide?.personality?.slice(0, 2).join(" · ") || "Bold · Trustworthy";
              const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Brand Social Templates</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f0f0f0; padding: 32px; display: flex; flex-direction: column; gap: 40px; align-items: center; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #888; margin: 0 0 8px; }
  .card { display: block; margin: 0 auto; }
  p.hint { font-size: 11px; color: #aaa; margin: 6px 0 0; text-align: center; }
</style>
</head>
<body>
<h1 style="font-size:24px;font-weight:700;margin-bottom:0">Brand Social Templates</h1>
<p style="color:#666;margin-top:4px">Open in browser · Screenshot or copy SVGs into Figma</p>

<!-- Instagram Square 1080x1080 -->
<section>
  <h2>Instagram Post · 1080×1080</h2>
  <svg class="card" width="540" height="540" viewBox="0 0 1080 1080" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#4F46E5"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1080" fill="url(#grad1)" rx="0"/>
    <rect x="60" y="60" width="960" height="960" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="2" rx="12"/>
    <text x="540" y="380" font-family="system-ui" font-size="96" font-weight="800" fill="white" text-anchor="middle" dominant-baseline="middle">"${tagline.replace(/"/g, '&quot;')}"</text>
    <text x="540" y="580" font-family="system-ui" font-size="42" fill="rgba(255,255,255,0.85)" text-anchor="middle">${oneLiner.replace(/&/g, '&amp;').substring(0, 80)}</text>
    <text x="540" y="960" font-family="system-ui" font-size="30" fill="rgba(255,255,255,0.5)" text-anchor="middle">${brand}</text>
  </svg>
  <p class="hint">1080×1080 · Copy SVG into Figma or screenshot at 2×</p>
</section>

<!-- Twitter / X Card 1200x628 -->
<section>
  <h2>Twitter / X Card · 1200×628</h2>
  <svg class="card" width="600" height="314" viewBox="0 0 1200 628" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="628" fill="#0F0F0F"/>
    <rect x="0" y="0" width="6" height="628" fill="#7C3AED"/>
    <text x="80" y="220" font-family="system-ui" font-size="72" font-weight="800" fill="white">"${tagline.replace(/"/g, '&quot;').substring(0, 40)}"</text>
    <text x="80" y="330" font-family="system-ui" font-size="34" fill="#aaa">${oneLiner.replace(/&/g, '&amp;').substring(0, 70)}</text>
    <rect x="80" y="420" width="200" height="2" fill="#7C3AED"/>
    <text x="80" y="490" font-family="system-ui" font-size="26" fill="#666">${brand}</text>
  </svg>
  <p class="hint">1200×628 · Ideal for Twitter/X link previews and Open Graph</p>
</section>

<!-- LinkedIn Banner 1584x396 -->
<section>
  <h2>LinkedIn Banner · 1584×396</h2>
  <svg class="card" width="594" height="148" viewBox="0 0 1584 396" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad2" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#4F46E5"/>
        <stop offset="60%" stop-color="#7C3AED"/>
        <stop offset="100%" stop-color="#9F1239"/>
      </linearGradient>
    </defs>
    <rect width="1584" height="396" fill="url(#grad2)"/>
    <text x="80" y="150" font-family="system-ui" font-size="80" font-weight="800" fill="white">${tagline.replace(/"/g, '&quot;').substring(0, 50)}</text>
    <text x="80" y="260" font-family="system-ui" font-size="38" fill="rgba(255,255,255,0.8)">${oneLiner.replace(/&/g, '&amp;').substring(0, 80)}</text>
    <text x="80" y="340" font-family="system-ui" font-size="28" fill="rgba(255,255,255,0.5)">${brand}</text>
  </svg>
  <p class="hint">1584×396 · LinkedIn company page banner</p>
</section>

</body>
</html>`;
              const blob = new Blob([html], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "brand_social_templates.html";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ padding: "7px 14px", borderRadius: 8, background: purple, border: "none", fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer" }}
          >
            Download Templates
          </button>
        </div>
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
          3 templates (Instagram 1080×1080, Twitter card 1200×628, LinkedIn banner 1584×396) generated from your brand copy. Open the HTML file in a browser, then screenshot or copy the SVGs directly into Figma.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["Instagram 1:1", "Twitter Card", "LinkedIn Banner"].map((label, i) => (
            <span key={i} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, background: "white", color: purple, border: `1px solid #DDD6FE`, fontWeight: 600 }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Buffer Social Scheduler ───────────────────────────────────────────── */}
      <div style={{ background: "#FFF7ED", borderRadius: 12, padding: "16px 18px", border: `1px solid #FED7AA` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#EA580C", marginBottom: 2 }}>Schedule 30 Days of Posts</p>
            <p style={{ fontSize: 11, color: muted }}>Maya generates 30 LinkedIn + Twitter posts from your brand voice and schedules them to Buffer.</p>
          </div>
          <button onClick={() => { setShowBufferModal(true); setBufferResult(null); setBufferError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#EA580C", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Schedule Posts
          </button>
        </div>
      </div>

      {/* Buffer Modal */}
      {showBufferModal && (
        <div onClick={() => { if (!scheduling) setShowBufferModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Schedule 30 Days to Buffer</p>
              <button onClick={() => setShowBufferModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {bufferResult ? (
              <div>
                <div style={{ background: "#FFF7ED", borderRadius: 10, padding: "14px 16px", border: `1px solid #FED7AA`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#EA580C", marginBottom: 4 }}>✓ {bufferResult.scheduled} posts scheduled!</p>
                  <p style={{ fontSize: 11, color: muted }}>Connected to: {bufferResult.profiles.join(', ')}</p>
                </div>
                <p style={{ fontSize: 12, color: muted, marginBottom: 16, lineHeight: 1.6 }}>Your posts will go live over the next 30 days. View and edit them in your Buffer dashboard.</p>
                <button onClick={() => { setShowBufferModal(false); setBufferResult(null); setBufferToken(""); }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#EA580C", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Buffer Access Token *</label>
                  <input
                    type="password"
                    value={bufferToken}
                    onChange={e => setBufferToken(e.target.value)}
                    placeholder="Token from buffer.com/developers/api/oauth"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Get your token at buffer.com → Developers → Access Token. Connect LinkedIn + Twitter to Buffer first.</p>
                </div>
                {bufferError && <p style={{ fontSize: 12, color: red }}>{bufferError}</p>}
                <button onClick={handleBufferSchedule} disabled={!bufferToken.trim() || scheduling} style={{ padding: "10px", borderRadius: 8, border: "none", background: !bufferToken.trim() ? bdr : "#EA580C", color: !bufferToken.trim() ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !bufferToken.trim() ? "not-allowed" : "pointer" }}>
                  {scheduling ? "Generating & Scheduling…" : "Generate & Schedule 30 Posts"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Blog Post Writer ─────────────────────────────────────────────────── */}
      <div style={{ background: "#FAFAFA", borderRadius: 12, padding: "16px 18px", border: `1px solid ${bdr}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: ink, marginBottom: 2 }}>Write a Blog Post</p>
            <p style={{ fontSize: 11, color: muted }}>Generate a brand-voice article and download as HTML.</p>
          </div>
          <button onClick={() => { setShowBlogModal(true); setBlogHtml(null); setBlogError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: purple, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Write Post
          </button>
        </div>
      </div>

      {/* Blog Post Modal */}
      {showBlogModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowBlogModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Write Blog Post</p>
              <button onClick={() => setShowBlogModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!blogHtml ? (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Blog Topic / Title Idea</label>
                <input
                  value={blogTopic}
                  onChange={e => setBlogTopic(e.target.value)}
                  placeholder="e.g. Why most B2B SaaS onboarding fails (and how we fixed it)"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box", marginBottom: 16 }}
                  onKeyDown={e => { if (e.key === "Enter") handleWriteBlog(); }}
                />
                {blogError && <p style={{ fontSize: 12, color: red, marginBottom: 12 }}>{blogError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowBlogModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleWriteBlog} disabled={writingBlog || !blogTopic.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: writingBlog ? bdr : purple, color: writingBlog ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: writingBlog ? "not-allowed" : "pointer" }}>
                    {writingBlog ? "Writing…" : "Generate Post"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ border: `1px solid ${bdr}`, borderRadius: 10, padding: "20px 24px", marginBottom: 20, lineHeight: 1.75, fontSize: 14, color: ink }} dangerouslySetInnerHTML={{ __html: blogHtml }} />
                {blogPublishedUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8, background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: "#15803D", fontWeight: 500 }}>Live at</span>
                    <a href={blogPublishedUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "#15803D", fontWeight: 600, wordBreak: "break-all" }}>{blogPublishedUrl} →</a>
                  </div>
                )}
                {blogPublishError && (
                  <div style={{ padding: "8px 12px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA", marginBottom: 12, fontSize: 13, color: "#DC2626" }}>{blogPublishError}</div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setBlogHtml(null); setBlogTopic(""); setBlogPublishedUrl(null); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Write Another</button>
                  <button onClick={downloadBlog} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>
                    Download HTML
                  </button>
                  <button onClick={handlePublishBlog} disabled={publishingBlog || !!blogPublishedUrl} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: publishingBlog ? bdr : blogPublishedUrl ? "#16A34A" : purple, color: publishingBlog ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: publishingBlog || blogPublishedUrl ? "default" : "pointer" }}>
                    {publishingBlog ? "Publishing…" : blogPublishedUrl ? "Published ✓" : "Publish to Site"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL SUMMARY RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function FinancialSummaryRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    snapshot?: Record<string, string>;
    unitEconomicsVerdict?: string;
    keyInsights?: string[];
    fundraisingRecommendation?: { amount?: string; rationale?: string; timeline?: string };
    useOfFunds?: { category: string; percentage: number; rationale: string }[];
    risks?: { risk: string; severity: string; mitigation: string }[];
  };

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [recipients, setRecipients]           = useState("");
  const [topWin, setTopWin]                   = useState("");
  const [topChallenge, setTopChallenge]       = useState("");
  const [ask, setAsk]                         = useState("");
  const [sendingUpdate, setSendingUpdate]     = useState(false);
  const [updateResult, setUpdateResult]       = useState<{ ok?: boolean; error?: string } | null>(null);

  // Stripe live metrics state
  const [showStripeModal, setShowStripeModal] = useState(false);
  const [stripeKey, setStripeKey]             = useState("");
  const [fetchingStripe, setFetchingStripe]   = useState(false);
  const [stripeMetrics, setStripeMetrics]     = useState<{ mrr: number; arr: number; activeSubscriptions: number; totalCustomers?: number; last30DayRevenue: number } | null>(null);
  const [stripeError, setStripeError]         = useState<string | null>(null);

  // Runway alert state
  const [alertSent, setAlertSent]             = useState(false);
  const [sendingAlert, setSendingAlert]       = useState(false);
  const [alertError, setAlertError]           = useState<string | null>(null);

  // Runway cuts analysis state
  const [analyzingCuts, setAnalyzingCuts]     = useState(false);
  const [cutsResult, setCutsResult]           = useState<{
    cuts: { category: string; potentialSaving: string; action: string; difficulty: string; timeframe: string; rationale: string }[];
    summary: string;
    totalPotentialSavings: string;
  } | null>(null);
  const [cutsError, setCutsError]             = useState<string | null>(null);

  // Invoice state
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceEmail, setInvoiceEmail]         = useState("");
  const [invoiceName, setInvoiceName]           = useState("");
  const [invoiceAmount, setInvoiceAmount]       = useState("");
  const [invoiceDesc, setInvoiceDesc]           = useState("");
  const [invoiceDue, setInvoiceDue]             = useState("");
  const [sendingInvoice, setSendingInvoice]     = useState(false);
  const [invoiceResult, setInvoiceResult]       = useState<{ invoiceNumber?: string; invoiceUrl?: string; platform?: string } | null>(null);
  const [invoiceError, setInvoiceError]         = useState<string | null>(null);

  async function handleSendInvoice() {
    if (!invoiceEmail || !invoiceAmount || !invoiceDesc || sendingInvoice) return;
    setSendingInvoice(true); setInvoiceError(null); setInvoiceResult(null);
    try {
      const res = await fetch('/api/agents/felix/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerEmail: invoiceEmail, customerName: invoiceName, amount: parseFloat(invoiceAmount), description: invoiceDesc, dueDate: invoiceDue || undefined }),
      });
      const result = await res.json();
      if (res.ok) setInvoiceResult(result);
      else setInvoiceError(result.error ?? 'Failed to create invoice');
    } catch { setInvoiceError('Network error'); }
    finally { setSendingInvoice(false); }
  }

  // Parse runway from snapshot
  const runwayRaw = d.snapshot?.runway ?? d.snapshot?.runwayMonths ?? d.snapshot?.["Runway"] ?? d.snapshot?.["runway (months)"] ?? "";
  const runwayMonths = runwayRaw ? parseFloat(String(runwayRaw).replace(/[^0-9.]/g, "")) : NaN;
  const runwayWarning = !isNaN(runwayMonths) && runwayMonths < 6;
  const runwayUrgency = runwayMonths <= 2 ? "CRITICAL" : runwayMonths <= 4 ? "HIGH" : "MEDIUM";
  const runwayBannerColor = runwayUrgency === "CRITICAL" ? { bg: "#FEF2F2", border: "#FECACA", text: red, badge: "#DC2626" } : runwayUrgency === "HIGH" ? { bg: "#FFFBEB", border: "#FDE68A", text: amber, badge: "#D97706" } : { bg: "#F5F3FF", border: "#DDD6FE", text: "#7C3AED", badge: "#7C3AED" };

  async function handleRunwayAlert() {
    if (sendingAlert || alertSent) return;
    setSendingAlert(true); setAlertError(null);
    try {
      const snap = d.snapshot ?? {};
      const burnRaw = snap["monthlyBurn"] ?? snap["burn"] ?? snap["burnRate"] ?? "";
      const mrrRaw = snap["mrr"] ?? snap["MRR"] ?? "";
      const res = await fetch('/api/agents/felix/runway-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runwayMonths,
          burnRate: burnRaw ? parseFloat(String(burnRaw).replace(/[^0-9.]/g, "")) : undefined,
          mrr: mrrRaw ? parseFloat(String(mrrRaw).replace(/[^0-9.]/g, "")) : undefined,
          artifactId,
        }),
      });
      if (res.ok) setAlertSent(true);
      else { const r = await res.json(); setAlertError(r.error ?? 'Failed to send alert'); }
    } catch { setAlertError('Network error'); }
    finally { setSendingAlert(false); }
  }

  async function handleAnalyzeCuts() {
    if (analyzingCuts) return;
    setAnalyzingCuts(true); setCutsError(null);
    try {
      const snap = d.snapshot ?? {};
      const burnRaw = snap["monthlyBurn"] ?? snap["burn"] ?? snap["burnRate"] ?? "";
      const mrrRaw  = snap["mrr"] ?? snap["MRR"] ?? "";
      const res = await fetch('/api/agents/felix/runway-cuts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runwayMonths,
          burnRate: burnRaw ? parseFloat(String(burnRaw).replace(/[^0-9.]/g, "")) : undefined,
          mrr:      mrrRaw  ? parseFloat(String(mrrRaw).replace(/[^0-9.]/g, ""))  : undefined,
          snapshot: snap,
          artifactId,
        }),
      });
      const result = await res.json();
      if (res.ok) setCutsResult(result);
      else setCutsError(result.error ?? 'Analysis failed');
    } catch { setCutsError('Network error'); }
    finally { setAnalyzingCuts(false); }
  }

  async function handleFetchStripe() {
    if (!stripeKey.trim() || fetchingStripe) return;
    setFetchingStripe(true); setStripeError(null);
    try {
      const res = await fetch('/api/agents/felix/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stripeKey: stripeKey.trim() }),
      });
      const result = await res.json();
      if (res.ok) { setStripeMetrics(result); setShowStripeModal(false); setStripeKey(""); }
      else setStripeError(result.error ?? 'Failed to fetch Stripe metrics');
    } catch { setStripeError('Network error'); }
    finally { setFetchingStripe(false); }
  }

  async function handleSendUpdate() {
    const recipientList = recipients.split(/[\n,]+/).map(r => r.trim()).filter(r => r.includes('@'));
    if (!recipientList.length || sendingUpdate) return;
    setSendingUpdate(true); setUpdateResult(null);
    try {
      const snap = d.snapshot ?? {};
      const res = await fetch('/api/agents/felix/investor-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipients: recipientList,
          metricsSnapshot: { mrr: snap['mrr'] ?? snap['MRR'], arr: snap['arr'] ?? snap['ARR'], growth: snap['growth'] ?? snap['growthRate'], runway: snap['runway'] ?? snap['runwayMonths'], topWin, topChallenge, ask },
        }),
      });
      const result = await res.json();
      if (res.ok) setUpdateResult({ ok: true });
      else setUpdateResult({ error: result.error ?? 'Failed to send' });
    } catch { setUpdateResult({ error: 'Network error' }); }
    finally { setSendingUpdate(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const verdictColor = d.unitEconomicsVerdict === "healthy" ? green : d.unitEconomicsVerdict === "needs-work" ? amber : red;
  const sevColor: Record<string, string> = { high: red, medium: amber, low: green };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Runway Alert Banner ── */}
      {runwayWarning && (
        <div style={{ background: runwayBannerColor.bg, border: `1.5px solid ${runwayBannerColor.border}`, borderRadius: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 8, background: runwayBannerColor.badge, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 800, color: runwayBannerColor.badge }}>
                  {runwayUrgency} — {runwayMonths} month{runwayMonths !== 1 ? "s" : ""} of runway
                </p>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", padding: "2px 7px", borderRadius: 999, background: runwayBannerColor.badge, color: "white", letterSpacing: "0.08em" }}>
                  {runwayUrgency}
                </span>
              </div>
              <p style={{ fontSize: 12, color: runwayBannerColor.text, lineHeight: 1.5, marginBottom: 10 }}>
                {runwayMonths <= 3
                  ? "You are in the danger zone. Start fundraising conversations and cut burn immediately."
                  : "Begin investor conversations now — fundraising takes 3-6 months. Don't wait."}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {alertSent ? (
                  <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 600 }}>✓ Alert email sent to your inbox</span>
                ) : (
                  <button onClick={handleRunwayAlert} disabled={sendingAlert} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: runwayBannerColor.badge, color: "white", fontSize: 12, fontWeight: 600, cursor: sendingAlert ? "not-allowed" : "pointer", opacity: sendingAlert ? 0.7 : 1 }}>
                    {sendingAlert ? "Sending…" : "Email me this alert"}
                  </button>
                )}
                <button onClick={handleAnalyzeCuts} disabled={analyzingCuts || !!cutsResult} style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${runwayBannerColor.badge}`, background: "transparent", color: runwayBannerColor.badge, fontSize: 12, fontWeight: 600, cursor: analyzingCuts || cutsResult ? "default" : "pointer", opacity: analyzingCuts ? 0.7 : 1 }}>
                  {analyzingCuts ? "Analyzing…" : cutsResult ? "Analysis ready ↓" : "Analyze cuts with AI"}
                </button>
              </div>
              {alertError && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{alertError}</p>}
              {cutsError  && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{cutsError}</p>}

              {/* ── Runway Cuts Analysis Results ── */}
              {cutsResult && (
                <div style={{ marginTop: 14, borderTop: `1px dashed ${runwayBannerColor.border}`, paddingTop: 14 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: runwayBannerColor.badge, marginBottom: 6 }}>
                    AI Cut Analysis — {cutsResult.totalPotentialSavings && `Save up to ${cutsResult.totalPotentialSavings}`}
                  </p>
                  {cutsResult.summary && (
                    <p style={{ fontSize: 12, color: runwayBannerColor.text, lineHeight: 1.6, marginBottom: 12 }}>{cutsResult.summary}</p>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {cutsResult.cuts.map((cut, i) => (
                      <div key={i} style={{ background: "rgba(255,255,255,0.6)", borderRadius: 8, padding: "10px 12px", border: `1px solid ${runwayBannerColor.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: runwayBannerColor.badge }}>{cut.category}</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: cut.difficulty === "easy" ? green : cut.difficulty === "medium" ? amber : red, background: cut.difficulty === "easy" ? "#DCFCE7" : cut.difficulty === "medium" ? "#FEF3C7" : "#FEE2E2", padding: "1px 7px", borderRadius: 999 }}>{cut.difficulty}</span>
                          <span style={{ fontSize: 11, color: muted, marginLeft: "auto" }}>{cut.timeframe}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: green }}>{cut.potentialSaving}</span>
                        </div>
                        <p style={{ fontSize: 12, color: ink, fontWeight: 500, marginBottom: 3 }}>{cut.action}</p>
                        <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{cut.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {d.snapshot && (
        <div>
          <p style={sectionHead}>Snapshot</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: bdr, borderRadius: 8, overflow: "hidden" }}>
            {Object.entries(d.snapshot).map(([k, v]) => (
              <div key={k} style={{ background: surf, padding: "10px 12px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                  {k.replace(/([A-Z])/g, ' $1').trim()}
                </p>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{v}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.unitEconomicsVerdict && (
        <div style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 12, color: muted }}>Unit Economics:</p>
          <span style={{ fontSize: 12, fontWeight: 700, color: verdictColor, textTransform: "capitalize" }}>{d.unitEconomicsVerdict.replace(/-/g, ' ')}</span>
        </div>
      )}

      {d.keyInsights && d.keyInsights.length > 0 && (
        <div>
          <p style={sectionHead}>Key Insights</p>
          {d.keyInsights.map((insight, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
              <span style={{ color: blue, fontWeight: 700, flexShrink: 0, fontSize: 12 }}>{i + 1}.</span>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{insight}</p>
            </div>
          ))}
        </div>
      )}

      {d.fundraisingRecommendation && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: blue, marginBottom: 8 }}>Fundraising Recommendation</p>
          {d.fundraisingRecommendation.amount && <p style={{ fontSize: 20, fontWeight: 700, color: ink, marginBottom: 4 }}>{d.fundraisingRecommendation.amount}</p>}
          {d.fundraisingRecommendation.rationale && <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 4 }}>{d.fundraisingRecommendation.rationale}</p>}
          {d.fundraisingRecommendation.timeline && <p style={{ fontSize: 12, color: blue }}>{d.fundraisingRecommendation.timeline}</p>}
        </div>
      )}

      {d.useOfFunds && d.useOfFunds.length > 0 && (
        <div>
          <p style={sectionHead}>Use of Funds</p>
          {d.useOfFunds.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{item.percentage}%</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{item.category}</p>
                <p style={{ fontSize: 11, color: muted }}>{item.rationale}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.risks && d.risks.length > 0 && (
        <div>
          <p style={sectionHead}>Risks</p>
          {d.risks.map((r, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{r.risk}</p>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: sevColor[r.severity] || muted }}>{r.severity}</span>
              </div>
              <p style={{ fontSize: 11, color: muted }}>Mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Investor Update CTA ── */}
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "16px 18px", border: `1px solid #BFDBFE`, display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>Send Investor Update</p>
          <p style={{ fontSize: 11, color: muted }}>Send a YC-style monthly update with your real metrics to investors.</p>
        </div>
        <button onClick={() => { setShowUpdateModal(true); setUpdateResult(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Send Update
        </button>
      </div>

      {/* ── Stripe Live Metrics ──────────────────────────────────────────────── */}
      {stripeMetrics ? (
        <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "16px 18px", border: `1px solid #A78BFA` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.1em" }}>Live Stripe Metrics</p>
            <button onClick={() => setStripeMetrics(null)} style={{ fontSize: 10, color: muted, background: "none", border: "none", cursor: "pointer" }}>Disconnect</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, background: "#DDD6FE", borderRadius: 8, overflow: "hidden" }}>
            {[
              ["MRR", `$${stripeMetrics.mrr.toLocaleString()}`],
              ["ARR", `$${stripeMetrics.arr.toLocaleString()}`],
              ["Active Subs", stripeMetrics.activeSubscriptions.toString()],
              ["Last 30d Revenue", `$${stripeMetrics.last30DayRevenue.toLocaleString()}`],
            ].map(([label, value]) => (
              <div key={label} style={{ background: "#FAF5FF", padding: "10px 12px" }}>
                <p style={{ fontSize: 10, color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "16px 18px", border: `1px solid #DDD6FE`, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>Connect Stripe</p>
            <p style={{ fontSize: 11, color: muted }}>Pull your real MRR, ARR, and revenue into this model. Enter a read-only restricted key — never stored.</p>
          </div>
          <button onClick={() => setShowStripeModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            Connect
          </button>
        </div>
      )}

      {/* Stripe key modal */}
      {showStripeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowStripeModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Connect Stripe</p>
              <button onClick={() => setShowStripeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            <p style={{ fontSize: 12, color: muted, marginBottom: 16, lineHeight: 1.6 }}>
              Create a <strong>Restricted Key</strong> in your Stripe Dashboard with <em>read-only</em> access to Customers, Subscriptions, and Charges. The key is used once to fetch metrics and is never stored.
            </p>
            <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 6 }}>Stripe Restricted Key (rk_...)</label>
            <input
              type="password"
              value={stripeKey}
              onChange={e => setStripeKey(e.target.value)}
              placeholder="rk_live_..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box", marginBottom: 14 }}
              onKeyDown={e => { if (e.key === "Enter") handleFetchStripe(); }}
            />
            {stripeError && <p style={{ fontSize: 12, color: red, marginBottom: 12 }}>{stripeError}</p>}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setShowStripeModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleFetchStripe} disabled={fetchingStripe || !stripeKey.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: fetchingStripe ? bdr : "#7C3AED", color: fetchingStripe ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: fetchingStripe ? "not-allowed" : "pointer" }}>
                {fetchingStripe ? "Fetching…" : "Fetch Metrics"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Invoice ───────────────────────────────────────────────────── */}
      <div style={{ background: "#EFF6FF", borderRadius: 12, padding: "14px 18px", border: `1px solid #BFDBFE`, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>Create & Send Invoice</p>
          <p style={{ fontSize: 11, color: muted }}>Felix generates and emails a professional invoice to your customer — via Stripe if connected, otherwise Resend.</p>
        </div>
        <button onClick={() => { setShowInvoiceModal(true); setInvoiceResult(null); setInvoiceError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          New Invoice
        </button>
      </div>

      {/* Invoice Modal */}
      {showInvoiceModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !sendingInvoice) setShowInvoiceModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Create Invoice</p>
              <button onClick={() => setShowInvoiceModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>
            {invoiceResult ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 32, marginBottom: 10 }}>🧾</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: green, marginBottom: 6 }}>Invoice sent!</p>
                {invoiceResult.invoiceNumber && <p style={{ fontSize: 12, color: muted, marginBottom: 4 }}>Invoice #{invoiceResult.invoiceNumber}</p>}
                {invoiceResult.invoiceUrl && (
                  <a href={invoiceResult.invoiceUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: blue }}>View Stripe invoice →</a>
                )}
                <p style={{ fontSize: 11, color: muted, marginTop: 8 }}>via {invoiceResult.platform === 'stripe' ? 'Stripe' : 'Resend email'}</p>
                <button onClick={() => setShowInvoiceModal(false)} style={{ display: "block", margin: "16px auto 0", padding: "9px 20px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Customer Name</label>
                    <input value={invoiceName} onChange={e => setInvoiceName(e.target.value)} placeholder="Acme Corp" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Customer Email *</label>
                    <input value={invoiceEmail} onChange={e => setInvoiceEmail(e.target.value)} placeholder="billing@acme.com" type="email" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Amount (USD) *</label>
                    <input value={invoiceAmount} onChange={e => setInvoiceAmount(e.target.value)} placeholder="1500" type="number" min="1" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Due Date</label>
                    <input value={invoiceDue} onChange={e => setInvoiceDue(e.target.value)} type="date" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Description *</label>
                  <input value={invoiceDesc} onChange={e => setInvoiceDesc(e.target.value)} placeholder="Monthly SaaS subscription — Professional Plan" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                </div>
                {invoiceError && <p style={{ fontSize: 12, color: red }}>{invoiceError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowInvoiceModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleSendInvoice}
                    disabled={sendingInvoice || !invoiceEmail || !invoiceAmount || !invoiceDesc}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: sendingInvoice ? bdr : blue, color: sendingInvoice ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: sendingInvoice ? "not-allowed" : "pointer" }}
                  >
                    {sendingInvoice ? "Creating…" : "Send Invoice"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Google Sheets export ─────────────────────────────────────────────── */}
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "16px 18px", border: `1px solid #BBF7D0` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.1em" }}>Export to Google Sheets</p>
          <button
            onClick={() => {
              // Build a CSV that Google Sheets reads as a financial model with formula rows
              const snap = d.snapshot || {};
              const funds = d.useOfFunds || [];
              const now = new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" });

              const rows: string[][] = [
                ["Felix Financial Model", "", "", "", "", ""],
                ["Generated", now, "", "", "", ""],
                ["", "", "", "", "", ""],
                ["── SNAPSHOT ──", "", "", "", "", ""],
                ...Object.entries(snap).map(([k, v]) => [k.replace(/([A-Z])/g, " $1").trim(), v, "", "", "", ""]),
                ["", "", "", "", "", ""],
                ["── PROJECTIONS (edit yellow cells) ──", "", "", "", "", ""],
                ["Month", "MRR ($)", "New Customers", "Churn (%)", "Burn ($)", "Net Cash"],
                ...Array.from({ length: 12 }, (_, i) => {
                  const row = i + 3; // rows start at row 9 (header = row 8)
                  const mrrRef = i === 0 ? (snap["mrr"] || "0").replace(/[^0-9.]/g, "") : `=B${row-1}*(1+C${row}/100-D${row}/100)`;
                  return [
                    `Month ${i + 1}`,
                    i === 0 ? mrrRef : mrrRef,
                    "10",
                    "2",
                    snap["monthlyBurn"] ? (snap["monthlyBurn"] || "0").replace(/[^0-9.]/g, "") : "20000",
                    i === 0 ? `=B${row+1}-E${row+1}` : `=F${row-1}+B${row+1}-E${row+1}`,
                  ];
                }),
                ["", "", "", "", "", ""],
                ["── USE OF FUNDS ──", "", "", "", "", ""],
                ["Category", "% Allocation", "Rationale", "", "", ""],
                ...funds.map(f => [f.category, `${f.percentage}%`, f.rationale, "", "", ""]),
              ];

              const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
              const blob = new Blob([csv], { type: "text/csv" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "felix_financial_model.csv";
              a.click();
              URL.revokeObjectURL(url);
            }}
            style={{ padding: "7px 14px", borderRadius: 8, background: green, border: "none", fontSize: 12, fontWeight: 600, color: "white", cursor: "pointer" }}
          >
            Download CSV
          </button>
        </div>
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
          Exports your financial snapshot + a 12-month projection table with live formulas (MRR growth, churn, net cash). Import into Google Sheets: <strong>File → Import → Upload</strong>.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {["Snapshot", "12-month MRR model", "Use of funds"].map((label, i) => (
            <span key={i} style={{ padding: "4px 10px", borderRadius: 999, fontSize: 11, background: "white", color: green, border: `1px solid #BBF7D0`, fontWeight: 600 }}>{label}</span>
          ))}
        </div>
      </div>

      {/* ── Investor Update Modal ── */}
      {showUpdateModal && (
        <div onClick={() => { if (!sendingUpdate) setShowUpdateModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Monthly Investor Update</p>
              <button onClick={() => setShowUpdateModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {updateResult?.ok ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 22, marginBottom: 10 }}>📨</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>Update sent!</p>
                <button onClick={() => { setShowUpdateModal(false); setUpdateResult(null); }} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Recipients (emails, one per line or comma-separated) *</label>
                  <textarea value={recipients} onChange={e => setRecipients(e.target.value)} placeholder="investor@a16z.com&#10;partner@sequoia.com" rows={3} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Top Win this month</label>
                  <input value={topWin} onChange={e => setTopWin(e.target.value)} placeholder="Closed 3 enterprise deals" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Top Challenge</label>
                  <input value={topChallenge} onChange={e => setTopChallenge(e.target.value)} placeholder="Slow sales cycle at enterprise" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>The Ask (introductions, advice, etc.)</label>
                  <input value={ask} onChange={e => setAsk(e.target.value)} placeholder="Intros to VP Sales at Series B companies" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                {updateResult?.error && <p style={{ fontSize: 12, color: red }}>{updateResult.error}</p>}
                <button onClick={handleSendUpdate} disabled={!recipients || sendingUpdate} style={{ padding: "10px", borderRadius: 8, border: "none", background: !recipients ? bdr : blue, color: !recipients ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !recipients ? "not-allowed" : "pointer" }}>
                  {sendingUpdate ? "Sending…" : "Send via Email"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGAL CHECKLIST RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function LegalChecklistRenderer({ data, artifactId: _artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    companyStage?: string;
    priorityActions?: string[];
    incorporationItems?: { item: string; status: string; description: string; urgency?: string }[];
    ipItems?: { item: string; status: string; description: string }[];
    fundraisingDocs?: { document: string; description: string; recommendation: string }[];
    contractTemplates?: string[];
    redFlags?: string[];
  };

  const [showNdaModal, setShowNdaModal]       = useState(false);
  const [ndaCounterparty, setNdaCounterparty] = useState("");
  const [ndaEmail, setNdaEmail]               = useState("");
  const [ndaType, setNdaType]                 = useState<"mutual" | "one-way">("mutual");
  const [ndaPurpose, setNdaPurpose]           = useState("");
  const [generatingNda, setGeneratingNda]     = useState(false);
  const [ndaHtml, setNdaHtml]                 = useState<string | null>(null);

  // Data room state
  const [buildingDataRoom, setBuildingDataRoom] = useState(false);
  const [dataRoomMeta, setDataRoomMeta]         = useState<{ folderCount: number; artifactCount: number; missing: string[] } | null>(null);
  const [dataRoomError, setDataRoomError]       = useState<string | null>(null);

  async function handleBuildDataRoom() {
    if (buildingDataRoom) return;
    setBuildingDataRoom(true); setDataRoomError(null);
    try {
      const res = await fetch('/api/agents/leo/data-room');
      const result = await res.json();
      if (!res.ok) { setDataRoomError(result.error ?? 'Failed to build data room'); return; }
      setDataRoomMeta({ folderCount: result.folderCount, artifactCount: result.artifactCount, missing: result.missing ?? [] });
      // Download the HTML data room
      const blob = new Blob([result.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.startupName || 'data-room').replace(/\s+/g, '-').toLowerCase()}-data-room.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { setDataRoomError('Network error'); }
    finally { setBuildingDataRoom(false); }
  }

  // SAFE generator state
  const [showSafeModal, setShowSafeModal]     = useState(false);
  const [safeType, setSafeType]               = useState<"post-money" | "pre-money">("post-money");
  const [safeInvestor, setSafeInvestor]       = useState("");
  const [safeInvestorEmail, setSafeInvestorEmail] = useState("");
  const [safeAmount, setSafeAmount]           = useState("");
  const [safeCap, setSafeCap]                 = useState("");
  const [safeDiscount, setSafeDiscount]       = useState("20");
  const [generatingSafe, setGeneratingSafe]   = useState(false);
  const [safeError, setSafeError]             = useState<string | null>(null);

  async function handleGenerateSafe() {
    if (!safeInvestor || !safeAmount || !safeCap || generatingSafe) return;
    setGeneratingSafe(true); setSafeError(null);
    try {
      const res = await fetch('/api/agents/leo/safe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          safeType,
          investorName: safeInvestor,
          investorEmail: safeInvestorEmail,
          investmentAmount: Number(safeAmount.replace(/[^0-9.]/g, '')),
          valuationCap: Number(safeCap.replace(/[^0-9.]/g, '')),
          discountRate: Number(safeDiscount) || 20,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        const blob = new Blob([result.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `SAFE_${safeInvestor.replace(/\s+/g, '_')}.html`;
        a.click(); URL.revokeObjectURL(url);
        setShowSafeModal(false);
      } else {
        setSafeError(result.error ?? 'Failed to generate SAFE');
      }
    } catch { setSafeError('Network error'); }
    finally { setGeneratingSafe(false); }
  }

  // Term sheet analyzer state
  const [showTermModal, setShowTermModal]           = useState(false);
  const [termText, setTermText]                     = useState("");
  const [analyzingTerm, setAnalyzingTerm]           = useState(false);
  const [termAnalysis, setTermAnalysis]             = useState<{
    overallRisk: string;
    summary: string;
    flags: { clause: string; severity: string; explanation: string; recommendation: string; standardMarket?: string }[];
    highlights: { clause: string; value: string; comment: string; verdict: string }[];
  } | null>(null);
  const [termError, setTermError]                   = useState<string | null>(null);

  async function handleAnalyzeTerm() {
    if (!termText.trim() || analyzingTerm) return;
    setAnalyzingTerm(true); setTermError(null); setTermAnalysis(null);
    try {
      const res = await fetch('/api/agents/leo/term-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: termText.trim() }),
      });
      const result = await res.json();
      if (res.ok) setTermAnalysis(result);
      else setTermError(result.error ?? 'Analysis failed');
    } catch { setTermError('Network error'); }
    finally { setAnalyzingTerm(false); }
  }

  async function handleGenerateNda() {
    if (!ndaCounterparty || !ndaPurpose || generatingNda) return;
    setGeneratingNda(true);
    try {
      const res = await fetch('/api/agents/leo/nda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ counterpartyName: ndaCounterparty, counterpartyEmail: ndaEmail, ndaType, purpose: ndaPurpose }),
      });
      const result = await res.json();
      if (res.ok) {
        setNdaHtml(result.html);
        // Offer download
        const blob = new Blob([result.html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `NDA_${ndaCounterparty.replace(/\s+/g, '_')}.html`;
        a.click(); URL.revokeObjectURL(url);
      }
    } catch {} finally { setGeneratingNda(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const statusColor: Record<string, string> = { required: red, recommended: amber, optional: muted };
  const urgencyBg: Record<string, string> = { now: "#FEF2F2", soon: "#FFFBEB", later: "#F0FDF4" };
  const urgencyColor: Record<string, string> = { now: red, soon: amber, later: green };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Generate NDA CTA ── */}
      <div style={{ background: "#FFFBEB", border: `1px solid #FED7AA`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: amber, marginBottom: 2 }}>Generate an NDA</p>
          <p style={{ fontSize: 11, color: muted }}>Create a mutual or one-way NDA for investors, contractors, or partners. Download as HTML.</p>
        </div>
        <button onClick={() => setShowNdaModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Create NDA
        </button>
      </div>

      {/* ── NDA Modal ── */}
      {showNdaModal && (
        <div onClick={() => { if (!generatingNda) setShowNdaModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Generate NDA</p>
              <button onClick={() => setShowNdaModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {ndaHtml ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p style={{ fontSize: 22, marginBottom: 10 }}>📄</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>NDA downloaded!</p>
                <p style={{ fontSize: 12, color: muted, marginBottom: 20 }}>Open the HTML file in your browser to review and print to PDF.</p>
                <button onClick={() => { setShowNdaModal(false); setNdaHtml(null); setNdaCounterparty(""); setNdaEmail(""); setNdaPurpose(""); }} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Counterparty Name *</label>
                  <input value={ndaCounterparty} onChange={e => setNdaCounterparty(e.target.value)} placeholder="Acme Corp / Jane Smith" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Their Email (optional)</label>
                  <input value={ndaEmail} onChange={e => setNdaEmail(e.target.value)} placeholder="legal@acme.com" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>NDA Type</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {(["mutual", "one-way"] as const).map(t => (
                      <button key={t} onClick={() => setNdaType(t)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${ndaType === t ? amber : bdr}`, background: ndaType === t ? "#FFFBEB" : "transparent", fontSize: 12, fontWeight: 600, color: ndaType === t ? amber : muted, cursor: "pointer", textTransform: "capitalize" }}>{t}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Purpose *</label>
                  <input value={ndaPurpose} onChange={e => setNdaPurpose(e.target.value)} placeholder="Exploring a potential partnership / investment discussion" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <button onClick={handleGenerateNda} disabled={!ndaCounterparty || !ndaPurpose || generatingNda} style={{ padding: "10px", borderRadius: 8, border: "none", background: !ndaCounterparty || !ndaPurpose ? bdr : amber, color: !ndaCounterparty || !ndaPurpose ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !ndaCounterparty || !ndaPurpose ? "not-allowed" : "pointer" }}>
                  {generatingNda ? "Generating…" : "Generate & Download NDA"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* ── SAFE Note Generator CTA ── */}
      <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 2 }}>Generate a SAFE Note</p>
          <p style={{ fontSize: 11, color: muted }}>YC post-money or pre-money SAFE — fill in investor details and download as HTML (print to PDF).</p>
        </div>
        <button onClick={() => setShowSafeModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Create SAFE
        </button>
      </div>

      {/* ── SAFE Modal ── */}
      {showSafeModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowSafeModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Generate SAFE Note</p>
              <button onClick={() => setShowSafeModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>SAFE Type</label>
                <div style={{ display: "flex", gap: 8 }}>
                  {(["post-money", "pre-money"] as const).map(t => (
                    <button key={t} onClick={() => setSafeType(t)} style={{ flex: 1, padding: "7px", borderRadius: 7, border: `1px solid ${safeType === t ? green : bdr}`, background: safeType === t ? "#F0FDF4" : "transparent", fontSize: 12, fontWeight: 600, color: safeType === t ? green : muted, cursor: "pointer" }}>{t}</button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investor Name *</label>
                <input value={safeInvestor} onChange={e => setSafeInvestor(e.target.value)} placeholder="Jane Smith / Acme Ventures" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investor Email (optional)</label>
                <input value={safeInvestorEmail} onChange={e => setSafeInvestorEmail(e.target.value)} placeholder="jane@acme.vc" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investment Amount ($) *</label>
                  <input value={safeAmount} onChange={e => setSafeAmount(e.target.value)} placeholder="150000" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Valuation Cap ($) *</label>
                  <input value={safeCap} onChange={e => setSafeCap(e.target.value)} placeholder="5000000" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Discount Rate (%) — typically 20%</label>
                <input value={safeDiscount} onChange={e => setSafeDiscount(e.target.value)} placeholder="20" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              {safeError && <p style={{ fontSize: 12, color: red }}>{safeError}</p>}
              <p style={{ fontSize: 10, color: muted, fontStyle: "italic" }}>⚠ Have a lawyer review before signing. This is not legal advice.</p>
              <button onClick={handleGenerateSafe} disabled={!safeInvestor || !safeAmount || !safeCap || generatingSafe} style={{ padding: "10px", borderRadius: 8, border: "none", background: !safeInvestor || !safeAmount || !safeCap ? bdr : green, color: !safeInvestor || !safeAmount || !safeCap ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !safeInvestor || !safeAmount || !safeCap ? "not-allowed" : "pointer" }}>
                {generatingSafe ? "Generating…" : "Generate & Download SAFE"}
              </button>
            </div>
          </div>
        </div>
      )}

      {d.companyStage && (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: muted }}>Stage:</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: ink, textTransform: "capitalize" }}>{d.companyStage.replace(/-/g, ' ')}</span>
        </div>
      )}

      {d.priorityActions && d.priorityActions.length > 0 && (
        <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "14px 16px", border: `1px solid #FECACA` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Priority Actions</p>
          {d.priorityActions.map((a, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8, marginBottom: 3 }}>→ {a}</p>
          ))}
        </div>
      )}

      {d.incorporationItems && d.incorporationItems.length > 0 && (
        <div>
          <p style={sectionHead}>Incorporation</p>
          {d.incorporationItems.map((item, i) => (
            <div key={i} style={{ background: item.urgency ? urgencyBg[item.urgency] || surf : surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, flex: 1, paddingRight: 8 }}>{item.item}</p>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  {item.urgency && <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: urgencyColor[item.urgency] || muted }}>{item.urgency}</span>}
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: statusColor[item.status] || muted }}>{item.status}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{item.description}</p>
            </div>
          ))}
        </div>
      )}

      {d.ipItems && d.ipItems.length > 0 && (
        <div>
          <p style={sectionHead}>IP Protection</p>
          {d.ipItems.map((item, i) => (
            <div key={i} style={{ borderBottom: `1px solid ${bdr}`, padding: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{item.item}</p>
                <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: statusColor[item.status] || muted }}>{item.status}</span>
              </div>
              <p style={{ fontSize: 11, color: muted }}>{item.description}</p>
            </div>
          ))}
        </div>
      )}

      {d.fundraisingDocs && d.fundraisingDocs.length > 0 && (
        <div>
          <p style={sectionHead}>Fundraising Documents</p>
          {d.fundraisingDocs.map((doc, i) => (
            <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "12px 14px", border: `1px solid #BFDBFE`, marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: blue, marginBottom: 4 }}>{doc.document}</p>
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 4 }}>{doc.description}</p>
              <p style={{ fontSize: 11, color: ink }}>→ {doc.recommendation}</p>
            </div>
          ))}
        </div>
      )}

      {d.redFlags && d.redFlags.length > 0 && (
        <div>
          <p style={sectionHead}>Red Flags</p>
          {d.redFlags.map((flag, i) => (
            <p key={i} style={{ fontSize: 12, color: red, lineHeight: 1.6, marginBottom: 4 }}>⚠ {flag}</p>
          ))}
        </div>
      )}

      {/* ── Build Data Room ─────────────────────────────────────────────────── */}
      <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "14px 16px", border: `1px solid #DDD6FE` }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: dataRoomMeta ? 10 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>Investor Data Room</p>
            <p style={{ fontSize: 11, color: muted }}>Leo bundles all your agent deliverables into a clean, shareable HTML data room — financials, legal, GTM, team, and more.</p>
          </div>
          <button
            onClick={handleBuildDataRoom}
            disabled={buildingDataRoom}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: buildingDataRoom ? bdr : "#7C3AED", color: buildingDataRoom ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: buildingDataRoom ? "not-allowed" : "pointer", whiteSpace: "nowrap", marginLeft: 12 }}
          >
            {buildingDataRoom ? "Building…" : "Build Data Room"}
          </button>
        </div>
        {dataRoomMeta && (
          <div style={{ borderTop: `1px solid #DDD6FE`, paddingTop: 10 }}>
            <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED" }}>{dataRoomMeta.artifactCount}</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>documents</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 18, fontWeight: 800, color: "#7C3AED" }}>{dataRoomMeta.folderCount}</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase" }}>sections</p>
              </div>
              {dataRoomMeta.missing.length > 0 && (
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 10, color: amber, fontWeight: 600, marginBottom: 3 }}>Missing sections:</p>
                  <p style={{ fontSize: 11, color: muted }}>{dataRoomMeta.missing.join(', ')}</p>
                </div>
              )}
            </div>
            <p style={{ fontSize: 11, color: green }}>✓ Data room downloaded — open in your browser, then File → Print → Save as PDF to share.</p>
          </div>
        )}
        {dataRoomError && <p style={{ fontSize: 11, color: red, marginTop: 6 }}>{dataRoomError}</p>}
      </div>

      {/* ── Clerky / Stripe Atlas CTA ─────────────────────────────────────── */}
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "16px 18px", border: `1px solid #BBF7D0`, marginTop: 4 }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Start Incorporation</p>
        <p style={{ fontSize: 12, color: muted, lineHeight: 1.5, marginBottom: 12 }}>
          Leo has collected enough data to pre-fill your incorporation. Choose a platform to get started — your details are already on your clipboard.
        </p>
        <div style={{ background: "#ECFDF5", borderRadius: 8, padding: "10px 14px", border: `1px solid #A7F3D0`, marginBottom: 12, fontFamily: "monospace", fontSize: 11, color: ink, lineHeight: 1.7 }}>
          <p><strong>Entity type:</strong> Delaware C-Corp</p>
          <p><strong>Stage:</strong> {d.companyStage ? d.companyStage.replace(/-/g, " ") : "Pre-seed"}</p>
          <p><strong>Suggested par value:</strong> $0.0001 / share</p>
          <p><strong>Auth shares:</strong> 10,000,000 common</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              const text = `Entity type: Delaware C-Corp\nStage: ${d.companyStage ? d.companyStage.replace(/-/g, " ") : "Pre-seed"}\nPar value: $0.0001\nAuthorized shares: 10,000,000 common\n\nPriority actions:\n${(d.priorityActions || []).map(a => `- ${a}`).join("\n")}`;
              navigator.clipboard.writeText(text).catch(() => {});
            }}
            style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: "white", fontSize: 12, fontWeight: 600, color: ink, cursor: "pointer" }}
          >
            Copy Details
          </button>
          <a
            href="https://clerky.com/formations/new"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              const text = `Entity type: Delaware C-Corp\nStage: ${d.companyStage ? d.companyStage.replace(/-/g, " ") : "Pre-seed"}\nPar value: $0.0001\nAuthorized shares: 10,000,000 common`;
              navigator.clipboard.writeText(text).catch(() => {});
            }}
            style={{ padding: "8px 14px", borderRadius: 8, background: green, fontSize: 12, fontWeight: 600, color: "white", textDecoration: "none", display: "inline-block" }}
          >
            Start on Clerky
          </a>
          <a
            href="https://stripe.com/atlas"
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: "8px 14px", borderRadius: 8, background: "#635BFF", fontSize: 12, fontWeight: 600, color: "white", textDecoration: "none", display: "inline-block" }}
          >
            Start on Stripe Atlas
          </a>
        </div>
      </div>

      {/* ── Term Sheet Analyzer CTA ── */}
      <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>Analyze a Term Sheet or SAFE</p>
          <p style={{ fontSize: 11, color: muted }}>Paste any term sheet — Leo flags red flags, unusual clauses, and what to negotiate.</p>
        </div>
        <button onClick={() => { setShowTermModal(true); setTermAnalysis(null); setTermError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Analyze Term Sheet
        </button>
      </div>

      {/* ── Term Sheet Modal ── */}
      {showTermModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowTermModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 680, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Term Sheet / SAFE Analyzer</p>
              <button onClick={() => setShowTermModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>

            {!termAnalysis ? (
              <>
                <p style={{ fontSize: 12, color: muted, marginBottom: 12 }}>Paste your term sheet, SAFE, or any funding document. Leo will flag red flags and unusual clauses.</p>
                <textarea
                  value={termText}
                  onChange={e => setTermText(e.target.value)}
                  placeholder="Paste term sheet text here…"
                  rows={12}
                  style={{ width: "100%", padding: "12px 14px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink, fontFamily: "monospace", lineHeight: 1.7, resize: "vertical", boxSizing: "border-box", outline: "none" }}
                />
                {termError && <p style={{ fontSize: 12, color: red, marginTop: 8 }}>{termError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <button onClick={() => setShowTermModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleAnalyzeTerm} disabled={analyzingTerm || termText.trim().length < 100} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzingTerm || termText.trim().length < 100 ? bdr : "#7C3AED", color: analyzingTerm || termText.trim().length < 100 ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzingTerm || termText.trim().length < 100 ? "not-allowed" : "pointer" }}>
                    {analyzingTerm ? "Analyzing…" : "Analyze with Leo"}
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Risk badge */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, padding: "12px 16px", borderRadius: 10, background: termAnalysis.overallRisk === "high" ? "#FEF2F2" : termAnalysis.overallRisk === "medium" ? "#FFFBEB" : "#F0FDF4", border: `1px solid ${termAnalysis.overallRisk === "high" ? "#FECACA" : termAnalysis.overallRisk === "medium" ? "#FDE68A" : "#BBF7D0"}` }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", padding: "3px 10px", borderRadius: 999, background: termAnalysis.overallRisk === "high" ? red : termAnalysis.overallRisk === "medium" ? amber : green, color: "#fff" }}>
                    {termAnalysis.overallRisk} risk
                  </span>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{termAnalysis.summary}</p>
                </div>

                {/* Key terms */}
                {termAnalysis.highlights.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Key Terms</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {termAnalysis.highlights.map((h, i) => (
                        <div key={i} style={{ padding: "8px 12px", borderRadius: 8, background: h.verdict === "good" ? "#F0FDF4" : h.verdict === "watch" ? "#FFFBEB" : surf, border: `1px solid ${h.verdict === "good" ? "#BBF7D0" : h.verdict === "watch" ? "#FDE68A" : bdr}`, flex: "1 1 180px" }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: muted, marginBottom: 2 }}>{h.clause}</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 3 }}>{h.value}</p>
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.4 }}>{h.comment}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Red flags */}
                {termAnalysis.flags.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 10 }}>Flags & Red Flags ({termAnalysis.flags.length})</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {termAnalysis.flags.map((f, i) => (
                        <div key={i} style={{ borderRadius: 10, border: `1px solid ${f.severity === "high" ? "#FECACA" : f.severity === "medium" ? "#FDE68A" : bdr}`, overflow: "hidden" }}>
                          <div style={{ padding: "10px 14px", background: f.severity === "high" ? "#FEF2F2" : f.severity === "medium" ? "#FFFBEB" : surf, display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", padding: "2px 8px", borderRadius: 999, background: f.severity === "high" ? red : f.severity === "medium" ? amber : muted, color: "#fff" }}>{f.severity}</span>
                            <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{f.clause}</p>
                          </div>
                          <div style={{ padding: "10px 14px" }}>
                            <p style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 8 }}>{f.explanation}</p>
                            <div style={{ padding: "8px 12px", background: "#EFF6FF", borderRadius: 7 }}>
                              <p style={{ fontSize: 10, fontWeight: 600, color: blue, marginBottom: 3 }}>RECOMMENDATION</p>
                              <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{f.recommendation}</p>
                            </div>
                            {f.standardMarket && (
                              <p style={{ fontSize: 11, color: muted, marginTop: 8, fontStyle: "italic" }}>Market standard: {f.standardMarket}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button onClick={() => { setTermAnalysis(null); setTermText(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HIRING PLAN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function HiringPlanRenderer({ data, artifactId, userId }: { data: Record<string, unknown>; artifactId?: string; userId?: string }) {
  const d = data as {
    currentGaps?: string[];
    nextHires?: { role: string; priority: string; timing: string; whyNow?: string; responsibilities?: string[]; requirements?: string[]; niceToHave?: string[]; salaryRange?: string; equity?: string }[];
    orgRoadmap?: { milestone: string; teamSize: number; newRoles: string[] }[];
    compensationBands?: { role: string; salary: string; equity: string; stage: string }[];
    interviewProcess?: string[];
    cultureValues?: string[];
  };

  type Application = { id: string; role_slug: string; role_title?: string; applicant_name: string; applicant_email: string; score?: number; score_notes?: string; created_at: string };
  const [applications, setApplications] = useState<Application[]>([]);
  const [showApps, setShowApps]         = useState(false);
  const [loadingApps, setLoadingApps]   = useState(false);

  // Offer letter state
  const [showOfferModal, setShowOfferModal]     = useState(false);
  const [offerCandidate, setOfferCandidate]     = useState("");
  const [offerEmail, setOfferEmail]             = useState("");
  const [offerRole, setOfferRole]               = useState("");
  const [offerSalary, setOfferSalary]           = useState("");
  const [offerEquity, setOfferEquity]           = useState("");
  const [offerStartDate, setOfferStartDate]     = useState("");
  const [generatingOffer, setGeneratingOffer]   = useState(false);
  const [offerHtml, setOfferHtml]               = useState<string | null>(null);
  const [offerError, setOfferError]             = useState<string | null>(null);
  const [offerSendEmail, setOfferSendEmail]     = useState(false);

  // Multi-board job posting state
  const [showBoardModal, setShowBoardModal]   = useState(false);
  const [boardModalRole, setBoardModalRole]   = useState("");
  const [boardPosts, setBoardPosts]           = useState<Record<string, { content: string; boardUrl: string }> | null>(null);
  const [generatingBoards, setGeneratingBoards] = useState(false);
  const [boardError, setBoardError]           = useState<string | null>(null);
  const [boardTab, setBoardTab]               = useState("hn");
  const [boardCopied, setBoardCopied]         = useState<Record<string, boolean>>({});
  const [boardApplyUrl, setBoardApplyUrl]     = useState("");

  async function handleGenerateOffer() {
    if (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim() || generatingOffer) return;
    setGeneratingOffer(true); setOfferError(null); setOfferHtml(null);
    try {
      const res = await fetch('/api/agents/harper/offer-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName: offerCandidate.trim(),
          candidateEmail: offerEmail.trim() || undefined,
          role: offerRole.trim(),
          salary: offerSalary.trim(),
          equity: offerEquity.trim() || undefined,
          startDate: offerStartDate || undefined,
          send: offerSendEmail && !!offerEmail.trim(),
        }),
      });
      const r = await res.json();
      if (res.ok) setOfferHtml(r.html);
      else setOfferError(r.error ?? 'Failed to generate offer letter');
    } catch { setOfferError('Network error'); }
    finally { setGeneratingOffer(false); }
  }

  async function handleGenerateBoards(hire: { role: string; salaryRange?: string; equity?: string; responsibilities?: string[]; requirements?: string[]; whyNow?: string }) {
    if (!hire || generatingBoards) return;
    setBoardModalRole(hire.role);
    setBoardPosts(null);
    setBoardError(null);
    setBoardCopied({});
    setBoardTab("hn");
    setShowBoardModal(true);
    setGeneratingBoards(true);
    try {
      const res = await fetch("/api/agents/harper/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: { role: hire.role, salaryRange: hire.salaryRange, equity: hire.equity, responsibilities: hire.responsibilities, requirements: hire.requirements, whyNow: hire.whyNow },
          boards: ["hn", "linkedin", "wellfound", "indeed", "remoteok"],
        }),
      });
      const r = await res.json();
      if (res.ok) { setBoardPosts(r.posts); setBoardApplyUrl(r.applyUrl ?? ""); }
      else setBoardError(r.error ?? "Failed to generate job postings");
    } catch { setBoardError("Network error"); }
    finally { setGeneratingBoards(false); }
  }

  function downloadOffer() {
    if (!offerHtml) return;
    const blob = new Blob([offerHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `offer-letter-${offerCandidate.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (!artifactId) return;
    setLoadingApps(true);
    fetch('/api/agents/harper/apply')
      .then(r => r.json())
      .then(d => { if (d.applications) setApplications(d.applications); })
      .catch(() => {})
      .finally(() => setLoadingApps(false));
  }, [artifactId]);

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const priorityColor: Record<string, string> = { critical: red, high: amber, "nice-to-have": muted };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {d.currentGaps && d.currentGaps.length > 0 && (
        <div style={{ background: "#FFFBEB", borderRadius: 10, padding: "12px 14px", border: `1px solid #FED7AA` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: amber, textTransform: "uppercase", marginBottom: 6 }}>Current Team Gaps</p>
          {d.currentGaps.map((gap, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>• {gap}</p>)}
        </div>
      )}

      {d.nextHires && d.nextHires.length > 0 && (
        <div>
          <p style={sectionHead}>Next Hires</p>
          {d.nextHires.map((hire, i) => {
            // Build job description text for posting
            const jdText = [
              `Role: ${hire.role}`,
              hire.timing ? `Timeline: ${hire.timing}` : "",
              hire.whyNow ? `Why we're hiring now: ${hire.whyNow}` : "",
              hire.salaryRange ? `Compensation: ${hire.salaryRange}${hire.equity ? ` + ${hire.equity} equity` : ""}` : "",
              hire.requirements?.length ? `\nRequirements:\n${hire.requirements.map(r => `• ${r}`).join("\n")}` : "",
              hire.niceToHave?.length ? `\nNice to have:\n${hire.niceToHave.map(r => `• ${r}`).join("\n")}` : "",
              hire.responsibilities?.length ? `\nResponsibilities:\n${hire.responsibilities.map(r => `• ${r}`).join("\n")}` : "",
            ].filter(Boolean).join("\n");

            return (
              <div key={i} style={{ background: surf, borderRadius: 10, border: `1px solid ${bdr}`, padding: "14px 16px", marginBottom: 10, borderLeft: `3px solid ${priorityColor[hire.priority] || muted}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: ink }}>{hire.role}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: priorityColor[hire.priority] || muted }}>{hire.priority}</span>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: hire.whyNow ? 6 : 8 }}>{hire.timing}</p>
                {hire.whyNow && <p style={{ fontSize: 12, color: blue, marginBottom: 8 }}>Why now: {hire.whyNow}</p>}
                {hire.salaryRange && (
                  <div style={{ display: "flex", gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: ink }}>{hire.salaryRange}</span>
                    {hire.equity && <span style={{ fontSize: 12, color: muted }}>{hire.equity} equity</span>}
                  </div>
                )}
                {hire.requirements && hire.requirements.length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Requirements</p>
                    {hire.requirements.map((r, ri) => <p key={ri} style={{ fontSize: 11, color: ink, paddingLeft: 8, lineHeight: 1.5 }}>✓ {r}</p>)}
                  </div>
                )}
                {/* Post job links */}
                <div style={{ display: "flex", gap: 6, paddingTop: 8, borderTop: `1px solid ${bdr}`, flexWrap: "wrap" }}>
                  <a
                    href="https://wellfound.com/jobs/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => navigator.clipboard.writeText(jdText).catch(() => {})}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#F0FDF4", color: green, textDecoration: "none", border: `1px solid #BBF7D0` }}
                    title="JD copied to clipboard — paste into Wellfound"
                  >
                    Post on Wellfound
                  </a>
                  {userId && (
                    <button
                      onClick={() => {
                        const slug = hire.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').slice(0, 40);
                        const url = `${window.location.origin}/apply/${userId}/${slug}`;
                        navigator.clipboard.writeText(url).catch(() => {});
                        alert(`Apply link copied!\n${url}`);
                      }}
                      style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#EFF6FF", color: blue, border: `1px solid #BFDBFE`, cursor: "pointer" }}
                    >
                      Copy Apply Link
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const slug = userId ? `${window.location.origin}/apply/${userId}/${hire.role.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}` : '';
                      const hn = [
                        `${hire.role} | [Your Company Name] | [Remote/City] | ${hire.salaryRange ? hire.salaryRange : 'Competitive salary'}${hire.equity ? ` + ${hire.equity} equity` : ''}`,
                        '',
                        hire.whyNow ? `We're hiring because: ${hire.whyNow}` : '',
                        '',
                        'Looking for:',
                        ...(hire.requirements ?? []).slice(0, 4).map(r => `• ${r}`),
                        '',
                        hire.responsibilities?.length ? 'You will:' : '',
                        ...(hire.responsibilities ?? []).slice(0, 3).map(r => `• ${r}`),
                        '',
                        slug ? `Apply: ${slug}` : 'Reply to this comment or email [your@email.com]',
                      ].filter(l => l !== undefined).join('\n').trim();
                      navigator.clipboard.writeText(hn).catch(() => {});
                      alert('HN format copied! Paste it into the monthly "Ask HN: Who is hiring?" thread.');
                    }}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#FFF7ED", color: "#EA580C", border: `1px solid #FED7AA`, cursor: "pointer" }}
                    title="Copies the exact HN 'Who is hiring?' comment format"
                  >
                    HN Format
                  </button>
                  <CopyBtn text={jdText} />
                  <button
                    onClick={() => handleGenerateBoards(hire)}
                    style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, background: "#F5F3FF", color: "#7C3AED", border: "1px solid #DDD6FE", cursor: "pointer" }}
                    title="Generate formatted posts for HN, LinkedIn, Wellfound, Indeed, RemoteOK"
                  >
                    📋 Post to All Boards
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {d.orgRoadmap && d.orgRoadmap.length > 0 && (
        <div>
          <p style={sectionHead}>Org Roadmap</p>
          {d.orgRoadmap.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>{step.teamSize}</p>
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4 }}>{step.milestone}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {step.newRoles.map((role, ri) => (
                    <span key={ri} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`, color: muted }}>{role}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.cultureValues && d.cultureValues.length > 0 && (
        <div>
          <p style={sectionHead}>Culture Values</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.cultureValues.map((v, i) => (
              <span key={i} style={{ padding: "5px 12px", borderRadius: 999, fontSize: 12, background: surf, border: `1px solid ${bdr}`, color: ink }}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Applications Inbox ──────────────────────────────────────────────── */}
      <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 16px", border: `1px solid #BBF7D0` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: green, marginBottom: 2 }}>
              Applications Inbox {!loadingApps && applications.length > 0 && <span style={{ background: green, color: "#fff", borderRadius: 999, padding: "1px 7px", fontSize: 10, marginLeft: 4 }}>{applications.length}</span>}
            </p>
            <p style={{ fontSize: 11, color: muted }}>
              {loadingApps ? "Loading…" : applications.length === 0 ? "No applications yet — share your apply link to start receiving candidates." : `${applications.length} candidate${applications.length !== 1 ? "s" : ""} applied`}
            </p>
          </div>
          {applications.length > 0 && (
            <button onClick={() => setShowApps(p => !p)} style={{ padding: "5px 12px", borderRadius: 6, border: `1px solid #BBF7D0`, background: "white", color: green, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {showApps ? "Hide" : "View All"}
            </button>
          )}
        </div>
        {showApps && applications.length > 0 && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {applications.map(app => (
              <div key={app.id} style={{ background: "white", borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{app.applicant_name}</p>
                    <p style={{ fontSize: 11, color: muted }}>{app.applicant_email} · {app.role_title ?? app.role_slug}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {app.score !== null && app.score !== undefined && (
                      <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 10px", borderRadius: 6, background: (app.score ?? 0) >= 70 ? "#F0FDF4" : (app.score ?? 0) >= 50 ? "#FFFBEB" : "#FEF2F2", color: (app.score ?? 0) >= 70 ? green : (app.score ?? 0) >= 50 ? amber : red }}>
                        {app.score}/100
                      </span>
                    )}
                    <button
                      onClick={() => { setOfferCandidate(app.applicant_name); setOfferEmail(app.applicant_email); setOfferRole(app.role_title ?? app.role_slug); setShowOfferModal(true); setOfferHtml(null); setOfferError(null); }}
                      style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${bdr}`, background: bg, fontSize: 11, fontWeight: 600, color: ink, cursor: "pointer" }}
                    >
                      Send Offer
                    </button>
                  </div>
                </div>
                {app.score_notes && <p style={{ fontSize: 11, color: muted, marginTop: 6, lineHeight: 1.5 }}>{app.score_notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Offer Letter CTA ── */}
      <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>Send an Offer Letter</p>
          <p style={{ fontSize: 11, color: muted }}>Harper generates a ready-to-sign offer letter with salary, equity, and vesting details — download HTML or email directly.</p>
        </div>
        <button onClick={() => { setShowOfferModal(true); setOfferHtml(null); setOfferError(null); setOfferCandidate(""); setOfferEmail(""); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Create Offer
        </button>
      </div>

      {/* Offer Letter Modal */}
      {showOfferModal && (
        <div onClick={() => { if (!generatingOffer) setShowOfferModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Offer Letter</p>
              <button onClick={() => setShowOfferModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {offerHtml ? (
              <div>
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 16px", border: `1px solid #BBF7D0`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: green, marginBottom: 4 }}>✓ Offer letter ready for {offerCandidate}</p>
                  {offerSendEmail && offerEmail && <p style={{ fontSize: 11, color: muted }}>Email also sent to {offerEmail}</p>}
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setOfferHtml(null); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Edit</button>
                  <button onClick={downloadOffer} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Download HTML</button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Candidate Name *</label>
                    <input value={offerCandidate} onChange={e => setOfferCandidate(e.target.value)} placeholder="Alex Johnson" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Email (for sending)</label>
                    <input value={offerEmail} onChange={e => setOfferEmail(e.target.value)} placeholder="alex@gmail.com" type="email" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Role *</label>
                  <input value={offerRole} onChange={e => setOfferRole(e.target.value)} placeholder="Senior Software Engineer" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Base Salary *</label>
                    <input value={offerSalary} onChange={e => setOfferSalary(e.target.value)} placeholder="$150,000 / year" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Equity Grant</label>
                    <input value={offerEquity} onChange={e => setOfferEquity(e.target.value)} placeholder="0.5% (50,000 options)" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Start Date</label>
                  <input value={offerStartDate} onChange={e => setOfferStartDate(e.target.value)} type="date" style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                </div>
                {offerEmail && (
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: ink, cursor: "pointer" }}>
                    <input type="checkbox" checked={offerSendEmail} onChange={e => setOfferSendEmail(e.target.checked)} />
                    Email this offer letter to {offerEmail}
                  </label>
                )}
                {offerError && <p style={{ fontSize: 12, color: red }}>{offerError}</p>}
                <button onClick={handleGenerateOffer} disabled={!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim() || generatingOffer} style={{ padding: "10px", borderRadius: 8, border: "none", background: (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim()) ? bdr : blue, color: (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim()) ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: (!offerCandidate.trim() || !offerRole.trim() || !offerSalary.trim()) ? "not-allowed" : "pointer" }}>
                  {generatingOffer ? "Generating…" : "Generate Offer Letter"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Multi-Board Job Post Modal ── */}
      {showBoardModal && (
        <div onClick={() => { if (!generatingBoards) setShowBoardModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 580, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 700, color: ink, margin: 0 }}>Post to All Boards</p>
                <p style={{ fontSize: 12, color: muted, margin: "2px 0 0" }}>{boardModalRole}</p>
              </div>
              <button onClick={() => setShowBoardModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>

            {generatingBoards && (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <p style={{ fontSize: 13, color: muted }}>Generating board-optimised formats…</p>
              </div>
            )}

            {boardError && <p style={{ fontSize: 12, color: red, marginBottom: 12 }}>{boardError}</p>}

            {boardPosts && !generatingBoards && (() => {
              const BOARDS: { key: string; label: string; color: string; bg: string; border: string }[] = [
                { key: "hn",       label: "HN Who's Hiring", color: "#EA580C", bg: "#FFF7ED", border: "#FED7AA" },
                { key: "linkedin", label: "LinkedIn",         color: blue,      bg: "#EFF6FF", border: "#BFDBFE" },
                { key: "wellfound",label: "Wellfound",        color: green,     bg: "#F0FDF4", border: "#BBF7D0" },
                { key: "indeed",   label: "Indeed",           color: "#1B4FD8", bg: "#EFF6FF", border: "#C7D2FE" },
                { key: "remoteok", label: "Remote OK",        color: "#7C3AED", bg: "#F5F3FF", border: "#DDD6FE" },
              ];
              const activeBoard = BOARDS.find(b => b.key === boardTab) || BOARDS[0];
              const post = boardPosts[boardTab];
              return (
                <div>
                  {boardApplyUrl && (
                    <div style={{ background: surf, borderRadius: 8, padding: "8px 12px", marginBottom: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <p style={{ fontSize: 11, color: muted, margin: 0 }}>Apply link:</p>
                      <code style={{ fontSize: 11, color: blue, flex: 1, wordBreak: "break-all" }}>{boardApplyUrl}</code>
                      <button onClick={() => navigator.clipboard.writeText(boardApplyUrl).catch(() => {})} style={{ padding: "3px 8px", borderRadius: 5, border: `1px solid ${bdr}`, background: bg, fontSize: 10, fontWeight: 600, color: muted, cursor: "pointer" }}>Copy</button>
                    </div>
                  )}

                  {/* Board tabs */}
                  <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
                    {BOARDS.map(b => (
                      <button
                        key={b.key}
                        onClick={() => setBoardTab(b.key)}
                        style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600, border: `1px solid ${boardTab === b.key ? b.border : bdr}`, background: boardTab === b.key ? b.bg : "transparent", color: boardTab === b.key ? b.color : muted, cursor: "pointer", position: "relative" }}
                      >
                        {b.label}
                        {boardCopied[b.key] && <span style={{ position: "absolute", top: -4, right: -4, width: 10, height: 10, borderRadius: 999, background: green }} />}
                      </button>
                    ))}
                  </div>

                  {/* Content area */}
                  {post ? (
                    <div>
                      <textarea
                        readOnly
                        value={post.content}
                        style={{ width: "100%", minHeight: 220, padding: "10px 12px", borderRadius: 8, border: `1px solid ${activeBoard.border}`, background: activeBoard.bg, fontSize: 12, color: ink, resize: "vertical", fontFamily: "monospace", lineHeight: 1.6, boxSizing: "border-box", outline: "none" }}
                      />
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(post.content).catch(() => {});
                            setBoardCopied(prev => ({ ...prev, [boardTab]: true }));
                          }}
                          style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: boardCopied[boardTab] ? green : activeBoard.color, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
                        >
                          {boardCopied[boardTab] ? "✓ Copied!" : "Copy Text"}
                        </button>
                        {post.boardUrl && (
                          <a
                            href={post.boardUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setBoardCopied(prev => ({ ...prev, [boardTab]: true }))}
                            style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${activeBoard.border}`, background: "transparent", color: activeBoard.color, fontSize: 12, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                          >
                            Open {activeBoard.label} →
                          </a>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontSize: 12, color: muted, textAlign: "center", padding: "20px 0" }}>No content generated for this board.</p>
                  )}

                  {/* Status chips */}
                  {Object.keys(boardCopied).length > 0 && (
                    <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginRight: 4 }}>Posted to:</p>
                      {Object.entries(boardCopied).filter(([, v]) => v).map(([k]) => {
                        const b = BOARDS.find(board => board.key === k);
                        return <span key={k} style={{ fontSize: 10, padding: "3px 8px", borderRadius: 999, background: "#F0FDF4", border: "1px solid #BBF7D0", color: green, fontWeight: 600 }}>✓ {b?.label ?? k}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PMF SURVEY RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function PMFSurveyRenderer({ data, artifactId, userId }: { data: Record<string, unknown>; artifactId?: string; userId?: string }) {
  const d = data as {
    targetSegment?: string;
    interviewScript?: { phase: string; duration: string; questions: string[] }[];
    ellisTest?: { primaryQuestion?: string; options?: string[]; benchmark?: string; followUps?: string[] };
    experiments?: { hypothesis: string; test: string; metric: string; successCriteria: string; timeframe?: string }[];
    segmentAnalysis?: { segment: string; painLevel: string; willingness: string; priority: number }[];
  };

  const [surveyStats, setSurveyStats] = useState<{
    total: number; pmfScore: number;
    distribution?: { very_disappointed: number; somewhat_disappointed: number; not_disappointed: number };
    textAnswers?: { qid: string; text: string }[];
  } | null>(null);
  const [showResponses, setShowResponses] = useState(false);
  const [linkCopied, setLinkCopied]       = useState(false);

  // Interview scheduler state
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleContacts, setScheduleContacts]   = useState("");
  const [scheduleCalendly, setScheduleCalendly]   = useState("");
  const [scheduling, setScheduling]               = useState(false);
  const [scheduleResult, setScheduleResult]       = useState<{ sent: number; failed: number } | null>(null);
  const [scheduleError, setScheduleError]         = useState<string | null>(null);

  function parseScheduleContacts(text: string) {
    return text.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const parts = line.split(',').map(p => p.trim());
        return { name: parts[0] || '', email: parts[1] || parts[0] || '', company: parts[2] || undefined };
      })
      .filter(c => c.email.includes('@'));
  }

  async function handleScheduleInterviews() {
    if (scheduling) return;
    const contacts = parseScheduleContacts(scheduleContacts);
    if (!contacts.length) { setScheduleError('No valid contacts found'); return; }
    setScheduling(true); setScheduleError(null); setScheduleResult(null);
    try {
      const res = await fetch('/api/agents/nova/interview-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts,
          calendlyUrl: scheduleCalendly.trim() || undefined,
          artifactId,
        }),
      });
      const result = await res.json();
      if (res.ok) setScheduleResult({ sent: result.sent, failed: result.failed });
      else setScheduleError(result.error ?? 'Failed to send');
    } catch { setScheduleError('Network error'); }
    finally { setScheduling(false); }
  }

  const surveyLink = artifactId && userId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/s/${artifactId}?uid=${userId}` : null;

  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/survey/results?surveyId=${artifactId}`)
      .then(r => r.json())
      .then(d => {
        if (d.total !== undefined) setSurveyStats({
          total: d.total,
          pmfScore: d.pmfScore,
          distribution: d.distribution,
          textAnswers: d.textAnswers,
        });
      })
      .catch(() => {});
  }, [artifactId]);

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const painColor: Record<string, string> = { high: red, medium: amber, low: green };
  const purple = "#7C3AED";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Survey share bar ── */}
      <div style={{ background: "#F5F3FF", border: `1px solid #DDD6FE`, borderRadius: 10, padding: "12px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: surveyStats ? 10 : 0 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: purple, marginBottom: 2 }}>Share this survey</p>
            <p style={{ fontSize: 11, color: muted }}>Send to customers — responses tracked in real-time.</p>
          </div>
          {surveyLink ? (
            <button onClick={() => { navigator.clipboard.writeText(surveyLink).catch(() => {}); setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2000); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: linkCopied ? green : purple, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
              {linkCopied ? "Copied!" : "Copy Survey Link"}
            </button>
          ) : (
            <span style={{ fontSize: 11, color: muted }}>Generate this artifact first</span>
          )}
        </div>
        {surveyStats && (
          <div style={{ paddingTop: 8, borderTop: `1px solid #DDD6FE` }}>
            <div style={{ display: "flex", gap: 16, marginBottom: surveyStats.distribution ? 12 : 0 }}>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: purple }}>{surveyStats.total}</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Responses</p>
              </div>
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: surveyStats.pmfScore >= 40 ? green : surveyStats.pmfScore >= 25 ? amber : red }}>{Math.round(surveyStats.pmfScore)}%</p>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.08em" }}>PMF Score</p>
              </div>
              {surveyStats.pmfScore >= 40 && <div style={{ display: "flex", alignItems: "center", padding: "4px 10px", background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 999 }}><p style={{ fontSize: 11, fontWeight: 700, color: green }}>✓ Above PMF threshold</p></div>}
              {surveyStats.total > 0 && (
                <button onClick={() => setShowResponses(p => !p)} style={{ marginLeft: "auto", padding: "4px 12px", borderRadius: 7, border: `1px solid #DDD6FE`, background: "transparent", fontSize: 11, fontWeight: 600, color: purple, cursor: "pointer" }}>
                  {showResponses ? "Hide breakdown" : "View breakdown"}
                </button>
              )}
            </div>
            {showResponses && surveyStats.distribution && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {([
                  { key: "very_disappointed",     label: "Very disappointed",     color: green },
                  { key: "somewhat_disappointed", label: "Somewhat disappointed", color: amber },
                  { key: "not_disappointed",      label: "Not disappointed",      color: red   },
                ] as { key: keyof typeof surveyStats.distribution; label: string; color: string }[]).map(row => {
                  const count = surveyStats.distribution![row.key] ?? 0;
                  const pct   = surveyStats.total > 0 ? Math.round((count / surveyStats.total) * 100) : 0;
                  return (
                    <div key={row.key}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: ink }}>{row.label}</p>
                        <p style={{ fontSize: 11, fontWeight: 700, color: row.color }}>{count} ({pct}%)</p>
                      </div>
                      <div style={{ height: 6, background: "#E9D5FF", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: row.color, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
                {surveyStats.textAnswers && surveyStats.textAnswers.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Open-ended Responses</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {surveyStats.textAnswers.slice(0, 6).map((a, i) => (
                        <div key={i} style={{ background: "#F5F3FF", borderRadius: 8, padding: "8px 12px" }}>
                          <p style={{ fontSize: 10, fontWeight: 600, color: purple, marginBottom: 3, textTransform: "capitalize" }}>{a.qid.replace(/_/g, ' ')}</p>
                          <p style={{ fontSize: 12, color: ink, lineHeight: 1.5, fontStyle: "italic" }}>&quot;{a.text}&quot;</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      {/* ── Customer Interview Scheduler ── */}
      <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1 }}>
          {scheduleResult ? (
            <p style={{ fontSize: 12, fontWeight: 700, color: green }}>
              Nova sent {scheduleResult.sent} interview invite{scheduleResult.sent !== 1 ? 's' : ''}
              {scheduleResult.failed > 0 ? ` · ${scheduleResult.failed} failed` : ' ✓'}
            </p>
          ) : (
            <>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#166534", marginBottom: 2 }}>Schedule Customer Interviews</p>
              <p style={{ fontSize: 11, color: muted }}>Upload a contact list — Nova sends personalised 20-min interview invites with your Calendly link.</p>
            </>
          )}
        </div>
        <button
          onClick={() => { setShowScheduleModal(true); setScheduleResult(null); setScheduleError(null); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
        >
          {scheduleResult ? "Send More" : "Schedule Interviews"}
        </button>
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !scheduling) setShowScheduleModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Schedule Customer Interviews</p>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>
            {scheduleResult ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 28, marginBottom: 10 }}>✉️</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: green, marginBottom: 6 }}>{scheduleResult.sent} invite{scheduleResult.sent !== 1 ? 's' : ''} sent!</p>
                {scheduleResult.failed > 0 && <p style={{ fontSize: 12, color: amber, marginBottom: 10 }}>{scheduleResult.failed} failed to send.</p>}
                <button onClick={() => setShowScheduleModal(false)} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 12 }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>
                    Contact List * <span style={{ fontWeight: 400 }}>(CSV: name, email, company)</span>
                  </label>
                  <textarea
                    value={scheduleContacts}
                    onChange={e => setScheduleContacts(e.target.value)}
                    placeholder={"Alex Johnson, alex@acme.com, Acme Corp\nSarah Park, sarah@techflow.io, TechFlow\n..."}
                    rows={6}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box", fontFamily: "monospace" }}
                  />
                  {scheduleContacts.trim() && (
                    <p style={{ fontSize: 11, color: green, marginTop: 4 }}>
                      {parseScheduleContacts(scheduleContacts).length} contact{parseScheduleContacts(scheduleContacts).length !== 1 ? 's' : ''} detected
                    </p>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Calendly URL <span style={{ fontWeight: 400 }}>(optional — pulled from your profile if set)</span></label>
                  <input
                    value={scheduleCalendly}
                    onChange={e => setScheduleCalendly(e.target.value)}
                    placeholder="https://calendly.com/yourname/20min"
                    type="url"
                    style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }}
                  />
                </div>
                {scheduleError && <p style={{ fontSize: 12, color: red }}>{scheduleError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                  <button onClick={() => setShowScheduleModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleScheduleInterviews}
                    disabled={scheduling || !scheduleContacts.trim()}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: scheduling ? bdr : green, color: scheduling ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: scheduling ? "not-allowed" : "pointer" }}
                  >
                    {scheduling ? `Sending…` : `Send ${parseScheduleContacts(scheduleContacts).length || ''} Invites`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {d.targetSegment && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: "uppercase", marginBottom: 4 }}>Target Segment</p>
          <p style={{ fontSize: 13, color: ink }}>{d.targetSegment}</p>
        </div>
      )}

      {d.ellisTest && (
        <div style={{ background: "#F5F3FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #DDD6FE` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase", marginBottom: 8 }}>Sean Ellis PMF Test</p>
          {d.ellisTest.primaryQuestion && <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 8 }}>&quot;{d.ellisTest.primaryQuestion}&quot;</p>}
          {d.ellisTest.benchmark && <p style={{ fontSize: 11, color: "#7C3AED", fontWeight: 600 }}>→ {d.ellisTest.benchmark}</p>}
        </div>
      )}

      {d.interviewScript && d.interviewScript.length > 0 && (
        <div>
          <p style={sectionHead}>Interview Script</p>
          {d.interviewScript.map((phase, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, border: `1px solid ${bdr}`, marginBottom: 8, overflow: "hidden" }}>
              <div style={{ padding: "8px 14px", background: "#F0EDE6", borderBottom: `1px solid ${bdr}`, display: "flex", justifyContent: "space-between" }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{phase.phase}</p>
                <p style={{ fontSize: 11, color: muted }}>{phase.duration}</p>
              </div>
              <div style={{ padding: "10px 14px" }}>
                {phase.questions.map((q, qi) => (
                  <p key={qi} style={{ fontSize: 12, color: ink, lineHeight: 1.6, paddingLeft: 8, marginBottom: 4, borderLeft: `2px solid ${bdr}` }}>{q}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {d.experiments && d.experiments.length > 0 && (
        <div>
          <p style={sectionHead}>Experiments to Run</p>
          {d.experiments.map((exp, i) => (
            <div key={i} style={{ background: "#F0FDF4", borderRadius: 8, border: `1px solid #BBF7D0`, padding: "12px 14px", marginBottom: 8 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: green, marginBottom: 6 }}>Hypothesis: {exp.hypothesis}</p>
              <p style={{ fontSize: 11, color: ink, marginBottom: 3 }}>Test: {exp.test}</p>
              <p style={{ fontSize: 11, color: ink, marginBottom: 3 }}>Metric: {exp.metric}</p>
              <p style={{ fontSize: 11, color: ink, marginBottom: exp.timeframe ? 3 : 0 }}>Success: {exp.successCriteria}</p>
              {exp.timeframe && <p style={{ fontSize: 11, color: muted }}>Timeframe: {exp.timeframe}</p>}
            </div>
          ))}
        </div>
      )}

      {d.segmentAnalysis && d.segmentAnalysis.length > 0 && (
        <div>
          <p style={sectionHead}>Segment Priorities</p>
          {d.segmentAnalysis.sort((a, b) => a.priority - b.priority).map((seg, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: ink }}>{seg.priority}</p>
              </div>
              <div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 2 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{seg.segment}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: painColor[seg.painLevel] || muted }}>{seg.painLevel} pain</span>
                </div>
                <p style={{ fontSize: 11, color: muted }}>{seg.willingness}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Download survey HTML ────────────────────────────────────────── */}
      {(d.ellisTest || (d.interviewScript && d.interviewScript.length > 0)) && (
        <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "14px 16px", border: `1px solid #DDD6FE` }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", marginBottom: 4 }}>Deploy this survey to real customers</p>
          <p style={{ fontSize: 11, color: "#6D28D9", marginBottom: 12 }}>Download a standalone HTML survey — host on Netlify Drop, Carrd, or email as a file.</p>
          <button
            onClick={() => {
              const questions: string[] = [];
              if (d.ellisTest?.primaryQuestion) questions.push(d.ellisTest.primaryQuestion);
              if (d.ellisTest?.followUps) questions.push(...d.ellisTest.followUps);
              // flatten interview script questions
              d.interviewScript?.forEach(phase => {
                phase.questions.forEach(q => questions.push(q));
              });

              const options = d.ellisTest?.options ?? ["Very disappointed", "Somewhat disappointed", "Not disappointed"];
              const optionHtml = options.map((o) => `
                <label class="option-label">
                  <input type="radio" name="q0" value="${o}" required />
                  <span>${o}</span>
                </label>`).join("");

              const followUpHtml = (d.ellisTest?.followUps ?? []).map((q, i) => `
                <div class="field">
                  <label>${q}</label>
                  <textarea name="fu${i}" rows="3" placeholder="Your answer…"></textarea>
                </div>`).join("");

              const surveyHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>PMF Survey</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #F9F7F2; color: #18160F; padding: 40px 20px; }
    .card { max-width: 620px; margin: 0 auto; background: #fff; border: 1px solid #E2DDD5; border-radius: 20px; padding: 40px; }
    h1 { font-size: 24px; font-weight: 300; margin-bottom: 8px; }
    .sub { font-size: 14px; color: #8A867C; margin-bottom: 32px; }
    .field { margin-bottom: 24px; }
    label { display: block; font-size: 14px; font-weight: 600; color: #18160F; margin-bottom: 10px; }
    .option-label { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #E2DDD5; border-radius: 8px; margin-bottom: 6px; cursor: pointer; font-size: 14px; font-weight: 400; transition: background .12s; }
    .option-label:hover { background: #F0EDE6; }
    .option-label input { width: 16px; height: 16px; flex-shrink: 0; }
    textarea { width: 100%; padding: 12px; border: 1px solid #E2DDD5; border-radius: 8px; font-family: inherit; font-size: 14px; color: #18160F; resize: vertical; min-height: 80px; }
    textarea:focus { outline: none; border-color: #7C3AED; }
    .divider { border: none; border-top: 1px solid #E2DDD5; margin: 28px 0; }
    .submit { width: 100%; padding: 14px; background: #18160F; color: #F9F7F2; border: none; border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer; margin-top: 8px; }
    .submit:hover { opacity: .85; }
    .thank-you { display: none; text-align: center; padding: 40px 0; }
    .thank-you h2 { font-size: 22px; font-weight: 300; margin-bottom: 8px; }
  </style>
</head>
<body>
  <div class="card" id="form-card">
    <h1>Quick survey</h1>
    <p class="sub">Takes 2 minutes. Your feedback shapes the product.</p>
    <form id="survey-form" onsubmit="handleSubmit(event)">
      <div class="field">
        <label>${d.ellisTest?.primaryQuestion ?? "How would you feel if you could no longer use this product?"}</label>
        ${optionHtml}
      </div>
      <hr class="divider" />
      ${followUpHtml}
      <button type="submit" class="submit">Submit →</button>
    </form>
  </div>
  <div class="thank-you" id="thank-you">
    <h2>Thank you! 🙌</h2>
    <p style="color:#8A867C; font-size:15px">Your response has been recorded.</p>
  </div>
  <script>
    function handleSubmit(e) {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(e.target));
      const stored = JSON.parse(localStorage.getItem('pmf_responses') || '[]');
      stored.push({ ...data, ts: new Date().toISOString() });
      localStorage.setItem('pmf_responses', JSON.stringify(stored));
      document.getElementById('form-card').style.display = 'none';
      document.getElementById('thank-you').style.display = 'block';
    }
  </script>
</body>
</html>`;
              const blob = new Blob([surveyHtml], { type: "text/html;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "pmf_survey.html"; a.click();
              URL.revokeObjectURL(url);
            }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "9px 16px", borderRadius: 8, border: "none",
              background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            <Download size={12} />
            Download Survey HTML
          </button>
        </div>
      )}

      {/* ── Interview Notes Analyzer ─────────────────────────────────────────── */}
      <InterviewNotesAnalyzer artifactId={artifactId} />

      {/* ── Fake Door Test ──────────────────────────────────────────────────── */}
      <FakeDoorSection artifactId={artifactId} userId={userId} data={data} />
    </div>
  );
}

// ── Interview Notes Analyzer (used inside PMFSurveyRenderer) ─────────────────
function InterviewNotesAnalyzer({ artifactId }: { artifactId?: string }) {
  const [showModal, setShowModal]       = useState(false);
  const [intervieweeName, setName]      = useState("");
  const [intervieweeRole, setRole]      = useState("");
  const [notes, setNotes]               = useState("");
  const [analyzing, setAnalyzing]       = useState(false);
  const [analysis, setAnalysis]         = useState<{
    pmfSignal?: string; pmfSummary?: string;
    themes?: { theme: string; frequency: string; quotes: string[]; insight: string }[];
    painPoints?: { pain: string; severity: string; currentWorkaround: string; willingnessToPay: boolean }[];
    featureRequests?: { feature: string; mentions: number; context: string; priority: string }[];
    keyQuotes?: { quote: string; type: string }[];
    buyingSignals?: string[]; redFlags?: string[]; nextSteps?: string[];
  } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // History of past analyses
  const [history, setHistory]           = useState<{ id: string; title: string; content: { pmfSignal?: string } }[]>([]);

  useEffect(() => {
    fetch('/api/agents/nova/interview-notes')
      .then(r => r.json())
      .then(d => { if (d.insights) setHistory(d.insights); })
      .catch(() => {});
  }, [analysis]);

  async function handleAnalyze() {
    if (!notes.trim() || analyzing) return;
    setAnalyzing(true); setAnalyzeError(null); setAnalysis(null);
    try {
      const res = await fetch('/api/agents/nova/interview-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes, intervieweeName: intervieweeName.trim(), role: intervieweeRole.trim(), artifactId }),
      });
      const result = await res.json();
      if (res.ok) setAnalysis(result.analysis);
      else setAnalyzeError(result.error ?? 'Analysis failed');
    } catch { setAnalyzeError('Network error'); }
    finally { setAnalyzing(false); }
  }

  const pmfColors: Record<string, string> = { strong: green, moderate: amber, weak: "#D97706", negative: red };
  const pmfEmoji:  Record<string, string> = { strong: "🟢", moderate: "🟡", weak: "🟠", negative: "🔴" };
  const severityColor: Record<string, string> = { critical: red, significant: amber, minor: muted };
  const priorityColor: Record<string, string> = { "must-have": red, "nice-to-have": blue, delight: green };

  return (
    <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: history.length > 0 ? 10 : 0 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 2 }}>Interview Notes Analyzer</p>
          <p style={{ fontSize: 11, color: muted }}>Paste notes or a transcript — Nova extracts themes, pain points, feature requests, and PMF signal.</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setAnalysis(null); setAnalyzeError(null); }}
          style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", marginLeft: 12, whiteSpace: "nowrap" }}
        >
          Analyze Interview
        </button>
      </div>
      {history.length > 0 && (
        <div style={{ borderTop: `1px solid #BBF7D0`, paddingTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {history.slice(0, 5).map((h, i) => {
            const signal = h.content?.pmfSignal as string | undefined;
            return (
              <span key={i} style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, background: "#DCFCE7", color: "#166534", border: `1px solid #BBF7D0`, fontWeight: 600 }}>
                {pmfEmoji[signal ?? ''] ?? '⚪'} {h.title.replace('Interview: ', '')}
              </span>
            );
          })}
        </div>
      )}

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !analyzing) setShowModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 720, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Interview Notes Analyzer</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!analysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Interviewee Name</label>
                    <input value={intervieweeName} onChange={e => setName(e.target.value)} placeholder="Sarah Chen" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Their Role / Company</label>
                    <input value={intervieweeRole} onChange={e => setRole(e.target.value)} placeholder="Head of Ops, Acme Corp" style={{ width: "100%", padding: "8px 10px", borderRadius: 7, border: `1px solid ${bdr}`, fontSize: 12, color: ink, boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>
                    Notes / Transcript * <span style={{ fontWeight: 400 }}>(raw notes, Otter.ai export, bullet points — anything works)</span>
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder={"- Said current process takes 3 hours every week\n- Uses spreadsheets, hates manual data entry\n- Would pay $50-100/mo for automation\n- Mentioned their team of 5 all have the same problem\n- Not very disappointed if product went away..."}
                    rows={12}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }}
                  />
                </div>
                {analyzeError && <p style={{ fontSize: 12, color: red }}>{analyzeError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || notes.trim().length < 30}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzing ? bdr : green, color: analyzing ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzing ? "not-allowed" : "pointer" }}
                  >
                    {analyzing ? "Analyzing…" : "Extract Insights"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* PMF Signal header */}
                <div style={{ background: `${pmfColors[analysis.pmfSignal ?? '']}14`, border: `1px solid ${pmfColors[analysis.pmfSignal ?? ''] ?? muted}40`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                    <span style={{ fontSize: 22 }}>{pmfEmoji[analysis.pmfSignal ?? ''] ?? '⚪'}</span>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: pmfColors[analysis.pmfSignal ?? ''] ?? muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                        PMF Signal — {analysis.pmfSignal?.toUpperCase()}
                      </p>
                      <p style={{ fontSize: 11, color: muted }}>{intervieweeName || 'Customer'}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{analysis.pmfSummary}</p>
                </div>

                {/* Themes */}
                {analysis.themes && analysis.themes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Themes ({analysis.themes.length})</p>
                    {analysis.themes.map((t, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{t.theme}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: t.frequency === 'high' ? red : t.frequency === 'medium' ? amber : muted }}>{t.frequency} freq</span>
                        </div>
                        <p style={{ fontSize: 12, color: blue, marginBottom: 6 }}>→ {t.insight}</p>
                        {t.quotes.slice(0, 1).map((q, qi) => (
                          <p key={qi} style={{ fontSize: 11, color: muted, fontStyle: "italic" }}>&quot;{q}&quot;</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pain Points + Feature Requests side by side */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {analysis.painPoints && analysis.painPoints.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Pain Points</p>
                      {analysis.painPoints.map((p, i) => (
                        <div key={i} style={{ background: "#FEF2F2", borderRadius: 8, padding: "10px 12px", border: `1px solid #FECACA`, marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{p.pain}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: severityColor[p.severity] ?? muted }}>{p.severity}</span>
                          </div>
                          <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>Now: {p.currentWorkaround}</p>
                          {p.willingnessToPay && <p style={{ fontSize: 10, color: green, fontWeight: 600, marginTop: 3 }}>✓ Willing to pay</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.featureRequests && analysis.featureRequests.length > 0 && (
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Feature Requests</p>
                      {analysis.featureRequests.map((f, i) => (
                        <div key={i} style={{ background: "#EFF6FF", borderRadius: 8, padding: "10px 12px", border: `1px solid #BFDBFE`, marginBottom: 6 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: ink }}>{f.feature}</p>
                            <span style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", color: priorityColor[f.priority] ?? muted }}>{f.priority}</span>
                          </div>
                          <p style={{ fontSize: 11, color: muted }}>{f.context}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Key Quotes */}
                {analysis.keyQuotes && analysis.keyQuotes.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em", color: muted, marginBottom: 8 }}>Key Quotes</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {analysis.keyQuotes.map((q, i) => {
                        const typeColor: Record<string, string> = { pain: red, praise: green, 'feature-request': blue, objection: amber };
                        return (
                          <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, borderLeft: `3px solid ${typeColor[q.type] ?? muted}` }}>
                            <p style={{ fontSize: 12, color: ink, fontStyle: "italic", lineHeight: 1.6 }}>&quot;{q.quote}&quot;</p>
                            <p style={{ fontSize: 10, color: typeColor[q.type] ?? muted, fontWeight: 600, marginTop: 4, textTransform: "capitalize" }}>{q.type.replace('-', ' ')}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Next Steps */}
                {analysis.nextSteps && analysis.nextSteps.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 14px", border: `1px solid #BBF7D0` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: green, marginBottom: 6 }}>Next Steps</p>
                    {analysis.nextSteps.map((s, i) => <p key={i} style={{ fontSize: 12, color: ink, marginBottom: 3 }}>• {s}</p>)}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setAnalysis(null); setNotes(""); setName(""); setRole(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                  <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Fake door sub-component (used inside PMFSurveyRenderer)
function FakeDoorSection({ artifactId, userId: _userId, data }: { artifactId?: string; userId?: string; data: Record<string, unknown> }) {
  const [showModal, setShowModal]       = useState(false);
  const [featureName, setFeatureName]   = useState("");
  const [tagline, setTagline]           = useState("");
  const [ctaText, setCtaText]           = useState("Join the waitlist");
  const [deploying, setDeploying]       = useState(false);
  const [liveUrl, setLiveUrl]           = useState<string | null>(null);
  const [deployError, setDeployError]   = useState<string | null>(null);
  const [signupCount, setSignupCount]   = useState<number | null>(null);

  // Pre-fill from artifact data
  useEffect(() => {
    const d = data as { targetSegment?: string };
    if (d.targetSegment && !featureName) setFeatureName("");
  }, [data, featureName]);

  // Load existing deployment
  useEffect(() => {
    if (!artifactId) return;
    fetch(`/api/agents/nova/fake-door?artifactId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.site?.url) setLiveUrl(d.site.url); })
      .catch(() => {});
  }, [artifactId]);

  // Load signup count when we have a live URL
  useEffect(() => {
    if (!artifactId || !liveUrl) return;
    fetch(`/api/waitlist?testId=${artifactId}`)
      .then(r => r.json())
      .then(d => { if (d.count !== undefined) setSignupCount(d.count); })
      .catch(() => {});
  }, [artifactId, liveUrl]);

  async function handleDeploy() {
    if (!featureName.trim() || !tagline.trim() || deploying) return;
    setDeploying(true); setDeployError(null);
    try {
      const res = await fetch('/api/agents/nova/fake-door', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureName, tagline, ctaText, artifactId }),
      });
      const result = await res.json();
      if (res.ok) { setLiveUrl(result.url); setShowModal(false); }
      else setDeployError(result.error ?? 'Deploy failed — check NETLIFY_API_KEY');
    } catch { setDeployError('Network error'); }
    finally { setDeploying(false); }
  }

  const teal = "#0D9488";

  return (
    <div style={{ background: "#F0FDFA", borderRadius: 12, padding: "16px 18px", border: `1px solid #99F6E4` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: teal, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Fake Door Test</p>
          {liveUrl ? (
            <div>
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: teal, textDecoration: "underline", wordBreak: "break-all" }}>{liveUrl}</a>
              {signupCount !== null && (
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, marginTop: 6 }}>
                  <span style={{ fontSize: 18 }}>{signupCount}</span> <span style={{ color: muted, fontWeight: 400 }}>waitlist signup{signupCount !== 1 ? "s" : ""}</span>
                </p>
              )}
            </div>
          ) : (
            <p style={{ fontSize: 11, color: muted }}>Deploy a landing page for an unbuilt feature — measure real demand before writing code.</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, flexShrink: 0, marginLeft: 12 }}>
          {liveUrl && <a href={liveUrl} target="_blank" rel="noopener noreferrer" style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${teal}`, background: "transparent", color: teal, fontSize: 12, fontWeight: 600, textDecoration: "none" }}>View</a>}
          <button onClick={() => setShowModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: teal, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {liveUrl ? "Redeploy" : "Create Test"}
          </button>
        </div>
      </div>

      {showModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 480, boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Create Fake Door Test</p>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Feature Name *</label>
                <input value={featureName} onChange={e => setFeatureName(e.target.value)} placeholder="e.g. AI-powered analytics dashboard" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Tagline *</label>
                <input value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Know what's happening before your customers do" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>CTA Button Text</label>
                <input value={ctaText} onChange={e => setCtaText(e.target.value)} placeholder="Join the waitlist" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
              </div>
              {deployError && <p style={{ fontSize: 12, color: red }}>{deployError}</p>}
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setShowModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                <button onClick={handleDeploy} disabled={deploying || !featureName.trim() || !tagline.trim()} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: deploying ? bdr : teal, color: deploying ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: deploying ? "not-allowed" : "pointer" }}>
                  {deploying ? "Deploying…" : "Deploy Test Page"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPETITIVE MATRIX RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function CompetitiveMatrixRenderer({ data, artifactId: _artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    ourProduct?: string;
    marketOverview?: string;
    competitors?: { name: string; positioning: string; pricing: string; targetCustomer: string; strengths: string[]; weaknesses: string[] }[];
    featureComparison?: { features: string[]; rows: { name: string; scores: Record<string, string> }[] };
    swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
    positioningStatement?: string;
    whiteSpace?: string[];
  };

  const [trackName, setTrackName]     = useState("");
  const [trackUrl, setTrackUrl]       = useState("");
  const [tracking, setTracking]       = useState(false);
  const [tracked, setTracked]         = useState<{ id: string; name: string; url?: string }[]>([]);
  const [trackDone, setTrackDone]     = useState(false);

  // Review analysis state
  const [showReviewModal, setShowReviewModal]   = useState(false);
  const [reviewCompetitor, setReviewCompetitor] = useState("");
  const [reviewText, setReviewText]             = useState("");
  const [analyzingReviews, setAnalyzingReviews] = useState(false);
  const [reviewAnalysis, setReviewAnalysis]     = useState<{
    topComplaints?: { complaint: string; frequency: string; quote?: string; salesAngle: string }[];
    topPraise?: { praise: string; implication: string }[];
    featureGaps?: { feature: string; evidence: string; opportunity: string }[];
    battleCardSummary?: string;
    keyQuote?: string;
  } | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Price change alerts state
  const [priceAlerts, setPriceAlerts] = useState<{ id: string; description: string; metadata: Record<string, unknown>; created_at: string }[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  // Job posting tracker state
  const [showJobModal, setShowJobModal]   = useState(false);
  const [jobCompetitor, setJobCompetitor] = useState("");
  const [jobText, setJobText]             = useState("");
  const [analyzingJobs, setAnalyzingJobs] = useState(false);
  const [jobAnalysis, setJobAnalysis]     = useState<{
    competitor?: string;
    totalRoles?: number;
    signals?: { pattern: string; roles: string[]; count: number; inference: string; urgency: string }[];
    strategicSummary?: string;
    recommendedActions?: string[];
  } | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  async function handleAnalyzeJobs() {
    if (!jobCompetitor.trim() || jobText.trim().length < 10 || analyzingJobs) return;
    setAnalyzingJobs(true); setJobError(null); setJobAnalysis(null);
    try {
      const res = await fetch('/api/agents/atlas/job-postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorName: jobCompetitor.trim(), jobListings: jobText }),
      });
      const result = await res.json();
      if (res.ok) setJobAnalysis(result.analysis);
      else setJobError(result.error ?? 'Analysis failed');
    } catch { setJobError('Network error'); }
    finally { setAnalyzingJobs(false); }
  }

  async function handleAnalyzeReviews() {
    if (!reviewCompetitor.trim() || reviewText.trim().length < 50 || analyzingReviews) return;
    setAnalyzingReviews(true); setReviewError(null); setReviewAnalysis(null);
    try {
      const res = await fetch('/api/agents/atlas/review-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitorName: reviewCompetitor.trim(), reviews: reviewText }),
      });
      const result = await res.json();
      if (res.ok) setReviewAnalysis(result.analysis);
      else setReviewError(result.error ?? 'Analysis failed');
    } catch { setReviewError('Network error'); }
    finally { setAnalyzingReviews(false); }
  }

  useEffect(() => {
    fetch('/api/agents/atlas/track')
      .then(r => r.json())
      .then(d => { if (d.competitors) setTracked(d.competitors); })
      .catch(() => {});
    fetch('/api/agents/atlas/alerts')
      .then(r => r.json())
      .then(d => { if (d.alerts) setPriceAlerts(d.alerts); })
      .catch(() => {});
  }, []);

  async function handleTrack() {
    if (!trackName || tracking) return;
    setTracking(true);
    try {
      const res = await fetch('/api/agents/atlas/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trackName, url: trackUrl || undefined }),
      });
      if (res.ok) {
        const d = await res.json();
        setTracked(prev => [...prev, d.competitor ?? { id: '', name: trackName }]);
        setTrackName(""); setTrackUrl(""); setTrackDone(true);
        setTimeout(() => setTrackDone(false), 3000);
      }
    } catch {} finally { setTracking(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const scoreColor: Record<string, string> = { yes: green, no: red, partial: amber };
  const scoreLabel: Record<string, string> = { yes: "✓", no: "✗", partial: "~" };

  // Harper→Atlas cross-agent hook
  const [harperUpdate, setHarperUpdate] = useState<{ description: string } | null>(null);
  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/agents/context?agentId=atlas&since=${since}&limit=10`)
      .then(r => r.json())
      .then(d => {
        const ev = (d.events ?? []).find((e: { agent_id: string; action_type: string }) =>
          e.agent_id === "harper" && ["job_posting_prepared", "competitor_hiring_cue"].includes(e.action_type)
        );
        if (ev) setHarperUpdate(ev);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* ── Price Change Alerts banner ── */}
      {priceAlerts.filter(a => !dismissedAlerts.has(a.id)).map(alert => (
        <div key={alert.id} style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", margin: 0 }}>
              Pricing change detected — {(alert.metadata?.competitor_name as string) ?? "competitor"}
            </p>
            <p style={{ fontSize: 11, color: "#78350F", margin: "3px 0 0", lineHeight: 1.5 }}>{alert.description}</p>
            {(alert.metadata?.pricing_url as string) && (
              <a href={alert.metadata.pricing_url as string} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: amber, fontWeight: 600, textDecoration: "none" }}>
                View their pricing page →
              </a>
            )}
          </div>
          <button
            onClick={() => setDismissedAlerts(prev => new Set([...prev, alert.id]))}
            style={{ padding: "4px 8px", borderRadius: 6, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1, flexShrink: 0 }}
          >✕</button>
        </div>
      ))}

      {/* ── Harper→Atlas cross-agent banner ── */}
      {harperUpdate && (
        <div style={{ background: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 16 }}>🧑‍💼</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#7C3AED", margin: 0 }}>Harper posted a job — check if competitors are hiring for similar roles?</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{harperUpdate.description}</p>
          </div>
          <button
            onClick={() => { setShowJobModal(true); setHarperUpdate(null); }}
            style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: "#7C3AED", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Analyze Competitor Hiring
          </button>
          <button onClick={() => setHarperUpdate(null)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Track Competitor ── */}
      <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 8 }}>Track a Competitor</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input value={trackName} onChange={e => setTrackName(e.target.value)} placeholder="Competitor name" style={{ flex: "1 1 140px", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink }} />
          <input value={trackUrl} onChange={e => setTrackUrl(e.target.value)} placeholder="URL (optional)" style={{ flex: "1 1 160px", padding: "7px 10px", borderRadius: 7, border: `1px solid ${bdr}`, background: bg, fontSize: 12, color: ink }} />
          <button onClick={handleTrack} disabled={!trackName || tracking} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: !trackName ? bdr : blue, color: !trackName ? muted : "#fff", fontSize: 12, fontWeight: 600, cursor: !trackName ? "not-allowed" : "pointer" }}>
            {tracking ? "Adding…" : trackDone ? "Added!" : "Track"}
          </button>
        </div>
        {tracked.length > 0 && (
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
            {tracked.map((c, i) => {
              const hasAlert = priceAlerts.some(a =>
                !dismissedAlerts.has(a.id) &&
                (a.metadata?.competitor_name as string)?.toLowerCase() === c.name.toLowerCase()
              );
              return (
                <span key={i} style={{ padding: "2px 8px", borderRadius: 999, fontSize: 11, background: hasAlert ? "#FEF3C7" : "#DBEAFE", color: hasAlert ? "#92400E" : blue, fontWeight: 600, border: hasAlert ? "1px solid #FDE68A" : "none", display: "flex", alignItems: "center", gap: 4 }}>
                  {hasAlert && <span style={{ fontSize: 10 }}>🔔</span>}
                  {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer" style={{ color: hasAlert ? "#92400E" : blue, textDecoration: "none" }}>{c.name} ↗</a> : c.name}
                </span>
              );
            })}
          </div>
        )}
      </div>
      {d.marketOverview && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.marketOverview}</p>
        </div>
      )}

      {d.featureComparison && d.featureComparison.features && d.featureComparison.rows && (
        <div>
          <p style={sectionHead}>Feature Comparison</p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: surf }}>
                  <th style={{ padding: "8px 10px", textAlign: "left", borderBottom: `1px solid ${bdr}`, color: muted, fontWeight: 600 }}>Product</th>
                  {d.featureComparison.features.map((f, i) => (
                    <th key={i} style={{ padding: "8px 8px", textAlign: "center", borderBottom: `1px solid ${bdr}`, color: muted, fontWeight: 600, fontSize: 10 }}>{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.featureComparison.rows.map((row, i) => (
                  <tr key={i} style={{ background: row.name === "Us" ? "#F0FDF4" : i % 2 === 0 ? "#fff" : surf }}>
                    <td style={{ padding: "8px 10px", borderBottom: `1px solid ${bdr}`, fontWeight: row.name === "Us" ? 700 : 400, color: row.name === "Us" ? green : ink }}>{row.name}</td>
                    {d.featureComparison!.features.map((f, fi) => {
                      const score = row.scores[f] || "no";
                      return (
                        <td key={fi} style={{ padding: "8px", textAlign: "center", borderBottom: `1px solid ${bdr}` }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor[score] || muted }}>{scoreLabel[score] || score}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {d.competitors && d.competitors.length > 0 && (
        <div>
          <p style={sectionHead}>Competitor Profiles</p>
          {d.competitors.map((comp, i) => (
            <div key={i} style={{ background: surf, borderRadius: 10, border: `1px solid ${bdr}`, padding: "14px 16px", marginBottom: 10 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: ink, marginBottom: 4 }}>{comp.name}</p>
              <p style={{ fontSize: 12, color: muted, marginBottom: 8 }}>{comp.positioning}</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: green, marginBottom: 4 }}>STRENGTHS</p>
                  {comp.strengths.map((s, si) => <p key={si} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>+ {s}</p>)}
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, color: red, marginBottom: 4 }}>WEAKNESSES</p>
                  {comp.weaknesses.map((w, wi) => <p key={wi} style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>− {w}</p>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {d.swot && (
        <div>
          <p style={sectionHead}>SWOT</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { key: "strengths", label: "Strengths", color: green, bg: "#F0FDF4", bdr2: "#BBF7D0" },
              { key: "weaknesses", label: "Weaknesses", color: red, bg: "#FEF2F2", bdr2: "#FECACA" },
              { key: "opportunities", label: "Opportunities", color: blue, bg: "#EFF6FF", bdr2: "#BFDBFE" },
              { key: "threats", label: "Threats", color: amber, bg: "#FFFBEB", bdr2: "#FED7AA" },
            ].map(({ key, label, color, bg, bdr2 }) => (
              <div key={key} style={{ background: bg, borderRadius: 8, padding: "10px 12px", border: `1px solid ${bdr2}` }}>
                <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                {(d.swot![key as keyof typeof d.swot] as string[] || []).map((item, i) => (
                  <p key={i} style={{ fontSize: 11, color: ink, lineHeight: 1.5, marginBottom: 3 }}>• {item}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {d.positioningStatement && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "12px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: blue, marginBottom: 6 }}>Our Positioning</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.positioningStatement}</p>
        </div>
      )}

      {/* ── Google Alerts (PHASE2: one-click competitor monitoring) ────── */}
      {d.competitors && d.competitors.length > 0 && (
        <div style={{ background: "#F0FDF4", borderRadius: 12, padding: "14px 16px", border: `1px solid #BBF7D0` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={green} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#166534" }}>Monitor competitors — set up Google Alerts</p>
              <p style={{ fontSize: 11, color: "#15803D" }}>Get notified when any competitor raises funding, launches, or makes news</p>
            </div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {d.competitors.map((comp, i) => (
              <a
                key={i}
                href={`https://www.google.com/alerts?q=${encodeURIComponent(`"${comp.name}" funding OR launch OR news OR product`)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  padding: "5px 10px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                  background: "#DCFCE7", color: "#166534", textDecoration: "none",
                  border: `1px solid #BBF7D0`, transition: "background .12s",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#BBF7D0")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#DCFCE7")}
              >
                🔔 Alert: {comp.name}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── Competitor Review Analysis ───────────────────────────────────────── */}
      <div style={{ background: "#FEF3C7", borderRadius: 12, padding: "14px 16px", border: `1px solid #FDE68A` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: amber, marginBottom: 2 }}>Competitor Review Analysis</p>
            <p style={{ fontSize: 11, color: muted }}>Paste G2 / Capterra / TrustPilot reviews → get clustered complaints, gaps, and sales angles.</p>
          </div>
          <button onClick={() => { setShowReviewModal(true); setReviewAnalysis(null); setReviewError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}>
            Analyze Reviews
          </button>
        </div>
      </div>

      {/* ── Job Posting Tracker (Hiring Signals) ─────────────────────────────── */}
      <div style={{ background: "#F5F3FF", borderRadius: 12, padding: "14px 16px", border: `1px solid #DDD6FE` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>Hiring Signal Tracker</p>
            <p style={{ fontSize: 11, color: muted }}>Paste competitor job listings → Atlas extracts strategic signals like &quot;5 AI roles → building an AI product layer&quot;.</p>
          </div>
          <button
            onClick={() => { setShowJobModal(true); setJobAnalysis(null); setJobError(null); }}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", flexShrink: 0, marginLeft: 12 }}
          >
            Analyze Jobs
          </button>
        </div>
        {/* Quick search links for tracked competitors */}
        {(tracked.length > 0 || (d.competitors && d.competitors.length > 0)) && (
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
            {[...tracked.map(c => c.name), ...(d.competitors ?? []).map(c => c.name)]
              .filter((name, i, arr) => arr.indexOf(name) === i)
              .slice(0, 6)
              .map((name, i) => (
                <a
                  key={i}
                  href={`https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(name)}&f_C=`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 9px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                    background: "#EDE9FE", color: "#7C3AED", textDecoration: "none",
                    border: `1px solid #DDD6FE`,
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#DDD6FE")}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#EDE9FE")}
                >
                  {name} jobs ↗
                </a>
              ))}
          </div>
        )}
      </div>

      {/* Job Modal */}
      {showJobModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget && !analyzingJobs) setShowJobModal(false); }}
        >
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Hiring Signal Tracker</p>
              <button onClick={() => setShowJobModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!jobAnalysis ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Competitor Name *</label>
                  <input
                    value={jobCompetitor}
                    onChange={e => setJobCompetitor(e.target.value)}
                    placeholder="e.g. Salesforce, Linear, Notion…"
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>
                    Paste Job Titles / Listings * <span style={{ fontWeight: 400 }}>(from LinkedIn, Indeed, their careers page, or just job titles)</span>
                  </label>
                  <textarea
                    value={jobText}
                    onChange={e => setJobText(e.target.value)}
                    placeholder={"Senior ML Engineer\nAI Research Lead\nHead of Enterprise Sales (New York)\nSenior Product Manager — AI Features\nSite Reliability Engineer\n..."}
                    rows={10}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                {jobError && <p style={{ fontSize: 12, color: red }}>{jobError}</p>}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setShowJobModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                  <button
                    onClick={handleAnalyzeJobs}
                    disabled={analyzingJobs || !jobCompetitor.trim() || jobText.trim().length < 10}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzingJobs ? bdr : "#7C3AED", color: analyzingJobs ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzingJobs ? "not-allowed" : "pointer" }}
                  >
                    {analyzingJobs ? "Analyzing…" : "Extract Signals"}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {/* Summary */}
                <div style={{ background: "#F5F3FF", border: `1px solid #DDD6FE`, borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", textTransform: "uppercase" }}>Strategic Summary — {jobAnalysis.competitor}</p>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED" }}>{jobAnalysis.totalRoles ?? 0} roles detected</span>
                  </div>
                  <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{jobAnalysis.strategicSummary}</p>
                </div>

                {/* Signals */}
                {jobAnalysis.signals && jobAnalysis.signals.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: ink, textTransform: "uppercase", marginBottom: 8 }}>Hiring Signals ({jobAnalysis.signals.length})</p>
                    {jobAnalysis.signals.map((sig, i) => {
                      const urgencyColor = sig.urgency === "high" ? red : sig.urgency === "medium" ? amber : muted;
                      return (
                        <div key={i} style={{ background: surf, borderRadius: 8, padding: "12px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 700, color: ink }}>{sig.pattern}</p>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: urgencyColor, textTransform: "uppercase" }}>{sig.urgency}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#7C3AED", background: "#EDE9FE", padding: "1px 7px", borderRadius: 999 }}>{sig.count} role{sig.count !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                            {sig.roles.map((r, ri) => (
                              <span key={ri} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 999, background: "#F5F3FF", color: "#7C3AED", border: `1px solid #DDD6FE` }}>{r}</span>
                            ))}
                          </div>
                          <p style={{ fontSize: 12, color: blue, lineHeight: 1.5 }}>→ {sig.inference}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Recommended Actions */}
                {jobAnalysis.recommendedActions && jobAnalysis.recommendedActions.length > 0 && (
                  <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "14px 16px", border: `1px solid #BBF7D0` }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 8 }}>Recommended Actions</p>
                    {jobAnalysis.recommendedActions.map((action, i) => (
                      <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.5, marginBottom: 4 }}>• {action}</p>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setJobAnalysis(null); setJobText(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(JSON.stringify(jobAnalysis, null, 2)).catch(() => {}); }}
                    style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                  >Copy as JSON</button>
                  <button onClick={() => setShowJobModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Analysis Modal */}
      {showReviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={e => { if (e.target === e.currentTarget && !analyzingReviews) setShowReviewModal(false); }}>
          <div style={{ background: "#fff", borderRadius: 16, padding: 28, width: "100%", maxWidth: 680, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.18)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Competitor Review Analysis</p>
              <button onClick={() => setShowReviewModal(false)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: muted }}>✕</button>
            </div>

            {!reviewAnalysis ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Competitor Name *</label>
                    <input value={reviewCompetitor} onChange={e => setReviewCompetitor(e.target.value)} placeholder="e.g. Salesforce, HubSpot, Notion…" style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 13, color: ink, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Paste Reviews *</label>
                    <textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Paste 5-20 reviews from G2, Capterra, TrustPilot, or App Store. Include the review text — star ratings help but aren't required." rows={10} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: ink, resize: "vertical", boxSizing: "border-box" }} />
                  </div>
                  {reviewError && <p style={{ fontSize: 12, color: red }}>{reviewError}</p>}
                  <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowReviewModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Cancel</button>
                    <button onClick={handleAnalyzeReviews} disabled={analyzingReviews || !reviewCompetitor.trim() || reviewText.trim().length < 50} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: analyzingReviews ? bdr : amber, color: analyzingReviews ? muted : "#fff", fontSize: 13, fontWeight: 600, cursor: analyzingReviews ? "not-allowed" : "pointer" }}>
                      {analyzingReviews ? "Analyzing…" : "Analyze Reviews"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {reviewAnalysis.keyQuote && (
                  <div style={{ background: "#FEF2F2", border: `1px solid #FECACA`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 6 }}>Key Quote</p>
                    <p style={{ fontSize: 13, color: ink, fontStyle: "italic", lineHeight: 1.6 }}>&quot;{reviewAnalysis.keyQuote}&quot;</p>
                  </div>
                )}
                {reviewAnalysis.battleCardSummary && (
                  <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 10, padding: "14px 16px" }}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: blue, textTransform: "uppercase", marginBottom: 6 }}>Battle Card Summary</p>
                    <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{reviewAnalysis.battleCardSummary}</p>
                  </div>
                )}
                {reviewAnalysis.topComplaints && reviewAnalysis.topComplaints.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: red, textTransform: "uppercase", marginBottom: 8 }}>Top Complaints ({reviewAnalysis.topComplaints.length})</p>
                    {reviewAnalysis.topComplaints.map((c, i) => (
                      <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{c.complaint}</p>
                          <span style={{ fontSize: 9, fontWeight: 700, color: c.frequency === 'high' ? red : c.frequency === 'medium' ? amber : muted, textTransform: "uppercase" }}>{c.frequency}</span>
                        </div>
                        {c.quote && <p style={{ fontSize: 11, color: muted, fontStyle: "italic", marginBottom: 6 }}>&quot;{c.quote}&quot;</p>}
                        <p style={{ fontSize: 11, color: blue }}>Sales angle: {c.salesAngle}</p>
                      </div>
                    ))}
                  </div>
                )}
                {reviewAnalysis.featureGaps && reviewAnalysis.featureGaps.length > 0 && (
                  <div>
                    <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 8 }}>Feature Gaps / Opportunities</p>
                    {reviewAnalysis.featureGaps.map((g, i) => (
                      <div key={i} style={{ background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", border: `1px solid #BBF7D0`, marginBottom: 8 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 3 }}>{g.feature}</p>
                        <p style={{ fontSize: 11, color: muted, marginBottom: 4 }}>{g.evidence}</p>
                        <p style={{ fontSize: 11, color: green }}>Opportunity: {g.opportunity}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => { setReviewAnalysis(null); setReviewText(""); }} style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${bdr}`, background: "transparent", color: ink, fontSize: 13, cursor: "pointer" }}>Analyze Another</button>
                  <button onClick={() => {
                    const text = JSON.stringify(reviewAnalysis, null, 2);
                    navigator.clipboard.writeText(text).catch(() => {});
                  }} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: amber, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Copy as JSON</button>
                  <button onClick={() => setShowReviewModal(false)} style={{ padding: "9px 18px", borderRadius: 8, border: "none", background: ink, color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Done</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGIC PLAN RENDERER
// ═══════════════════════════════════════════════════════════════════════════════
function StrategicPlanRenderer({ data, artifactId }: { data: Record<string, unknown>; artifactId?: string }) {
  const d = data as {
    vision?: string;
    currentPosition?: string;
    coreBets?: string[];
    okrs?: { objective: string; keyResults: { kr: string; target: string; metric: string }[] }[];
    roadmap?: { now: { initiative: string; rationale: string }[]; next: { initiative: string; rationale: string }[]; later: { initiative: string; rationale: string }[] };
    risks?: { risk: string; probability: string; impact: string; mitigation: string }[];
    fundraisingMilestones?: string[];
  };

  const [showSageModal, setShowSageModal]       = useState(false);
  const [sageRecipients, setSageRecipients]     = useState("");
  const [sageSending, setSageSending]           = useState(false);
  const [sageSent, setSageSent]                 = useState(false);
  const [sageError, setSageError]               = useState<string | null>(null);

  // Weekly standup state
  const [standupSent, setStandupSent]           = useState(false);
  const [sendingStandup, setSendingStandup]     = useState(false);
  const [standupError, setStandupError]         = useState<string | null>(null);

  async function handleSendStandup() {
    if (sendingStandup || standupSent) return;
    setSendingStandup(true); setStandupError(null);
    try {
      const res = await fetch('/api/agents/sage/standup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artifactId }),
      });
      if (res.ok) setStandupSent(true);
      else { const r = await res.json(); setStandupError(r.error ?? 'Failed to send'); }
    } catch { setStandupError('Network error'); }
    finally { setSendingStandup(false); }
  }

  // Linear OKR sync state
  const [showLinearModal, setShowLinearModal]   = useState(false);
  const [linearApiKey, setLinearApiKey]         = useState("");
  const [syncingLinear, setSyncingLinear]       = useState(false);
  const [linearResult, setLinearResult]         = useState<{ team: string; issues: { title: string; id: string; url: string }[]; count: number } | null>(null);
  const [linearError, setLinearError]           = useState<string | null>(null);

  // Cross-agent: detect if Felix recently updated metrics
  const [felixUpdate, setFelixUpdate]           = useState<{ description: string; created_at: string } | null>(null);

  useEffect(() => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // last 7 days
    fetch(`/api/agents/context?agentId=sage&since=${since}&limit=5`)
      .then(r => r.json())
      .then(d => {
        const felixEvent = (d.events ?? []).find((e: { agent_id: string; action_type: string }) =>
          e.agent_id === 'felix' && ['stripe_sync', 'mrr_updated', 'invoice_created'].includes(e.action_type)
        );
        if (felixEvent) setFelixUpdate(felixEvent);
      })
      .catch(() => {});
  }, []);

  async function handleSageUpdate() {
    const emails = sageRecipients.split(/[\n,]+/).map(r => r.trim()).filter(r => r.includes('@'));
    if (!emails.length || sageSending) return;
    setSageSending(true); setSageError(null);
    try {
      // First ensure investor contacts exist
      const creates = await Promise.all(emails.map(email =>
        fetch('/api/agents/investor/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: email.split('@')[0], email }),
        }).then(r => r.json())
      ));
      const contactIds = creates.map((c: Record<string, unknown>) => (c.contact as Record<string, unknown>)?.id).filter(Boolean) as string[];
      const res = await fetch('/api/agents/sage/investor-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contactIds }),
      });
      if (res.ok) setSageSent(true);
      else { const r = await res.json(); setSageError(r.error ?? 'Failed'); }
    } catch { setSageError('Network error'); }
    finally { setSageSending(false); }
  }

  function handleBoardDeck() {
    // Generate a minimal HTML board deck (6 slides) from artifact data
    const slides = [
      {
        title: "Vision",
        content: d.vision || "Define your company vision",
        accent: "#2563EB",
      },
      {
        title: "Where We Are Today",
        content: d.currentPosition || "Current position in the market",
        accent: "#7C3AED",
      },
      {
        title: "Strategic Bets",
        content: (d.coreBets || []).map((b, i) => `${i + 1}. ${b}`).join("\n") || "Core strategic bets",
        accent: "#EA580C",
      },
      {
        title: "OKRs — This Quarter",
        content: (d.okrs || []).map((okr, i) => `O${i + 1}: ${okr.objective}\n${okr.keyResults.map(kr => `  • ${kr.kr} → ${kr.target}`).join("\n")}`).join("\n\n") || "Objectives and key results",
        accent: "#16A34A",
      },
      {
        title: "Risks & Mitigations",
        content: (d.risks || []).map(r => `[${r.probability?.toUpperCase() || "MED"}] ${r.risk}\n  → ${r.mitigation}`).join("\n\n") || "Key risks and mitigations",
        accent: "#DC2626",
      },
      {
        title: "Fundraising Milestones",
        content: (d.fundraisingMilestones || []).map(m => `→ ${m}`).join("\n") || "Key fundraising milestones",
        accent: "#0891B2",
      },
    ];

    const deckHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Board Deck</title>
<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: -apple-system, system-ui, sans-serif; background: #111; color: #fff; }
.deck { width: 100%; }
.slide { width: 100vw; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 80px; position: relative; page-break-after: always; }
.slide:nth-child(odd) { background: #0D0D0D; }
.slide:nth-child(even) { background: #111827; }
.accent-bar { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
.slide-num { font-size: 11px; color: rgba(255,255,255,0.3); text-transform: uppercase; letter-spacing: 0.14em; margin-bottom: 20px; }
h2 { font-size: 42px; font-weight: 800; line-height: 1.1; margin-bottom: 32px; max-width: 600px; }
pre { font-family: inherit; font-size: 18px; line-height: 1.8; color: rgba(255,255,255,0.8); white-space: pre-wrap; max-width: 740px; }
.nav { position: fixed; bottom: 32px; right: 40px; display: flex; gap: 10px; z-index: 100; }
.nav button { padding: 8px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08); color: #fff; font-size: 14px; cursor: pointer; backdrop-filter: blur(8px); }
.nav button:hover { background: rgba(255,255,255,0.16); }
.print-hint { position: fixed; top: 20px; right: 24px; font-size: 11px; color: rgba(255,255,255,0.3); }
@media print { .nav, .print-hint { display: none; } .slide { min-height: 100vh; } }
</style>
</head>
<body>
<p class="print-hint">Press Ctrl/Cmd+P to export as PDF</p>
<div class="deck" id="deck">
${slides.map((s, i) => `<section class="slide" id="slide-${i}">
  <div class="accent-bar" style="background:${s.accent}"></div>
  <div class="slide-num">Slide ${i + 1} / ${slides.length}</div>
  <h2 style="color:${s.accent}">${s.title}</h2>
  <pre>${s.content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</section>`).join('\n')}
</div>
<div class="nav">
  <button onclick="scrollBy(-1)">← Prev</button>
  <button onclick="scrollBy(1)">Next →</button>
</div>
<script>
let cur = 0;
const slides = document.querySelectorAll('.slide');
function scrollBy(d) {
  cur = Math.max(0, Math.min(slides.length - 1, cur + d));
  slides[cur].scrollIntoView({ behavior: 'smooth' });
}
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') scrollBy(1);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') scrollBy(-1);
});
</script>
</body>
</html>`;

    const blob = new Blob([deckHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'board-deck.html';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleLinearSync() {
    if (!linearApiKey.trim() || syncingLinear) return;
    setSyncingLinear(true); setLinearError(null); setLinearResult(null);
    try {
      const res = await fetch('/api/agents/sage/linear-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linearApiKey: linearApiKey.trim(), artifactId }),
      });
      const r = await res.json();
      if (res.ok) setLinearResult(r);
      else setLinearError(r.error ?? 'Sync failed');
    } catch { setLinearError('Network error'); }
    finally { setSyncingLinear(false); }
  }

  const sectionHead: React.CSSProperties = { fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.14em", color: muted, marginBottom: 10 };
  const riskColor = (lvl: string) => lvl === "high" ? red : lvl === "medium" ? amber : green;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Weekly Standup CTA ── */}
      <div style={{ background: "#F0FDF4", border: `1px solid #BBF7D0`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: green, marginBottom: 2 }}>Send Weekly OKR Check-in</p>
          <p style={{ fontSize: 11, color: muted }}>Sage emails you a structured check-in with your OKRs — reply with progress %, blockers, and top wins.</p>
          {standupError && <p style={{ fontSize: 11, color: red, marginTop: 4 }}>{standupError}</p>}
        </div>
        {standupSent ? (
          <span style={{ fontSize: 12, color: green, fontWeight: 600, flexShrink: 0 }}>✓ Check-in sent!</span>
        ) : (
          <button onClick={handleSendStandup} disabled={sendingStandup} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: green, color: "#fff", fontSize: 12, fontWeight: 600, cursor: sendingStandup ? "not-allowed" : "pointer", whiteSpace: "nowrap", opacity: sendingStandup ? 0.7 : 1 }}>
            {sendingStandup ? "Sending…" : "Send Check-in"}
          </button>
        )}
      </div>

      {/* ── Felix cross-agent context banner ── */}
      {felixUpdate && (
        <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>⚡</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: amber, margin: 0 }}>Felix updated your metrics — refresh investor update with real numbers?</p>
            <p style={{ fontSize: 11, color: muted, margin: "2px 0 0" }}>{felixUpdate.description}</p>
          </div>
          <button onClick={() => setShowSageModal(true)} style={{ padding: "5px 12px", borderRadius: 7, border: "none", background: amber, color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>Refresh Update</button>
          <button onClick={() => setFelixUpdate(null)} style={{ padding: "5px 8px", borderRadius: 7, border: "none", background: "transparent", color: muted, fontSize: 14, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── Investor Update CTA (Sage) ── */}
      <div style={{ background: "#EFF6FF", border: `1px solid #BFDBFE`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: blue, marginBottom: 2 }}>Send Monthly Investor Update</p>
          <p style={{ fontSize: 11, color: muted }}>Sage pulls your Q-Score, metrics + OKRs and sends a YC-style update to investors.</p>
        </div>
        <button onClick={() => setShowSageModal(true)} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Send Update
        </button>
      </div>

      {/* ── Linear OKR Sync CTA ── */}
      <div style={{ background: "#F5F3FF", border: `1px solid #DDD6FE`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#7C3AED", marginBottom: 2 }}>Sync OKRs to Linear</p>
          <p style={{ fontSize: 11, color: muted }}>Create Linear Issues from your OKRs — one issue per objective with sub-issues for each key result.</p>
        </div>
        <button onClick={() => { setShowLinearModal(true); setLinearResult(null); setLinearError(null); }} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Sync to Linear
        </button>
      </div>

      {/* ── Board Deck CTA ── */}
      <div style={{ background: "#F0F9FF", border: `1px solid #BAE6FD`, borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#0891B2", marginBottom: 2 }}>Build Board Deck</p>
          <p style={{ fontSize: 11, color: muted }}>Generate a 6-slide HTML board deck from your vision, OKRs, risks, and milestones. Export to PDF for sharing.</p>
        </div>
        <button onClick={handleBoardDeck} style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: "#0891B2", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
          Download Deck
        </button>
      </div>

      {/* ── Linear Modal ── */}
      {showLinearModal && (
        <div onClick={() => { if (!syncingLinear) setShowLinearModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Sync OKRs to Linear</p>
              <button onClick={() => setShowLinearModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {linearResult ? (
              <div>
                <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "14px 16px", border: `1px solid #BBF7D0`, marginBottom: 16 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: green, marginBottom: 4 }}>✓ Synced {linearResult.count} OKR{linearResult.count !== 1 ? 's' : ''} to {linearResult.team}</p>
                  <p style={{ fontSize: 11, color: muted }}>Issues created with key results as sub-issues.</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 16 }}>
                  {linearResult.issues.map((issue) => (
                    <a key={issue.id} href={issue.url} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "8px 12px", background: surf, borderRadius: 8, border: `1px solid ${bdr}`, fontSize: 12, color: "#7C3AED", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      ↗ {issue.title}
                    </a>
                  ))}
                </div>
                <button onClick={() => { setShowLinearModal(false); setLinearResult(null); setLinearApiKey(""); }} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#7C3AED", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  Done
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Linear Personal API Key *</label>
                  <input
                    type="password"
                    value={linearApiKey}
                    onChange={e => setLinearApiKey(e.target.value)}
                    placeholder="lin_api_xxxxxxxxxxxxxxxx"
                    style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, boxSizing: "border-box" }}
                  />
                  <p style={{ fontSize: 10, color: muted, marginTop: 4 }}>Settings → Security → Personal API keys (read+write). Never stored long-term.</p>
                </div>
                {linearError && <p style={{ fontSize: 12, color: red }}>{linearError}</p>}
                <button onClick={handleLinearSync} disabled={!linearApiKey.trim() || syncingLinear} style={{ padding: "10px", borderRadius: 8, border: "none", background: !linearApiKey.trim() ? bdr : "#7C3AED", color: !linearApiKey.trim() ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !linearApiKey.trim() ? "not-allowed" : "pointer" }}>
                  {syncingLinear ? "Syncing…" : `Sync ${d.okrs?.length ?? 0} OKR${(d.okrs?.length ?? 0) !== 1 ? 's' : ''} to Linear`}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sage Modal ── */}
      {showSageModal && (
        <div onClick={() => { if (!sageSending) setShowSageModal(false); }} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: bg, borderRadius: 14, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: ink }}>Send Investor Update</p>
              <button onClick={() => setShowSageModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, fontSize: 18 }}>×</button>
            </div>
            {sageSent ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <p style={{ fontSize: 22, marginBottom: 10 }}>📨</p>
                <p style={{ fontSize: 14, fontWeight: 700, color: green, marginBottom: 6 }}>Updates sent!</p>
                <button onClick={() => { setShowSageModal(false); setSageSent(false); setSageRecipients(""); }} style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: blue, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Done</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: muted, display: "block", marginBottom: 4 }}>Investor Emails *</label>
                  <textarea value={sageRecipients} onChange={e => setSageRecipients(e.target.value)} placeholder="investor@vc.com&#10;partner@fund.com" rows={4} style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: `1px solid ${bdr}`, background: bg, fontSize: 13, color: ink, resize: "vertical", boxSizing: "border-box" }} />
                </div>
                {sageError && <p style={{ fontSize: 12, color: red }}>{sageError}</p>}
                <button onClick={handleSageUpdate} disabled={!sageRecipients || sageSending} style={{ padding: "10px", borderRadius: 8, border: "none", background: !sageRecipients ? bdr : blue, color: !sageRecipients ? muted : "#fff", fontSize: 13, fontWeight: 700, cursor: !sageRecipients ? "not-allowed" : "pointer" }}>
                  {sageSending ? "Sending…" : "Send Update"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {d.vision && (
        <div style={{ background: "#EFF6FF", borderRadius: 10, padding: "14px 16px", border: `1px solid #BFDBFE` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: blue, marginBottom: 6 }}>Vision</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: ink, lineHeight: 1.5 }}>{d.vision}</p>
        </div>
      )}

      {d.currentPosition && (
        <div style={{ background: surf, borderRadius: 10, padding: "12px 16px", border: `1px solid ${bdr}` }}>
          <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", color: muted, marginBottom: 6 }}>Current Position</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.currentPosition}</p>
        </div>
      )}

      {d.coreBets && d.coreBets.length > 0 && (
        <div>
          <p style={sectionHead}>Core Bets</p>
          {d.coreBets.map((bet, i) => (
            <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: blue, flexShrink: 0 }}>Bet {i + 1}</span>
              <p style={{ fontSize: 13, color: ink, lineHeight: 1.5 }}>{bet}</p>
            </div>
          ))}
        </div>
      )}

      {d.okrs && d.okrs.length > 0 && (
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={sectionHead}>OKRs — This Quarter</p>
            <a
              href="https://linear.app/new"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                // Copy all OKRs as markdown for pasting into Linear/Notion
                const md = d.okrs!.map((okr, i) =>
                  `## O${i + 1}: ${okr.objective}\n${okr.keyResults.map(kr => `- **KR:** ${kr.kr} → ${kr.target} (${kr.metric})`).join("\n")}`
                ).join("\n\n");
                navigator.clipboard.writeText(md).catch(() => {});
              }}
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                background: "#EFF6FF", color: blue, textDecoration: "none",
                border: `1px solid #BFDBFE`, transition: "background .12s",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = "#DBEAFE")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = "#EFF6FF")}
              title="OKRs copied to clipboard — paste into Linear or Notion"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              Export to Linear / Notion
            </a>
          </div>
          {d.okrs.map((okr, i) => (
            <div key={i} style={{ background: surf, borderRadius: 10, border: `1px solid ${bdr}`, padding: "14px 16px", marginBottom: 10 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 10 }}>O{i + 1}: {okr.objective}</p>
              {okr.keyResults.map((kr, ki) => (
                <div key={ki} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, padding: "6px 0", borderTop: `1px solid ${bdr}` }}>
                  <p style={{ fontSize: 12, color: ink }}>{kr.kr}</p>
                  <p style={{ fontSize: 12, fontWeight: 600, color: blue, textAlign: "right" }}>{kr.target}</p>
                  <p style={{ fontSize: 11, color: muted, textAlign: "right" }}>{kr.metric}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {d.roadmap && (
        <div>
          <p style={sectionHead}>Roadmap</p>
          {[
            { key: "now", label: "Now", color: green },
            { key: "next", label: "Next", color: amber },
            { key: "later", label: "Later", color: muted },
          ].map(({ key, label, color }) => {
            const items = d.roadmap![key as keyof typeof d.roadmap] as { initiative: string; rationale: string }[] || [];
            if (!items.length) return null;
            return (
              <div key={key} style={{ marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color, textTransform: "uppercase", marginBottom: 6 }}>{label}</p>
                {items.map((item, i) => (
                  <div key={i} style={{ padding: "8px 12px", background: "#fff", border: `1px solid ${bdr}`, borderRadius: 8, marginBottom: 6, borderLeft: `3px solid ${color}` }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 2 }}>{item.initiative}</p>
                    <p style={{ fontSize: 11, color: muted }}>{item.rationale}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {d.risks && d.risks.length > 0 && (
        <div>
          <p style={sectionHead}>Risk Register</p>
          {d.risks.map((r, i) => (
            <div key={i} style={{ background: surf, borderRadius: 8, padding: "10px 14px", border: `1px solid ${bdr}`, marginBottom: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: ink }}>{r.risk}</p>
                <div style={{ display: "flex", gap: 6 }}>
                  <span style={{ fontSize: 9, color: riskColor(r.probability), fontWeight: 700 }}>P:{r.probability}</span>
                  <span style={{ fontSize: 9, color: riskColor(r.impact), fontWeight: 700 }}>I:{r.impact}</span>
                </div>
              </div>
              <p style={{ fontSize: 11, color: muted }}>Mitigation: {r.mitigation}</p>
            </div>
          ))}
        </div>
      )}

      {d.fundraisingMilestones && d.fundraisingMilestones.length > 0 && (
        <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "12px 14px", border: `1px solid #BBF7D0` }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: green, textTransform: "uppercase", marginBottom: 8 }}>Fundraising Milestones</p>
          {d.fundraisingMilestones.map((m, i) => (
            <p key={i} style={{ fontSize: 12, color: ink, lineHeight: 1.6, marginBottom: 3 }}>→ {m}</p>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELIVERABLE PANEL
// ═══════════════════════════════════════════════════════════════════════════════
// ─── deliverable quality score ────────────────────────────────────────────────
function computeQualityScore(artifact: ArtifactData): { pct: number; label: string; missing: string[] } {
  const REQUIRED_KEYS: Record<string, string[]> = {
    icp_document:       ["summary", "buyerPersona", "firmographics", "painPoints", "buyingTriggers", "channels", "qualificationCriteria"],
    outreach_sequence:  ["subject", "emails", "followUpCadence"],
    battle_card:        ["competitor", "theirStrengths", "theirWeaknesses", "ourAdvantages", "objectionHandling", "pricingComparison"],
    gtm_playbook:       ["executiveSummary", "targetMarket", "channels", "timeline", "budget", "kpis"],
    sales_script:       ["openingHook", "discoveryQuestions", "valueProposition", "objectionHandling", "closingScript"],
    brand_messaging:    ["positioningStatement", "taglines", "elevatorPitch", "valuePropPillars", "toneOfVoice"],
    financial_summary:  ["keyMetrics", "revenueModel", "unitEconomics", "burnAndRunway", "fundraisingAsk"],
    legal_checklist:    ["incorporationStatus", "ipAssignment", "cofounderAgreements", "fundingDocuments", "complianceItems"],
    hiring_plan:        ["currentTeam", "hiringPriorities", "roleDescriptions", "compensationFramework", "hiringTimeline"],
    pmf_survey:         ["surveyQuestions", "segmentAnalysis", "pmfSignals", "nextExperiments"],
    competitive_matrix: ["competitors", "featureComparison", "ourPosition", "pricingComparison", "battleCards"],
    strategic_plan:     ["vision", "strategicBets", "milestones", "risks", "okrs"],
  };

  const required = REQUIRED_KEYS[artifact.type] ?? [];
  if (required.length === 0) return { pct: 100, label: "Complete", missing: [] };

  const content = artifact.content as Record<string, unknown>;
  const missing: string[] = [];
  let populated = 0;

  for (const k of required) {
    const val = content[k];
    const hasVal = val !== null && val !== undefined &&
      (Array.isArray(val) ? val.length > 0 : typeof val === "string" ? val.trim().length > 3 : true);
    if (hasVal) populated++;
    else missing.push(k.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()));
  }

  const pct = Math.round((populated / required.length) * 100);
  const label = pct >= 90 ? "Complete" : pct >= 70 ? "Good" : pct >= 50 ? "Partial" : "Needs work";
  return { pct, label, missing };
}

function artifactToText(artifact: ArtifactData): string {
  const lines: string[] = [`# ${artifact.title}\n`];
  function walk(obj: unknown, depth = 0): void {
    if (obj === null || obj === undefined) return;
    if (typeof obj === "string")  { lines.push("  ".repeat(depth) + obj); return; }
    if (typeof obj === "number" || typeof obj === "boolean") { lines.push("  ".repeat(depth) + String(obj)); return; }
    if (Array.isArray(obj)) { obj.forEach(item => walk(item, depth)); return; }
    if (typeof obj === "object") {
      Object.entries(obj as Record<string, unknown>).forEach(([k, v]) => {
        const label = k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
        if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
          lines.push("  ".repeat(depth) + `${label}: ${v}`);
        } else {
          lines.push("  ".repeat(depth) + `${label}:`);
          walk(v, depth + 1);
        }
      });
    }
  }
  walk(artifact.content);
  return lines.join("\n");
}

// ─── share modal ──────────────────────────────────────────────────────────────
function ShareModal({
  artifact,
  onClose,
}: {
  artifact: ArtifactData;
  onClose: () => void;
}) {
  const [copied,   setCopied]   = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const meta    = ARTIFACT_META[artifact.type];
  const text    = artifactToText(artifact);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyMarkdown = () => {
    // text is already Markdown-formatted (uses #, ##, ** etc.)
    navigator.clipboard.writeText(text);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`[Review] ${artifact.title}`);
    const body    = encodeURIComponent(`Hi,\n\nI'd love your feedback on this deliverable I built with Edge Alpha.\n\n---\n\n${text.slice(0, 1500)}${text.length > 1500 ? "\n…(truncated)" : ""}\n\n---\n\nLet me know what you think!`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const handlePDF = () => {
    const htmlLines = text.split("\n").map(line => {
      if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
      if (line.trim() === "") return "<br/>";
      if (line.startsWith("  ")) return `<p class="indent">${line.trim()}</p>`;
      return `<p>${line}</p>`;
    });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <title>${artifact.title}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #18160f; max-width: 720px; margin: 40px auto; padding: 0 24px; line-height: 1.6; }
        h1 { font-size: 24px; font-weight: 600; margin: 0 0 8px; border-bottom: 2px solid #e2ddd5; padding-bottom: 12px; }
        h2 { font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #8a867c; margin: 20px 0 6px; }
        h3 { font-size: 14px; font-weight: 600; margin: 14px 0 4px; }
        p { font-size: 13px; margin: 3px 0; color: #18160f; }
        p.indent { padding-left: 16px; color: #5a5850; }
        br { margin: 8px 0; display: block; }
        .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #e2ddd5; font-size: 11px; color: #8a867c; }
        @media print { body { margin: 0; padding: 20px; } }
      </style>
    </head><body>
      ${htmlLines.join("\n")}
      <div class="footer">Generated by Edge Alpha · ${new Date().toLocaleDateString()}</div>
    </body></html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 250);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(24,22,15,0.55)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24,
        }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            background: bg, borderRadius: 16, width: "100%", maxWidth: 520,
            boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
            overflow: "hidden",
          }}
        >
          {/* header */}
          <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Share2 size={15} style={{ color: blue }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Share with co-founder</span>
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
              <X size={16} />
            </button>
          </div>

          {/* artifact info */}
          <div style={{ padding: "16px 24px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              {meta && <meta.icon size={13} style={{ color: meta.color }} />}
              <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.12em", color: meta?.color ?? blue }}>
                {meta?.label ?? artifact.type}
              </span>
            </div>
            <p style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 16 }}>{artifact.title}</p>
          </div>

          {/* preview */}
          <div style={{ margin: "0 24px", borderRadius: 10, background: surf, border: `1px solid ${bdr}`, overflow: "hidden", maxHeight: 180 }}>
            <div style={{ overflowY: "auto", maxHeight: 180 }}>
              <pre style={{ margin: 0, padding: "14px 16px", fontSize: 11, color: muted, whiteSpace: "pre-wrap", lineHeight: 1.5, fontFamily: "inherit" }}>
                {text.slice(0, 600)}{text.length > 600 ? "\n…" : ""}
              </pre>
            </div>
          </div>

          {/* actions */}
          <div style={{ padding: "16px 24px 20px", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleCopy}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: copied ? "#F0FDF4" : surf,
                  color: copied ? green : ink,
                  border: `1px solid ${copied ? "#86EFAC" : bdr}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "background .15s, color .15s",
                  fontFamily: "inherit",
                }}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied!" : "Copy text"}
              </button>
              <button
                onClick={handlePDF}
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: surf, color: ink,
                  border: `1px solid ${bdr}`,
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontFamily: "inherit",
                }}
              >
                <Download size={13} />
                Export PDF
              </button>
            </div>
            <button
              onClick={handleCopyMarkdown}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: copiedMd ? "#F5F3FF" : surf,
                color: copiedMd ? "#7C3AED" : ink,
                border: `1px solid ${copiedMd ? "#C4B5FD" : bdr}`,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                transition: "background .15s, color .15s",
                fontFamily: "inherit",
              }}
            >
              {copiedMd ? <Check size={13} /> : <Copy size={13} />}
              {copiedMd ? "Copied as Markdown!" : "Copy Markdown — paste into Notion / Obsidian"}
            </button>
            <button
              onClick={handleEmail}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                background: blue, color: "#fff",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontFamily: "inherit",
              }}
            >
              <Mail size={13} />
              Email co-founder
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function DeliverablePanel({
  artifact,
  artifactHistory,
  onSelectArtifact,
  onClose,
  onRefine,
  agentName = "the agent",
  userId,
}: {
  artifact: ArtifactData;
  artifactHistory: ArtifactData[];
  onSelectArtifact: (a: ArtifactData) => void;
  onClose: () => void;
  onRefine: (feedback: string) => void;
  agentName?: string;
  userId?: string;
}) {
  const [refineInput,       setRefineInput]       = useState("");
  const [reviseMode,        setReviseMode]        = useState(false);
  const [selectedText,      setSelectedText]      = useState("");
  const [reviseInstruction, setReviseInstruction] = useState("");
  const [showShare,         setShowShare]         = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
    // Build CSV from financial summary content
    const c = artifact.content as Record<string, unknown>;
    const rows: string[][] = [["Metric", "Value"]];

    const addRow = (label: string, val: unknown) => {
      if (val == null || val === "") return;
      rows.push([label, String(val)]);
    };

    // Top-level scalars
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

    // unitEconomics nested object
    const ue = c.unitEconomics as Record<string, unknown> | undefined;
    if (ue) {
      for (const [k, v] of Object.entries(ue)) {
        addRow(`Unit Economics — ${k}`, v);
      }
    }

    // Revenue projections array
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
      <div style={{ padding: "16px 18px 12px", borderBottom: `1px solid ${bdr}`, flexShrink: 0 }}>
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
      </div>

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

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL PANEL (Felix)
// ═══════════════════════════════════════════════════════════════════════════════
function FinancialPanel({ onShare }: { onShare: (ctx: string) => void }) {
  const [model, setModel] = useState<FinModel>({
    mrr: "", growthRate: "", burn: "", grossMargin: "",
    cac: "", ltv: "", cash: "",
  });

  const set = (key: keyof FinModel) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setModel(prev => ({ ...prev, [key]: e.target.value }));

  const n = (v: string) => parseFloat(v.replace(/,/g, "")) || 0;

  const mrr         = n(model.mrr);
  const growth      = n(model.growthRate);
  const burn        = n(model.burn);
  const gm          = n(model.grossMargin);
  const cac         = n(model.cac);
  const ltv         = n(model.ltv);
  const cash        = n(model.cash);

  const arr         = mrr * 12;
  const grossProfit = mrr * (gm / 100);
  const netBurn     = Math.max(burn - grossProfit, 0);
  const runway      = netBurn > 0 ? cash / netBurn : Infinity;
  const ltvCac      = cac > 0 ? ltv / cac : 0;
  const payback     = grossProfit > 0 ? cac / grossProfit : Infinity;

  const projection = Array.from({ length: 12 }, (_, i) => {
    const mo      = i + 1;
    const mrrMo   = mrr * Math.pow(1 + growth / 100, mo);
    const gpMo    = mrrMo * (gm / 100);
    const nbMo    = Math.max(burn - gpMo, 0);
    const cashLeft = cash - nbMo * mo;
    return { mo, mrr: mrrMo, nb: nbMo, cash: cashLeft };
  });

  const hasData = mrr > 0 || burn > 0;

  const handleShare = () => {
    const lines = [
      "Here is my current financial snapshot — please use these exact numbers for your advice:",
      "",
      `**MRR:** $${fmtNum(mrr)}`,
      `**ARR:** $${fmtNum(arr)}`,
      `**Monthly Burn:** $${fmtNum(burn)}`,
      `**Gross Margin:** ${gm}%`,
      `**Net Burn/mo:** $${fmtNum(netBurn)}`,
      `**Runway:** ${isFinite(runway) ? Math.round(runway) + " months" : "Not burning cash"}`,
      `**Cash in Bank:** $${fmtNum(cash)}`,
      ...(cac   > 0 ? [`**CAC:** $${fmtNum(cac)}`]                                       : []),
      ...(ltv   > 0 ? [`**LTV:** $${fmtNum(ltv)}`]                                       : []),
      ...(ltvCac > 0 ? [`**LTV:CAC Ratio:** ${ltvCac.toFixed(2)}:1`]                     : []),
      ...(isFinite(payback) ? [`**Payback Period:** ${Math.round(payback)} months`]       : []),
      `**Monthly Growth Rate:** ${growth}%`,
    ];
    onShare(lines.join("\n"));
  };

  const inputFields: { key: keyof FinModel; label: string; placeholder: string }[] = [
    { key: "mrr",         label: "MRR ($)",            placeholder: "12,000"   },
    { key: "growthRate",  label: "Monthly Growth (%)",  placeholder: "8"        },
    { key: "burn",        label: "Monthly Burn ($)",    placeholder: "45,000"   },
    { key: "grossMargin", label: "Gross Margin (%)",    placeholder: "72"       },
    { key: "cac",         label: "CAC ($)",             placeholder: "800"      },
    { key: "ltv",         label: "LTV ($)",             placeholder: "4,800"    },
    { key: "cash",        label: "Cash in Bank ($)",    placeholder: "250,000"  },
  ];

  const vitals = [
    { label: "ARR",             value: "$" + fmtNum(arr),                                               accent: ink   },
    { label: "Net Burn / mo",   value: netBurn > 0 ? "$" + fmtNum(netBurn) : "Cash positive",            accent: netBurn === 0 ? green : healthColor(runway, 6, 18) },
    { label: "Runway",          value: isFinite(runway) ? fmtNum(runway, 1) + " mo" : "∞",              accent: isFinite(runway) ? healthColor(runway, 6, 18) : green },
    ...(ltvCac > 0 ? [{ label: "LTV : CAC",     value: ltvCac.toFixed(1) + " : 1",                     accent: healthColor(ltvCac, 2, 3) }] : []),
    ...(isFinite(payback) && payback > 0 ? [{ label: "Payback Period", value: Math.round(payback) + " mo", accent: payback <= 12 ? green : payback <= 18 ? amber : red }] : []),
  ];

  return (
    <div style={{
      width: 340, flexShrink: 0,
      borderLeft: `1px solid ${bdr}`,
      background: bg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>
      <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.18em", color: green, fontWeight: 600, marginBottom: 4 }}>
          Financial Model
        </p>
        <p style={{ fontSize: 13, color: muted, lineHeight: 1.5 }}>
          Enter your numbers, then share them with Felix.
        </p>
      </div>

      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}` }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {inputFields.map(({ key, label, placeholder }) => (
            <div key={key} style={{ gridColumn: key === "cash" ? "1 / -1" : "auto" }}>
              <label style={{
                display: "block", marginBottom: 5,
                fontSize: 10, fontWeight: 600, color: muted,
                textTransform: "uppercase", letterSpacing: "0.1em",
              }}>
                {label}
              </label>
              <input
                type="number"
                value={model[key]}
                onChange={set(key)}
                placeholder={placeholder}
                style={{
                  width: "100%", boxSizing: "border-box",
                  background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
                  padding: "8px 10px", fontSize: 13, color: ink,
                  outline: "none", fontFamily: "inherit",
                }}
                onFocus={(e)  => { e.currentTarget.style.borderColor = green; }}
                onBlur={(e)   => { e.currentTarget.style.borderColor = bdr;   }}
              />
            </div>
          ))}
        </div>
      </div>

      {hasData && vitals.length > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              Vitals
            </p>
          </div>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(2, 1fr)",
            gap: 1, background: bdr,
            borderTop: `1px solid ${bdr}`,
          }}>
            {vitals.map(({ label, value, accent }) => (
              <div key={label} style={{ background: bg, padding: "14px 16px" }}>
                <p style={{ fontSize: 10, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                  {label}
                </p>
                <p style={{ fontSize: 16, fontWeight: 700, color: accent }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {mrr > 0 && burn > 0 && (
        <div style={{ borderBottom: `1px solid ${bdr}` }}>
          <div style={{ padding: "14px 20px 10px" }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              12-Month Projection
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr", gap: 8, padding: "6px 16px 6px", borderTop: `1px solid ${bdr}`, borderBottom: `1px solid ${bdr}` }}>
            {["Mo", "MRR", "Burn", "Cash"].map(h => (
              <p key={h} style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: muted, fontWeight: 600, textAlign: h === "Mo" ? "left" : "right" }}>{h}</p>
            ))}
          </div>
          {projection.map(({ mo, mrr: mrrMo, nb, cash: cl }) => {
            const depleted = cl < 0;
            const low      = cl < cash * 0.15 && !depleted;
            return (
              <div
                key={mo}
                style={{
                  display: "grid", gridTemplateColumns: "32px 1fr 1fr 1fr",
                  gap: 8, padding: "7px 16px",
                  borderBottom: `1px solid ${bdr}`,
                  background: mo % 2 === 0 ? surf : bg,
                }}
              >
                <p style={{ fontSize: 11, color: muted }}>{mo}</p>
                <p style={{ fontSize: 11, color: ink, textAlign: "right" }}>
                  ${mrrMo >= 1000 ? (mrrMo / 1000).toFixed(1) + "k" : fmtNum(mrrMo)}
                </p>
                <p style={{ fontSize: 11, color: amber, textAlign: "right" }}>
                  ${nb >= 1000 ? (nb / 1000).toFixed(1) + "k" : fmtNum(nb)}
                </p>
                <p style={{
                  fontSize: 11, textAlign: "right", fontWeight: depleted ? 700 : 400,
                  color: depleted ? red : low ? amber : green,
                }}>
                  {depleted
                    ? "Out"
                    : "$" + (cl >= 1000 ? (cl / 1000).toFixed(0) + "k" : fmtNum(cl))}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: "16px 20px", marginTop: "auto" }}>
        <button
          onClick={handleShare}
          disabled={!hasData}
          style={{
            width: "100%", padding: "10px 14px",
            background: hasData ? green : surf,
            color: hasData ? "#fff" : muted,
            border: `1px solid ${hasData ? green : bdr}`,
            borderRadius: 8, fontSize: 13, fontWeight: 600,
            cursor: hasData ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            transition: "opacity .15s", fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { if (hasData) e.currentTarget.style.opacity = "0.85"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
        >
          <ChevronRight style={{ height: 13, width: 13 }} />
          Share model with Felix
        </button>
        <p style={{ fontSize: 11, color: muted, textAlign: "center", marginTop: 8, opacity: 0.7 }}>
          Felix will reference your exact numbers
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
// Challenge dimension labels
const CHALLENGE_LABEL: Record<string, string> = {
  market:     "Market",
  product:    "Product",
  goToMarket: "Go-to-Market",
  financial:  "Financial",
  team:       "Team",
  traction:   "Traction",
};

export default function AgentChat() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const agentId      = params.agentId as string;
  const agent        = getAgentById(agentId);
  const isFelix      = agentId === "felix";
  const isPatel      = agentId === "patel";
  const challengeDim  = searchParams.get("challenge");  // e.g. "goToMarket"
  const targetArtifactId = searchParams.get("artifact"); // e.g. "uuid-from-workspace"
  const autoPrompt    = searchParams.get("prompt");      // pre-seeded message from Q-Score actions

  const [uiMessages,      setUiMessages]      = useState<UiMessage[]>([]);
  const [apiMessages,     setApiMessages]     = useState<ApiMessage[]>([]);
  const [input,           setInput]           = useState("");
  const [typing,          setTyping]          = useState(false);
  const [showPrompts,     setShowPrompts]     = useState(true);
  const [userId,          setUserId]          = useState<string | null>(null);
  const [conversationId,  setConversationId]  = useState<string | null>(null);
  const [historyLoading,  setHistoryLoading]  = useState(true);
  const [activeArtifact,  setActiveArtifact]  = useState<ArtifactData | null>(null);
  const [artifactHistory, setArtifactHistory] = useState<ArtifactData[]>([]);
  const [generatingArtifact, setGeneratingArtifact] = useState(false);
  const [scoreBoost, setScoreBoost] = useState<{ points: number; dimension: string } | null>(null);
  const [showQuickGen, setShowQuickGen] = useState(false);
  const [quickAnswers, setQuickAnswers] = useState<string[]>(["", "", "", "", ""]);
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);
  const [actionItems,     setActionItems]     = useState<{ id: string; action_text: string; priority: string; status: string; action_type?: string; cta_label?: string }[]>([]);
  const [extractingActions, setExtractingActions] = useState(false);
  const [showActions,     setShowActions]     = useState(false);
  // Susi deal reminders
  const [susiReminders,   setSusiReminders]   = useState<{ id: string; company: string; contact_name?: string; stage: string; next_action?: string; label: string; isOverdue: boolean }[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const hasPanel = isFelix || activeArtifact !== null;

  useEffect(() => {
    if (!agent) router.push("/founder/agents");
  }, [agent, router]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [uiMessages, typing]);

  // ── load conversation history + artifacts ──────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setHistoryLoading(false); return; }
        setUserId(user.id);

        const { data: conv } = await supabase
          .from("agent_conversations")
          .select("id")
          .eq("user_id", user.id)
          .eq("agent_id", agentId)
          .order("last_message_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!conv) { setHistoryLoading(false); return; }
        setConversationId(conv.id);

        const { data: msgs } = await supabase
          .from("agent_messages")
          .select("role, content")
          .eq("conversation_id", conv.id)
          .order("created_at", { ascending: true });

        if (msgs && msgs.length > 0) {
          setUiMessages(msgs.map(m => ({
            role: (m.role === "user" ? "user" : "agent") as "user" | "agent",
            text: m.content,
          })));
          setApiMessages(msgs.map(m => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })));
          setShowPrompts(false);
        }

        // Load artifacts — prefer targeting a specific artifact by ID (from workspace link)
        // Fall back to all artifacts in this conversation
        let artifacts: { id: string; artifact_type: string; title: string; content: Record<string, unknown> }[] | null = null;

        if (targetArtifactId) {
          // Load the specific artifact + siblings of the same type for version history
          const { data: target } = await supabase
            .from("agent_artifacts")
            .select("id, artifact_type, title, content")
            .eq("id", targetArtifactId)
            .single();
          if (target) {
            // Also load other artifacts of the same type for this user + agent
            const { data: siblings } = await supabase
              .from("agent_artifacts")
              .select("id, artifact_type, title, content")
              .eq("user_id", user.id)
              .eq("agent_id", agentId)
              .eq("artifact_type", target.artifact_type)
              .order("created_at", { ascending: true });
            artifacts = siblings ?? [target];
          }
        }

        if (!artifacts) {
          const { data } = await supabase
            .from("agent_artifacts")
            .select("id, artifact_type, title, content")
            .eq("conversation_id", conv.id)
            .order("created_at", { ascending: true });
          artifacts = data;
        }

        if (artifacts && artifacts.length > 0) {
          const mapped: ArtifactData[] = artifacts.map(a => ({
            id: a.id,
            type: a.artifact_type as ArtifactData["type"],
            title: a.title,
            content: a.content as Record<string, unknown>,
          }));
          setArtifactHistory(mapped);
          // If targetArtifactId specified, activate that exact artifact; else use latest
          const target = targetArtifactId
            ? (mapped.find(a => a.id === targetArtifactId) ?? mapped[mapped.length - 1])
            : mapped[mapped.length - 1];
          setActiveArtifact(target);
        }
      } catch {
        // anonymous session fallback
      } finally {
        setHistoryLoading(false);
      }
    })();

    // Susi: load deal reminders (stale deals due within 3 days)
    if (agentId === 'susi') {
      fetch('/api/agents/deals/reminders')
        .then(r => r.json())
        .then(d => { if (d.reminders?.length) setSusiReminders(d.reminders); })
        .catch(() => {});
    }
  }, [agentId, targetArtifactId]);

  // ── Auto-send ?prompt= when history finishes loading and chat is empty ──────
  useEffect(() => {
    if (historyLoading || !autoPrompt || uiMessages.length > 0) return;
    // Small delay so the UI is fully rendered before firing
    const t = setTimeout(() => {
      setInput(autoPrompt);
      handleSend(autoPrompt);
    }, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLoading, autoPrompt]);

  // ── call AI ────────────────────────────────────────────────────────────────
  const callAI = useCallback(async (history: ApiMessage[], convId: string | null) => {
    setTyping(true);
    const isPatel = agentId === "patel";

    try {
      const res = await fetch("/api/agents/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          message: history[history.length - 1]?.content ?? "",
          conversationHistory: history.slice(0, -1),
          userId:         userId ?? undefined,
          conversationId: convId  ?? undefined,
          stream:         !isPatel,  // Patel needs 2-pass artifact generation
        }),
      });

      // ── Usage limit reached ────────────────────────────────────────────
      if (res.status === 429) {
        setUiMessages((p) => [...p, {
          role: "agent",
          text: "You've reached your monthly message limit (50 messages). Your limit resets on the 1st of next month.",
        }]);
        return;
      }

      // ── Streaming path (non-Patel) ─────────────────────────────────────
      if (!isPatel && res.headers.get("content-type")?.includes("text/event-stream")) {
        setUiMessages((p) => [...p, { role: "agent", text: "" }]);
        let fullText = "";
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const parsed = JSON.parse(payload);
              // Final meta event from our server
              if (parsed.conversationId !== undefined) {
                if (!convId) setConversationId(parsed.conversationId);
                continue;
              }
              const token = parsed.choices?.[0]?.delta?.content ?? "";
              if (token) {
                fullText += token;
                setUiMessages((p) => {
                  const updated = [...p];
                  updated[updated.length - 1] = { role: "agent", text: fullText };
                  return updated;
                });
              }
            } catch { /* skip malformed SSE line */ }
          }
        }

        setApiMessages((p) => [...p, { role: "assistant", content: fullText }]);
        return;
      }

      // ── Non-streaming path (Patel or fallback) ─────────────────────────
      const data = await res.json();
      const reply: string = data.response ?? data.content ?? "Sorry, I couldn't respond right now. Please try again.";
      if (data.conversationId && !convId) setConversationId(data.conversationId);
      setUiMessages((p) => [...p, { role: "agent", text: reply }]);
      setApiMessages((p) => [...p, { role: "assistant", content: reply }]);

      // Handle artifact from Patel
      if (data.artifact) {
        const newArtifact: ArtifactData = {
          id: data.artifact.id,
          type: data.artifact.type,
          title: data.artifact.title,
          content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);
        setGeneratingArtifact(false);
      }
    } catch {
      setUiMessages((p) => [...p, { role: "agent", text: "Connection issue — please try again." }]);
    } finally {
      setTyping(false);
      setGeneratingArtifact(false);
    }
  }, [agentId, userId]);

  const handleSend = useCallback((text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg || typing) return;
    setShowPrompts(false);
    setInput("");
    const newHistory = [...apiMessages, { role: "user" as const, content: msg }];
    setUiMessages((p) => [...p, { role: "user", text: msg }]);
    setApiMessages(newHistory);
    callAI(newHistory, conversationId);
  }, [input, typing, apiMessages, callAI, conversationId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleExtractActions = useCallback(async () => {
    if (extractingActions || apiMessages.length < 4) return;
    setExtractingActions(true);
    setShowActions(true);
    try {
      const res = await fetch("/api/agents/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationHistory: apiMessages, agentId, conversationId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.actions?.length) setActionItems(data.actions);
      }
    } catch {
      // silently fail
    } finally {
      setExtractingActions(false);
    }
  }, [extractingActions, apiMessages, agentId, conversationId]);

  const handleGenerate = useCallback(async () => {
    if (!agent?.artifactType || generatingArtifact || apiMessages.length < 2) return;
    setGeneratingArtifact(true);
    try {
      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          conversationHistory: apiMessages,
          artifactType: agent.artifactType,
          userId:         userId ?? undefined,
          conversationId: conversationId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Generate failed");
      const data = await res.json();
      if (data.artifact) {
        const newArtifact: ArtifactData = {
          id: data.artifact.id,
          type: data.artifact.type,
          title: data.artifact.title,
          content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);

        // Show score boost toast if the signal fired
        if (data.scoreSignal?.boosted) {
          setScoreBoost({
            points: data.scoreSignal.pointsAdded,
            dimension: data.scoreSignal.dimensionLabel,
          });
          setTimeout(() => setScoreBoost(null), 4000);
        }
      }
    } catch {
      // silently fail — artifact generation is non-critical
    } finally {
      setGeneratingArtifact(false);
    }
  }, [agent, agentId, generatingArtifact, apiMessages, userId, conversationId]);

  const handleQuickGenerate = useCallback(async () => {
    if (!agent?.artifactType || isQuickGenerating) return;
    const questions = QUICK_QUESTIONS[agent.artifactType] ?? [];
    const hasAnyAnswer = quickAnswers.some(a => a.trim().length > 0);
    if (!hasAnyAnswer) return;

    setIsQuickGenerating(true);
    try {
      // Build synthetic conversation from Q&A
      const qaPairs = questions
        .map((q, i) => `Q: ${q}\nA: ${quickAnswers[i]?.trim() || "(not provided)"}`)
        .join("\n\n");
      const syntheticHistory: Array<{ role: string; content: string }> = [
        { role: "assistant", content: `I'll help you create your ${ARTIFACT_META[agent.artifactType!]?.label}. Let me ask you a few quick questions to generate it.` },
        { role: "user", content: qaPairs },
      ];

      const res = await fetch("/api/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          conversationHistory: syntheticHistory,
          artifactType: agent.artifactType,
          userId:         userId ?? undefined,
          conversationId: conversationId ?? undefined,
        }),
      });
      if (!res.ok) throw new Error("Quick generate failed");
      const data = await res.json();
      if (data.artifact) {
        const newArtifact: ArtifactData = {
          id: data.artifact.id,
          type: data.artifact.type,
          title: data.artifact.title,
          content: data.artifact.content,
        };
        setArtifactHistory(prev => [...prev, newArtifact]);
        setActiveArtifact(newArtifact);
        setShowQuickGen(false);
        setQuickAnswers(["", "", "", "", ""]);
        if (data.scoreSignal?.boosted) {
          setScoreBoost({ points: data.scoreSignal.pointsAdded, dimension: data.scoreSignal.dimensionLabel });
          setTimeout(() => setScoreBoost(null), 4000);
        }
      }
    } catch {
      // silently fail
    } finally {
      setIsQuickGenerating(false);
    }
  }, [agent, agentId, isQuickGenerating, quickAnswers, userId, conversationId]);

  const handleToggleActionStatus = useCallback(async (actionId: string, currentStatus: string) => {
    const next = currentStatus === "pending" ? "in_progress" : currentStatus === "in_progress" ? "done" : "pending";
    setActionItems(prev => prev.map(a => a.id === actionId ? { ...a, status: next } : a));
    await fetch("/api/agents/actions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionId, status: next }),
    });
  }, []);

  const handleActionCTA = useCallback((item: { id: string; action_text: string; action_type?: string; cta_label?: string }) => {
    const type = item.action_type ?? "task";
    // Navigate to dashboard for metrics/pipeline views
    if (type === "view_metrics") {
      router.push("/founder/dashboard");
      return;
    }
    if (type === "update_pipeline") {
      router.push(`/founder/agents/susi`);
      return;
    }
    // For executable types: inject the action into chat so the agent guides execution
    const chatMessages: Record<string, string> = {
      send_outreach:      "I'm ready to send the outreach emails. Open the email sender so I can upload my contacts and send.",
      send_proposal:      "I want to send a sales proposal to a prospect. Walk me through sending it now.",
      generate_artifact:  `Please generate the deliverable for this now: ${item.action_text}`,
      schedule_call:      "Help me schedule a call with this prospect. What's the best approach?",
      task:               `Let's work on this: ${item.action_text}`,
    };
    const msg = chatMessages[type] ?? `Let's work on this: ${item.action_text}`;
    setShowActions(false); // close panel to show chat
    handleSend(msg);
  }, [router, handleSend, setShowActions]);

  if (!agent) return null;
  if (historyLoading) return (
    <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: bg }}>
      <p style={{ fontSize: 13, color: muted }}>Loading conversation…</p>
    </div>
  );

  const accent   = pillarAccent[agent.pillar] ?? blue;
  const pillar   = pillarLabel[agent.pillar]  ?? agent.pillar;
  const dimLabel = dimensionLabel[agent.improvesScore] ?? agent.improvesScore;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: bg, color: ink }}>

      {/* ── Q-Score boost toast ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {scoreBoost && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            style={{
              position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
              zIndex: 1000,
              background: "#052e16",
              color: "#bbf7d0",
              borderRadius: 12,
              padding: "10px 20px",
              display: "flex", alignItems: "center", gap: 10,
              fontSize: 13, fontWeight: 600,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              pointerEvents: "none",
            }}
          >
            <TrendingUp size={15} style={{ color: "#4ade80" }} />
            Q-Score +{scoreBoost.points} pts · {scoreBoost.dimension} dimension boosted
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── quick generate modal ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {showQuickGen && agent.artifactType && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 200,
              background: "rgba(24,22,15,0.55)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: 24,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowQuickGen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                background: bg, borderRadius: 16, padding: "28px 32px",
                width: "100%", maxWidth: 560,
                boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
                maxHeight: "90vh", overflowY: "auto",
              }}
            >
              {/* header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Zap size={16} style={{ color: amber }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: ink }}>Quick Generate</span>
                </div>
                <button onClick={() => setShowQuickGen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
                  <X size={16} />
                </button>
              </div>
              <p style={{ fontSize: 12, color: muted, marginBottom: 22 }}>
                Answer 5 quick questions to generate your {ARTIFACT_META[agent.artifactType]?.label} without a full conversation.
              </p>

              {/* questions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {(QUICK_QUESTIONS[agent.artifactType] ?? []).map((q, i) => (
                  <div key={i}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: ink, display: "block", marginBottom: 6 }}>
                      {i + 1}. {q}
                    </label>
                    <textarea
                      value={quickAnswers[i] ?? ""}
                      onChange={(e) => setQuickAnswers(prev => { const next = [...prev]; next[i] = e.target.value; return next; })}
                      rows={2}
                      placeholder="Your answer…"
                      style={{
                        width: "100%", padding: "9px 12px", borderRadius: 8,
                        background: surf, border: `1px solid ${bdr}`, fontSize: 12,
                        color: ink, outline: "none", resize: "vertical",
                        fontFamily: "inherit", lineHeight: 1.5,
                        boxSizing: "border-box",
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = accent; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = bdr; }}
                    />
                  </div>
                ))}
              </div>

              {/* footer */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 22 }}>
                <button
                  onClick={() => setShowQuickGen(false)}
                  style={{
                    padding: "9px 18px", borderRadius: 8, fontSize: 13,
                    background: "none", border: `1px solid ${bdr}`, color: muted,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickGenerate}
                  disabled={isQuickGenerating || !quickAnswers.some(a => a.trim())}
                  style={{
                    padding: "9px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                    background: isQuickGenerating ? surf : accent,
                    color: isQuickGenerating ? muted : "#fff",
                    border: "none", cursor: isQuickGenerating ? "wait" : "pointer",
                    fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
                    opacity: isQuickGenerating ? 0.7 : 1,
                  }}
                >
                  <Zap size={13} />
                  {isQuickGenerating ? "Generating…" : "Generate Now"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── score challenge banner ───────────────────────────────────────────── */}
      {challengeDim && CHALLENGE_LABEL[challengeDim] && (
        <div style={{
          flexShrink: 0,
          background: "#FFFBEB",
          borderBottom: `1px solid #F5E6B8`,
          padding: "10px 28px",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <Zap size={14} style={{ color: amber, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "#92400E", flex: 1 }}>
            <strong>Score Challenge:</strong> build a deliverable here to boost your{" "}
            <strong>{CHALLENGE_LABEL[challengeDim]}</strong> dimension. Your score updates automatically when you generate.
          </p>
          <Link
            href="/founder/improve-qscore"
            style={{ fontSize: 11, color: amber, fontWeight: 600, textDecoration: "none", flexShrink: 0 }}
          >
            View all challenges →
          </Link>
        </div>
      )}

      {/* ── page header ─────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderBottom: `1px solid ${bdr}`, padding: "20px 28px 16px", background: bg }}>
        <div style={{ maxWidth: hasPanel ? "none" : 900, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Link
              href="/founder/dashboard"
              replace
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: muted, textDecoration: "none", transition: "color .15s" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = muted)}
            >
              <ArrowLeft style={{ height: 13, width: 13 }} />
              Dashboard
            </Link>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {isFelix && (
                <div style={{ padding: "4px 12px", background: "#F0FDF4", border: `1px solid #86EFAC`, borderRadius: 999, fontSize: 11, color: green, fontWeight: 600 }}>
                  Live Model Active
                </div>
              )}
              {isPatel && (
                <div style={{ padding: "4px 12px", background: "#EFF6FF", border: `1px solid #93C5FD`, borderRadius: 999, fontSize: 11, color: blue, fontWeight: 600 }}>
                  Agentic GTM
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 12px", background: surf, border: `1px solid ${bdr}`, borderRadius: 999, fontSize: 11, color: muted }}>
                <TrendingUp style={{ height: 11, width: 11, color: accent }} />
                Improves {dimLabel}
              </div>
              {apiMessages.length >= 4 && (
                <button
                  onClick={handleExtractActions}
                  disabled={extractingActions}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: showActions ? ink : surf,
                    color: showActions ? bg : ink,
                    border: `1px solid ${showActions ? ink : bdr}`,
                    cursor: extractingActions ? "wait" : "pointer",
                    transition: "background .15s, color .15s",
                    fontFamily: "inherit",
                    opacity: extractingActions ? 0.6 : 1,
                  }}
                >
                  {extractingActions ? "Extracting…" : "Get action items"}
                </button>
              )}
              {!isPatel && agent.artifactType && apiMessages.length < 4 && QUICK_QUESTIONS[agent.artifactType] && (
                <button
                  onClick={() => { setShowQuickGen(true); setQuickAnswers(["", "", "", "", ""]); }}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: surf,
                    color: ink,
                    border: `1px solid ${bdr}`,
                    cursor: "pointer",
                    transition: "background .15s",
                    fontFamily: "inherit",
                  }}
                >
                  <Zap style={{ height: 11, width: 11, color: amber }} />
                  Quick Generate
                </button>
              )}
              {!isPatel && agent.artifactType && apiMessages.length >= 4 && (
                <button
                  onClick={handleGenerate}
                  disabled={generatingArtifact}
                  style={{
                    display: "flex", alignItems: "center", gap: 5,
                    padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
                    background: generatingArtifact ? surf : accent,
                    color: generatingArtifact ? muted : "#fff",
                    border: `1px solid ${generatingArtifact ? bdr : accent}`,
                    cursor: generatingArtifact ? "wait" : "pointer",
                    transition: "background .15s, color .15s",
                    fontFamily: "inherit",
                    opacity: generatingArtifact ? 0.7 : 1,
                  }}
                >
                  <FileText style={{ height: 11, width: 11 }} />
                  {generatingArtifact ? "Generating…" : `Generate ${ARTIFACT_META[agent.artifactType]?.label ?? "Deliverable"}`}
                </button>
              )}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              height: 44, width: 44, borderRadius: 11, flexShrink: 0,
              background: surf, border: `2px solid ${accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 700, color: accent,
            }}>
              {agent.name[0]}
            </div>
            <div>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: accent, fontWeight: 600, marginBottom: 2 }}>
                {pillar}
              </p>
              <p style={{ fontSize: "clamp(1.1rem,2vw,1.4rem)", fontWeight: 300, letterSpacing: "-0.02em", color: ink, lineHeight: 1.1 }}>
                {agent.name}
              </p>
              <p style={{ fontSize: 13, color: muted, marginTop: 1 }}>{agent.specialty}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── body (chat + optional panel) ──────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ── chat column ─────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* suggested prompts */}
            <AnimatePresence>
              {showPrompts && (
                <motion.div
                  key="prompts"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* ── template gallery ─────────────────────────────────── */}
                  {(AGENT_TEMPLATES[agentId] ?? []).length > 0 && (
                    <div style={{ marginBottom: 28 }}>
                      <p style={{
                        fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em",
                        color: muted, fontWeight: 600, marginBottom: 12,
                      }}>
                        Choose a deliverable
                      </p>
                      <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: 10,
                      }}>
                        {(AGENT_TEMPLATES[agentId] ?? []).map((tmpl, i) => {
                          const meta = tmpl.artifactType ? ARTIFACT_META[tmpl.artifactType] : null;
                          const TIcon = meta?.icon ?? FileText;
                          return (
                            <button
                              key={i}
                              onClick={() => handleSend(tmpl.starterPrompt)}
                              style={{
                                background: bg, border: `1px solid ${bdr}`, borderRadius: 10,
                                padding: "12px 14px", textAlign: "left", cursor: "pointer",
                                transition: "border-color .15s, background .15s",
                                fontFamily: "inherit",
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = accent;
                                (e.currentTarget as HTMLElement).style.background = surf;
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLElement).style.borderColor = bdr;
                                (e.currentTarget as HTMLElement).style.background = bg;
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                <TIcon size={13} style={{ color: meta?.color ?? accent, flexShrink: 0 }} />
                                <span style={{ fontSize: 13, fontWeight: 600, color: ink }}>{tmpl.title}</span>
                              </div>
                              <p style={{ fontSize: 11, color: muted, lineHeight: 1.4, marginBottom: 8 }}>
                                {tmpl.description}
                              </p>
                              <div style={{ display: "flex", alignItems: "center", gap: 3, color: accent, fontSize: 11, fontWeight: 600 }}>
                                Start <ChevronRight size={11} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
                    <div style={{
                      height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      background: surf, border: `2px solid ${accent}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 700, color: accent,
                    }}>
                      {agent.name[0]}
                    </div>
                    <div style={{
                      background: surf, border: `1px solid ${bdr}`,
                      borderRadius: 14, borderTopLeftRadius: 4,
                      padding: "12px 16px", fontSize: 14, lineHeight: 1.65, color: ink, maxWidth: "82%",
                    }}>
                      {isFelix
                        ? "I'm Felix, your financial strategist. Enter your numbers in the model panel on the right, share them with me, and I'll give you precise advice specific to your situation."
                        : isPatel
                        ? "I'm Patel, your GTM strategist. Tell me about your product and target customers — once I have enough context, I can generate ICP documents, outreach sequences, competitor battle cards, and full GTM playbooks for you."
                        : `${agent.description} What would you like to work on?`}
                    </div>
                  </div>

                  <div style={{ paddingLeft: 38, display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {agent.suggestedPrompts.slice(0, 5).map((p, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(p)}
                        style={{
                          padding: "7px 14px", borderRadius: 999, fontSize: 12,
                          background: bg, border: `1px solid ${bdr}`, color: muted,
                          cursor: "pointer", transition: "border-color .15s, color .15s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = ink; e.currentTarget.style.color = ink; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = bdr; e.currentTarget.style.color = muted; }}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Susi: deal follow-up reminders ──────────────────────────── */}
            {agentId === 'susi' && susiReminders.length > 0 && (
              <div style={{ background: "#FFFBEB", border: `1px solid #FDE68A`, borderRadius: 12, padding: "12px 14px", marginBottom: 4 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#92400E", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Follow-up Reminders
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {susiReminders.map(r => (
                    <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: ink }}>{r.company}</span>
                        {r.contact_name && <span style={{ fontSize: 11, color: muted }}> · {r.contact_name}</span>}
                        <span style={{ fontSize: 10, marginLeft: 6, padding: "2px 6px", borderRadius: 4, background: r.isOverdue ? "#FEE2E2" : "#FEF3C7", color: r.isOverdue ? "#B91C1C" : "#92400E", fontWeight: 600 }}>{r.label}</span>
                        {r.next_action && <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>{r.next_action}</p>}
                      </div>
                      <button
                        onClick={() => handleSend(`Help me follow up on my deal with ${r.company} (${r.stage} stage). ${r.next_action ? `My planned next action was: ${r.next_action}.` : ''} What should I say?`)}
                        style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: "#F59E0B", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}
                      >
                        Follow Up
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* message thread */}
            {uiMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}
              >
                {msg.role === "agent" && (
                  <div style={{
                    height: 28, width: 28, borderRadius: 8, flexShrink: 0, marginTop: 2,
                    background: surf, border: `2px solid ${accent}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: accent,
                  }}>
                    {agent.name[0]}
                  </div>
                )}
                <div style={{
                  maxWidth: "78%",
                  padding: "11px 16px",
                  fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap",
                  borderRadius: 14,
                  background:          msg.role === "user" ? ink  : surf,
                  color:               msg.role === "user" ? bg   : ink,
                  border:              msg.role === "agent" ? `1px solid ${bdr}` : "none",
                  borderTopLeftRadius: msg.role === "agent" ? 4   : 14,
                  borderTopRightRadius:msg.role === "user"  ? 4   : 14,
                }}>
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {/* typing indicator */}
            {typing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: "flex", gap: 10 }}>
                <div style={{
                  height: 28, width: 28, borderRadius: 8, flexShrink: 0,
                  background: surf, border: `2px solid ${accent}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, color: accent,
                }}>
                  {agent.name[0]}
                </div>
                <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 14, borderTopLeftRadius: 4, padding: "14px 18px", display: "flex", gap: 5, alignItems: "center" }}>
                  {[0, 0.18, 0.36].map((d, i) => (
                    <motion.div key={i}
                      style={{ height: 5, width: 5, background: muted, borderRadius: "50%" }}
                      animate={{ y: [0, -4, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: d }}
                    />
                  ))}
                  {generatingArtifact && (
                    <span style={{ marginLeft: 8, fontSize: 11, color: muted }}>Generating deliverable…</span>
                  )}
                </div>
              </motion.div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Felix financial panel ───────────────────────────────────────── */}
        {isFelix && <FinancialPanel onShare={(ctx) => handleSend(ctx)} />}

        {/* ── deliverable panel (all agents) ──────────────────────────────── */}
        {activeArtifact && (
          <DeliverablePanel
            artifact={activeArtifact}
            artifactHistory={artifactHistory}
            onSelectArtifact={setActiveArtifact}
            onClose={() => setActiveArtifact(null)}
            onRefine={(feedback) => handleSend(`Please refine the ${activeArtifact.type.replace(/_/g, " ")}: ${feedback}`)}
            agentName={agent.name}
            userId={userId ?? undefined}
          />
        )}
      </div>

      {/* ── input bar ──────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "14px 28px", background: bg }}>
        <div style={{
          maxWidth: hasPanel ? "none" : 680, margin: "0 auto",
          display: "flex", alignItems: "flex-end", gap: 10,
          paddingRight: hasPanel ? (isFelix ? 356 : 436) : 0,
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Ask ${agent.name} anything about ${agent.specialty.toLowerCase()}…`}
            disabled={typing}
            rows={1}
            style={{
              flex: 1,
              background: surf, border: `1px solid ${bdr}`, borderRadius: 8,
              padding: "11px 14px", fontSize: 14, color: ink,
              resize: "none", outline: "none", fontFamily: "inherit",
              lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
              opacity: typing ? 0.5 : 1, cursor: typing ? "not-allowed" : "text",
            }}
            onFocus={(e)  => { e.currentTarget.style.borderColor = ink; }}
            onBlur={(e)   => { e.currentTarget.style.borderColor = bdr; }}
            onInput={(e)  => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || typing}
            style={{
              height: 42, width: 42, flexShrink: 0,
              background: !input.trim() || typing ? surf : ink,
              border: `1px solid ${!input.trim() || typing ? bdr : ink}`,
              borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: !input.trim() || typing ? "not-allowed" : "pointer",
              transition: "background .15s, border-color .15s",
            }}
          >
            <Send style={{ height: 15, width: 15, color: !input.trim() || typing ? muted : bg }} />
          </button>
        </div>
        <p style={{
          textAlign: "center", fontSize: 11, color: muted,
          marginTop: 8, opacity: 0.5,
          paddingRight: hasPanel ? (isFelix ? 356 : 436) : 0,
        }}>
          Enter to send · Shift+Enter for new line · Sessions auto-save
        </p>
      </div>

      {/* ── action items panel ───────────────────────────────────────────────── */}
      {showActions && (
        <div style={{
          flexShrink: 0, borderTop: `1px solid ${bdr}`, padding: "16px 28px",
          background: surf,
          paddingRight: hasPanel ? (isFelix ? `${356 + 28}px` : `${436 + 28}px`) : 28,
        }}>
          <div style={{ maxWidth: hasPanel ? "none" : 680, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: ink, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                Action Items
              </p>
              <button
                onClick={() => setShowActions(false)}
                style={{ fontSize: 11, color: muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
              >
                Dismiss
              </button>
            </div>
            {extractingActions && actionItems.length === 0 ? (
              <p style={{ fontSize: 13, color: muted }}>Extracting action items…</p>
            ) : actionItems.length === 0 ? (
              <p style={{ fontSize: 13, color: muted }}>No action items found. Continue the conversation and try again.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {actionItems.map((item) => {
                  const priorityColor = item.priority === "high" ? "#DC2626" : item.priority === "medium" ? "#D97706" : muted;
                  const isDone = item.status === "done";
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleActionStatus(item.id, item.status)}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "9px 12px", borderRadius: 8,
                        background: bg, border: `1px solid ${bdr}`,
                        cursor: "pointer", transition: "border-color .15s",
                        opacity: isDone ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = ink; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                    >
                      {/* status circle */}
                      <div style={{
                        height: 16, width: 16, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${isDone ? muted : item.status === "in_progress" ? accent : bdr}`,
                        background: isDone ? muted : item.status === "in_progress" ? accent : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isDone && <span style={{ fontSize: 9, color: bg, fontWeight: 700 }}>✓</span>}
                        {item.status === "in_progress" && <span style={{ fontSize: 8, color: bg, fontWeight: 700 }}>→</span>}
                      </div>
                      <span style={{ flex: 1, fontSize: 13, color: isDone ? muted : ink, textDecoration: isDone ? "line-through" : "none" }}>
                        {item.action_text}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 600, color: priorityColor, textTransform: "uppercase", letterSpacing: "0.08em", marginRight: 4 }}>
                        {item.priority}
                      </span>
                      {/* CTA button — actually executes the action */}
                      {!isDone && item.cta_label && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleActionCTA(item); }}
                          style={{
                            flexShrink: 0,
                            padding: "3px 10px",
                            borderRadius: 6,
                            border: `1px solid ${accent}`,
                            background: accent,
                            color: "#fff",
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            letterSpacing: "0.02em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.cta_label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
