/**
 * Landing page content — single source of truth for copy.
 * Plain module (no "use client") so the server page can build JSON-LD
 * from the same FAQS array that drives the visible accordion.
 */

export const HERO_SCORE = 84;

// ─── The Rise — floors of the company, bottom → top ──────────────────────────
// Each floor is a milestone in going from nothing to fundable. Score is the
// approximate Q-Score once that floor is built.
export const FLOORS = [
  { label: "Founding team",     sub: "An idea and the people to build it", score: 22 },
  { label: "First customers",   sub: "Someone pays. It's real now.",       score: 41 },
  { label: "Product-market fit", sub: "They'd be gutted without you",       score: 58 },
  { label: "Revenue engine",    sub: "Unit economics that survive diligence", score: 70 },
  { label: "Fundable",          sub: "Q-Score crosses 70 — you're ready",   score: 78 },
  { label: "Raise",             sub: "Matched investors come to you",       score: 84 },
] as const;

// ─── Q-Score parameters (P1–P6) ──────────────────────────────────────────────
export const PARAMETERS = [
  { id: "p1", name: "Market Readiness",   color: "#16A34A", desc: "Is the market ready to buy — and are you ready to sell to it?" },
  { id: "p2", name: "Market Potential",   color: "#2563EB", desc: "TAM, growth, and whether the opportunity prices a venture outcome." },
  { id: "p3", name: "IP / Defensibility", color: "#7C3AED", desc: "The moat: patents, data, network effects, switching costs." },
  { id: "p4", name: "Founder / Team",     color: "#D97706", desc: "Domain depth, completeness, and the ability to recruit." },
  { id: "p5", name: "Structural Impact",  color: "#DB2777", desc: "Why now — the structural shift that makes this inevitable." },
  { id: "p6", name: "Financials",         color: "#0891B2", desc: "Unit economics, runway, and capital efficiency." },
] as const;

// ─── Advisers — Mind & Mentors ───────────────────────────────────────────────
// `domain` is the founder's worry (the thought-cloud); `advice` is what the
// specialist says when you click it.
export const ADVISERS = [
  { name: "Patel",  role: "GTM Control",    color: "#DC2626", domain: "Growth",  thought: "Why won't they buy?",       advice: "It isn't your traffic — it's the first five minutes. 60% of signups never reach the aha moment. I've mapped the onboarding flow that fixes it, step by step." },
  { name: "Sage",   role: "CEO Adviser",    color: "#2563EB", domain: "Focus",   thought: "Am I on the right thing?",  advice: "Two of your three priorities cancel each other out. Focus here for the next six weeks — I've sequenced the plan and the things worth saying no to." },
  { name: "Felix",  role: "CFO Adviser",    color: "#D97706", domain: "Runway",  thought: "How long have I got?",      advice: "18 months on paper, 11 once the Q3 hires land. Pull CAC payback from 14 months to 9 and you buy back a full quarter of runway." },
  { name: "Atlas",  role: "Competitive",    color: "#16A34A", domain: "Rivals",  thought: "Who else does this?",       advice: "Three real competitors, not the twelve you're worried about. Here's the wedge only you can own — and the two features that widen it." },
  { name: "Nova",   role: "Product & PMF",  color: "#7C3AED", domain: "Demand",  thought: "Do they actually want it?", advice: "42% of your users would be 'very disappointed' without you — that clears the PMF bar. Now pour everything into the segment driving it." },
  { name: "Maya",   role: "Brand & Growth", color: "#DB2777", domain: "Story",   thought: "Why doesn't it land?",      advice: "You're leading with features; buyers buy the outcome. I've rewritten your hero and three emails — same product, roughly double the reply rate." },
  { name: "Harper", role: "Hiring & Team",  color: "#0891B2", domain: "Hiring",  thought: "Who do I hire next?",       advice: "Not another engineer — a senior AE. You have supply, not distribution. Here's the JD, the comp band, and where the good ones are hiding." },
  { name: "Susi",   role: "Sales Process",  color: "#EA580C", domain: "Closing", thought: "Why do deals stall?",       advice: "They stall at price, not product. Here's the three-line reframe and the objection script that's closing at 34% in your stage." },
  { name: "Leo",    role: "Legal & Ops",    color: "#059669", domain: "Risk",    thought: "What am I missing?",        advice: "Your IP assignment has a gap two co-founders left open. Close it this week — it's a red flag on every diligence checklist." },
] as const;

// ─── How it works ────────────────────────────────────────────────────────────
export const STEPS = [
  { n: "01", title: "Get your Q-Score", body: "Complete a 10-minute assessment. Six dimensions. One honest number that tells you exactly where you stand and what needs work." },
  { n: "02", title: "Work with your advisers", body: "Nine AI specialists — strategy, GTM, finance, legal — guide your improvement with full context of your business. Not generic advice." },
  { n: "03", title: "Raise when you hit 70", body: "At Q-Score ≥ 70, your profile unlocks to thesis-matched investors. They find you — you don't cold email 200 people." },
] as const;

// ─── Problem section ─────────────────────────────────────────────────────────
export const PROBLEMS = [
  { stat: "92%", label: "of first-time founders pitch before they're fundable", body: "They burn their best investor introductions on a company that isn't ready — and first impressions don't reset." },
  { stat: "6 mo", label: "wasted on average in premature fundraising", body: "Time spent chasing meetings that were never going to convert is time not spent fixing what investors actually flagged." },
  { stat: "0", label: "honest signals about what to fix first", body: "Rejections come back as “too early” — never as “your CAC math doesn't survive diligence, fix that first.”" },
] as const;

// ─── Social proof ────────────────────────────────────────────────────────────
export const TESTIMONIALS = [
  { initials: "SC", name: "Sarah Chen",      role: "Founder, TechFlow",       color: "#DC2626", quote: "The Marketing Adviser helped us rethink GTM from scratch. Edge Alpha matched us with the right investors. Raised seed in two weeks." },
  { initials: "MJ", name: "Marcus Johnson",  role: "CEO, DataPipe",           color: "#2563EB", quote: "Q-Score pinpointed our weak spots. The Finance Agent fixed them. Investors took us seriously and we closed 3× faster than expected." },
  { initials: "ER", name: "Elena Rodriguez", role: "Partner, Vertex Capital", color: "#16A34A", quote: "Every founder I see from Edge Alpha has actually prepared. The Q-Score filter alone saves me hours of due diligence each week." },
  { initials: "DP", name: "David Park",      role: "Founder, CloudStack",     color: "#7C3AED", quote: "Strategy Agent nailed our positioning before we talked to a single investor. Found our lead through the marketplace. Nothing like it." },
  { initials: "JL", name: "James Liu",       role: "Founder, AIBotics",       color: "#D97706", quote: "Finance AI helped us model unit economics properly. Q-Score went from 62 to 84. Series A closed six weeks later." },
  { initials: "AF", name: "Amanda Foster",   role: "GP, Horizon Ventures",    color: "#059669", quote: "More than half my deal flow now comes from Edge Alpha. The quality bar the platform sets is genuinely exceptional." },
] as const;

// ─── Pricing ─────────────────────────────────────────────────────────────────
export const PRICING = {
  free: {
    name: "Free",
    price: "$0",
    tagline: "Understand where you stand.",
    features: ["Full Q-Score assessment", "3 AI advisers", "Improvement roadmap", "50 adviser chats / month"],
    cta: "Get your Q-Score",
  },
  pro: {
    name: "Pro",
    price: "$49",
    period: "/month",
    tagline: "Move the number. Then raise.",
    features: ["All 9 AI advisers", "Investor marketplace at Q-Score ≥ 70", "Verified metrics badge (Stripe)", "Academy access", "Priority scoring updates"],
    cta: "Start free, upgrade any time",
  },
} as const;

// ─── FAQ (also rendered as FAQPage JSON-LD) ──────────────────────────────────
export const FAQS = [
  { q: "What is Q-Score and how is it calculated?", a: "Q-Score is a 0–100 investment readiness score across six dimensions: Market Readiness, Market Potential, IP & Defensibility, Founder & Team, Structural Impact, and Financials. It's built from your profile data, agent sessions, and documents you upload. Sector-adaptive weights ensure a HealthTech startup is scored against HealthTech benchmarks — and the scoring is deterministic, not a model's mood." },
  { q: "Are the investors real and verified?", a: "Yes. Every investor in the marketplace has been individually onboarded, verified their investment thesis, and opted in to receive introductions. We do not scrape public directories." },
  { q: "How do the AI agents know about my business?", a: "When you complete onboarding, a Q-Score assessment, or upload documents, all nine agents are pre-loaded with your profile, financials, team, and market context. Every session is in context — agents remember what was discussed and built." },
  { q: "Is my data secure and private?", a: "All data is encrypted at rest and in transit. Founder data is never shared with investors without explicit connection consent. We don't use your data to train models." },
  { q: "What's the difference between Free and Pro?", a: "Free gives you 3 agents, a Q-Score, and an improvement roadmap — enough to understand where you stand. Pro unlocks all 9 agents, the investor marketplace, and Academy access for $49/month." },
  { q: "How long does it take to get investor introductions?", a: "The marketplace opens when your Q-Score reaches 70. Most founders reach 70 within 4–8 weeks of consistent agent use. The median time to first investor response is 4 days after unlocking." },
] as const;

export const FOOTER_LINKS = [
  { title: "Product",   links: [{ label: "Q-Score", href: "/signup" }, { label: "AI Advisers", href: "/signup" }, { label: "Investor Marketplace", href: "/investor/onboarding" }, { label: "Pricing", href: "#pricing" }] },
  { title: "Founders",  links: [{ label: "Get started", href: "/signup" }, { label: "Sign in", href: "/login" }] },
  { title: "Investors", links: [{ label: "Join as investor", href: "/investor/onboarding" }, { label: "Sign in", href: "/login" }] },
] as const;
