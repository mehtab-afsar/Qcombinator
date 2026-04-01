"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion, AnimatePresence, useInView, useScroll, useTransform,
} from "framer-motion";
import {
  ArrowRight, ArrowUpRight, BarChart3, Bot, CheckCircle,
  ChevronDown, ChevronRight, Lock, Mail, Menu, Send,
  TrendingUp, Users, X, Star, Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── palette ─────────────────────────────────────────────────────────────────
const C = {
  cream:    "#FAF8F3",
  sand:     "#F5F1E8",
  taupe:    "#E8E3D8",
  charcoal: "#2A2826",
  stone:    "#6B6760",
  ember:    "#D97757",
  sage:     "#8B9A7A",
  midnight: "#1A1816",
  goldL:    "#F7EFD9",
  gold:     "#C9A961",
  goldD:    "#9A7B3C",
  ink:      "#18160F",
  muted:    "#8A867C",
  bg:       "#F9F7F2",
  surf:     "#F0EDE6",
  bdr:      "#E2DDD5",
  dim:      "#B8B4AC",
  faint:    "#C4C0B8",
};

const ease = [0.22, 1, 0.36, 1] as const;

// ─── data ─────────────────────────────────────────────────────────────────────
const agentRoles = [
  { num: "01", name: "Strategy",    desc: "Positioning · business model · GTM",      color: "#D97757", emoji: "◈" },
  { num: "02", name: "Marketing",   desc: "Acquisition · content · brand narrative",  color: "#2563EB", emoji: "◉" },
  { num: "03", name: "Sales",       desc: "Pipeline · closing · pricing",             color: "#16A34A", emoji: "◆" },
  { num: "04", name: "Finance",     desc: "Unit economics · runway · fundraise prep", color: "#D97706", emoji: "◇" },
  { num: "05", name: "HR & Team",   desc: "Hiring · culture · org design",           color: "#9D174D", emoji: "◎" },
  { num: "06", name: "Legal & Ops", desc: "Contracts · compliance · process",        color: "#6D28D9", emoji: "□" },
];

const investors = [
  { name: "Hustle Fund",         type: "VC · USA / Global",  logo: "HF", check: "$25k – $500k",  stages: "Pre-seed · Seed",  match: 97 },
  { name: "Precursor Ventures",  type: "VC · USA",            logo: "PV", check: "$250k – $1M",   stages: "Pre-seed · Seed",  match: 93 },
  { name: "First Round Capital", type: "VC · USA / UK",       logo: "FR", check: "$1M – $15M",    stages: "Seed · Series A",  match: 89 },
  { name: "Pear VC",             type: "VC · USA",            logo: "P",  check: "$500k – $5M",   stages: "Seed · Series A",  match: 84 },
  { name: "General Catalyst",    type: "VC · USA / Europe",   logo: "GC", check: "$2M – $50M",    stages: "Seed · Growth",    match: 81 },
  { name: "Founders Fund",       type: "VC · USA",            logo: "FF", check: "$500k – $20M",  stages: "Seed · Series A",  match: 76 },
];

const testimonials = [
  { initials: "SC", name: "Sarah Chen",      role: "Founder, TechFlow",      bg: "#E8D5C4", tc: "#8B5E3C", quote: "The Marketing Adviser helped us rethink GTM from scratch. Edge Alpha then matched us with the right investors. Raised seed in two weeks." },
  { initials: "MJ", name: "Marcus Johnson",  role: "CEO, DataPipe",           bg: "#C4D8E8", tc: "#2563EB", quote: "Q-Score pinpointed our weak spots. The Finance Agent fixed them. Investors took us seriously and we closed 3× faster than expected." },
  { initials: "ER", name: "Elena Rodriguez", role: "Partner, Vertex Capital", bg: "#D4E8C4", tc: "#166534", quote: "Every founder I see from Edge Alpha has actually prepared. The Q-Score filter alone saves me hours of due diligence each week." },
  { initials: "DP", name: "David Park",      role: "Founder, CloudStack",     bg: "#E8C4D8", tc: "#9D174D", quote: "Strategy Agent nailed our positioning before we talked to a single investor. Found our lead through the marketplace. Nothing like it." },
  { initials: "AF", name: "Amanda Foster",   role: "GP, Horizon Ventures",    bg: "#E8E4C4", tc: "#92400E", quote: "More than half my deal flow now comes from Edge Alpha. The quality bar the platform sets is genuinely exceptional." },
  { initials: "JL", name: "James Liu",       role: "Founder, AIBotics",       bg: "#C4C8E8", tc: "#3730A3", quote: "Finance AI helped us model unit economics properly. Q-Score went from 62 to 84. Series A closed six weeks later." },
];

const stats = [
  { to: 2.3,   decimals: 1, prefix: "$", suffix: "B+", label: "Raised via platform" },
  { to: 10000, decimals: 0, prefix: "",  suffix: "+",  label: "Active founders" },
  { to: 500,   decimals: 0, prefix: "",  suffix: "+",  label: "Verified investors" },
  { to: 95,    decimals: 0, prefix: "",  suffix: "%",  label: "Match accuracy" },
];

const pressLogos = ["TechCrunch", "Forbes", "Bloomberg", "The Verge", "WIRED", "Fast Company", "Inc.", "Fortune"];

const dimensions = [
  { label: "Team",       score: 82, color: "#8B9A7A", low: false },
  { label: "Market",     score: 71, color: "#2563EB", low: false },
  { label: "Traction",   score: 58, color: "#D97757", low: true  },
  { label: "Financials", score: 63, color: "#D97706", low: false },
];

const avatarData = [
  { init: "SC", bg: "#E8D5C4", tc: "#8B5E3C" },
  { init: "MJ", bg: "#C4D8E8", tc: "#1D4ED8" },
  { init: "ER", bg: "#D4E8C4", tc: "#166534" },
  { init: "DP", bg: "#E8C4D8", tc: "#9D174D" },
  { init: "JL", bg: "#C4C8E8", tc: "#3730A3" },
];

// ─── CountUp ─────────────────────────────────────────────────────────────────
function CountUp({ to, decimals = 0, prefix = "", suffix = "" }: {
  to: number; decimals?: number; prefix?: string; suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const duration = 1800;
    const startTime = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setVal(eased * to);
      if (t < 1) requestAnimationFrame(tick);
      else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  const display = decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString();
  return <span ref={ref}>{prefix}{display}{suffix}</span>;
}

// ─── MatchBar ─────────────────────────────────────────────────────────────────
function MatchBar({ value }: { value: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true });
  return (
    <div ref={ref} style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ height: 4, width: 56, borderRadius: 999, background: C.taupe, overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${C.ember}, ${C.gold})` }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${value}%` } : { width: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: C.charcoal }}>{value}%</span>
    </div>
  );
}

// ─── MagneticButton ───────────────────────────────────────────────────────────
function MagneticButton({ children, onClick, style, className }: {
  children: React.ReactNode; onClick?: () => void; style?: React.CSSProperties; className?: string;
}) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  return (
    <motion.button
      className={className}
      style={style}
      onClick={onClick}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: (e.clientX - r.left - r.width / 2) * 0.12, y: (e.clientY - r.top - r.height / 2) * 0.12 });
      }}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15 }}
      whileTap={{ scale: 0.97 }}
    >
      {children}
    </motion.button>
  );
}

// ─── GetStartedDropdown ───────────────────────────────────────────────────────
function GetStartedDropdown({
  label, className, style, align = "center",
}: {
  label: React.ReactNode; className?: string; style?: React.CSSProperties; align?: "left" | "center" | "right";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  const navigate = (path: string) => { router.push(path); setOpen(false); };
  const alignStyle: React.CSSProperties =
    align === "left"  ? { left: 0 } :
    align === "right" ? { right: 0 } :
    { left: "50%", transform: "translateX(-50%)" };
  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex" }}>
      <MagneticButton onClick={() => setOpen((v) => !v)} className={className} style={style}>
        {label}
      </MagneticButton>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: "absolute", top: "calc(100% + 10px)", ...alignStyle,
              background: C.cream, border: `1px solid ${C.taupe}`, borderRadius: 14,
              overflow: "hidden", minWidth: 210,
              boxShadow: "0 16px 48px rgba(24,22,15,0.14)", zIndex: 200,
            }}
          >
            <button
              onClick={() => navigate("/founder/onboarding")}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.sand)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              style={{ display: "block", width: "100%", padding: "14px 20px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: 11, display: "block", color: C.stone, marginBottom: 2, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>First time</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: C.charcoal }}>Get started free</span>
            </button>
            <div style={{ height: 1, background: C.taupe }} />
            <button
              onClick={() => navigate("/login")}
              onMouseEnter={(e) => (e.currentTarget.style.background = C.sand)}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              style={{ display: "block", width: "100%", padding: "14px 20px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: 11, display: "block", color: C.stone, marginBottom: 2, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Returning</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: C.charcoal }}>Sign in</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── ScoreRing ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 110 }: { score: number; size?: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(svgRef, { once: true });
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  return (
    <svg ref={svgRef} width={size} height={size} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={C.ember} />
          <stop offset="100%" stopColor={C.gold} />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={r} fill="none" stroke={C.taupe} strokeWidth="7" />
      <motion.circle
        cx="50" cy="50" r={r} fill="none" stroke="url(#sg)" strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={inView ? { strokeDashoffset: offset } : { strokeDashoffset: circ }}
        transform="rotate(-90 50 50)"
        transition={{ duration: 1.6, delay: 0.3, ease }}
      />
    </svg>
  );
}

// ─── ProductMock ──────────────────────────────────────────────────────────────
function ProductMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div ref={ref} style={{ position: "relative" }}>
      {/* glow */}
      <div style={{
        position: "absolute", inset: -30, borderRadius: 32, pointerEvents: "none",
        background: `radial-gradient(ellipse at 60% 40%, rgba(217,119,87,0.13) 0%, transparent 70%)`,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.9, ease }}
        style={{
          background: "#FDFCFA", border: `1px solid ${C.taupe}`, borderRadius: 20,
          overflow: "hidden", boxShadow: "0 4px 48px rgba(42,40,38,0.08)",
        }}
      >
        {/* Window bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "11px 16px", borderBottom: `1px solid ${C.taupe}`, background: C.sand,
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8C4B8" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#E8DDB8" }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#B8E8C4" }} />
          <span style={{ marginLeft: 8, fontSize: 11, color: C.stone, fontWeight: 500 }}>Q-Score Dashboard</span>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 5 }}>
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E" }}
            />
            <span style={{ fontSize: 10, color: C.stone }}>Live</span>
          </div>
        </div>

        {/* Score row */}
        <div style={{ padding: "22px 22px 14px", display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            <ScoreRing score={74} size={100} />
            <div style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: 24, fontWeight: 600, color: C.charcoal, lineHeight: 1 }}>74</span>
              <span style={{ fontSize: 9, color: C.stone, marginTop: 2, letterSpacing: "0.1em" }}>/ 100</span>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
              <span style={{ fontSize: 26, fontWeight: 300, color: C.charcoal, lineHeight: 1 }}>B+</span>
              <span style={{
                fontSize: 10, padding: "3px 8px", borderRadius: 5,
                background: "rgba(139,154,122,0.15)", color: "#3A6A3A", fontWeight: 600,
              }}>Top 34%</span>
            </div>
            <p style={{ fontSize: 12, color: C.charcoal, fontWeight: 500, marginBottom: 3 }}>Investment Ready</p>
            <p style={{ fontSize: 11, color: C.stone }}>3 dimensions to strengthen</p>
          </div>
        </div>

        {/* Dimension bars */}
        <div style={{ padding: "0 22px 18px" }}>
          {dimensions.map((d, i) => (
            <div key={d.label} style={{ marginBottom: i < dimensions.length - 1 ? 10 : 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: C.stone, display: "flex", alignItems: "center", gap: 6 }}>
                  {d.label}
                  {d.low && (
                    <span style={{
                      fontSize: 9, padding: "1px 6px", borderRadius: 3,
                      background: "rgba(217,119,87,0.12)", color: C.ember, fontWeight: 600,
                    }}>↑ Focus</span>
                  )}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: d.low ? C.ember : C.charcoal }}>{d.score}</span>
              </div>
              <div style={{ height: 4, borderRadius: 999, background: C.taupe, overflow: "hidden" }}>
                <motion.div
                  style={{
                    height: "100%", borderRadius: 999,
                    background: d.low
                      ? `linear-gradient(90deg, ${C.ember}, #C46A4A)`
                      : d.color,
                    opacity: d.low ? 1 : 0.65,
                  }}
                  initial={{ width: 0 }}
                  animate={inView ? { width: `${d.score}%` } : { width: 0 }}
                  transition={{ duration: 1.2, delay: 0.5 + i * 0.1, ease }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* AI adviser bubble */}
        <div style={{ borderTop: `1px solid ${C.taupe}`, padding: "14px 16px", background: C.cream }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{
              width: 26, height: 26, borderRadius: 6, background: C.charcoal,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
            }}>
              <Bot style={{ width: 13, height: 13, color: C.cream }} />
            </div>
            <div style={{
              background: C.sand, border: `1px solid ${C.taupe}`,
              borderRadius: "4px 12px 12px 12px", padding: "10px 14px", flex: 1,
            }}>
              <p style={{ fontSize: 12, color: C.charcoal, lineHeight: 1.65 }}>
                Your retention score is the key gap. Let&apos;s build a{" "}
                <strong>habit-forming trigger</strong> for week 2 — this alone reduces early churn by 20–35%.
              </p>
            </div>
          </div>
        </div>

        {/* Score strip */}
        <div style={{
          padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
          borderTop: `1px solid ${C.taupe}`, background: C.sand,
        }}>
          <span style={{ fontSize: 11, color: C.stone }}>This session is improving your Q-Score</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: C.ember, fontSize: 11, fontWeight: 600 }}>
            <TrendingUp style={{ width: 12, height: 12 }} /> +3 pts
          </div>
        </div>
      </motion.div>

      {/* Floating badge — top right */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: 6 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ delay: 0.9, duration: 0.45 }}
        style={{
          position: "absolute", top: -14, right: -14,
          background: C.midnight, borderRadius: 12, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 7,
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 8px 28px rgba(0,0,0,0.22)",
        }}
      >
        <TrendingUp style={{ width: 13, height: 13, color: "#22C55E" }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: C.cream }}>+8 pts this week</span>
      </motion.div>

      {/* Floating badge — bottom left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8, y: -6 }}
        animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
        transition={{ delay: 1.1, duration: 0.45 }}
        style={{
          position: "absolute", bottom: -14, left: -14,
          background: C.cream, borderRadius: 12, padding: "8px 14px",
          display: "flex", alignItems: "center", gap: 7,
          border: `1px solid ${C.taupe}`,
          boxShadow: "0 8px 28px rgba(42,40,38,0.1)",
        }}
      >
        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
        <span style={{ fontSize: 11, color: C.charcoal, fontWeight: 500 }}>3 investors matched</span>
      </motion.div>
    </motion.div>
  );
}

// ─── AvatarStack ──────────────────────────────────────────────────────────────
function AvatarStack() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ display: "flex" }}>
        {avatarData.map((a, i) => (
          <div key={a.init} style={{
            width: 28, height: 28, borderRadius: "50%",
            marginLeft: i > 0 ? -8 : 0,
            background: a.bg, color: a.tc,
            fontSize: 8, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            border: `2px solid ${C.cream}`,
            zIndex: avatarData.length - i, position: "relative",
            letterSpacing: "0.02em",
          }}>
            {a.init}
          </div>
        ))}
      </div>
      <span style={{ fontSize: 12, color: C.stone }}>
        Join <strong style={{ color: C.charcoal }}>10,000+</strong> founders
      </span>
    </div>
  );
}

// ─── StarRating ───────────────────────────────────────────────────────────────
function StarRating() {
  return (
    <div style={{ display: "flex", gap: 2, marginBottom: 14 }}>
      {[0,1,2,3,4].map(i => (
        <Star key={i} style={{ width: 12, height: 12, fill: "#D97706", color: "#D97706" }} />
      ))}
    </div>
  );
}

// ─── BillingToggle ────────────────────────────────────────────────────────────
function BillingToggle({ annual, onChange }: { annual: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 10,
      padding: "6px 6px 6px 14px", borderRadius: 999,
      background: C.sand, border: `1px solid ${C.taupe}`,
    }}>
      <span style={{ fontSize: 12, color: annual ? C.dim : C.charcoal, fontWeight: annual ? 300 : 500 }}>
        Monthly
      </span>
      <button
        onClick={() => onChange(!annual)}
        style={{
          width: 40, height: 22, borderRadius: 999,
          background: annual ? C.ember : C.faint,
          border: "none", cursor: "pointer", position: "relative",
          transition: "background 0.25s",
        }}
      >
        <motion.div
          animate={{ x: annual ? 20 : 3 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          style={{
            position: "absolute", top: 3, left: 0,
            width: 16, height: 16, borderRadius: "50%", background: "#fff",
            boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
          }}
        />
      </button>
      <span style={{ fontSize: 12, color: annual ? C.charcoal : C.dim, fontWeight: annual ? 500 : 300 }}>
        Annual
      </span>
      <AnimatePresence>
        {annual && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              fontSize: 10, fontWeight: 700, color: "#166534",
              background: "rgba(22,163,74,0.12)", padding: "3px 9px", borderRadius: 999,
            }}
          >
            Save 20%
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeAgent, setActiveAgent] = useState(0);
  const [faqOpen, setFaqOpen]       = useState<number | null>(null);
  const [showSticky, setShowSticky] = useState(false);
  const [annual, setAnnual]         = useState(false);

  const { scrollYProgress } = useScroll();
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -40]);

  useEffect(() => {
    const fn = () => {
      setScrolled(window.scrollY > 40);
      setShowSticky(window.scrollY > 600);
    };
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveAgent((v) => (v + 1) % agentRoles.length), 2500);
    return () => clearInterval(t);
  }, []);

  const go = (p: string) => router.push(p);

  return (
    <div className="min-h-screen antialiased" style={{ background: C.cream, color: C.charcoal }}>

      {/* ── SCROLL PROGRESS ──────────────────────────────────────────────── */}
      <motion.div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 3, zIndex: 9999,
          background: `linear-gradient(90deg, ${C.ember}, ${C.gold})`,
          scaleX: scrollYProgress, transformOrigin: "0%",
        }}
      />

      {/* ── STICKY BOTTOM CTA ────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSticky && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 25 }}
            style={{
              position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
              zIndex: 100, display: "flex", alignItems: "center", gap: 12,
              padding: "10px 10px 10px 18px", borderRadius: 999,
              background: C.midnight, border: `1px solid rgba(255,255,255,0.06)`,
              boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: C.sage, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", fontWeight: 300 }}>
              Build your fundable business
            </span>
            <MagneticButton
              onClick={() => go("/founder/onboarding")}
              style={{
                padding: "8px 20px", borderRadius: 999,
                background: `linear-gradient(135deg, ${C.ember}, #C46A4A)`,
                color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer",
                boxShadow: `0 2px 12px rgba(217,119,87,0.4)`,
              }}
            >
              Start free →
            </MagneticButton>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        style={{
          background: scrolled ? "rgba(250,248,243,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? `1px solid rgba(232,227,216,0.5)` : "1px solid transparent",
          boxShadow: scrolled ? "0 4px 24px rgba(42,40,38,0.05)" : "none",
          transition: "all 0.3s ease",
        }}
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => go("/")} className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: C.charcoal }}>
              <span className="font-bold text-[8px] tracking-tight" style={{ color: C.cream }}>EA</span>
            </div>
            <span className="font-medium tracking-tight text-[15px]" style={{ color: C.charcoal }}>Edge Alpha</span>
          </button>

          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: "How it works", href: "#how-it-works" },
              { label: "Pricing",      href: "#pricing" },
              { label: "For investors", href: "#for-investors" },
              { label: "Library",      href: "/library" },
            ].map((l) => (
              <a key={l.label} href={l.href}
                className="text-[13px] font-light transition-opacity hover:opacity-60"
                style={{ color: C.stone }}>
                {l.label}
              </a>
            ))}
            <button
              onClick={() => go("/login")}
              className="text-[13px] font-medium transition-opacity hover:opacity-70"
              style={{ color: C.stone }}
            >
              Sign in
            </button>
            <GetStartedDropdown
              label="Get started"
              className="text-[13px] font-semibold px-5 py-2 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${C.ember}, #C46A4A)`,
                color: "#fff", border: "none", cursor: "pointer",
                boxShadow: `0 2px 12px rgba(217,119,87,0.3)`,
              }}
              align="right"
            />
          </nav>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: C.stone }}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden px-6 py-5 space-y-4"
              style={{ background: C.cream, borderTop: `1px solid ${C.taupe}` }}
            >
              {["#how-it-works", "#pricing", "#for-investors", "/library"].map((href, i) => (
                <a key={href} href={href}
                  className="block text-sm font-light"
                  style={{ color: C.stone }}
                  onClick={() => setMobileOpen(false)}>
                  {["How it works", "Pricing", "For investors", "Library"][i]}
                </a>
              ))}
              <GetStartedDropdown
                label="Get started free"
                className="w-full text-sm font-semibold py-3 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${C.ember}, #C46A4A)`,
                  color: "#fff", border: "none", cursor: "pointer",
                }}
                align="center"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-28 sm:pt-36 pb-20 sm:pb-32 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Gradient mesh */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: `radial-gradient(at 15% 25%, rgba(217,119,87,0.09) 0%, transparent 55%),
                       radial-gradient(at 85% 75%, rgba(139,154,122,0.07) 0%, transparent 55%),
                       radial-gradient(at 60% 10%, rgba(201,169,97,0.06) 0%, transparent 45%)`,
        }} />
        {/* Morphing blob */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 70, 0], borderRadius: ["30% 70% 70% 30%", "70% 30% 30% 70%", "30% 70% 70% 30%"] }}
          transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", top: "5%", right: "-8%",
            width: 520, height: 520,
            background: `linear-gradient(135deg, ${C.goldL}, ${C.taupe})`,
            opacity: 0.22, filter: "blur(64px)", pointerEvents: "none",
          }}
        />
        {/* Dot grid */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: `radial-gradient(${C.taupe} 1px, transparent 1px)`,
          backgroundSize: "28px 28px", opacity: 0.4, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(to bottom, rgba(250,248,243,0.2) 0%, rgba(250,248,243,0.75) 60%, ${C.cream} 100%)`,
          pointerEvents: "none",
        }} />

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
          {/* copy */}
          <motion.div style={{ y: heroY }}>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3 mb-8"
            >
              <div style={{ height: 1, width: 20, background: C.charcoal }} />
              <span className="font-ea-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: C.stone }}>
                Edge Alpha · Est. 2024
              </span>
            </motion.div>

            <h1 className="text-[2.3rem] sm:text-5xl md:text-6xl xl:text-[4.25rem] leading-[1.02] tracking-tight mb-6 sm:mb-7" style={{ fontWeight: 300 }}>
              {[
                { text: "Build a fundable", serif: true },
                { text: "business.",        serif: true },
                { text: "Then raise.",      serif: false, muted: true },
              ].map((line, i) => (
                <motion.span
                  key={i}
                  style={{ display: "block", color: line.muted ? C.stone : C.charcoal }}
                  initial={{ opacity: 0, y: 32 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.16, duration: 0.75, ease }}
                >
                  {line.serif ? <em className="font-display not-italic">{line.text}</em> : line.text}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="text-[15px] sm:text-[17px] font-light leading-relaxed max-w-md mb-8 sm:mb-10"
              style={{ color: C.stone }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.72, duration: 0.6 }}
            >
              9 AI expert advisers. One investor-readiness score. 500+ verified investors waiting when you hit the bar.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.88, duration: 0.5 }}
            >
              <GetStartedDropdown
                label={<>Start free <ArrowRight className="h-4 w-4" /></>}
                className="inline-flex items-center gap-2 text-[14px] font-semibold px-7 py-3.5 rounded-full"
                style={{
                  background: `linear-gradient(135deg, ${C.ember} 0%, #C46A4A 100%)`,
                  color: "#fff", border: "none", cursor: "pointer",
                  boxShadow: `0 4px 24px rgba(217,119,87,0.38)`,
                }}
                align="left"
              />
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[14px] font-light inline-flex items-center gap-1.5 transition-opacity hover:opacity-60"
                style={{ color: C.stone }}
              >
                See how it works
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.p
              className="text-[11px] font-light mb-8"
              style={{ color: C.dim }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0, duration: 0.4 }}
            >
              10-minute setup · No credit card needed
            </motion.p>

            {/* Avatar + stat strip */}
            <motion.div
              className="flex flex-col sm:flex-row sm:items-center gap-5 pt-7"
              style={{ borderTop: `1px solid ${C.taupe}` }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.5 }}
            >
              <AvatarStack />
              <div style={{ height: 1, width: 1, background: C.taupe, display: "none" }} className="sm:block sm:h-8 sm:w-px" />
              <div className="flex items-center gap-5">
                {[["$2.3B", "raised"], ["500+", "investors"]].map(([n, l], i) => (
                  <div key={l} className="flex items-center gap-4">
                    {i > 0 && <div style={{ height: 12, width: 1, background: C.taupe }} />}
                    <span className="font-ea-mono text-[11px]" style={{ color: C.stone }}>
                      <span style={{ color: C.charcoal, fontWeight: 600 }}>{n}</span> {l}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* product mock */}
          <div className="lg:pl-4">
            <ProductMock />
          </div>
        </div>
      </section>

      {/* ── PRESS STRIP ──────────────────────────────────────────────────── */}
      <div className="py-7 sm:py-9" style={{ borderTop: `1px solid ${C.taupe}`, borderBottom: `1px solid ${C.taupe}` }}>
        <p className="font-ea-mono text-[9px] tracking-[0.28em] text-center mb-5 uppercase" style={{ color: C.dim }}>
          Founders featured in
        </p>
        <div className="mq-wrap overflow-hidden relative">
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${C.cream}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${C.cream}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
          <div className="mq-inner-l" style={{ "--mq-speed": "40s" } as React.CSSProperties}>
            {[...pressLogos, ...pressLogos].map((n, i) => (
              <span key={i} className="font-ea-mono mx-10" style={{ fontSize: 13, color: C.dim, whiteSpace: "nowrap", letterSpacing: "0.02em" }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-20 sm:py-28 px-4 sm:px-6" style={{ background: C.sand }}>
        <div className="mx-auto max-w-5xl">
          <motion.div className="text-center mb-16" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 justify-center mb-5">
              <div style={{ height: 1, width: 16, background: C.taupe }} />
              <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>How it works</span>
              <div style={{ height: 1, width: 16, background: C.taupe }} />
            </div>
            <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight" style={{ fontWeight: 300 }}>
              Three steps from idea{" "}
              <em className="font-display not-italic">to raise.</em>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.67%+16px)] right-[calc(16.67%+16px)] h-px"
              style={{ background: `repeating-linear-gradient(90deg, ${C.taupe} 0px, ${C.taupe} 6px, transparent 6px, transparent 14px)` }} />
            {[
              { num: "01", icon: BarChart3, title: "Get your Q-Score", desc: "A 10-minute assessment scores your startup across 6 investor-critical dimensions. Know exactly where you stand and what to fix first." },
              { num: "02", icon: Bot, title: "Work with your advisers", desc: "9 specialist AI agents close gaps, build assets, and strengthen every part of your business — with full context of your startup." },
              { num: "03", icon: Users, title: "Match with investors", desc: "When your Q-Score hits 70, the marketplace opens. Thesis-matched introductions to 500+ verified investors actively deploying." },
            ].map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div key={step.num} className="relative"
                  initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.13 }}>
                  {/* ghost number */}
                  <div style={{
                    position: "absolute", top: -8, left: -4,
                    fontSize: 100, fontWeight: 800, color: C.taupe,
                    lineHeight: 1, letterSpacing: "-0.05em", pointerEvents: "none",
                    fontFamily: "monospace", userSelect: "none", zIndex: 0,
                  }}>
                    {step.num}
                  </div>
                  <div className="relative z-10 pt-10 pl-1">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl mb-5"
                      style={{
                        background: i === 0 ? `rgba(217,119,87,0.1)` : i === 1 ? `rgba(37,99,235,0.08)` : `rgba(22,163,74,0.08)`,
                        border: `1px solid ${i === 0 ? "rgba(217,119,87,0.2)" : i === 1 ? "rgba(37,99,235,0.15)" : "rgba(22,163,74,0.15)"}`,
                      }}>
                      <Icon className="h-5 w-5" style={{ color: i === 0 ? C.ember : i === 1 ? "#2563EB" : "#16A34A" }} />
                    </div>
                    <h3 className="text-[15px] font-semibold mb-2">{step.title}</h3>
                    <p className="text-[13px] font-light leading-relaxed" style={{ color: C.stone }}>{step.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── THREE PILLARS ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-10 sm:mb-16" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-5">
              <div style={{ height: 1, width: 16, background: C.taupe }} />
              <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>Platform</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 className="text-3xl sm:text-4xl tracking-tight max-w-lg leading-tight" style={{ fontWeight: 300 }}>
                Three tools that{" "}<em className="font-display not-italic">work together.</em>
              </h2>
              <p className="text-[14px] font-light max-w-xs leading-relaxed" style={{ color: C.stone }}>
                Strengthen your business, prove it with data, then unlock funding.
              </p>
            </div>
          </motion.div>

          <div className="divide-y" style={{ borderTop: `1px solid ${C.taupe}` }}>
            {[
              {
                num: "01", icon: BarChart3, label: "Q-Score", accent: C.ember,
                title: "Algorithmic investment readiness scoring",
                body: "A precise, multi-dimensional score across team, market, traction, and financials. Know exactly where you stand — and what moves the needle.",
                bullets: ["Scored across 6 dimensions", "Live percentile ranking", "Prioritised improvement plan"],
              },
              {
                num: "02", icon: Bot, label: "AI Agents", accent: "#2563EB",
                title: "Expert advisers across every function",
                body: "Strategy, marketing, sales, HR, finance — each agent has deep domain knowledge of your business and is available the moment you need it.",
                bullets: ["Specialised, context-aware", "Available 24 / 7, on demand", "Every session feeds your Q-Score"],
              },
              {
                num: "03", icon: Users, label: "Marketplace", accent: C.goldD, locked: true,
                title: "Curated access to 500+ verified investors",
                body: "When your Q-Score is ready, the marketplace opens. Thesis-matched introductions to investors who are actively deploying.",
                bullets: ["500+ verified investors", "Thesis-aligned AI matching", "Gated for quality founders"],
              },
            ].map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.num}
                  className="grid md:grid-cols-12 gap-4 sm:gap-6 py-7 sm:py-10 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ backgroundColor: "rgba(245,241,232,0.6)" }}
                  onClick={() => go("/founder/onboarding")}
                  style={{ borderRadius: 10, transition: "background 0.2s", paddingLeft: 12, paddingRight: 12 }}
                >
                  {/* accent bar on hover */}
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 w-0.5 rounded-full opacity-0 group-hover:opacity-100"
                    style={{ background: p.accent, transition: "opacity 0.2s" }}
                  />
                  <div className="hidden md:block md:col-span-1">
                    <span className="text-[12px] font-mono" style={{ color: C.dim }}>{p.num}</span>
                  </div>
                  <div className="md:col-span-2 flex items-start gap-3">
                    <div className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${p.accent}15`, border: `1px solid ${p.accent}30` }}>
                      <Icon className="h-4 w-4" style={{ color: p.accent }} />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.14em] font-semibold block mt-1.5" style={{ color: p.accent }}>
                        {p.label}
                      </span>
                      {p.locked && (
                        <motion.div
                          animate={{ opacity: [0.8, 1, 0.8] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="flex items-center gap-1 mt-1"
                        >
                          <Lock className="h-2.5 w-2.5" style={{ color: C.goldD }} />
                          <span className="text-[9px] font-semibold" style={{ color: C.goldD, letterSpacing: "0.06em" }}>UNLOCKS AT 70</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <h3 className="text-[17px] leading-snug mb-2" style={{ fontWeight: 300 }}>{p.title}</h3>
                    <p className="text-[13px] font-light leading-relaxed" style={{ color: C.stone }}>{p.body}</p>
                  </div>
                  <div className="md:col-span-4">
                    <ul className="space-y-2.5">
                      {p.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2.5 text-[13px] font-light" style={{ color: C.stone }}>
                          <div className="h-1 w-1 rounded-full shrink-0" style={{ background: p.accent, opacity: 0.6 }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="hidden md:flex md:col-span-1 items-center justify-end">
                    <ArrowUpRight className="h-4 w-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: C.dim }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI AGENTS ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6" style={{ background: C.sand }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ height: 1, width: 16, background: C.taupe }} />
                <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>AI Agents</span>
              </div>
              <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight mb-7" style={{ fontWeight: 300 }}>
                Expert advisers.<br /><em className="font-display not-italic">No office hours.</em>
              </h2>
              <p className="text-[15px] font-light leading-relaxed mb-10 max-w-md" style={{ color: C.stone }}>
                Each agent carries deep domain expertise and full context of your business. Not generic advice — they know your numbers, your market, and exactly where you&apos;re falling short.
              </p>
              <div className="space-y-5 mb-10">
                {[
                  { icon: Zap, title: "On demand, any time", desc: "At 2 am before a pitch, mid-sprint, or while building your model — your advisers are always ready." },
                  { icon: Bot, title: "Context-aware by default", desc: "Every agent is pre-loaded with your profile, Q-Score data, and the full history of previous sessions." },
                  { icon: TrendingUp, title: "Progress that compounds", desc: "Conversations translate to actions. Actions move your Q-Score. Score unlocks the investor marketplace." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div key={title} className="flex gap-4"
                    initial={{ opacity: 0, x: -12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `rgba(217,119,87,0.1)`, border: `1px solid rgba(217,119,87,0.15)` }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: C.ember }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold mb-0.5">{title}</p>
                      <p className="text-[13px] font-light leading-relaxed" style={{ color: C.stone }}>{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <MagneticButton
                onClick={() => go("/founder/onboarding")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 999,
                  background: C.charcoal, color: C.cream, border: "none", cursor: "pointer",
                }}
              >
                Meet your advisers <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            </motion.div>

            {/* agent list */}
            <motion.div
              className="rounded-2xl overflow-hidden"
              style={{ background: "#FDFCFA", border: `1px solid ${C.taupe}`, boxShadow: "0 4px 24px rgba(42,40,38,0.05)" }}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              {agentRoles.map((a, i) => (
                <motion.button key={a.num}
                  className="w-full text-left px-5 py-4 flex items-center justify-between group relative overflow-hidden"
                  style={{ borderBottom: i < agentRoles.length - 1 ? `1px solid ${C.taupe}` : "none" }}
                  animate={{ backgroundColor: i === activeAgent ? `rgba(245,241,232,0.8)` : "rgba(253,252,250,0)" }}
                  whileHover={{ backgroundColor: `rgba(245,241,232,0.6)` }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={() => go("/founder/onboarding")}
                >
                  {i === activeAgent && (
                    <motion.div layoutId="agent-active-bar" style={{
                      position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
                      background: `linear-gradient(180deg, ${C.ember}, ${C.gold})`,
                      borderRadius: "0 2px 2px 0",
                    }} transition={{ type: "spring", stiffness: 300, damping: 30 }} />
                  )}
                  <div className="flex items-center gap-3.5">
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-[13px] font-bold"
                      style={{ background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}25` }}>
                      {a.emoji}
                    </div>
                    <div>
                      <p className="text-[13px] font-semibold leading-tight">{a.name} Adviser</p>
                      <p className="text-[11px] font-light mt-0.5" style={{ color: C.stone }}>{a.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {i === activeAgent && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="font-ea-mono text-[9px] px-2 py-0.5 rounded-full"
                        style={{ background: `${C.ember}15`, color: C.ember }}
                      >
                        Active
                      </motion.div>
                    )}
                    <ArrowUpRight className="h-3.5 w-3.5 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: C.dim }} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MARKETPLACE ───────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-8 sm:mb-12" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-5">
              <div style={{ height: 1, width: 16, background: C.taupe }} />
              <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>Marketplace</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight max-w-lg" style={{ fontWeight: 300 }}>
                When you&apos;re ready,{" "}<em className="font-display not-italic">the investors are waiting.</em>
              </h2>
              <motion.div
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2.5, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
                style={{ background: C.goldL, border: `1px solid ${C.gold}55` }}
              >
                <Lock className="h-3 w-3" style={{ color: C.goldD }} />
                <span className="text-[11px] font-semibold" style={{ color: C.goldD, letterSpacing: "0.04em" }}>Unlocks at Q-Score ≥ 70</span>
              </motion.div>
            </div>
          </motion.div>

          <p className="text-[12px] font-light mb-5" style={{ color: C.dim }}>Sample from our verified investor network</p>

          <motion.div className="rounded-2xl overflow-hidden" style={{ border: `1px solid ${C.taupe}` }}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            {/* visible rows */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr style={{ background: C.sand, borderBottom: `1px solid ${C.taupe}` }}>
                    {["Investor", "Check size", "Stages", "Match"].map((h, i) => (
                      <th key={h} className={`text-left py-3.5 px-5 text-[10px] uppercase tracking-[0.16em] font-semibold ${i === 1 ? "hidden sm:table-cell" : ""} ${i === 2 ? "hidden md:table-cell" : ""}`}
                        style={{ color: C.dim }}>
                        {h}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {investors.slice(0, 3).map((inv, i) => (
                    <motion.tr key={inv.name}
                      style={{ borderBottom: `1px solid ${C.taupe}` }}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07, ease }}
                      whileHover={{ backgroundColor: C.sand }}
                      onClick={() => go("/founder/onboarding")}
                      className="cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: C.sand, color: C.charcoal, border: `1px solid ${C.taupe}` }}>
                            {inv.logo}
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold">{inv.name}</p>
                            <p className="text-[11px] font-light" style={{ color: C.dim }}>{inv.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 hidden sm:table-cell text-[13px] font-light" style={{ color: C.stone }}>{inv.check}</td>
                      <td className="py-4 px-5 hidden md:table-cell text-[13px] font-light" style={{ color: C.stone }}>{inv.stages}</td>
                      <td className="py-4 px-5"><MatchBar value={inv.match} /></td>
                      <td className="py-4 px-5 text-right">
                        <button className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-60" style={{ color: C.stone }}>
                          <Mail className="h-3.5 w-3.5" /> Connect
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Locked preview */}
            <div style={{ position: "relative", overflow: "hidden" }}>
              {/* ghost rows */}
              <div style={{ filter: "blur(3.5px)", opacity: 0.45, pointerEvents: "none" }}>
                {investors.slice(3).map((inv, i) => (
                  <div key={inv.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px", borderBottom: i < 2 ? `1px solid ${C.taupe}` : "none",
                    background: "#FDFCFA",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.sand, border: `1px solid ${C.taupe}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{inv.logo}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.charcoal }}>{inv.name}</div>
                        <div style={{ fontSize: 11, color: C.dim }}>{inv.type}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                      <span style={{ fontSize: 13, color: C.stone }}>{inv.check}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.ember }}>{inv.match}%</span>
                    </div>
                  </div>
                ))}
              </div>
              {/* gradient mask */}
              <div style={{
                position: "absolute", inset: 0,
                background: `linear-gradient(to bottom, rgba(250,248,243,0.2) 0%, rgba(250,248,243,0.85) 80%)`,
                pointerEvents: "none",
              }} />
              {/* lock badge */}
              <div style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "12px 22px", background: C.cream,
                    border: `1px solid ${C.taupe}`, borderRadius: 999,
                    boxShadow: "0 8px 32px rgba(42,40,38,0.12)",
                  }}
                >
                  <Lock style={{ width: 14, height: 14, color: C.goldD }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.charcoal }}>
                    497 more investors unlock at Q-Score 70
                  </span>
                  <button
                    onClick={() => go("/founder/onboarding")}
                    style={{
                      fontSize: 12, fontWeight: 600, padding: "5px 14px", borderRadius: 999,
                      background: C.charcoal, color: C.cream, border: "none", cursor: "pointer",
                    }}
                  >
                    Start →
                  </button>
                </motion.div>
              </div>
            </div>

            <div className="px-5 py-4 flex items-center justify-between" style={{ background: C.sand, borderTop: `1px solid ${C.taupe}` }}>
              <span className="text-[12px] font-light" style={{ color: C.dim }}>Showing 3 of 500+ investors</span>
              <button className="text-[12px] font-semibold inline-flex items-center gap-1 transition-opacity hover:opacity-60"
                style={{ color: C.charcoal }} onClick={() => go("/founder/onboarding")}>
                Unlock full marketplace <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS — DARK ─────────────────────────────────────────────────── */}
      <div style={{ background: C.midnight }}>
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4">
          {stats.map((s, i) => (
            <motion.div key={s.label}
              className="px-6 sm:px-10 py-12 sm:py-16 text-center"
              style={{
                borderRight: i < stats.length - 1 ? `1px solid rgba(255,255,255,0.06)` : "none",
                borderBottom: i < 2 ? `1px solid rgba(255,255,255,0.06)` : "none",
              }}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, ease }}>
              <p className="font-ea-mono tracking-tight mb-3" style={{ fontWeight: 400, color: C.ember, fontSize: "clamp(28px,4vw,44px)" }}>
                <CountUp to={s.to} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="font-ea-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "rgba(255,255,255,0.3)" }}>
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-10 sm:mb-14" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-5">
              <div style={{ height: 1, width: 16, background: C.taupe }} />
              <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>Testimonials</span>
            </div>
            <h2 className="text-3xl sm:text-4xl tracking-tight max-w-sm leading-tight" style={{ fontWeight: 300 }}>
              What founders and{" "}<em className="font-display not-italic">investors say.</em>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div key={t.name}
                className="p-6 rounded-2xl flex flex-col"
                style={{ background: C.sand, border: `1px solid ${C.taupe}` }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 }}
                whileHover={{ y: -4, boxShadow: "0 12px 32px rgba(42,40,38,0.08)" }}
              >
                <StarRating />
                <div className="font-display leading-none mb-3 select-none" style={{ fontSize: 40, color: C.ember, opacity: 0.3, fontStyle: "italic" }}>
                  &ldquo;
                </div>
                <p style={{ fontSize: 13, fontWeight: 300, lineHeight: 1.8, color: "#5A5650", flex: 1, marginBottom: 20 }}>
                  {t.quote}
                </p>
                <div className="flex items-center gap-3 pt-4" style={{ borderTop: `1px solid ${C.taupe}` }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: t.bg, color: t.tc,
                    fontSize: 10, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, letterSpacing: "0.02em",
                  }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-ea-mono text-[11px] font-semibold" style={{ color: C.charcoal }}>{t.name}</p>
                    <p className="font-ea-mono text-[10px]" style={{ color: C.stone }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR INVESTORS ─────────────────────────────────────────────────── */}
      <section id="for-investors" className="py-16 sm:py-28 px-4 sm:px-6" style={{ background: C.sand }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div className="flex items-center gap-3 mb-5">
                <div style={{ height: 1, width: 16, background: C.taupe }} />
                <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>For Investors</span>
              </div>
              <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight mb-6" style={{ fontWeight: 300 }}>
                Better deal flow.<br /><em className="font-display not-italic">Less noise.</em>
              </h2>
              <p className="text-[15px] font-light leading-relaxed mb-8 max-w-md" style={{ color: C.stone }}>
                Every founder in the marketplace has been scored algorithmically across six dimensions. You see pre-qualified, thesis-matched startups — not cold inbound.
              </p>
              <ul className="space-y-3 mb-8">
                {["Algorithmic Q-Score on every deal", "Thesis-matched AI recommendations", "Founders who have done the preparation work", "Automated due-diligence summaries"].map((f, i) => (
                  <motion.li key={f} className="flex items-start gap-3 text-[14px] font-light" style={{ color: C.stone }}
                    initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.09 }}>
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: C.sage }} />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <MagneticButton
                onClick={() => go("/investor/onboarding")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 14, fontWeight: 600, padding: "12px 24px", borderRadius: 999,
                  background: C.charcoal, color: C.cream, border: "none", cursor: "pointer",
                }}
              >
                Join as an investor <ArrowRight className="h-4 w-4" />
              </MagneticButton>
            </motion.div>

            <motion.div className="space-y-px rounded-2xl overflow-hidden"
              style={{ border: `1px solid ${C.taupe}`, boxShadow: "0 4px 24px rgba(42,40,38,0.05)" }}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}>
              {[
                { name: "NeuralTech",  tag: "AI · Series A",     score: 891, match: 94, hot: true },
                { name: "CloudScale",  tag: "DevTools · Seed",   score: 847, match: 91, hot: false },
                { name: "HealthOS",    tag: "HealthTech · Seed", score: 823, match: 88, hot: false },
              ].map((d, i) => (
                <motion.div key={d.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-5 gap-3 sm:gap-0"
                  style={{ background: "#FDFCFA", borderBottom: i < 2 ? `1px solid ${C.taupe}` : "none" }}
                  initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1 }}
                  whileHover={{ backgroundColor: C.sand }}>
                  <div>
                    <div className="flex items-center gap-2.5 mb-0.5">
                      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                        style={{ width: 6, height: 6, borderRadius: "50%", background: C.sage, flexShrink: 0 }} />
                      <p className="text-[14px] font-semibold">{d.name}</p>
                      {d.hot && (
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 4, background: "rgba(217,119,87,0.12)", color: C.ember, letterSpacing: "0.06em" }}>
                          HOT
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-light mt-0.5" style={{ color: C.dim }}>{d.tag}</p>
                  </div>
                  <div className="flex items-center gap-5 sm:gap-7">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-0.5" style={{ color: C.dim }}>Q-Score</p>
                      <p className="text-[15px] font-semibold" style={{ color: C.ember }}>{d.score}</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] font-semibold mb-0.5" style={{ color: C.dim }}>Match</p>
                      <p className="text-[15px] font-semibold">{d.match}%</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 hidden sm:block" style={{ color: C.dim }} />
                  </div>
                </motion.div>
              ))}
              <div className="px-6 py-3.5 text-center" style={{ background: C.sand, borderTop: `1px solid ${C.taupe}` }}>
                <p className="text-[12px] font-light" style={{ color: C.dim }}>
                  <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, repeat: Infinity }} style={{ display: "inline-block" }}>●</motion.span>
                  {" "}+ 127 more matches this week
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-16 sm:py-28 px-4 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div className="text-center mb-10 sm:mb-12" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 justify-center mb-5">
              <div style={{ height: 1, width: 16, background: C.taupe }} />
              <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>Pricing</span>
              <div style={{ height: 1, width: 16, background: C.taupe }} />
            </div>
            <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight mb-8" style={{ fontWeight: 300 }}>
              Start free.{" "}<em className="font-display not-italic">Scale when you&apos;re raising.</em>
            </h2>
            <div className="flex justify-center">
              <BillingToggle annual={annual} onChange={setAnnual} />
            </div>
          </motion.div>

          <motion.div className="grid md:grid-cols-2 overflow-hidden"
            style={{ border: `1px solid ${C.taupe}`, borderRadius: 20, boxShadow: "0 4px 40px rgba(42,40,38,0.06)" }}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            {/* Free */}
            <div className="p-8 sm:p-10" style={{ borderBottom: `1px solid ${C.taupe}` }}>
              <span className="font-ea-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: C.dim }}>Free</span>
              <div className="font-ea-mono text-5xl sm:text-6xl mt-5 mb-1 tracking-tight" style={{ fontWeight: 400 }}>$0</div>
              <p className="font-ea-mono text-[11px] mb-8" style={{ color: C.stone }}>Forever · No credit card</p>
              <ul className="mb-8" style={{ borderTop: `1px solid ${C.taupe}` }}>
                {["Full Q-Score assessment", "3 AI advisers (Strategy, Finance, Marketing)", "Workspace & deliverables", "Score improvement plan"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[13px] font-light py-3" style={{ color: C.stone, borderBottom: `1px solid ${C.taupe}` }}>
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: C.sage }} /> {f}
                  </li>
                ))}
              </ul>
              <MagneticButton onClick={() => go("/founder/onboarding")} style={{
                width: "100%", padding: "13px", borderRadius: 999, fontSize: 14, fontWeight: 500,
                border: `1px solid ${C.taupe}`, color: C.charcoal, background: "transparent", cursor: "pointer",
              }}>
                Get started free
              </MagneticButton>
            </div>

            {/* Pro */}
            <div className="p-8 sm:p-10 relative overflow-hidden" style={{
              background: C.midnight,
              boxShadow: `inset 0 0 80px rgba(201,169,97,0.07), 0 0 0 1px rgba(201,169,97,0.12)`,
            }}>
              {/* shimmer sweep */}
              <motion.div
                animate={{ x: ["-100%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: "easeInOut" }}
                style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: "100%",
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.025), transparent)",
                  pointerEvents: "none",
                }}
              />
              <div className="flex items-center justify-between mb-5">
                <span className="font-ea-mono text-[10px] tracking-[0.22em] uppercase" style={{ color: "rgba(255,255,255,0.35)" }}>Pro</span>
                <motion.span
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="font-ea-mono text-[9px] tracking-[0.1em] uppercase px-2.5 py-1 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, rgba(247,239,217,0.1), rgba(201,169,97,0.12))`,
                    color: C.gold, border: `1px solid ${C.gold}30`,
                  }}>
                  Most popular
                </motion.span>
              </div>
              <div className="font-ea-mono tracking-tight mt-1 mb-1" style={{ fontWeight: 400, color: C.cream }}>
                <span style={{ fontSize: "clamp(40px,5vw,56px)" }}>
                  {annual ? "$39" : "$49"}
                </span>
                <span style={{ fontSize: 22, color: "rgba(255,255,255,0.4)" }}>/mo</span>
              </div>
              {annual && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-ea-mono text-[10px] mb-1" style={{ color: C.gold }}>
                  Billed ${39 * 12}/yr · 2 months free
                </motion.p>
              )}
              <p className="font-ea-mono text-[11px] mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>Cancel anytime</p>
              <ul className="mb-8" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {["Everything in Free", "All 9 AI advisers", "Investor marketplace (unlocks at Q-Score 70)", "Academy cohort access", "Priority support"].map((f) => (
                  <li key={f} className="flex items-start gap-3 text-[13px] font-light py-3" style={{ color: "rgba(255,255,255,0.5)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <CheckCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: C.gold, opacity: 0.8 }} /> {f}
                  </li>
                ))}
              </ul>
              <MagneticButton onClick={() => go("/founder/onboarding")} style={{
                width: "100%", padding: "13px", borderRadius: 999, fontSize: 14, fontWeight: 700,
                background: `linear-gradient(135deg, ${C.ember}, #C46A4A)`,
                color: "#fff", border: "none", cursor: "pointer",
                boxShadow: `0 4px 24px rgba(217,119,87,0.4)`,
              }}>
                Start Pro free →
              </MagneticButton>
            </div>
          </motion.div>

          <p className="text-center text-[12px] font-light mt-5" style={{ color: C.dim }}>
            Pro includes a 14-day free trial. No charge until you decide to continue.
          </p>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-28 px-4 sm:px-6" style={{ background: C.sand }}>
        <div className="mx-auto max-w-2xl">
          <motion.div className="mb-10 sm:mb-12" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div className="flex items-center gap-3 mb-5">
              <div style={{ height: 1, width: 16, background: C.taupe }} />
              <span className="font-ea-mono text-[9px] tracking-[0.3em] uppercase" style={{ color: C.stone }}>FAQ</span>
            </div>
            <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight" style={{ fontWeight: 300 }}>
              <em className="font-display not-italic">Common questions.</em>
            </h2>
          </motion.div>
          <div style={{ borderTop: `1px solid ${C.taupe}` }}>
            {[
              { q: "What is Q-Score and how is it calculated?", a: "Q-Score is an algorithmic investment-readiness score from 0–100. It measures your startup across 6 dimensions: team, market, traction, financials, product, and go-to-market. Each dimension is scored based on evidence you provide and the deliverables you build with your AI advisers." },
              { q: "Are the investors real and verified?", a: "Yes. Every investor in the marketplace has been manually verified by our team. We confirm their fund status, check sizes, and investment theses before they appear. We do not accept inbound from investors — they apply to join." },
              { q: "How do the AI agents know about my business?", a: "When you sign up, you complete a startup profile. This context is automatically loaded into every agent session. As you build deliverables, each agent also sees what other agents have produced — so they all work from the same picture of your company." },
              { q: "Is my data secure and private?", a: "All data is encrypted at rest and in transit. Your startup information is never shared with investors until you explicitly request a connection. We do not train our AI models on your data." },
              { q: "What's the difference between Free and Pro?", a: "Free gives you the full Q-Score assessment and 3 AI advisers (Strategy, Finance, Marketing). Pro unlocks all 9 advisers, the investor marketplace (once your Q-Score hits 70), Academy cohort access, and priority support." },
              { q: "How long does it take to get investor intros?", a: "Founders who enter the marketplace with a Q-Score of 75+ typically receive their first investor response within 2 weeks. The median time to a term sheet from marketplace entry is 6–10 weeks." },
            ].map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                style={{ borderBottom: `1px solid ${C.taupe}` }}>
                <button className="w-full py-5 flex items-start justify-between gap-4 text-left"
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                  <span className="text-[15px] font-light">{item.q}</span>
                  <motion.div
                    animate={{ rotate: faqOpen === i ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{ flexShrink: 0 }}>
                    <ChevronDown className="h-4 w-4 mt-0.5" style={{ color: faqOpen === i ? C.ember : C.stone }} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease }} style={{ overflow: "hidden" }}>
                      <p className="pb-5 text-[14px] font-light leading-relaxed" style={{ color: C.stone, paddingLeft: 0 }}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KNOWLEDGE LIBRARY ─────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6" style={{ background: C.cream, borderTop: `1px solid ${C.taupe}` }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <span className="font-ea-mono text-[10px] tracking-[0.28em] uppercase block mb-3" style={{ color: C.stone }}>Free resource</span>
              <h2 className="text-3xl sm:text-4xl tracking-tight" style={{ fontWeight: 300 }}>Startup Playbook Library</h2>
              <p className="mt-3 text-base font-light max-w-xl" style={{ color: C.stone }}>
                60+ curated frameworks from YC, a16z, Bessemer, and HBR — surfaced by your AI team when you need them.
              </p>
            </div>
            <a href="/library" className="shrink-0 inline-flex items-center gap-2 text-[13px] font-semibold px-5 py-2.5 rounded-full transition-all hover:scale-[1.03]"
              style={{ background: C.charcoal, color: C.cream }}>
              Browse library →
            </a>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: "⚙️", type: "Framework", title: "SaaS Metrics 2.0",           source: "David Skok · For Entrepreneurs", fn: "CFO", color: "#D97706" },
              { icon: "📋", type: "Playbook",  title: "ICP Narrowing Worksheet",    source: "First Round Capital",           fn: "CMO", color: "#2563EB" },
              { icon: "📖", type: "Framework", title: "The Burn Multiple",          source: "David Sacks · Craft Ventures",   fn: "CFO", color: "#D97706" },
              { icon: "⚙️", type: "Framework", title: "MEDDIC Sales Qualification", source: "Jack Napoli · PTC",             fn: "CRO", color: "#16A34A" },
              { icon: "📖", type: "Guide",     title: "How to Find PMF",            source: "Gustaf Alströmer · YC",         fn: "CPO", color: "#DB2777" },
              { icon: "⚙️", type: "Framework", title: "7 Powers: Competitive Moats", source: "Hamilton Helmer",             fn: "CSO", color: "#059669" },
            ].map((r) => (
              <motion.a key={r.title} href="/library"
                className="block p-5 rounded-2xl"
                style={{ background: C.sand, border: `1px solid ${C.taupe}`, textDecoration: "none" }}
                whileHover={{ y: -4, boxShadow: "0 10px 28px rgba(42,40,38,0.09)" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                <div className="flex items-start gap-3">
                  <div className="text-2xl mt-0.5 shrink-0">{r.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded" style={{ background: r.color + "1A", color: r.color }}>{r.fn}</span>
                      <span className="text-[10px]" style={{ color: C.dim }}>{r.type}</span>
                    </div>
                    <p className="text-[14px] font-semibold leading-snug mb-1">{r.title}</p>
                    <p className="text-[12px] font-light" style={{ color: C.stone }}>{r.source}</p>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — DARK ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: C.midnight }}>
        {/* ember blob */}
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 40, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          style={{
            position: "absolute", top: "20%", left: "50%", transform: "translateX(-50%)",
            width: 700, height: 450,
            background: `radial-gradient(ellipse, rgba(217,119,87,0.12) 0%, transparent 70%)`,
            pointerEvents: "none", filter: "blur(60px)",
          }}
        />
        {/* gold blob */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], rotate: [0, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear", delay: 5 }}
          style={{
            position: "absolute", bottom: "10%", right: "10%",
            width: 400, height: 300,
            background: `radial-gradient(ellipse, rgba(201,169,97,0.08) 0%, transparent 70%)`,
            pointerEvents: "none", filter: "blur(50px)",
          }}
        />

        <motion.div className="mx-auto max-w-3xl relative py-28 sm:py-44 px-4 sm:px-6 text-center"
          initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 48 }} />
          <span className="font-ea-mono text-[10px] tracking-[0.3em] uppercase block mb-8" style={{ color: "rgba(255,255,255,0.3)" }}>
            Ready to raise
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl xl:text-[4.5rem] tracking-tight leading-[1.0] mb-10" style={{ fontWeight: 300, color: C.cream }}>
            Build the company<br />
            <em className="font-display not-italic" style={{ color: C.goldL }}>investors want to fund.</em>
          </h2>
          <GetStartedDropdown
            label={<>Start free <ArrowRight className="h-4 w-4" /></>}
            className="inline-flex items-center justify-center gap-2 font-semibold px-9 py-4 rounded-full text-[15px]"
            style={{
              background: `linear-gradient(135deg, ${C.ember} 0%, #C46A4A 100%)`,
              color: "#fff", border: "none", cursor: "pointer",
              boxShadow: `0 6px 32px rgba(217,119,87,0.4)`,
            }}
            align="center"
          />
          <p className="font-ea-mono text-[11px] mt-6" style={{ color: "rgba(255,255,255,0.2)" }}>
            10-minute setup · No credit card · Free forever
          </p>

          {/* mini stats */}
          <div className="grid grid-cols-3 gap-4 mt-16 pt-10" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            {[["$2.3B+", "Raised via platform"], ["10,000+", "Active founders"], ["500+", "Verified investors"]].map(([n, l]) => (
              <div key={l}>
                <p className="font-ea-mono text-xl sm:text-2xl font-medium mb-1" style={{ color: C.cream }}>{n}</p>
                <p className="font-ea-mono text-[10px] uppercase tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.25)" }}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginTop: 48 }} />
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="py-10 sm:py-14 px-4 sm:px-6" style={{ background: C.midnight, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 mb-10">
            <div className="col-span-2 md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <span className="font-bold text-[8px]" style={{ color: "rgba(255,255,255,0.7)" }}>EA</span>
                </div>
                <span className="font-medium text-[15px]" style={{ color: "rgba(255,255,255,0.6)" }}>Edge Alpha</span>
              </div>
              <p className="text-[13px] font-light leading-relaxed max-w-[220px]" style={{ color: "rgba(255,255,255,0.25)" }}>
                AI-powered advisers and investor marketplace for ambitious founders.
              </p>
            </div>
            {[
              { title: "Product", links: [
                { label: "Q-Score", href: "/founder/improve-qscore" },
                { label: "CXO Suite", href: "/founder/agents" },
                { label: "Academy", href: "/founder/academy" },
                { label: "Investor Matching", href: "/founder/matching" },
              ]},
              { title: "Resources", links: [
                { label: "Startup Library", href: "/library" },
                { label: "Frameworks", href: "/library?type=framework" },
                { label: "Playbooks", href: "/library?type=playbook" },
                { label: "Templates", href: "/library?type=template" },
              ]},
              { title: "Company", links: [
                { label: "For Founders", href: "/founder/onboarding" },
                { label: "For Investors", href: "/investor/onboarding" },
                { label: "Contact", href: "#" },
                { label: "Privacy", href: "#" },
              ]},
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[10px] uppercase tracking-[0.18em] font-semibold mb-4" style={{ color: "rgba(255,255,255,0.2)" }}>{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} className="text-[13px] font-light transition-opacity hover:opacity-80"
                        style={{ color: "rgba(255,255,255,0.35)" }}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[12px] font-light" style={{ color: "rgba(255,255,255,0.2)" }}>&copy; 2026 Edge Alpha. All rights reserved.</p>
            <div className="flex items-center gap-5 text-[11px] font-light tracking-[0.1em]" style={{ color: "rgba(255,255,255,0.15)" }}>
              <span>SECURE</span><span>PRIVATE</span><span>AI-POWERED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
