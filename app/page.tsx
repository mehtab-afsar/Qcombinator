"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { ArrowRight, Menu, X, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// ─── palette — warm light-first ──────────────────────────────────────────────
const C = {
  bg:      "#F9F7F2",   // warm off-white
  surf:    "#FFFFFF",   // pure white cards
  warm:    "#F2EDE4",   // deeper warm section
  bdr:     "#E8E2D9",   // border
  ink:     "#18160F",   // near-black text
  mid:     "#4A4743",   // secondary text
  muted:   "#8A867C",   // tertiary text
  dim:     "#C4BFB8",   // very muted
  ember:   "#D97757",   // primary accent
  emberL:  "#FDEEE7",   // ember light bg
  gold:    "#C9A961",
  goldL:   "#FDF6E7",
  blue:    "#2563EB",
  blueL:   "#EFF6FF",
  night:   "#0F0E0C",   // dark CTA section
};

const ease = [0.22, 1, 0.36, 1] as const;
const FONT_SERIF  = "var(--font-fraunces), Georgia, serif";

// ─── data ─────────────────────────────────────────────────────────────────────
const AGENTS = [
  { num: "01", name: "Patel",  role: "GTM Control",    desc: "Diagnoses your go-to-market across 20 indicators. Finds the active constraint blocking revenue.", color: C.ember, bg: C.emberL },
  { num: "02", name: "Sage",   role: "CEO Adviser",    desc: "Detects contradictions between agent plans. Tracks investor readiness. Calls out blind spots.",    color: C.blue,  bg: C.blueL  },
  { num: "03", name: "Felix",  role: "CFO Adviser",    desc: "Models runway, unit economics, and fundraising readiness. Flags financial risk before it matters.",color: C.gold,  bg: C.goldL  },
  { num: "04", name: "Atlas",  role: "Competitive",    desc: "Maps your market. Builds battle cards. Monitors competitors and surfaces positioning gaps.",        color: "#16A34A", bg: "#F0FDF4" },
  { num: "05", name: "Nova",   role: "Product & PMF",  desc: "Validates product-market fit. Designs PMF surveys. Translates customer feedback into roadmap.",    color: "#7C3AED", bg: "#F5F3FF" },
  { num: "06", name: "Maya",   role: "Brand & Growth", desc: "Builds your brand narrative, acquisition strategy, and messaging that converts.",                  color: "#DB2777", bg: "#FDF2F8" },
  { num: "07", name: "Harper", role: "Hiring & Team",  desc: "Plans your next three hires. Benchmarks compensation. Writes JDs that attract the right people.",  color: "#0891B2", bg: "#ECFEFF" },
  { num: "08", name: "Susi",   role: "Sales Process",  desc: "Builds repeatable outreach. Coaches objection handling. Tracks close rate week on week.",          color: "#D97706", bg: "#FFFBEB" },
  { num: "09", name: "Leo",    role: "Legal & Ops",    desc: "Flags compliance risk. Reviews contracts. Guides equity structure and IP protection.",              color: "#059669", bg: "#F0FDF9" },
];

const INVESTORS = [
  { name: "Hustle Fund",         logo: "HF", check: "$25k – $500k",  stages: "Pre-seed · Seed",  match: 97 },
  { name: "Precursor Ventures",  logo: "PV", check: "$250k – $1M",   stages: "Pre-seed · Seed",  match: 93 },
  { name: "First Round Capital", logo: "FR", check: "$1M – $15M",    stages: "Seed · Series A",  match: 89 },
  { name: "Pear VC",             logo: "P",  check: "$500k – $5M",   stages: "Seed · Series A",  match: 84 },
  { name: "General Catalyst",    logo: "GC", check: "$2M – $50M",    stages: "Seed · Growth",    match: 81 },
];

const TESTIMONIALS = [
  { initials: "SC", name: "Sarah Chen",      role: "Founder, TechFlow",      color: C.ember,   quote: "The Marketing Adviser helped us rethink GTM from scratch. Edge Alpha matched us with the right investors. Raised seed in two weeks." },
  { initials: "MJ", name: "Marcus Johnson",  role: "CEO, DataPipe",           color: C.blue,    quote: "Q-Score pinpointed our weak spots. The Finance Agent fixed them. Investors took us seriously and we closed 3× faster than expected." },
  { initials: "ER", name: "Elena Rodriguez", role: "Partner, Vertex Capital", color: "#16A34A", quote: "Every founder I see from Edge Alpha has actually prepared. The Q-Score filter alone saves me hours of due diligence each week." },
  { initials: "DP", name: "David Park",      role: "Founder, CloudStack",     color: "#7C3AED", quote: "Strategy Agent nailed our positioning before we talked to a single investor. Found our lead through the marketplace. Nothing like it." },
  { initials: "JL", name: "James Liu",       role: "Founder, AIBotics",       color: C.gold,    quote: "Finance AI helped us model unit economics properly. Q-Score went from 62 to 84. Series A closed six weeks later." },
  { initials: "AF", name: "Amanda Foster",   role: "GP, Horizon Ventures",    color: "#059669", quote: "More than half my deal flow now comes from Edge Alpha. The quality bar the platform sets is genuinely exceptional." },
];

const FAQS = [
  { q: "What is Q-Score and how is it calculated?", a: "Q-Score is a 0–100 investment readiness score across six dimensions: Market, Product, Team, Traction, Financials, and Impact. It's built from your profile data, agent sessions, and documents you upload. Sector-adaptive weights ensure a HealthTech startup is scored against HealthTech benchmarks." },
  { q: "Are the investors real and verified?", a: "Yes. Every investor in the marketplace has been individually onboarded, verified their investment thesis, and opted in to receive introductions. We do not scrape public directories." },
  { q: "How do the AI agents know about my business?", a: "When you complete onboarding, a Q-Score assessment, or upload documents, all nine agents are pre-loaded with your profile, financials, team, and market context. Every session is in context — agents remember what was discussed and built." },
  { q: "Is my data secure and private?", a: "All data is encrypted at rest and in transit. Founder data is never shared with investors without explicit connection consent. We don't use your data to train models." },
  { q: "What's the difference between Free and Pro?", a: "Free gives you 3 agents, a Q-Score, and an improvement roadmap — enough to understand where you stand. Pro unlocks all 9 agents, the investor marketplace, and Academy access for $49/month." },
  { q: "How long does it take to get investor introductions?", a: "The marketplace opens when your Q-Score reaches 70. Most founders reach 70 within 4–8 weeks of consistent agent use. The median time to first investor response is 4 days after unlocking." },
];

// Press logos — styled wordmarks matching each publication's brand identity
function PressLogo({ name }: { name: string }) {
  const s: React.CSSProperties = { display: "inline-block", userSelect: "none", whiteSpace: "nowrap" };
  switch (name) {
    case "TechCrunch":
      return <span style={{ ...s, fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 15, color: "#0D8A3E", letterSpacing: "-0.02em" }}>TechCrunch</span>;
    case "Forbes":
      return <span style={{ ...s, fontFamily: "Georgia, 'Times New Roman', serif", fontStyle: "italic", fontWeight: 700, fontSize: 18, color: "#000", letterSpacing: "0.01em" }}>Forbes</span>;
    case "Bloomberg":
      return <span style={{ ...s, fontFamily: "'Arial Narrow', Arial, sans-serif", fontWeight: 700, fontSize: 14, color: "#000", letterSpacing: "0.04em", textTransform: "uppercase" }}>Bloomberg</span>;
    case "The Verge":
      return <span style={{ ...s, fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 14, color: "#FA3F3B", letterSpacing: "-0.01em" }}>THE VERGE</span>;
    case "WIRED":
      return <span style={{ ...s, fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 18, color: "#000", letterSpacing: "0.08em" }}>WIRED</span>;
    case "Fast Company":
      return <span style={{ ...s, fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, fontSize: 13, color: "#E82027", letterSpacing: "0.01em" }}>FAST COMPANY</span>;
    case "Inc.":
      return <span style={{ ...s, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 700, fontSize: 20, color: "#003580", letterSpacing: "0.01em" }}>Inc.</span>;
    case "Fortune":
      return <span style={{ ...s, fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 400, fontSize: 17, color: "#000", letterSpacing: "0.04em" }}>Fortune</span>;
    default:
      return <span style={{ ...s, fontWeight: 600, fontSize: 14, color: "#888" }}>{name}</span>;
  }
}

const PRESS = ["TechCrunch", "Forbes", "Bloomberg", "The Verge", "WIRED", "Fast Company", "Inc.", "Fortune"];

const STEPS = [
  { n: "01", title: "Get your Q-Score", body: "Complete a 10-minute assessment. Six dimensions. One honest number that tells you exactly where you stand and what needs work." },
  { n: "02", title: "Work with your advisers", body: "Nine AI specialists — strategy, GTM, finance, legal — guide your improvement with full context of your business. Not generic advice." },
  { n: "03", title: "Raise when you hit 70", body: "At Q-Score ≥ 70, your profile unlocks to thesis-matched investors. They find you — you don't cold email 200 people." },
];

// ─── CountUp ─────────────────────────────────────────────────────────────────
function CountUp({ to, decimals = 0, prefix = "", suffix = "" }: { to: number; decimals?: number; prefix?: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 2000, 1);
      const e = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      setVal(e * to);
      if (t < 1) requestAnimationFrame(tick); else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [inView, to]);
  return <span ref={ref}>{prefix}{decimals > 0 ? val.toFixed(decimals) : Math.floor(val).toLocaleString()}{suffix}</span>;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  const router = useRouter();
  const [scrolled,  setScrolled]  = useState(false);
  const [visible,   setVisible]   = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const fn = () => {
      const y = window.scrollY;
      setScrolled(y > 32);
      if (y < 60) {
        setVisible(true);          // always show near top
      } else if (y > lastY.current + 6) {
        setVisible(false);         // scrolling down → hide
      } else if (y < lastY.current - 6) {
        setVisible(true);          // scrolling up → show
      }
      lastY.current = y;
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      {/* Outer wrapper — full width, centers the pill */}
      <div style={{ position: "fixed", top: 20, left: 0, right: 0, zIndex: 100, display: "flex", justifyContent: "center", padding: "0 24px", pointerEvents: "none" }}>
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: visible ? 0 : -100, opacity: visible ? 1 : 0 }}
        transition={{ duration: 0.35, ease }}
        style={{
          pointerEvents: "auto",
          width: "100%", maxWidth: 860,
          padding: "10px 16px 10px 20px",
          background: scrolled ? "rgba(249,247,242,0.92)" : "rgba(249,247,242,0.80)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          border: `1px solid ${scrolled ? C.bdr : "rgba(232,226,217,0.6)"}`,
          borderRadius: 999,
          boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.08)" : "0 2px 12px rgba(0,0,0,0.05)",
          transition: "all 0.35s ease",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 500, color: C.ink, letterSpacing: "-0.02em", fontFamily: FONT_SERIF, paddingLeft: 4 }}>Edge Alpha</span>

        <div style={{ display: "flex", alignItems: "center", gap: 36 }} className="hidden md:flex">
          {[{ label: "How it works", href: "#how" }, { label: "Pricing", href: "#pricing" }, { label: "Library", href: "/library" }].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 14, color: C.muted, textDecoration: "none", fontWeight: 400, letterSpacing: "-0.01em", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = C.ink)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
            >{l.label}</a>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }} className="hidden md:flex">
          <button onClick={() => router.push("/login")}
            style={{ fontSize: 14, color: C.muted, background: "none", border: "none", cursor: "pointer", padding: "8px 12px", fontFamily: "inherit", transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = C.ink)}
            onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
          >Sign in</button>
          <motion.button onClick={() => router.push("/founder/onboarding")}
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            style={{ fontSize: 14, fontWeight: 500, color: "#fff", background: C.ink, border: "none", borderRadius: 8, padding: "9px 20px", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}
          >Get started</motion.button>
        </div>

        <button onClick={() => setMobileOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: C.ink, padding: 4 }} className="md:hidden">
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </motion.nav>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ position: "fixed", top: 76, left: 16, right: 16, zIndex: 99, background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 16, padding: "16px 20px 24px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)" }}>
            {[{ label: "How it works", href: "#how" }, { label: "Pricing", href: "#pricing" }, { label: "Library", href: "/library" }].map(l => (
              <a key={l.label} href={l.href} onClick={() => setMobileOpen(false)} style={{ display: "block", fontSize: 16, color: C.ink, textDecoration: "none", padding: "12px 0", borderBottom: `1px solid ${C.bdr}` }}>{l.label}</a>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              <button onClick={() => { router.push("/login"); setMobileOpen(false); }} style={{ fontSize: 15, color: C.ink, background: "none", border: `1px solid ${C.bdr}`, borderRadius: 8, cursor: "pointer", padding: "12px", fontFamily: "inherit" }}>Sign in</button>
              <button onClick={() => { router.push("/founder/onboarding"); setMobileOpen(false); }} style={{ fontSize: 15, fontWeight: 500, color: "#fff", background: C.ink, border: "none", borderRadius: 8, cursor: "pointer", padding: "12px", fontFamily: "inherit" }}>Get started free</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── QScore card ─────────────────────────────────────────────────────────────
function QScoreCard() {
  const dims = [
    { label: "Team",       score: 82 },
    { label: "Market",     score: 78 },
    { label: "Traction",   score: 71 },
    { label: "Financials", score: 65 },
    { label: "Product",    score: 69 },
    { label: "Impact",     score: 74 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.9, ease }}
    >
      <motion.div
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: C.surf,
          border: `1px solid ${C.bdr}`,
          borderRadius: 22,
          padding: "32px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.04), 0 24px 64px rgba(0,0,0,0.09)",
          width: 340,
          maxWidth: "100%",
        }}
      >
        {/* Score header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 8, fontFamily: "monospace" }}>Q-Score</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 68, fontWeight: 300, color: C.ink, lineHeight: 1, fontFamily: FONT_SERIF, letterSpacing: "-0.05em" }}>74</span>
              <span style={{ fontSize: 14, color: C.dim, paddingBottom: 6 }}>/100</span>
            </div>
          </div>
          <div style={{ textAlign: "right", paddingTop: 4 }}>
            <div style={{ fontSize: 28, fontWeight: 300, color: C.ember, fontFamily: FONT_SERIF, letterSpacing: "-0.02em", lineHeight: 1 }}>B+</div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.08em", fontFamily: "monospace", marginTop: 4 }}>TOP 34%</div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ position: "relative", height: 5, background: C.warm, borderRadius: 999, overflow: "visible", marginBottom: 28 }}>
          <motion.div initial={{ width: 0 }} animate={{ width: "74%" }} transition={{ delay: 0.9, duration: 1.5, ease }}
            style={{ height: "100%", borderRadius: 999, background: `linear-gradient(90deg, ${C.ember}, ${C.gold})` }} />
          <div style={{ position: "absolute", left: "70%", top: -4, width: 1, height: 13, background: C.ink, opacity: 0.2 }} />
          <div style={{ position: "absolute", left: "70%", top: 13, transform: "translateX(-50%)", fontSize: 9, color: C.dim, whiteSpace: "nowrap", fontFamily: "monospace", letterSpacing: "0.04em" }}>investor threshold</div>
        </div>

        {/* Dimensions — one bar per row, no per-dimension colors */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {dims.map((d, i) => (
            <div key={d.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 12, color: C.muted, width: 70, flexShrink: 0, letterSpacing: "-0.01em" }}>{d.label}</span>
              <div style={{ flex: 1, height: 4, background: C.warm, borderRadius: 999, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${d.score}%` }}
                  transition={{ delay: 0.8 + i * 0.07, duration: 1.1, ease }}
                  style={{ height: "100%", borderRadius: 999, background: d.score < 70 ? C.ember : C.ink, opacity: d.score < 70 ? 1 : 0.35 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: d.score < 70 ? C.ember : C.mid, width: 24, textAlign: "right", letterSpacing: "-0.01em" }}>{d.score}</span>
            </div>
          ))}
        </div>

        {/* Constraint note */}
        <div style={{ marginTop: 22, padding: "12px 14px", background: C.emberL, borderRadius: 12, borderLeft: `3px solid ${C.ember}` }}>
          <p style={{ fontSize: 12, color: "#7C3317", lineHeight: 1.55, margin: 0, letterSpacing: "-0.01em" }}>
            <span style={{ fontWeight: 600 }}>Financials is your constraint</span> — add a 24-month model to unlock the investor marketplace.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [faqOpen,       setFaqOpen]       = useState<number | null>(null);
  const [activeAgent,   setActiveAgent]   = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeFaq,     setActiveFaq]     = useState(0);

  // Auto-rotate testimonials
  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(i => (i + 1) % TESTIMONIALS.length), 4500);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ background: C.bg, color: C.ink, overflowX: "hidden" }}>
      <Nav />

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: "100vh", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", padding: "100px 24px 80px", overflow: "hidden" }}>

        {/* Subtle background glow — light this time */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 700, height: 700, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,87,0.08) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", top: "5%", right: "-5%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.06) 0%, transparent 70%)", filter: "blur(60px)" }} />
          <div style={{ position: "absolute", bottom: "0%", left: "50%", transform: "translateX(-50%)", width: 900, height: 300, borderRadius: "50%", background: "radial-gradient(ellipse, rgba(201,169,97,0.05) 0%, transparent 70%)", filter: "blur(40px)" }} />
        </div>

        <div style={{ maxWidth: 1160, width: "100%", position: "relative", display: "flex", alignItems: "center", gap: "clamp(40px, 6vw, 96px)", flexWrap: "wrap" }}>

          {/* LEFT — headline, subhead, buttons, stats */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.7, ease }}
            style={{ flex: "1 1 380px", minWidth: 0 }}>
            <h1 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(44px, 6.5vw, 82px)", fontWeight: 300, lineHeight: 1.08, letterSpacing: "-0.04em", color: C.ink, margin: "0 0 32px" }}>
              Build a fundable business.<br />
              <em style={{ fontStyle: "italic", color: C.ember }}>Then raise.</em>
            </h1>
            <p style={{ fontSize: "clamp(15px, 1.7vw, 19px)", color: C.muted, lineHeight: 1.75, fontWeight: 300, letterSpacing: "-0.02em", maxWidth: 440, marginBottom: 44 }}>
              Nine AI advisers evaluate your company across six dimensions and give you an investor-readiness score. Raise when you hit&nbsp;70.
            </p>
            <motion.button onClick={() => router.push("/founder/onboarding")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "14px 32px", borderRadius: 10, border: "none", background: C.ink, color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em", boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)" }}>
              Start free <ArrowRight size={15} />
            </motion.button>
            <p style={{ fontSize: 12, color: C.dim, marginTop: 16, letterSpacing: "0.04em", fontFamily: "monospace" }}>10-minute setup · No credit card needed</p>
            <button onClick={() => router.push("/investor/onboarding")}
              style={{ marginTop: 24, fontSize: 13, color: C.muted, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em", transition: "color .2s", textDecoration: "underline" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = C.ink; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = C.muted; }}>
              Are you an investor? →
            </button>

            {/* Stats inline below buttons */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 0.7 }}
              style={{ display: "flex", gap: 40, marginTop: 48, paddingTop: 36, borderTop: `1px solid ${C.bdr}` }}>
              {[{ to: 2.3, decimals: 1, prefix: "$", suffix: "B", label: "raised" }, { to: 10000, decimals: 0, prefix: "", suffix: "+", label: "founders" }, { to: 500, decimals: 0, prefix: "", suffix: "+", label: "investors" }].map(s => (
                <div key={s.label}>
                  <p style={{ fontSize: 26, fontWeight: 300, color: C.ink, fontFamily: FONT_SERIF, letterSpacing: "-0.03em", marginBottom: 4 }}>
                    <CountUp {...s} />
                  </p>
                  <p style={{ fontSize: 11, color: C.dim, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "monospace" }}>{s.label}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* RIGHT — Q-Score card */}
          <motion.div initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.35, duration: 0.9, ease }}
            style={{ flex: "0 0 auto" }}>
            <QScoreCard />
          </motion.div>

        </div>
      </section>

      {/* ── PRESS TICKER ───────────────────────────────────────────────────── */}
      <div style={{ background: C.surf, borderTop: `1px solid ${C.bdr}`, borderBottom: `1px solid ${C.bdr}`, padding: "22px 0", overflow: "hidden" }}>
        <div style={{ display: "flex", gap: 72, animation: "marquee 32s linear infinite", width: "max-content", alignItems: "center" }}>
          {[...PRESS, ...PRESS].map((p, i) => (
            <div key={i} style={{ opacity: 0.65, flexShrink: 0 }}>
              <PressLogo name={p} />
            </div>
          ))}
        </div>
        <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </div>

      {/* ── HOW IT WORKS ───────────────────────────────────────────────────── */}
      <section id="how" style={{ background: C.surf, padding: "112px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 72 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.ember, marginBottom: 16, fontFamily: "monospace" }}>How it works</p>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 300, letterSpacing: "-0.04em", color: C.ink, lineHeight: 1.05 }}>
              From assessment to investment.
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24 }}>
            {STEPS.map((step, i) => (
              <motion.div key={step.n} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.7, ease }}
                style={{ padding: "40px 36px", background: i === 1 ? C.emberL : C.bg, border: `1px solid ${i === 1 ? "rgba(217,119,87,0.18)" : C.bdr}`, borderRadius: 16 }}>
                <p style={{ fontFamily: "monospace", fontSize: 11, color: C.ember, marginBottom: 24, letterSpacing: "0.1em", fontWeight: 700 }}>{step.n}</p>
                <h3 style={{ fontSize: 22, fontWeight: 400, fontFamily: FONT_SERIF, color: C.ink, letterSpacing: "-0.03em", marginBottom: 14, lineHeight: 1.2 }}>{step.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.72, fontWeight: 300, letterSpacing: "-0.01em" }}>{step.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AGENTS — interactive two-panel ─────────────────────────────────── */}
      <section style={{ background: C.bg, padding: "112px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ marginBottom: 52 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.ember, marginBottom: 14, fontFamily: "monospace" }}>AI Agents</p>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 4.5vw, 54px)", fontWeight: 300, letterSpacing: "-0.04em", color: C.ink, lineHeight: 1.05 }}>
              Nine advisers. One platform.
            </h2>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 0, background: C.surf, border: `1px solid ${C.bdr}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }} className="block md:grid">

            {/* Left: agent list — consistent neutral style */}
            <div style={{ borderRight: `1px solid ${C.bdr}` }}>
              {AGENTS.map((agent, i) => (
                <button key={agent.name} onClick={() => setActiveAgent(i)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 20px",
                    background: activeAgent === i ? C.bg : "transparent",
                    border: "none", borderBottom: i < AGENTS.length - 1 ? `1px solid ${C.bdr}` : "none",
                    cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    borderLeft: activeAgent === i ? `2px solid ${C.ember}` : "2px solid transparent",
                    transition: "all .15s",
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 700, color: activeAgent === i ? C.ember : C.dim, fontFamily: "monospace", width: 20, flexShrink: 0 }}>{agent.num}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: activeAgent === i ? 500 : 400, color: activeAgent === i ? C.ink : C.mid, letterSpacing: "-0.01em" }}>{agent.name}</p>
                    <p style={{ fontSize: 10, color: C.dim, fontWeight: 500, letterSpacing: "0.02em", marginTop: 1 }}>{agent.role}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Right: active agent detail — consistent ink/ember, no per-agent colors */}
            <AnimatePresence mode="wait">
              <motion.div key={activeAgent}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease }}
                style={{ padding: "40px 44px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 300 }}
              >
                {(() => {
                  const a = AGENTS[activeAgent];
                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: C.ember, fontFamily: "monospace", letterSpacing: "0.08em" }}>{a.num}</span>
                        <span style={{ fontSize: 11, color: C.dim }}>·</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "monospace" }}>{a.role}</span>
                      </div>
                      <p style={{ fontSize: 26, fontWeight: 300, color: C.ink, letterSpacing: "-0.03em", fontFamily: FONT_SERIF, marginBottom: 20, lineHeight: 1.1 }}>{a.name}</p>
                      <p style={{ fontSize: 15, color: C.mid, lineHeight: 1.72, fontWeight: 300, letterSpacing: "-0.01em", maxWidth: 420, marginBottom: 28 }}>{a.desc}</p>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {["Context-aware", "24/7 available", "Q-Score linked"].map(tag => (
                          <span key={tag} style={{ fontSize: 11, fontWeight: 500, color: C.muted, background: C.bg, border: `1px solid ${C.bdr}`, padding: "4px 12px", borderRadius: 999 }}>{tag}</span>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* ── MARKETPLACE ────────────────────────────────────────────────────── */}
      <section style={{ background: C.surf, padding: "112px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 80, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Left text */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ flex: "1 1 320px", maxWidth: 460 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.ember, marginBottom: 16, fontFamily: "monospace" }}>Investor Marketplace</p>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 300, letterSpacing: "-0.04em", color: C.ink, lineHeight: 1.05, marginBottom: 20 }}>
              When you're ready,<br />the investors are waiting.
            </h2>
            <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, fontWeight: 300, letterSpacing: "-0.01em", marginBottom: 32 }}>
              500+ verified investors, thesis-matched by AI. The marketplace unlocks automatically when your Q-Score reaches 70.
            </p>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 999, background: C.goldL, border: "1px solid rgba(201,169,97,0.25)" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#6B4A10", letterSpacing: "0.04em" }}>Unlocks at Q-Score ≥ 70</span>
            </div>
          </motion.div>

          {/* Right: investor list */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.7 }} style={{ flex: "1 1 340px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {INVESTORS.map((inv, i) => (
                <motion.div key={inv.name} initial={{ opacity: 0, x: 12 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06, duration: 0.6 }}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: C.surf, border: `1px solid ${C.bdr}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: C.mid, flexShrink: 0 }}>{inv.logo}</div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: C.ink, letterSpacing: "-0.01em" }}>{inv.name}</p>
                    <p style={{ fontSize: 11, color: C.muted }}>{inv.check} · {inv.stages}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: 16, fontWeight: 600, color: inv.match >= 90 ? C.ember : C.gold, letterSpacing: "-0.02em" }}>{inv.match}%</p>
                    <p style={{ fontSize: 10, color: C.dim, letterSpacing: "0.04em", fontFamily: "monospace" }}>MATCH</p>
                  </div>
                </motion.div>
              ))}
              <p style={{ textAlign: "center", padding: "12px 0 4px", fontSize: 12, color: C.dim }}>495 more investors unlock at Q-Score 70</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS — rotating single large quote ──────────────────────── */}
      <section style={{ background: C.surf, padding: "96px 24px" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.ember, marginBottom: 52, fontFamily: "monospace" }}>What founders &amp; investors say</p>

          <AnimatePresence mode="wait">
            <motion.div key={activeTestimonial}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.45, ease }}
            >
              {/* Big quote mark */}
              <div style={{ fontSize: 80, lineHeight: 0.6, color: TESTIMONIALS[activeTestimonial].color, opacity: 0.18, fontFamily: FONT_SERIF, marginBottom: 32, textAlign: "left" }}>
                &ldquo;
              </div>
              <p style={{ fontSize: "clamp(18px, 2.8vw, 26px)", fontWeight: 300, color: C.ink, lineHeight: 1.55, letterSpacing: "-0.02em", fontFamily: FONT_SERIF, marginBottom: 40 }}>
                {TESTIMONIALS[activeTestimonial].quote}
              </p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: `${TESTIMONIALS[activeTestimonial].color}15`, border: `1.5px solid ${TESTIMONIALS[activeTestimonial].color}30`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: TESTIMONIALS[activeTestimonial].color }}>
                  {TESTIMONIALS[activeTestimonial].initials}
                </div>
                <div style={{ textAlign: "left" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: C.ink, letterSpacing: "-0.01em" }}>{TESTIMONIALS[activeTestimonial].name}</p>
                  <p style={{ fontSize: 12, color: C.muted }}>{TESTIMONIALS[activeTestimonial].role}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Dot navigation */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 44 }}>
            {TESTIMONIALS.map((_, i) => (
              <button key={i} onClick={() => setActiveTestimonial(i)}
                style={{ width: i === activeTestimonial ? 24 : 7, height: 7, borderRadius: 999, background: i === activeTestimonial ? TESTIMONIALS[activeTestimonial].color : C.bdr, border: "none", cursor: "pointer", padding: 0, transition: "all .3s ease" }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: C.surf, padding: "112px 24px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }} style={{ textAlign: "center", marginBottom: 64 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.ember, marginBottom: 16, fontFamily: "monospace" }}>Pricing</p>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(36px, 5vw, 60px)", fontWeight: 300, letterSpacing: "-0.04em", color: C.ink, lineHeight: 1.05, marginBottom: 16 }}>
              Free until you're ready to raise.
            </h2>
            <p style={{ fontSize: 15, color: C.muted, fontWeight: 300, letterSpacing: "-0.01em" }}>Start building for free. Upgrade when the investor marketplace opens.</p>
          </motion.div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {/* Free */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
              style={{ padding: "40px 36px", background: C.bg, border: `1px solid ${C.bdr}`, borderRadius: 20 }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted, marginBottom: 20, fontFamily: "monospace" }}>Free</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 52, fontWeight: 300, color: C.ink, fontFamily: FONT_SERIF, letterSpacing: "-0.03em" }}>$0</span>
                <span style={{ fontSize: 14, color: C.dim }}>forever</span>
              </div>
              <p style={{ fontSize: 12, color: C.dim, marginBottom: 36 }}>No credit card required</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                {["Q-Score assessment", "3 AI advisers", "Improvement roadmap", "Workspace & notes"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Check size={14} style={{ color: C.muted, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: C.muted }}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => router.push("/founder/onboarding")}
                style={{ width: "100%", padding: "13px", borderRadius: 10, background: "transparent", border: `1px solid ${C.bdr}`, color: C.ink, fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em", transition: "all .2s" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = C.ink}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = C.bdr}>
                Get started free
              </button>
            </motion.div>

            {/* Pro */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1, duration: 0.7 }}
              style={{ padding: "40px 36px", background: C.ink, border: `1px solid ${C.ink}`, borderRadius: 20, position: "relative" }}>
              <div style={{ position: "absolute", top: 20, right: 20, padding: "4px 10px", borderRadius: 999, background: C.ember, fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.12em", textTransform: "uppercase" }}>POPULAR</div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: C.ember, marginBottom: 20, fontFamily: "monospace" }}>Pro</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{ fontSize: 52, fontWeight: 300, color: "#fff", fontFamily: FONT_SERIF, letterSpacing: "-0.03em" }}>$49</span>
                <span style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}>/ month</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", marginBottom: 36 }}>Cancel anytime</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 40 }}>
                {["Everything in Free", "All 9 AI advisers", "Investor marketplace", "Academy cohort access", "Priority support"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Check size={14} style={{ color: C.ember, flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.70)" }}>{f}</span>
                  </div>
                ))}
              </div>
              <motion.button onClick={() => router.push("/founder/onboarding")} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                style={{ width: "100%", padding: "13px", borderRadius: 10, background: C.ember, border: "none", color: "#fff", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em" }}>
                Start 14-day free trial
              </motion.button>
              <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.2)", marginTop: 12 }}>No credit card required</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ + CTA — side by side in one dark section ───────────────────── */}
      <section style={{ background: C.night, padding: "112px 24px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          <div style={{ position: "absolute", top: "10%", left: "0%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(217,119,87,0.10) 0%, transparent 70%)", filter: "blur(80px)" }} />
          <div style={{ position: "absolute", bottom: "0%", right: "5%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)", filter: "blur(80px)" }} />
        </div>

        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64, alignItems: "start" }}>

          {/* ── LEFT: FAQ — accordion expands below each question ─── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: C.ember, marginBottom: 14, fontFamily: "monospace" }}>FAQ</p>
            <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 300, letterSpacing: "-0.04em", color: "#fff", lineHeight: 1.05, marginBottom: 40 }}>
              Common questions.
            </h2>

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              {FAQS.map((item, i) => (
                <div key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {/* Question row */}
                  <button onClick={() => setActiveFaq(activeFaq === i ? -1 : i)}
                    style={{
                      width: "100%", padding: "18px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16,
                      background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                    }}>
                    <span style={{ fontSize: 14, fontWeight: activeFaq === i ? 500 : 400, color: activeFaq === i ? "#fff" : "rgba(255,255,255,0.45)", lineHeight: 1.45, letterSpacing: "-0.01em", transition: "color .15s" }}>
                      {item.q}
                    </span>
                    <motion.div animate={{ rotate: activeFaq === i ? 45 : 0 }} transition={{ duration: 0.2 }} style={{ flexShrink: 0, marginTop: 3 }}>
                      <div style={{ width: 18, height: 18, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="7" height="7" viewBox="0 0 8 8" fill="none">
                          <path d="M4 0V8M0 4H8" stroke={activeFaq === i ? C.ember : "rgba(255,255,255,0.4)"} strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                    </motion.div>
                  </button>
                  {/* Answer — expands below */}
                  <AnimatePresence>
                    {activeFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.26, ease }}
                        style={{ overflow: "hidden" }}
                      >
                        <p style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(255,255,255,0.45)", fontWeight: 300, letterSpacing: "-0.01em", paddingBottom: 18 }}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>

          {/* ── RIGHT: CTA ───────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.15, duration: 0.7 }}
            style={{ display: "flex", flexDirection: "column", gap: 48 }}>

            {/* CTA */}
            <div style={{ paddingTop: 8 }}>
              <p style={{ fontSize: 10, fontFamily: "monospace", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)", marginBottom: 24 }}>Ready to raise</p>
              <h2 style={{ fontFamily: FONT_SERIF, fontSize: "clamp(32px, 4vw, 52px)", fontWeight: 300, letterSpacing: "-0.04em", lineHeight: 1.05, color: "#fff", marginBottom: 32 }}>
                Build the company<br /><em style={{ fontStyle: "italic", color: C.ember }}>investors want to fund.</em>
              </h2>
              <motion.button onClick={() => router.push("/founder/onboarding")} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "15px 36px", borderRadius: 10, border: "none", background: C.ember, color: "#fff", fontSize: 15, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", letterSpacing: "-0.01em", boxShadow: "0 4px 24px rgba(217,119,87,0.35)" }}>
                Start free <ArrowRight size={15} />
              </motion.button>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 16, letterSpacing: "0.06em", fontFamily: "monospace" }}>10-minute setup · No credit card · Free forever</p>
              <div style={{ display: "flex", gap: 40, marginTop: 48, paddingTop: 40, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                {[["$2.3B+", "Raised"], ["10,000+", "Founders"], ["500+", "Investors"]].map(([n, l]) => (
                  <div key={l}>
                    <p style={{ fontFamily: FONT_SERIF, fontSize: 26, fontWeight: 300, color: "#fff", letterSpacing: "-0.03em", marginBottom: 4 }}>{n}</p>
                    <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.14em", color: "rgba(255,255,255,0.2)", fontFamily: "monospace" }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: C.night, borderTop: "1px solid rgba(255,255,255,0.06)", padding: "52px 24px 36px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 44 }}>
            <div>
              <p style={{ fontSize: 15, fontWeight: 500, color: "rgba(255,255,255,0.45)", fontFamily: FONT_SERIF, letterSpacing: "-0.02em", marginBottom: 14 }}>Edge Alpha</p>
              <p style={{ fontSize: 13, lineHeight: 1.65, color: "rgba(255,255,255,0.18)", maxWidth: 220, fontWeight: 300 }}>AI-powered advisers and investor marketplace for ambitious founders.</p>
            </div>
            {[
              { title: "Product", links: [{ label: "Q-Score", href: "/founder/improve-qscore" }, { label: "AI Agents", href: "/founder/cxo" }, { label: "Academy", href: "/founder/academy" }, { label: "Investor Matching", href: "/founder/matching" }] },
              { title: "Resources", links: [{ label: "Startup Library", href: "/library" }, { label: "Frameworks", href: "/library?type=framework" }, { label: "Playbooks", href: "/library?type=playbook" }, { label: "Templates", href: "/library?type=template" }] },
              { title: "Company", links: [{ label: "For Founders", href: "/founder/onboarding" }, { label: "For Investors", href: "/investor/onboarding" }, { label: "Contact", href: "#" }, { label: "Privacy", href: "#" }] },
            ].map(col => (
              <div key={col.title}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.18em", fontWeight: 700, marginBottom: 18, color: "rgba(255,255,255,0.15)", fontFamily: "monospace" }}>{col.title}</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map(l => (
                    <li key={l.label} style={{ marginBottom: 11 }}>
                      <Link href={l.href} style={{ fontSize: 13, color: "rgba(255,255,255,0.28)", textDecoration: "none", fontWeight: 300, letterSpacing: "-0.01em", transition: "color .2s" }}
                        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.60)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.28)")}
                      >{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.05)", flexWrap: "wrap", gap: 12 }}>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.13)", fontWeight: 300 }}>&copy; 2026 Edge Alpha. All rights reserved.</p>
            <div style={{ display: "flex", gap: 20, fontSize: 10, color: "rgba(255,255,255,0.10)", letterSpacing: "0.12em", fontFamily: "monospace" }}>
              <span>SECURE</span><span>PRIVATE</span><span>AI-POWERED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
