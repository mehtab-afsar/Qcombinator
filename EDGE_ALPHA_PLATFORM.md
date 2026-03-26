# Edge Alpha — Platform Deep-Dive

> The operating system for investment-ready startups. Edge Alpha turns a founder's raw idea, data, and work into a scored, investor-grade profile — backed by 9 AI advisers that actually take action.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Tech Stack](#2-tech-stack)
3. [Database Schema](#3-database-schema)
4. [Founder Journey (15 Phases)](#4-founder-journey)
5. [Q-Score — Full Deep-Dive](#5-q-score)
6. [The 9 AI Agents](#6-the-9-ai-agents)
7. [Agent System Architecture](#7-agent-system-architecture)
8. [CXO Workspace](#8-cxo-workspace)
9. [Investor Marketplace](#9-investor-marketplace)
10. [Key Features](#10-key-features)
11. [Phase 3 Real-World Integrations](#11-phase-3-integrations)
12. [API Route Map](#12-api-route-map)
13. [Authentication & Row-Level Security](#13-auth--rls)
14. [Environment Variables](#14-environment-variables)

---

## 1. Platform Overview

Edge Alpha is a **startup operating system** that gives founders three things simultaneously:

| Pillar | What it does | Primary output |
|--------|-------------|----------------|
| **Q-Score** | Algorithmically scores the startup across 6 investor-grade dimensions | A 0–100 score with grade (A+ through F) and percentile rank |
| **AI Agents** | 9 specialist advisers (CMO, CFO, CPO, CSO, etc.) that chat, build deliverables, and take real actions | 13 artifact types, real email sends, live data pulls |
| **Investor Marketplace** | Thesis-matched deal flow for investors; connection requests for founders | Introductions gated by Q-Score threshold |

### Value Proposition by User Type

**Founders:**
- Know exactly where they stand vs. the investment bar — not generic advice
- Get domain-expert guidance across GTM, finance, legal, hiring, product, and strategy
- Build the actual deliverables (playbooks, financial models, hiring plans) investors ask for
- Unlock investor access once Q-Score crosses threshold

**Investors:**
- Real-time deal flow ranked by match score, momentum, and Q-Score
- Founders are pre-diligenced — deliverables, verified metrics, Q-Score breakdown
- Custom weighting per investor (adjust dimension importance to thesis)
- Pipeline CRM built in (watching → interested → meeting → in_dd → portfolio)

---

## 2. Tech Stack

### Core Framework
- **Next.js 14** (App Router, TypeScript, React 18)
- **Supabase** — PostgreSQL database, Auth, Storage, Row-Level Security
- **Tailwind CSS** + **Framer Motion** (animations) + **Lucide React** (icons)
- **Zustand** (client state where needed)

### AI / LLM
- **OpenRouter** → model `anthropic/claude-3.5-haiku` for all LLM calls
- Fallback key support (`OPENROUTER_API_KEY_FALLBACK`)
- Free model fallback (`meta-llama/llama-3.1-8b-instruct:free`) when credits exhausted
- Non-streaming JSON path with 2-pass XML tool_call detection

### External Services
| Service | Used for |
|---------|---------|
| **Resend** | All transactional emails — investor updates, weekly digests, outreach sequences |
| **Stripe** | Live MRR/ARR pull via restricted API key (Felix agent) |
| **Hunter.io** | Domain → email lookup (Patel / Susi agent lead enrichment) |
| **Tavily** | Web research for competitive intelligence (Atlas agent) |
| **Netlify** | Landing page / site deployment via Files API (Patel / Maya agent) |

### Design Palette (used throughout — no Tailwind variables, all inline styles)
```
bg     = #F9F7F2   (warm off-white background)
surf   = #F0EDE6   (card surface)
bdr    = #E2DDD5   (border / divider)
ink    = #18160F   (primary text)
muted  = #8A867C   (secondary text / labels)
blue   = #2563EB   (primary action / GTM agents)
green  = #16A34A   (finance / ops agents)
amber  = #D97706   (warnings)
red    = #DC2626   (errors / danger)
purple = #9333EA   (product agents — Nova, Sage)
```

---

## 3. Database Schema

### 3a. Auth & Profiles

**`founder_profiles`** — One row per founder user
```
id                        UUID PK
user_id                   UUID → auth.users (UNIQUE)
full_name                 TEXT NOT NULL
startup_name              TEXT
industry                  TEXT
stage                     TEXT  (idea | mvp | launched | scaling)
subscription_tier         TEXT  (free | premium | enterprise)
onboarding_completed      BOOLEAN DEFAULT false
assessment_completed      BOOLEAN DEFAULT false
-- Extended onboarding fields (migration 20260325000002)
company_name              TEXT
website                   TEXT
founded_date              TEXT
incorporation_type        TEXT
description               TEXT
revenue_status            TEXT
funding_status            TEXT
team_size                 TEXT
founder_name              TEXT
linkedin_url              TEXT
cofounder_count           INT
years_on_problem          TEXT
prior_experience          TEXT
registration_completed    BOOLEAN DEFAULT false
profile_builder_completed BOOLEAN DEFAULT false
-- Profile Builder & other flags
startup_profile_data      JSONB DEFAULT '{}'
startup_profile_completed BOOLEAN DEFAULT false
profile_builder_draft     JSONB
-- Public portfolio
public_slug               TEXT UNIQUE
is_public                 BOOLEAN DEFAULT false
```

**`investor_profiles`** — One row per investor user
```
id                   UUID PK
user_id              UUID → auth.users
full_name            TEXT
email                TEXT
phone                TEXT
linkedin_url         TEXT
firm_name            TEXT
firm_type            TEXT  (vc | pe | angel | family-office | corporate | accelerator)
firm_size            TEXT
aum                  TEXT
website              TEXT
location             TEXT
check_sizes          TEXT[]
stages               TEXT[]
sectors              TEXT[]
geography            TEXT[]
thesis               TEXT
deal_flow_strategy   TEXT
decision_process     TEXT
monthly_deal_volume  TEXT
onboarding_completed BOOLEAN DEFAULT false
verified             BOOLEAN DEFAULT false
ai_personalization   JSONB   (match scores per founder)
```

**`demo_investors`** — Pre-seeded sample investors (no auth required)
```
id            UUID PK
name          TEXT
firm          TEXT
title         TEXT
location      TEXT
check_sizes   TEXT[]
stages        TEXT[]
sectors       TEXT[]
geography     TEXT[]
thesis        TEXT
portfolio     TEXT[]
response_rate INT DEFAULT 70
is_active     BOOLEAN DEFAULT true
```

---

### 3b. Q-Score Tables

**`qscore_assessments`** — Raw assessment submissions
```
id              UUID PK
user_id         UUID → auth.users
assessment_data JSONB NOT NULL   (all answers)
status          TEXT  (draft | submitted | scored)
submitted_at    TIMESTAMPTZ
created_at, updated_at
```

**`qscore_history`** — Score chain (one row per calculation event)
```
id                   UUID PK
user_id              UUID → auth.users
assessment_id        UUID → qscore_assessments
overall_score        INT  (0–100)
percentile           INT  (0–100)
grade                TEXT (A+ | A | B+ | B | C+ | C | D | F)
market_score         INT  (0–100)
product_score        INT  (0–100)
gtm_score            INT  (0–100)
financial_score      INT  (0–100)
team_score           INT  (0–100)
traction_score       INT  (0–100)
previous_score_id    UUID → qscore_history (self-referential, delta chain)
data_source          TEXT (registration | profile_builder | agent_completion | verified_evidence)
source_artifact_type TEXT (which artifact triggered the boost)
assessment_data      JSONB (cached full assessment for fast re-reads)
calculated_at        TIMESTAMPTZ
created_at           TIMESTAMPTZ
```

**`score_evidence`** — Proof documents attached by founders
```
id             UUID PK
user_id        UUID → auth.users
dimension      TEXT (market | product | gtm | financial | team | traction)
evidence_type  TEXT (stripe_screenshot | loi | contract | analytics | customer_email | other)
title          TEXT
description    TEXT
file_url       TEXT  (Supabase Storage URL)
data_value     TEXT  (e.g. "MRR $12,000" or "5 signed contracts")
status         TEXT  (pending | verified | rejected)
points_awarded INT
created_at, reviewed_at
```

**`qscore_knowledge_chunks`** — RAG knowledge base (51 chunks)
```
id         UUID PK
topic      TEXT   (category name)
subtopic   TEXT
content    TEXT   (the knowledge text)
created_at TIMESTAMPTZ
```

---

### 3c. Agent Tables (Shared)

**`agent_conversations`**
```
id              UUID PK
user_id         UUID → auth.users
agent_id        TEXT  (patel | susi | maya | felix | leo | harper | nova | atlas | sage)
title           TEXT
last_message_at TIMESTAMPTZ
message_count   INT DEFAULT 0
```

**`agent_messages`**
```
id              UUID PK
conversation_id UUID → agent_conversations
role            TEXT (user | assistant)
content         TEXT
created_at      TIMESTAMPTZ
```

**`agent_artifacts`** — All deliverables produced by agents
```
id              UUID PK
conversation_id UUID → agent_conversations
user_id         UUID → auth.users
agent_id        TEXT
artifact_type   TEXT  (13 types — see §6)
title           TEXT
content         JSONB  (structured artifact data)
version         INT DEFAULT 1
created_at, updated_at
```

**`agent_actions`** — Extracted to-dos from agent conversations
```
id              UUID PK
conversation_id UUID
user_id         UUID
agent_id        TEXT
action_text     TEXT
priority        TEXT (high | medium | low)
status          TEXT (pending | in_progress | done)
created_at, completed_at
```

**`agent_activity`** — Audit log of all agent events
```
id          UUID PK
user_id     UUID
agent_id    TEXT
action_type TEXT
description TEXT  (human-readable)
metadata    JSONB
created_at  TIMESTAMPTZ
```
Index: `(user_id, created_at DESC)` — feeds the activity feed and notification centre.

**`pending_actions`** — Approval queue for high-stakes agent actions
```
id          UUID PK
user_id     UUID
agent_id    TEXT
action_type TEXT
title       TEXT
summary     TEXT
payload     JSONB
status      TEXT (pending | approved | rejected | executing | done | failed)
created_at, reviewed_at, executed_at
```

---

### 3d. Agent-Specific Tables

**`deals`** (Susi — lightweight CRM)
```
id               UUID PK
user_id          UUID
company          TEXT
contact_name     TEXT
contact_email    TEXT
contact_title    TEXT
stage            TEXT (lead | qualified | proposal | negotiating | won | lost)
value            NUMERIC
notes            TEXT
next_action      TEXT
next_action_date DATE
source           TEXT (manual | susi_suggested | proposal_sent)
win_reason, loss_reason TEXT
```

**`outreach_sends`** (Patel — email tracking)
```
id               UUID PK
user_id, artifact_id UUID
sequence_name    TEXT
contact_email, contact_name, contact_company, contact_title TEXT
step_index       INT
subject, body_html TEXT
sent_at, opened_at, clicked_at, replied_at TIMESTAMPTZ
resend_id        TEXT
status           TEXT (sent | opened | clicked | replied | bounced)
```

**`investor_updates`** (Felix — sent updates)
```
id               UUID PK
user_id          UUID
subject          TEXT
body_html        TEXT
metrics_snapshot JSONB
recipients       TEXT[]
sent_at          TIMESTAMPTZ
resend_id        TEXT
```

**`survey_responses`** (Nova — PMF survey)
```
id               UUID PK
survey_id        TEXT
user_id          UUID  (the founder who owns this survey)
respondent_email TEXT
answers          JSONB
submitted_at     TIMESTAMPTZ
```
Public INSERT (anyone can respond). RLS SELECT limited to survey owner.

**`applications`** (Harper — job applications)
```
id             UUID PK
user_id        UUID  (hiring founder)
role_slug      TEXT
role_title     TEXT
applicant_name, applicant_email TEXT
resume_url     TEXT
resume_text    TEXT
score          INT (0–100, LLM-evaluated)
score_notes    TEXT
status         TEXT (new | reviewed | shortlisted | rejected | offered)
submitted_at   TIMESTAMPTZ
```
Public INSERT (anyone can apply to the public apply page).

**`tracked_competitors`** (Atlas)
```
id              UUID PK
user_id         UUID
name            TEXT
url             TEXT
last_scraped_at TIMESTAMPTZ
last_price_data JSONB
```

**`investor_contacts`** (Sage — CRM for investor outreach)
```
id       UUID PK
user_id  UUID
name, email, firm, notes TEXT
```

**`legal_documents`** (Leo)
```
id                UUID PK
user_id           UUID
doc_type          TEXT (nda | safe | offer_letter | term_sheet)
counterparty_name, counterparty_email TEXT
content_html      TEXT
status            TEXT (draft | sent | signed | expired)
sent_at, signed_at TIMESTAMPTZ
```

**`proposals`** (Susi — sales proposals)
```
id                  UUID PK
user_id, artifact_id UUID
prospect_name, prospect_email, prospect_company, prospect_title TEXT
deal_value          NUMERIC
use_case, subject   TEXT
proposal_html       TEXT
sent_at, opened_at, replied_at TIMESTAMPTZ
resend_id           TEXT
status              TEXT (sent | opened | replied | won | lost)
```

---

### 3e. Investor & Matching Tables

**`connection_requests`**
```
id               UUID PK
founder_id       UUID → auth.users
demo_investor_id UUID → demo_investors (nullable)
investor_id      UUID → auth.users (nullable)
personal_message TEXT
founder_qscore   INT
status           TEXT (pending | viewed | accepted | declined | meeting_scheduled)
created_at, updated_at TIMESTAMPTZ
UNIQUE (founder_id, demo_investor_id)
UNIQUE (founder_id, investor_id)
```

**`messages`** — 2-way messaging after connection accepted
```
id                    UUID PK
connection_request_id UUID → connection_requests
sender_id             UUID → auth.users
recipient_id          UUID → auth.users
body                  TEXT (1–4000 chars)
read_at               TIMESTAMPTZ
created_at            TIMESTAMPTZ
```
RLS: only sender and recipient can view.

**`investor_pipeline`** — Investor's personal CRM
```
id               UUID PK
investor_user_id UUID → auth.users
founder_user_id  UUID → auth.users
stage            TEXT (watching | interested | meeting | in_dd | portfolio | passed)
notes            TEXT
UNIQUE (investor_user_id, founder_user_id)
```

---

### 3f. Profile Builder

**`profile_builder_data`** — One row per user per section (1–5)
```
id               UUID PK
user_id          UUID → auth.users
section          INT (1–5)
raw_conversation TEXT
uploaded_documents JSONB
extracted_fields JSONB
confidence_map   JSONB
completion_score INT (0–100)
completed_at     TIMESTAMPTZ
UNIQUE (user_id, section)
```

**`profile_builder_uploads`**
```
id            UUID PK
user_id       UUID
section       INT
filename, file_type TEXT
storage_path  TEXT
extracted_text TEXT
parsed_data   JSONB
confidence    FLOAT (0–1)
uploaded_at   TIMESTAMPTZ
```

---

### 3g. Platform Support Tables

**`subscription_usage`** — Free-tier caps
```
id          UUID PK
user_id     UUID
feature     TEXT (agent_chat | investor_connection | qscore_recalc | workshop)
usage_count INT DEFAULT 0
limit_count INT
reset_at    TIMESTAMPTZ (monthly reset)
```

**`deployed_sites`** — Netlify deployments
```
id              UUID PK
user_id         UUID
artifact_id     UUID
site_name       TEXT
netlify_site_id TEXT
url             TEXT
deploy_type     TEXT (landing_page | website | blog)
deployed_at     TIMESTAMPTZ
```

**`portfolio_views`** — Public portfolio page view tracking
```
id          UUID PK
founder_id  UUID
viewer_ip   TEXT
referrer    TEXT
viewed_at   TIMESTAMPTZ
```

**`analytics_events`** — Generic event tracking
```
id         UUID PK
user_id    UUID
event_type TEXT
event_data JSONB
created_at TIMESTAMPTZ
```

---

## 4. Founder Journey

### Phase 1 — Landing Page (`/`)
Marketing page with animated agent demo, Q-Score explainer, investor social proof, and pricing. CTA routes to `/founder/onboarding`.

### Phase 2 — Onboarding (`/founder/onboarding`)
3-page multi-step form:
- **Page 1 — Company**: name, industry (12 options with icons), one-liner (100 chars), website
- **Page 2 — Journey**: stage (5 options), revenue status (4 options), funding status (5 pills), team size (5 options)
- **Page 3 — You + Account**: name, LinkedIn, years on problem (4 options), prior experience (4 options), email + password

On submit → `POST /api/auth/signup` (admin client, bypasses email confirm) → auto signs in → redirects to `/founder/profile-builder`.

### Phase 3 — Profile Builder (`/founder/profile-builder`)
5-section adaptive chat questionnaire powered by Claude AI:

| Section | Focus | Key fields extracted |
|---------|-------|----------------------|
| 1 | Market Validation | Customer commitment, conversation count, paying customers, LOIs |
| 2 | Market Potential | TAM, urgency, competitive context, target customer definition |
| 3 | IP & Defensibility | Patents, technical barriers, proprietary advantages |
| 4 | Founder & Team | Domain expertise, co-founder presence, resilience stories |
| 5 | Financials & Impact | Revenue, burn rate, runway, ESG/mission signals |

Features:
- Document upload (pitch decks, financial models) → text extraction
- Confidence scoring per extracted field
- Adaptive follow-up questions based on missing data
- Draft auto-save between sessions (profile_builder_data table)
- On submit → full Q-Score calculated → redirects to `/founder/dashboard`

### Phase 4 — Dashboard (`/founder/dashboard`)
Central command for the founder:
- **Q-Score ring** with grade, percentile rank, trajectory chart
- **Live metrics strip**: MRR, Burn, Runway, Customers, LTV:CAC (from Felix artifact or Stripe)
- **Dimension breakdown**: 6 score bars with week-over-week delta
- **Score Challenges**: 3 lowest-scoring dimensions with "Fix it →" CTA linking to specific agent
- **Agent recommendations**: which agents to use next based on score gaps
- **Activity card**: recent agent events with "Full log →" link
- **Staleness banner**: shown after 60 days (amber), 90 days (gold)

### Phase 5 — Agents Hub (`/founder/agents`)
Grid of all 9 agents with:
- Progress tracker (deliverables done / total)
- Recommendations based on Q-Score dimensions
- "Start" / "Continue" CTA per agent

### Phase 6 — Individual Agent Pages (`/founder/agents/[agentId]`)
Full chat interface with:
- Multi-turn conversation with the agent's AI persona
- 3–4 quick-start templates per agent
- Artifact generation (triggers tool_call, produces one of 13 artifact types)
- Artifact version history with side-by-side comparison
- Revise mode: select text → agent rewrites with context
- Share modal: Copy text / Export PDF / Copy Markdown / Email co-founder
- Agent-specific executions (see §11)
- Q-Score boost toast on artifact completion (+X pts, 4s timeout)
- `?challenge=<dimension>` URL param → yellow banner explaining score challenge
- `?artifact=<uuid>` URL param → loads specific artifact from DB

### Phase 7 — Workspace (`/founder/workspace`)
Deliverables portfolio view:
- All artifacts grouped by agent
- Expandable version history per artifact type
- "View" links pass `?artifact=<uuid>` to agent page (loads exact version)
- CSV export (financial_summary only)

### Phase 8 — Improve Q-Score (`/founder/improve-qscore`)
Four sub-sections:
1. **"What gets me to 80?"** — AI-generated action list (cached in `ai_actions` column; lazy-loaded)
2. **Score Simulator** — Adjust dimension scores, pick sector → see recalculated overall in real time
3. **Unlock Challenges** — 12 artifact type challenges with completion badges and point values
4. **Evidence Form** — Upload proof (stripe screenshot, LOI, contract) → `score_evidence` table → admin verification flow
5. **Peer Benchmarks** — Percentile rank per dimension vs cohort

### Phase 9 — Investor Matching (`/founder/matching`)
- Fetches all demo investors + onboarded investors
- Computes match score per investor (see §9)
- Sorted by match score descending
- "Connect" button → modal for personal message → `POST /api/connections`
- Status badges per investor: Connect / Request Pending / Meeting Scheduled / Passed
- Q-Score gate: below 65 → locked banner

### Phase 10 — Pitch Deck Generator (`/founder/pitch-deck`)
- Fetches latest 5 artifact types: gtm_playbook, brand_messaging, financial_summary, competitive_matrix, hiring_plan
- Auto-builds 10-slide deck with `buildSlides(artifacts)`:
  - Problem, Solution, Market Size, Product, GTM, Competitive Landscape, Traction, Team, Financial Ask, Vision
- `dataConfidence` per slide: "high" / "medium" / "low" / "none"
- Left sidebar: slide nav with confidence dots
- Right: dark slide preview with gradient backgrounds
- Keyboard navigation (← →)
- Company name editable
- "Download HTML" → self-contained full-screen presentation
- Agent CTA shown when slide has no supporting artifact data

### Phase 11 — Metrics Dashboard (`/founder/metrics`)
- KPIs: MRR, ARR, Customers, Runway, LTV/CAC, unit economics, burn multiple
- Health banners: low runway alerts, negative CAC payback warnings
- "Update metrics" → inline form (10 fields) → saves as `financial_summary` artifact under Felix
- Stripe live connect: restricted API key → pulls real MRR/ARR

### Phase 12 — Portfolio (`/founder/portfolio`)
Investor-facing view of the founder's profile:
- Q-Score ring with grade
- Deliverables grid (artifact cards by type)
- Verified proof section (score_evidence with status='verified')
- PDF export

### Phase 13 — Public Portfolio (`/p/[userId]`)
No-auth investor-accessible page:
- Fetches `founder_profiles WHERE public_slug = X AND is_public = true`
- Shows Q-Score breakdown, agent deliverables (titles only — no content exposed)
- Tracks views in `portfolio_views` (viewer_ip, referrer, viewed_at)

### Phase 14 — Activity Feed & Notifications (`/founder/activity`)
- All `agent_activity` events grouped by date
- "Send Digest" → `POST /api/digest/weekly` → HTML email via Resend (last 7 days by agent, Q-Score delta)
- Notification centre: bell icon in FounderSidebar, slide-out panel, unread count via localStorage (`ea_read_notifs_v1`)

### Phase 15 — Messages (`/founder/messages`)
- Conversations with investors (after connection accepted)
- Pending connections shown as conversations with a "request sent" system message
- Real 2-way messaging in `messages` table, scoped to `connection_request_id`

---

## 5. Q-Score

The Q-Score is a 0–100 algorithmic investment readiness score across 6 dimensions, calibrated by sector, enriched by RAG semantic evaluation, and hardened by bluff detection.

### 5a. Six Dimensions & Default Weights

| Dimension | Default Weight | What it measures |
|-----------|---------------|-----------------|
| **Market** | 20% | TAM size, conversion realism, LTV:CAC, urgency signals |
| **Product** | 18% | Customer validation depth, build velocity, learning quality |
| **Go-to-Market** | 17% | ICP clarity, channels tested, messaging effectiveness, CAC efficiency |
| **Financial** | 18% | Gross margin, ARR/MRR, runway, burn control |
| **Team** | 15% | Domain expertise, founder-market fit, co-founder presence, resilience |
| **Traction** | 12% | Customer conversations, commitment levels, revenue, growth trajectory |

Weights are stored in the `qscore_dimension_weights` DB table (1h cache). Hardcoded `PRD_WEIGHTS` in `features/qscore/types/qscore.types.ts` are the fallback only.

### 5b. Eight Sector Weight Matrices

Different business models have different investment drivers. Edge Alpha re-weights all 6 dimensions based on the founder's industry:

| Sector | Market | Product | GTM | Financial | Team | Traction |
|--------|--------|---------|-----|-----------|------|----------|
| B2B SaaS | 20% | 18% | 20% | 18% | 14% | 10% |
| B2C SaaS | 16% | 22% | 16% | 14% | 12% | 20% |
| Marketplace | 18% | 14% | 16% | 20% | 12% | 20% |
| Biotech / DeepTech | 26% | 22% | 12% | 16% | 20% | 4% |
| Consumer / CPG | 16% | 18% | 20% | 18% | 10% | 18% |
| FinTech | 22% | 18% | 14% | 24% | 14% | 8% |
| Hardware / IoT | 20% | 20% | 14% | 22% | 18% | 6% |
| E-commerce / D2C | 16% | 14% | 18% | 24% | 10% | 18% |

**Example:** A Biotech startup with team score of 70 contributes `70 × 20% = 14 pts` to overall. A B2B SaaS startup with the same team score contributes `70 × 14% = 9.8 pts`. Domain expertise matters more in deep tech.

### 5c. Per-Dimension Scoring Rubrics

#### Market Dimension (0–100 pts)
| Sub-score | Weight | Measurement | Thresholds |
|-----------|--------|-------------|------------|
| TAM Size | 40 pts | targetCustomers × lifetimeValue | ≥$1B: 40 \| $100M–1B: 35 \| $10M–100M: 28 \| $1M–10M: 20 \| <$1M: 10 |
| Conversion Rate Realism | 30 pts | Reported conversion vs 0.5–5% realistic range | In range: 30 \| Slightly off: 20 \| Way off: 5 |
| Daily Activity Rate | 20 pts | dailyActivity as % of targetCustomers | 10–50%: 20 \| 5–70%: 15 \| Other: 5 |
| LTV:CAC Ratio | 10 pts | lifetimeValue ÷ costPerAcquisition | ≥3:1: 10 \| 2:1: 7 \| 1:1: 4 \| <1: 0 |

#### Product Dimension (0–100 pts)
| Sub-score | Weight | Measurement |
|-----------|--------|-------------|
| Customer Validation | 40 pts | Conversation count (20 pts, ≥50→20 / ≥20→16 / ≥10→12 / ≥5→8 / <5→4) + evidence quality RAG eval (20 pts) |
| Learning Velocity | 30 pts | Build cycle time (10 pts: ≤7d→10 / ≤14d→8 / ≤30d→6) + learning completeness RAG eval (20 pts) |
| Failed Assumptions | 30 pts | RAG evaluation of how deeply the founder tested and discarded wrong beliefs |

#### Go-to-Market Dimension (0–100 pts)
| Sub-score | Weight | Measurement |
|-----------|--------|-------------|
| ICP Clarity | 35 pts | RAG semantic score of ICP description specificity |
| Channel Testing | 35 pts | Channels tried (≥3→15 / ≥2→12 / ≥1→8 / 0→3) + results documented (10 pts) + CAC efficiency (10 pts) |
| Messaging Effectiveness | 20 pts | RAG evaluation of messaging results quality |

#### Financial Dimension (0–100 pts)
| Sub-score | Weight | Measurement |
|-----------|--------|-------------|
| Gross Margin | 20 pts | (dealSize - COGS) / dealSize | ≥80%: 20 \| ≥70%: 17 \| ≥60%: 14 \| ≥50%: 10 \| ≥40%: 6 \| <40%: 2 |
| Revenue Scale (ARR) | 20 pts | ≥$1M: 20 \| $500K–1M: 17 \| $100K–500K: 14 \| $50K–100K: 10 \| $10K–50K: 6 \| >0: 3 |
| Runway | 30 pts | Months of cash: ≥18m: 30 \| ≥12m: 25 \| ≥9m: 20 \| ≥6m: 15 \| ≥3m: 10 \| <3m: 5 |
| Burn Control | 30 pts | monthlyBurn trajectory and efficiency signals |

#### Team Dimension (0–100 pts)
| Sub-score | Weight | Measurement |
|-----------|--------|-------------|
| Domain Expertise | 40 pts | Problem story RAG eval (20 pts) + advantage explanation RAG eval (20 pts) |
| Team Completeness | 30 pts | Co-founder presence, functional coverage, cohesion signals |
| Resilience | 30 pts | Hardship story depth — concrete evidence of overcoming adversity |

#### Traction Dimension (0–100 pts)
| Sub-score | Weight | Measurement |
|-----------|--------|-------------|
| Customer Conversations | 20 pts | ≥100: 20 \| ≥50: 18 \| ≥30: 15 \| ≥20: 12 \| ≥10: 8 \| ≥5: 4 \| 0: 0 |
| Customer Commitment | 20 pts | Paying + detail: 20 \| Paying: 17 \| LOI + detail: 15 \| LOI: 12 \| Waitlist + detail: 10 |
| Revenue (ARR) | 30 pts | Same scale as Financial ARR |
| Consistency | 30 pts | Growth trajectory and viral coefficient indicators |

### 5d. Data Quality & Confidence System

Not all data is equal. The scoring system applies multipliers based on how data was sourced:

| Source | Multiplier | When applied |
|--------|-----------|--------------|
| Stripe-verified | 1.00× (full weight) | Metric pulled directly via Stripe API |
| Document-backed | 0.85× | Supported by uploaded pitch deck / financial model |
| Self-reported | 0.55× | Entered by founder with no verification |

**Confidence tiers** (based on how many fields are populated):
- **None** (0 fields): score → 0
- **Low** (<30% fields): blend raw score toward conservative baseline of 30
- **Medium** (30–70% fields): use raw score as-is
- **High** (>70% fields): full trust, no adjustment

**Missing dimension penalty:** If a dimension has no data, its weight is redistributed to other active dimensions, and a 5% penalty per missing dimension is applied to the overall.

### 5e. RAG Scoring Layer

A Retrieval-Augmented Generation pipeline adds semantic credibility to the purely quantitative scores.

**51 knowledge chunks** in `qscore_knowledge_chunks` across 7 categories:

| Category | # Chunks | What it contains |
|----------|----------|-----------------|
| `market_benchmark` | 8 | Sector-specific conversion rates, TAM sizing norms, LTV:CAC benchmarks |
| `gtm_playbook` | 10 | Channel strategies by sector, messaging frameworks, ICP definition standards |
| `team_signal` | 8 | Founder-market fit patterns, advisor value signals, team composition benchmarks |
| `traction_milestone` | 8 | Growth curves, viral coefficients, retention benchmarks by stage |
| `scoring_rubric` | 5 | What excellent / good / fair / poor looks like per dimension |
| `bluff_pattern` | 6 | Red flags for fabricated or AI-generated claims |
| `vc_framework` | 6 | YC/investor perspective — defensibility, thesis alignment, diligence signals |

**Three-layer pipeline:**
1. **Rubric Scorer** — LLM evaluates 8 text fields (problemStory, advantageExplanation, customerQuote, customerSurprise, failedBelief, icpDescription, messagingResults, hardshipStory) on a 0–100 scale
2. **Evidence Cross-Reference** — Searches founder's own artifacts via pgvector against assessment claims → generates corroboration/conflict/unverified verdict per claim
3. **Benchmark Validation** — Classifies market claims as `realistic | optimistic | unrealistic` against knowledge base benchmarks

Every RAG run is logged to `rag_execution_logs` (scoring_method, rag_confidence, latency_ms, corroborations, conflicts).

### 5f. Bluff Detection & Anti-Gaming

Nine signal types are scanned on every calculation:

| Signal | Detection method | Penalty |
|--------|-----------------|---------|
| Round numbers | 3+ perfectly round metrics (e.g. exactly $1M, 10K customers) | Medium −5 pts |
| Impossible LTV:CAC | Ratio >20:1 flagged as unrealistic | High −15 pts |
| Generic AI language | Phrases like "leveraging synergies", "paradigm shift", "disrupting the X space" | Medium −5 pts |
| Contradictory claims | ARR stated differently in two separate fields | High −15 pts |
| Evidence conflicts | RAG layer detects narrative vs benchmark divergence | Medium −5 pts |
| Fabricated customers | Named customers that don't appear in any uploaded documents | Medium −5 pts |
| Impossible growth | Week-1 to Week-4 growth curves that defy physics | High −15 pts |
| Copied boilerplate | Identical phrasing to known pitch deck templates | Medium −5 pts |
| Missing specifics | All answers generic with no names, dates, or numbers | Medium −5 pts |

Total bluff penalty capped at −30% of the raw score. Never reduces below 0.

### 5g. Grade Thresholds

| Grade | Score Range | Investor signal |
|-------|-------------|-----------------|
| **A+** | 95–100 | Exceptional — top decile, immediately fundable |
| **A** | 90–94 | Excellent — strong candidate, minor gaps |
| **B+** | 85–89 | Very good — fundable with narrative work |
| **B** | 80–84 | Good — ready for angel / pre-seed conversations |
| **C+** | 75–79 | Above average — improve 1–2 dimensions |
| **C** | 70–74 | Average — meaningful work needed |
| **D** | 60–69 | Below average — significant gaps |
| **F** | 0–59 | Not ready — foundational issues to resolve first |

### 5h. Agent Artifact → Q-Score Boost

Completing an agent deliverable fires a one-time dimension boost. The boost is idempotent (one boost per artifact type per user, ever).

| Artifact | Agent | Dimension | Points | Notes |
|----------|-------|-----------|--------|-------|
| gtm_playbook | Patel | GTM | +6 | Highest GTM boost |
| financial_summary | Felix | Financial | +6 | Highest Financial boost |
| competitive_matrix | Atlas | Market | +5 | |
| icp_document | Patel | GTM | +5 | |
| hiring_plan | Harper | Team | +5 | |
| pmf_survey | Nova | Product | +5 | |
| outreach_sequence | Patel | Traction | +4 | |
| battle_card | Atlas/Patel | Market | +4 | |
| sales_script | Susi | Traction | +4 | |
| brand_messaging | Maya | GTM | +4 | |
| strategic_plan | Sage | Product | +4 | |
| legal_checklist | Leo | Financial | +3 | |
| interview_notes | Nova | Product | +3 | |

**Quality multiplier** (applied to all boosts):
- `full` quality → 1.0× (all points)
- `partial` quality → 0.6× (60% of points)
- `minimal` quality → 0.3× (30% of points, min 1 pt)

**Max possible from agents:** 58 pts across all 13 artifact types (before multipliers).

### 5i. Ten-Step Calculation Pipeline

`POST /api/qscore/calculate` runs this exact flow:

1. **Load weights + thresholds** from DB for the founder's sector (1h cache). Fall back to hardcoded TypeScript constants if DB unreachable.
2. **Build `dataSourceMap`** — mark each input field as `stripe` (1.0×), `document` (0.85×), or `self_reported` (0.55×).
3. **RAG semantic evaluation** — rubric scoring (LLM call) + evidence cross-reference (pgvector) + benchmark validation → `ragConfidence` float.
4. **Run 6 dimension calculators** — each applies the DB threshold tiers (TAM bands, conversion bands, etc.) to produce a raw 0–100 per dimension.
5. **Apply confidence multiplier** — missing dimensions re-normalized, partial data blended toward baseline 30.
6. **Apply bluff detection penalty** — scan 9 signal types, deduct up to −30% total.
7. **Weighted overall** — `Σ(dimScore × sectorWeight)` → rounded, capped at 100.
8. **Percentile** — Postgres RPC `compute_qscore_percentile` computes rank vs all users.
9. **Insert `qscore_history` row** — new row with `previous_score_id` linking to prior row. Delta chain preserved forever.
10. **Fire-and-forget side effects** — signal strength, integrity index, visibility gating, metric snapshot, momentum score, behavioural score.

### 5j. Score Evidence System

The `score_evidence` table allows founders to attach proof:

**Evidence types:** `stripe_screenshot`, `loi`, `contract`, `analytics`, `customer_email`, `other`

**Verification flow:**
1. Founder uploads document/screenshot on the Improve Q-Score page
2. Row created with `status='pending'`, `points_awarded=0`
3. Admin reviews the proof
4. If legitimate: `status='verified'`, `points_awarded` set (0–20 pts)
5. If fake/unclear: `status='rejected'`

Verified evidence is displayed on the investor portfolio page ("Verified Proof" section). Points are intended to be read by the scoring engine as additive dimension boosts.

### 5k. Improvement Hub

`/founder/improve-qscore` has five sections:

| Section | What it shows |
|---------|---------------|
| **"What gets me to 80?"** | AI-generated prioritised action list. Cached in `qscore_history.ai_actions` JSONB column (lazy-generated on first view, then served from cache) |
| **Score Simulator** | Interactive — adjust dimension sliders, pick sector → live overall recalculation. Uses sector weights. Shows what combination unlocks the next grade |
| **Unlock Challenges** | All 13 artifact types displayed as challenge cards with completion status (checked if `qscore_history` has a row with `source_artifact_type = X`), point value, and "Start with [Agent] →" link |
| **Evidence Form** | Upload proof → creates `score_evidence` row |
| **Peer Benchmarks** | `/api/qscore/benchmarks` computes per-dimension percentile vs all users with Q-Scores |

---

## 6. The 9 AI Agents

Each agent is a specialist AI adviser with a dedicated persona, system prompt, deliverable types, and real-world action capabilities.

---

### Patel — Chief Marketing Officer
**Primary dimension:** Go-to-Market | **Colour:** Blue (#2563EB)

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| ICP Document | GTM +5 pts |
| Outreach Sequence | Traction +4 pts |
| Battle Card | Market +4 pts |
| GTM Playbook | GTM +6 pts |

**Total possible:** +19 pts across GTM + Traction + Market

**Data tools:**
- `lead_enrich` — Hunter.io domain search → returns contact emails for a company

**Phase 3 actions:**
- "Send in Gmail" per email step → pre-composed Gmail draft URL
- "Deploy Landing Page" → Netlify Files API deploy of generated HTML
- "🔔 Alert: [competitor]" → Google Alerts URL per competitor

**Cross-agent context injected:**
- High relevance: Atlas (competitive data), Maya (brand voice)
- Medium relevance: Felix (pricing/unit economics), Susi (sales handoff)

**Memory window:** 3 own artifacts, 5 other agents' artifacts, 10 activity events

---

### Susi — Chief Revenue Officer
**Primary dimension:** Traction | **Colour:** Blue

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Sales Script (discovery, objections, pricing, closing variants) | Traction +4 pts |

**Data tools:**
- `lead_enrich` — Hunter.io lead enrichment
- `create_deal` — inserts row into `deals` table

**Phase 3 actions:**
- Deal reminders banner (yellow) — shows overdue chips for deals with `next_action_date` within 3 days
- "Follow Up" inject button → pushes followup prompt into chat
- `POST /api/agents/susi/proposal` + `/api/proposal/send` — sends HTML proposal via Resend

**Cross-agent context:** High from Patel (ICP), Atlas (competitive); Medium from Felix (pricing)

**Memory window:** 2 own, 4 other, 10 events

---

### Maya — Brand Director
**Primary dimension:** Go-to-Market | **Colour:** Blue

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Brand Messaging (positioning, frameworks, investor narrative, tagline) | GTM +4 pts |

**Phase 3 actions:**
- "Write Post" → generates brand-voice blog post → download as HTML
- "Download Templates" → downloads HTML with 3 SVG social templates (Instagram 1080×1080, Twitter 1200×628, LinkedIn 1584×396)
- "Deploy Landing Page" → Netlify deployment (same as Patel)

**Cross-agent context:** High from Patel; Medium from Atlas, Nova

**Memory window:** 2 own, 3 other, 8 events

---

### Felix — Chief Financial Officer
**Primary dimension:** Financial | **Colour:** Green (#16A34A)

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Financial Summary (1-pager, unit economics, 12-month MRR projection, fundraising calcs) | Financial +6 pts |

**Data tools:**
- `fetch_stripe_metrics` — calls Stripe `/v1/charges` with restricted API key → derives live MRR/ARR

**Phase 3 actions:**
- "Connect Stripe" → modal for restricted key → stores in session → pulls live MRR/ARR
- "Send Investor Update" → YC-style update email via `POST /api/agents/felix/investor-update` → Resend
- "Download CSV" → financial model with 12-month MRR projection formulas (Google Sheets compatible)

**Cross-agent context:** High from Sage; Medium from Patel, Nova, Susi

**Memory window:** 2 own, 4 other, 8 events

---

### Leo — General Counsel
**Primary dimension:** Financial | **Colour:** Green

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Legal Checklist (incorporation, fundraising, IP assignment, compliance) | Financial +3 pts |

**Phase 3 actions:**
- "Start on Clerky" → copies incorporation details to clipboard + opens clerky.com
- "Start on Stripe Atlas" → copies details + opens atlas.stripe.com
- "Generate NDA" → `POST /api/agents/leo/nda` → full HTML NDA download

**Cross-agent context:** Medium from Harper (equity/hiring), Felix (fundraising)

**Memory window:** 2 own, 2 other, 5 events

---

### Harper — Chief People Officer
**Primary dimension:** Team | **Colour:** Green

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Hiring Plan (first 5 hires, org roadmap, compensation benchmarks, JDs) | Team +5 pts |

**Phase 3 actions:**
- "Post on Wellfound" → copies JD to clipboard + opens wellfound.com/jobs/new
- **Applications inbox** → loads from `GET /api/agents/harper/apply`, shows LLM score (0–100) + notes per candidate
- Public apply page: `/apply/[userId]/[roleSlug]` → `POST /api/agents/harper/apply` → LLM resume screening

**Cross-agent context:** High from Patel; Medium from Atlas, Felix

**Memory window:** 2 own, 3 other, 8 events

---

### Nova — Chief Product Officer
**Primary dimension:** Product | **Colour:** Purple (#9333EA)

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| PMF Survey (Sean Ellis test, customer interview script, experiment tracker) | Product +5 pts |
| Interview Notes (analyzed customer interviews) | Product +3 pts |

**Phase 3 actions:**
- "Host Survey" → `POST /api/survey` → creates survey row → hosted at `/s/[surveyId]`
- "Download Survey HTML" → standalone HTML survey with localStorage response saving
- Survey results viewable at `GET /api/survey/results`

**Renderers:**
- `PMFSurveyRenderer` (imports `InterviewNotesAnalyzer` + `FakeDoorSection`)
- `InterviewNotesAnalyzer` — displays interview transcript analysis with themes, quotes, signals
- `FakeDoorSection` — fake-door test result display

**Cross-agent context:** High from Patel, Atlas; Medium from Susi, Sage

**Memory window:** 3 own, 4 other, 10 events

---

### Atlas — Chief Strategy Officer (Competitive Intelligence)
**Primary dimension:** Market | **Colour:** Green (#059669)

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Competitive Matrix (feature comparison, positioning, pricing) | Market +5 pts |
| Battle Card (win/loss, objection handling, competitive positioning) | Market +4 pts |

**Data tools:**
- `web_research` — Tavily search API + second LLM pass to synthesize findings. Live data injected for competitive_matrix deliverable.

**Phase 3 actions:**
- "🔔 Alert: [name]" chips → Google Alerts URL per competitor
- `POST /api/agents/atlas/track` → creates `tracked_competitors` row

**Cross-agent context:** High from Patel, Nova; Medium from Sage, Susi

**Memory window:** 3 own, 4 other, 10 events

**Note:** Atlas has the largest real-world data footprint — Tavily research is injected directly into the system prompt before generating battle cards and competitive matrices.

---

### Sage — CEO Adviser (Strategic Planning)
**Primary dimension:** Market + Product | **Colour:** Purple (#7C3AED)

**Deliverables:**
| Artifact | Q-Score Boost |
|----------|--------------|
| Strategic Plan (1-pager, quarterly OKRs, 12-month roadmap) | Product +4 pts |

**Phase 3 actions:**
- "Export to Linear / Notion" → copies OKRs as markdown + opens linear.app/new
- "Send Investor Update" → `POST /api/agents/sage/investor-update` → Resend email

**Cross-agent context:** High relevance from **ALL 8 other agents** — Sage is the synthesizer. It has the widest context window.

**Memory window:** 2 own artifacts, **8 other agents' artifacts**, 15 activity events (widest of all agents)

Sage sees everything every other agent has built and synthesizes it into strategic coherence.

---

### Agent Comparison Table

| Agent | Role | Primary Dim | Max Pts | Data Tools | Phase 3 Actions |
|-------|------|-------------|---------|-----------|----------------|
| Patel | CMO | GTM | +19 | Hunter.io | Netlify deploy, Gmail, Google Alerts |
| Susi | CRO | Traction | +4 | Hunter.io, CRM | Proposals, deal reminders |
| Maya | Brand | GTM | +4 | — | Blog post, social templates, Netlify |
| Felix | CFO | Financial | +6 | Stripe | Investor update email, CSV export |
| Leo | Legal | Financial | +3 | — | NDA generator, Clerky, Stripe Atlas |
| Harper | CPO (People) | Team | +5 | — | Wellfound post, resume screener, apply page |
| Nova | CPO (Product) | Product | +8 | — | Hosted PMF survey, interview analysis |
| Atlas | CSO | Market | +9 | Tavily | Competitor tracking, Google Alerts |
| Sage | CEO Advisor | Market+Product | +4 | — | Investor update, Linear export |

---

## 7. Agent System Architecture

### Chat API (`/api/agents/chat/route.ts`)

The main agent chat endpoint handles all 9 agents through a single route with agent-specific branching.

**Mode:** Non-streaming JSON. `useStream = false`. Response is one JSON object.

**Tool call detection:** 2-pass XML detection. First pass looks for `<tool_call>` in the LLM response. If found, parses the XML and executes the tool. Second pass processes any remaining content.

**16 tool types:**
- 13 artifact types: `icp_document`, `outreach_sequence`, `battle_card`, `gtm_playbook`, `sales_script`, `brand_messaging`, `financial_summary`, `legal_checklist`, `hiring_plan`, `pmf_survey`, `interview_notes`, `competitive_matrix`, `strategic_plan`
- 4 data tools: `lead_enrich` (Hunter.io), `web_research` (Tavily + LLM), `create_deal` (CRM insert), `competitive_matrix` (Atlas's live research)

### Context Injection

Every request to `/api/agents/chat` injects two blocks into the system prompt:

```
## MEMORY — What you built together
[Up to N of this agent's own artifacts, formatted as text]

## FOUNDER CONTEXT — Other advisers built these
[Up to M artifacts from other agents, formatted as text]
```

Plus recent `agent_activity` events as a narrative timeline.

### System Prompts

One system prompt per agent, stored in `features/agents/{agent}/prompts/system-prompt.ts`. Each prompt includes:
- Agent persona and role definition
- `## DELIVERABLE CAPABILITIES` section with exact `<tool_call>` XML format
- Instructions for when to produce deliverables vs. when to just advise

### Artifact Storage

All artifacts stored in `agent_artifacts` table:
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "agent_id": "patel",
  "artifact_type": "gtm_playbook",
  "title": "Q1 GTM Playbook — Acme Inc.",
  "content": { /* structured JSONB per artifact type */ },
  "version": 3,
  "created_at": "2026-03-26T..."
}
```

### Quick Generate (`/api/agents/generate`)

Two-pass generation for the "Quick Generate" modal (5 questions → synthetic conversation → artifact):
1. **Extract context** from answers → build synthetic conversation
2. **Generate artifact** from conversation → save to `agent_artifacts`
3. Auto-fire `applyAgentScoreSignal()` → Q-Score boost
4. Auto-create `score_evidence` row (type='agent_artifact', status='verified')

### Q-Score Signal (`features/qscore/services/agent-signal.ts`)

`applyAgentScoreSignal(supabase, userId, artifactType, quality)`:
1. Idempotency: check if `qscore_history WHERE source_artifact_type = X` exists for user
2. Fetch latest score row as base
3. Apply quality multiplier: `adjustedPoints = round(basePoints × multiplier)`
4. Clamp: `newDimScore = min(100, currentDimScore + adjustedPoints)`
5. Recalculate overall with PRD_WEIGHTS (sector weights not applied — known limitation)
6. Insert new `qscore_history` row with `data_source='agent_completion'`

---

## 8. CXO Workspace

The CXO workspace is a modernised interface that presents all 9 agents as a unified C-suite team.

### Hub (`/founder/cxo`)
- 9-agent grid rendered by `CXOGrid` component
- Each card: agent colour, role name, deliverable count, latest artifact title, dimension score challenge indicator
- Click → navigates to `/founder/cxo/{agentId}`
- `FounderSidebar` (global) still visible on hub

### Per-Agent Workspace (`/founder/cxo/{agentId}`)
- `FounderSidebar` suppressed (handled in `app/founder/layout.tsx` via `/founder/cxo/.+` regex + `?_embed=1` check for iframe)
- `CXOWorkspace` component orchestrates:
  - `CXOSidebar` (fixed, collapsible 52px→260px on hover)
  - `CXOChat` (loads `/founder/agents/[agentId]?_embed=1` in an iframe)

### CXOSidebar
Framer-motion collapsible sidebar (`motion.nav`, `animate={{ width: expanded ? 260 : 52 }}`):

**Sections (collapsed → expanded):**
- Back arrow → role name + dimension score subtitle
- **View switcher**: Dashboard | Chat tabs (icon-only collapsed, labelled expanded)
- **Role badge**: colour dot → role name + role tagline
- **DASHBOARD**: dimension score bar, deliverables count, pts earned, last active
- **DELIVERABLES**: dot grid (collapsed) → full list with status + pts (expanded)
- **CROSS-AGENT CONTEXT**: connected agents with relevance level
- **RESOURCES**: collapsible section with curated learning links

### CXOConfig System (`lib/cxo/cxo-config.ts`)

`buildConfigs()` produces a typed config object per agent:

```typescript
interface CXOConfig {
  agentId:              string;
  name:                 string;                  // "Patel"
  role:                 string;                  // "CMO — Go-to-Market Strategy"
  colour:               string;                  // "#2563EB"
  primaryDimension:     DimensionKey;            // "goToMarket"
  deliverables:         DeliverableConfig[];     // artifact types with boost pts
  quickActions:         QuickAction[];           // executable actions with confirmation flags
  connectedSources:     ConnectedSource[];       // other agents + relevance level
  resources:            Resource[];              // curated links
  maxScoreContribution: number;                  // sum of all artifact boosts
}
```

---

## 9. Investor Marketplace

### Match Score Algorithm

Computed client-side in `computeMatchScore(investor, founderQScore, founderSector, founderStage)`:

```
Base score:      40 pts  (everyone starts here)

Sector match:   +30 pts  if investor.sectors[] includes founder's sector
                          (with aliasing: ai→ai-ml, saas→saas+enterprise, healthtech→health, etc.)

Stage match:    +20 pts  if investor.stages[] includes founder's stage
                          (aliasing: idea→pre-seed, mvp→seed, launched→series-a, scaling→series-b+)

Q-Score bonus:
  score ≥ 80:  +10 pts
  score ≥ 65:  +7 pts
  score ≥ 50:  +3 pts
  score < 50:  +0 pts

Response rate:  +0–5 pts  (scaled from investor.response_rate above 50)

Maximum:        100 pts
```

**Example:** Founder building B2B SaaS at Seed stage, Q-Score 72, matches investor with sectors=[SaaS, Enterprise], stages=[Seed, Series A], response_rate=75:
- Base 40 + Sector 30 + Stage 20 + Q-Score 7 + Response 1 = **98/100 match**

Results sorted by match score descending.

### Investor Deal Flow (Investor Portal)

`GET /api/investor/deal-flow`:
1. Fetches all `founder_profiles WHERE onboarding_completed = true`
2. Batch queries: `qscore_history` (latest per user), `agent_activity` (last 7 days count), `agent_artifacts` (total count)
3. Computes **momentum score**:
   - Hot (≥10): high recent activity + Q-Score improving
   - Trending (4–10): moderate activity
   - Steady (<4): low recent activity
4. Applies **Q-Score decay** (read-time computation):
   - 0–89 days: 1.00× (no decay)
   - 90–179 days: 0.975×
   - 180–269 days: 0.95×
   - 270–364 days: 0.90×
   - 365+ days: 0.80×
5. Applies **AI personalization** from `investor_profiles.ai_personalization` (custom match scores saved per founder)
6. **Custom dimension weighting**: if investor has saved weights in `investor_parameter_weights`, recalculates Q-Score as `Σ(dimScore × investorWeight)` per dimension
7. **Visibility gating**: founders with `visibility_gated=true` (signal strength < 40) are excluded
8. Final sort: momentum desc → matchScore desc → effectiveQScore desc

**Investor tab views:**
- All deals | Hot | Rising | New | High-match (>85) | Active (3+ actions/week)

### Investor Pipeline (CRM)

`investor_pipeline` table gives investors a personal CRM:
- **Stages:** watching → interested → meeting → in_dd → portfolio → passed
- Private notes per founder
- Stage changes tracked with timestamps

### Connection Flow

1. Founder clicks "Connect" on matching page
2. Modal: enter personal message
3. `POST /api/connections` → inserts `connection_requests` row
4. Idempotent: duplicate request to same investor returns existing status
5. Investor sees new entry in their deal flow / notifications
6. Investor changes status to `accepted` → messaging unlocked
7. `messages` table scoped to `connection_request_id` — only sender + recipient can read

**Status states:**
`pending` → `viewed` → `accepted` / `declined` → `meeting_scheduled`

### Investor Deep-Dive (`/investor/startup/[id]`)

`GET /api/investor/startup/[id]` returns:
- Full `founder_profiles` row
- Latest `qscore_history` with all 6 dimension scores
- Felix `financial_summary` artifact (financials section)
- Harper `hiring_plan` artifact (team section)
- Atlas `competitive_matrix` artifact (competitors section)
- AI analysis: match insights, strengths, risks (derived from score breakdown)

### Investor Portfolio

`GET /api/investor/portfolio` returns all **accepted** connections enriched with:
- Founder Q-Score breakdown
- Financial data from Felix artifact (MRR, ARR, runway)
- Expandable rows with full profile

---

## 10. Key Features

### Pitch Deck Generator (`/founder/pitch-deck`)
- 10-slide auto-generated presentation from real agent artifacts
- Slide titles: Problem, Solution, Market Size, Product, Go-to-Market, Competitive Landscape, Traction, Team, Financial Projection, Vision & Ask
- Each slide has a `dataConfidence` indicator: `high` (artifact with matching data), `medium` (related artifact), `low` (inferred), `none` (no data — shows agent CTA)
- Left sidebar: 10 slide thumbnails with confidence dots
- Right panel: dark slide preview with gradient backgrounds
- Arrow key keyboard navigation
- Company name editable inline
- Readiness bar (% of slides with high/medium confidence)
- "Download HTML" → self-contained full-screen presentation file

### Metrics Dashboard (`/founder/metrics`)
- Live KPI strip: MRR, ARR, Customers, Runway (months), LTV:CAC ratio, CAC payback
- Unit economics: gross margin %, burn multiple, net revenue retention estimate
- Health banners: "Low runway (<6 months)", "Negative CAC payback", etc.
- `useMetrics(refreshTrigger)` hook: 3-tier fallback (agent_artifacts → qscore_history.assessment_data → localStorage)
- "Update metrics" → inline `ManualEntryForm` (10 fields) → saves as `financial_summary` artifact under Felix
- Stripe live connect: founder provides restricted API key → stored in session → `/api/agents/felix/stripe` pulls live MRR/ARR

### Workspace (`/founder/workspace`)
- All artifacts grouped by agent, sorted by creation date
- Expandable version history per artifact type (all historical versions)
- "View" links: `?artifact=<uuid>` → agent page loads the specific artifact
- Version history items also link to specific artifact IDs
- CSV export available for `financial_summary` type (financial model with formulas)

### Public Portfolio (`/p/[userId]`)
- `/startup/[slug]` public page (no auth required)
- Viewable by investors, partners, co-founders
- Shows: Q-Score ring with grade, all 6 dimension scores, artifact list (titles only — no content exposed), team info
- View tracking: `portfolio_views` table (viewer_ip, referrer, viewed_at)

### Activity Feed & Weekly Digest (`/founder/activity`)
- All `agent_activity` events grouped by date
- Agent icons, human-readable descriptions, metadata links
- "Send Digest" button → `POST /api/digest/weekly`:
  - Groups last 7 days of agent activity by agent
  - Includes Q-Score delta (current vs 7 days ago)
  - Full HTML email via Resend

### Notification Centre
- Bell icon in `FounderSidebar` with red unread count badge
- On click: slide-out panel from right
- Content: notable events from `agent_activity` (artifact completions, score boosts, deal updates)
- Unread state tracked via localStorage key `ea_read_notifs_v1`
- "View all activity →" link to `/founder/activity`

### Profile Builder (`/founder/profile-builder`)
- 5-section adaptive chat (sections 1–5 plus document upload section 0)
- Each section: AI asks initial question → founder answers → AI extracts fields + asks follow-ups until completion score ≥70%
- `completion_score` per section tracked in `profile_builder_data`
- Document upload: pitch decks, financial models → text extraction → merged into extracted fields
- `confidence_map` per field: 0–1 float indicating how certain the extraction is
- Draft auto-save between sessions (no data loss on browser close)
- Section 6: review all extracted data → submit → triggers full Q-Score calculation

---

## 11. Phase 3 Integrations

All integrations are non-OAuth (no complex auth flows required):

| Integration | Agent | Endpoint | What it does |
|-------------|-------|----------|-------------|
| **Netlify Files API** | Patel, Maya | `POST /api/agents/landingpage/deploy` | Hash-based deploy, no zip needed. Returns live URL. |
| **Stripe Live Metrics** | Felix | `POST /api/agents/felix/stripe` | Restricted key → `/v1/charges` → derives real MRR/ARR/ARR |
| **Hunter.io Lead Enrich** | Patel, Susi | `POST /api/agents/patel/enrich` | Domain → email list for outreach |
| **Resend Investor Update** | Felix, Sage | `/api/agents/felix/investor-update` | YC-style HTML update email to investor list |
| **Resend Weekly Digest** | All | `POST /api/digest/weekly` | 7-day agent activity summary email |
| **Tavily Web Research** | Atlas | `web_research` tool | Live competitive intel → second LLM pass → structured output |
| **PMF Survey Hosting** | Nova | `POST /api/survey` + `/s/[surveyId]` | Creates shareable hosted survey with localStorage response collection |
| **Public Apply Page** | Harper | `/apply/[userId]/[roleSlug]` | Public job application page → LLM resume screener (score 0–100) |
| **NDA Generator** | Leo | `POST /api/agents/leo/nda` | HTML NDA download (fully rendered, ready to sign) |
| **Google Alerts** | Patel, Atlas | Client-side URL | Opens pre-configured Google Alert for competitor names |
| **Linear / Notion Export** | Sage | Client-side | Copies OKRs as markdown + opens linear.app/new |
| **Clerky / Stripe Atlas** | Leo | Client-side URL | Copies incorporation details + opens the platform |
| **Wellfound Job Post** | Harper | Client-side | Copies JD to clipboard + opens wellfound.com/jobs/new |
| **Gmail Compose** | Patel | Client-side URL | Opens pre-composed Gmail draft for outreach steps |

---

## 12. API Route Map

### Authentication
- `POST /api/auth/signup` — Founder account creation (admin client, email_confirm: true)
- `POST /api/auth/investor-signup` — Investor account creation

### Q-Score
- `POST /api/qscore/calculate` — Full 10-step calculation pipeline
- `GET /api/qscore/latest` — Fetch latest Q-Score with breakdown
- `GET /api/qscore/benchmarks` — Per-dimension cohort percentile ranks
- `GET /api/qscore/actions` — AI improvement actions (lazy-generated, cached)
- `GET /api/qscore/priority` — Lowest-scoring dimensions list
- `GET /api/qscore/thresholds` — Per-sector scoring thresholds
- `POST /api/qscore/activity-boost` — Fire agent artifact score signal

### Profile Builder
- `GET /api/profile-builder/draft` — Load saved draft sections
- `POST /api/profile-builder/save` — Save extracted fields for a section
- `POST /api/profile-builder/extract` — LLM extraction from conversation text
- `POST /api/profile-builder/submit` — Submit all sections → calculate Q-Score
- `POST /api/profile-builder/upload` — Upload and parse document
- `POST /api/profile-builder/linkedin-enrich` — Enrich profile from LinkedIn URL

### Agent Core
- `POST /api/agents/chat` — Main chat endpoint (all 9 agents)
- `POST /api/agents/generate` — Quick generate from templates
- `GET /api/agents/context` — Cross-agent context for system prompts
- `POST /api/agents/research` — Tavily web research

### Patel Agent Routes (13)
`/api/agents/patel/`: enrich, landing-copy, sequence, icp-validation, partnership-strategy, content-calendar, ab-test, account-based-marketing, directories, customer-journey, launch-plan, launch-copy, reply-draft

### Susi Agent Routes (12)
`/api/agents/susi/`: proposal, pipeline, qualification, objection-bank, deal-coaching, deal-playbook, forecast, pricing, pipeline-health, meeting-prep, followup, score-deals
`/api/agents/deals/`: route (CRUD), reminders
`/api/proposal/send`

### Felix Agent Routes (16)
`/api/agents/felix/`: model, investor-update, stripe, cash-flow, runway-alert, scenario-planning, cost-reduction, expenses, revenue-forecast, fundraising, unit-economics, board-deck, board-update, invoice, actuals, runway-cuts

### Leo Agent Routes (17)
`/api/agents/leo/`: nda, safe, term-sheet, cap-table, equity-plan, cofounder, contractor, compliance, ip-strategy, ip-audit, data-room, privacy-policy, fundraising-checklist, regulatory, clauses, diff, term-sheet-analyzer

### Harper Agent Routes (17)
`/api/agents/harper/`: job-descriptions, interview-kit, scorecard, culture-assessment, culture-deck, compensation, offer-letter, onboarding, performance-review, outreach, source, pipeline, apply, salary-benchmarking, post-job, reject, reference

### Nova Agent Routes (21)
`/api/agents/nova/`: pmf-survey, interview-notes, user-personas, feature-matrix, retention-analysis, churn, churn-analysis, user-segmentation, onboarding-flow, engagement-loops, fake-door, growth-experiment, experiment-tracker, cohort, customer-insight, pmf-score, validate-problem, features, activation-funnel, interview-schedule, distribute
`/api/survey`, `/api/survey/results`, `/api/survey/distribute`, `/api/survey/analyze`

### Atlas Agent Routes (20)
`/api/agents/atlas/`: competitive-matrix, market-map, win-loss, pricing, feature-comparison, market-size, market-intelligence, positioning-map, review-analysis, social, techstack, trend-radar, weekly-scan, monitor, alerts, track, job-postings, battle-cards, win-loss-analysis
`/api/agents/landingpage/deploy`

### Sage Agent Routes (18)
`/api/agents/sage/`: strategic-plan, okr-tracker, goals, milestone, decisions, pivot, exit-strategy, focus, standup, team-alignment, investor-update, investor-qa-prep, board-prep, board-communication, crisis-playbook, briefing, contradictions, linear-sync
`/api/agents/investor/contacts`

### Investor
- `GET /api/investors` — All demo + real investors (unified)
- `GET /api/investor/deal-flow` — Real deal flow data (auth required)
- `GET /api/investor/startup/[id]` — Full startup deep-dive
- `GET /api/investor/portfolio` — Accepted connections with financial data
- `GET /api/investor/ai-analysis` — Market insights, top founders, sector breakdown
- `POST /api/investor/personalize` — Save custom match weights

### Connections & Messaging
- `GET /api/connections` — Connection request statuses (keyed by investor ID)
- `POST /api/connections` — Create connection request (idempotent)
- `GET/POST /api/messages` — Conversation messages

### Notifications & Digest
- `GET /api/notifications` — Notification centre data (agent_activity events)
- `POST /api/digest/weekly` — Send weekly digest email via Resend

### Public
- `GET /api/investors` — Demo investor list (no auth)
- `POST /api/waitlist` — Waitlist signup
- `POST /api/analyze-pitch` — Pitch deck analysis
- `GET /api/health` — Health check

---

## 13. Auth & RLS

### Authentication
- **Supabase Auth** — email/password for both founders and investors
- **Signup flow** (founders): `POST /api/auth/signup` uses **admin client** (`SUPABASE_SERVICE_ROLE_KEY`) to create user with `email_confirm: true` — bypasses email confirmation for instant access
- **Role differentiation**: check `investor_profiles WHERE user_id = X` on login → route to `/investor/dashboard` vs `/founder/dashboard`

### Row-Level Security Policies

| Table | Policy |
|-------|--------|
| `founder_profiles` | Users see and edit only their own row |
| `agent_artifacts` | Users see only their own artifacts |
| `agent_conversations` | Users see only their own conversations |
| `agent_messages` | Users see only messages in their conversations |
| `qscore_history` | Users see only their own score history |
| `score_evidence` | Users manage their own evidence |
| `deals` | Users see only their own deals |
| `survey_responses` | Survey owner can read all responses for their surveys; public INSERT |
| `applications` | Hiring founder sees applications for their user_id; public INSERT |
| `connection_requests` | Founders see own requests; investors see requests to them |
| `messages` | Only sender and recipient (via connection_request) can read |
| `investor_profiles` | Investors manage own profile; verified investors visible to founders |
| `demo_investors` | Public read access (no auth required) |
| `portfolio_views` | Founders see views of their own portfolio; INSERT via service-role client |

### Admin Client Usage
The `SUPABASE_SERVICE_ROLE_KEY` client bypasses all RLS. Used only in:
- Signup API routes (create user + profile atomically)
- Agent artifact saves (cross-user context injection requires reading other users' artifacts)
- Digest/notification APIs (aggregate across users)
- Profile builder save/draft APIs

---

## 14. Environment Variables

| Variable | Required | Used by |
|----------|----------|---------|
| `OPENROUTER_API_KEY` | ✅ | All LLM calls (chat, extract, generate) |
| `OPENROUTER_API_KEY_FALLBACK` | Optional | Fallback if primary key exhausted |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | All Supabase client/server calls |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Client-side Supabase calls |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Admin client (signup, artifact saves, aggregates) |
| `RESEND_API_KEY` | ✅ | All email sends (investor updates, digests, outreach) |
| `STRIPE_RESTRICTED_KEY` | Optional | Felix agent live MRR/ARR pull |
| `HUNTER_IO_API_KEY` | Optional | Patel/Susi lead enrichment |
| `TAVILY_API_KEY` | Optional | Atlas competitive intelligence (web research) |
| `NETLIFY_TOKEN` | Optional | Patel/Maya landing page deployment |

**If optional keys are missing:**
- `TAVILY_API_KEY` missing → Atlas skips web research, generates competitive analysis from LLM knowledge only
- `HUNTER_IO_API_KEY` missing → `lead_enrich` tool returns empty result gracefully
- `NETLIFY_TOKEN` missing → deploy button shows error toast
- `STRIPE_RESTRICTED_KEY` missing → Felix Stripe connect shows "not connected" state

---

*Last updated: 2026-03-26. Stack: Next.js 14 · Supabase · OpenRouter (claude-3.5-haiku) · TypeScript.*
