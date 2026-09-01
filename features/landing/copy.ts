/** Shown in place of every signup CTA while the pre-launch gate is closed
 *  (lib/auth/signup-access.ts). One definition — it appears in the nav, the pricing
 *  cards and the closing CTA, and three copies would drift. */
export const LAUNCHING_SOON = "Launching soon";

/**
 * Landing page content — single source of truth for copy.
 * Plain module (no "use client") so the server page can build JSON-LD
 * from the same FAQS array that drives the visible accordion.
 */

// ─── The Founder Ladder — same Q-Score, reframed as an archetype ────────────────────────────
// Five archetypes on one axis: how much of the deciding, executing, growing, and managing still
// runs through the founder by hand. Each stop maps onto a real Q-Score band (0–100) — this is
// NOT a second score alongside Q-Score, it's the same number read as "who you are" instead of
// "what you scored." Stop 4 (70–89) deliberately starts at the product's existing raise-ready
// threshold (see STEPS below, "Raise when you hit 70") — the tie-in is intentional, not a
// coincidence of round numbers.
//
// NOTE on "Leverage": UX_SPEC_the_frame.md §6 bans "leverage" as filler copy elsewhere in the
// product. Here it names a real feature/archetype ("Founder Leverage Check", "AI Leveraged",
// "Leverage Leak") — an explicit, approved exception, not filler. Don't let its presence here
// license reintroducing "leverage" as filler copy anywhere else.
/**
 * The hinge of the page. Everything above it is the Founder Leverage Check — a number about how
 * you work. Everything below it is Edge Alpha — the thing that moves that number. Without this
 * the page simply cuts from one story to the other mid-scroll, which is what made it read as two
 * pitches wearing one page rather than one argument.
 */
export const BRIDGE = {
  eyebrow: "From number to movement",
  heading: "Knowing your number is the easy part.",
  body: "Three minutes tells you where you sit on the scale and which part of running the company is still going through you. It doesn't move you. Closing that gap means someone actually owning the work — the positioning, the pricing, the hiring plan, the runway model — week after week, whether or not you have time for it.",
  closer: "That is what the rest of this page is.",
} as const;

export const LADDER = [
  { multiple: "1×",  archetype: "Founder Operated", scoreMin: 0,  scoreMax: 29,  note: "Every decision, every hire, every quarter runs through you." },
  { multiple: "3×",  archetype: "AI Assisted",      scoreMin: 30, scoreMax: 49,  note: "AI writes faster, researches faster — you're still the bottleneck." },
  { multiple: "5×",  archetype: "AI Leveraged",     scoreMin: 50, scoreMax: 69,  note: "AI owns real work between check-ins, not just drafts." },
  { multiple: "8×",  archetype: "Agentic Operator", scoreMin: 70, scoreMax: 89,  note: "The same 70 that unlocks the marketplace — AI now runs whole functions." },
  { multiple: "10×", archetype: "10× Founder",      scoreMin: 90, scoreMax: 100, note: "You decide direction. Everything else executes without you." },
] as const;

// ─── Hero — headline, sub, hero-line band ────────────────────────────────────────────────────
// Canonicalized on the source spec's HTML numbers (8×, "3 minutes") over its own inconsistent
// plain-text variant (7×, "90 seconds"/"8 questions"). No "8 questions" claim carried into this
// copy — no quiz exists yet, this section is a teaser/hook only.
export const HERO_COPY = {
  eyebrow: "Founder Leverage Check · 3 minutes",
  headlinePre: "Are you a ",
  headlineGradient: "10×",
  headlinePost: " founder?",
  sub: "You already know you should be using more AI. You probably open ChatGPT before you open your inbox. But knowing where AI gives you the most leverage is a different question — and most founders can't answer it.",
  /** Two halves of ONE sentence. `flaggedLead` renders in mono blue, `flaggedLine` completes it.
   *  Split here rather than hardcoding the lead-in inside Hero.tsx — which is what produced
   *  "Most founders Most founders use AI to write faster…" on the live page. A component that
   *  hardcodes copy has no way of knowing the copy file already says it. */
  flaggedLead: "Most founders",
  flaggedLine: "use AI to write faster, research faster, get more done — and still stay the bottleneck for every decision, every hire, every quarter.",
  closerLine: "The next step isn't using more AI. It's becoming a 10× Founder.",
  scrollCue: "Find your number ↓",
  ctaLabel: "Discover my Founder Leverage",
  tagline: "Build more company. Not more management.",
} as const;

// ─── Premise — the paragraph beside the ladder, plus the relocated Problem-section stats ────
// PROBLEMS (below) used to illustrate a stalled-tower graphic next to these three stats — that
// illustration is retired along with the old floors/building hero. The numbers themselves are
// kept and relocated here as the ladder's evidentiary anchor, not deleted.
export const PREMISE = {
  eyebrow: "The scale",
  heading: "A 10× Founder doesn't work 10× harder. They multiply — without multiplying the workload.",
  body: "Every founder is somewhere on this line. Most stall out at 3× — using AI as a faster assistant, never handing it the keys. The gap between where you are and 10× isn't effort. It's which decisions, which programs, which parts of running the company you're still holding onto by hand.",
  statValue: "3 min",
  statLabel: "to find your position on the scale — no signup wall, no sales call, just your number.",
  closingLine: "Founder in Command. Agents in Execution.",
} as const;

// ─── Discover — what the check gives you (4 cards) ───────────────────────────────────────────
export const DISCOVER = [
  { n: "01", title: "Your Founder Leverage",      body: "Are you operating at 1×, 3×, 5× — or closing in on 10×? A precise reading, not a vibe." },
  { n: "02", title: "Your Founder Archetype",     body: "Founder Operated → AI Assisted → AI Leveraged → Agentic Operator → 10× Founder. Where you sit today." },
  { n: "03", title: "Your biggest Leverage Leak", body: "The single place AI could take the most work off your desk right now — named, not generalized." },
  { n: "04", title: "Your next move",             body: "Where to apply AI next to move up the scale — and how much company that could let you build." },
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

// ─── Q-Score Lite callout — sits right after HowItWorks, the natural next question once a
// visitor has just read the six dimensions: "okay, so what would MY company score?" Answers it
// immediately, from public evidence, no signup — features/qscore-lite/**, a fully independent
// tool from the real Q-Score above it (see that feature's own docs for why).
export const QSCORE_LITE_CALLOUT = {
  eyebrow: "Try it on your own company",
  heading: "What would your company score — before you even sign up?",
  body: "Q-Score Lite scans public evidence only — no self-report, no signup wall — and gives you a fundability reading with a confidence level, in about a minute.",
  cta: "Get my Q-Score Lite",
} as const;

// ─── The Executive team — the real roster, not invented personas ────────────────────────────
// Hand-copied, not imported: pulling the live Registry (lib/registry/executives/**) into the
// public landing bundle would ship Program/prompt-composer internals to every visitor. id/name/
// short/title/motto mirror each executive's own Registry file verbatim; color mirrors
// EXECUTIVE_BADGE_VARIANT (features/executive/lib/executiveLabels.tsx) resolved to its hex — the
// same owner-attribution color a founder sees on every real artifact. CEO stays uncolored there
// on purpose (cross-cutting, not one more colored lane) — kept that way here too.
export const EXECUTIVES = [
  { id: "ceo",        name: "Morgan", short: "CEO", title: "CEO / Chief of Staff",      domain: "Strategy",             motto: "I turn the score into a mandate.",       color: null },
  { id: "growth",     name: "Patel",  short: "CGO", title: "Chief Growth Officer",      domain: "Marketing & Sales",    motto: "I exist to create growth.",              color: "#7C3AED" },
  { id: "finance",    name: null,     short: "CFO", title: "Chief Financial Officer",   domain: "Finance",              motto: "I keep the company alive and fundable.", color: "#4F46E5" },
  { id: "product",    name: null,     short: "CTO", title: "Chief Technology Officer",  domain: "Product & Technology", motto: "I build what the market will pay for.",  color: "#0891B2" },
  { id: "operations", name: null,     short: "COO", title: "Chief Operations Officer",  domain: "Operations",           motto: "I make the company run.",                color: "#EC4899" },
] as const;

// ─── A cycle, in three real moments — what actually happens, not a chat ─────────────────────
// Mirrors the real Command View in miniature: MandateCard → BriefingsPanel → ActionsPanel
// (features/executive/components/**). Illustrative copy — labeled as such on the card itself —
// but the shape (epoch, verdict, the one approval checkpoint) is exactly how the product works.
export const CYCLE_MOMENTS = [
  {
    key: "mandate", label: "Mandate",
    eyebrow: "Epoch 3 · confirmed",
    heading: "Fix the first five minutes of onboarding.",
    sub: "Patel (Growth) takes this on.",
  },
  {
    key: "briefing", label: "Briefing",
    eyebrow: "This cycle's briefing",
    heading: "Rewrote the activation email sequence.",
    sub: "Reply rate is up 2.1× since it went out.",
    verdict: "On track",
  },
  {
    key: "approval", label: "Approval",
    eyebrow: "Needs your approval",
    heading: "Send the new onboarding sequence.",
    sub: "1,204 waitlisted signups · expires in 18h",
    action: true,
  },
] as const;

// ─── Executive activity — each on their own clock, not a synchronized wheel ─────────────────
// Deliberately staggered, independent timestamps (not a shared feed) — the point being made is
// that the team isn't a chat you open, it's five people already working, on their own schedule.
// The CEO/growth lines echo CYCLE_MOMENTS' mandate/briefing text on purpose — same cycle, seen
// from the org side here and from the founder's inbox there. Finance/product/ops get their own,
// independent threads to show the other four aren't idle while growth has the spotlight.
export const EXECUTIVE_ACTIVITY = [
  { execId: "ceo",        when: "Mon 9:12 AM",  body: "Confirmed this cycle's mandate — fix the first five minutes of onboarding." },
  { execId: "growth",     when: "Mon 4:30 PM",  body: "Rewrote the activation email sequence." },
  { execId: "finance",    when: "Tue 11:05 AM", body: "Flagged a CAC assumption diligence would catch." },
  { execId: "product",    when: "Wed 8:47 AM",  body: "Shipped a fix to the first-run signup flow." },
  { execId: "operations", when: "Thu 2:15 PM",  body: "Updated the runway model after this week's burn." },
] as const;

// ─── How it works ────────────────────────────────────────────────────────────
export const STEPS = [
  { n: "01", title: "Get your Q-Score", body: "Complete a 10-minute assessment. Six dimensions. One honest number that tells you exactly where you stand and what needs work." },
  { n: "02", title: "Your executive team gets to work", body: "Five AI executives — CEO, growth, finance, product, ops — each own real work on your company, every cycle. Not a chatbot. A team." },
  { n: "03", title: "Raise when you hit 70", body: "At Q-Score ≥ 70, your profile unlocks to thesis-matched investors. They find you — you don't cold email 200 people." },
] as const;

// ─── Problem stats — rendered inside Ladder.tsx's premise section ────────────
export const PROBLEMS = [
  { stat: "92%", label: "of first-time founders pitch before they're fundable", body: "They burn their best investor introductions on a company that isn't ready — and first impressions don't reset." },
  { stat: "6 mo", label: "wasted on average in premature fundraising", body: "Time spent chasing meetings that were never going to convert is time not spent fixing what investors actually flagged." },
  { stat: "0", label: "honest signals about what to fix first", body: "Rejections come back as “too early” — never as “your CAC math doesn't survive diligence, fix that first.”" },
] as const;

// ─── Social proof ────────────────────────────────────────────────────────────
// Illustrative examples of the kind of outcome the product is built to produce — not quotes
// from real, verifiable customers. Deliberately no invented full names or company names (a
// fabricated "Marcus Johnson, CEO, DataPipe" reads as a specific real, checkable person; a role
// description doesn't claim that). SocialProof.tsx labels these as illustrative in the UI too.
export const TESTIMONIALS = [
  { role: "Seed-stage SaaS founder",        color: "#DC2626", quote: "The Marketing Adviser helped us rethink GTM from scratch. Edge Alpha matched us with the right investors. Raised seed in two weeks." },
  { role: "Early-stage founder",            color: "#2563EB", quote: "Q-Score pinpointed our weak spots. The Finance Agent fixed them. Investors took us seriously and we closed 3× faster than expected." },
  { role: "Early-stage VC partner",         color: "#16A34A", quote: "Every founder I see from Edge Alpha has actually prepared. The Q-Score filter alone saves me hours of due diligence each week." },
  { role: "Infrastructure startup founder", color: "#7C3AED", quote: "Strategy Agent nailed our positioning before we talked to a single investor. Found our lead through the marketplace. Nothing like it." },
  { role: "AI startup founder",             color: "#D97706", quote: "Finance AI helped us model unit economics properly. Q-Score went from 62 to 84. Series A closed six weeks later." },
  { role: "General partner, early-stage fund", color: "#059669", quote: "More than half my deal flow now comes from Edge Alpha. The quality bar the platform sets is genuinely exceptional." },
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
  { q: "How do the AI agents know about my business?", a: "When you complete onboarding, a Q-Score assessment, or upload documents, your whole executive team is pre-loaded with your profile, financials, team, and market context. Every session is in context — agents remember what was discussed and built." },
  { q: "Is my data secure and private?", a: "All data is encrypted at rest and in transit. Founder data is never shared with investors without explicit connection consent. We don't use your data to train models." },
  { q: "What's the difference between Free and Pro?", a: "Free gives you a Q-Score and an improvement roadmap — enough to understand where you stand. Pro unlocks your full executive team, the investor marketplace, and Academy access for $49/month." },
  { q: "How long does it take to get investor introductions?", a: "The marketplace opens when your Q-Score reaches 70. Most founders reach 70 within 4–8 weeks of consistent agent use. The median time to first investor response is 4 days after unlocking." },
] as const;

export const FOOTER_LINKS = [
  { title: "Product",   links: [{ label: "Q-Score", href: "/founder/onboarding" }, { label: "AI Advisers", href: "/founder/onboarding" }, { label: "Investor Marketplace", href: "/login" }, { label: "Pricing", href: "#pricing" }] },
  { title: "Founders",  links: [{ label: "Get started", href: "/founder/onboarding" }, { label: "Sign in", href: "/login" }] },
  { title: "Investors", links: [{ label: "Join as investor", href: "/login" }, { label: "Sign in", href: "/login" }] },
] as const;
