# Edge Alpha — Landing Page UI/UX Summary

## Visual Style

Modern, minimal, light-luxury aesthetic with a warm cream palette. Targets ambitious founders and experienced investors. Typography mixes serif (display emphasis), sans-serif (body), and monospace (labels/numbers). Animations use Framer Motion throughout with a signature easing curve `[0.22, 1, 0.36, 1]`.

**Colour Palette**
| Token | Value | Used for |
|---|---|---|
| `--ea-bg` | `#F9F7F2` | Page background |
| `--ea-surf` | `#F0EDE6` | Cards, secondary surfaces |
| `--ea-bdr` | `#E2DDD5` | Borders, dividers |
| `--ea-ink` | `#18160F` | Primary text, buttons |
| `--ea-muted` | `#8A867C` | Secondary text |
| `#2563EB` | Blue accent | Badges, highlights |
| `#F5EDD8` / `#C4A96A` | Gold | "Locked" feature badges |

---

## Page Sections (Top → Bottom)

### 1. Scroll Progress Bar
- Fixed 2px bar at the very top of the viewport
- Fills left-to-right as the user scrolls (via `useScroll`)
- Colour: `--ea-ink`

---

### 2. Navigation
- Fixed header, z-50
- **Scrolled state** (>40px): cream background + blur + bottom border
- **Logo**: dark pill with "EA" + "Edge Alpha" wordmark
- **Nav links**: How it works · Pricing · For investors · Library
- **CTA**: `GetStartedDropdown` — animated dropdown with two choices: "Get started free" → `/founder/onboarding` and "Sign in" → `/login`
- **Mobile**: hamburger menu opens animated vertical panel with the same links

---

### 3. Hero
**Left column — copy**
- Byline: `EDGE ALPHA · EST. 2024` (monospace, uppercase)
- Headline (three lines, staggered in):
  - *"Build a fundable"* — serif, light
  - *"business."* — serif, light
  - *"Then raise."* — sans, muted
- Subheading: "9 AI expert advisers. One investor-readiness score. 500+ verified investors waiting when you hit the bar."
- CTA: **"Start free →"** (primary, full-black pill) + **"See how it works"** (text link, scrolls to `#how-it-works`)
- Micro-copy: "10-minute setup · No credit card needed"
- Social proof strip: 10,000+ founders · 500+ investors · $2.3B raised

**Right column — animated chat mock**
- Mac-style window chrome (three coloured dots)
- Agent name "Strategy Adviser" with green online dot
- 4 messages cycling automatically (1.2s intervals): alternates user ↔ agent bubbles
- Typing cursor on last message
- Score strip at bottom: "This session is improving your Q-Score · +3 pts ↑"
- Background dot-grid pattern with vertical fade

---

### 4. Press Marquee
- Infinite horizontal scroll of logos: TechCrunch, Forbes, Bloomberg, The Verge, WIRED, Fast Company, Inc., Fortune
- Fade overlays on left/right edges
- Label: "Founders featured in"

---

### 5. How It Works
- Anchor: `#how-it-works`
- Three-step grid with connector line on desktop
- Each step has an icon box, numbered badge (01/02/03), title, and description
1. **Get your Q-Score** — 10-minute assessment across 6 investor-critical dimensions
2. **Work with your advisers** — 9 specialist AI agents close gaps, every session feeds the score
3. **Get matched with investors** — marketplace opens at Q-Score ≥ 70

---

### 6. Three Pillars
- Shows the platform's three components as a feature table
- Each row is a full-width clickable card → `/founder/onboarding`
- Hover: subtle surface background shift
- Locked badge (gold) on the Marketplace row

| # | Name | Description |
|---|---|---|
| 01 | Q-Score | Algorithmic readiness score — 6 dimensions, live percentile, improvement plan |
| 02 | AI Agents | 9 domain specialists, context-aware, every session feeds score |
| 03 | Marketplace 🔒 | 500+ verified investors, thesis-aligned matching, unlocks at Q-Score 70 |

---

### 7. AI Agents
- Two-column split: copy left, agent list right
- Copy: headline *"Expert advisers. No office hours."* + 3 bullet benefits
- Agent list: 6 roles shown in a card panel, cycling active highlight every 2.5s
- Each row: number · name · description tags · arrow

| Agent | Speciality |
|---|---|
| Strategy Adviser | Positioning · business model · go-to-market |
| Marketing Adviser | Acquisition · content · brand narrative |
| Sales Adviser | Pipeline · closing · pricing · objections |
| Finance Adviser | Unit economics · runway · fundraise prep |
| HR & Team Adviser | Hiring · culture · org design |
| Legal & Ops Adviser | Contracts · compliance · process |

- CTA: "Meet your advisers →" → `/founder/onboarding`

---

### 8. Investor Marketplace (Preview Table)
- Header: *"When you're ready, the investors are waiting."*
- Gold lock badge: "Unlocks at Q-Score ≥ 70"
- Table shows 6 sample investors: name · check size · stages · animated match bar · "Connect" button
- Footer: "Showing 6 of 500+ investors" + "Unlock full marketplace →"
- All rows clickable → `/founder/onboarding`

---

### 9. Stats Strip
- 4-column grid with CountUp animation (triggers on scroll into view)
- $2.3B+ raised · 10,000+ founders · 500+ investors · 95% match accuracy

---

### 10. Testimonials
- 2-column grid, 6 quotes
- 3 from founders, 2 from investors (VCs), 1 mixed
- Large serif opening quote mark, name + role in monospace below

---

### 11. For Investors
- Section anchor: `#for-investors`
- Left: headline *"Better deal flow. Less noise."* + 4 benefit bullets + CTA → `/investor/onboarding`
- Right: 3 example deal cards (startup name, category, Q-Score, match %) with live pulse dot

---

### 12. Pricing
- Two cards side by side

**Free — $0 forever**
- Full Q-Score assessment
- 3 AI advisers (Strategy, Finance, Marketing)
- Workspace & deliverables
- Score improvement plan
- Button: "Get started free" → `/founder/onboarding`

**Pro — $49/mo**
- Dark card (inverted), "MOST POPULAR" badge
- Everything in Free
- All 9 AI advisers
- Investor marketplace (unlocks at Q-Score 70)
- Academy cohort access
- Priority support
- Button: "Start Pro free →" → `/founder/onboarding`

---

### 13. FAQ Accordion
- 6 questions, animated height expand/collapse
- Chevron rotates 180° when open

| Question | Topic |
|---|---|
| What is Q-Score and how is it calculated? | Scoring methodology |
| Are the investors real and verified? | Trust / verification |
| How do the AI agents know about my business? | Context loading |
| Is my data secure and private? | Security |
| What's the difference between Free and Pro? | Pricing |
| How long does it take to get investor intros? | Timeline expectations |

---

### 14. Startup Playbook Library
- Free resource section
- 6 resource cards in a 3-column grid (1 on mobile)
- Each card: emoji icon · function badge (colour-coded CFO/CMO/CRO etc.) · title · source
- Link: "Browse library →" button + all cards → `/library`

---

### 15. Final CTA
- Full-width centred section
- Headline: *"Build the company investors want to fund."*
- `GetStartedDropdown` button (largest on page, px-9 py-4)
- Micro-copy: "10-minute setup · No credit card · Free forever"

---

### 16. Footer
- 5-column grid: Brand + 3 link columns
- **Product**: Q-Score, CXO Suite, Academy, Investor Matching
- **Resources**: Startup Library, Frameworks, Playbooks, Templates
- **Company**: For Founders, For Investors, Contact, Privacy
- Bottom bar: copyright left · "SECURE · PRIVATE · AI-POWERED" right

---

## Interactions & Animations

| Element | Behaviour |
|---|---|
| Scroll progress bar | Fills as user scrolls |
| Nav header | Transparent → frosted glass after 40px scroll |
| Hero copy | Staggered fade-up (200ms–1050ms delays) |
| Chat mock | Messages appear every 1.2s on load |
| Sections | Fade-up + opacity on `whileInView` |
| Agent list | Active row cycles every 2.5s, spring animation |
| Match bars | Animate from 0 → value% on scroll into view |
| CountUp stats | Count from 0 → target over 1.8s on scroll |
| FAQ items | Animated height expand (250ms) |
| GetStartedDropdown | Scale + opacity in/out (140ms) |
| Cards / rows | Hover: scale(1.01–1.03) or background shift |
| Buttons | Hover: opacity-80 + scale(1.02), active: scale(0.97) |

---

## What Could Be Improved / Done

### Content & Conversion
- **Real metrics** — $2.3B, 10,000+ founders, 500+ investors are currently hardcoded mock values; wire to live Supabase counts
- **Waitlist / email capture** — no email form exists; adding one (especially near the final CTA) could capture intent before signup
- **Video / demo** — replacing the chat mock with an actual screen recording embed would increase conversion
- **Social proof logos** — the press marquee uses text-only names; real logo SVGs would increase credibility
- **Named investor logos** — the marketplace table uses 2-letter initials; replacing with real logos would significantly strengthen trust

### UX Improvements
- **Sticky CTA** — a slim fixed bottom bar ("Start free →") that appears after scrolling past the hero could capture drop-off
- **Live Q-Score demo** — an interactive slider letting visitors simulate their own Q-Score would demonstrate value immediately
- **Agent previews** — clicking an agent row in the AI Agents section could expand a preview of what that agent does / outputs
- **Pricing toggle** — monthly vs. annual billing toggle with a discount callout (e.g. "Save 20% annually")
- **Testimonial carousel** — on mobile, the 2-column testimonial grid is cramped; a swipeable carousel would be cleaner

### Technical / SEO
- **Lazy load below-fold sections** — most content animates in via `whileInView` but all JS is loaded upfront
- **OG/meta tags** — add proper Open Graph images and descriptions per page for social sharing
- **Analytics events** — track CTA clicks, dropdown opens, section scroll depth
- **A/B test headline** — the hero copy is untested; an A/B test on "Build a fundable business. Then raise." vs alternatives could lift conversion
- **Accessibility** — some animated elements lack `aria-hidden`; keyboard navigation through the dropdowns could be improved
