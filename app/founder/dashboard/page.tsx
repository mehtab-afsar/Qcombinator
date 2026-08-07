"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Lock,
  TrendingUp,
  TrendingDown,
  Minus,
  Bot,
  GraduationCap,
  ChevronRight,
  RefreshCw,
  Users,
  BarChart3,
  Zap,
  Briefcase,
  DollarSign,
  Target,
  Loader2,
  Share2,
  Link2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { useQScore } from "@/features/qscore/hooks/useQScore";
import { QScoreDial } from "@/features/qscore/components/QScoreDial";
import { useMetrics } from "@/features/founder/hooks/useFounderData";
import { useDashboardData } from "@/features/founder/hooks/useDashboardData";
import { WelcomeModal, FOUNDER_WELCOME_SLIDES } from "@/components/ui/WelcomeModal";
import { ShareQScoreModal } from "@/components/ui/ShareQScoreModal";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { getUpcomingWorkshops } from "@/features/academy/data/workshops";
import { bg, surf, bdr, ink, muted, blue, green, amber, red, purple, cyan, alpha } from '@/lib/constants/colors'
import { DIM_COLORS, DIM_LABELS } from '@/features/qscore/constants/dimensions'
import { resolveDimensions, type DimensionTuple, type IqParam } from '@/features/qscore/utils/resolveDimensions'
import { PageSpinner } from '@/features/shared/components/Spinner'
import { PageContainer } from '@/features/shared/components/PageContainer'
import { SectionCard } from '@/features/shared/components/SectionCard'
import { Badge } from '@/features/shared/components/Badge'
import { ExecutiveEntryCard } from '@/features/executive/components/ExecutiveEntryCard'
import { QScoreTabs } from '@/features/founder/components/QScoreTabs'

// ─── demo data ────────────────────────────────────────────────────────────────
const DEMO_QSCORE = {
  overall: 62,
  percentile: 41,
  breakdown: {
    market:     { score: 54, change: 2,  trend: "up"      as const },
    product:    { score: 71, change: 5,  trend: "up"      as const },
    goToMarket: { score: 38, change: -1, trend: "down"    as const },
    financial:  { score: 45, change: 0,  trend: "neutral" as const },
    team:       { score: 78, change: 3,  trend: "up"      as const },
    traction:   { score: 49, change: 1,  trend: "up"      as const },
  },
};

const DIMENSION_META: Record<string, { label: string; weight: number }> = {
  // Q-Score v2 parameters (P1–P6)
  p1:         { label: "Market Readiness",   weight: 20 },
  p2:         { label: "Market Potential",   weight: 20 },
  p3:         { label: "IP / Defensibility", weight: 17 },
  p4:         { label: "Founder / Team",     weight: 18 },
  p5:         { label: "Structural Impact",  weight: 8  },
  p6:         { label: "Financials",         weight: 17 },
};

// ─── dimension inline panel data ──────────────────────────────────────────────
const DIM_ISSUES: Record<string, string[]> = {
  market:     ["TAM needs clearer validation", "LTV:CAC ratio below 3:1"],
  product:    ["Customer conversation count below 30", "Failed assumption documentation missing"],
  goToMarket: ["ICP definition needs specificity", "Channel testing breadth low"],
  financial:  ["Runway below 12 months", "Gross margin not documented"],
  team:       ["Team completeness: consider co-founder", "Domain expertise narrative weak"],
  traction:   ["Revenue or LOI commitments not documented", "Customer commitment level low"],
};

const DIM_BOOSTS: Record<string, { agent: string; artifact: string; pts: number }[]> = {
  market:     [{ agent: "atlas",  artifact: "competitive_matrix", pts: 5 }, { agent: "patel",  artifact: "battle_card",    pts: 4 }],
  product:    [{ agent: "nova",   artifact: "pmf_survey",         pts: 5 }, { agent: "nova",   artifact: "interview_notes", pts: 3 }],
  goToMarket: [{ agent: "patel",  artifact: "gtm_playbook",       pts: 6 }, { agent: "patel",  artifact: "icp_document",   pts: 5 }],
  financial:  [{ agent: "felix",  artifact: "financial_summary",  pts: 6 }, { agent: "leo",    artifact: "legal_checklist", pts: 3 }],
  team:       [{ agent: "harper", artifact: "hiring_plan",        pts: 5 }, { agent: "sage",   artifact: "strategic_plan", pts: 4 }],
  traction:   [{ agent: "susi",   artifact: "outreach_sequence",  pts: 4 }, { agent: "susi",   artifact: "sales_script",   pts: 4 }],
};

// Maps each Q-Score v2 parameter (and legacy dimension) to the best agent to challenge it
const DIMENSION_AGENT: Record<string, { agentId: string; agentName: string; label: string }> = {
  // IQ v2 P1–P6
  p1:         { agentId: "patel",  agentName: "Patel",  label: "GTM Playbook"         },
  p2:         { agentId: "atlas",  agentName: "Atlas",  label: "Competitive Analysis" },
  p3:         { agentId: "leo",    agentName: "Leo",    label: "Legal Checklist"      },
  p4:         { agentId: "harper", agentName: "Harper", label: "Hiring Plan"          },
  p5:         { agentId: "sage",   agentName: "Sage",   label: "Strategic Plan"       },
  p6:         { agentId: "felix",  agentName: "Felix",  label: "Financial Summary"    },
};

// Behavior-centric framing for each Q-Score dimension.
// The challenge is the behavior, the agent is the helper — not the deliverable generator.
const DIMENSION_BEHAVIOR: Record<string, { action: string; evidence: string }> = {
  p1: { action: "Validate your ICP with real customers",   evidence: "5+ discovery calls logged" },
  p2: { action: "Map the market opportunity with data",    evidence: "TAM/SAM/SOM documented"    },
  p3: { action: "Define your defensible moat",             evidence: "Moat narrative written"     },
  p4: { action: "Close a critical team gap",               evidence: "Hire or advisor added"      },
  p5: { action: "Articulate your 'why now' clearly",       evidence: "Market timing argument ready"},
  p6: { action: "Get your unit economics to target",       evidence: "LTV:CAC > 3:1 verified"    },
};

// Pick the next upcoming workshop by date (relative to today)
const today = new Date().toISOString().slice(0, 10);
const NEXT_WORKSHOP = getUpcomingWorkshops()
  .filter(w => w.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date))[0]
  ?? getUpcomingWorkshops().sort((a, b) => a.date.localeCompare(b.date))[0];

// ─── helpers ──────────────────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 70) return blue;
  if (s >= 50) return amber;
  return red;
}
function gradeLabel(s: number) {
  if (s >= 80) return "Strong";
  if (s >= 65) return "Good";
  if (s >= 50) return "Developing";
  return "Early Stage";
}

// ─── score history types ──────────────────────────────────────────────────────
interface ScorePoint {
  overall: number;
  p1: number;
  p2: number;
  p3: number;
  p4: number;
  p5: number;
  p6: number;
  date: string;
  source: string;
}

// ─── score chart ──────────────────────────────────────────────────────────────
// DIM_COLORS/DIM_LABELS live in features/qscore/constants/dimensions.ts — shared with
// the Command View's score anchor, not redeclared here.

function ScoreChart({ points }: { points: ScorePoint[] }) {
  const [showDims, setShowDims] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);

  // Single data point — show a "first assessment" card instead of an empty line
  if (points.length < 2) {
    const p = points[0];
    const scoreDate = p ? new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;
    const col = p ? scoreColor(p.overall) : muted;
    return (
      <div style={{ paddingTop: 4 }}>
        {p ? (
          <SectionCard
            noPadding
            style={{ background: surf, boxShadow: "none", marginBottom: 14 }}
            bodyStyle={{ display: "flex", alignItems: "center", gap: 20, padding: "16px 20px" }}
          >
            <div style={{ textAlign: "center", flexShrink: 0 }}>
              <div style={{ fontSize: 36, fontWeight: 300, color: col, letterSpacing: "-0.04em", lineHeight: 1 }}>{p.overall}</div>
              <div style={{ fontSize: 9, fontWeight: 600, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>First score</div>
            </div>
            <div style={{ width: 1, height: 40, background: bdr, flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 3 }}>
                Assessment recorded · {scoreDate}
              </p>
              <p style={{ fontSize: 12, color: muted, lineHeight: 1.5 }}>
                Retake the assessment after completing more sections or building agent deliverables to track your progress here.
              </p>
            </div>
          </SectionCard>
        ) : (
          <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, paddingTop: 4 }}>
            Complete your assessment to start tracking your score over time.
          </p>
        )}
        <Link href="/founder/profile-builder" style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "7px 16px", background: ink, color: bg,
          fontSize: 12, fontWeight: 500, borderRadius: 999, textDecoration: "none",
        }}>
          {p ? "Improve score" : "Start assessment"} <ArrowRight style={{ height: 11, width: 11 }} />
        </Link>
      </div>
    );
  }

  // SVG layout — taller canvas for more breathing room
  const W = 560, H = 200;
  const ml = 32, mr = 76, mt = 16, mb = 36;
  const pw = W - ml - mr;
  const ph = H - mt - mb;

  const xPos = (i: number) => ml + (i / (points.length - 1)) * pw;
  const yPos = (v: number) => mt + (1 - v / 100) * ph;

  const pathD = (acc: (p: ScorePoint) => number) =>
    points.map((p, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(acc(p)).toFixed(1)}`).join(" ");

  const lastScore = points[points.length - 1].overall;
  const firstScore = points[0].overall;
  const diff = lastScore - firstScore;
  const diffColor = diff > 0 ? green : diff < 0 ? red : muted;
  const agentBoosts = points.filter(p => p.source === "agent_completion").length;

  // Area fill path (close below the line)
  const areaD = pathD(p => p.overall) +
    ` L${xPos(points.length - 1).toFixed(1)},${yPos(0).toFixed(1)} L${xPos(0).toFixed(1)},${yPos(0).toFixed(1)} Z`;

  // Date labels: show unique dates only; add time suffix if two points share the same date
  const formatDate = (iso: string, idx: number) => {
    const d = new Date(iso);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    // if another point shares this date string, add time
    const sameDate = points.some((q, j) => j !== idx &&
      new Date(q.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) === dateStr);
    if (sameDate) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return dateStr;
  };

  // Pick label positions: first, and last (never show duplicates)
  const labelIdxs: number[] = [0];
  if (points.length > 2) labelIdxs.push(Math.floor((points.length - 1) / 2));
  labelIdxs.push(points.length - 1);
  const dedupedLabelIdxs = [...new Set(labelIdxs)];

  return (
    <div>
      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
        {[["Overall", false], ["Dimensions", true]].map(([label, val]) => (
          <button
            key={label as string}
            onClick={() => setShowDims(val as boolean)}
            style={{
              padding: "3px 12px", borderRadius: 999, fontSize: 11, fontWeight: 600,
              background: showDims === val ? ink : surf,
              color: showDims === val ? bg : muted,
              border: `1px solid ${showDims === val ? ink : bdr}`,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {label as string}
          </button>
        ))}
        {agentBoosts > 0 && (
          <span style={{ fontSize: 10, color: blue, marginLeft: 6, fontWeight: 600 }}>
            ⚡ {agentBoosts} agent boost{agentBoosts > 1 ? "s" : ""}
          </span>
        )}
        <span style={{ fontSize: 10, color: muted, marginLeft: "auto" }}>
          {points.length} assessment{points.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* SVG */}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible", display: "block" }}>
        <defs>
          <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={scoreColor(lastScore)} stopOpacity="0.12" />
            <stop offset="100%" stopColor={scoreColor(lastScore)} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Milestone gridlines */}
        {([
          { v: 80, color: alpha(purple, 0.12), label: "Target", labelColor: purple },
          { v: 65, color: alpha(amber,  0.12), label: "Marketplace", labelColor: amber },
          { v: 40, color: bdr,       label: "",            labelColor: "" },
        ] as Array<{ v: number; color: string; label: string; labelColor: string }>).map(({ v, color, label, labelColor }) => (
          <g key={v}>
            <line
              x1={ml} y1={yPos(v)} x2={W - mr} y2={yPos(v)}
              stroke={color}
              strokeWidth={v === 40 ? 0.5 : 1.5}
              strokeDasharray={v !== 40 ? "4 3" : undefined}
            />
            <text x={ml - 6} y={yPos(v) + 3.5} fill={muted} fontSize={8} textAnchor="end">{v}</text>
            {label && <text x={W - mr + 8} y={yPos(v) + 3.5} fill={labelColor} fontSize={8.5} fontWeight="600">{label}</text>}
          </g>
        ))}

        {/* Area fill */}
        {!showDims && (
          <path d={areaD} fill="url(#scoreGrad)" />
        )}

        {/* Dimension lines */}
        {showDims && Object.entries(DIM_COLORS).map(([key, col]) => (
          <path
            key={key}
            d={pathD(p => (p as unknown as Record<string, number>)[key])}
            fill="none" stroke={col} strokeWidth={1.5} strokeOpacity={0.55}
            strokeLinecap="round" strokeLinejoin="round"
          />
        ))}

        {/* Overall trajectory line */}
        {!showDims && (
          <path
            d={pathD(p => p.overall)}
            fill="none" stroke={scoreColor(lastScore)} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((p, i) => {
          const x = xPos(i);
          const y = yPos(p.overall);
          const isAgent = p.source === "agent_completion";
          const isHov = hovered === i;
          const col = scoreColor(p.overall);
          return (
            <g
              key={i}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: "default" }}
            >
              {/* Agent boost indicator */}
              {isAgent && (
                <text x={x} y={yPos(0) + mb - 4} fill={blue} fontSize={10} textAnchor="middle">⚡</text>
              )}
              {/* Outer ring on hover */}
              {isHov && <circle cx={x} cy={y} r={9} fill={col} fillOpacity="0.15" />}
              {/* Dot */}
              <circle cx={x} cy={y} r={isHov ? 5.5 : 4} fill={bg} stroke={col} strokeWidth={2.5} />
              {/* Score tooltip */}
              {isHov && (
                <g>
                  <rect x={x - 18} y={y - 32} width={36} height={18} rx={4} fill={ink} />
                  <text x={x} y={y - 19} fill={bg} fontSize={10.5} textAnchor="middle" fontWeight="700">
                    {p.overall}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* X-axis date labels */}
        {dedupedLabelIdxs.map(i => (
          <text key={i} x={xPos(i)} y={H - 3} fill={muted} fontSize={8.5} textAnchor="middle">
            {formatDate(points[i].date, i)}
          </text>
        ))}
      </svg>

      {/* Dimension legend */}
      {showDims && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
          {Object.entries(DIM_LABELS).map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 2.5, background: DIM_COLORS[key], borderRadius: 2 }} />
              <span style={{ fontSize: 10, color: muted }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Summary row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 12, borderTop: `1px solid ${bdr}` }}>
        <span style={{ fontSize: 26, fontWeight: 300, color: ink, letterSpacing: "-0.03em" }}>{lastScore}</span>
        <div>
          <span style={{ fontSize: 11, fontWeight: 600, color: diffColor }}>
            {diff > 0 ? "+" : ""}{diff} pts
          </span>
          <span style={{ fontSize: 11, color: muted }}> since first assessment</span>
        </div>
        {diff > 0 && (
          <Badge variant="green" style={{ marginLeft: "auto", background: alpha(green, 0.06), border: "none" }}>
            Improving
          </Badge>
        )}
      </div>
    </div>
  );
}

// ─── helpers ──────────────────────────────────────────────────────────────────
function getGreeting(name?: string) {
  const h = new Date().getHours();
  const salutation = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name?.split(" ")[0];
  return first ? `${salutation}, ${first}.` : `${salutation}.`;
}

// ─── component ────────────────────────────────────────────────────────────────
export default function FounderDashboard() {
  const { loading: authLoading, user } = useAuth();
  const { qScore: realQScore, loading: qScoreLoading } = useQScore();
  const { metrics: dashMetrics } = useMetrics();
  const { data: dashData, loading: dashLoading } = useDashboardData();
  const [profileBuilderCompleted, setProfileBuilderCompleted] = useState<boolean | null>(null);
  const [_gsDismissed, _setGsDismissed] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('qc_gs_dismissed') === '1'
  });
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [publicSlug,  setPublicSlug]  = useState<string | null>(null);
  const [linkCopied,  setLinkCopied]  = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // ── Agent goal watch state ───────────────────────────────────────────────
  // ── Stage gate state ──────────────────────────────────────────────────────
  const [, setGateProgress]       = useState<Record<string, unknown>>({});
  const [, setCustomerCallsCount] = useState<number>(0);

  // ── Stripe verification state (read-only — connect via Settings → Integrations) ──
  const [stripeStatus, setStripeStatus] = useState<{
    verified: boolean; mrr?: number; signalStrength?: number; integrityIndex?: number;
  } | null>(null);

  // ── Usage & subscription state ────────────────────────────────────────────
  const [upgradeModal, setUpgradeModal] = useState<{ open: boolean; feature?: string }>({ open: false });
  const [usage, setUsage] = useState<{ agentChat: number; qscoreRecalc: number; investorConnection: number } | null>(null);
  const [subscriptionTier, setSubscriptionTier] = useState<'free' | 'premium'>('free');

  // Mock usage data — TODO: replace with real API call
  useEffect(() => {
    if (!user) return;
    const fetchBillingStatus = async () => {
      try {
        const res = await fetch('/api/founder/billing/status');
        if (!res.ok) throw new Error('Failed to fetch billing status');
        const { usage, tier } = await res.json();
        setUsage(usage);
        setSubscriptionTier(tier);
      } catch (e) {
        console.error('Billing status fetch failed:', e);
        setSubscriptionTier('free');
      }
    };
    fetchBillingStatus();
  }, [user]);

  // Check profile_builder_completed + load stage and basic profile fields
  const [founderStage,       setFounderStage]       = useState<string>('idea')
  const [founderCompanyName, setFounderCompanyName] = useState<string>('Startup')
  const [founderOneLiner,    setFounderOneLiner]    = useState<string>('')
  const [founderIndustry,    setFounderIndustry]    = useState<string>('')
  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    void supabase
      .from("founder_profiles")
      .select("profile_builder_completed, stage, startup_name, tagline, industry")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setProfileBuilderCompleted(data?.profile_builder_completed ?? false)
        if (data?.stage)        setFounderStage(data.stage)
        if (data?.startup_name) setFounderCompanyName(data.startup_name)
        if (data?.tagline)      setFounderOneLiner(data.tagline)
        if (data?.industry)     setFounderIndustry(data.industry)
      })
  }, [user])

  // Load stage gate data
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    void supabase
      .from("founder_profiles")
      .select("gate_progress, customer_calls_count")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setGateProgress(data.gate_progress ?? {});
        setCustomerCallsCount(data.customer_calls_count ?? 0);
      });
  }, [user]);

  // Fetch public_slug for share button
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    void supabase
      .from("founder_profiles")
      .select("public_slug")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => setPublicSlug(data?.public_slug ?? null));
  }, [user]);

  // Load existing stripe status on mount
  useEffect(() => {
    fetch("/api/stripe/connect")
      .then(r => r.json())
      .then(d => {
        if (d.profile) {
          setStripeStatus({
            verified:       d.profile.stripe_verified ?? false,
            mrr:            d.profile.stripe_mrr ?? undefined,
            signalStrength: d.profile.signal_strength ?? undefined,
            integrityIndex: d.profile.integrity_index ?? undefined,
          });
        }
      })
      .catch(() => {});
  }, []);


  const scoreHistory   = dashData?.scoreHistory   ?? [];
  const weeklyActivity = dashData?.weeklyActivity  ?? null;
  const _investorMatches = dashData?.investorMatches ?? null;
  const portfolioViews = dashData?.portfolioViews  ?? null;
  const priorities     = dashData?.priorities      ?? [];
  const conflictDims   = dashData?.conflictDims    ?? new Set<string>();


  if (authLoading || qScoreLoading) return <PageSpinner label="Loading your dashboard…" />;

  const qs = realQScore
    ? { overall: realQScore.overall, percentile: realQScore.percentile ?? null }
    : DEMO_QSCORE;

  const isDemo = !realQScore;

  // Partial score: when real score exists but not all 6 parameters answered
  const answeredParameters = (realQScore?.answeredParameters as number | undefined) ?? 0
  const isPartial = !isDemo && answeredParameters > 0 && answeredParameters < 6
  const displayScore = isPartial
    ? ((realQScore?.partialIQ as number | undefined) ?? qs.overall)
    : qs.overall

  // Always v2_iq — use P1–P6 IQ parameters for display
  const iqBreakdownObj = realQScore?.iqBreakdown as { parameters?: IqParam[] } | undefined

  // When no real IQ params (demo or legacy score), populate bars from DEMO breakdown
  const demoDims: DimensionTuple[] = [
    ['p1', { score: DEMO_QSCORE.breakdown.market.score,     change: DEMO_QSCORE.breakdown.market.change,     trend: DEMO_QSCORE.breakdown.market.trend     }],
    ['p2', { score: DEMO_QSCORE.breakdown.goToMarket.score, change: DEMO_QSCORE.breakdown.goToMarket.change, trend: DEMO_QSCORE.breakdown.goToMarket.trend }],
    ['p3', { score: DEMO_QSCORE.breakdown.product.score,    change: DEMO_QSCORE.breakdown.product.change,    trend: DEMO_QSCORE.breakdown.product.trend    }],
    ['p4', { score: DEMO_QSCORE.breakdown.team.score,       change: DEMO_QSCORE.breakdown.team.change,       trend: DEMO_QSCORE.breakdown.team.trend       }],
    ['p5', { score: DEMO_QSCORE.breakdown.traction.score,   change: DEMO_QSCORE.breakdown.traction.change,   trend: DEMO_QSCORE.breakdown.traction.trend   }],
    ['p6', { score: DEMO_QSCORE.breakdown.financial.score,  change: DEMO_QSCORE.breakdown.financial.change,  trend: DEMO_QSCORE.breakdown.financial.trend  }],
  ]

  // Priority: IQ v2 params → legacy breakdown → demo (only when no real score at all).
  // features/qscore/utils/resolveDimensions.ts — shared so a second Q-Score view (a dashboard
  // tab, a per-executive "Read" beat) never has to reimplement this priority chain.
  const effectiveSortedDims = resolveDimensions({
    iqParams: iqBreakdownObj?.parameters,
    legacyBreakdown: realQScore?.breakdown,
    demoDims,
  })

  // Score freshness
  const lastScoreDate = scoreHistory.length > 0 ? new Date(scoreHistory[scoreHistory.length - 1].date) : null;
  const daysSinceScore = lastScoreDate ? Math.floor((Date.now() - lastScoreDate.getTime()) / 86400000) : null;
  const isStale    = !isDemo && daysSinceScore !== null && daysSinceScore >= 90;
  const isMaturing = !isDemo && daysSinceScore !== null && daysSinceScore >= 60 && daysSinceScore < 90;

  // Runway warning
  const runwayMonths = dashMetrics?.runway ?? null;
  const runwayLow    = runwayMonths !== null && runwayMonths < 6;
  const runwayCritical = runwayMonths !== null && runwayMonths <= 2;
  const topActions = effectiveSortedDims.slice(0, 3);

  const quickStats = [
    {
      label: "Agent sessions",
      value: weeklyActivity !== null ? String(weeklyActivity) : "—",
      sub: weeklyActivity !== null ? (weeklyActivity > 0 ? "actions logged this week" : "start a session") : "loading…",
      icon: Bot, positive: true,
    },
    { label: "Score percentile",   value: !isDemo && qs.percentile !== null ? `${qs.percentile}th` : "—", sub: !isDemo && qs.percentile !== null ? "of all founders" : "complete assessment to rank", icon: BarChart3, positive: null  },
    { label: "Next milestone",     value: isDemo ? "—" : String(Math.max(80, Math.ceil(qs.overall / 10) * 10)), sub: isDemo ? "submit score first" : "target Q-Score", icon: Zap, positive: null },
  ];

  return (
    <div style={{ minHeight: "100vh", background: bg, color: ink, padding: "36px 28px 72px" }}>
      <PageContainer>

        <QScoreTabs />

        {/* ── THE DOOR into the Executive model. Self-gating on the flag (the APIs 404 when it
             is off, so this renders nothing), but NOT on progress: it is visible from the very
             first visit, because the new model was otherwise unreachable — see the component. ── */}
        <ExecutiveEntryCard />

        {/* ── page header ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ marginBottom: 32 }}
        >
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: muted, fontWeight: 600, marginBottom: 5 }}>
            Founder Dashboard
          </p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <h1 style={{ fontSize: "clamp(1.5rem,3.5vw,2.1rem)", fontWeight: 300, letterSpacing: "-0.03em", color: ink }}>
              {getGreeting((user?.user_metadata?.full_name as string | undefined) ?? user?.email?.split("@")[0])}
            </h1>
            {isDemo && (
              <Badge variant="neutral" dot dotColor={amber} style={{ padding: "5px 14px", fontSize: 11, fontWeight: 400 }}>
                Demo data — complete assessment for a real score
              </Badge>
            )}
            {isPartial && (
              <Badge variant="cyan" dot style={{ padding: "5px 14px", fontSize: 11, fontWeight: 400, background: surf, border: `1px solid ${cyan}` }}>
                Partial score — based on {answeredParameters}/6 parameters
              </Badge>
            )}
          </div>
        </motion.div>

        {/* ── Usage warning banner (free tier only) ── */}
        {subscriptionTier === 'free' && usage && (
          <div style={{
            background: `${amber}12`, border: `1px solid ${amber}30`,
            borderRadius: 12, padding: '14px 16px', marginBottom: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
              <Zap size={16} color={amber} />
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: ink, margin: 0 }}>
                  Q-Score recalculations: {usage.qscoreRecalc} / 2 this month
                </p>
                <p style={{ fontSize: 11, color: muted, margin: '2px 0 0' }}>
                  Upgrade to Premium for unlimited recalculations
                </p>
              </div>
            </div>
            <button
              onClick={() => setUpgradeModal({ open: true, feature: 'qscore_recalc' })}
              style={{
                padding: '7px 14px', borderRadius: 8, border: 'none', background: amber, color: '#fff',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}
            >
              Upgrade →
            </button>
          </div>
        )}

        {/* ── empty state (real score is 0, profile builder unknown/done) ─ */}
        {!isDemo && qs.overall === 0 && profileBuilderCompleted !== false && (
          <div style={{
            textAlign: "center", padding: "56px 32px",
            background: surf, border: `1px dashed ${bdr}`,
            borderRadius: 20, marginBottom: 32,
          }}>
            <p style={{ fontSize: 20, fontWeight: 300, color: ink, letterSpacing: "-0.02em", marginBottom: 10 }}>
              Your Q-Score is calculating
            </p>
            <p style={{ fontSize: 13, color: muted, lineHeight: 1.7, maxWidth: 420, margin: "0 auto 24px" }}>
              Complete your Profile Builder so we can generate your personalised investment-readiness score across all 6 dimensions.
            </p>
            <Link
              href="/founder/profile-builder"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "10px 24px", background: ink, color: bg,
                borderRadius: 999, fontSize: 13, fontWeight: 600, textDecoration: "none",
              }}
            >
              Start Profile Builder <ArrowRight style={{ height: 13, width: 13 }} />
            </Link>
          </div>
        )}

        {/* ── runway warning banner ─────────────────────────────────── */}
        {runwayLow && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", borderRadius: 12, marginBottom: 16,
              background: runwayCritical ? alpha(red, 0.06) : alpha(amber, 0.08),
              border: `1px solid ${runwayCritical ? alpha(red, 0.3) : alpha(amber, 0.3)}`,
            }}
          >
            <div style={{
              height: 36, width: 36, borderRadius: 9, flexShrink: 0,
              background: runwayCritical ? alpha(red, 0.12) : alpha(amber, 0.15),
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18,
            }}>
              {runwayCritical ? "🚨" : "⚠️"}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: runwayCritical ? red : amber, marginBottom: 2 }}>
                {runwayCritical
                  ? `Critical: only ${runwayMonths} months of runway left`
                  : `Runway alert: ${runwayMonths} months left — Felix identified cuts to extend it`}
              </p>
              <p style={{ fontSize: 12, color: runwayCritical ? red : amber }}>
                {runwayCritical
                  ? "Immediate action required. Your executive team can analyse burn and prepare an investor update."
                  : "Under 6 months runway. Your executive team can find cost-cutting options and prepare an investor update."}
              </p>
            </div>
            <Link
              href="/founder/executive"
              style={{
                flexShrink: 0, padding: "7px 16px",
                background: runwayCritical ? red : amber,
                color: bg, borderRadius: 999,
                fontSize: 12, fontWeight: 600, textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Open Felix
            </Link>
          </motion.div>
        )}

        {/* ── score staleness banner ────────────────────────────────── */}
        {(isStale || isMaturing) && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 20px", borderRadius: 12, marginBottom: 24,
              background: alpha(amber, 0.08),
              border: `1px solid ${alpha(amber, 0.3)}`,
            }}
          >
            <div style={{
              height: 36, width: 36, borderRadius: 9, flexShrink: 0,
              background: alpha(amber, 0.15),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <RefreshCw style={{ height: 16, width: 16, color: amber }} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: amber, marginBottom: 2 }}>
                {isStale
                  ? `Your Q-Score is ${daysSinceScore} days old — it may not reflect your current progress`
                  : `Your score was calculated ${daysSinceScore} days ago — consider a re-assessment soon`}
              </p>
              <p style={{ fontSize: 12, color: amber }}>
                {isStale
                  ? "Retake the interview to get an accurate score and unlock fresh insights."
                  : "Scores older than 90 days are considered stale. Your startup has likely evolved."}
              </p>
            </div>
            <Link
              href="/founder/improve-qscore"
              style={{
                flexShrink: 0, padding: "7px 16px",
                background: amber,
                color: bg, borderRadius: 999,
                fontSize: 12, fontWeight: 600, textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              Retake now
            </Link>
          </motion.div>
        )}

        {stripeStatus?.verified && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderRadius: 12, marginBottom: 16, background: alpha(blue, 0.06), border: `1px solid ${alpha(blue, 0.25)}` }}
          >
            <div style={{ height: 32, width: 32, borderRadius: 8, flexShrink: 0, background: alpha(blue, 0.15), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>✓</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: blue, marginBottom: 2 }}>
                Revenue verified via Stripe{stripeStatus.mrr !== undefined && ` · $${stripeStatus.mrr.toLocaleString()} MRR`}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {stripeStatus.signalStrength !== undefined && <span style={{ fontSize: 11, color: blue }}>Signal Strength: <strong>{stripeStatus.signalStrength}</strong>/100</span>}
                {stripeStatus.integrityIndex !== undefined && <span style={{ fontSize: 11, color: blue }}>Integrity Index: <strong>{stripeStatus.integrityIndex}</strong>/100</span>}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── hero: Q-Score + dimensions ────────────────────────────── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 24,
          marginBottom: 24,
          alignItems: "stretch",
        }}
          className="dashboard-hero"
        >
          {/* Q-Score card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            style={{
              background: ink, borderRadius: 20, padding: "32px 24px",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
            }}
          >
            {isDemo ? (
              /* ── No score yet — guide user to profile builder ── */
              <>
                <div style={{ position: "relative", height: 128, width: 128 }}>
                  <svg style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeDasharray="6 4" />
                  </svg>
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 38, fontWeight: 300, color: "rgba(249,247,242,0.3)", lineHeight: 1 }}>—</span>
                    <span style={{ fontSize: 10, color: "rgba(249,247,242,0.3)", marginTop: 3, textTransform: "uppercase", letterSpacing: "0.12em" }}>No score yet</span>
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 500, color: "#F9F7F2", marginBottom: 6 }}>Get your Q-Score</p>
                  <p style={{ fontSize: 12, color: "rgba(249,247,242,0.5)", lineHeight: 1.55, maxWidth: 200, margin: "0 auto" }}>
                    Complete the Profile Builder to receive your personalised investment-readiness score across 6 dimensions.
                  </p>
                </div>
                <Link href="/founder/profile-builder"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "10px 22px",
                    background: "#F9F7F2", borderRadius: 999,
                    fontSize: 12, color: ink, fontWeight: 600, textDecoration: "none",
                    transition: "opacity 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.85")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  Start Profile Builder <ArrowRight style={{ height: 12, width: 12 }} />
                </Link>
              </>
            ) : (
              /* ── Real score ── */
              <>
                <QScoreDial
                  score={displayScore}
                  size={132}
                  dark
                  centerLabel={isPartial ? `${answeredParameters}/6 params` : "Q-Score"}
                />
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 15, fontWeight: 500, color: "#F9F7F2" }}>{gradeLabel(displayScore)}</p>
                  <p style={{ fontSize: 11, color: "rgba(249,247,242,0.5)", marginTop: 2 }}>
                    {isPartial ? `${answeredParameters}/6 parameters answered` : qs.percentile !== null ? `Top ${100 - qs.percentile}% of founders` : "Complete assessment to rank"}
                  </p>
                  {isPartial && (
                    <p style={{ fontSize: 10, marginTop: 4, color: "rgba(249,247,242,0.45)", fontWeight: 400 }}>
                      Complete {6 - answeredParameters} more section{6 - answeredParameters !== 1 ? "s" : ""} to unlock up to {100 - displayScore} more points
                    </p>
                  )}
                  {daysSinceScore !== null && (
                    <p style={{
                      fontSize: 10, marginTop: 6,
                      color: isStale ? "#FCA5A5" : isMaturing ? "#FCD34D" : "rgba(249,247,242,0.4)",
                      fontWeight: isStale || isMaturing ? 600 : 400,
                    }}>
                      {isStale ? "⚠ " : isMaturing ? "○ " : ""}{daysSinceScore}d old
                    </p>
                  )}
                  {realQScore?.decayApplied && realQScore.rawOverall && realQScore.rawOverall !== realQScore.overall && (
                    <p style={{ fontSize: 9, marginTop: 3, color: "#FCA5A5", fontWeight: 600 }}>
                      Score reflects {realQScore.daysSince}d-old data ({Math.round((1 - (realQScore.decayFactor as number)) * 100)}% reduction) — reassess to restore
                    </p>
                  )}
                  {realQScore?.availableIQ != null && (
                    <p style={{ fontSize: 9, marginTop: 4, color: "rgba(249,247,242,0.45)", fontWeight: 500 }}>
                      Ceiling: {Math.round(realQScore.availableIQ as number)}/100 — complete more sections to raise it
                    </p>
                  )}
                  {realQScore?.track && (
                    <p style={{
                      fontSize: 9, marginTop: 3, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em",
                      color: realQScore.track === 'impact' ? green : "rgba(249,247,242,0.35)",
                    }}>
                      {realQScore.track as string} track
                    </p>
                  )}
                </div>
                <Link href="/founder/improve-qscore"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 20px",
                    background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.18)",
                    borderRadius: 999, fontSize: 12, color: "#F9F7F2", fontWeight: 500, textDecoration: "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.18)")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.1)")}
                >
                  <ArrowRight style={{ height: 12, width: 12 }} /> Improve score
                </Link>
                {/* Share Q-Score badge */}
                {user && !isDemo && (
                  <button
                    onClick={() => setShareModalOpen(true)}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 20px",
                      background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.18)",
                      borderRadius: 999, fontSize: 12,
                      color: "#F9F7F2",
                      fontWeight: 500, cursor: "pointer",
                      transition: "background 0.15s", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.18)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.1)")}
                  >
                    <Share2 style={{ height: 12, width: 12 }} /> Share Q-Score
                  </button>
                )}

                {/* Share Pitch Profile */}
                {user && (
                  <button
                    onClick={() => {
                      const url = `${window.location.origin}/pitch/${user.id}`;
                      navigator.clipboard.writeText(url).then(() => {
                        setLinkCopied(true);
                        setTimeout(() => setLinkCopied(false), 2500);
                      });
                    }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 6,
                      padding: "9px 20px",
                      background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.18)",
                      borderRadius: 999, fontSize: 12,
                      color: "#F9F7F2",
                      fontWeight: 500, cursor: "pointer",
                      transition: "background 0.15s", whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.18)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(249,247,242,0.1)")}
                  >
                    {linkCopied ? <><Check style={{ height: 12, width: 12 }} /> Link copied</> : <><Link2 style={{ height: 12, width: 12 }} /> Share Pitch Profile</>}
                  </button>
                )}
              </>
            )}
          </motion.div>

          {/* Dimension bars */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            style={{
              background: surf, border: `1px solid ${bdr}`, borderRadius: 20, padding: "24px 28px",
              display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, margin: 0 }}>
                {"IQ Matrix — P1–P6"}
              </p>
              {isDemo ? (
                <Badge variant="amber" style={{ padding: "2px 8px", color: "#92400E", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  Example — not your data
                </Badge>
              ) : (
                <Badge variant="blue" style={{ padding: "2px 6px", border: `1px solid ${blue}33`, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {"IQ v2"}
                </Badge>
              )}
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4 }}>
              {effectiveSortedDims.map(([key, dim], i) => {
                const meta = DIMENSION_META[key];
                const TrendIcon = dim.trend === "up" ? TrendingUp : dim.trend === "down" ? TrendingDown : Minus;
                const trendColor = dim.trend === "up" ? green : dim.trend === "down" ? red : muted;
                const isExpanded = selectedDimension === key;
                const agentInfo  = DIMENSION_AGENT[key];
                return (
                  <div key={key}>
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.06 }}
                      onClick={() => setSelectedDimension(isExpanded ? null : key)}
                      style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer", padding: "5px 0", borderRadius: 8 }}
                    >
                      <span style={{ width: 64, fontSize: 11, color: muted, fontWeight: 500, flexShrink: 0, textAlign: "right", display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4 }}>
                        {conflictDims.has(key) && (
                          <span title="Data mismatch — check Improve Q-Score" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: red, flexShrink: 0 }} />
                        )}
                        {meta.label}
                      </span>
                      <div style={{ flex: 1, height: 5, background: bdr, borderRadius: 999, overflow: "hidden" }}>
                        <motion.div
                          style={{ height: "100%", borderRadius: 999, background: scoreColor(dim.score) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${dim.score}%` }}
                          transition={{ delay: 0.45 + i * 0.06, duration: 0.7, ease: "easeOut" }}
                        />
                      </div>
                      <span style={{ width: 24, fontSize: 12, color: ink, fontWeight: 600, fontFamily: "monospace", flexShrink: 0, textAlign: "right" }}>{dim.score}</span>
                      {dim.change !== 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
                          <TrendIcon style={{ height: 10, width: 10, color: trendColor }} />
                          <span style={{ fontSize: 10, color: trendColor, fontWeight: 600 }}>
                            {dim.change > 0 ? "+" : ""}{dim.change}
                          </span>
                        </div>
                      )}
                      <span style={{ fontSize: 10, color: muted, flexShrink: 0, transition: "transform 0.15s", transform: isExpanded ? "rotate(90deg)" : "none" }}>▶</span>
                    </motion.div>

                    {/* Expansion panel */}
                    <AnimatePresence>
                      {isExpanded && agentInfo && (
                        <motion.div
                          key="expansion"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{
                            margin: "4px 0 8px 76px",
                            padding: "12px 14px",
                            background: bg,
                            border: `1px solid ${bdr}`,
                            borderRadius: 10,
                          }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: ink, marginBottom: 6 }}>
                              How to improve {meta.label}
                            </p>
                            {(DIM_ISSUES[key] ?? []).map((issue, idx) => (
                              <p key={idx} style={{ fontSize: 11, color: muted, margin: "0 0 3px", lineHeight: 1.5 }}>
                                · {issue}
                              </p>
                            ))}
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                              {(DIM_BOOSTS[key] ?? []).map((b, idx) => (
                                <Badge key={idx} variant="blue" style={{ border: `1px solid ${blue}22` }}>
                                  +{b.pts}pts · {b.artifact.replace(/_/g, " ")}
                                </Badge>
                              ))}
                            </div>
                            <Link
                              href="/founder/executive"
                              style={{
                                display: "inline-flex", alignItems: "center", gap: 4,
                                marginTop: 10, fontSize: 11, fontWeight: 600,
                                color: blue, textDecoration: "none",
                              }}
                            >
                              Talk to {agentInfo.agentName} → <ChevronRight style={{ height: 10, width: 10 }} />
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* ── today's focus ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ height: 28, width: 28, borderRadius: 7, background: "#EFF6FF", border: "1px solid #BFDBFE", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target style={{ height: 13, width: 13, color: blue }} />
              </div>
              <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, margin: 0 }}>
                  Today&apos;s focus
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {dashLoading && <Loader2 style={{ height: 14, width: 14, color: muted, animation: "spin 1s linear infinite" }} />}
            </div>
          </div>

          {dashLoading && priorities.length === 0 ? (
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, padding: "20px 22px", display: "flex", alignItems: "center", gap: 10 }}>
              <Loader2 style={{ height: 16, width: 16, color: muted, animation: "spin 1s linear infinite", flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: muted }}>Analysing your data to find the highest-impact tasks…</p>
            </div>
          ) : !dashLoading && priorities.length === 0 ? (
            <div style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, padding: "18px 22px" }}>
              <p style={{ fontSize: 13, color: muted, lineHeight: 1.6 }}>
                Complete your Profile Builder to unlock AI-recommended priorities tailored to your score.
              </p>
              <Link href="/founder/profile-builder" style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, fontWeight: 600, color: blue, textDecoration: "none" }}>
                Start Profile Builder <ChevronRight style={{ height: 11, width: 11 }} />
              </Link>
            </div>
          ) : priorities.length > 0 ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
              {priorities.map((p, i) => {
                const urgencyColor = p.urgency === "high" ? red : p.urgency === "medium" ? amber : muted;
                const urgencyBg    = p.urgency === "high" ? "#FEF2F2" : p.urgency === "medium" ? "#FFFBEB" : surf;
                const agentHref    = "/founder/executive";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 + i * 0.06 }}
                    style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, padding: "18px 20px", display: "flex", flexDirection: "column", gap: 10 }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Badge variant="neutral" style={{ textTransform: "uppercase", letterSpacing: "0.08em", color: urgencyColor, background: urgencyBg, border: "none" }}>
                        {p.urgency}
                      </Badge>
                      {p.agentId && (
                        <span style={{ fontSize: 10, color: muted, fontWeight: 500, textTransform: "capitalize" }}>{p.agentId}</span>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: ink, marginBottom: 4, lineHeight: 1.4 }}>{p.title}</p>
                      <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{p.why}</p>
                    </div>
                    <div style={{ marginTop: "auto", paddingTop: 4, borderTop: `1px solid ${bdr}` }}>
                      <p style={{ fontSize: 11, color: blue, lineHeight: 1.5, marginBottom: 8 }}>→ {p.action}</p>
                      <Link
                        href={agentHref}
                        style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: blue, textDecoration: "none" }}
                      >
                        Start now <ChevronRight style={{ height: 11, width: 11 }} />
                      </Link>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : null}
        </motion.div>

        {/* ── score challenges ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          style={{ marginBottom: 24 }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
              Score challenges — do the behavior, {"{"}agent{"}"} generates the evidence
            </p>
            <Link href="/founder/improve-qscore" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}>
              View all →
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
            {topActions.map(([key, dim], i) => {
              const meta     = DIMENSION_META[key];
              const aInfo    = DIMENSION_AGENT[key];
              const behavior = DIMENSION_BEHAVIOR[key];
              const col      = scoreColor(dim.score);
              const TrendIcon = dim.trend === "up" ? TrendingUp : dim.trend === "down" ? TrendingDown : Minus;
              return (
                <Link key={key} href="/founder/executive" style={{ textDecoration: "none" }}>
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.07 }}
                    style={{
                      background: bg, border: `1px solid ${bdr}`, borderRadius: 14,
                      padding: "18px 20px", cursor: "pointer",
                      transition: "border-color .15s",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = col; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = bdr; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: col, background: alpha(col, 0.08), borderRadius: 4, padding: "1px 7px" }}>
                        {dim.score} — {meta.label}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <TrendIcon style={{ height: 10, width: 10, color: dim.trend === "up" ? green : dim.trend === "down" ? red : muted }} />
                        {dim.change !== 0 && (
                          <span style={{ fontSize: 10, color: dim.trend === "up" ? green : dim.trend === "down" ? red : muted, fontWeight: 600 }}>
                            {dim.change > 0 ? "+" : ""}{dim.change}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ height: 3, background: bdr, borderRadius: 999, marginBottom: 12, overflow: "hidden" }}>
                      <div style={{ width: `${dim.score}%`, height: "100%", background: col, borderRadius: 999 }} />
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 4, lineHeight: 1.35 }}>
                      {behavior?.action ?? meta.label}
                    </p>
                    <p style={{ fontSize: 11, color: muted, marginBottom: 10, lineHeight: 1.5 }}>
                      Evidence: {behavior?.evidence ?? `Build a ${aInfo.label}`} — {aInfo.agentName} can help
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: col }}>
                      Start with {aInfo.agentName} <ChevronRight style={{ height: 11, width: 11 }} />
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </motion.div>

        {/* ── quick stats row ───────────────────────────────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 32 }}>
          {quickStats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 14, padding: "18px 20px" }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ height: 32, width: 32, borderRadius: 8, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ height: 14, width: 14, color: muted }} />
                  </div>
                </div>
                <p style={{ fontSize: 24, fontWeight: 300, color: ink, letterSpacing: "-0.03em", lineHeight: 1 }}>{s.value}</p>
                <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>{s.label}</p>
                <p style={{ fontSize: 10, color: s.positive === true ? green : s.positive === false ? red : muted, marginTop: 2, fontWeight: 500 }}>{s.sub}</p>
              </motion.div>
            );
          })}
        </div>

        {/* ── connectors strip ─────────────────────────────────────── */}
        {stripeStatus && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
            <Link
              href="/founder/settings?tab=integrations"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
                padding: "5px 12px", borderRadius: 999,
                background: stripeStatus.verified ? "#F0FDF4" : surf,
                border: `1px solid ${stripeStatus.verified ? green + "44" : bdr}`,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: stripeStatus.verified ? green : "#D1CEC8", flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 500, color: stripeStatus.verified ? green : muted }}>
                Stripe {stripeStatus.verified ? "connected" : "not connected"}
              </span>
            </Link>
            {(["LinkedIn", "Google Sheets", "Gmail", "Slack"] as const).map(name => (
              <Link key={name} href="/founder/settings?tab=integrations" style={{
                display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none",
                padding: "5px 12px", borderRadius: 999, background: surf, border: `1px solid ${bdr}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D1CEC8", flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: muted }}>{name} · soon</span>
              </Link>
            ))}
          </div>
        )}

        {/* ── top actions ──────────────────────────────────────────── */}
        <div style={{ marginBottom: 24 }}>

          {/* top actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ background: bg, border: `1px solid ${bdr}`, borderRadius: 18, overflow: "hidden" }}
          >
            <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${bdr}` }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600 }}>
                Top actions to improve your score
              </p>
            </div>
            <div>
              {topActions.map(([key, dim], i) => {
                const meta = DIMENSION_META[key];
                const potentialGain = Math.round((80 - dim.score) * (meta.weight / 100) * 2.5);
                const col = scoreColor(dim.score);
                return (
                  <motion.div key={key}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.45 + i * 0.07 }}
                    style={{ borderBottom: i < 2 ? `1px solid ${bdr}` : "none" }}
                  >
                    {/* Was a per-adviser chat link. The Executive model works this dimension to
                        the mandate without being asked, so the score points at the team. */}
                    <Link href="/founder/executive" style={{ textDecoration: "none" }}>
                      <div
                        style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 22px", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = surf)}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
                      >
                        {/* score pill */}
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: col, fontFamily: "monospace" }}>{dim.score}</span>
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: ink }}>
                            {meta.label}
                          </p>
                          <p style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                            {meta.weight}% weight · up to +{potentialGain} pts
                          </p>
                        </div>
                        <ChevronRight style={{ height: 13, width: 13, color: muted, flexShrink: 0 }} />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

        </div>

        {/* ── score trajectory (full width) ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          style={{ padding: "22px 28px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18, marginBottom: 24 }}
        >
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", color: muted, fontWeight: 600, marginBottom: 2 }}>
            Score trajectory
          </p>
          <p style={{ fontSize: 11, color: muted, marginBottom: 14 }}>
            Every assessment and agent boost · hover a point to see the exact score
          </p>
          <ScoreChart points={scoreHistory} />
        </motion.div>

        {/* ── investor portfolio CTA ────────────────────────────── */}
        {!isDemo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46 }}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20,
              padding: "18px 24px", background: bg, border: `1px solid ${bdr}`, borderRadius: 18,
              marginBottom: 24,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ height: 40, width: 40, borderRadius: 10, background: surf, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Briefcase style={{ height: 18, width: 18, color: muted }} />
              </div>
              <div>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600, marginBottom: 3 }}>Investor Portfolio</p>
                <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>
                  Share your Q-Score &amp; deliverables with investors
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {publicSlug && (
                <button
                  onClick={() => setShareModalOpen(true)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "7px 14px", background: surf,
                    color: muted,
                    border: `1px solid ${bdr}`,
                    borderRadius: 999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                    whiteSpace: "nowrap", transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    ;(e.currentTarget as HTMLElement).style.background = "rgba(37,99,235,0.1)"
                    ;(e.currentTarget as HTMLElement).style.color = blue
                    ;(e.currentTarget as HTMLElement).style.borderColor = blue
                  }}
                  onMouseLeave={e => {
                    ;(e.currentTarget as HTMLElement).style.background = surf
                    ;(e.currentTarget as HTMLElement).style.color = muted
                    ;(e.currentTarget as HTMLElement).style.borderColor = bdr
                  }}
                >
                  Share Q-Score
                </button>
              )}
              <Link href="/founder/portfolio" style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "7px 16px", background: ink, color: bg,
                borderRadius: 999, fontSize: 12, fontWeight: 500, textDecoration: "none",
                whiteSpace: "nowrap",
              }}>
                View portfolio <ArrowRight style={{ height: 11, width: 11 }} />
              </Link>
            </div>
          </motion.div>
        )}

        {/* ── live metrics strip ────────────────────────────────── */}
        {dashMetrics && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.48 }}
            style={{ marginBottom: 24 }}
          >
            <Link href="/founder/metrics" style={{ textDecoration: "none" }}>
              <div
                style={{
                  display: "grid", gridTemplateColumns: "repeat(5, 1fr)",
                  gap: 0, border: `1px solid ${bdr}`, borderRadius: 14, overflow: "hidden",
                  cursor: "pointer", transition: "border-color .15s",
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = "#C4BFB8")}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
              >
                {[
                  { icon: DollarSign, label: "MRR",     value: `$${dashMetrics.mrr.toLocaleString()}`,           sub: "monthly recurring" },
                  { icon: TrendingDown, label: "Burn",  value: `$${dashMetrics.burn.toLocaleString()}`,          sub: "monthly burn" },
                  { icon: BarChart3, label: "Runway",   value: `${dashMetrics.runway} mo`,                       sub: dashMetrics.runway >= 18 ? "strong" : dashMetrics.runway >= 12 ? "adequate" : "extend soon" },
                  { icon: Users, label: "Customers",    value: String(dashMetrics.customers),                    sub: "paying" },
                  { icon: TrendingUp, label: "LTV:CAC", value: `${dashMetrics.ltvCacRatio}:1`,                   sub: dashMetrics.ltvCacRatio >= 3 ? "healthy ✓" : "below target" },
                ].map((item, idx, arr) => {
                  const Icon = item.icon;
                  const isLast = idx === arr.length - 1;
                  return (
                    <div
                      key={item.label}
                      style={{
                        padding: "14px 18px", background: bg,
                        borderRight: isLast ? "none" : `1px solid ${bdr}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                        <Icon style={{ width: 11, height: 11, color: muted }} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: muted, letterSpacing: "0.1em", textTransform: "uppercase" }}>{item.label}</span>
                      </div>
                      <p style={{ fontSize: 18, fontWeight: 300, color: ink, lineHeight: 1, marginBottom: 3 }}>{item.value}</p>
                      <p style={{ fontSize: 10, color: muted }}>{item.sub}</p>
                    </div>
                  );
                })}
              </div>
            </Link>
          </motion.div>
        )}

        {/* ── bottom row: investor pulse + academy ──────────────── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }} className="dashboard-bottom">

          {/* investor pulse */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {qs.overall >= 45 ? (
              <Link href="/founder/matching" style={{ textDecoration: "none", display: "block", height: "100%" }}>
                <div
                  style={{
                    padding: "22px 24px", background: ink, borderRadius: 18, height: "100%",
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    cursor: "pointer", transition: "opacity 0.15s", boxSizing: "border-box",
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.opacity = "0.88")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.opacity = "1")}
                >
                  <div>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: "rgba(249,247,242,0.45)", fontWeight: 600, marginBottom: 8 }}>
                      Investor Marketplace
                    </p>
                    <p style={{ fontSize: 15, fontWeight: 400, color: "#F9F7F2", marginBottom: 4 }}>500+ verified investors</p>
                    {portfolioViews && portfolioViews.last7 > 0 ? (
                      <p style={{ fontSize: 11, color: "rgba(249,247,242,0.65)", marginBottom: 2 }}>
                        <span style={{ fontWeight: 700, color: "#F9F7F2" }}>{portfolioViews.last7}</span> portfolio {portfolioViews.last7 === 1 ? "view" : "views"} this week
                      </p>
                    ) : (
                      <p style={{ fontSize: 11, color: "rgba(249,247,242,0.5)" }}>Your Q-Score qualifies you.</p>
                    )}
                    {portfolioViews && portfolioViews.total > 0 && (
                      <p style={{ fontSize: 10, color: "rgba(249,247,242,0.35)" }}>{portfolioViews.total} total views</p>
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <div style={{ height: 36, width: 36, borderRadius: 10, background: "rgba(249,247,242,0.1)", border: "1px solid rgba(249,247,242,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ArrowRight style={{ height: 14, width: 14, color: "#F9F7F2" }} />
                    </div>
                  </div>
                </div>
              </Link>
            ) : (
              <div style={{ padding: "22px 24px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18, height: "100%", boxSizing: "border-box" }}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600, marginBottom: 8 }}>
                  Investor Marketplace
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <Lock style={{ height: 13, width: 13, color: muted }} />
                  <p style={{ fontSize: 14, fontWeight: 500, color: ink }}>Locked — need {45 - qs.overall} more pts</p>
                </div>
                <p style={{ fontSize: 11, color: muted, marginBottom: 14 }}>
                  Reach Q-Score 45 to access 500+ investors.
                </p>
                <Link href="/founder/improve-qscore" style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "8px 18px", background: ink, color: bg,
                  fontSize: 12, fontWeight: 500, borderRadius: 999, textDecoration: "none",
                }}>
                  Improve score <ArrowRight style={{ height: 11, width: 11 }} />
                </Link>
              </div>
            )}
          </motion.div>

          {/* academy */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            style={{ padding: "22px 24px", background: surf, border: `1px solid ${bdr}`, borderRadius: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.16em", color: muted, fontWeight: 600 }}>
                Academy
              </p>
              <Link href="/founder/academy" style={{ fontSize: 11, color: blue, textDecoration: "none", fontWeight: 500 }}>
                View all →
              </Link>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ height: 44, width: 44, borderRadius: 12, background: bg, border: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <GraduationCap style={{ height: 20, width: 20, color: muted }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: ink, marginBottom: 2 }}>{NEXT_WORKSHOP?.title ?? "Live Workshops"}</p>
                <p style={{ fontSize: 11, color: muted }}>
                  {NEXT_WORKSHOP
                    ? `${NEXT_WORKSHOP.instructor} · ${new Date(NEXT_WORKSHOP.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${NEXT_WORKSHOP.time}`
                    : "New sessions added weekly"}
                </p>
              </div>
            </div>
            <Link href="/founder/academy"
              style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                marginTop: 16, padding: "7px 16px", border: `1px solid ${bdr}`, borderRadius: 999,
                fontSize: 12, color: ink, textDecoration: "none", fontWeight: 500, transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.borderColor = ink)}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = bdr)}
            >
              Register
            </Link>
          </motion.div>
        </div>

      </PageContainer>

      {/* Share Q-Score Modal */}
      <ShareQScoreModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={publicSlug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/startup/${publicSlug}` : undefined}
        qscoreData={{
          companyName: founderCompanyName,
          oneLiner: founderOneLiner,
          industry: founderIndustry,
          stage: founderStage,
          overallScore: Math.round(qs.overall || 0),
          dimensions: {
            marketReadiness: Math.round((qs as Record<string, number>).p1 || 0),
            marketPotential: Math.round((qs as Record<string, number>).p2 || 0),
            ipDefensibility: Math.round((qs as Record<string, number>).p3 || 0),
            founderTeam: Math.round((qs as Record<string, number>).p4 || 0),
            structuralImpact: Math.round((qs as Record<string, number>).p5 || 0),
            financials: Math.round((qs as Record<string, number>).p6 || 0),
          },
        }}
      />

      {/* responsive styles */}
      <style>{`
        @media (max-width: 900px) {
          .dashboard-hero { grid-template-columns: 1fr !important; }
          .dashboard-bottom { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .dashboard-bottom { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <WelcomeModal
        storageKey="qc_founder_welcome_v1"
        slides={FOUNDER_WELCOME_SLIDES}
      />

      {/* Upgrade modal — triggered by usage gates */}
      <UpgradeModal
        open={upgradeModal.open}
        onClose={() => setUpgradeModal({ open: false })}
        feature={upgradeModal.feature}
        userType="founder"
      />
    </div>
  );
}
