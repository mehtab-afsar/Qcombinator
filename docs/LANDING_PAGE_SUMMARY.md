# Edge Alpha Landing Page — Summary

## Overview
`app/page.tsx` — A fully animated single-page marketing site for **Edge Alpha**, an AI-powered platform helping founders build investable companies and connect with verified investors. Built with React, Framer Motion, Tailwind CSS, and Lucide icons.

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Cream | `#FAF8F3` | Primary background |
| Sand | `#F5F1E8` | Section backgrounds, hover states |
| Taupe | `#E8E3D8` | Borders, dividers |
| Charcoal | `#2A2826` | Primary text |
| Stone | `#6B6760` | Secondary / descriptive text |
| Ember | `#D97757` | Primary CTA accent (red-orange) |
| Sage | `#8B9A7A` | Positive indicators (green) |
| Midnight | `#1A1816` | Dark sections, footer |
| Gold | `#C9A961` | Premium / Pro tier highlight |

---

## Page Sections (Top to Bottom)

### 1. Fixed Navigation Header
- Transforms on scroll: blur + border + shadow appear after 40px
- Logo: "EA" badge + "Edge Alpha" wordmark
- Nav links: How it works · Pricing · For investors · Library · Sign in
- "Get started" dropdown CTA → animated menu with "Get started free" / "Sign in"
- Mobile: hamburger toggle → animated dropdown

### 2. Hero Section
- Two-column layout (stacked on mobile)
- Background: radial gradient mesh (ember/sage/gold tints) + morphing blob + dot grid
- **Headline**: "Build a fundable business. Then raise." (staggered word animations)
- **Subheading**: "9 AI expert advisers. One investor-readiness score. 500+ verified investors waiting when you hit the bar."
- **CTAs**: "Start free →" (gradient, magnetic hover) + "See how it works"
- **Social proof**: Avatar stack + "Join 10,000+ founders" + "$2.3B raised · 500+ investors"
- **Right column**: Q-Score Dashboard product mock (macOS window chrome)
  - Score ring: 74/100, gradient ember → gold
  - Grade badge: "B+", "Top 34%", "Investment Ready"
  - Dimension bars: Team, Market, Traction, Financials
  - Floating badges: "+8 pts this week", "3 investors matched"

### 3. Press Strip
- Horizontal scrolling marquee: TechCrunch, Forbes, Bloomberg, WIRED, etc.
- "Founders featured in" label, fade-edge gradient masks

### 4. How It Works (3 steps)
Background: Sand
1. Get your Q-Score — 10-minute assessment, 6 dimensions
2. Work with your advisers — 9 specialist AI agents
3. Match with investors — thesis-matched at Q-Score ≥ 70

Cards have: ghost step numbers (01/02/03), icon, title, description, dashed connector line between them.

### 5. Three Pillars
- **Q-Score** (Ember) — algorithmic investment-readiness scoring
- **AI Agents** (Blue) — expert advisers across every function
- **Marketplace** (Gold, locked) — 500+ verified investors; unlocks at Q-Score ≥ 70 (pulsing lock icon)

### 6. AI Agents Section
Background: Sand, two columns
- Left: value props (on-demand, context-aware, compounding progress) + "Meet your advisers" CTA
- Right: agent roster (6 agents) — auto-rotates active agent every 2.5s
  - Strategy, Marketing, Sales, Finance, HR & Team, Legal & Ops

### 7. Marketplace Section
- Heading: "When you're ready, the investors are waiting."
- Animated unlock badge: "Unlocks at Q-Score ≥ 70"
- Investor table: 3 visible rows (Hustle Fund, Precursor Ventures, First Round Capital)
  - Columns: name/type | check size | stages | match % (animated MatchBar) | connect
- Bottom rows blurred/locked: "497 more investors unlock at Q-Score 70"

### 8. Stats Section (Dark)
Background: Midnight, 4-column grid
- Animated CountUp on scroll: $2.3B+ · 10,000+ founders · 500+ investors · 95% match accuracy

### 9. Testimonials
3-column card grid (sand cards, taupe border)
- 5 gold stars per card, quote, author with colored avatar
- 6 testimonials from founders + investors
- Hover: lift + shadow increase

### 10. For Investors
Background: Sand, two columns
- Left: "Better deal flow. Less noise." — Q-Score filtering, thesis-matched AI, prepared founders
- Right: 3 sample deal cards with pulsing "HOT" badge + Q-Score + match %

### 11. Pricing
- Annual/monthly toggle (save 20% badge on annual)
- **Free**: $0 forever — Q-Score, 3 advisers, workspace, improvement plan
- **Pro** (dark card, "Most popular"): $49/mo or $39/mo annual
  - All 9 advisers + marketplace + Academy + priority support
  - 14-day free trial, shimmer animation on card

### 12. FAQ Accordion
Background: Sand, 6 questions
- Smooth height animation, chevron rotation on expand
- Topics: Q-Score calculation, investor verification, AI context, data security, Free vs Pro, timeline

### 13. Startup Playbook Library
6 resource cards (SaaS Metrics, ICP Narrowing, Burn Multiple, MEDDIC, PMF, Competitive Moats)
- Each: emoji + type badge (Framework/Playbook/Guide) + function tag + title + source
- Hover: spring lift

### 14. Final CTA (Dark)
Background: Midnight + morphing ember/gold blobs
- "Build the company investors want to fund."
- "Start free →" gradient CTA
- Mini stats row reinforcement: $2.3B+ · 10,000+ · 500+

### 15. Footer
Background: Midnight
- Brand logo + tagline
- Three nav columns: Product · Resources · Company
- Bottom: copyright + "SECURE · PRIVATE · AI-POWERED" badges

---

## Key Interactive / Animated Components

| Component | Behavior |
|-----------|----------|
| `MagneticButton` | Follows mouse via spring physics |
| `CountUp` | Numbers animate from 0 on scroll |
| `ScoreRing` | SVG circular progress with gradient stroke |
| `MatchBar` | Animated gradient bar with % label |
| `ProductMock` | Full Q-Score dashboard mockup |
| `GetStartedDropdown` | Animated CTA menu (onboarding vs sign in) |
| `BillingToggle` | Animated annual/monthly switch |
| Scroll progress | Fixed at top, fills left-to-right on scroll |
| Sticky bottom CTA | Slides up at 600px scroll, spring animation |
| Agent carousel | Auto-rotates active agent every 2.5s |
| Morphing blobs | Rotating/scaling radial-gradient divs (18–22s cycles) |
| FAQ accordion | Chevron rotation + height animation |

---

## Conversion Paths
All CTAs route to `/founder/onboarding` (founders) or `/investor/onboarding` (investors).
Multiple entry points: hero, pillars, agents section, marketplace, pricing, final CTA.

---

## Technical Notes
- `"use client"` — fully client-rendered
- **Framer Motion** for all animations (custom easing `[0.22, 1, 0.36, 1]`, scroll-triggered `whileInView`)
- **Parallax**: hero moves slower than scroll via `useTransform`
- **Tailwind CSS** + inline styles for fine-grained color/spacing control
- **Lucide React** for icons (24+ icons used throughout)
- Responsive: mobile-first, breakpoints at sm/md/lg
