# Edge Alpha — UI/UX Roadmap
_Last updated: February 2026 · Focus: Demo-first, then backend_

---

## The North Star

> Build the demo until every screen tells a compelling story.
> Lock the UI/UX. Then drop the backend in underneath it.

---

## 1. User Flow (Source of Truth)

```
Landing Page
    │
    ▼
[Get Started]
    │
    ▼
Onboarding — Step 1: Video (:90s overview)
    │  [Watch / Skip]
    ▼
Onboarding — Step 2: Agent Chat (Category 1 Assessment)
    │  Edge Alpha Adviser — conversational, VC-style
    │  Covers: Problem Origin · Founder Edge · Customer Validation · Resilience
    │  ~8–14 exchanges → [ASSESSMENT_COMPLETE] signal
    ▼
Onboarding — Step 3: Sign Up
    │  Score teaser visible. Form: Name · Email · Password
    ▼
Onboarding — Step 4: Score Reveal
    │  Animated ring · Cat 1 dimension bars · Locked Cat 2 & 3 rows
    │  CTA → Complete Full Assessment  OR  Go to Dashboard
    ▼
Founder Dashboard (home base)
    │
    ├── AI Agents Hub → individual agent chat rooms
    ├── Assessment (Cat 2 + Cat 3)
    ├── Investor Matching (gated: Q-Score ≥ 65)
    ├── Academy
    └── Profile / Metrics / Settings
```

---

## 2. Screen-by-Screen UI/UX Plan

### 2.1 Landing Page ✅ (done — cream aesthetic)

No changes needed right now. Lock it.

---

### 2.2 Onboarding Flow ✅ (done — cream aesthetic)

Four steps complete. Lock it.

---

### 2.3 Founder Dashboard — Needs Full Redesign

**Current state:** Busy tabbed layout with mock data scattered everywhere.

**Target state:** Clean, editorial, cream. Modular cards. One clear hero.

#### Layout (top → bottom):
```
┌──────────────────────────────────────────────────┐
│  Nav bar: logo | Q-Score chip | notifications    │
├──────────────────────────────────────────────────┤
│  HERO: "Good morning, [Name]"                    │
│  Q-Score ring (large) + 6 dimension mini-bars    │
│  Week change badge (+4 pts ↑)                    │
├──────────────────────────────────────────────────┤
│  TOP ACTIONS (3 cards, horizontal scroll)        │
│  • Highest impact action for lowest dimension    │
│  • Each card: title · dimension · est. pts gain  │
│  • CTA links to relevant agent or assessment     │
├──────────────────────────────────────────────────┤
│  AGENT ACTIVITY (last 3 conversations)           │
│  Each row: agent name · last message preview     │
│  · time ago · "Continue →"                       │
├──────────────────────────────────────────────────┤
│  INVESTOR PULSE (locked until Q-Score ≥ 65)      │
│  Blurred: "X investors viewed your profile"      │
│  Unlock badge + link to improve Q-Score          │
├──────────────────────────────────────────────────┤
│  ACADEMY NEXT (1 upcoming workshop card)         │
│  Date · topic · instructor · Register button     │
└──────────────────────────────────────────────────┘
```

**Design rules:**
- Same cream palette as landing/onboarding
- No tabs. Single scrollable page
- Each section separated by a thin `#E2DDD5` rule, not cards
- Typography: `font-weight: 300` headers, `font-weight: 500` labels
- Q-Score ring reuses the SVG from onboarding score reveal

---

### 2.4 AI Agents Hub — Needs Redesign

**Current state:** Tabbed grid with 9 cards. Functional but generic-looking.

**Target state:** Premium directory feel. Like a firm's team page.

#### Layout:
```
┌──────────────────────────────────────────────────┐
│  Header: "AI Advisers"                           │
│  Subtext: "Each adviser specialises in one       │
│  domain and remembers your business."            │
├──────────────────────────────────────────────────┤
│  RECOMMENDED (1–2 cards, highlighted)            │
│  "Talk to Felix — your Financial score is low"   │
├──────────────────────────────────────────────────┤
│  Thin rule: SALES & MARKETING                    │
│  Patel · Susi · Maya  (row layout, not grid)     │
│                                                  │
│  Thin rule: OPERATIONS & FINANCE                 │
│  Felix · Leo · Harper                            │
│                                                  │
│  Thin rule: PRODUCT & STRATEGY                   │
│  Nova · Atlas · Sage                             │
└──────────────────────────────────────────────────┘
```

#### Agent row card (each agent):
```
[Avatar initials]  Patel                 [→ Chat]
                   Go-to-Market Strategy
                   Improves: GTM Score
                   "3 conversations"
```
- Avatar: monogram in cream circle with colored border per pillar
- Pillar color coding: blue (sales), green (ops), purple (product)
- No grid cards — table-row layout, thin dividers
- Conversation count badge (live from DB later, 0 for demo)

---

### 2.5 Individual Agent Chat — Needs Redesign + Real AI

**Current state:** Dark-themed chat with mock responses.

**Target state:** Cream chat interface. Real AI via OpenRouter. Persistent context.

#### Layout:
```
┌──────────────────────────────────────────────────┐
│  ← Back  |  [Avatar] Patel  |  GTM Strategy     │
│           |  "Specialises in..."                 │
│  [Improve GTM Score] indicator chip              │
├──────────────────────────────────────────────────┤
│  SUGGESTED PROMPTS (only shown before first msg) │
│  Chips: "Help me define my ICP"                  │
│         "Review my GTM strategy"                 │
│         "What's my biggest GTM gap?"             │
├──────────────────────────────────────────────────┤
│  MESSAGE THREAD                                  │
│  Agent: cream surface bubble (left)              │
│  User: dark ink bubble (right)                   │
│                                                  │
│  ┄ conversation flows ┄                          │
├──────────────────────────────────────────────────┤
│  INPUT BAR                                       │
│  [cream input field]  [send button]              │
│  "This session improves your GTM Score"          │
└──────────────────────────────────────────────────┘
```

**Interaction model:**
- ALL 9 agents are chat-based (no forms, no structured input)
- Each agent has a unique system prompt with deep domain expertise
- Each agent knows the founder's business context (passed via system prompt)
- Suggested prompts shown on first load only, disappear after first message
- Sessions auto-save (to Supabase later, localStorage for demo)
- "Score impact" chip in header shows which Q-Score dimension this agent affects

---

### 2.6 Full Assessment (Categories 2 & 3)

**Current state:** 9-section form with structured fields.

**Decision:** Keep as structured form for now (not chat-based). Chat-based assessment is only for the onboarding Cat 1 experience.

**Redesign needed:**
- Cream aesthetic throughout (currently dark/card-heavy)
- Section progress: "Section 2 of 6" thin pill at top
- One section visible at a time (accordion or wizard)
- Auto-save every 2 min indicator ("Saved 30s ago")
- Submit → runs scoring → shows updated Q-Score

---

### 2.7 Investor Matching Page

**Current state:** Card grid with investor details.

**Gate:** Locked with blur overlay if Q-Score < 65.

**Redesign:**
- Cream bg, thin filter row at top (Stage / Sector / Thesis)
- Investor rows (table-style) not cards
- Match % shown as a thin bar, not a percentage badge
- Connect button → opens lightweight modal with auto-generated pitch paragraph
- Locked state: overlay with Q-Score improvement prompt

---

### 2.8 Investor Portal

**Investor Dashboard, Deal Flow, Portfolio** — apply cream aesthetic across all.

**Priority order:** Dashboard → Deal Flow → Portfolio

---

## 3. Agent Suite — Full Spec

### The 9 Agents

| # | Name   | Pillar              | Dimension    | Domain |
|---|--------|---------------------|--------------|--------|
| 1 | Patel  | Sales & Marketing   | GTM Score    | Go-to-Market Strategy |
| 2 | Susi   | Sales & Marketing   | GTM Score    | Sales & Lead Generation |
| 3 | Maya   | Sales & Marketing   | GTM Score    | Brand & Content |
| 4 | Felix  | Operations & Finance| Financial    | Financial Modelling |
| 5 | Leo    | Operations & Finance| Team Score   | Legal & Compliance |
| 6 | Harper | Operations & Finance| Team Score   | HR & Team Building |
| 7 | Nova   | Product & Strategy  | Product Score| Product-Market Fit |
| 8 | Atlas  | Product & Strategy  | Market Score | Competitive Intelligence |
| 9 | Sage   | Product & Strategy  | Market Score | Strategic Planning |

### Interaction Model
- **All chat-based** — natural conversation, no forms
- Each agent has a tailored system prompt that gives it:
  - Its persona (name, tone, expertise)
  - The founder's startup context (passed from profile/assessment data)
  - Its primary goal (improve specific Q-Score dimension)
  - Rules (1 question at a time, concise, push for specifics)
- Agents do NOT know about each other's conversations (siloed for now)
- Agents DO know about the founder's Q-Score and current weak dimensions

### Suggested Prompts per Agent

**Patel (GTM)**
- "Help me define my ICP"
- "Review my current GTM strategy"
- "What acquisition channels should I prioritise?"
- "How do I nail my messaging?"

**Susi (Sales)**
- "Build me a sales playbook"
- "How do I run a discovery call?"
- "What's a good outreach sequence?"
- "Help me handle common objections"

**Maya (Brand)**
- "Review my brand positioning"
- "How should I think about content marketing?"
- "What's my brand voice?"

**Felix (Finance)**
- "Review my unit economics"
- "Help me build a 12-month financial model"
- "What's a healthy burn rate for my stage?"
- "How do I present financials to investors?"

**Leo (Legal)**
- "What legal structure should I use?"
- "What contracts do I need first?"
- "Walk me through SAFE vs priced round"

**Harper (HR)**
- "Help me hire my first 3 employees"
- "What equity splits are typical?"
- "How do I structure a performance review?"

**Nova (Product)**
- "Help me define product-market fit metrics"
- "Critique my product roadmap"
- "How do I run user interviews?"

**Atlas (Competitive Intel)**
- "Map my competitive landscape"
- "What's my defensible moat?"
- "How do I position against [competitor]?"

**Sage (Strategy)**
- "Help me set 90-day OKRs"
- "Review my pitch narrative"
- "What should my fundraising timeline look like?"

---

## 4. Sequential Build Order (UI/UX First, Backend Later)

### Phase A — UI/UX Demo Complete (Do This Now)

```
[ ] A1. Agent Chat → cream aesthetic + real OpenRouter AI (all 9 agents live)
[ ] A2. Agents Hub → table-row layout, cream, pillar separators
[ ] A3. Founder Dashboard → redesign: score hero + action cards + agent feed
[ ] A4. Assessment (Cat 2 & 3) → cream wizard, one section at a time
[ ] A5. Investor Matching → cream, table rows, Q-Score gate
[ ] A6. Investor Dashboard → cream aesthetic
[ ] A7. Deal Flow → cream aesthetic
[ ] A8. Portfolio → cream aesthetic
```

### Phase B — Backend Integration (After Demo is Locked)

```
[ ] B1. Supabase auth → real sign up / sign in / sessions
[ ] B2. Founder profiles table → save assessment data
[ ] B3. Q-Score calculation API → real scoring, saved to DB
[ ] B4. Agent conversation persistence → save sessions to DB
[ ] B5. Investor matching algorithm → real Q-Score gating
[ ] B6. Connection requests → real DB rows, status tracking
[ ] B7. Investor portal → real deal flow from founders DB
```

### Phase C — Polish & Launch

```
[ ] C1. Real video on onboarding page
[ ] C2. Email notifications (signup confirmation, investor match)
[ ] C3. Stripe subscription gating (premium agent access)
[ ] C4. Analytics (PostHog or similar)
[ ] C5. Mobile responsiveness audit
[ ] C6. Performance audit (Lighthouse)
```

---

## 5. Immediate To-Do List (Start Now)

### A1 — Bring All 9 Agents to Life (Priority 1)

**What:** Replace mock responses in `/app/founder/agents/[agentId]/page.tsx` with real OpenRouter AI, using the same pattern as the onboarding chat.

**Steps:**
1. Create `/app/api/agents/chat/route.ts` — server-side API route
   - Accepts: `{ agentId, messages }`
   - Looks up agent system prompt by `agentId`
   - Calls OpenRouter (`anthropic/claude-3.5-haiku`) with system + history
   - Returns: `{ content }`

2. Write 9 unique system prompts — one per agent:
   - Each prompt establishes persona, domain expertise, tone
   - Each knows its goal is to help improve a specific Q-Score dimension
   - Conversational rules: 1 question at a time, concise, no bullet lists

3. Update `[agentId]/page.tsx`:
   - Cream aesthetic (same palette as onboarding chat)
   - Remove mock `generateAgentResponse()` function
   - Wire input → `/api/agents/chat` → display response
   - Keep suggested prompts (shown only before first message)
   - Keep "improves [dimension] score" header chip

### A2 — Agents Hub Redesign (Priority 2)
- Cream palette throughout
- Switch from tab/grid to pillar-section / table-row layout
- Recommendation banner for lowest Q-Score dimension

### A3 — Dashboard Redesign (Priority 3)
- Cream palette throughout
- Remove tab layout → single scroll page
- Q-Score ring hero + dimension mini-bars
- Top action cards + agent activity feed

---

## 6. Design System (Lock These, Never Change)

| Token       | Value      | Usage |
|-------------|------------|-------|
| `bg`        | `#F9F7F2`  | Page backgrounds |
| `surface`   | `#F0EDE6`  | Cards, inputs, bubbles |
| `border`    | `#E2DDD5`  | All dividers and borders |
| `ink`       | `#18160F`  | Primary text, user bubbles |
| `muted`     | `#8A867C`  | Secondary text, placeholders |
| `blue`      | `#2563EB`  | Primary accent (CTAs, links, agent avatar) |
| `green`     | `#16A34A`  | Positive states, good scores |
| `amber`     | `#D97706`  | Warning states, medium scores |
| `red`       | `#DC2626`  | Error states, low scores |

**Typography:**
- Headings: `font-weight: 300`, letter-spacing: `-0.03em`
- Labels/caps: `font-weight: 600`, `text-transform: uppercase`, `letter-spacing: 0.12–0.18em`
- Body: `font-weight: 400`, `line-height: 1.65`
- Monospace: used for scores, counts, IDs only

**Buttons:**
- Primary: `background: #18160F`, `color: #F9F7F2`, `border-radius: 999px` (pill)
- Secondary: `border: 1px solid #E2DDD5`, transparent bg, ink text
- Hover: `opacity: 0.85` (primary), `border-color: #18160F` (secondary)

**Agent pillar colors (border/accent only, not backgrounds):**
- Sales & Marketing: `#2563EB` (blue)
- Operations & Finance: `#16A34A` (green)
- Product & Strategy: `#7C3AED` (purple)

---

## 7. What NOT To Build Yet

- No Stripe / subscription gating (demo first)
- No real email sending
- No real calendar / meeting scheduler
- No mobile app
- No public API
- No multi-tenancy / team accounts
- No analytics dashboard for the platform itself

---

## 8. Definition of "Demo Complete"

The demo is complete when a visitor can:

1. Land on the homepage, feel it's premium, click Get Started
2. Watch the 90s video (or skip), then have a real AI conversation
3. Sign up and see their Q-Score with a breakdown
4. Navigate the founder dashboard and see clear next actions
5. Open any of the 9 agents, ask a real question, get a smart answer
6. See the investor marketplace (locked or unlocked based on score)
7. Experience the investor side: filter deal flow, view a startup's Q-Score, send a connection request

That is the demo. Ship it. Then wire the backend.
