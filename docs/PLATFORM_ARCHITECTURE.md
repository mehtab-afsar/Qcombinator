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
IQ Score = Σ(all 30 rawScores) / 150 × 100

Where:
- 6 parameters × 5 indicators = 30 indicators
- Each indicator scored 0–5
- Max possible = 30 × 5 = 150
- Result is a 0–100 integer
```

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

After submission, a **Result Memo** renders below the score bars with two sections:

- **Score Evidence** — one card per parameter, one row per indicator with score badge (green/amber/red/grey), percentile chip, and VC alert chip
- **Why This Score** — deterministic narrative generated by `buildScoreNarrative()` (no LLM call) — overall paragraph + per-parameter sentence

Supports "Download as PDF" via `window.print()` with print CSS that hides all UI except the memo.

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
| POST | `/api/agents/chat` | Main chat route (all 9 agents) |
| POST | `/api/agents/generate` | Quick Generate (no chat needed) |
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
| GET | `/api/investors` | Investor list |
| GET | `/api/notifications` | Agent activity notifications |
| POST | `/api/digest/weekly` | Weekly email digest |

---

## 16. LLM Architecture

### Single call wrapper

All LLM calls go through `lib/openrouter.ts` (now re-wired to Groq):

```typescript
callOpenRouter(messages, { maxTokens, temperature }) → string
```

Uses `anthropic/claude-3.5-haiku` model ID via OpenRouter OR `llama-3.3-70b-versatile` via Groq — configurable via `OPENROUTER_API_KEY` / `GROQ_API_KEY` environment variables.

### Two-pass artifact detection

For agent chat, raw LLM output is checked for structured content in two passes:

```
Pass 1: XML detection
  Regex match for <tool_call type="artifact_type">...</tool_call>
  → If found: parse JSON inside, save artifact, return structured response

Pass 2: JSON block detection
  Regex match for ```json ... ``` or { ... }
  → If found: attempt to parse as artifact data
  → If fails: return raw text as chat message
```

### Rate limiting

- Profile Builder extract route: 1500ms pause between extraction call and follow-up call (avoids free-tier back-to-back rate limits)
- 429 responses: UI shows human-readable "Score locked — recalculate again at [HH:MM]"

### Context injection (agent memory)

Every agent chat call injects:

```
MEMORY — What you built together:
  [artifact_type]: [content preview]  (all artifacts for this agent + user)

FOUNDER CONTEXT — Other advisers built these:
  [agent_name]: [artifact_type] — [content preview]  (other agents' artifacts)
```

This gives each agent full awareness of what other agents have produced, enabling cross-agent references (e.g., Atlas referencing Harper's hiring plan for org structure).

---

## 17. Key Safeguards & Data Integrity

### Confidence gating

The LLM confidence map is flattened before use (`flattenConfidence()` in `lib/profile-builder/utils.ts`). Without this, nested confidence objects like `{ p2: { tamDescription: 0.8 } }` would produce a flat lookup miss → `undefined → 0 < 0.45` → field excluded. All sections would score 0%.

### Merge strategy (never overwrite with null)

The `mergeDeep()` pattern used in both extraction and upload routes skips any `null` or `undefined` value in the incoming source. This means a conversation answer that extracts a partial update will never erase existing document-extracted data.

### Score denominator always 150

IQ Score uses a fixed denominator of 150 (30 indicators × max 5) regardless of how many indicators are excluded. Excluded indicators contribute 0. This prevents exclusion from inflating the score.

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
