# Edge Alpha — Chief of Staff Requirements & Architecture Brief

> **Purpose:** Complete technical, product, and operational reference for the Edge Alpha platform. Written for a senior technical lead who needs to understand every layer of the system — no assumptions, no hand-waving.

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Tech Stack](#2-tech-stack)
3. [Repository Structure](#3-repository-structure)
4. [Environment Variables & API Keys](#4-environment-variables--api-keys)
5. [Authentication & Auth Flows](#5-authentication--auth-flows)
6. [Database Schema](#6-database-schema)
7. [Core Business Logic](#7-core-business-logic)
8. [AI Agent System](#8-ai-agent-system)
9. [Q-Score Engine](#9-q-score-engine)
10. [Investor Matching](#10-investor-matching)
11. [External Integrations](#11-external-integrations)
12. [Security Architecture](#12-security-architecture)
13. [API Route Inventory](#13-api-route-inventory)
14. [Cron Jobs & Automation](#14-cron-jobs--automation)
15. [Email System](#15-email-system)
16. [Frontend Architecture](#16-frontend-architecture)
17. [Infrastructure & Deployment](#17-infrastructure--deployment)
18. [Known Issues & Recommendations](#18-known-issues--recommendations)

---

## 1. Product Overview

Edge Alpha is a **two-sided founder–investor marketplace** with an AI-powered founder readiness score (Q-Score) at its core.

### What it does

**For Founders:**
- Collect a deep company profile across 6 investment dimensions
- Score the company 0–100 (Q-Score) using a 30-indicator algorithm
- Provide 9 AI executive agents (CFO, CLO, CMO, CPO, etc.) to generate investor-grade artifacts
- Gate access to investors behind a Q-Score ≥ 60 threshold
- Track progress, provide weekly AI digests, and surface improvement actions

**For Investors:**
- Receive a curated deal flow of pre-scored founders
- Filter by sector, stage, check size, geography
- Move founders through a 5-stage CRM pipeline
- Chat with an AI analyst about their deal flow
- Connect directly with founders via the messaging system

### User Roles
| Role | Signup Path | Profile Table | Dashboard |
|---|---|---|---|
| Founder | `/founder/onboarding` → `/api/auth/signup` | `founder_profiles` | `/founder/dashboard` |
| Investor | `/investor/onboarding` → `/api/auth/investor-signup` | `investor_profiles` | `/investor/dashboard` |
| Admin | Manual email whitelist in `ADMIN_EMAILS` env var | — | `/admin/metrics` |

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^16.1.6 |
| Language | TypeScript | ^5 (strict mode) |
| Runtime | Node.js on Vercel Serverless | — |
| Database | Supabase (PostgreSQL + Auth + Storage) | ^2.93.3 |
| LLM | Anthropic Claude | SDK 0.78.0 |
| Email | Resend | ^6.9.2 |
| Payments | Stripe | 22.0.2 |
| Rate Limiting | Upstash Redis | ^2.0.8 / ^1.38.0 |
| Animations | Framer Motion | ^12.26.2 |
| Icons | Lucide React | ^0.543.0 |
| Validation | Zod | ^4.3.6 |
| Document Parsing | pdf-parse + mammoth + adm-zip | latest |
| Testing | Jest (unit) + Playwright (E2E) | 30.x / 1.59.x |
| Build | Turbopack | bundled with Next |
| Styling | Tailwind CSS + inline styles | ^3.4.17 |
| Toasts | Sonner | ^2.0.7 |

### AI Models in Use
| Purpose | Model | Provider |
|---|---|---|
| Extraction, classification, summarization | `claude-haiku-4-5-20251001` | Anthropic |
| Generation, reasoning, artifacts | `claude-sonnet-4-6` | Anthropic |
| Optional monitoring proxy | Helicone | Optional |

---

## 3. Repository Structure

```
/
├── app/                        # Next.js App Router
│   ├── api/                    # ~270 API route handlers
│   │   ├── auth/               # Signup, login, confirm, reset
│   │   ├── agents/             # All 11 agent routes + chat + generate
│   │   ├── qscore/             # Score fetch, actions, benchmarks
│   │   ├── profile-builder/    # Submit, extract, preview, save
│   │   ├── investor/           # Deal flow, pipeline, billing, messages
│   │   ├── connections/        # Connection requests
│   │   ├── cron/               # Scheduled automation
│   │   └── webhooks/           # Stripe + Resend webhooks
│   ├── founder/                # All founder-facing pages
│   │   ├── dashboard/          # Main dashboard
│   │   ├── cxo/[agentId]/      # AI agent workspace
│   │   ├── settings/           # Account settings
│   │   └── ...                 # 14 more pages
│   ├── investor/               # All investor-facing pages
│   │   ├── dashboard/          # Deal flow overview
│   │   ├── deal-flow/          # Founder discovery
│   │   ├── pipeline/           # CRM kanban
│   │   └── ...                 # 8 more pages
│   ├── p/[userId]/             # Public founder portfolio
│   ├── pitch/[userId]/         # Public pitch page (investor-shareable)
│   ├── s/[surveyId]/           # Public PMF survey
│   └── apply/[userId]/[slug]/  # Public job application
│
├── features/                   # Domain feature modules
│   ├── agents/                 # 11 agent UI components + prompts
│   ├── founder/                # Founder hooks, services, components
│   ├── investor/               # Investor hooks, services, components
│   ├── qscore/                 # Q-Score calculators, scoring modules
│   ├── auth/                   # Auth hooks and services
│   ├── matching/               # Matching algorithm
│   └── shared/                 # Shared UI components + tokens
│
├── lib/                        # Shared utilities
│   ├── supabase/               # client.ts, server.ts, admin client
│   ├── llm/                    # provider.ts, router.ts, tools.ts
│   ├── email/                  # send.ts (Resend templates)
│   ├── auth/                   # verify.ts (session validation)
│   ├── constants/              # colors.ts, artifact-types.ts, etc.
│   ├── circuit-breaker.ts      # Failure resilience for external APIs
│   ├── claude.ts               # Anthropic SDK wrapper
│   ├── logger.ts               # Structured JSON logger
│   └── env.ts                  # Typed env var access
│
├── supabase/
│   └── migrations/             # 54 migration files (full history)
│
├── e2e/                        # Playwright E2E tests (14 spec files)
├── __tests__/                  # Jest unit tests
├── middleware.ts               # Rate limiting + CSRF + route protection
├── next.config.ts              # Security headers + redirects
├── vercel.json                 # Cron schedules
└── playwright.config.ts        # E2E test config
```

### Design Tokens (used everywhere)
```ts
// lib/constants/colors.ts
bg     = "#F9F7F2"  // page background (warm cream)
surf   = "#F0EDE6"  // surface / card background
bdr    = "#E2DDD5"  // border color
ink    = "#18160F"  // primary text
muted  = "#8A867C"  // secondary text

blue   = "#2563EB"
green  = "#16A34A"
amber  = "#D97706"
red    = "#DC2626"
```

---

## 4. Environment Variables & API Keys

### Required — App will not start without these

| Variable | Provider | Purpose | Client-exposed? |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | DB + auth URL | YES (NEXT_PUBLIC_) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client-side auth | YES (NEXT_PUBLIC_) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server admin access, bypasses RLS | NO — never expose |
| `ANTHROPIC_API_KEY` | Anthropic | All LLM calls (Claude) | NO |
| `RESEND_API_KEY` | Resend | Transactional + drip emails | NO |
| `RESEND_FROM_EMAIL` | — | Sender address (must be verified domain) | NO |
| `NEXT_PUBLIC_APP_URL` | — | Canonical URL for email links + redirects | YES (NEXT_PUBLIC_) |
| `CRON_SECRET` | — | Bearer token protecting all `/api/cron/*` routes | NO |

### Required for Billing

| Variable | Provider | Purpose |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe | Checkout, subscription management |
| `STRIPE_WEBHOOK_SECRET` | Stripe | Webhook signature verification |

### Optional — features degrade gracefully if absent

| Variable | Provider | Purpose | Fallback behavior |
|---|---|---|---|
| `TAVILY_API_KEY` | Tavily | Web research for agents | Returns null, agent skips web search |
| `HUNTER_API_KEY` | Hunter.io | Lead enrichment (Patel/Susi) | Returns "key not configured" |
| `NETLIFY_API_KEY` | Netlify | Landing page deployment | Deploy feature disabled |
| `UPSTASH_REDIS_REST_URL` | Upstash | Rate limiting | Rate limiting disabled entirely |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash | Rate limiting auth | Rate limiting disabled entirely |
| `RESEND_WEBHOOK_SECRET` | Resend | Webhook signature verification | Webhooks accepted unsigned |
| `HELICONE_API_KEY` | Helicone | LLM call monitoring/logging | Routes directly to Anthropic |
| `INTERNAL_API_SECRET` | — | Service-to-service auth | Routes return 401 |
| `ADMIN_EMAILS` | — | Comma-separated admin email whitelist | `/admin/*` returns 403 |

### Security Rules
- `SUPABASE_SERVICE_ROLE_KEY` must NEVER appear in any `NEXT_PUBLIC_` variable or be sent to the browser
- API keys should never be committed to git — use `.env.local` locally, Vercel dashboard in production
- Stripe restricted key (`rk_*`) is accepted from the client per-request and never stored

---

## 5. Authentication & Auth Flows

### Supabase Client Setup

| Client | File | Key Used | Use Case |
|---|---|---|---|
| Browser client | `lib/supabase/client.ts` | Anon key | Client components, user session |
| Server client | `lib/supabase/server.ts` | Anon key + cookies | Server components, API routes |
| Admin client | `lib/supabase/server.ts` → `createAdminClient()` | Service role key | User creation, bypassing RLS |

### Founder Signup Flow

```
POST /api/auth/signup
  ↓
  Zod validate (email, password, company details)
  ↓
  Admin client → supabase.auth.admin.createUser({ email, password, email_confirm: true })
  ↓
  INSERT founder_profiles (user_id, full_name, startup_name, industry, stage, role='founder')
  ↓
  INSERT qscore_history (overall_score=0, data_source='registration')
  ↓
  INSERT subscription_usage × 3 (agent_chat:50, qscore_recalc:2, investor_connection:3)
  ↓
  sendWelcomeAndConfirmEmail(email, token, confirmUrl)   [fire-and-forget]
  ↓
  Enrich problem/target via Claude (LLM clean-up)        [fire-and-forget]
  ↓
  Return 201 { user, profile }
```

### Investor Signup Flow

```
POST /api/auth/investor-signup
  ↓
  Admin client → createUser({ email, password, email_confirm: true })
  ↓
  Store confirmToken in user_metadata (NOT in investor_profiles yet)
  ↓
  Send welcome email                                      [fire-and-forget]
  ↓
  Return 200 { message, userId }
  (investor_profiles created later during 6-step onboarding)
```

### Email Confirmation Flow

```
GET /api/auth/confirm-email?token=<uuid>
  ↓
  Query founder_profiles WHERE email_confirm_token = token
  ↓
  If found + email_confirmed_at IS NULL:
    UPDATE email_confirmed_at=NOW(), email_confirm_token=NULL
    Redirect → /auth/confirm-email?status=success
  ↓
  If not found in founder_profiles → check investor_profiles (same logic)
  ↓
  If already confirmed → Redirect ?status=already
  ↓
  If invalid → Redirect ?status=invalid
```

### Login Flow

```
User fills /login form
  ↓
  supabase.auth.signInWithPassword({ email, password })  [client-side SDK]
  ↓
  On success: check investor_profiles.exists for user_id
    → If investor: router.push('/investor/dashboard')
    → If not: router.push('/founder/dashboard')
  ↓
  Honors ?next= param (sanitized: must start with '/')
```

### Google OAuth Flow

```
supabase.auth.signInWithOAuth({ provider: 'google' })
  ↓
  Redirect → Supabase Google auth
  ↓
GET /auth/callback?code=...
  ↓
  supabase.auth.exchangeCodeForSession(code)
  ↓
  Check investor_profiles → /investor/dashboard
  Check founder_profiles → /founder/dashboard
  Neither exists → create stub founder_profiles, redirect /founder/onboarding
```

### Session Architecture
- Sessions stored in **httpOnly cookies** via `@supabase/ssr`
- Middleware refreshes session tokens on every request to protected routes
- `supabase.auth.getUser()` used (not `getSession()`) — validates JWT on every protected API call
- Session verified in `lib/auth/verify.ts` → `verifyAuth()` function used in all protected API routes

### Role Determination
1. Check `investor_profiles` table for `user_id` → if row exists = investor
2. Check `founder_profiles` table for `user_id` → if row exists = founder
3. Neither → redirect to `/founder/onboarding`

### Middleware Protection

```
All /founder/* and /investor/* and /feed routes:
  → supabase.auth.getUser() validates JWT
  → No user → redirect /login?next=[pathname]

/founder/dashboard root:
  → Verify founder_profiles.role = 'founder'
  → If investor → redirect /investor/dashboard

/investor/dashboard root:
  → Verify investor_profiles row exists
  → If not → redirect /investor/onboarding
```

---

## 6. Database Schema

### Overview — 60+ tables across 8 domains

| Domain | Tables |
|---|---|
| Profiles | `founder_profiles`, `investor_profiles`, `demo_investors` |
| Scoring | `qscore_history`, `qscore_assessments`, `score_evidence`, `iq_scores`, `iq_indicator_scores`, `iq_indicators`, `iq_parameter_weights`, `qscore_thresholds`, `qscore_dimension_weights` |
| Agents | `agent_conversations`, `agent_messages`, `agent_artifacts`, `agent_actions`, `agent_memory`, `agent_activity`, `pending_actions` |
| Connections | `connection_requests`, `investor_pipeline`, `messages` |
| Sales/CRM | `deals`, `outreach_sends`, `proposals` |
| Hiring/Legal | `applications`, `legal_documents` |
| Content/Deploy | `deployed_sites`, `investor_updates`, `survey_responses`, `waitlist_signups` |
| Platform | `subscription_usage`, `notifications`, `notification_preferences`, `analytics_events`, `portfolio_views` |
| Observability | `rag_execution_logs`, `tool_execution_logs`, `artifact_embeddings`, `rag_score_cache` |
| Business Data | `tracked_competitors`, `investor_contacts`, `linear_tokens` |

---

### Core Tables — Full Column Reference

#### `founder_profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| user_id | UUID UNIQUE FK→auth.users | CASCADE DELETE |
| full_name | TEXT NOT NULL | — |
| startup_name | TEXT UNIQUE | — |
| industry | TEXT | — |
| stage | TEXT | CHECK: idea/mvp/pre-seed/seed/series-a/bootstrapped |
| subscription_tier | TEXT | DEFAULT 'free' |
| funding | TEXT | CHECK: pre-seed/seed/series-a/bootstrapped |
| role | TEXT | DEFAULT 'founder' |
| tagline | TEXT | — |
| bio | TEXT | — |
| website | TEXT | — |
| linkedin_url | TEXT | — |
| location | TEXT | — |
| avatar_url | TEXT | Supabase Storage URL |
| company_logo_url | TEXT | Supabase Storage URL |
| onboarding_completed | BOOLEAN | DEFAULT false |
| assessment_completed | BOOLEAN | DEFAULT false |
| startup_profile_data | JSONB | DEFAULT '{}' — raw assessment data |
| startup_profile_completed | BOOLEAN | DEFAULT false |
| email_confirmed_at | TIMESTAMPTZ | NULL until confirmed |
| email_confirm_token | UUID | Single-use, cleared on confirm |
| email_day1_sent | BOOLEAN | DEFAULT false — drip tracking |
| email_day7_sent | BOOLEAN | DEFAULT false — drip tracking |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS:** Users read/write own row only.

---

#### `investor_profiles`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| user_id | UUID UNIQUE FK→auth.users | CASCADE DELETE |
| full_name | TEXT NOT NULL | — |
| email | TEXT NOT NULL | — |
| phone | TEXT | — |
| linkedin_url | TEXT | — |
| firm_name | TEXT | — |
| firm_type | TEXT | CHECK: vc/pe/angel/family-office/corporate/accelerator |
| firm_size | TEXT | CHECK: 1-5/6-20/21-50/50+ |
| aum | TEXT | CHECK: <10m/10-50m/50-100m/100-500m/500m-1b/>1b |
| website | TEXT | — |
| location | TEXT | — |
| check_sizes | TEXT[] | Investment check ranges |
| stages | TEXT[] | Preferred startup stages |
| sectors | TEXT[] | Preferred sectors (GIN index) |
| geography | TEXT[] | Target geographies (GIN index) |
| thesis | TEXT | Full investment thesis text |
| decision_process | TEXT | CHECK: 1-2weeks/2-4weeks/1-2months/2-3months/3+months |
| onboarding_completed | BOOLEAN | DEFAULT false |
| verified | BOOLEAN | DEFAULT false |
| ai_personalization | JSONB | AI-computed match scores per founder |
| demo_investor_id | UUID FK→demo_investors | For linking to demo data |
| subscription_tier | TEXT | DEFAULT 'free' CHECK: free/pro |
| stripe_customer_id | TEXT | — |
| stripe_subscription_id | TEXT | — |
| subscription_status | TEXT | DEFAULT 'inactive' |
| subscription_current_period_end | TIMESTAMPTZ | — |
| email_confirmed_at | TIMESTAMPTZ | — |
| email_confirm_token | UUID | — |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS:** Investors read/write own. Verified investors visible to founders for matching.

---

#### `qscore_history`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| user_id | UUID FK→auth.users | CASCADE DELETE |
| assessment_id | UUID FK→qscore_assessments | — |
| overall_score | INT | CHECK 0–100 |
| percentile | INT | CHECK 0–100 |
| grade | TEXT | CHECK: A+/A/B+/B/C+/C/D/F |
| p1_score | INT | Market Readiness (0–100) |
| p2_score | INT | Market Potential (0–100) |
| p3_score | INT | IP & Defensibility (0–100) |
| p4_score | INT | Founder & Team (0–100) |
| p5_score | INT | Structural Impact (0–100) |
| p6_score | INT | Financials (0–100) |
| previous_score_id | UUID FK→qscore_history | Self-ref for delta chain |
| data_source | TEXT | onboarding/assessment/agent_completion/profile_builder |
| source_artifact_type | TEXT | Which artifact triggered score |
| assessment_data | JSONB | Full assessment snapshot |
| ai_actions | JSONB | Cached "What gets me to 80?" recommendations |
| calculated_at | TIMESTAMPTZ | DEFAULT NOW() |

**View:** `qscore_with_delta` — joins previous_score_id, exposes overall_change + p1–p6_change.
**RLS:** Users read/write own.

---

#### `agent_artifacts`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| conversation_id | UUID FK→agent_conversations | CASCADE DELETE |
| user_id | UUID FK→auth.users | CASCADE DELETE |
| agent_id | TEXT | e.g. 'patel', 'felix', 'atlas' |
| artifact_type | TEXT | CHECK: 59 valid types (see §8) |
| title | TEXT NOT NULL | — |
| content | JSONB NOT NULL | Full artifact payload |
| version | INT | DEFAULT 1 |
| icp_id | TEXT | [COUNTRY]_[SEGMENT]_[USECASE]_v1 format |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS:** Users read/write own.

---

#### `connection_requests`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| founder_id | UUID FK→auth.users | — |
| investor_id | UUID FK→auth.users | Real investor (nullable) |
| demo_investor_id | UUID | Demo investor ref (no FK) |
| status | TEXT | pending/viewed/accepted/declined/meeting_scheduled |
| personal_message | TEXT | Founder's outreach note |
| founder_qscore | INT | Q-Score snapshot at request time |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() |

**Constraints:** UNIQUE (founder_id, demo_investor_id), UNIQUE (founder_id, investor_id).
**RLS:** Founder can INSERT + read own. Investor can read + update relevant.

---

#### `subscription_usage`
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| user_id | UUID FK→auth.users | CASCADE DELETE |
| feature | TEXT | CHECK: agent_chat/investor_connection/qscore_recalc/workshop |
| usage_count | INT | DEFAULT 0 |
| limit_count | INT | Per-tier limit |
| reset_at | TIMESTAMPTZ | Monthly reset window |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**UNIQUE:** (user_id, feature).
**RPC:** `increment_usage_if_allowed(user_id, feature)` → (allowed BOOL, remaining INT) — row-level locked, atomic.

---

#### `deals` (Founder CRM)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| user_id | UUID FK→auth.users | — |
| company | TEXT NOT NULL | — |
| contact_name / email / title | TEXT | — |
| stage | TEXT | lead/qualified/proposal/negotiating/won/lost |
| value | TEXT | Deal size (free text) |
| notes | TEXT | — |
| next_action | TEXT | — |
| next_action_date | DATE | Used for stale-deal alerts |
| source | TEXT | manual/susi_suggested/proposal_sent |
| created_at / updated_at | TIMESTAMPTZ | — |

---

#### `messages` (Real 2-way messaging)
| Column | Type | Notes |
|---|---|---|
| id | UUID PK | — |
| connection_request_id | UUID FK→connection_requests | CASCADE DELETE |
| sender_id | UUID FK→auth.users | — |
| recipient_id | UUID FK→auth.users | — |
| body | TEXT NOT NULL | CHECK length 1–4000 |
| read_at | TIMESTAMPTZ | NULL until read |
| created_at | TIMESTAMPTZ | DEFAULT NOW() |

**RLS:** Sender + recipient can SELECT. Sender can INSERT. Recipient can UPDATE read_at.

---

### Database Functions & RPCs

#### `increment_usage_if_allowed(p_user_id UUID, p_feature TEXT)`
- Acquires row-level lock (FOR UPDATE) on subscription_usage
- Checks reset window expiry; zeros counter if expired
- Returns `(allowed BOOL, remaining INT, usage_id UUID)`
- Used for atomic usage-limit enforcement (no race conditions)

#### `match_artifact_embeddings(query_embedding vector(1536), match_user_id UUID, match_threshold FLOAT, match_count INT)`
- pgvector cosine similarity search over `artifact_embeddings`
- Returns: `(id, artifact_id, chunk_index, chunk_text, metadata, similarity)`

#### `set_updated_at()` — trigger function
- Sets `NEW.updated_at = NOW()` before UPDATE
- Applied to: investor_profiles, investor_pipeline, notification_preferences, deals, outreach_sends

---

### RLS Policy Summary

All user-owned tables follow the pattern:
```sql
SELECT: auth.uid() = user_id
INSERT: auth.uid() = user_id
UPDATE: auth.uid() = user_id
DELETE: auth.uid() = user_id
```

**Exceptions:**
- `demo_investors` — Public SELECT (no auth required)
- `iq_indicators`, `iq_parameter_weights`, `qscore_thresholds`, `qscore_dimension_weights` — Public SELECT (config tables)
- `survey_responses`, `applications` — Public INSERT (anyone can submit)
- `tool_execution_logs` — Service role INSERT; user SELECT own
- `notifications` — Service role INSERT; user SELECT + UPDATE own read status
- `agent_memory` — Service role manages; user SELECT own
- `messages` — Sender INSERT; sender+recipient SELECT; recipient UPDATE read_at

---

### Storage Buckets

| Bucket | Public? | Max Size | Allowed MIME Types |
|---|---|---|---|
| `avatars` | Yes | 5 MB | image/jpeg, image/png, image/webp |
| `logos` | Yes | 5 MB | image/jpeg, image/png, image/webp, image/svg+xml |

Files scoped per user: `{user_id}/{filename}`.

---

## 7. Core Business Logic

### Usage Limits (Free Tier)
| Feature | Limit | Reset |
|---|---|---|
| Agent chat | 50/month | Monthly |
| Q-Score recalc | 50/month | Monthly |
| Investor connections | 50/month | Monthly |
| Workshop | 50/month | Monthly |

Enforced via `increment_usage_if_allowed` RPC with row-level lock. Fail-open if RPC fails (logs warning).

### Investor Access Gate
- Founder must have `email_confirmed_at` set
- Founder must have `Q-Score ≥ 60`
- Below threshold: investor list shown with blur overlay, connections blocked
- Above threshold: investor cards visible, connections allowed (subject to monthly limit)

### Profile Builder → Q-Score Pipeline

```
Founder fills 5 sections:
  Section 1: Customer Validation (P1 signals)
  Section 2: Market & Competition (P2 signals)
  Section 3: Product & IP (P3 signals)
  Section 4: Founder & Team (P4 signals)
  Section 5: Financials (P5–P6 signals)
  ↓
POST /api/profile-builder/submit
  ↓
  Minimum 30% completion on ≥1 section required
  24-hour hard throttle on recalculation
  Monthly limit check (RPC)
  ↓
  Parallel enrichment:
    - Confidence engine (data quality scoring)
    - Artifact gap-fill (patch from agent artifacts)
    - AI reconciliation (consistency checks, non-blocking)
  ↓
  calculateQScore(data, stage, sector, track, weights)
  ↓
  INSERT qscore_history (with previous_score_id for delta chain)
  Cache AI actions ("What gets me to 80?")
  ↓
  Return { score, breakdown, delta, actions }
```

---

## 8. AI Agent System

### The 11 Agents

| Agent | Role | Dimension Boosted | Artifact Types |
|---|---|---|---|
| **Patel** | GTM / Sales | P1 Market Readiness | ICP, Outreach Seq, Battle Card, GTM Playbook, Sales Script + D1-D4 |
| **Susi** | CRO / Deal pipeline | P1 | Call Playbook, Pipeline Report, Proposal, Win/Loss |
| **Maya** | CMO / Brand | P2 Market Potential | Content Calendar, SEO Audit, Press Kit, Newsletter, Brand Health |
| **Riley** | Growth | P1 | Growth Model, Paid Campaign, Referral Program, Launch Playbook |
| **Felix** | CFO / Finance | P6 Financials | Financial Model, Investor Update, Board Deck, Cap Table, Fundraising Narrative |
| **Leo** | CLO / Legal | P3 IP & Defensibility | NDA, SAFE Note, Contractor Agreement, Privacy Policy, IP Audit |
| **Harper** | CPO / Hiring | P4 Founder & Team | Job Description, Interview Scorecard, Offer Letter, Onboarding Plan |
| **Nova** | Research / PMF | P1 | Retention Report, Product Insight, Experiment Design, Roadmap, User Persona |
| **Atlas** | CSO / Competitive | P2 | Competitor Weekly, Market Map, Review Intelligence |
| **Sage** | CEO / Strategy | P5 Structural Impact | Investor Readiness, Contradiction Report, OKR Health, Crisis Playbook |
| **Carter** | CS / Retention | P1 | Customer Health, Churn Analysis, QBR Deck, Expansion Playbook |

### Chat Pipeline (`POST /api/agents/chat`)

```
Request: { agentId, message, conversationHistory, userContext, conversationId, stream }
  ↓
1. Load agent system prompt (agent-specific, ~2000 tokens)
2. Inject context:
   - Founder profile (stage, sector, raised, team)
   - Agent memory (prior session summaries)
   - Startup state (extracted facts from prior artifacts)
   - Other agents' artifacts ("FOUNDER CONTEXT")
   - Pending delegations (cross-agent tasks)
   - Recent activity (last 7 days)
3. Send to Claude (haiku for fast, sonnet for generation)
4. Detect <tool_call id="..." name="..."> XML tags in response
5. If tool_call found:
   - Execute tool via executeTool()
   - Log to tool_execution_logs (latency_ms, cost_usd, cache_hit)
   - Append tool result to conversation
6. Return response (streaming SSE or JSON)
7. Save agent memory + session summary
```

### Artifact Generation (`POST /api/agents/generate`)

```
Two-pass generation:
  Pass 1: Extract key context facts from conversation
  Pass 2: Generate artifact JSON using extracted context
  ↓
  Feature flags:
    FF_ARTIFACT_SELF_CRITIQUE (true) → 2-pass self-critique + patch
    FF_CROSS_AGENT_ORCHESTRATION (true) → delegate sub-tasks to other agents
  ↓
  Apply agent score signal (one-time Q-Score boost per artifact type)
  ↓
  INSERT agent_artifacts (content, version, type, user_id, conversation_id)
  ↓
  Auto-create score_evidence row (type='agent_artifact', status='verified')
  ↓
  Gap-fill profile_builder_data where fields are null (never overwrites)
```

### One-Time Score Boost per Artifact
| Artifact | Dimension | Boost |
|---|---|---|
| GTM Playbook | P1 | +6 pts |
| Financial Summary | P6 | +6 pts |
| ICP Document | P2 | +5 pts |
| Hiring Plan | P4 | +5 pts |
| PMF Survey | P1 | +5 pts |
| Competitive Matrix | P2 | +5 pts |
| Battle Card | P2 | +4 pts |
| Sales Script | P1 | +4 pts |
| Strategic Plan | P2 | +4 pts |
| Brand Messaging | P2 | +3 pts |
| Outreach Sequence | P1 | +3 pts |
| Legal Checklist | P3 | +3 pts |
| Interview Notes | P1 | +3 pts |

Quality multiplier: full (>800 chars) = 1.0×, partial (300–800) = 0.6×, minimal (<300) = 0.3×
Idempotent: one boost per artifact type per user (checked before applying).

### Tool Types (16 registered)

All 12 artifact types + `lead_enrich` (Hunter.io domain search) + `web_research` (Tavily + 2nd LLM pass) + `create_deal` (INSERT to deals table) + `competitive_matrix` (live Tavily data).

### Agent Memory Architecture
- `agent_memory` table: per-user × per-agent relationship tier (stranger → acquainted → familiar → trusted)
- Session summaries saved after each conversation
- Injected into next session's context as "What you built together" and "Founder context from other advisers"

---

## 9. Q-Score Engine

### Six Dimensions (P1–P6)

| # | Name | Indicators | Sector weight range |
|---|---|---|---|
| P1 | Market Readiness | Early Signal, Willingness to Pay, Speed, Durability, Scale | 0.08–0.28 |
| P2 | Market Potential | Market Scale, Revenue Ceiling, Adoption Velocity, Competitive Density, Disruptability | 0.18–0.24 |
| P3 | IP & Defensibility | Proprietary Tech, Moat Sustainability, Barrier Height, Patent Portfolio, IP Risk | 0.06–0.32 |
| P4 | Founder & Team | Domain Depth, Founder-Market Fit, Prior Experience, Leadership Coverage, Team Cohesion | 0.14–0.26 |
| P5 | Structural Impact | Business Model, Margin Expansion, Unit Economics, GTM Repeatability | 0.05–0.18 |
| P6 | Financials | Revenue Scale, Burn Efficiency, Runway, Unit Economics, Gross Margin | 0.08–0.27 |

### Scoring Formula

```
// For each active indicator:
confidence_multiplier = clamp(indicator.confidence / 0.90, 0.50, 1.00)
weighted_score = indicator.rawScore × confidence_multiplier

// Aggregate:
activeRaw = Σ(weighted_score for active indicators)
denominator = activeIndicators.length × 5   // DYNAMIC denominator
rawIQ = (activeRaw / denominator) × 100

// Sparsity penalty (max −5 pts):
sparsityPenalty = min(5, max(0, (20 − activeIndicators.length) × 0.5))

// Final:
finalIQ = rawIQ − sparsityPenalty
partialIQ = finalIQ × (answeredParameters / 6)
```

### Key Rules

1. **P6 excluded for pre-revenue early-stage founders** — all 5 P6 indicators removed from numerator and denominator
2. **Confidence multipliers are applied at calculation time** — stored rawScore never modified
3. **Sparsity penalty** — −0.5 pts per indicator below 20 active (max −5 pts)
4. **Stage multipliers** — Early/Mid/Growth each apply per-parameter multipliers, then renormalize to sum to 1.0
5. **Temporal decay** (presentation-only, not stored): <90d = 1.0×, <180d = 0.975×, <270d = 0.95×, <365d = 0.90×, ≥365d = 0.80×
6. **Bluff detection** — incomplete sections blend score toward 30-point baseline: `finalScore = score × (1 − blend × 0.3) + 30 × blend × 0.3`

### Grade Thresholds
| Grade | Score |
|---|---|
| A+ | ≥ 80 |
| A | ≥ 68 |
| B+ | ≥ 60 |
| B | ≥ 52 |
| C+ | ≥ 44 |
| C | ≥ 36 |
| D | ≥ 26 |
| F | < 26 |

### Sector Weight Profiles (15 sectors)

Key examples:
- `b2b_saas`: P1=0.24, P2=0.18, P3=0.10, P4=0.16, P5=0.05, P6=0.27 (financial-heavy)
- `biotech`: P1=0.08, P2=0.18, P3=0.32, P4=0.26, P5=0.08, P6=0.08 (IP + team heavy)
- `marketplace`: P1=0.28, P2=0.24, P3=0.08, P4=0.16, P5=0.06, P6=0.18 (market-heavy)
- Others: fintech, consumer, climate, hardware, edtech, healthtech, ai_ml, enterprise_software, logistics, agriculture, proptech

---

## 10. Investor Matching

### Match Score Formula

```
score = 40                              // base
score += 30  if sector_match           // founder industry ↔ investor.sectors
score += 20  if stage_match            // founder stage ↔ investor.stages
score += 10  if qscore ≥ 80
score += 7   if qscore ≥ 65
score += 3   if qscore ≥ 50
score += (response_rate / 100) × 5    // up to +5 pts
final = min(100, score)
```

### Sector Alias Map (partial)
- 'ai-ml' → ['ai/ml', 'ai', 'ml', 'artificial intelligence', 'machine learning', 'deep tech']
- 'saas' → ['saas', 'b2b saas', 'software', 'enterprise software']
- 'healthtech' → ['healthtech', 'health', 'medtech', 'digital health', 'biotech']

### Investor Pipeline Stages (CRM)
`watching` → `meeting` → `in_dd` → `portfolio` / `passed`

### Deal Flow API (`GET /api/investor/deal-flow`)
- Returns top 50 founders sorted by recency
- Applies temporal decay to displayed Q-Score
- Enriches with: weekly activity count, artifact count, investor custom weights
- Blocked for `free` tier investors (auto-enrolls to pro on first access)

---

## 11. External Integrations

### Anthropic (Claude)
- **SDK:** `@anthropic-ai/sdk` 0.78.0
- **Models:** haiku-4-5 (fast) + sonnet-4-6 (capable)
- **Routing:** task class → model tier (extraction/classification → haiku; generation/reasoning → sonnet)
- **Token limits:** extraction=2000, generation=8000, reasoning=1200, classification=250, summarization=600
- **Retry:** exponential backoff, 3 attempts on rate limits
- **Prompt caching:** `anthropic-beta: prompt-caching-2024-07-31` header enabled
- **Monitoring:** Optional Helicone proxy (`HELICONE_API_KEY`)
- **Circuit breaker:** 3 failures in 60s → 5-minute open state

### Resend (Email)
- **Purpose:** All transactional + drip emails
- **Client:** `resend` ^6.9.2
- **From:** Edge Alpha branding, must use verified domain
- **Webhook:** HMAC-SHA256 (Svix-style), 5-minute replay guard, idempotency tracked
- **Retry:** Resend handles delivery retries automatically

### Stripe (Billing)
- **Purpose:** Investor pro subscriptions
- **API version:** `2026-03-25.dahlia`
- **Webhooks:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- **Webhook security:** `stripe.webhooks.constructEvent()` signature verification required
- **Restricted keys:** Founders can connect own Stripe account via `rk_*` restricted key (not stored, use-once)

### Tavily (Web Research)
- **Endpoint:** `https://api.tavily.com/search`
- **Purpose:** Live competitor data, market sizing, news for agents
- **Circuit breaker:** Yes, 15s timeout
- **Graceful degrade:** Returns null, agents skip web search step

### Hunter.io (Lead Enrichment)
- **Endpoint:** `https://api.hunter.io/v2/domain-search`
- **Purpose:** Find decision-maker emails at target companies
- **Confidence filter:** ≥50%, top 10 results returned
- **Graceful degrade:** Returns "key not configured" message

### Netlify (Landing Page Deploy)
- **Purpose:** Deploy AI-generated landing pages from Nova/Patel agents
- **Flow:** Create site → Create deploy with SHA1 hash → Upload HTML
- **Result URL:** `https://{siteId}.netlify.app`
- **Circuit breaker:** Open after 3 failures in 60s

---

## 12. Security Architecture

### Headers (configured in `next.config.ts`)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### Rate Limits (Upstash Redis, sliding window, per-IP)

| Endpoint | Limit | Window |
|---|---|---|
| `POST /api/agents/chat` | 12 req | 1 min |
| `POST /api/agents/generate` | 5 req | 1 min |
| `POST /api/qscore/calculate` | 5 req | 1 min |
| `POST /api/agents/research` | 10 req | 1 min |
| `GET /api/qscore/actions` | 6 req | 1 min |
| `POST /api/analyze-pitch` | 8 req | 1 min |
| `POST /api/auth/signup` | 5 req | 60 min |
| `POST /api/auth/reset-password` | 3 req | 15 min |

Response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`.

### CSRF Protection
- All POST/PUT/PATCH/DELETE on `/api/*` validate `Origin` header vs `Host`
- Mismatch → 403 Forbidden
- Only triggered when `Origin` is present (server-to-server not blocked)

### Webhook Signature Verification
| Service | Method |
|---|---|
| Stripe | `stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)` |
| Resend | Svix HMAC-SHA256 + `svix-timestamp` 5-min replay guard |

### File Upload Security
- Image upload: magic-byte validation (not just MIME), 5 MB limit, Supabase Storage (user-scoped)
- Document upload (thesis/pitch deck): PDF + DOCX only, 10 MB limit, text extracted + capped at 4000 chars

### Cron Protection
All `/api/cron/*` routes require: `Authorization: Bearer <CRON_SECRET>`

### Known Issues / Recommendations

1. **HIGH:** Stripe webhook has no idempotency check — retry storms could double-process subscription events. Add `processed_webhook_events` table.
2. **HIGH:** Login endpoint not rate-limited — brute-force password attacks possible on known emails.
3. **MEDIUM:** `x-forwarded-for` rate-limit key can be spoofed if not behind Vercel's trusted proxy.
4. **MEDIUM:** Stripe restricted key and Hunter API key passed in POST body — could appear in access logs. Move to request headers.
5. **MEDIUM:** Helicone proxy logs all system prompts — ensure vendor NDA in place.
6. **LOW:** Circuit breaker state is in-memory — resets on serverless cold start. Use Redis-backed circuit breaker for production.
7. **LOW:** Admin email whitelist parsing is fragile (comma-split) — use JSON array format.

---

## 13. API Route Inventory

### Auth (`/api/auth/`)
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/signup` | POST | None | Founder account creation |
| `/investor-signup` | POST | None | Investor account creation |
| `/confirm-email` | GET | None | Token-based email confirmation |
| `/resend-confirmation` | POST | Session | Resend confirmation email |
| `/reset-password` | POST | None | Send password reset email |
| `/session` | GET | None | Return current user or null |

### Agents (`/api/agents/`)
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/chat` | POST | Session | Send message to any agent |
| `/generate` | POST | Session | Generate artifact (2-pass) |
| `/generate/run` | POST | Internal secret | Async artifact job runner |
| `/generate/status` | GET | Session | Poll async job status |
| `/artifacts` | GET/POST | Session | CRUD on agent_artifacts |
| `/context` | GET | Session | Fetch agent context bundle |
| `/coordinate` | POST | Session | Cross-agent orchestration |
| `/conversations` | GET/POST | Session | List/create conversations |
| `/conversations/[id]` | GET/PATCH/DELETE | Session | Single conversation |

Plus 9 agent-specific sub-namespaces (`/atlas/*`, `/felix/*`, `/harper/*`, `/leo/*`, `/maya/*`, `/nova/*`, `/patel/*`, `/sage/*`, `/susi/*`) with 10–18 routes each.

### Q-Score (`/api/qscore/`)
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/latest` | GET | Session | Current score + breakdown |
| `/actions` | GET/POST | Session | "What gets me to 80?" (cached or regenerate) |
| `/benchmarks` | GET | Session | Peer percentile comparisons |
| `/activity-boost` | POST | Session | Apply activity-based score nudge |
| `/priority` | GET | Session | Highest-impact next actions |
| `/thresholds` | GET | Public | Score tier config (config table) |

### Profile Builder (`/api/profile-builder/`)
| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/submit` | POST | Session | Submit profile + recalculate Q-Score |
| `/extract` | POST | Session | Extract data from uploaded document |
| `/linkedin-enrich` | POST | Session | Enrich from LinkedIn URL |
| `/preview` | GET | Session | Preview score without committing |
| `/save` | POST | Session | Save draft progress |
| `/draft` | GET | Session | Retrieve saved draft |
| `/reset` | POST | Session | Clear assessment data |
| `/upload` | POST | Session | Upload document for extraction |

### Investor (`/api/investor/`)
| Route | Method | Purpose |
|---|---|---|
| `/deal-flow` | GET | Scored founder list |
| `/startup/[id]` | GET | Deep-dive founder data |
| `/startup/[id]/chat` | POST | AI chat about a specific founder |
| `/startup/[id]/memo` | POST | Generate deal memo |
| `/pipeline` | GET/POST | CRM pipeline entries |
| `/connections` | GET | Connection status map |
| `/messages` | GET/POST | Investor messages |
| `/messages/[id]` | GET | Single message thread |
| `/ai-analysis` | GET/POST | Portfolio AI analysis |
| `/billing/checkout` | POST | Create Stripe checkout session |
| `/billing/portal` | POST | Open Stripe customer portal |
| `/billing/status` | GET | Current subscription status |
| `/personalize` | POST | Re-run AI personalization on founders |
| `/weights` | GET/POST | Custom P1-P6 dimension weights |

### Connections (`/api/connections/`)
| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Status map keyed by demo_investor_id |
| `/` | POST | Submit connection request (idempotent) |
| `/rationale` | POST | Generate AI match rationale |

### Cron (`/api/cron/`)
| Route | Schedule | Purpose |
|---|---|---|
| `/drip-emails` | Daily 10:00 UTC | Day-1 and Day-7 reengagement emails |
| `/weekly-automation` | Mon 09:00 UTC | Weekly founder digest (Sage, Felix, Carter, Susi) |
| `/update-benchmarks` | Monthly | Refresh Q-Score percentile benchmarks |

---

## 14. Cron Jobs & Automation

### Vercel Cron Schedule (`vercel.json`)
```json
[
  { "path": "/api/agents/schedule/run",     "schedule": "0 8 * * *"  },
  { "path": "/api/cron/weekly-automation",  "schedule": "0 9 * * 1"  },
  { "path": "/api/agents/atlas/weekly-scan","schedule": "0 8 * * 1"  },
  { "path": "/api/cron/drip-emails",        "schedule": "0 10 * * *" }
]
```

All protected by `Authorization: Bearer <CRON_SECRET>`.

### Drip Email Logic (`/api/cron/drip-emails`)
- **Day-1 window:** 23–25 hours post-signup → "Your Q-Score is 0, fix it in 5 minutes"
  - Skip if user already has agent artifacts (= already engaged)
  - Sets `email_day1_sent = true`
- **Day-7 window:** 167–169 hours post-signup → "9 AI advisors are waiting"
  - Skip if user already has agent artifacts
  - Sets `email_day7_sent = true`
- Batch: 50 founders per run

### Weekly Automation (`/api/cron/weekly-automation`)
Sends 4 optional emails per opted-in founder:

| Email | Agent | Trigger | Opt-out flag |
|---|---|---|---|
| OKR Standup | Sage | Always | `weeklyDigest: false` |
| Runway Alert | Felix | Runway < 6 months | `runwayAlerts: false` |
| Churn Alert | Carter | Churn >8% OR Day-30 retention <30% | `churnAlerts: false` |
| Stale Deals | Susi | Deals not updated in 7+ days | `dealAlerts: false` |

Opt-out preferences stored in `notification_preferences` JSONB. Unsubscribe via `/api/unsubscribe?token=<encoded>`.

---

## 15. Email System

### Provider: Resend
- All emails sent from `lib/email/send.ts`
- From address: `Edge Alpha <noreply@edgealpha.ai>` (must be verified domain in Resend)
- Templates: branded HTML shell with warm cream background, Edge Alpha header, CTA buttons

### Email Types

| Type | Trigger | Function |
|---|---|---|
| Welcome + Confirm | Founder signup | `sendWelcomeAndConfirmEmail()` |
| Confirm only | Manual resend | `sendConfirmationOnlyEmail()` |
| Connection accepted | Investor accepts | `sendConnectionAcceptedEmails()` — sends to both parties |
| Day-1 drip | Cron, 23-25h post-signup | Profile builder nudge |
| Day-7 drip | Cron, 167-169h post-signup | AI advisors nudge |
| Weekly OKR | Cron, Monday | Sage strategic update |
| Runway alert | Cron, Monday | Felix burn/runway warning |
| Churn alert | Cron, Monday | Carter retention warning |
| Stale deals | Cron, Monday | Susi deal follow-up |
| Investor update | Felix agent | `/api/agents/felix/investor-update` |

### Webhook Tracking
- Resend delivers events to `/api/webhook/resend`
- Events: email.delivered, email.opened, email.link_clicked, email.bounced, email.complained
- Updates `outreach_sends.status` accordingly (bounced always overrides other statuses)
- Idempotency via `processed_webhook_events` table

---

## 16. Frontend Architecture

### Layout Hierarchy
```
app/layout.tsx (root)
  └── AuthProvider + QScoreProvider + Toaster
      ├── app/founder/layout.tsx
      │    └── FounderSidebar (52px collapsed, hidden during onboarding)
      │        └── [founder pages]
      └── app/investor/layout.tsx
           └── InvestorSidebar (52px collapsed)
               + EmailConfirmBanner
               └── [investor pages]
```

### State Management
- **No Redux/Zustand** — React hooks + Context only
- **Primary data:** Supabase via API routes (no direct DB from client)
- **Session state:** Supabase SSR cookies (auto-managed)
- **Local fallback:** `localStorage` for assessment data (legacy/offline)
- **Toast notifications:** Sonner provider at root

### Key Client Hooks
| Hook | Location | Purpose |
|---|---|---|
| `useFounderData()` | `features/founder/hooks/useFounderData` | Profile + metrics + health — 3-tier fallback |
| `useMetrics(refreshTrigger)` | same | Financial KPIs, re-fetches on trigger |
| `useFounderProfile()` | same | Profile only + PATCH |
| `useDashboardData()` | same | Dashboard aggregations |
| `useActivity()` | same | Activity feed |
| `useNotifications()` | same | Notification preferences + inbox |
| `useQScore()` | `features/qscore/` | Context provider, score state |

### Routing — Public vs Protected
| Route Pattern | Auth Required |
|---|---|
| `/`, `/login`, `/reset-password`, `/update-password` | No |
| `/founder/onboarding`, `/investor/onboarding` | No |
| `/s/[surveyId]`, `/apply/[userId]/[slug]` | No |
| `/p/[userId]`, `/pitch/[userId]` | No |
| `/auth/confirm-email`, `/auth/callback` | No |
| `/feed`, `/library` | Yes |
| `/founder/*` (except onboarding) | Yes (founder role) |
| `/investor/*` (except onboarding) | Yes (investor role) |
| `/admin/*` | Yes + admin email whitelist |

### Page Redirects (`next.config.ts`)
```
/founder/workspace      → /founder/cxo           (302)
/founder/pitch-deck     → /founder/cxo/sage       (302)
/founder/metrics        → /founder/dashboard      (302)
/founder/portfolio      → /founder/dashboard      (302)
/founder/activity       → /founder/messages       (302)
/library                → /founder/academy        (302)
/founder/library        → /founder/academy        (302)
/founder/startup-profile → /founder/settings?tab=company (302)
```

### Security Headers (applied to all routes)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

---

## 17. Infrastructure & Deployment

### Vercel Configuration
- **Dev server:** `next dev --turbopack`
- **Build:** `next build --turbopack`
- **Server Actions body limit:** 10 MB (for file uploads)
- **Image optimization:** Supabase CDN domains only (`*.supabase.co`, `*.supabase.in`)
- **Cron jobs:** 4 scheduled routes (see §14)

### Environment Setup
- Local: `.env.local` (gitignored)
- Production: Vercel environment variables dashboard
- Validation: `instrumentation.ts` validates critical vars on server startup — throws on missing Supabase/Anthropic keys

### Database
- Supabase PostgreSQL (hosted)
- pgvector extension for artifact embeddings
- 54 migration files in `supabase/migrations/` — apply with `supabase db push`
- Realtime enabled on notification tables
- Storage buckets: `avatars`, `logos`

### Testing
```bash
npm test           # Jest unit tests
npm run test:watch # Jest watch mode
npm run test:e2e   # Playwright E2E (requires running dev server)
npm run test:e2e:ui # Playwright UI mode
```

Playwright config: single worker, sequential, chromium only, 2 retries on CI.

---

## 18. Known Issues & Recommendations

### Critical (fix before production traffic)

1. **Stripe webhook idempotency** — No duplicate-event detection. If Stripe retries a webhook, subscription could be updated multiple times. Fix: add `processed_webhook_events` check (Resend already has this pattern).

2. **Login endpoint not rate-limited** — `/login` calls Supabase client SDK, never passes through middleware rate limiting. Brute-force risk on known email addresses. Fix: add `/api/auth/login` proxy route with rate limit, or use Supabase's built-in rate limiting.

### High (fix before scaling)

3. **In-memory circuit breakers** — State resets on every Vercel cold start. With >1 serverless instance, each has independent state. Fix: move to Redis-backed circuit breaker using existing Upstash connection.

4. **IP spoofing via x-forwarded-for** — Rate limiting uses the first IP in `x-forwarded-for` without trusted-proxy validation. Fix: configure Vercel trusted proxy ranges and validate header source.

### Medium (fix within 30 days)

5. **API keys in POST body** — Stripe restricted key and Hunter API key passed in JSON body, visible in access logs. Fix: use `X-Stripe-Restricted-Key` and `X-Hunter-Key` request headers.

6. **Helicone logs system prompts** — If `HELICONE_API_KEY` is set, all agent system prompts (which include founder data) are logged to Helicone's servers. Ensure vendor NDA and data residency compliance.

7. **Admin email parsing** — Comma-split `ADMIN_EMAILS` breaks on emails containing commas (edge case but fragile). Fix: use `ADMIN_EMAILS_JSON='["a@b.com","c@d.com"]'`.

### Low (track as tech debt)

8. **No global error boundary** — No Sentry or equivalent. Uncaught errors in server components surface as Next.js default error page. Fix: add Sentry with source maps.

9. **Public pages not SEO-optimized** — `/p/[userId]` and `/pitch/[userId]` are public and likely indexed but have no OG meta tags or structured data. Fix: add `generateMetadata()` to both pages.

10. **Demo investor connections have no FK** — `connection_requests.demo_investor_id` has no foreign key to `demo_investors`. If a demo investor row is deleted, orphaned connection records persist. Fix: add FK with CASCADE DELETE.

---

*Last updated: 2026-05-21 | Compiled from live codebase analysis across 5 parallel agent audits*
