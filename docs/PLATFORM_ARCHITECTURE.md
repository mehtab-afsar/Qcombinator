# Edge Alpha — Full Platform Architecture

> A founder-facing startup operating system: AI agents, an IQ Score engine, investor matching, and a complete startup toolkit — all under one roof.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Authentication & User Model](#4-authentication--user-model)
5. [Q-Score System](#5-q-score-system)
6. [Profile Builder & IQ Score](#6-profile-builder--iq-score)
7. [The 9 AI Agents](#7-the-9-ai-agents)
8. [Workspace & Artifacts](#8-workspace--artifacts)
9. [Metrics Dashboard](#9-metrics-dashboard)
10. [Pitch Deck Generator](#10-pitch-deck-generator)
11. [Investor Portal & Matching](#11-investor-portal--matching)
12. [Messaging](#12-messaging)
13. [Notifications & Activity Feed](#13-notifications--activity-feed)
14. [Database Schema](#14-database-schema)
15. [API Route Map](#15-api-route-map)
16. [LLM Architecture](#16-llm-architecture)
17. [Key Safeguards & Data Integrity](#17-key-safeguards--data-integrity)
18. [End-to-End Data Flow](#18-end-to-end-data-flow)

---

## 1. Platform Overview

Edge Alpha is a full-stack web platform designed for early-stage founders. It combines:

- **AI Agents** — 9 specialist advisers (GTM, finance, legal, hiring, brand, etc.) each capable of producing structured deliverables
- **IQ Score** — a venture-grade scoring engine that quantifies startup readiness across 6 parameters and 30 indicators
- **Profile Builder** — a guided interview + document-upload flow that feeds the IQ Score
- **Investor Portal** — a read-only view where VCs see matched founders and deep-dive into their data
- **Startup Toolkit** — Metrics, Pitch Deck Generator, Workspace, Matching, Messaging, Academy

The platform is entirely API-driven with a Next.js App Router frontend. There is no CMS or third-party dashboard — all UI is custom-built with inline styles and framer-motion animations.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, RSC + client components) |
| Language | TypeScript (strict) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| LLM Provider | Groq API — `llama-3.3-70b-versatile` |
| Animation | framer-motion |
| Email | Resend |
| File Parsing | pdf-parse (PDF), xlsx (spreadsheets), mammoth (DOCX) |
| Competitor Intel | Tavily Search API |
| Lead Enrichment | Hunter.io API |
| Payments | Stripe (restricted key — read-only MRR/ARR) |
| Deployment | Vercel (Edge Runtime for chat; Node for uploads) |

### Colour palette (used everywhere, never changes)

```
bg:     #F9F7F2   (off-white page background)
surf:   #F0EDE6   (card/surface background)
bdr:    #E2DDD5   (all borders)
ink:    #18160F   (primary text)
muted:  #8A867C   (secondary text)
blue:   #2563EB   (primary action)
green:  #16A34A   (success/positive)
amber:  #D97706   (warning)
red:    #DC2626   (danger/negative)
```

---

## 3. Repository Structure

```
Qcombinator/
├── app/
│   ├── founder/               # All founder-facing pages
│   │   ├── agents/[agentId]/  # Agent chat page (1,123-line thin shell)
│   │   ├── dashboard/         # Score + metrics strip + challenges
│   │   ├── profile-builder/   # IQ Score interview flow
│   │   ├── workspace/         # Deliverables portfolio
│   │   ├── metrics/           # KPI dashboard
│   │   ├── pitch-deck/        # Deck generator
│   │   ├── matching/          # Investor matching
│   │   ├── portfolio/         # Public-facing founder portfolio
│   │   ├── activity/          # Agent activity feed
│   │   ├── improve-qscore/    # Score improvement hub
│   │   └── messages/          # Investor messaging
│   ├── investor/              # Investor-facing pages
│   │   ├── deal-flow/         # Founder discovery
│   │   ├── startup/[id]/      # Founder deep-dive
│   │   └── onboarding/        # Investor signup
│   ├── api/                   # All API routes
│   ├── s/[surveyId]/          # Public PMF survey page
│   └── apply/[userId]/[role]/ # Public job application page
├── features/
│   ├── agents/                # Per-agent component library
│   │   ├── shared/            # DeliverablePanel, ShareModal, CopyBtn, utils
│   │   ├── atlas/ felix/ harper/ leo/ maya/ nova/ patel/ sage/ susi/
│   ├── qscore/
│   │   ├── calculators/       # iq-score-calculator.ts, p1–p6 parameter scorers
│   │   ├── services/          # agent-signal.ts (dimension boost on artifact)
│   │   └── utils/             # sector-weights.ts
│   ├── founder/
│   │   ├── hooks/             # useFounderData.ts, useMetrics.ts
│   │   └── components/        # FounderSidebar.tsx
│   └── messaging/             # MessagesPage.tsx
├── lib/
│   ├── profile-builder/       # question-engine, extraction-prompts, smart-questions, utils
│   ├── actions/               # Universal action executor + per-action handlers
│   ├── tools/                 # Tool executor (caching + logging)
│   ├── openrouter.ts          # LLM call wrapper (now routes to Groq)
│   └── edgealpha.config.ts    # Action registry
├── docs/                      # Architecture & spec files
└── supabase/migrations/       # SQL migrations
```

---

## 4. Authentication & User Model

### Auth flow

1. User signs up/in via **Supabase Auth** (email/password)
2. JWT is stored client-side and sent as `Authorization: Bearer <token>` on every API call
3. Every API route calls `supabase.auth.getUser(token)` to resolve `userId`
4. `founder_profiles` row is created on first onboarding save; `investor_profiles` row on investor onboarding

### Two user types

| Type | Tables | Pages |
|---|---|---|
| Founder | `founder_profiles`, `agent_artifacts`, `qscore_history`, `profile_builder_data` | `/founder/**` |
| Investor | `investor_profiles`, `demo_investors` | `/investor/**` |

Route protection is handled by `proxy.ts` (Next.js 16 middleware replacement) — checks Supabase session and redirects unauthenticated users.

---

## 5. Q-Score System

The Q-Score is a **0–100 composite score** representing startup quality across 5 dimensions. It's separate from (but feeds into) the IQ Score from the Profile Builder.

### 5 Dimensions

| ID | Dimension | What it measures |
|---|---|---|
| `market` | Market Validation | Customer evidence, paying customers, retention |
| `product` | Product & Technology | IP, build complexity, technical depth |
| `team` | Team & Execution | Domain experience, founder-market fit, prior exits |
| `traction` | Traction & Revenue | MRR, ARR, growth rate, runway |
| `impact` | Strategic Impact | Market size, urgency, competitive moat |

### How Q-Score is updated

Three event types trigger a score update:

1. **Agent artifact created** — `applyAgentScoreSignal()` in `features/qscore/services/agent-signal.ts` grants a one-time dimension boost per artifact type per user
2. **Profile Builder submission** — the IQ Score is written to `qscore_history` after submit
3. **Manual evidence upload** — founders can attach evidence via the improve-qscore page

Every update inserts a new `qscore_history` row with `previous_score_id` for full trajectory history.

### Sector-adaptive weights

`features/qscore/utils/sector-weights.ts` defines 8 sector rubrics (SaaS, Marketplace, Deep Tech, FinTech, HealthTech, Consumer, Hardware, Climate). Each sector shifts the relative weight of dimensions — e.g. Deep Tech weights `product` higher; Consumer weights `traction` higher.

### Score display

- **Dashboard** — `ScoreChart` trajectory line, staleness banner (if >30 days old), 3-lowest dimension challenge cards
- **Improve Q-Score page** — full breakdown with peer benchmarks, simulator, evidence form, 12 artifact challenges
- **Portfolio page** — Q-Score ring (SVG arc), investor-facing

---

## 6. Profile Builder & IQ Score

The Profile Builder is a structured interview that produces an **IQ Score** — a more rigorous, VC-grade evaluation than the Q-Score.

### Two input paths

```
Path A: Conversation
  Founder types answers in chat →
  POST /api/profile-builder/extract →
  LLM extraction → confidence-gated fields saved to profile_builder_data

Path B: Document Upload
  Founder uploads PDF/PPTX/XLSX/CSV/image →
  POST /api/profile-builder/upload →
  Document parsed → LLM extracts all 5 sections in parallel → saved
```

Both paths converge at the same `profile_builder_data` table. On submit, whatever has been saved across both paths is scored together.

### 5 Sections

| # | Section | Key Fields |
|---|---|---|
| 1 | Market Validation | customerCommitment, conversationCount, hasPayingCustomers, salesCycleLength, retention |
| 2 | Market & Competition | tamDescription, marketUrgency, valuePool, competitorCount |
| 3 | IP & Technology | hasPatent, buildComplexity, technicalDepth, knowHowDensity, replicationCostUsd |
| 4 | Team | domainYears, founderMarketFit, teamCoverage, priorExits, teamCohesionMonths |
| 5 | Financials & Impact | mrr, arr, monthlyBurn, runway, grossMargin |

### Extraction pipeline

```
User answer text
      │
      ▼
POST /api/profile-builder/extract
      │
      ├── callOpenRouter([system: EXTRACTION_PROMPTS[section], user: answer])
      │     Returns JSON: { fieldName: value, ..., confidence: { fieldName: 0.0–1.0 } }
      │
      ├── flattenConfidence(rawConf)  ← flattens nested { p2: { tam: 0.8 } } → { tam: 0.8 }
      │
      ├── mergeDeep(existing, newFields)  ← never overwrites non-null with null
      │
      ├── getSectionCompletionPct(merged, section, stage, confidenceMap)
      │     Fields with confidence < 0.45 are treated as missing
      │
      └── generateFollowUpQuestion(missingFields) via second LLM call
```

### Confidence gating

The LLM returns a `confidence` sub-object alongside extracted fields. Fields with confidence < 0.45 are:
- Excluded from section completion % calculation
- Treated as missing → generate follow-up questions
- Excluded from IQ Score indicator scoring

This prevents hallucinated or uncertain values from inflating the score.

### Smart Q&A (post-upload)

After a document upload, `generateSmartQuestions()` in `lib/profile-builder/smart-questions.ts` produces targeted follow-up questions for fields that are:
- Missing from all 5 sections, OR
- Present but with confidence < 0.45

Questions are section-scoped: only the top-level keys relevant to each section are examined, not the full merged blob.

### IQ Score formula

```
activeIndicators = indicators where excluded = false
activeRaw        = Σ(rawScore for active indicators)
activeDenominator= activeIndicators.length × 5
sparsityPenalty  = max(0, (20 - activeIndicators.length) × 0.5), capped at 5

IQ Score = max(0, round((activeRaw / activeDenominator × 100) - sparsityPenalty))

availableIQ = round(activeDenominator / (30 × 5) × 100)   ← ceiling if all active scored 5/5
```

Sector-specific parameter weights shift the relative contribution of each parameter to the composite. The bluff detection blends the score toward 30 for incomplete sections (< 30% complete).

### 6 Parameters & 30 Indicators

| Parameter | Weight | Indicators |
|---|---|---|
| P1 Market Readiness | 22% | Early Signal, Willingness to Pay, Speed, Durability, Scale |
| P2 Market Potential | 20% | TAM Size, Market Urgency, Value Pool, Competitive Density, Timing |
| P3 IP & Defensibility | 18% | Patent/Secret, Build Complexity, Technical Depth, Know-How, Replication Cost |
| P4 Founder & Team | 20% | Domain Years, Founder-Market Fit, Team Coverage, Prior Exits, Cohesion |
| P5 Structural Impact | 10% | Market Category, Ecosystem Effect, Regulatory Moat, Network Density, ESG Alignment |
| P6 Financials | 10% | MRR, Burn Rate, Runway, Gross Margin, Revenue Growth |

### Submission orchestrator (`POST /api/profile-builder/submit`)

1. Loads all 5 `profile_builder_data` rows for the user
2. Calls `iqScoreCalculator.calculate(allFields, stage, sector)`
3. Runs AI reconciliation (flags data quality issues across sections)
4. Computes percentile benchmarks per indicator
5. Writes result to `qscore_history`
6. Returns `{ score, grade, iqBreakdown[], reconciliationFlags[], validationWarnings[] }`

### Result Memo

After submission, a **Result Memo** renders below the score bars with three sections:

- **Score Evidence** — one card per parameter, one row per indicator with score badge (green ≥ 4.0, amber ≥ 2.5, red < 2.5, grey if excluded), percentile chip, VC alert chip, and exclusion reason
- **Why This Score** — deterministic narrative from `buildScoreNarrative()` (no LLM) — overall paragraph + per-parameter sentence
- **Top 3 Score Unlocks** — AI-generated cards from `generateScoreIntelligence()` (runs parallel with benchmarks): each card shows estimated point gain, current→target score, concrete action, and which agent can help. Below the cards: a 3-sentence Investor Readiness Summary.

Supports "Download as PDF" via `window.print()` with `@media print` CSS that hides all UI except the memo.

---

## 7. The 9 AI Agents

Each agent is a specialist adviser with a defined persona, system prompt, and set of deliverable types (artifacts). All agents share:

- The same chat API route (`POST /api/agents/chat`)
- Non-streaming JSON mode (`useStream = false`)
- 2-pass tool_call XML detection for structured outputs
- Cross-agent memory injection (own artifacts + other agents' artifacts)
- Q-Score signal on artifact creation

### Agent roster

| Agent | ID | Speciality | Key Artifacts |
|---|---|---|---|
| **Patel** | `patel` | GTM & Sales | ICP profile, outreach sequences, battle cards, GTM playbook |
| **Maya** | `maya` | Brand & Marketing | Brand messaging, landing page HTML, blog posts |
| **Felix** | `felix` | Finance | Financial summary, investor updates, Stripe MRR sync |
| **Leo** | `leo` | Legal | Legal checklist, NDA generator |
| **Harper** | `harper` | Hiring | Hiring plan, resume screener, public apply page |
| **Nova** | `nova` | Product | PMF survey, interview notes analysis, fake door tests |
| **Atlas** | `atlas` | Strategy & Competition | Competitive matrix, competitor tracker |
| **Sage** | `sage` | Strategic Planning | Strategic plan, OKRs, investor updates |
| **Susi** | `susi` | Sales CRM | Sales scripts, deal tracker, stale deal reminders |

### Chat architecture

```
POST /api/agents/chat
      │
      ├── Load agent system prompt (one of 9)
      ├── Inject agent memory:
      │     "MEMORY — What you built together" (own artifacts)
      │     "FOUNDER CONTEXT — Other advisers built these" (other agents' artifacts)
      │
      ├── callGroq(messages) → raw response text
      │
      ├── Pass 1: Check for <tool_call> XML block
      │     If found → parse artifact type + JSON data
      │                → save to agent_artifacts table
      │                → apply Q-Score dimension signal
      │
      ├── Pass 2: Streaming JSON fallback
      │     Handles cases where XML not detected
      │
      └── Return { message, artifact? }
```

### 16 tool call types

All 12 artifact types + `lead_enrich` (Hunter.io) + `web_research` (Tavily) + `create_deal` (Supabase) + `competitive_matrix`

### Phase 2 integrations (no OAuth required)

Every agent has at least one action that connects to an external platform:

| Agent | Integration |
|---|---|
| Patel | "Send in Gmail" → `mail.google.com/mail/?view=cm&...` |
| Atlas | "🔔 Alert" per competitor → Google Alerts URL |
| Harper | "Post on Wellfound" → copies JD + opens `wellfound.com/jobs/new` |
| Sage | "Export to Linear/Notion" → copies OKRs as markdown + opens `linear.app/new` |
| Maya | "Download landing page HTML" → self-contained HTML file |
| Nova | "Download Survey HTML" → standalone HTML survey with localStorage |
| Leo | "Start on Clerky / Stripe Atlas" → copies details + opens platform |
| Maya | "Download Templates" → HTML with 3 SVG social templates |
| Felix | "Download CSV" → financial model with 12-month MRR projection formulas |

### Quick Generate

Founders can generate any artifact without typing via **Quick Generate modal**:
- 5 context questions → synthetic conversation built → `POST /api/agents/generate`
- Two-pass: extract context → generate artifact → write to `agent_artifacts` + create `score_evidence`

### DeliverablePanel (shared component)

`features/agents/shared/components/DeliverablePanel.tsx` renders any artifact type. Features:
- Quality bar (computed from field completeness)
- Version tabs (all historical versions of same type)
- Revise mode (text selection → "Rewrite this" → inline replacement)
- Share modal (Copy text / Export PDF / Copy Markdown / Email co-founder)
- `?artifact=<uuid>` URL param: loads a specific artifact directly (used by Workspace "View" links)

---

## 8. Workspace & Artifacts

`app/founder/workspace/page.tsx` — the founder's portfolio of all AI-generated deliverables.

### How it works

1. Fetches all `agent_artifacts` for the user, grouped by `artifact_type`
2. Displays most recent version per type; expandable version history
3. "View" links pass `?artifact=<id>` to the agent page — the exact artifact opens
4. "Challenge" badges link to `?challenge=<dimension>` for score improvement context

### Artifact types (12)

`icp_profile`, `outreach_sequence`, `battle_card`, `gtm_playbook`, `brand_messaging`, `financial_summary`, `legal_checklist`, `hiring_plan`, `pmf_survey`, `interview_notes`, `competitive_matrix`, `strategic_plan`

Each type has a dedicated renderer component in `features/agents/<agentName>/components/`.

### Score evidence

When an artifact is created (via Quick Generate or chat), `POST /api/agents/generate` auto-creates a `score_evidence` row with `type='agent_artifact'`, `status='verified'`. This counts toward dimension challenges on the improve-qscore page.

---

## 9. Metrics Dashboard

`app/founder/metrics/page.tsx` — real-time KPI dashboard.

### Data hierarchy (3-tier fallback in `useMetrics`)

```
1. agent_artifacts (financial_summary by Felix, most recent)
   ↓ not found?
2. qscore_history.assessment_data (embedded financials from score history)
   ↓ not found?
3. localStorage (manually entered values, persisted browser-side)
```

### KPIs displayed

MRR, ARR, Customers, Runway, LTV, CAC, LTV:CAC ratio, Gross Margin, Monthly Burn, Churn Rate, Unit Economics breakdown

### Manual Entry Form

"Update metrics" button → inline 10-field form → saves as a `financial_summary` artifact attributed to the Felix agent. This feeds back into tier 1 of the data hierarchy.

### Stripe integration

Felix agent can sync live MRR/ARR from Stripe using a **restricted key** (read-only charges scope). The key is sent from the client, used once, and never stored.

### Dashboard strip

`app/founder/dashboard/page.tsx` shows a 5-cell metrics strip (MRR, Burn, Runway, Customers, LTV:CAC) pulled from `useMetrics`. Clicking it navigates to `/founder/metrics`.

---

## 10. Pitch Deck Generator

`app/founder/pitch-deck/page.tsx` — populates a 10-slide deck from real agent artifacts.

### How it works

1. On mount, fetches latest artifacts: `gtm_playbook`, `brand_messaging`, `financial_summary`, `competitive_matrix`, `hiring_plan`
2. `buildSlides(artifacts)` maps artifact data to 10 slide structures
3. `dataConfidence` per slide: `"high"` (full artifact), `"medium"` (partial), `"low"` (some data), `"none"` (no artifact)
4. `generateDeckHTML(slides)` → full-screen HTML presentation (keyboard-navigable: ← →)

### UI

- Left sidebar: 10 slide nav cards with colour-coded confidence dots
- Right: dark slide preview with gradient backgrounds
- Editable company name input
- Readiness bar (% of slides with data)
- "Download HTML" → creates standalone `.html` file

When a slide has no data, it shows a CTA linking to the relevant agent.

---

## 11. Investor Portal & Matching

### Investor-facing portal

| Route | Description |
|---|---|
| `GET /api/investor/deal-flow` | All founders with completed onboarding + Q-Scores; applies `ai_personalization` match scores |
| `GET /api/investor/startup/[id]` | Full founder deep-dive: profile + Q-Score breakdown + all key artifacts |
| `GET /api/investor/portfolio` | Accepted connections with enriched Q-Score + financial data |

`app/investor/deal-flow/page.tsx` shows momentum badges (hot/trending/steady) based on Q-Score thresholds.

### Founder-side matching

`app/founder/matching/page.tsx` — match score algorithm `computeMatchScore(investor, qScore, sector, stage)`:

```
Base:              40 pts
Sector alignment:  +30 pts (exact or aliased match)
Stage alignment:   +20 pts (pre-seed → seed → series-a etc.)
Q-Score bonus:     +10 pts (proportional to Q-Score / 100)
Response rate:     +5 pts  (investor's historical response rate)
─────────────────────────
Max:               105 pts (capped at 100)
```

Results sorted by match score. Connection request: `POST /api/connections` saves `{ founder_id, demo_investor_id, personal_message, founder_qscore }`.

### Connection status lifecycle

`pending` → `viewed` → `accepted` / `declined`

Status is fetched on mount via `GET /api/connections` which returns a map keyed by `demo_investor_id`.

---

## 12. Messaging

`features/messaging/MessagesPage.tsx` — conversations panel.

On mount:
1. Fetches `GET /api/connections` → pending/viewed connection requests
2. Fetches investor list from `GET /api/investors`
3. Maps each connection to a conversation thread
4. Pending connections show as a "request sent" system message in the thread

Actual reply messaging is mock (local state only) — the connection request → investor reply flow is the real integration.

---

## 13. Notifications & Activity Feed

### Notification center

- `GET /api/notifications` — fetches notable `agent_activity` events (artifact created, deal updated, etc.)
- Bell icon in `FounderSidebar` shows unread count (tracked via `localStorage` key `ea_read_notifs_v1`)
- Slide-out panel, "View all activity →" links to `/founder/activity`

### Activity feed

`app/founder/activity/page.tsx` — full `agent_activity` log grouped by date.

### Weekly digest

`POST /api/digest/weekly` — sends an HTML email via Resend:
- Groups last 7 days of `agent_activity` by agent
- Includes Q-Score delta (current vs. 7 days ago)
- Triggered by "Send Digest" button on the activity page

---

## 14. Database Schema

### Core tables

```sql
-- Founder identity
founder_profiles (
  id, user_id, name, email, company, industry, stage,
  onboarding_completed, avatar_url, linkedin_url
)

-- Agent outputs
agent_artifacts (
  id, user_id, agent_id, artifact_type,
  title, content JSONB, conversation_id, created_at
)

-- Score history (append-only)
qscore_history (
  id, user_id, overall_score,
  market_score, product_score, team_score, traction_score, impact_score,
  data_source, source_artifact_type,
  previous_score_id,           -- linked list for trajectory
  assessment_data JSONB,       -- full breakdown + financials
  ai_actions JSONB,            -- cached LLM action recommendations
  created_at
)

-- Profile Builder data
profile_builder_data (
  user_id, section,            -- unique per (user, section)
  raw_conversation TEXT,
  extracted_fields JSONB,
  confidence_map JSONB,
  completion_score,
  uploaded_documents JSONB[],
  updated_at
)

-- Profile Builder uploads
profile_builder_uploads (
  id, user_id, section, filename, file_type,
  storage_path, extracted_text, parsed_data JSONB,
  confidence, uploaded_at
)

-- Evidence for score challenges
score_evidence (
  id, user_id, dimension, evidence_type,
  title, data_value, status, points_awarded, created_at
)

-- Agent conversations
agent_conversations (id, user_id, agent_id, title, created_at)
agent_messages      (id, conversation_id, role, content, created_at)
agent_actions       (id, conversation_id, action_type, data JSONB)
agent_activity      (id, user_id, agent_id, action_type, description, metadata JSONB)

-- Investor matching
demo_investors (
  id, name, firm, title,
  sectors[], stages[], check_sizes[],
  response_rate, thesis
)
connection_requests (
  id, founder_id, demo_investor_id UUID,
  personal_message, founder_qscore, status, created_at
)
investor_profiles (id, user_id, firm, thesis, ai_personalization JSONB)
```

---

## 15. API Route Map

### Profile Builder
| Method | Route | Description |
|---|---|---|
| POST | `/api/profile-builder/extract` | LLM extraction for one section answer |
| POST | `/api/profile-builder/upload` | Document upload + bulk extraction |
| GET/POST | `/api/profile-builder/draft` | Load/save section draft |
| POST | `/api/profile-builder/submit` | Final IQ Score calculation + save |

### Agents
| Method | Route | Description |
|---|---|---|
| POST | `/api/agents/chat` | Main chat route (all 9 agents) — SSE streaming when `FF_STREAMING_CHAT` on |
| POST | `/api/agents/generate` | Quick Generate — sync or async (returns `jobId` when `FF_ASYNC_ARTIFACT_GENERATION` on) |
| POST | `/api/agents/generate/run` | Background generation runner (Node.js, 300s timeout, internal only) |
| GET | `/api/agents/generate/status` | Poll async job status (`?jobId=…`) |
| POST | `/api/agents/landingpage/deploy` | Netlify deploy for landing page |
| POST | `/api/agents/felix/investor-update` | YC-style investor update email |
| POST | `/api/agents/felix/stripe` | Stripe live MRR/ARR |
| POST | `/api/agents/maya/blog-post` | Brand-voice blog post |
| GET/POST | `/api/survey` | PMF survey create/fetch |
| GET | `/api/survey/results` | Survey response data |
| POST | `/api/agents/harper/apply` | Resume screening |
| POST | `/api/agents/sage/investor-update` | Sage investor update |
| GET | `/api/agents/investor/contacts` | Investor contact list |
| GET | `/api/agents/atlas/track` | Competitor tracker |
| POST | `/api/agents/leo/nda` | NDA generator |
| GET | `/api/agents/deals/reminders` | Stale deal reminders |

### Q-Score & Metrics
| Method | Route | Description |
|---|---|---|
| GET | `/api/qscore` | Current score + history |
| GET | `/api/qscore/actions` | AI action recommendations (cached) |
| GET | `/api/qscore/benchmarks` | Per-dimension cohort percentiles |

### Investor
| Method | Route | Description |
|---|---|---|
| GET | `/api/investor/deal-flow` | All founders with match scores |
| GET | `/api/investor/startup/[id]` | Full founder deep-dive |
| GET | `/api/investor/portfolio` | Accepted connections + financials |

### Platform
| Method | Route | Description |
|---|---|---|
| GET/POST | `/api/connections` | Connection requests (status + create) |
| POST | `/api/connections/rationale` | AI match rationale for a founder-investor pair |
| GET | `/api/investors` | Investor list |
| GET | `/api/notifications` | Agent activity notifications |
| POST | `/api/digest/weekly` | Weekly email digest |

---

## 16. LLM Architecture (v2)

### Routing layer

All LLM calls go through `lib/llm/router.ts`. Call sites declare **what** they're doing (task class), not which model to use:

```typescript
// Task-class routing
routedText('extraction', messages)    → llama-3.1-8b-instant  (Groq, temp 0.1)
routedText('generation', messages)    → llama-3.3-70b-versatile (Groq, temp 0.55)
routedText('reasoning', messages)     → claude-haiku-4-5 (Anthropic, temp 0.2)
routedText('classification', messages)→ llama-3.1-8b-instant  (Groq, temp 0.0)
routedText('summarisation', messages) → llama-3.1-8b-instant  (Groq, temp 0.3)

// Tier-based routing (for explicit complexity classification)
tieredText('economy', messages)   → classification task class (8b)
tieredText('standard', messages)  → generation task class (70b)
tieredText('premium', messages)   → reasoning task class (Anthropic Haiku)
```

The `premium` tier routes to Anthropic Haiku if `ANTHROPIC_API_KEY` is set; falls back to Groq standard otherwise.

### Model tiers

| Tier | Model | Token cost | Use cases |
|------|-------|------------|-----------|
| Economy | `llama-3.1-8b-instant` (Groq) | Lowest | Field extraction, follow-up questions, self-critique, match rationale |
| Standard | `llama-3.3-70b-versatile` (Groq) | Mid | Agent chat, artifact generation, context summaries |
| Premium | `claude-haiku-4-5` (Anthropic) | Highest | IQ Score reconciliation, score intelligence, evaluator pass |

### SSE Streaming

`llmStream()` in `lib/llm/provider.ts` is an async generator that yields `{ type: 'delta', text }` chunks as Groq streams tokens. The chat route re-streams these to the client as Server-Sent Events when `FF_STREAMING_CHAT` is enabled:

```
Client → POST /api/agents/chat (wantStream: true)
         → SSE: { type: 'delta', text: '…' }   (first token < 1s)
         → SSE: { type: 'artifact', … }          (when tool call detected)
         → SSE: { type: 'done' }
```

### Evaluator pass

After every artifact is generated in the chat route, a reasoning-class LLM scores it 0–100 across completeness, specificity, and actionability. If the score is < 70, a single regeneration pass runs with an improved prompt before saving.

### Self-critique loop (FF_ARTIFACT_SELF_CRITIQUE)

After artifact save in both chat and Quick Generate routes:

```
Pass 3: critiqueArtifact() — economy model
  Rates each section: complete / adequate / weak / missing
  → needsPatch = true if any weak/missing

Pass 4: patchArtifact() — economy model (only if needsPatch)
  Rewrites weak/missing sections in the full artifact JSON
  → Final artifact saved (chat: background update; generate: before insert)

critique_metadata JSONB → stored on agent_artifacts row
```

Surface in `DeliverablePanel` as a collapsible "Quality Review" section with per-section rating badges.

### Cross-agent orchestration (FF_CROSS_AGENT_ORCHESTRATION)

`lib/agents/orchestrator.ts` — runs in parallel with context loading on every chat call:

```
For each dependency of the primary agent:
  If artifact exists → extract 2-3 line summary (no sub-call)
  If missing + sub-calls available → tieredText('economy', mini-brief prompt, 300 tokens)
  Max 2 sub-calls per request; max 3 injected context blocks

Result injected as:
  [PATEL CONTEXT — synthesised]   ← brand voice from Maya
  [ATLAS CONTEXT]                  ← existing competitive matrix
```

### Context compression (FF_AGENT_CONTEXT_COMPRESSION, default: on)

`lib/agents/context-compressor.ts` — enforces a 4K-token budget on context injection:

- Keeps last 3 own-artifacts at full fidelity
- Scores cross-agent artifacts by topic relevance; drops low-scorers
- Accumulative agents (Susi/Atlas): tighter limits (2 own, 2 cross-agent)

### AI Score Intelligence (FF_AI_SCORE_INTELLIGENCE, default: on)

After every IQ Score submission, `generateScoreIntelligence()` runs in parallel with benchmark fetch:

- **Unlock cards** — top 3 indicators where improvement has highest score impact; each has a specific action + estimated point gain
- **Readiness summary** — 3-sentence investor-facing narrative
- Cached in `qscore_history.ai_actions` JSONB
- Exposed via `GET /api/qscore/actions` response (`unlockCards[]`, `readinessSummary`)

### AI Investor Matching (FF_AI_INVESTOR_MATCHING, default: on)

`generateMatchRationale()` in `features/matching/services/match-rationale.ts`:

- Economy-tier call per investor; lazy-loaded on row hover in matching page
- 2-3 sentence specific rationale (sector fit, portfolio synergy, risk)
- Passed to `ConnectionRequestModal` as `matchReason`
- `POST /api/connections/rationale` — auth-gated endpoint

### Async artifact generation (FF_ASYNC_ARTIFACT_GENERATION, default: off)

When enabled:
1. `POST /api/agents/generate` inserts `artifact_jobs` row, returns `{ jobId, status: 'pending' }` immediately (< 200ms)
2. Fires `POST /api/agents/generate/run` (Node.js runtime, 300s timeout) non-blocking
3. Client polls `GET /api/agents/generate/status?jobId=…` every 2s
4. Quick Generate UI shows step progress: "Extracting context → Building artifact → Researching competitors → Finalising → Done"

### Context injection (agent memory)

Every agent chat call injects (after compression):

```
MEMORY — What you have previously built together:
  [artifact_type] ([N days ago]): "[title]"

FOUNDER CONTEXT — Other advisers built these:
  [artifact_type] by [agent] ([N days ago]): "[title]"

CROSS-AGENT ACTIVITY:
  [agent] [description] ([N days ago])

CROSS-AGENT INTELLIGENCE (if orchestration enabled):
  [AGENT CONTEXT — synthesised]
  [brief from sub-agent call or existing artifact summary]
```

### Rate limiting

- IQ Score: 24-hour cooldown per user; `429` response includes `retakeAvailableAt` ISO timestamp
- `429` responses: UI shows "Score locked — recalculate again at [HH:MM]"

### Feature flags

All flags in `lib/feature-flags.ts` via `NEXT_PUBLIC_FF_<NAME>` env vars:

| Flag | Default | Controls |
|------|---------|---------|
| `STREAMING_CHAT` | `false` | SSE streaming for agent chat |
| `MODEL_ROUTING` | `true` | Task-complexity model selection |
| `CROSS_AGENT_ORCHESTRATION` | `false` | Sub-agent delegation via orchestrator |
| `ARTIFACT_SELF_CRITIQUE` | `false` | 2-pass critique + patch after generation |
| `AI_SCORE_INTELLIGENCE` | `true` | Unlock cards + readiness summary on IQ submit |
| `AI_INVESTOR_MATCHING` | `true` | Match rationale per investor |
| `ASYNC_ARTIFACT_GENERATION` | `false` | Fire-and-poll Quick Generate |
| `AGENT_CONTEXT_COMPRESSION` | `true` | 4K-token context budget enforcement |

---

## 17. Key Safeguards & Data Integrity

### Confidence gating

The LLM confidence map is flattened before use (`flattenConfidence()` in `lib/profile-builder/utils.ts`). Without this, nested confidence objects like `{ p2: { tamDescription: 0.8 } }` would produce a flat lookup miss → `undefined → 0 < 0.45` → field excluded. All sections would score 0%.

### Merge strategy (never overwrite with null)

The `mergeDeep()` pattern used in both extraction and upload routes skips any `null` or `undefined` value in the incoming source. This means a conversation answer that extracts a partial update will never erase existing document-extracted data.

### Dynamic IQ Score denominator

IQ Score denominator = `activeIndicators.length × 5` (not the fixed 150). Excluded indicators are dropped from both numerator and denominator, so exclusion never inflates the score. A sparsity penalty (−0.5 pts per indicator below 20 active, capped at −5) prevents very sparse submissions from appearing stronger than fully-evidenced ones. `availableIQ` = ceiling if all active indicators scored perfectly.

### Idempotent document upload

A 60-second deduplication window: if the same filename is uploaded to the same section within 60s, the route returns success silently without re-processing or re-inserting.

### Service role key isolation

Upload and admin routes use `SUPABASE_SERVICE_ROLE_KEY`. Auth-checking routes use `NEXT_PUBLIC_SUPABASE_ANON_KEY`. The service key never touches client-side code.

### Stripe key never stored

The Stripe restricted key (sent by the founder for live metrics) is used in-memory for a single API call and immediately discarded. It is never written to any database table.

---

## 18. End-to-End Data Flow

### Profile Builder → IQ Score

```
Founder                          Server                           DB
   │                               │                               │
   ├── Upload pitch deck ──────────▶ parseDocument()               │
   │                               ├── LLM × 5 sections ──────────▶ profile_builder_data (5 rows)
   │                               │                               │
   ├── Chat answers ───────────────▶ extract/route.ts              │
   │   (per section)               ├── LLM extraction              │
   │                               ├── confidence merge ───────────▶ profile_builder_data (upsert)
   │   ← follow-up question ───────┤                               │
   │                               │                               │
   ├── Submit ─────────────────────▶ submit/route.ts               │
   │                               ├── load all 5 sections ────────◀ profile_builder_data
   │                               ├── iqScoreCalculator.calculate()│
   │                               ├── AI reconciliation            │
   │                               ├── benchmarking ───────────────▶ qscore_history (insert)
   │   ← { score, grade,           │                               │
   │       iqBreakdown,            │                               │
   │       reconciliationFlags } ──┤                               │
   │                               │                               │
   ├── Result Memo renders ◀───────┘                               │
```

### Agent → Artifact → Q-Score

```
Founder types in agent chat
      │
      ▼
POST /api/agents/chat
      ├── LLM generates response with <tool_call> XML
      ├── artifact saved → agent_artifacts
      ├── applyAgentScoreSignal() → qscore_history (new row, dimension boosted)
      └── score boost toast shown in UI (+X pts, 4s)

Next time founder opens dashboard:
      ├── ScoreChart shows new trajectory point
      └── Workspace shows new artifact with version tab
```

### Investor match flow

```
Founder completes profile + gets Q-Score
      │
      ▼
Investor opens /investor/deal-flow
      ├── GET /api/investor/deal-flow
      ├── Supabase: all founder_profiles (onboarding_completed = true)
      ├── Join: latest qscore_history per founder
      ├── Apply ai_personalization match scores from investor_profiles
      └── Return sorted list

Founder sees investor in matching page
      ├── computeMatchScore() per investor
      ├── Founder sends connection request → POST /api/connections
      └── Investor sees request in /investor/deal-flow with "Pending" badge
```
