# Edge Alpha Platform — Complete Technical Documentation

> Authoritative reference for how Edge Alpha is built, how Q-Score works, what every agent does, and how the investor marketplace operates.

---

## Table of Contents
1. [Platform Overview](#1-platform-overview)
2. [Tech Stack](#2-tech-stack)
3. [Auth & Onboarding Flow](#3-auth--onboarding-flow)
4. [Q-Score System](#4-q-score-system)
5. [AI Agents (CXO Suite)](#5-ai-agents-cxo-suite)
6. [Profile Builder](#6-profile-builder)
7. [Investor Marketplace](#7-investor-marketplace)
8. [Workspace & Portfolio](#8-workspace--portfolio)
9. [Academy](#9-academy)
10. [Database Schema](#10-database-schema)
11. [Subscription Tiers](#11-subscription-tiers)
12. [Navigation Structure](#12-navigation-structure)
13. [Key Files Reference](#13-key-files-reference)

---

## 1. Platform Overview

**Edge Alpha** is a founder OS for VC-backed startups — a structured operating system combining AI advisers, a credibility scoring engine, and an investor marketplace.

**Core Loop:**
```
Sign up → Onboarding (Q-Score = 0)
  → CXO Suite (9 AI agents → 12 artifact types)
    → Each artifact boosts a Q-Score dimension (one-time)
  → Profile Builder (6-step deep enrichment → full Q-Score)
  → Investor Marketplace (unlocks at Q-Score ≥ 65)
    → Investors see signals, founders get connections
```

**Three User Types:**
- **Founders** — primary users, `/founder/*` routes
- **Investors** — `/investor/*` portal
- **Public** — `/s/[surveyId]` (PMF surveys), `/apply/[userId]/[roleSlug]` (job applications)

---

## 2. Tech Stack

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 App Router |
| Build | Turbopack |
| Styling | Tailwind CSS 3.4 + inline styles (dominant pattern) |
| Animation | Framer Motion 12 |
| Icons | Lucide React |
| UI Primitives | Radix UI (accordion, tabs, separator) |
| State | Zustand 5 |

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js via Next.js API Routes |
| LLM | OpenRouter → `anthropic/claude-3-haiku` |
| Email | Resend |
| Payments | Stripe (restricted key, read-only) |
| Deployment | Netlify Files API (landing pages) |
| Search | Tavily (web research for Atlas agent) |
| Lead enrichment | Hunter.io (domain → contacts, for Patel/Susi) |

### Database
| Layer | Technology |
|-------|-----------|
| Platform | Supabase (managed PostgreSQL) |
| Auth | Supabase Auth |
| Client (browser) | `@supabase/ssr` `createBrowserClient` — singleton, writes to cookies |
| Client (server) | `@supabase/ssr` `createServerClient` |
| Migrations | 50+ SQL files in `/supabase/migrations/` |
| Security | RLS on all user-facing tables |

> **Critical:** All client pages must import from `@/lib/supabase/client` (not raw `@supabase/supabase-js`). Raw client writes session to localStorage only — middleware reads cookies → causes redirect loop.

### Design Palette
```
bg     = #F9F7F2   page background
surf   = #F0EDE6   card surfaces
bdr    = #E2DDD5   borders
ink    = #18160F   primary text
muted  = #8A867C   secondary text
blue   = #2563EB   primary action
green  = #16A34A   success / verified
amber  = #D97706   warning
red    = #DC2626   error / danger
```

---

## 3. Auth & Onboarding Flow

### Signup (`POST /api/auth/signup`)
1. Supabase Admin SDK creates user with `email_confirm: true` — no verification email
2. `founder_profiles` row inserted with all form data + `subscription_tier: 'free'`
3. Initial `qscore_history` row: `overall_score: 0, data_source: 'registration'`
4. `subscription_usage` initialized: `agent_chat: 50/mo`, `qscore_recalc: 2/mo`, `investor_connection: 3/mo`
5. Redirect → `/founder/profile-builder`

### Onboarding Form (4 pages before account creation)

**Page 1 — Company:**
- Company name, website, industry (12 options), stage (5 options), description

**Page 2 — Revenue & Funding:**
- Revenue status (Pre-revenue / <$10K MRR / $10K–$100K / $100K+)
- Funding status (Bootstrapped / Pre-seed / Seed / Series A / B+)
- Founded date, incorporation type

**Page 3 — Team & Experience:**
- Team size (Solo / 2 / 3–5 / 6–15 / 16+)
- Years on problem, prior experience (None / Domain expert / Serial founder / Both)
- LinkedIn URL

**Page 4 — Email + Password** → calls `/api/auth/signup`

---

## 4. Q-Score System

A 0–100 credibility/readiness score. Multi-dimensional, sector-weighted, with temporal decay, verified data boosting, and bluff detection.

### 4.1 The 6 Dimensions

| Dimension | Default Weight | What it Measures |
|-----------|---------------|-----------------|
| Market | 20% | TAM size, conversion realism, LTV:CAC |
| Product | 18% | Customer validation depth, learning velocity |
| Go-to-Market | 17% | ICP clarity, channel testing, messaging |
| Financial | 18% | Gross margin, ARR, runway, burn rate |
| Team | 15% | Domain expertise, completeness, resilience |
| Traction | 12% | Customer conversations, commitments, revenue |

### 4.2 Sector-Specific Weights

8 sectors dynamically reweight the 6 dimensions — `features/qscore/utils/sector-weights.ts`:

| Sector | Market | Product | GTM | Financial | Team | Traction |
|--------|--------|---------|-----|-----------|------|----------|
| B2B SaaS | 20% | 18% | 20% | 18% | 14% | 10% |
| B2C / Consumer Tech | 16% | 22% | 16% | 14% | 12% | 20% |
| Marketplace | 18% | 14% | 16% | 20% | 12% | 20% |
| Biotech / Deep Tech | 26% | 22% | 12% | 16% | 20% | 4% |
| Consumer Brand / CPG | 16% | 18% | 20% | 18% | 10% | 18% |
| Fintech | 22% | 18% | 14% | 24% | 14% | 8% |
| Hardware / IoT | 20% | 20% | 14% | 22% | 18% | 6% |
| E-commerce / D2C | 16% | 14% | 18% | 24% | 10% | 18% |

### 4.3 Dimension Scoring Formulas

Files: `features/qscore/calculators/dimensions/[market|product|gtm|financial|team|traction].ts`

#### Market Score
- TAM size (40 pts): `targetCustomers × LTV` tiered — ≥$1B=40, ≥$100M=35, ≥$10M=28, ≥$1M=20
- Conversion realism (30 pts): 0.5–5% = 30, 0.1–10% = 20, <0.5% = 10
- Daily activity assumptions (20 pts): 10–50% of users = 20
- LTV:CAC ratio (10 pts): ≥3x = 10, ≥2x = 7, ≥1x = 4
- **Blended:** 55% base + 45% P2 (TAM urgency, competitor density, expansion potential)

#### Product Score
- Customer validation (40 pts): conversation count (20) + evidence quality LLM-evaluated (20)
- Learning velocity (30 pts): build time (10) + completeness LLM-evaluated (20)
- Failed assumptions & pivots (30 pts): LLM-evaluated

#### GTM Score
- ICP clarity (35 pts): LLM-evaluated; fallback: ≥200 chars=35, ≥100=25, ≥50=15
- Channel testing (35 pts): channels tried (15) + results (10) + CAC ratio (10)
- Messaging & positioning (30 pts): LLM-evaluated

#### Financial Score
- Gross margin (20 pts): ≥80%=20, ≥70%=17, ≥60%=14, ≥50%=10, ≥40%=6
- ARR scale (20 pts): ≥$1M=20, ≥$500K=17, ≥$100K=14, ≥$50K=10, ≥$10K=6
- Runway (30 pts): ≥18mo=30, ≥12mo=25, ≥9mo=20, ≥6mo=15, ≥3mo=10
- Burn rate & projections (30 pts)

#### Team Score
- Domain expertise (40 pts): problem story LLM-evaluated (20) + advantage explanation (20)
- Team completeness (30 pts): cofounder presence, leadership coverage
- Resilience (30 pts): hardship narrative LLM-evaluated
- Blended with P4: domain years, prior exits, cohesion signals

#### Traction Score
- Customer conversations (20 pts): ≥100=20, ≥50=18, ≥20=12, ≥10=8, ≥5=4
- Customer commitment (20 pts): paid + proof=20, paid=17, LOI=15, waitlist=10
- Revenue (30 pts): ≥$1M=30, ≥$500K=28, ≥$100K=22, ≥$10K=10, ≥$5K=6

### 4.4 Overall Score Calculation

File: `features/qscore/calculators/prd-aligned-qscore.ts`

```
1. Calculate each dimension score (0–100)
2. Apply data-source multipliers:
     Stripe-verified  → 1.0×
     Document-backed  → 0.85×
     Self-reported    → 0.55×
3. Apply confidence penalty (missing data lowers score)
4. Weighted sum using sector weights → overall (0–100)
5. P5 Structural Impact bonus: max +8 pts if score ≥50
     (climate/social impact + revenue linkage + scaling mechanism)
6. Bluff detection penalty (inflated/inconsistent inputs detected by LLM)
7. Cap at 0–100
```

**Grade thresholds:** A+ ≥95 · A ≥90 · B+ ≥85 · B ≥80 · C+ ≥75 · C ≥70 · D ≥60 · F <60

### 4.5 Temporal Decay (computed on read, never stored)

| Score Age | Multiplier |
|-----------|-----------|
| <90 days | 1.00× |
| 90–180 days | 0.975× |
| 180–270 days | 0.95× |
| 270–365 days | 0.90× |
| >365 days | 0.80× |

File: `app/api/qscore/latest/route.ts`

### 4.6 Agent Score Boosts (one-time per artifact type per user)

When an artifact is completed, `applyAgentScoreSignal()` fires — inserts a new `qscore_history` row linked via `previous_score_id`.

| Artifact | Dimension Boosted | Max Pts |
|----------|------------------|---------|
| gtm_playbook | Go-to-Market | +6 |
| financial_summary | Financial | +6 |
| competitive_matrix | Market | +5 |
| pmf_survey | Product | +5 |
| hiring_plan | Team | +5 |
| icp_document | Go-to-Market | +5 |
| battle_card | Market | +4 |
| sales_script | Traction | +4 |
| strategic_plan | Market | +4 |
| outreach_sequence | Go-to-Market | +3 |
| brand_messaging | Product | +3 |
| legal_checklist | Team | +3 |

Quality multiplier: full=1.0×, partial=0.6×, minimal=0.3×

File: `features/qscore/services/agent-signal.ts`

### 4.7 Q-Score API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/qscore/calculate` | POST | Full calculation: RAG + bluff detection + evidence → inserts qscore_history |
| `/api/qscore/latest` | GET | Latest score with decay applied, delta vs previous, confidence interval |
| `/api/qscore/benchmarks` | GET | Per-dimension cohort percentile ranks |
| `/api/qscore/actions` | GET | 5 AI-generated "What gets me to 80?" actions (cached on first call) |
| `/api/qscore/actions` | POST | Clear cache + regenerate actions |

---

## 5. AI Agents (CXO Suite)

9 agents at `/founder/cxo?agent=[agentId]`. Each has a system prompt, produces structured artifacts, and optionally executes real-world integrations.

### 5.1 How a Conversation Works

```
1. User message → POST /api/agents/chat
2. System prompt injected (agent-specific, 9 prompts)
3. Own past artifacts injected ("MEMORY — What you built together")
4. Other agents' artifacts injected ("FOUNDER CONTEXT")
5. Up to 2 relevant knowledge library resources (after 3+ messages)
6. LLM (claude-3-haiku via OpenRouter) responds
7. If tool_call XML detected:
     Data tools  → execute immediately, result appended to chat
     Artifact    → 2-pass (context extraction → generation) → saved to DB
8. applyAgentScoreSignal() → dimension boost (one-time)
9. Persist to agent_conversations + agent_messages
```

### 5.2 The 9 Agents

#### PATEL — CMO / Go-to-Market Strategy
**Artifacts:** ICP Document · Outreach Sequence · GTM Playbook
**Data tools:** `lead_enrich` (Hunter.io — finds decision-maker contacts by domain)
**Real-world:** Gmail outreach links · Netlify landing page deploy · Google Alerts per competitor
**Q-Score:** GTM +14, Traction +3

#### SUSI — CRO / Sales & Lead Generation
**Artifacts:** Sales Script
**Data tools:** `lead_enrich`, `create_deal` (auto-creates CRM pipeline entries)
**Real-world:** Gmail proposal links · Stale deal reminders surfaced in chat
**Q-Score:** Traction +4

#### MAYA — Brand Director / Content Marketing
**Artifacts:** Brand Messaging Framework (positioning statement, 5 taglines, elevator pitch, voice guide)
**Real-world:** Blog post generation + HTML download · Netlify landing page deploy · Social media SVG templates (Instagram 1080×1080, Twitter 1200×628, LinkedIn 1584×396)
**Q-Score:** GTM +3

#### FELIX — CFO / Financial Modeling
**Artifacts:** Financial Summary (MRR/ARR/burn/runway/LTV/CAC/gross margin + 12-month projections)
**Data tools:** `fetch_stripe_metrics` (live Stripe: MRR, ARR, customers, churn — restricted key)
**Real-world:** Stripe connect · Investor update email via Resend (YC-style) · CSV download (Google Sheets formulas)
**Q-Score:** Financial +6

#### LEO — General Counsel / Legal & Compliance
**Artifacts:** Legal Checklist (incorporation · IP · co-founder agreements · customer contracts · fundraising readiness)
**Real-world:** NDA generator (mutual or one-way, HTML download) · Clerky link · Stripe Atlas link
**Q-Score:** Team +3

#### HARPER — Chief People Officer / HR
**Artifacts:** Hiring Plan (team gaps, next 3–5 hires, org roadmap, compensation bands by stage)
**Real-world:** Post on Wellfound (copy JD + open link) · Resume screener (LLM 0–100 score) · Public apply page at `/apply/[userId]/[roleSlug]`
**Q-Score:** Team +5

#### NOVA — CPO / Product-Market Fit
**Artifacts:** PMF Research Kit (discovery interview scripts, Ellis test, retention/NPS metrics, segment analysis) · Interview Notes
**Real-world:** Host PMF survey at `/s/[surveyId]` · Standalone survey HTML download · Fake door test (waitlist capture)
**Q-Score:** Product +5–8

#### ATLAS — Chief Strategy Officer / Competitive Intelligence
**Artifacts:** Competitive Matrix (feature comparison grid, SWOT, positioning map, white space) · Battle Card
**Data tools:** `web_research` (Tavily live search + 2-pass LLM synthesis — real competitor data)
**Real-world:** Google Alerts per competitor (chip → URL) · Competitor price change tracking
**Q-Score:** Market +9

#### SAGE — CEO Advisor / Strategic Planning
**Artifacts:** Strategic Plan (12-month vision, OKRs, now/next/later roadmap, risks, Series A milestones)
**Real-world:** Investor update email via Resend · Export OKRs to Linear (markdown + link) · Investor contacts list
**Q-Score:** Market +4

### 5.3 All 12 Artifact Types

| Artifact ID | Agent | Q-Score Boost |
|-------------|-------|--------------|
| icp_document | Patel | GTM +5 |
| outreach_sequence | Patel | GTM +3 |
| battle_card | Patel / Atlas | Market +4 |
| gtm_playbook | Patel | GTM +6 |
| sales_script | Susi | Traction +4 |
| brand_messaging | Maya | Product +3 |
| financial_summary | Felix | Financial +6 |
| legal_checklist | Leo | Team +3 |
| hiring_plan | Harper | Team +5 |
| pmf_survey | Nova | Product +5 |
| competitive_matrix | Atlas | Market +5 |
| strategic_plan | Sage | Market +4 |

### 5.4 Quick Generate Flow

```
Template gallery → 5 questions → POST /api/agents/generate
  Pass 1: LLM extracts context from answers
  Pass 2: LLM generates artifact JSON
  Quality eval: full / partial / minimal → multiplier applied
  Q-Score signal fires + auto-verified score_evidence row created
  RAG embedding (fire-and-forget)
  Returns: { artifact, scoreSignal }
```

### 5.5 Tool Call Types (16 total)
- **12 artifact tools:** icp_document, outreach_sequence, battle_card, gtm_playbook, sales_script, brand_messaging, financial_summary, legal_checklist, hiring_plan, pmf_survey, competitive_matrix, strategic_plan
- **4 data tools:** lead_enrich (Hunter.io), web_research (Tavily), create_deal, fetch_stripe_metrics

---

## 6. Profile Builder

Full-screen, no-sidebar flow at `/founder/profile-builder`. Collects structured data via document upload + conversational AI across 6 sections, then calculates a full Q-Score.

**Key files:**
- Page: `app/founder/profile-builder/page.tsx`
- APIs: `app/api/profile-builder/[upload|extract|save|draft|submit]/route.ts`
- Question engine: `lib/profile-builder/question-engine.ts`
- Extraction prompts: `lib/profile-builder/extraction-prompts.ts`
- Document parser: `lib/profile-builder/document-parser.ts`

### 6.1 The 7 Steps

| Step | Label | Q-Score Section |
|------|-------|----------------|
| 0 | Document Upload | Optional — pitch deck, financials |
| 1 | Market Validation | P1 — customers, pilots, willingness to pay |
| 2 | Market & Competition | P2 — TAM/SAM, urgency, competitors |
| 3 | IP & Technology | P3 — patents, technical depth, build complexity |
| 4 | Team | P4 — domain expertise, co-founders, exits |
| 5 | Financials & Impact | P5 — revenue, burn rate, ESG signals |
| 6 | Review & Submit | Calculates full Q-Score |

### 6.2 Conversation Flow Per Section

```
1. getInitialQuestion(sectionNum, founderProfile) → adaptive first question
   (pre-revenue founders get different questions than launched startups)
2. shouldTriggerUpload(userText) → detects "deck"/"spreadsheet" → shows upload prompt
3. User answer → POST /api/profile-builder/extract
     LLM extracts structured fields
     Returns: mergedFields, confidenceMap, completionScore (0–100), followUpQuestion
4. Section complete at ≥70% completionScore
5. Auto-saved to profile_builder_drafts after every exchange
```

### 6.3 Document Upload

- Accepts: PDF, PPTX, XLSX, CSV, PNG/JPG (max 10 MB)
- Parser extracts text → LLM maps content to section fields
- Extracted fields merged into active section's `extractedFields`
- File stored in Supabase Storage; metadata in draft

### 6.4 Submit & Scoring

```
POST /api/profile-builder/submit
  Requires: ≥3 sections at ≥70% completion
  Enforces: 30-day cooldown between re-submissions
  Merges sections → AssessmentData via mergeToAssessmentData()
  Runs calculatePRDQScore() — same engine as full assessment
  Bluff penalty: -30% per missing section
  Inserts qscore_history (data_source: 'profile_builder')
  Sets founder_profiles.profile_builder_completed = true
```

### 6.5 Data Storage

| Data | Location |
|------|----------|
| In-progress drafts | `profile_builder_drafts` (user_id + section) |
| Uploaded documents | Supabase Storage + metadata in draft |
| Completed Q-Score | `qscore_history` |
| Completion flag | `founder_profiles.profile_builder_completed` |

---

## 7. Investor Marketplace

### 7.1 Founder Side (`/founder/matching`)

**Q-Score gate:** <65 → investor cards blurred with upgrade prompt.

**Match Score Algorithm:**
```
Base score:       40 pts
Sector alignment: +30 pts  (founder industry ↔ investor sectors[])
Stage alignment:  +20 pts  (founder stage ↔ investor stages[])
Q-Score bonus:    +10 pts  (proportional to score above 65)
Response rate:    +5  pts
──────────────────────────
Maximum:          100 pts
```

**Connection flow:**
Founder writes personal message → `POST /api/connections` → `connection_requests` row
Status lifecycle: `pending → viewed → accepted → declined → meeting_scheduled`

### 7.2 Investor Deal Flow (`/investor/deal-flow`)

**Data pipeline — 3 parallel Supabase queries:**
1. `founder_profiles` — all profile fields
2. `qscore_history` — latest score + 6 dimensions per founder
3. `agent_activity` last 7 days — for "active founder" badge
4. `agent_artifacts` — deliverable count

**5 Signals Per Founder Card:**

| Signal | What it is | Colors |
|--------|-----------|--------|
| **Readiness** | Q-Score 0–100 (decay-adjusted) | ≥80 green · ≥65 blue · <65 muted |
| **Freshness** | Days since last calculation | <30d green · <90d amber · ≥90d red |
| **Signal Strength** | Data confidence 0–100 | ≥75 green · ≥50 amber · <50 muted |
| **Momentum** | 30-day delta vs cohort | Hot +≥10 · Rising +4–9 · Steady · Falling |
| **Integrity Index** | Corroborated vs flagged claims 0–100 | ≥80 green · ≥60 amber · <60 red |

**Investor custom weighting:**
`investor_parameter_weights` table → Q-Score recalculated using investor's own dimension weights for personalized ranking.

**Visibility gate:** `signal_strength <40` → `visibility_gated=true` → hidden from deal flow.

### 7.3 Investor Pipeline CRM

6 stages: `watching → interested → meeting → in_dd → portfolio → passed`
Table: `investor_pipeline` per investor-founder pair.

### 7.4 Founder Deep-Dive (`/investor/startup/[id]`)

Returns from `GET /api/investor/startup/[id]`:
- Q-Score breakdown (6 dimensions + weights)
- Financials — extracted from Felix's `financial_summary` artifact
- Team members — from Harper's `hiring_plan` artifact
- Competitors — from Atlas's `competitive_matrix` artifact
- AI analysis: strengths (dims ≥70), risks (dims <60), recommendations
- `startupProfile`: solution, why now, moat, TAM, business model, raising amount, use of funds
- `artifactCoverage`: which of 12 artifact types exist
- `agentStats`: active agents, actions this week, total deliverables

### 7.5 Two Investor Types

| Type | Auth | Custom Weights |
|------|------|----------------|
| `demo_investors` | No auth, seed data | No |
| Real investors | `investor_profiles` + Supabase Auth | Yes |

Real investors link to `demo_investors` via `demo_investor_id` for display continuity.

---

## 8. Workspace & Portfolio

### Workspace (`/founder/workspace`)
- All 12 artifact types grouped by pillar (Sales & Marketing · Operations & Finance · Product & Strategy)
- Completion tracker: X/12 artifacts built
- Expandable version history per artifact type
- "View" links pass `?artifact=<uuid>` → agent page opens that specific artifact directly

### Portfolio (`/founder/portfolio`)
- Investor-facing public page
- Q-Score ring + 6-dimension breakdown, deliverables grid, verified evidence list
- Share link, print/PDF export, email share
- Accepted connections fetched via `GET /api/investor/portfolio`

---

## 9. Academy

Route: `/founder/academy`

Three tabs: **Workshops** · **Mentors** · **Programs**

Resources recommended based on weakest Q-Score dimension:
- GTM → ICP Definition Masterclass
- Product → PMF Validation Framework
- Fundraising → Fundraising Narrative Guide

Data source: `features/academy/data/workshops.ts` (static, not DB-backed currently)

---

## 10. Database Schema

### Core Tables

**`founder_profiles`**
- Identity: `user_id` (FK auth), `full_name`, `startup_name`, `industry`, `stage`
- Status: `subscription_tier` (free/premium/enterprise), `onboarding_completed`, `profile_builder_completed`
- Registration data: `company_name`, `website`, `founded_date`, `description`, `revenue_status`, `team_size`
- Verification signals: `signal_strength` (0–100), `integrity_index` (0–100), `stripe_verified`, `momentum_score`
- Rich data blobs: `startup_profile_data JSONB`, `onboarding_extracted_data JSONB`
- Investor gate: `visibility_gated BOOLEAN`

**`qscore_history`** — one row per scoring event
- `user_id`, `overall_score` (0–100), `grade`, `percentile`
- `market_score`, `product_score`, `gtm_score`, `financial_score`, `team_score`, `traction_score`
- `data_source`: registration / assessment / agent_completion / profile_builder
- `source_artifact_type` — which artifact triggered the boost
- `previous_score_id` — self-FK for delta chain
- `assessment_data JSONB` — full founder input at calculation time
- `ai_actions JSONB` — cached improvement recommendations
- `cohort_scores JSONB`, `gtm_diagnostics JSONB`

**View `qscore_with_delta`** — joins current row to previous, adds `overall_change`, `market_change`, etc.

**`agent_artifacts`**
- `id`, `user_id`, `agent_id` (patel/susi/maya/felix/leo/harper/nova/atlas/sage)
- `artifact_type` (12 types), `title`, `content JSONB`, `version`

**`agent_conversations`** + **`agent_messages`** — chat history per session

**`agent_activity`** — action log visible to investors (used for activity count per week)

**`score_evidence`**
- `dimension`, `evidence_type` (stripe_screenshot/loi/contract/analytics/patent/linkedin)
- `title`, `file_url`, `data_value`, `status` (pending/verified/rejected), `points_awarded`

**`connection_requests`**
- `founder_id`, `demo_investor_id` (FK demo_investors), `personal_message`, `founder_qscore`, `status`

**`demo_investors`** — seed data
- `name`, `firm`, `sectors[]`, `stages[]`, `check_sizes[]`, `response_rate`, `thesis`, `portfolio[]`

**`investor_profiles`** — real investor accounts
- `user_id` (FK auth), links to `demo_investors` via `demo_investor_id`
- `ai_personalization JSONB` — stores match scores per founder

**`investor_parameter_weights`**
- `weight_market`, `weight_product`, `weight_gtm`, `weight_financial`, `weight_team`, `weight_traction` per investor

**`investor_pipeline`**
- `investor_user_id`, `founder_user_id`, `stage`, `notes`

**`subscription_usage`**
- `feature`, `usage_count`, `limit_count`, `reset_at` (monthly)

### Phase 3 Execution Tables

| Table | Agent | Purpose |
|-------|-------|---------|
| `deployed_sites` | Patel/Maya | Netlify deploy tracking |
| `investor_updates` | Felix/Sage | Sent investor emails via Resend |
| `applications` | Harper | Job applicants + LLM scores (0–100) |
| `deals` | Susi | CRM pipeline (lead → qualified → proposal → won/lost) |
| `proposals` | Susi | Sent proposals + open/reply tracking |
| `survey_responses` | Nova | PMF survey answers |
| `waitlist_signups` | Nova | Fake-door test signups |
| `tracked_competitors` | Atlas | Competitor price change tracking |
| `investor_contacts` | Sage | Investor list per founder |

---

## 11. Subscription Tiers

| Feature | Free Limit | Notes |
|---------|-----------|-------|
| Agent conversations | 50/month | Tracked in `subscription_usage` |
| Q-Score recalculations | 2/month | Tracked in `subscription_usage` |
| Investor connections | 3/month | Tracked in `subscription_usage` |
| Investor marketplace access | Q-Score ≥65 | Soft gate — blur overlay below threshold |

New accounts default to `subscription_tier: 'free'`. Limits reset monthly via `reset_at`.

---

## 12. Navigation Structure

5 items in `FounderSidebar` — file: `features/founder/components/FounderSidebar.tsx`

| Nav Item | Route | What's Inside |
|----------|-------|--------------|
| **Dashboard** | `/founder/dashboard` | Q-Score ring, live metrics (MRR/burn/runway/customers), dimension bars with expansion panel, score challenges, activity feed |
| **CXO Suite** | `/founder/cxo` | 9 agents — left sidebar (agent list with deliverable badges) + right panel (Chat tab / Deliverables tab) |
| **Investor Matching** | `/founder/matching` | Investor cards with match scores, connection flow, sent/accepted connections |
| **Academy** | `/founder/academy` | Upcoming workshops, mentor roster, cohort programs, Q-Score-linked resources |
| **Messages** | `/founder/messages` | CXO agent updates tab · Investor messages tab · Platform notifications tab |

**Full-screen flows (sidebar hidden via `app/founder/layout.tsx`):**
- `/founder/profile-builder` — has own 7-step left nav, no global sidebar
- `/founder/onboarding` — full-screen multi-step form
- `/founder/cxo/[agentId]` — individual agent workspace with own layout

---

## 13. Key Files Reference

| Area | File |
|------|------|
| Landing page | `app/page.tsx` |
| Founder layout (sidebar) | `app/founder/layout.tsx` |
| Dashboard | `app/founder/dashboard/page.tsx` |
| CXO Suite hub | `app/founder/cxo/page.tsx` |
| Agent chat workspace | `app/founder/agents/[agentId]/page.tsx` |
| Profile Builder | `app/founder/profile-builder/page.tsx` |
| Investor Matching | `app/founder/matching/page.tsx` |
| Investor Deal Flow | `app/investor/deal-flow/page.tsx` |
| Q-Score calculator | `features/qscore/calculators/prd-aligned-qscore.ts` |
| Dimension calculators | `features/qscore/calculators/dimensions/` |
| Sector weights | `features/qscore/utils/sector-weights.ts` |
| Agent score signal | `features/qscore/services/agent-signal.ts` |
| Agent definitions | `features/agents/data/agents.ts` |
| Artifact metadata | `features/agents/shared/constants/artifact-meta.ts` |
| Chat API | `app/api/agents/chat/route.ts` |
| Generate API | `app/api/agents/generate/route.ts` |
| Q-Score calculate API | `app/api/qscore/calculate/route.ts` |
| Q-Score latest API | `app/api/qscore/latest/route.ts` |
| Signup API | `app/api/auth/signup/route.ts` |
| OpenRouter helper | `lib/openrouter.ts` |
| Supabase browser client | `lib/supabase/client.ts` |
| Middleware (auth + rate limits) | `middleware.ts` |
