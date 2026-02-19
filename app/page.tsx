"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useInView, useScroll } from "framer-motion";
import {
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  CheckCircle,
  ChevronRight,
  GraduationCap,
  Lock,
  Mail,
  Menu,
  Send,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

// ─── palette ─────────────────────────────────────────────────────────────────
// cream bg: #F9F7F2 | surface: #F0EDE6 | border: #E2DDD5
// ink: #18160F | muted: #8A867C | accent blue: #2563EB (used sparingly)

// ─── data ────────────────────────────────────────────────────────────────────

const agentMessages = [
  { role: "user",  text: "We're struggling with churn. Users drop off after month three." },
  { role: "agent", text: "Three patterns show up in your data. No habit-forming trigger in week two. 68% of users never reach your core value event. And your success milestone is undefined — users don't know when they've won." },
  { role: "user",  text: "What should I prioritise first?" },
  { role: "agent", text: "Define one clear success event in the first seven days, then rebuild onboarding backwards from that moment. This alone reduces early churn by 20–35% in most SaaS products.", typing: true },
];

const pillars = [
  {
    num: "01", icon: BarChart3, label: "Q-Score",
    title: "Algorithmic investment readiness scoring",
    body: "A precise, multi-dimensional score across team, market, traction, and financials. Know exactly where you stand — and what moves the needle.",
    bullets: ["Scored across 6 dimensions", "Live percentile ranking", "Prioritised improvement plan"],
  },
  {
    num: "02", icon: Bot, label: "AI Agents",
    title: "Expert advisers across every function",
    body: "Strategy, marketing, sales, HR, finance — each agent has deep domain knowledge of your business and is available the moment you need it.",
    bullets: ["Specialised, context-aware", "Available 24 / 7, on demand", "Every session feeds your Q-Score"],
  },
  {
    num: "03", icon: GraduationCap, label: "Academy",
    title: "Cohort programs with founders and mentors",
    body: "Join structured programs with peers at the same stage. Work on strategy live, get direct feedback, build a network that lasts beyond the raise.",
    bullets: ["Stage-matched cohorts", "Live sessions with operators", "Peer accountability built in"],
  },
  {
    num: "04", icon: Users, label: "Marketplace",
    title: "Curated access to 500+ verified investors",
    body: "When your Q-Score is ready, the marketplace opens. Thesis-matched introductions to investors who are actively deploying.",
    bullets: ["500+ verified investors", "Thesis-aligned AI matching", "Gated for quality founders"],
    locked: true,
  },
];

const agentRoles = [
  { num: "01", name: "Strategy",    desc: "Positioning · business model · go-to-market" },
  { num: "02", name: "Marketing",   desc: "Acquisition · content · brand narrative" },
  { num: "03", name: "Sales",       desc: "Pipeline · closing · pricing · objections" },
  { num: "04", name: "Finance",     desc: "Unit economics · runway · fundraise prep" },
  { num: "05", name: "HR & Team",   desc: "Hiring · culture · org design" },
  { num: "06", name: "Legal & Ops", desc: "Contracts · compliance · process" },
];

const investors = [
  { name: "Sequoia Capital",      type: "VC · USA / India",     logo: "S",    check: "$1M – $50M",   stages: "Seed · Series A", match: 95 },
  { name: "Andreessen Horowitz",  type: "VC · USA / UK",        logo: "a16z", check: "$500k – $100M", stages: "Seed · Growth",   match: 88 },
  { name: "Y Combinator",         type: "Accelerator · Global", logo: "YC",   check: "$500k",         stages: "Pre-seed · Seed", match: 100 },
  { name: "Accel",                type: "VC · USA / Europe",    logo: "A",    check: "$1M – $30M",   stages: "Seed · Series A", match: 92 },
  { name: "Index Ventures",       type: "VC · UK / USA",        logo: "IX",   check: "$2M – $50M",   stages: "Series A · B",    match: 85 },
  { name: "Lightspeed",           type: "VC · USA / India",     logo: "LS",   check: "$500k – $25M", stages: "Seed · Series A", match: 78 },
];

const testimonials = [
  { initials: "SC", name: "Sarah Chen",      role: "Founder, TechFlow",      quote: "The Marketing Adviser helped us rethink GTM from scratch. Then Edge Alpha matched us with the right investors. Raised seed in two weeks." },
  { initials: "MJ", name: "Marcus Johnson",  role: "CEO, DataPipe",           quote: "Q-Score pinpointed our weak spots. The Finance Agent fixed them. Investors took us seriously and we closed 3× faster than expected." },
  { initials: "ER", name: "Elena Rodriguez", role: "Partner, Vertex Capital",  quote: "Every founder I see from Edge Alpha has actually prepared. The Q-Score filter alone saves me hours of due diligence each week." },
  { initials: "DP", name: "David Park",      role: "Founder, CloudStack",     quote: "Strategy Agent nailed our positioning before we talked to a single investor. Found our lead through the marketplace. Nothing like it." },
  { initials: "AF", name: "Amanda Foster",   role: "GP, Horizon Ventures",    quote: "More than half my deal flow comes from Edge Alpha. The quality bar the platform sets is exceptional." },
  { initials: "JL", name: "James Liu",       role: "Founder, AIBotics",       quote: "Finance AI helped us model unit economics properly. Q-Score went from 62 to 84. Series A closed six weeks later." },
];

const stats = [
  { to: 2.3,   decimals: 1, prefix: "$", suffix: "B+", label: "Raised via platform" },
  { to: 10000, decimals: 0, prefix: "",  suffix: "+",  label: "Active founders" },
  { to: 500,   decimals: 0, prefix: "",  suffix: "+",  label: "Verified investors" },
  { to: 95,    decimals: 0, prefix: "",  suffix: "%",  label: "Match accuracy" },
];

const pressLogos = ["TechCrunch", "Forbes", "Bloomberg", "The Verge", "WIRED", "Fast Company", "Inc.", "Fortune"];

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
      <div style={{ height: 4, width: 56, borderRadius: 999, background: "#E8E4DC", overflow: "hidden" }}>
        <motion.div
          style={{ height: "100%", borderRadius: 999, background: "#18160F" }}
          initial={{ width: 0 }}
          animate={inView ? { width: `${value}%` } : { width: 0 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: "#18160F" }}>{value}%</span>
    </div>
  );
}

// ─── TestimonialCard ──────────────────────────────────────────────────────────

function TestimonialCard({ t }: { t: typeof testimonials[0] }) {
  return (
    <div style={{
      width: 340, flexShrink: 0, marginRight: 20,
      padding: "24px 28px",
      background: "#FDFCFA",
      border: "1px solid #E2DDD5",
      borderRadius: 16,
    }}>
      <p style={{ fontSize: 14, fontWeight: 300, lineHeight: 1.7, color: "#5A5650", marginBottom: 20, fontStyle: "italic" }}>
        &ldquo;{t.quote}&rdquo;
      </p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 16, borderTop: "1px solid #E8E4DC" }}>
        <div style={{
          height: 32, width: 32, borderRadius: "50%",
          background: "#E8E4DC", color: "#5A5650",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 500, flexShrink: 0,
        }}>
          {t.initials}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: "#18160F" }}>{t.name}</p>
          <p style={{ fontSize: 11, fontWeight: 300, color: "#B5B0A8" }}>{t.role}</p>
        </div>
      </div>
    </div>
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
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
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
      <button onClick={() => setOpen((v) => !v)} className={className} style={style}>
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
              background: "#F9F7F2", border: "1px solid #E2DDD5", borderRadius: 12,
              overflow: "hidden", minWidth: 210,
              boxShadow: "0 12px 36px rgba(24,22,15,0.13)", zIndex: 200,
            }}
          >
            <button
              onClick={() => navigate("/founder/onboarding")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F0EDE6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              style={{ display: "block", width: "100%", padding: "14px 20px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: 11, display: "block", color: "#8A867C", marginBottom: 2, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>First time</span>
              <span style={{ fontSize: 14, fontWeight: 500, color: "#18160F" }}>Get started free</span>
            </button>
            <div style={{ height: 1, background: "#E2DDD5" }} />
            <button
              onClick={() => navigate("/login")}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#F0EDE6")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              style={{ display: "block", width: "100%", padding: "14px 20px", textAlign: "left", background: "transparent", border: "none", cursor: "pointer" }}
            >
              <span style={{ fontSize: 11, display: "block", color: "#8A867C", marginBottom: 2, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>Returning</span>
              <span style={{ fontSize: 14, fontWeight: 400, color: "#18160F" }}>Sign in</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const [scrolled, setScrolled]     = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [visibleMsg, setVisibleMsg] = useState(1);
  const [activeAgent, setActiveAgent] = useState(0);

  const { scrollYProgress } = useScroll();

  const chatRef    = useRef<HTMLDivElement>(null);
  const chatInView = useInView(chatRef, { once: true, amount: 0.4 });

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    if (!chatInView || visibleMsg >= agentMessages.length) return;
    const t = setTimeout(() => setVisibleMsg((v) => v + 1), 1200);
    return () => clearTimeout(t);
  }, [chatInView, visibleMsg]);

  // Cycle through agents every 2.5s
  useEffect(() => {
    const t = setInterval(() => setActiveAgent((v) => (v + 1) % agentRoles.length), 2500);
    return () => clearInterval(t);
  }, []);

  const go = (p: string) => router.push(p);

  return (
    <div className="min-h-screen antialiased" style={{ background: "#F9F7F2", color: "#18160F" }}>

      {/* ── SCROLL PROGRESS BAR ──────────────────────────────────────────── */}
      <motion.div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, height: 2,
          background: "#18160F", scaleX: scrollYProgress,
          transformOrigin: "0%", zIndex: 200,
        }}
      />

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <motion.header
        className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(249,247,242,0.92)" : "rgba(249,247,242,0)",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid #E2DDD5" : "1px solid transparent",
        }}
        initial={{ y: -64 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8 h-16 flex items-center justify-between">
          <button onClick={() => go("/")} className="flex items-center gap-2.5 group">
            <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "#18160F" }}>
              <span className="font-bold text-[8px] tracking-tight" style={{ color: "#F9F7F2" }}>EA</span>
            </div>
            <span className="font-medium tracking-tight text-[15px]" style={{ color: "#18160F" }}>Edge Alpha</span>
          </button>

          <nav className="hidden md:flex items-center gap-10">
            {["How it works", "For investors"].map((l) => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="text-[13px] font-light transition-opacity hover:opacity-70"
                style={{ color: "#8A867C" }}>
                {l}
              </a>
            ))}
            <GetStartedDropdown
              label="Get started"
              className="text-[13px] font-medium px-5 py-2 rounded-full transition-all hover:scale-[1.03] active:scale-[0.97]"
              style={{ background: "#18160F", color: "#F9F7F2" }}
              align="right"
            />
          </nav>

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)} style={{ color: "#8A867C" }}>
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
              style={{ background: "#F9F7F2", borderTop: "1px solid #E2DDD5" }}
            >
              <a href="#how-it-works" className="block text-sm font-light" style={{ color: "#8A867C" }} onClick={() => setMobileOpen(false)}>How it works</a>
              <a href="#for-investors" className="block text-sm font-light" style={{ color: "#8A867C" }} onClick={() => setMobileOpen(false)}>For investors</a>
              <GetStartedDropdown
                label="Get started free"
                className="w-full text-sm font-medium py-3 rounded-full"
                style={{ background: "#18160F", color: "#F9F7F2" }}
                align="center"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-6 lg:px-8 relative overflow-hidden">
        {/* Subtle dot-grid background */}
        <div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(#E2DDD5 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.5,
            pointerEvents: "none",
          }}
        />
        {/* Fade overlay so dots fade toward bottom */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(249,247,242,0.3) 0%, rgba(249,247,242,0.85) 60%, #F9F7F2 100%)",
          pointerEvents: "none",
        }} />

        <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-16 items-center relative">

          {/* copy */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium tracking-wide mb-8"
              style={{ background: "#F0EDE6", border: "1px solid #E2DDD5", color: "#8A867C", letterSpacing: "0.08em" }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
              AI-POWERED BUSINESS ADVISERS
            </motion.div>

            <h1
              className="text-5xl sm:text-6xl xl:text-7xl leading-[1.05] tracking-tight mb-7"
              style={{ fontWeight: 300, color: "#18160F" }}
            >
              {[
                { text: "Build a fundable", color: "#18160F" },
                { text: "business.",        color: "#18160F" },
                { text: "Then raise.",      color: "#8A867C" },
              ].map((line, i) => (
                <motion.span
                  key={i}
                  style={{ display: "block", color: line.color }}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.16, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                >
                  {line.text}
                </motion.span>
              ))}
            </h1>

            <motion.p
              className="text-[17px] font-light leading-relaxed max-w-md mb-10"
              style={{ color: "#8A867C" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.72, duration: 0.6 }}
            >
              Expert AI advisers strengthen every part of your startup. Once you&apos;re ready, 500+ verified investors are waiting.
            </motion.p>

            <motion.div
              className="flex flex-wrap items-center gap-4 mb-12"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.88, duration: 0.5 }}
            >
              <GetStartedDropdown
                label={<>Start free <ArrowRight className="h-4 w-4" /></>}
                className="inline-flex items-center gap-2 text-[14px] font-medium px-7 py-3.5 rounded-full transition-all hover:opacity-90 hover:scale-[1.03] active:scale-[0.97]"
                style={{ background: "#18160F", color: "#F9F7F2" }}
                align="left"
              />
              <button
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
                className="text-[14px] font-light inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
                style={{ color: "#8A867C" }}
              >
                See how it works
                <ChevronRight className="h-4 w-4" />
              </button>
            </motion.div>

            {/* proof */}
            <motion.div
              className="flex items-center gap-3 pt-8"
              style={{ borderTop: "1px solid #E2DDD5" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.05, duration: 0.5 }}
            >
              <div className="flex -space-x-2">
                {["#C2B89A", "#A8A090", "#8A9BB5", "#9BB5A0"].map((c, i) => (
                  <div key={i} className="h-7 w-7 rounded-full border-2" style={{ background: c, borderColor: "#F9F7F2" }} />
                ))}
              </div>
              <p className="text-[13px] font-light" style={{ color: "#8A867C" }}>
                <span className="font-medium" style={{ color: "#18160F" }}>10,000+</span> founders growing with Edge Alpha
              </p>
            </motion.div>
          </div>

          {/* chat mock */}
          <motion.div
            ref={chatRef}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            <div
              className="relative rounded-2xl overflow-hidden shadow-sm"
              style={{ background: "#FDFCFA", border: "1px solid #E2DDD5" }}
            >
              {/* window bar */}
              <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: "1px solid #E8E4DC" }}>
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#E8C4B8" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#E8DDB8" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "#B8E8C4" }} />
                <div className="ml-3 flex items-center gap-2">
                  <div className="h-5 w-5 rounded flex items-center justify-center" style={{ background: "#18160F" }}>
                    <Bot className="h-3 w-3" style={{ color: "#F9F7F2" }} />
                  </div>
                  <span className="text-[12px] font-medium" style={{ color: "#8A867C" }}>Strategy Adviser</span>
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 ml-1" />
                </div>
              </div>

              {/* messages */}
              <div className="px-4 py-5 space-y-4 min-h-[280px]" style={{ background: "#F9F7F2" }}>
                {agentMessages.map((msg, i) => {
                  if (i >= visibleMsg) return null;
                  const isUser   = msg.role === "user";
                  const isTyping = (msg as { typing?: boolean }).typing && i === visibleMsg - 1;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
                      className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : ""}`}>
                      {!isUser && (
                        <div className="h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#18160F" }}>
                          <Bot className="h-3 w-3" style={{ color: "#F9F7F2" }} />
                        </div>
                      )}
                      <div
                        className="max-w-[78%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed"
                        style={isUser
                          ? { background: "#18160F", color: "#F9F7F2", borderRadius: "12px 4px 12px 12px" }
                          : { background: "#F0EDE6", border: "1px solid #E2DDD5", color: "#18160F", borderRadius: "4px 12px 12px 12px" }
                        }
                      >
                        {msg.text}
                        {isTyping && (
                          <motion.span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle rounded" style={{ background: "#8A867C" }}
                            animate={{ opacity: [1, 0] }} transition={{ repeat: Infinity, duration: 0.7 }} />
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* input */}
              <div className="px-4 py-3 flex items-center gap-3" style={{ borderTop: "1px solid #E8E4DC", background: "#FDFCFA" }}>
                <input readOnly placeholder="Ask your adviser…"
                  className="flex-1 text-[13px] font-light rounded-lg px-3 py-2 focus:outline-none"
                  style={{ background: "#F0EDE6", border: "1px solid #E2DDD5", color: "#8A867C" }} />
                <button className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform hover:scale-105" style={{ background: "#18160F" }}>
                  <Send className="h-3.5 w-3.5" style={{ color: "#F9F7F2" }} />
                </button>
              </div>

              {/* score strip */}
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: "#F0EDE6", borderTop: "1px solid #E2DDD5" }}>
                <span className="text-[11px] font-light" style={{ color: "#8A867C" }}>This session is improving your Q-Score</span>
                <div className="flex items-center gap-1 text-[11px] font-medium" style={{ color: "#18160F" }}>
                  <TrendingUp className="h-3 w-3" /> +3 pts
                </div>
              </div>
            </div>

            {/* floating chip – Q-Score (bobs continuously after appearing) */}
            <motion.div
              className="absolute -bottom-4 -left-5 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm"
              style={{ background: "#FDFCFA", border: "1px solid #E2DDD5" }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ delay: 1.7, duration: 3, repeat: Infinity, ease: "easeInOut" }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div className="h-7 w-7 rounded flex items-center justify-center" style={{ background: "#F0EDE6" }}>
                  <TrendingUp className="h-3.5 w-3.5" style={{ color: "#18160F" }} />
                </div>
                <div>
                  <p className="text-[10px] font-light" style={{ color: "#8A867C" }}>Q-Score</p>
                  <p className="text-[12px] font-semibold" style={{ color: "#18160F" }}>84 / 100</p>
                </div>
              </motion.div>
            </motion.div>

            {/* floating chip – Investors (bobs slightly offset) */}
            <motion.div
              className="absolute -top-4 -right-5 rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-sm"
              style={{ background: "#FDFCFA", border: "1px solid #E2DDD5" }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.4, type: "spring", stiffness: 200 }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ delay: 2.1, duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <div className="h-7 w-7 rounded flex items-center justify-center" style={{ background: "#F0EDE6" }}>
                  <Users className="h-3.5 w-3.5" style={{ color: "#18160F" }} />
                </div>
                <div>
                  <p className="text-[10px] font-light" style={{ color: "#8A867C" }}>Investors matched</p>
                  <p className="text-[12px] font-semibold" style={{ color: "#18160F" }}>12 this week</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── PRESS MARQUEE ────────────────────────────────────────────────── */}
      <div
        className="py-10 relative"
        style={{ borderTop: "1px solid #E2DDD5", borderBottom: "1px solid #E2DDD5" }}
      >
        {/* edge fades */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 100, zIndex: 1, background: "linear-gradient(to right, #F9F7F2, transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 100, zIndex: 1, background: "linear-gradient(to left, #F9F7F2, transparent)", pointerEvents: "none" }} />

        <p className="text-center text-[10px] uppercase tracking-[0.22em] font-medium mb-7" style={{ color: "#B5B0A8" }}>
          Founders featured in
        </p>
        <div className="mq-wrap" style={{ overflow: "hidden" }}>
          <div
            className="mq-inner-l"
            style={{ "--mq-speed": "22s" } as React.CSSProperties}
          >
            {[...pressLogos, ...pressLogos].map((n, i) => (
              <span
                key={i}
                style={{
                  padding: "0 44px", fontSize: 15, fontWeight: 300,
                  color: "#C8C3BB", flexShrink: 0, whiteSpace: "nowrap",
                  cursor: "default", letterSpacing: "-0.01em",
                }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── FOUR PILLARS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-16" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-4" style={{ color: "#B5B0A8" }}>Platform</p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 className="text-3xl sm:text-4xl tracking-tight max-w-lg leading-tight" style={{ fontWeight: 300, color: "#18160F" }}>
                Four tools that work together.
              </h2>
              <p className="text-[14px] font-light max-w-xs leading-relaxed" style={{ color: "#8A867C" }}>
                Strengthen your business, prove it with data, then unlock funding.
              </p>
            </div>
          </motion.div>

          <div className="divide-y" style={{ borderTop: "1px solid #E2DDD5", borderColor: "#E2DDD5" }}>
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.num}
                  className="grid md:grid-cols-12 gap-6 py-10 group cursor-pointer relative"
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07 }}
                  whileHover={{ backgroundColor: "rgba(240,237,230,0.4)" }}
                  onClick={() => go("/founder/onboarding")}
                  style={{ borderRadius: 8, transition: "background 0.2s" }}
                >
                  <div className="md:col-span-1">
                    <span className="text-[12px] font-mono" style={{ color: "#C8C3BB" }}>{p.num}</span>
                  </div>
                  <div className="md:col-span-2 flex items-start gap-2">
                    <motion.div
                      className="h-8 w-8 rounded flex items-center justify-center shrink-0 transition-colors"
                      style={{ background: "#F0EDE6", border: "1px solid #E2DDD5" }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Icon className="h-4 w-4" style={{ color: "#8A867C" }} />
                    </motion.div>
                    <span className="text-[11px] uppercase tracking-[0.14em] font-medium mt-2" style={{ color: "#8A867C" }}>{p.label}</span>
                    {p.locked && (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full mt-2 ml-1"
                        style={{ background: "#F5EDD8", border: "1px solid #E8D9B8" }}>
                        <Lock className="h-2.5 w-2.5" style={{ color: "#C4A96A" }} />
                        <span className="text-[9px] font-medium" style={{ color: "#C4A96A", letterSpacing: "0.06em" }}>UNLOCKS</span>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-4">
                    <h3 className="text-[17px] leading-snug mb-2" style={{ fontWeight: 300, color: "#18160F" }}>{p.title}</h3>
                    <p className="text-[13px] font-light leading-relaxed" style={{ color: "#8A867C" }}>{p.body}</p>
                  </div>
                  <div className="md:col-span-4">
                    <ul className="space-y-2">
                      {p.bullets.map((b) => (
                        <li key={b} className="flex items-center gap-2 text-[13px] font-light" style={{ color: "#8A867C" }}>
                          <div className="h-1 w-1 rounded-full shrink-0" style={{ background: "#C8C3BB" }} />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="md:col-span-1 flex items-center justify-end">
                    <ArrowUpRight className="h-4 w-4 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "#C8C3BB" }} />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── AI AGENTS ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#F0EDE6" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-20 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-5" style={{ color: "#B5B0A8" }}>AI Agents</p>
              <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight mb-7" style={{ fontWeight: 300, color: "#18160F" }}>
                Expert advisers.<br />No office hours.
              </h2>
              <p className="text-[15px] font-light leading-relaxed mb-10 max-w-md" style={{ color: "#8A867C" }}>
                Each agent carries deep domain expertise and full context of your business. Not generic advice — they know your numbers, your market, and exactly where you&apos;re falling short.
              </p>

              <div className="space-y-6 mb-10">
                {[
                  { title: "On demand, any time", desc: "At 2 am before a pitch, mid-sprint, or while building your model — your advisers are always ready." },
                  { title: "Context-aware by default", desc: "Every agent is pre-loaded with your profile, Q-Score data, and the full history of previous sessions." },
                  { title: "Progress that compounds", desc: "Conversations translate to actions. Actions move your Q-Score. Score unlocks the investor marketplace." },
                ].map(({ title, desc }, i) => (
                  <motion.div
                    key={title}
                    className="flex gap-4"
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <div className="h-1.5 w-1.5 rounded-full shrink-0 mt-2" style={{ background: "#C8C3BB" }} />
                    <div>
                      <p className="text-[14px] font-medium mb-0.5" style={{ color: "#18160F" }}>{title}</p>
                      <p className="text-[13px] font-light leading-relaxed" style={{ color: "#8A867C" }}>{desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <button
                onClick={() => go("/founder/onboarding")}
                className="inline-flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-full transition-all hover:opacity-80 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#18160F", color: "#F9F7F2" }}
              >
                Meet your advisers <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            {/* agent list with auto-cycling active highlight */}
            <motion.div
              className="divide-y rounded-2xl overflow-hidden"
              style={{ background: "#FDFCFA", border: "1px solid #E2DDD5", borderColor: "#E2DDD5" }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              {agentRoles.map((a, i) => (
                <motion.button
                  key={a.num}
                  className="w-full text-left px-6 py-5 flex items-center justify-between group transition-colors relative overflow-hidden"
                  style={{ borderBottom: i < agentRoles.length - 1 ? "1px solid #E8E4DC" : "none" }}
                  animate={{ backgroundColor: i === activeAgent ? "#F5F2EC" : "rgba(253,252,250,0)" }}
                  whileHover={{ backgroundColor: "#F5F2EC" }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => go("/founder/onboarding")}
                >
                  {/* sliding active indicator */}
                  {i === activeAgent && (
                    <motion.div
                      layoutId="agent-active-bar"
                      style={{
                        position: "absolute", left: 0, top: 0, bottom: 0,
                        width: 3, background: "#18160F",
                        borderRadius: "0 2px 2px 0",
                      }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-mono w-5" style={{ color: "#C8C3BB" }}>{a.num}</span>
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: "#18160F" }}>{a.name} Adviser</p>
                      <p className="text-[12px] font-light mt-0.5" style={{ color: "#8A867C" }}>{a.desc}</p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" style={{ color: "#C8C3BB" }} />
                </motion.button>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── MARKETPLACE ───────────────────────────────────────────────────── */}
      <section id="for-investors" className="py-28 px-6">
        <div className="mx-auto max-w-7xl">
          <motion.div className="mb-12" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-4" style={{ color: "#B5B0A8" }}>Marketplace</p>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight max-w-lg" style={{ fontWeight: 300, color: "#18160F" }}>
                When you&apos;re ready, the investors are waiting.
              </h2>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full w-fit"
                style={{ background: "#F5EDD8", border: "1px solid #E8D9B8" }}>
                <Lock className="h-3 w-3" style={{ color: "#C4A96A" }} />
                <span className="text-[11px] font-medium" style={{ color: "#C4A96A", letterSpacing: "0.04em" }}>Unlocks at Q-Score ≥ 70</span>
              </div>
            </div>
          </motion.div>

          {/* table */}
          <motion.div
            className="rounded-2xl overflow-hidden"
            style={{ border: "1px solid #E2DDD5" }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <table className="w-full">
              <thead>
                <tr style={{ background: "#F0EDE6", borderBottom: "1px solid #E2DDD5" }}>
                  {["Investor", "Check size", "Stages", "Match"].map((h, i) => (
                    <th key={h} className={`text-left py-3.5 px-5 text-[10px] uppercase tracking-[0.16em] font-medium ${i === 1 ? "hidden sm:table-cell" : ""} ${i === 2 ? "hidden md:table-cell" : ""}`}
                      style={{ color: "#B5B0A8" }}>
                      {h}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {investors.map((inv, i) => (
                  <motion.tr
                    key={inv.name}
                    className="cursor-pointer transition-colors"
                    style={{ borderBottom: i < investors.length - 1 ? "1px solid #EAE7E0" : "none" }}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ backgroundColor: "#F5F2EC" }}
                    onClick={() => go("/founder/onboarding")}
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                          style={{ background: "#F0EDE6", color: "#18160F", border: "1px solid #E2DDD5" }}>
                          {inv.logo}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium" style={{ color: "#18160F" }}>{inv.name}</p>
                          <p className="text-[11px] font-light" style={{ color: "#B5B0A8" }}>{inv.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-5 hidden sm:table-cell text-[13px] font-light" style={{ color: "#8A867C" }}>{inv.check}</td>
                    <td className="py-4 px-5 hidden md:table-cell text-[13px] font-light" style={{ color: "#8A867C" }}>{inv.stages}</td>
                    <td className="py-4 px-5">
                      <MatchBar value={inv.match} />
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button className="inline-flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-60"
                        style={{ color: "#8A867C" }}>
                        <Mail className="h-3.5 w-3.5" /> Connect
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            <div className="px-5 py-4 flex items-center justify-between" style={{ background: "#F5F2EC", borderTop: "1px solid #E2DDD5" }}>
              <span className="text-[12px] font-light" style={{ color: "#B5B0A8" }}>Showing 6 of 500+ investors</span>
              <button className="text-[12px] font-medium inline-flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: "#18160F" }} onClick={() => go("/founder/onboarding")}>
                Unlock full marketplace <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <div className="py-16 px-6" style={{ background: "#F0EDE6", borderTop: "1px solid #E2DDD5", borderBottom: "1px solid #E2DDD5" }}>
        <div className="mx-auto max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <p className="text-3xl tracking-tight mb-1" style={{ fontWeight: 300, color: "#18160F" }}>
                <CountUp to={s.to} decimals={s.decimals} prefix={s.prefix} suffix={s.suffix} />
              </p>
              <p className="text-[11px] uppercase tracking-[0.14em] font-medium" style={{ color: "#B5B0A8" }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ── TESTIMONIALS (dual infinite marquee) ─────────────────────────── */}
      <section className="py-28 overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 mb-14">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-3" style={{ color: "#B5B0A8" }}>Testimonials</p>
            <h2 className="text-3xl sm:text-4xl tracking-tight max-w-sm leading-tight" style={{ fontWeight: 300, color: "#18160F" }}>
              What founders and investors say.
            </h2>
          </motion.div>
        </div>

        {/* Row 1 – scrolls left */}
        <div className="mq-wrap mb-5 relative" style={{ overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 1, background: "linear-gradient(to right, #F9F7F2, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 1, background: "linear-gradient(to left, #F9F7F2, transparent)", pointerEvents: "none" }} />
          <div
            className="mq-inner-l"
            style={{ "--mq-speed": "38s" } as React.CSSProperties}
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        </div>

        {/* Row 2 – scrolls right */}
        <div className="mq-wrap relative" style={{ overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, zIndex: 1, background: "linear-gradient(to right, #F9F7F2, transparent)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, zIndex: 1, background: "linear-gradient(to left, #F9F7F2, transparent)", pointerEvents: "none" }} />
          <div
            className="mq-inner-r"
            style={{ "--mq-speed": "44s" } as React.CSSProperties}
          >
            {[...testimonials, ...testimonials].map((t, i) => (
              <TestimonialCard key={i} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR INVESTORS ─────────────────────────────────────────────────── */}
      <section className="py-28 px-6" style={{ background: "#F0EDE6" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
              <p className="text-[10px] uppercase tracking-[0.22em] font-medium mb-5" style={{ color: "#B5B0A8" }}>For Investors</p>
              <h2 className="text-3xl sm:text-4xl tracking-tight leading-tight mb-6" style={{ fontWeight: 300, color: "#18160F" }}>
                Better deal flow.<br />Less noise.
              </h2>
              <p className="text-[15px] font-light leading-relaxed mb-8 max-w-md" style={{ color: "#8A867C" }}>
                Every founder in the marketplace has been scored algorithmically across six dimensions. You see pre-qualified, thesis-matched startups — not cold inbound.
              </p>
              <ul className="space-y-3 mb-8">
                {["Algorithmic Q-Score on every deal", "Thesis-matched AI recommendations", "Founders who have done the preparation work", "Automated due-diligence summaries"].map((f, i) => (
                  <motion.li
                    key={f}
                    className="flex items-start gap-3 text-[14px] font-light"
                    style={{ color: "#8A867C" }}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.09 }}
                  >
                    <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "#C8C3BB" }} />
                    {f}
                  </motion.li>
                ))}
              </ul>
              <button
                onClick={() => go("/investor/onboarding")}
                className="inline-flex items-center gap-2 text-[14px] font-medium px-6 py-3 rounded-full transition-all hover:opacity-80 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#18160F", color: "#F9F7F2" }}
              >
                Join as an investor <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>

            <motion.div
              className="space-y-px rounded-2xl overflow-hidden"
              style={{ border: "1px solid #E2DDD5" }}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              {[
                { name: "NeuralTech",  tag: "AI · Series A",    score: 891, match: 94 },
                { name: "CloudScale",  tag: "DevTools · Seed",  score: 847, match: 91 },
                { name: "HealthOS",    tag: "HealthTech · Seed", score: 823, match: 88 },
              ].map((d, i) => (
                <motion.div
                  key={d.name}
                  className="flex items-center justify-between px-6 py-5"
                  style={{ background: "#FDFCFA", borderBottom: i < 2 ? "1px solid #E8E4DC" : "none" }}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  whileHover={{ backgroundColor: "#F5F2EC" }}
                >
                  <div>
                    <p className="text-[14px] font-medium" style={{ color: "#18160F" }}>{d.name}</p>
                    <p className="text-[12px] font-light mt-0.5" style={{ color: "#B5B0A8" }}>{d.tag}</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-0.5" style={{ color: "#C8C3BB" }}>Q-Score</p>
                      <p className="text-[14px] font-medium" style={{ color: "#18160F" }}>{d.score}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.12em] font-medium mb-0.5" style={{ color: "#C8C3BB" }}>Match</p>
                      <p className="text-[14px] font-medium" style={{ color: "#18160F" }}>{d.match}%</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4" style={{ color: "#C8C3BB" }} />
                  </div>
                </motion.div>
              ))}
              <div className="px-6 py-3.5 text-center" style={{ background: "#F5F2EC", borderTop: "1px solid #E2DDD5" }}>
                <p className="text-[12px] font-light" style={{ color: "#B5B0A8" }}>
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ display: "inline-block" }}
                  >
                    ●
                  </motion.span>
                  {" "}+ 127 more matches this week
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 relative overflow-hidden" style={{ borderTop: "1px solid #E2DDD5" }}>
        {/* Subtle animated dot grid */}
        <motion.div
          style={{
            position: "absolute", inset: 0,
            backgroundImage: "radial-gradient(#E2DDD5 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: 0.4,
            pointerEvents: "none",
          }}
          animate={{ backgroundPosition: ["0px 0px", "28px 28px"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(249,247,242,0.7), rgba(249,247,242,0.95))", pointerEvents: "none" }} />

        <div className="mx-auto max-w-2xl text-center relative">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl sm:text-5xl tracking-tight mb-5 leading-tight" style={{ fontWeight: 300, color: "#18160F" }}>
              Start building.<br />Start raising.
            </h2>
            <p className="text-[16px] font-light mb-10 leading-relaxed" style={{ color: "#8A867C" }}>
              Join 10,000+ founders using Edge Alpha to build investor-ready businesses and connect with the right capital.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <GetStartedDropdown
                label={<>Get started free <ArrowRight className="h-4 w-4" /></>}
                className="inline-flex items-center gap-2 font-medium px-9 py-4 rounded-full text-[15px] transition-all hover:opacity-85 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "#18160F", color: "#F9F7F2" }}
                align="center"
              />
              <button
                onClick={() => go("/investor/onboarding")}
                className="inline-flex items-center gap-2 font-light px-9 py-4 rounded-full text-[15px] transition-all hover:bg-[#F0EDE6]"
                style={{ border: "1px solid #E2DDD5", color: "#8A867C" }}
              >
                I&apos;m an investor
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="py-12 px-6" style={{ borderTop: "1px solid #E2DDD5", background: "#F0EDE6" }}>
        <div className="mx-auto max-w-7xl">
          <div className="grid md:grid-cols-5 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-7 w-7 rounded-md flex items-center justify-center" style={{ background: "#18160F" }}>
                  <span className="font-bold text-[8px]" style={{ color: "#F9F7F2" }}>EA</span>
                </div>
                <span className="font-medium text-[15px]" style={{ color: "#18160F" }}>Edge Alpha</span>
              </div>
              <p className="text-[13px] font-light leading-relaxed max-w-[220px]" style={{ color: "#8A867C" }}>
                AI-powered advisers and investor marketplace for ambitious founders.
              </p>
            </div>
            {[
              { title: "Product",   links: ["Q-Score", "AI Agents", "Academy", "Marketplace"] },
              { title: "Resources", links: ["Blog", "Guides", "Podcast", "Newsletter"] },
              { title: "Company",   links: ["About", "Careers", "Contact", "Privacy"] },
            ].map((col) => (
              <div key={col.title}>
                <p className="text-[10px] uppercase tracking-[0.18em] font-medium mb-4" style={{ color: "#B5B0A8" }}>{col.title}</p>
                <ul className="space-y-2.5">
                  {col.links.map((l) => (
                    <li key={l}><a href="#" className="text-[13px] font-light transition-opacity hover:opacity-60" style={{ color: "#8A867C" }}>{l}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8" style={{ borderTop: "1px solid #E2DDD5" }}>
            <p className="text-[12px] font-light" style={{ color: "#B5B0A8" }}>&copy; 2026 Edge Alpha. All rights reserved.</p>
            <div className="flex items-center gap-5 text-[11px] font-light" style={{ color: "#C8C3BB", letterSpacing: "0.1em" }}>
              <span>SECURE</span><span>PRIVATE</span><span>AI-POWERED</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
