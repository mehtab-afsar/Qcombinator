"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion, AnimatePresence, useInView,
} from "framer-motion";
import {
  ArrowRight, ArrowUpRight, BarChart3, Bot, CheckCircle,
  ChevronDown, ChevronRight, Lock, Mail, Menu,
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
  gold:     "#C9A961",
  goldD:    "#9A7B3C",
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

const mockDimensions = [
  { label: "Team",       score: 82, delta: "+4" },
  { label: "Market",     score: 78, delta: "+6" },
  { label: "Traction",   score: 71, delta: "+12" },
  { label: "Financials", score: 65, delta: "-2" },
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
      <div style={{ height: 3, width: 56, borderRadius: 999, background: C.taupe, overflow: "hidden" }}>
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

// ─── GetStartedDropdown ───────────────────────────────────────────────────────
function GetStartedDropdown({
  label, style, align = "center", dark = false,
}: {
  label: React.ReactNode; style?: React.CSSProperties; align?: "left" | "center" | "right"; dark?: boolean;
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
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 15, fontWeight: 500, padding: "14px 28px", borderRadius: 6,
          background: dark ? C.charcoal : C.ember,
          color: "#fff", border: "none", cursor: "pointer",
          transition: "opacity 0.15s ease",
          ...style,
        }}
      >
        {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.14 }}
            style={{
              position: "absolute", top: "calc(100% + 10px)", ...alignStyle,
              background: C.cream, border: `1px solid ${C.taupe}`, borderRadius: 12,
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

// ─── ProductMock ──────────────────────────────────────────────────────────────
function ProductMock() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.6, ease }}
      style={{
        background: "white",
        borderRadius: 12,
        border: `1px solid ${C.taupe}`,
        boxShadow: "0 1px 2px rgba(42,40,38,0.04), 0 8px 24px rgba(42,40,38,0.06), 0 32px 64px rgba(42,40,38,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Window chrome */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${C.taupe}`,
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: "#FAFAF9",
      }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.taupe }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.taupe }} />
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: C.taupe }} />
        <span style={{
          marginLeft: "auto",
          fontFamily: "monospace",
          fontSize: 11,
          color: C.dim,
          letterSpacing: "0.04em",
        }}>
          edgealpha.co/dashboard
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: 24 }}>
        {/* Score header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{
              fontSize: 11,
              color: C.dim,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 4,
              fontFamily: "monospace",
            }}>
              Q-Score
            </div>
            <div style={{
              fontFamily: "monospace",
              fontSize: 48,
              fontWeight: 300,
              color: C.charcoal,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}>
              74
              <span style={{ fontSize: 20, color: C.dim }}>/100</span>
            </div>
          </div>
          <div style={{
            background: "#FFF8F5",
            border: "1px solid #F5E8E2",
            borderRadius: 8,
            padding: "12px 16px",
            textAlign: "center",
          }}>
            <div style={{
              fontFamily: "monospace",
              fontSize: 28,
              fontWeight: 400,
              color: C.ember,
              lineHeight: 1,
            }}>B+</div>
            <div style={{
              fontSize: 10,
              color: C.dim,
              marginTop: 4,
              letterSpacing: "0.04em",
              fontFamily: "monospace",
            }}>Top 34%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ height: 4, background: C.taupe, borderRadius: 2, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={inView ? { width: "74%" } : { width: 0 }}
              transition={{ duration: 1.2, delay: 0.8, ease }}
              style={{
                height: "100%",
                background: `linear-gradient(90deg, ${C.ember}, ${C.gold})`,
                borderRadius: 2,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>0</span>
            <span style={{ fontSize: 10, color: C.sage, fontFamily: "monospace" }}>↑ 70 investor threshold</span>
            <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>100</span>
          </div>
        </div>

        {/* Dimension rows */}
        {mockDimensions.map((dim) => (
          <div key={dim.label} style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 10,
          }}>
            <span style={{
              fontSize: 12,
              color: C.stone,
              width: 72,
              flexShrink: 0,
            }}>
              {dim.label}
            </span>
            <div style={{
              flex: 1,
              height: 3,
              background: C.taupe,
              borderRadius: 2,
              overflow: "hidden",
            }}>
              <motion.div
                initial={{ width: 0 }}
                animate={inView ? { width: `${dim.score}%` } : { width: 0 }}
                transition={{ duration: 0.8, delay: 1.0, ease }}
                style={{
                  height: "100%",
                  background: C.charcoal,
                  borderRadius: 2,
                  opacity: 0.15 + (dim.score / 100) * 0.85,
                }}
              />
            </div>
            <span style={{
              fontFamily: "monospace",
              fontSize: 11,
              color: C.charcoal,
              width: 24,
              textAlign: "right",
            }}>
              {dim.score}
            </span>
            <span style={{
              fontFamily: "monospace",
              fontSize: 10,
              color: dim.delta.startsWith("+") ? C.sage : C.ember,
              width: 28,
              textAlign: "right",
            }}>
              {dim.delta}
            </span>
          </div>
        ))}

        {/* Action item */}
        <div style={{
          marginTop: 16,
          padding: 12,
          background: C.cream,
          borderRadius: 6,
          border: `1px solid ${C.taupe}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: C.ember,
            flexShrink: 0,
          }} />
          <span style={{ fontSize: 12, color: C.stone, lineHeight: 1.4 }}>
            Improve Financials score by adding a 24-month model
          </span>
        </div>
      </div>
    </motion.div>
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
      <span style={{ fontSize: 12, color: annual ? C.dim : C.charcoal, fontWeight: annual ? 300 : 500 }}>Monthly</span>
      <button
        onClick={() => onChange(!annual)}
        style={{
          width: 40, height: 22, borderRadius: 999,
          background: annual ? C.charcoal : C.faint,
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
      <span style={{ fontSize: 12, color: annual ? C.charcoal : C.dim, fontWeight: annual ? 500 : 300 }}>Annual</span>
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
  const [annual, setAnnual]         = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
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

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50"
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          background: scrolled ? "rgba(250,248,243,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.taupe}` : "1px solid transparent",
          transition: "all 0.2s ease",
        }}
        initial={{ y: -56 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 w-full flex items-center justify-between">
          <button
            onClick={() => go("/")}
            style={{
              fontFamily: "monospace",
              fontSize: 14,
              fontWeight: 500,
              color: C.charcoal,
              letterSpacing: "-0.01em",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            Edge Alpha
          </button>

          <nav className="hidden md:flex items-center gap-6">
            {[
              { label: "How it works", href: "#how-it-works" },
              { label: "Pricing",      href: "#pricing" },
              { label: "Library",      href: "/library" },
            ].map((l) => (
              <a key={l.label} href={l.href}
                style={{
                  fontSize: 14,
                  color: C.stone,
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}>
                {l.label}
              </a>
            ))}
            <button
              onClick={() => go("/login")}
              style={{ fontSize: 14, color: C.stone, background: "none", border: "none", cursor: "pointer" }}
            >
              Sign in
            </button>
            <button
              onClick={() => go("/founder/onboarding")}
              style={{
                background: C.charcoal,
                color: "white",
                padding: "8px 16px",
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
                transition: "opacity 0.15s",
              }}
            >
              Get started
            </button>
          </nav>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: C.stone, background: "none", border: "none", cursor: "pointer" }}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{
                position: "absolute",
                top: 56,
                left: 0,
                right: 0,
                background: C.cream,
                borderTop: `1px solid ${C.taupe}`,
                padding: "20px 24px",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {[{ label: "How it works", href: "#how-it-works" }, { label: "Pricing", href: "#pricing" }, { label: "Library", href: "/library" }].map((l) => (
                <a key={l.label} href={l.href}
                  style={{ fontSize: 14, color: C.stone, textDecoration: "none" }}
                  onClick={() => setMobileOpen(false)}>
                  {l.label}
                </a>
              ))}
              <button
                onClick={() => { go("/founder/onboarding"); setMobileOpen(false); }}
                style={{
                  background: C.ember, color: "white",
                  padding: "12px", borderRadius: 6,
                  fontSize: 14, fontWeight: 500,
                  border: "none", cursor: "pointer",
                }}
              >
                Get started free
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-36 sm:pt-44 pb-24 sm:pb-32 px-6 lg:px-8 relative overflow-hidden">
        {/* Single subtle background glow — no blobs */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 60% 0%, rgba(217,119,87,0.05) 0%, transparent 55%)",
          pointerEvents: "none",
        }} />

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center relative">
          {/* Left: copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              style={{ marginBottom: 32 }}
            >
              <span style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: C.ember,
                fontWeight: 500,
              }}>
                Investment readiness platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2, ease }}
              style={{
                fontSize: "clamp(44px, 6vw, 80px)",
                fontWeight: 300,
                letterSpacing: "-0.035em",
                lineHeight: 1.0,
                color: C.charcoal,
                marginBottom: 24,
              }}
            >
              Build a fundable<br />
              <em style={{ fontStyle: "italic" }}>business.</em>
              <span style={{ color: C.ember }}> Then raise.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              style={{
                fontSize: 17,
                lineHeight: 1.65,
                color: C.stone,
                maxWidth: 480,
                marginBottom: 40,
                fontWeight: 400,
              }}
            >
              Nine AI advisers evaluate your company across six dimensions
              and give you an investor-readiness score. Raise when you hit 70.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.55 }}
              style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}
            >
              <GetStartedDropdown
                label={<>Start free <ArrowRight size={15} strokeWidth={2} /></>}
                align="left"
              />
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                style={{
                  fontSize: 15,
                  color: C.stone,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
              >
                How it works
              </button>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.4 }}
              style={{ fontSize: 12, color: C.dim, marginBottom: 40, fontFamily: "monospace" }}
            >
              10-minute setup · No credit card needed
            </motion.p>

            {/* Social proof */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.5 }}
              style={{
                paddingTop: 32,
                borderTop: `1px solid ${C.taupe}`,
                display: "flex",
                alignItems: "center",
                gap: 32,
              }}
            >
              {[
                { value: "$2.3B", label: "raised" },
                { value: "10k+", label: "founders" },
                { value: "500+", label: "investors" },
              ].map(stat => (
                <div key={stat.label}>
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: 20,
                    fontWeight: 400,
                    color: C.charcoal,
                    letterSpacing: "-0.02em",
                  }}>
                    {stat.value}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: C.stone,
                    marginTop: 2,
                    letterSpacing: "0.04em",
                  }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: product mock */}
          <div className="hidden lg:block">
            <ProductMock />
          </div>
        </div>
      </section>

      {/* ── PRESS STRIP ──────────────────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${C.taupe}`, borderBottom: `1px solid ${C.taupe}`, paddingTop: 28, paddingBottom: 28 }}>
        <p style={{
          fontFamily: "monospace",
          fontSize: 9,
          letterSpacing: "0.28em",
          textAlign: "center",
          marginBottom: 20,
          textTransform: "uppercase",
          color: C.dim,
        }}>
          Founders featured in
        </p>
        <div className="mq-wrap overflow-hidden relative">
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${C.cream}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${C.cream}, transparent)`, zIndex: 1, pointerEvents: "none" }} />
          <div className="mq-inner-l" style={{ "--mq-speed": "50s" } as React.CSSProperties}>
            {[...pressLogos, ...pressLogos].map((n, i) => (
              <span key={i} style={{
                fontFamily: "monospace",
                fontSize: 13,
                color: C.dim,
                whiteSpace: "nowrap",
                letterSpacing: "0.06em",
                margin: "0 40px",
              }}>
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ background: C.cream, padding: "128px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: 64 }}
          >
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: C.ember,
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              How it works
            </div>
            <h2 style={{
              fontSize: "clamp(32px, 4vw, 48px)",
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: C.charcoal,
            }}>
              From assessment<br />to investment.
            </h2>
          </motion.div>

          {[
            {
              number: "01",
              title: "Get your Q-Score",
              body: "Complete a 10-minute assessment. Six dimensions. One honest number that tells you exactly where you stand.",
            },
            {
              number: "02",
              title: "Work with your advisers",
              body: "Nine AI specialists — strategy, marketing, finance, legal — guide your improvement with full context of your business.",
            },
            {
              number: "03",
              title: "Raise when you hit 70",
              body: "At Q-Score ≥ 70, your company matches with verified investors who fit your thesis, stage, and check size.",
            },
          ].map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease }}
              style={{
                display: "grid",
                gridTemplateColumns: "48px 1fr",
                gap: "0 24px",
                paddingBottom: 48,
                borderBottom: i < 2 ? `1px solid ${C.taupe}` : "none",
                marginBottom: i < 2 ? 48 : 0,
              }}
            >
              <div style={{
                fontFamily: "monospace",
                fontSize: 12,
                color: C.dim,
                paddingTop: 4,
                letterSpacing: "0.04em",
              }}>
                {step.number}
              </div>
              <div>
                <h3 style={{
                  fontSize: 20,
                  fontWeight: 500,
                  color: C.charcoal,
                  letterSpacing: "-0.015em",
                  marginBottom: 8,
                }}>
                  {step.title}
                </h3>
                <p style={{
                  fontSize: 16,
                  lineHeight: 1.65,
                  color: C.stone,
                }}>
                  {step.body}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── THREE PILLARS ─────────────────────────────────────────────────── */}
      <section style={{ background: C.sand, padding: "128px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            style={{ marginBottom: 64 }}
          >
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: C.stone,
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              Platform
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.charcoal,
                maxWidth: 480,
              }}>
                Three tools that work together.
              </h2>
              <p style={{ fontSize: 14, color: C.stone, maxWidth: 280, lineHeight: 1.6, fontWeight: 400 }}>
                Strengthen your business, prove it with data, then unlock funding.
              </p>
            </div>
          </motion.div>

          <div style={{ borderTop: `1px solid ${C.taupe}` }}>
            {[
              {
                num: "01", icon: BarChart3, label: "Q-Score", accent: C.ember,
                title: "Algorithmic investment readiness scoring",
                body: "A precise, multi-dimensional score across team, market, traction, and financials. Know exactly where you stand and what moves the needle.",
                bullets: ["Scored across 6 dimensions", "Live percentile ranking", "Prioritised improvement plan"],
              },
              {
                num: "02", icon: Bot, label: "AI Agents", accent: "#2563EB",
                title: "Expert advisers across every function",
                body: "Strategy, marketing, sales, HR, finance — each agent has deep domain knowledge of your business and is available the moment you need it.",
                bullets: ["Specialised, context-aware", "Available 24/7, on demand", "Every session feeds your Q-Score"],
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
                  className="grid md:grid-cols-12 gap-6 group cursor-pointer"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  onClick={() => go("/founder/onboarding")}
                  style={{
                    padding: "40px 16px",
                    borderBottom: i < 2 ? `1px solid ${C.taupe}` : "none",
                    position: "relative",
                    transition: "background 0.2s",
                  }}
                  whileHover={{ backgroundColor: "rgba(250,248,243,0.6)" }}
                >
                  <motion.div
                    className="absolute left-0 top-0 bottom-0 opacity-0 group-hover:opacity-100"
                    style={{ width: 2, background: p.accent, transition: "opacity 0.2s" }}
                  />
                  <div className="hidden md:block md:col-span-1">
                    <span style={{ fontSize: 12, fontFamily: "monospace", color: C.dim }}>{p.num}</span>
                  </div>
                  <div className="md:col-span-2 flex items-start gap-3">
                    <div className="h-8 w-8 rounded flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${p.accent}15`, border: `1px solid ${p.accent}30` }}>
                      <Icon className="h-4 w-4" style={{ color: p.accent }} />
                    </div>
                    <div>
                      <span style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 600, display: "block", marginTop: 6, color: p.accent }}>
                        {p.label}
                      </span>
                      {p.locked && (
                        <div className="flex items-center gap-1 mt-1">
                          <Lock className="h-2.5 w-2.5" style={{ color: C.goldD }} />
                          <span style={{ fontSize: 9, fontWeight: 600, color: C.goldD, letterSpacing: "0.06em", fontFamily: "monospace" }}>UNLOCKS AT 70</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-4">
                    <h3 style={{ fontSize: 17, lineHeight: 1.35, marginBottom: 8, fontWeight: 400, color: C.charcoal }}>{p.title}</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.65, color: C.stone, fontWeight: 400 }}>{p.body}</p>
                  </div>
                  <div className="md:col-span-4">
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {p.bullets.map((b) => (
                        <li key={b} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          fontSize: 14, color: C.stone, fontWeight: 400, padding: "6px 0",
                        }}>
                          <div style={{ width: 4, height: 4, borderRadius: "50%", background: p.accent, opacity: 0.6, flexShrink: 0 }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="hidden md:flex md:col-span-1 items-center justify-end">
                    <ArrowUpRight className="h-4 w-4" style={{ color: C.dim }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI AGENTS ─────────────────────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: "128px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: C.stone,
                textTransform: "uppercase",
                marginBottom: 16,
              }}>
                AI Agents
              </div>
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.charcoal,
                marginBottom: 24,
              }}>
                Expert advisers.<br />No office hours.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: C.stone, maxWidth: 440, marginBottom: 40, fontWeight: 400 }}>
                Each agent carries deep domain expertise and full context of your business. Not generic advice — they know your numbers, your market, and exactly where you&apos;re falling short.
              </p>
              <div style={{ marginBottom: 40 }}>
                {[
                  { icon: Zap, title: "On demand, any time", desc: "At 2am before a pitch, mid-sprint, or while building your model — your advisers are always ready." },
                  { icon: Bot, title: "Context-aware by default", desc: "Every agent is pre-loaded with your profile, Q-Score data, and the full history of previous sessions." },
                  { icon: TrendingUp, title: "Progress that compounds", desc: "Conversations translate to actions. Actions move your Q-Score. Score unlocks the investor marketplace." },
                ].map(({ icon: Icon, title, desc }, i) => (
                  <motion.div
                    key={title}
                    style={{ display: "flex", gap: 16, marginBottom: 24 }}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div style={{
                      height: 32, width: 32, borderRadius: 8, flexShrink: 0, marginTop: 2,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(42,40,38,0.06)", border: `1px solid rgba(42,40,38,0.08)`,
                    }}>
                      <Icon className="h-3.5 w-3.5" style={{ color: C.charcoal }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, color: C.charcoal }}>{title}</p>
                      <p style={{ fontSize: 13, lineHeight: 1.65, color: C.stone, fontWeight: 400 }}>{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <button
                onClick={() => go("/founder/onboarding")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 14, fontWeight: 500, padding: "12px 24px", borderRadius: 6,
                  background: C.charcoal, color: C.cream, border: "none", cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                Meet your advisers <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {/* Agent list */}
            <motion.div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                background: "white",
                border: `1px solid ${C.taupe}`,
                boxShadow: "0 1px 4px rgba(42,40,38,0.04)",
              }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              {agentRoles.map((a, i) => (
                <motion.button
                  key={a.num}
                  className="w-full text-left flex items-center justify-between group"
                  style={{
                    padding: "16px 20px",
                    borderBottom: i < agentRoles.length - 1 ? `1px solid ${C.taupe}` : "none",
                    position: "relative",
                    overflow: "hidden",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    borderBottomStyle: i < agentRoles.length - 1 ? "solid" : "none",
                    borderBottomWidth: i < agentRoles.length - 1 ? 1 : 0,
                    borderBottomColor: i < agentRoles.length - 1 ? C.taupe : "transparent",
                  }}
                  animate={{ backgroundColor: i === activeAgent ? "rgba(245,241,232,0.8)" : "rgba(255,255,255,0)" }}
                  whileHover={{ backgroundColor: "rgba(245,241,232,0.6)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  onClick={() => go("/founder/onboarding")}
                >
                  {i === activeAgent && (
                    <motion.div
                      layoutId="agent-active-bar"
                      style={{
                        position: "absolute", left: 0, top: 0, bottom: 0, width: 2,
                        background: a.color,
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      height: 32, width: 32, borderRadius: 8, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700,
                      background: `${a.color}18`, color: a.color, border: `1px solid ${a.color}25`,
                    }}>
                      {a.emoji}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: C.charcoal, lineHeight: 1.3 }}>{a.name} Adviser</p>
                      <p style={{ fontSize: 11, color: C.stone, marginTop: 2, fontWeight: 400 }}>{a.desc}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {i === activeAgent && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{
                          fontFamily: "monospace",
                          fontSize: 9,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: `${a.color}15`,
                          color: a.color,
                        }}
                      >
                        Active
                      </motion.div>
                    )}
                    <ArrowUpRight className="h-3.5 w-3.5" style={{ color: C.dim }} />
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MARKETPLACE ───────────────────────────────────────────────────── */}
      <section style={{ background: C.sand, padding: "128px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <motion.div style={{ marginBottom: 48 }} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: C.stone,
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              Marketplace
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.charcoal,
                maxWidth: 480,
              }}>
                When you&apos;re ready, the investors are waiting.
              </h2>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 14px",
                borderRadius: 999,
                background: "#FDF8EE",
                border: `1px solid ${C.gold}55`,
                width: "fit-content",
                flexShrink: 0,
              }}>
                <Lock className="h-3 w-3" style={{ color: C.goldD }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: C.goldD, letterSpacing: "0.04em", fontFamily: "monospace" }}>
                  Unlocks at Q-Score ≥ 70
                </span>
              </div>
            </div>
          </motion.div>

          <p style={{ fontSize: 12, color: C.dim, marginBottom: 20, fontWeight: 400 }}>Sample from our verified investor network</p>

          <motion.div
            style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.taupe}` }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr style={{ background: C.cream, borderBottom: `1px solid ${C.taupe}` }}>
                    {["Investor", "Check size", "Stages", "Match"].map((h, i) => (
                      <th
                        key={h}
                        className={`text-left py-3.5 px-5 ${i === 1 ? "hidden sm:table-cell" : ""} ${i === 2 ? "hidden md:table-cell" : ""}`}
                        style={{
                          fontSize: 10,
                          textTransform: "uppercase",
                          letterSpacing: "0.16em",
                          fontWeight: 600,
                          color: C.dim,
                          fontFamily: "monospace",
                        }}>
                        {h}
                      </th>
                    ))}
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {investors.slice(0, 3).map((inv, i) => (
                    <motion.tr
                      key={inv.name}
                      style={{ borderBottom: `1px solid ${C.taupe}`, background: "white" }}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.07, ease }}
                      whileHover={{ backgroundColor: C.cream }}
                      onClick={() => go("/founder/onboarding")}
                      className="cursor-pointer"
                    >
                      <td className="py-4 px-5">
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            height: 32, width: 32, borderRadius: 8,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 10, fontWeight: 700, flexShrink: 0,
                            background: C.sand, color: C.charcoal, border: `1px solid ${C.taupe}`,
                          }}>
                            {inv.logo}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: C.charcoal }}>{inv.name}</p>
                            <p style={{ fontSize: 11, color: C.dim, fontWeight: 400 }}>{inv.type}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5 hidden sm:table-cell" style={{ fontSize: 13, color: C.stone, fontWeight: 400 }}>{inv.check}</td>
                      <td className="py-4 px-5 hidden md:table-cell" style={{ fontSize: 13, color: C.stone, fontWeight: 400 }}>{inv.stages}</td>
                      <td className="py-4 px-5"><MatchBar value={inv.match} /></td>
                      <td className="py-4 px-5 text-right">
                        <button style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 500, color: C.stone, background: "none", border: "none", cursor: "pointer" }}>
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
              <div style={{ filter: "blur(3.5px)", opacity: 0.45, pointerEvents: "none", background: "white" }}>
                {investors.slice(3).map((inv, i) => (
                  <div key={inv.name} style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "16px 20px", borderBottom: i < 2 ? `1px solid ${C.taupe}` : "none",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: C.sand, border: `1px solid ${C.taupe}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>{inv.logo}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: C.charcoal }}>{inv.name}</div>
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
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to bottom, rgba(245,241,232,0.1) 0%, rgba(245,241,232,0.88) 80%)",
                pointerEvents: "none",
              }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 10,
                    padding: "12px 22px", background: "white",
                    border: `1px solid ${C.taupe}`, borderRadius: 999,
                    boxShadow: "0 8px 32px rgba(42,40,38,0.1)",
                  }}
                >
                  <Lock style={{ width: 14, height: 14, color: C.goldD }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: C.charcoal }}>
                    497 more investors unlock at Q-Score 70
                  </span>
                  <button
                    onClick={() => go("/founder/onboarding")}
                    style={{
                      fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 6,
                      background: C.charcoal, color: C.cream, border: "none", cursor: "pointer",
                    }}
                  >
                    Start →
                  </button>
                </motion.div>
              </div>
            </div>

            <div style={{
              padding: "14px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: C.cream, borderTop: `1px solid ${C.taupe}`,
            }}>
              <span style={{ fontSize: 12, color: C.dim, fontWeight: 400 }}>Showing 3 of 500+ investors</span>
              <button
                style={{ fontSize: 12, fontWeight: 500, display: "inline-flex", alignItems: "center", gap: 4, color: C.charcoal, background: "none", border: "none", cursor: "pointer" }}
                onClick={() => go("/founder/onboarding")}
              >
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
            <motion.div
              key={s.label}
              style={{
                padding: "64px 40px",
                textAlign: "center",
                borderRight: i < stats.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease }}
            >
              <p style={{
                fontFamily: "monospace",
                fontWeight: 300,
                color: "white",
                fontSize: "clamp(28px, 4vw, 44px)",
                letterSpacing: "-0.02em",
                marginBottom: 12,
              }}>
                <CountUp to={s.to} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p style={{
                fontFamily: "monospace",
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "rgba(255,255,255,0.3)",
              }}>
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ background: C.cream, padding: "128px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <motion.div style={{ marginBottom: 56 }} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: C.stone,
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              Testimonials
            </div>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: C.charcoal,
            }}>
              What founders and investors say.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                style={{
                  padding: 28,
                  borderRadius: 10,
                  display: "flex",
                  flexDirection: "column",
                  background: "white",
                  border: `1px solid ${C.taupe}`,
                  boxShadow: "0 1px 4px rgba(42,40,38,0.04)",
                }}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (i % 3) * 0.1 }}
                whileHover={{ y: -2, boxShadow: "0 4px 24px rgba(42,40,38,0.08)" }}
              >
                <StarRating />
                <p style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.75, color: C.stone, flex: 1, marginBottom: 20 }}>
                  {t.quote}
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: `1px solid ${C.taupe}` }}>
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
                    <p style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 600, color: C.charcoal }}>{t.name}</p>
                    <p style={{ fontFamily: "monospace", fontSize: 10, color: C.stone }}>{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR INVESTORS ─────────────────────────────────────────────────── */}
      <section id="for-investors" style={{ background: C.sand, padding: "128px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <div style={{
                fontFamily: "monospace",
                fontSize: 11,
                letterSpacing: "0.1em",
                color: C.stone,
                textTransform: "uppercase",
                marginBottom: 16,
              }}>
                For Investors
              </div>
              <h2 style={{
                fontSize: "clamp(28px, 4vw, 44px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                lineHeight: 1.15,
                color: C.charcoal,
                marginBottom: 24,
              }}>
                Better deal flow.<br />Less noise.
              </h2>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: C.stone, maxWidth: 440, marginBottom: 32, fontWeight: 400 }}>
                Every founder in the marketplace has been scored algorithmically across six dimensions. You see pre-qualified, thesis-matched startups — not cold inbound.
              </p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0" }}>
                {["Algorithmic Q-Score on every deal", "Thesis-matched AI recommendations", "Founders who have done the preparation work", "Automated due-diligence summaries"].map((f, i) => (
                  <motion.li
                    key={f}
                    style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, color: C.stone, fontWeight: 400, marginBottom: 12 }}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.09 }}
                  >
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: C.sage }} />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <button
                onClick={() => go("/investor/onboarding")}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontSize: 14, fontWeight: 500, padding: "12px 24px", borderRadius: 6,
                  background: C.charcoal, color: C.cream, border: "none", cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                Join as an investor <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div
              style={{ borderRadius: 12, overflow: "hidden", border: `1px solid ${C.taupe}`, boxShadow: "0 1px 4px rgba(42,40,38,0.04)" }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              {[
                { name: "NeuralTech",  tag: "AI · Series A",     score: 891, match: 94, hot: true },
                { name: "CloudScale",  tag: "DevTools · Seed",   score: 847, match: 91, hot: false },
                { name: "HealthOS",    tag: "HealthTech · Seed", score: 823, match: 88, hot: false },
              ].map((d, i) => (
                <motion.div
                  key={d.name}
                  className="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-5 gap-3 sm:gap-0"
                  style={{ background: "white", borderBottom: i < 2 ? `1px solid ${C.taupe}` : "none" }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  whileHover={{ backgroundColor: C.cream }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 2 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.sage, flexShrink: 0 }} />
                      <p style={{ fontSize: 14, fontWeight: 500, color: C.charcoal }}>{d.name}</p>
                      {d.hot && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 4,
                          background: "rgba(42,40,38,0.08)", color: C.charcoal, letterSpacing: "0.08em",
                          fontFamily: "monospace",
                        }}>
                          HOT
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: C.dim, fontWeight: 400, paddingLeft: 16 }}>{d.tag}</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                    <div>
                      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: C.dim, marginBottom: 2, fontFamily: "monospace" }}>Q-Score</p>
                      <p style={{ fontSize: 15, fontWeight: 500, color: C.charcoal, fontFamily: "monospace" }}>{d.score}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 600, color: C.dim, marginBottom: 2, fontFamily: "monospace" }}>Match</p>
                      <p style={{ fontSize: 15, fontWeight: 500, color: C.charcoal, fontFamily: "monospace" }}>{d.match}%</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 hidden sm:block" style={{ color: C.dim }} />
                  </div>
                </motion.div>
              ))}
              <div style={{ padding: "14px 20px", textAlign: "center", background: C.cream, borderTop: `1px solid ${C.taupe}` }}>
                <p style={{ fontSize: 12, color: C.dim, fontWeight: 400 }}>
                  + 127 more matches this week
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: C.cream, padding: "128px 24px" }}>
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          <motion.div style={{ marginBottom: 64 }} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: C.stone,
              textTransform: "uppercase",
              marginBottom: 16,
              textAlign: "center",
            }}>
              Pricing
            </div>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: C.charcoal,
              marginBottom: 12,
              textAlign: "center",
            }}>
              Simple pricing.
            </h2>
            <p style={{ fontSize: 16, color: C.stone, textAlign: "center", marginBottom: 32, fontWeight: 400 }}>
              Free until you&apos;re ready to raise.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <BillingToggle annual={annual} onChange={setAnnual} />
            </div>
          </motion.div>

          <motion.div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 1,
              background: C.taupe,
              border: `1px solid ${C.taupe}`,
              borderRadius: 12,
              overflow: "hidden",
              boxShadow: "0 1px 4px rgba(42,40,38,0.04)",
            }}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Free */}
            <div style={{ background: "#FAFAFA", padding: "40px 36px" }}>
              <div style={{ fontSize: 13, color: C.stone, marginBottom: 8, fontWeight: 400 }}>Free</div>
              <div style={{
                fontFamily: "monospace",
                fontSize: 36,
                color: C.charcoal,
                fontWeight: 300,
                letterSpacing: "-0.02em",
                marginBottom: 24,
              }}>
                $0
                <span style={{ fontSize: 14, color: C.dim }}> forever</span>
              </div>

              {["Q-Score assessment", "3 AI advisers", "Improvement roadmap", "Workspace & notes"].map((f) => (
                <div key={f} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", fontSize: 14, color: C.stone, fontWeight: 400,
                  borderBottom: `1px solid ${C.taupe}`,
                }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.dim, flexShrink: 0 }} />
                  {f}
                </div>
              ))}

              <button
                onClick={() => go("/founder/onboarding")}
                style={{
                  display: "block", width: "100%", marginTop: 28,
                  padding: "12px 20px", border: `1px solid ${C.taupe}`,
                  borderRadius: 6, fontSize: 14, color: C.charcoal,
                  textAlign: "center", background: "transparent", cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                Get started free
              </button>
            </div>

            {/* Pro */}
            <div style={{ background: C.midnight, padding: "40px 36px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 400 }}>Pro</span>
                <span style={{
                  background: C.ember, color: "white",
                  fontSize: 10, padding: "2px 6px", borderRadius: 3,
                  letterSpacing: "0.06em", fontFamily: "monospace",
                  fontWeight: 600,
                }}>
                  POPULAR
                </span>
              </div>
              <div style={{
                fontFamily: "monospace",
                fontSize: 36,
                color: "white",
                fontWeight: 300,
                letterSpacing: "-0.02em",
                marginBottom: 4,
              }}>
                {annual ? "$39" : "$49"}
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}> / month</span>
              </div>
              {annual && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ fontSize: 11, color: C.gold, marginBottom: 4, fontFamily: "monospace" }}
                >
                  Billed ${39 * 12}/yr · 2 months free
                </motion.p>
              )}
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginBottom: 24, fontFamily: "monospace" }}>Cancel anytime</p>

              {["Everything in Free", "All 9 AI advisers", "Investor marketplace", "Academy cohort access", "Priority support"].map((f) => (
                <div key={f} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 0", fontSize: 14, color: "rgba(255,255,255,0.5)", fontWeight: 400,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}>
                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.ember, flexShrink: 0 }} />
                  {f}
                </div>
              ))}

              <button
                onClick={() => go("/founder/onboarding")}
                style={{
                  display: "block", width: "100%", marginTop: 28,
                  padding: "12px 20px", background: C.ember,
                  borderRadius: 6, fontSize: 14, color: "white",
                  fontWeight: 500, textAlign: "center", border: "none", cursor: "pointer",
                  transition: "opacity 0.15s",
                }}
              >
                Start 14-day free trial
              </button>
              <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.25)", marginTop: 12, fontFamily: "monospace" }}>
                No credit card required
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section style={{ background: C.sand, padding: "128px 24px" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <motion.div style={{ marginBottom: 48 }} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <div style={{
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: "0.1em",
              color: C.stone,
              textTransform: "uppercase",
              marginBottom: 16,
            }}>
              FAQ
            </div>
            <h2 style={{
              fontSize: "clamp(28px, 4vw, 44px)",
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.15,
              color: C.charcoal,
            }}>
              Common questions.
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
              <motion.div
                key={i}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                style={{ borderBottom: `1px solid ${C.taupe}` }}
              >
                <button
                  style={{
                    width: "100%", padding: "20px 0",
                    display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
                    textAlign: "left", background: "none", border: "none", cursor: "pointer",
                  }}
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                >
                  <span style={{ fontSize: 15, fontWeight: 400, color: C.charcoal, lineHeight: 1.5 }}>{item.q}</span>
                  <motion.div
                    animate={{ rotate: faqOpen === i ? 180 : 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{ flexShrink: 0 }}
                  >
                    <ChevronDown className="h-4 w-4 mt-0.5" style={{ color: faqOpen === i ? C.charcoal : C.dim }} />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {faqOpen === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease }}
                      style={{ overflow: "hidden" }}
                    >
                      <p style={{ paddingBottom: 20, fontSize: 14, lineHeight: 1.75, color: C.stone, fontWeight: 400 }}>{item.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── KNOWLEDGE LIBRARY ─────────────────────────────────────────────── */}
      <section style={{ background: C.cream, borderTop: `1px solid ${C.taupe}`, padding: "96px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <span style={{
                fontFamily: "monospace", fontSize: 10, letterSpacing: "0.28em",
                textTransform: "uppercase", display: "block", marginBottom: 12, color: C.stone,
              }}>
                Free resource
              </span>
              <h2 style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 400, letterSpacing: "-0.02em", color: C.charcoal }}>
                Startup Playbook Library
              </h2>
              <p style={{ marginTop: 12, fontSize: 15, color: C.stone, maxWidth: 480, lineHeight: 1.65, fontWeight: 400 }}>
                60+ curated frameworks from YC, a16z, Bessemer, and HBR — surfaced by your AI team when you need them.
              </p>
            </div>
            <a
              href="/library"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 500, padding: "10px 20px", borderRadius: 6,
                background: C.charcoal, color: C.cream, textDecoration: "none",
                flexShrink: 0,
              }}
            >
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
              <motion.a
                key={r.title}
                href="/library"
                style={{
                  display: "block", padding: "20px 24px", borderRadius: 10,
                  background: "white", border: `1px solid ${C.taupe}`, textDecoration: "none",
                  boxShadow: "0 1px 4px rgba(42,40,38,0.04)",
                }}
                whileHover={{ y: -2, boxShadow: "0 4px 16px rgba(42,40,38,0.08)" }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ fontSize: 24, marginTop: 2, flexShrink: 0 }}>{r.icon}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4,
                        background: r.color + "1A", color: r.color, fontFamily: "monospace",
                      }}>{r.fn}</span>
                      <span style={{ fontSize: 10, color: C.dim, fontFamily: "monospace" }}>{r.type}</span>
                    </div>
                    <p style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.4, marginBottom: 4, color: C.charcoal }}>{r.title}</p>
                    <p style={{ fontSize: 12, color: C.stone, fontWeight: 400 }}>{r.source}</p>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA — DARK ──────────────────────────────────────────────── */}
      <section style={{ background: C.midnight, position: "relative", overflow: "hidden" }}>
        {/* Single subtle glow — no blobs */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at 50% 0%, rgba(217,119,87,0.08) 0%, transparent 60%)",
          pointerEvents: "none",
        }} />

        <motion.div
          style={{ maxWidth: 640, margin: "0 auto", padding: "128px 24px", textAlign: "center", position: "relative" }}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 48 }} />
          <span style={{
            fontFamily: "monospace", fontSize: 10, letterSpacing: "0.3em",
            textTransform: "uppercase", display: "block", marginBottom: 32,
            color: "rgba(255,255,255,0.3)",
          }}>
            Ready to raise
          </span>
          <h2 style={{
            fontSize: "clamp(36px, 5vw, 64px)",
            fontWeight: 300,
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
            color: "white",
            marginBottom: 40,
          }}>
            Build the company<br />
            <em style={{ fontStyle: "italic", color: "#F7EFD9" }}>investors want to fund.</em>
          </h2>
          <GetStartedDropdown
            label={<>Start free <ArrowRight size={15} /></>}
            align="center"
          />
          <p style={{
            fontFamily: "monospace", fontSize: 11, marginTop: 24,
            color: "rgba(255,255,255,0.2)",
          }}>
            10-minute setup · No credit card · Free forever
          </p>

          {/* Mini stats */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
            gap: 16, marginTop: 64, paddingTop: 40,
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            {[["$2.3B+", "Raised via platform"], ["10,000+", "Active founders"], ["500+", "Verified investors"]].map(([n, l]) => (
              <div key={l}>
                <p style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 400, color: "white", marginBottom: 4, letterSpacing: "-0.01em" }}>{n}</p>
                <p style={{ fontFamily: "monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)" }}>{l}</p>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginTop: 48 }} />
        </motion.div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.midnight, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "48px 24px" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 sm:gap-10 mb-10">
            <div className="col-span-2 md:col-span-2">
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.5)", letterSpacing: "-0.01em" }}>
                  Edge Alpha
                </span>
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.25)", maxWidth: 220, fontWeight: 400 }}>
                AI-powered advisers and investor marketplace for ambitious founders.
              </p>
            </div>
            {[
              { title: "Product", links: [
                { label: "Q-Score", href: "/founder/improve-qscore" },
                { label: "AI Agents", href: "/founder/agents" },
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
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 600, marginBottom: 16, color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>
                  {col.title}
                </p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map((l) => (
                    <li key={l.label} style={{ marginBottom: 10 }}>
                      <a href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "none", fontWeight: 400 }}>
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{
            display: "flex", flexDirection: "column", gap: 12,
            paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)",
          }} className="sm:flex-row sm:items-center sm:justify-between">
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>
              &copy; 2026 Edge Alpha. All rights reserved.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 11, color: "rgba(255,255,255,0.15)", letterSpacing: "0.1em", fontFamily: "monospace" }}>
              <span>SECURE</span><span>PRIVATE</span><span>AI-POWERED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
