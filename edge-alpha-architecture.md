# Edge Alpha — Architecture Document

> **Purpose:** Complete technical analysis of what has been built, how it works today, and how the full production system should be architected.

---

## Table of Contents

1. [What is Edge Alpha](#1-what-is-edge-alpha)
2. [What Has Been Built (Current State)](#2-what-has-been-built-current-state)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend & API Architecture](#4-backend--api-architecture)
5. [AI & Agent System](#5-ai--agent-system)
6. [Data Layer](#6-data-layer)
7. [Current Gaps & Issues](#7-current-gaps--issues)
8. [Target Production Architecture](#8-target-production-architecture)
9. [Database Schema](#9-database-schema)
10. [Security Architecture](#10-security-architecture)
11. [Infrastructure & Deployment](#11-infrastructure--deployment)
12. [How Everything Connects](#12-how-everything-connects)

---

## 1. What is Edge Alpha

Edge Alpha is a **dual-sided AI platform** for early-stage startups and investors.

**For Founders:**
- Q-Score — quantitative startup quality assessment (0–100) across 6 dimensions
- AI Agents — 9 specialized advisors (GTM, Product, Finance, etc.) with context awareness
- Metrics Tracker — live business health monitoring
- Investor Matching — curated investor introductions unlocked by Q-Score

**For Investors:**
- Curated deal flow filtered by Q-Score, industry, stage
- AI-powered startup analysis before and after outreach
- Pipeline management (Interest → Diligence → Term Sheet)
- Messaging with founders

**Core Insight:** Most founder tools give generic advice. Edge Alpha uses every data point collected during onboarding and assessment to make every AI response, every recommendation, and every investor match specific to that founder's actual business.

---

## 2. What Has Been Built (Current State)

### 2.1 Feature Completeness

| Feature | Status | Notes |
|---------|--------|-------|
| Landing page | ✅ Built | Hero, features, social proof |
| Founder onboarding | ✅ Built | 4-step profile collection |
| Q-Score assessment | ✅ Built | 7-section, 9,000+ line scoring engine |
| Dashboard | ✅ Built | Q-Score, agents, workshops, notifications |
| AI agents (9) | ✅ Built | Groq-powered, context-aware, conversation history |
| Profile builder | ✅ Built | Populated from real assessment data |
| Metrics tracker | ✅ Built | Calculated from assessment, health status |
| Improve Q-Score page | ✅ Built | Dimension breakdown, top recommendations |
| Settings page | ✅ Built | Account, company, notifications, data export |
| Investor dashboard | ✅ Built | Deal flow, portfolio, AI analysis |
| Investor onboarding | ✅ Built | Preferences, thesis, check size |
| Founder-investor matching | ✅ Built | Q-Score gate (≥65), match scoring |
| Messaging system | ✅ Built | Founder ↔ investor inbox |
| Pitch analyzer | ✅ Built | Groq AI scoring on clarity, market, team, traction |
| Pitch deck builder | ✅ Built | Structured deck creation |
| Academy/workshops | ✅ Built | Workshop catalog |
| Authentication | ✅ Built | Supabase Auth, session management |
| Feature flags | ✅ Built | Gradual rollout, A/B testing, circuit breaker |
| Error boundaries | ✅ Built | React error boundary component |
| Demo mode | ✅ Built | Guided tour, demo controls |

### 2.2 What is NOT Yet Production-Ready

| Gap | Impact | Priority |
|-----|--------|---------|
| localStorage as primary data store | Data lost on browser clear, no cross-device sync | 🔴 Critical |
| Supabase tables not all created | DB queries fail silently, falls back to localStorage | 🔴 Critical |
| No RLS (Row Level Security) on DB | Any user can read any data | 🔴 Critical |
| Q-Score calculation duplicated | Client + server logic diverged (9k-line legacy file) | 🟡 High |
| Investor database is mocked | No real investors | 🟡 High |
| No email notifications | Founders/investors not notified of activity | 🟡 High |
| Weekly metrics snapshots not stored | No trend charts | 🟡 High |
| Agent conversations not persisted to DB | Lost on browser clear | 🟡 High |
| No task management system | Agents recommend tasks but nowhere to track them | 🟢 Medium |

---

## 3. Frontend Architecture

### 3.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 15.5.2 |
| UI Library | React | 19.1.0 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.4.17 |
| Component Library | Radix UI | Latest |
| Animations | Framer Motion | 12.26.2 |
| Icons | Lucide React | 0.543.0 |
| Toasts | Sonner | 2.0.7 |
| State (global) | React Context + Zustand (available) | - |

### 3.2 Folder Structure (Current)

```
app/
├── page.tsx                    ← Landing page
├── login/page.tsx              ← Auth
│
├── founder/
│   ├── onboarding/             ← Step 1: Profile
│   ├── assessment/             ← Step 2: Q-Score assessment (7 sections)
│   ├── dashboard/              ← Main hub
│   ├── agents/
│   │   └── [agentId]/          ← Chat UI per agent
│   ├── improve-qscore/         ← Improvement roadmap
│   ├── matching/               ← Investor matching (Q≥65 gate)
│   ├── metrics/                ← KPI tracker
│   ├── profile/                ← Profile builder
│   ├── pitch-analyzer/         ← AI pitch review
│   ├── pitch-deck/             ← Deck builder
│   ├── academy/                ← Workshops
│   ├── startup-profile/        ← Company profile
│   └── settings/               ← Account settings
│
├── investor/
│   ├── onboarding/             ← Investor profile setup
│   ├── dashboard/              ← Deal flow hub
│   ├── deal-flow/              ← Pipeline management
│   ├── portfolio/              ← Portfolio view
│   ├── startup/[id]/           ← Startup detail
│   └── ai-analysis/            ← AI evaluation tool
│
├── messages/page.tsx           ← Founder ↔ investor inbox
│
└── api/                        ← All API routes (see Section 4)

components/
├── ui/                         ← 16 Radix UI base components
├── layout/
│   ├── founder-sidebar.tsx     ← Left nav (collapsible)
│   └── investor-sidebar.tsx    ← Left nav for investors
├── dashboard/                  ← Dashboard-specific widgets
├── matching/                   ← Connection request UI
├── investor/                   ← Investor-facing cards
└── demo/                       ← Demo mode + guided tour

lib/
├── supabase/
│   ├── client.ts               ← Browser Supabase client
│   └── server.ts               ← Server Supabase client (API routes)
├── scoring/
│   ├── prd-types.ts            ← Q-Score type definitions
│   ├── prd-aligned-qscore.ts   ← Master scoring calculator
│   └── dimensions/             ← 6 dimension calculators
├── services/
│   ├── storage.service.ts      ← localStorage abstraction
│   └── metrics.service.ts      ← Business metrics calculation
├── hooks/
│   └── useFounderData.ts       ← Data access hooks
├── types/
│   └── founder.types.ts        ← TypeScript interfaces
├── mock-data/
│   ├── agents.ts               ← 9 agent definitions
│   └── workshops.ts            ← Workshop catalog
├── groq.ts                     ← Groq AI client
├── feature-flags.ts            ← Feature flag system
└── recommendation-engine.ts    ← Q-Score to agent recommendations

contexts/
├── AuthContext.tsx             ← Global auth state (Supabase)
└── QScoreContext.tsx           ← Global Q-Score with realtime
```

### 3.3 State Management

**Three layers of state:**

```
┌─────────────────────────────────────────────────────┐
│  GLOBAL STATE (React Context)                       │
│  ┌─────────────────┐  ┌──────────────────────────┐  │
│  │  AuthContext     │  │  QScoreContext            │  │
│  │  user, session  │  │  qScore, loading, refetch │  │
│  └─────────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│  PAGE-LEVEL STATE (useState + hooks)                │
│  useFounderData() → profile, assessment, metrics    │
│  useMetrics()     → calculated KPIs, healthStatus   │
│  useAssessmentData() → assessment responses         │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│  PERSISTENCE (localStorage → Supabase)              │
│  storageService.getFounderProfile()                 │
│  storageService.getAssessmentData()                 │
│  storageService.getQScore()                         │
└─────────────────────────────────────────────────────┘
```

### 3.4 Page Guards (Middleware)

`middleware.ts` handles all route protection:

```
Request → Supabase auth check
  ├─ No session → redirect /founder/onboarding
  ├─ /matching → check Q-Score >= 65 in DB
  │     └─ Score < 65 → redirect /founder/improve-qscore
  ├─ /investor/* → check user role = 'investor'
  └─ /founder/* → check user role = 'founder'
```

---

## 4. Backend & API Architecture

### 4.1 API Routes (Current)

All API routes live in `app/api/` as Next.js Route Handlers.

| Endpoint | Method | Runtime | Purpose |
|----------|--------|---------|---------|
| `/api/auth/signup` | POST | Node | Create Supabase account + profile |
| `/api/qscore/latest` | GET | Node | Fetch latest Q-Score from DB |
| `/api/qscore/calculate` | POST | Node | Run scoring algorithm, save to DB |
| `/api/assessment/save` | POST | Node | Save assessment progress |
| `/api/assessment/submit` | POST | Node | Submit assessment + trigger scoring |
| `/api/agents/chat` | POST | **Edge** | Agent conversation via Groq |
| `/api/analyze-pitch` | POST | Node | Pitch analysis via Groq |
| `/api/generate-qscore` | POST | Node | AI-generated Q-Score narrative |
| `/api/quick-evaluate` | POST | Node | Quick 1–10 startup eval |
| `/api/investor-match` | POST | Node | Calculate match score |
| `/api/health` | GET | Node | Health check |
| `/api/errors` | POST | Node | Error reporting |

### 4.2 Agent Chat API (Core AI Endpoint)

`/api/agents/chat` — this is the most used endpoint. Key design:

```typescript
// Input
{
  agentId: string,             // Which agent (gtm-strategist, product-guru, etc.)
  message: string,             // User's message
  conversationHistory: [],     // Last N messages for context
  userContext: {               // Founder's business data
    profile: FounderProfile,
    assessment: AssessmentData,
    metrics: MetricsData,
    qScore: PRDQScore
  }
}

// Processing
1. Load agent definition from mock-data/agents.ts
2. Build system prompt with agent persona + full business context
3. Append conversation history (last 10 messages)
4. Call Groq: llama-3.1-70b-versatile
5. Return streamed or complete response

// Output
{
  message: string,
  agentId: string
}
```

**Context injection into agent prompt:**
```
You are [Agent Name], specialized in [domain]...

FOUNDER'S BUSINESS CONTEXT:
- Company: TaskFlow | Industry: B2B SaaS | Stage: Pre-seed
- Problem: Remote teams struggle to track work across Slack and email
- ICP: Operations managers at 10–50 person remote companies
- MRR: $1,200 | Burn: $5,000/mo | Runway: 8 months
- Channels tried: LinkedIn, Cold Email
- Q-Score: 48/100 | GTM: 35 ← WEAK AREA

Based on this context, give specific, actionable advice...
```

### 4.3 Q-Score Calculation Pipeline

```
POST /api/qscore/calculate
         │
         ▼
   Input: AssessmentData
         │
         ▼
   calculatePRDQScore()
         │
   ┌─────┴──────────────────────────────────┐
   │  Market Score (20%)                    │
   │  ├─ Problem clarity (text length)      │
   │  ├─ TAM size (target customers)        │
   │  └─ ICP specificity                    │
   │                                        │
   │  Product Score (18%)                   │
   │  ├─ Solution articulation              │
   │  └─ Customer conversation count        │
   │                                        │
   │  GTM Score (17%)                       │
   │  ├─ Channels tested (count)            │
   │  ├─ LTV:CAC ratio                      │
   │  └─ MRR growth rate                    │
   │                                        │
   │  Financial Score (18%)                 │
   │  ├─ Runway (months)                    │
   │  ├─ Burn multiple                      │
   │  └─ Unit economics                     │
   │                                        │
   │  Team Score (15%)                      │
   │  └─ Commitment level + experience      │
   │                                        │
   │  Traction Score (12%)                  │
   │  ├─ MRR amount                         │
   │  ├─ MoM growth rate                    │
   │  └─ Customer count                     │
   └─────────────────────────────────────────┘
         │
         ▼
   Weighted average → 0–100 overall
         │
         ▼
   calculatePercentile() → rank vs cohort
         │
         ▼
   Save to Supabase qscore_history
         │
         ▼
   Return PRDQScore + tier + next milestone
```

---

## 5. AI & Agent System

### 5.1 The 9 Agents

Organized in 3 pillars:

**Sales & Marketing Pillar**
| Agent | Persona | Expertise | Q-Score Dimension |
|-------|---------|-----------|------------------|
| Patel | GTM Strategist | Channel testing, CAC optimization, growth loops | GTM |
| Susi | Sales Coach | Pipeline, discovery calls, closing | Traction |
| Maya | Brand Strategist | Positioning, messaging, content | GTM |

**Operations & Finance Pillar**
| Agent | Persona | Expertise | Q-Score Dimension |
|-------|---------|-----------|------------------|
| Felix | Finance Advisor | Unit economics, burn rate, fundraising prep | Financial |
| Leo | Legal Advisor | Contracts, IP, compliance | Team |
| Harper | People Ops | Hiring, culture, equity | Team |

**Product & Strategy Pillar**
| Agent | Persona | Expertise | Q-Score Dimension |
|-------|---------|-----------|------------------|
| Nova | Product Lead | MVP, roadmap, PMF signals | Product |
| Atlas | Market Analyst | TAM/SAM/SOM, competition, positioning | Market |
| Sage | Strategist | Business model, pivots, partnerships | Market |

### 5.2 How Context Flows to Agents

```
User opens agent page
       │
       ▼
Agent page loads:
  1. localStorage.getItem('founderProfile')   → profile
  2. localStorage.getItem('assessmentData')   → assessment
  3. QScoreContext                             → qScore
       │
       ▼
User sends message
       │
       ▼
POST /api/agents/chat with:
  { agentId, message, conversationHistory, userContext }
       │
       ▼
buildAgentSystemPrompt(agent, userContext):
  → agent.persona + agent.expertise
  → full company context injected
  → Q-Score breakdown with weak areas flagged
       │
       ▼
Groq API: llama-3.1-70b-versatile
  → streamed response
       │
       ▼
Response displayed in chat UI
Conversation history appended to local state
```

### 5.3 Agent Output Modes

Currently all agents operate in **Chat Mode** only. The planned evolution:

```
CHAT MODE (Current — built)
─────────────────────────────
Back-and-forth dialogue.
Founder asks, agent advises.
Agent remembers last 10 messages.


ACTION MODE (Planned — not yet built)
─────────────────────────────────────
Triggered by keywords: "create a plan", "generate", "build me"
Agent produces a structured markdown artifact:
  - GTM Strategist → 30-day channel test plan (table)
  - Fundraising Coach → Pitch deck slide-by-slide outline
  - Product Guru → Feature priority matrix
  - Metrics Analyzer → Weekly health report
Artifact saved to conversations table, exportable.


PROACTIVE MODE (Future)
─────────────────────────────────────
System detects metric change (MRR drops 20%)
→ Sends proactive message from Metrics Analyzer:
  "Your MRR dropped from $5,000 to $4,000 this week.
   The likely cause is... Here's what to do..."
```

### 5.4 Groq Model Usage

| Use Case | Model | Why |
|----------|-------|-----|
| Agent chat | `llama-3.1-70b-versatile` | Best reasoning + speed balance |
| Pitch analysis | `llama-3.1-70b-versatile` | Structured scoring output |
| Quick evaluation | `llama-3.1-8b-instant` | Fast, low-cost for frequent calls |
| Investor matching | `llama-3.1-70b-versatile` | Requires nuanced reasoning |

---

## 6. Data Layer

### 6.1 Current State: Dual-Store Architecture

Right now data exists in two places simultaneously, which is a problem:

```
┌──────────────────────────────────────────────────────────┐
│  BROWSER (localStorage)        PRIMARY in use today     │
│                                                          │
│  founderProfile   → { name, email, stage, startupName } │
│  assessmentData   → { all 7 sections }                  │
│  qScore           → { overall, breakdown }              │
│  conversationHistory:[agentId] → messages[]             │
│                                                          │
│  PROBLEM: Lost on browser clear. No cross-device.       │
│           No server-side validation. Security risk.     │
└──────────────────────────────────────────────────────────┘
                          │
                     Some data syncs
                          │
┌──────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL)        PARTIAL — not fully used  │
│                                                          │
│  founder_profiles     → partial (some fields)           │
│  qscore_history       → used when API called            │
│  assessments          → used on submit                  │
│  investors            → exists but mocked               │
│  connections          → structure exists                │
│                                                          │
│  PROBLEM: Not all tables created. No RLS policies.      │
│           localStorage used as fallback everywhere.     │
└──────────────────────────────────────────────────────────┘
```

### 6.2 Target State: Database-First

```
┌──────────────────────────────────────────────────────────┐
│  SUPABASE (PostgreSQL)        SINGLE SOURCE OF TRUTH    │
│                                                          │
│  All founder data lives here                            │
│  All investor data lives here                           │
│  All conversations live here                            │
│  RLS enforces row-level access                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
                          │
                    React Query or SWR
                    (caching layer)
                          │
┌──────────────────────────────────────────────────────────┐
│  BROWSER (in-memory cache only)                         │
│                                                          │
│  React Query cache → TTL 5 minutes                      │
│  No localStorage for primary data                       │
│  localStorage only for: draft assessment state,        │
│                         UI preferences, theme           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Real-time Data

Supabase Realtime is already partially wired for Q-Score:

```typescript
// QScoreContext.tsx — active subscription
supabase
  .channel('qscore-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'qscore_history',
    filter: `founder_id=eq.${userId}`
  }, (payload) => {
    setQScore(payload.new);
    toast.success('Q-Score updated!');
  })
  .subscribe();
```

**Needs to be extended for:**
- New investor connection requests (notify founder)
- New messages in inbox (notify both parties)
- Investor accepts intro (notify founder)

---

## 7. Current Gaps & Issues

### 7.1 Data Consistency Problem

The biggest architectural issue: **two sources of truth**.

```
Assessment page saves to:     localStorage ✓  Supabase ✗ (sometimes)
Profile builder reads from:   localStorage ✓  Supabase ✗
Metrics tracker reads from:   localStorage ✓  Supabase ✗
Agent chat sends from:        localStorage ✓  Supabase ✗
QScoreContext reads from:     Supabase ✓  localStorage (fallback) ✓
Dashboard reads from:         Supabase ✓  localStorage (fallback) ✓

Result: Founder sees different data on different devices.
```

**Fix:** Make all writes go to Supabase first. localStorage is only a draft cache for in-progress assessment.

### 7.2 Q-Score Algorithm Duplication

There are **two** Q-Score implementations:
1. `lib/scoring/prd-aligned-qscore.ts` — Clean, modular, uses dimension files (target)
2. `lib/scoring/q-score.ts` — 9,655-line legacy file (to be deprecated)

The frontend sometimes uses (1), the API sometimes calls (2). They can return different scores for the same input.

**Fix:** Delete legacy file. All scoring goes through `prd-aligned-qscore.ts` via the API only.

### 7.3 Security: No Row Level Security

Supabase tables exist but RLS policies are not set. This means:
- Any authenticated user can query any founder's data
- SQL injection risk in unprotected endpoints
- No validation that a founder only modifies their own records

**Fix (immediate):** Add RLS policies before any production traffic.

```sql
-- Example: founder can only see their own data
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Founders see own profile"
  ON founder_profiles FOR ALL
  USING (auth.uid() = id);

CREATE POLICY "Investors see only matched founders"
  ON founder_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.investor_id = auth.uid()
        AND matches.founder_id = founder_profiles.id
        AND matches.status IN ('intro_accepted', 'in_conversation')
    )
  );
```

### 7.4 Missing Tables

Tables that are referenced in code but likely not created in Supabase yet:

| Table | Referenced In | Status |
|-------|-------------|--------|
| `agent_conversations` | messages page | ❓ Likely missing |
| `agent_messages` | agent chat page | ❓ Likely missing |
| `tasks` | PRD / recommendation engine | ❌ Not built |
| `metrics_history` | metrics page | ❌ Not built |
| `investor_messages` | investor messaging | ❓ Likely missing |
| `matches` | investor matching | ❓ Partially built |

---

## 8. Target Production Architecture

### 8.1 System Diagram

```
                        ┌─────────────────┐
                        │   User (Browser) │
                        └────────┬────────┘
                                 │ HTTPS
                        ┌────────▼────────┐
                        │    Vercel CDN   │
                        │  (Edge Network) │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
    ┌─────────▼──────┐  ┌────────▼───────┐  ┌──────▼──────────┐
    │  Static Pages  │  │  Next.js SSR   │  │  API Routes     │
    │  (CDN cached)  │  │  (Server Comp) │  │  (Node/Edge)    │
    │  - Landing     │  │  - Dashboard   │  │  - /api/agents  │
    │  - Academy     │  │  - Profile     │  │  - /api/qscore  │
    └────────────────┘  └────────┬───────┘  └──────┬──────────┘
                                 │                  │
                     ┌───────────▼──────────────────▼──────────┐
                     │            Supabase                      │
                     │  ┌─────────┐ ┌──────────┐ ┌─────────┐  │
                     │  │Postgres │ │   Auth   │ │Realtime │  │
                     │  │  (RLS)  │ │  (JWT)   │ │(WS sub) │  │
                     │  └─────────┘ └──────────┘ └─────────┘  │
                     │  ┌──────────────────────────────────┐   │
                     │  │  Storage (pitch decks, avatars)  │   │
                     │  └──────────────────────────────────┘   │
                     └─────────────────────────────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │    Groq AI API         │
                     │  llama-3.1-70b         │
                     │  (Agent conversations) │
                     │  (Pitch analysis)      │
                     │  (Investor matching)   │
                     └───────────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │   Resend (Email)       │
                     │  - Welcome emails      │
                     │  - Intro notifications │
                     │  - Q-Score updates     │
                     │  - Weekly digest       │
                     └───────────────────────┘
```

### 8.2 Request Flow (Example: Agent Chat)

```
1. Founder types message in agent chat
         │
2. POST /api/agents/chat
   Headers: { Authorization: Bearer <supabase_jwt> }
   Body: { agentId, message, conversationHistory }
         │
3. API Route: Verify JWT with Supabase server client
   → Get founderId from JWT
         │
4. Load founder context:
   → SELECT * FROM founder_profiles WHERE id = founderId
   → SELECT * FROM assessments WHERE founder_id = founderId ORDER BY version DESC LIMIT 1
   → SELECT * FROM qscore_history WHERE founder_id = founderId ORDER BY created_at DESC LIMIT 1
         │
5. Build context-aware system prompt
         │
6. Call Groq API (Edge runtime for low latency)
         │
7. Stream response back to client
         │
8. Client saves message to DB:
   → INSERT INTO agent_messages (conversation_id, role, content)
         │
9. Realtime subscription fires
   → Other connected devices see new message
```

### 8.3 Recommended Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (React Components)                  │
│  - Only renders data, handles user interactions         │
│  - No business logic                                    │
│  - Calls hooks only (never services directly)           │
│  - e.g., AgentChatPage, DashboardPage, MetricsPage      │
└──────────────────────┬──────────────────────────────────┘
                       │ call hooks
┌──────────────────────▼──────────────────────────────────┐
│  DATA ACCESS LAYER (Custom Hooks)                       │
│  - useFounderData(), useMetrics(), useQScore()          │
│  - useAgentConversation(agentId)                        │
│  - useInvestorMatches()                                 │
│  - Handles loading/error states                         │
│  - Calls API services                                   │
└──────────────────────┬──────────────────────────────────┘
                       │ call services
┌──────────────────────▼──────────────────────────────────┐
│  BUSINESS LOGIC LAYER (Services)                        │
│  - metricsService.calculateMetrics()                    │
│  - qScoreService.calculate()                            │
│  - matchingService.scoreFounder()                       │
│  - agentService.buildSystemPrompt()                     │
│  - storageService (localStorage abstraction)            │
└──────────────────────┬──────────────────────────────────┘
                       │ call clients
┌──────────────────────▼──────────────────────────────────┐
│  DATA ACCESS CLIENTS                                    │
│  - lib/supabase/client.ts (browser)                     │
│  - lib/supabase/server.ts (API routes)                  │
│  - lib/groq.ts (AI calls)                               │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Database Schema

### 9.1 Complete Tables

```sql
-- ═══════════════════════════════════════
-- USERS & AUTHENTICATION
-- Note: auth.users managed by Supabase Auth
-- ═══════════════════════════════════════

-- Extends Supabase auth.users
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('founder', 'investor')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- FOUNDER DATA
-- ═══════════════════════════════════════

CREATE TABLE public.founder_profiles (
  id                UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name         TEXT NOT NULL,
  email             TEXT NOT NULL,
  stage             TEXT CHECK (stage IN ('Idea', 'Pre-seed', 'Seed', 'Series A')),
  funding           TEXT,
  time_commitment   TEXT CHECK (time_commitment IN ('Part-time', 'Full-time')),
  startup_name      TEXT,
  industry          TEXT,
  description       TEXT,
  founded_date      DATE,
  onboarding_done   BOOLEAN DEFAULT FALSE,
  assessment_done   BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Immutable snapshots — never UPDATE, only INSERT new version
CREATE TABLE public.assessments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id            UUID NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
  version               INT NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Section 1: Market
  problem_story         TEXT,
  target_customers      INT,
  icp_description       TEXT,

  -- Section 2: Product
  solution_description  TEXT,
  unique_advantage      TEXT,
  conversation_count    INT,

  -- Section 3: Failed Assumptions
  failed_assumptions    TEXT,
  pivots                TEXT,

  -- Section 4: Execution
  iteration_speed       TEXT,
  measurement_method    TEXT,

  -- Section 5: Market Sizing
  tam                   BIGINT,
  sam                   BIGINT,
  som                   BIGINT,
  average_deal_size     DECIMAL(10,2),

  -- Section 6: Go-to-Market
  channels_tried        TEXT[],
  cac                   DECIMAL(10,2),
  conversion_rate       DECIMAL(5,4),

  -- Section 7: Financial
  mrr                   DECIMAL(10,2),
  monthly_burn          DECIMAL(10,2),
  current_revenue       DECIMAL(10,2),
  growth_rate           DECIMAL(5,4),

  -- Section 8: Resilience
  resilience_story      TEXT,
  motivation            TEXT,

  UNIQUE(founder_id, version)
);

-- Q-Score history — one row per calculation
CREATE TABLE public.qscore_history (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id          UUID NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
  assessment_id       UUID REFERENCES assessments(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),

  -- Scores (0-100 each)
  overall             INT NOT NULL,
  market_score        INT,
  product_score       INT,
  gtm_score           INT,
  financial_score     INT,
  team_score          INT,
  traction_score      INT,

  -- Context
  tier                TEXT, -- 'Early', 'Developing', 'Fair', 'Good', 'Excellent'
  percentile          INT,  -- 0-100: where this founder ranks vs all users
  version             INT DEFAULT 1
);

-- Weekly metrics snapshots (for trend charts)
CREATE TABLE public.metrics_history (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id            UUID NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
  week_of               DATE NOT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),

  -- Core SaaS metrics
  mrr                   DECIMAL(10,2),
  arr                   DECIMAL(10,2),
  burn                  DECIMAL(10,2),
  runway_months         INT,
  customers             INT,
  average_deal_size     DECIMAL(10,2),
  cac                   DECIMAL(10,2),
  ltv                   DECIMAL(10,2),
  ltv_cac_ratio         DECIMAL(5,2),
  gross_margin          DECIMAL(5,4),
  burn_multiple         DECIMAL(5,2),
  mrr_growth_rate       DECIMAL(5,4),
  churn_rate            DECIMAL(5,4),
  health_status         TEXT CHECK (health_status IN ('healthy', 'warning', 'critical')),

  UNIQUE(founder_id, week_of)
);

-- ═══════════════════════════════════════
-- AI AGENTS
-- ═══════════════════════════════════════

CREATE TABLE public.agent_conversations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id       UUID NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
  agent_id         TEXT NOT NULL, -- 'patel', 'nova', 'felix', etc.
  title            TEXT,          -- Auto-generated from first message
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  message_count    INT DEFAULT 0,

  -- Snapshot of context when conversation started
  context_snapshot JSONB
);

CREATE TABLE public.agent_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),

  -- For structured outputs (action mode)
  artifacts       JSONB -- [{ type, title, content }]
);

-- Tasks generated by agents
CREATE TABLE public.tasks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id      UUID NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES agent_conversations(id) ON DELETE SET NULL,
  agent_id        TEXT,
  title           TEXT NOT NULL,
  description     TEXT,
  due_date        DATE,
  priority        TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  status          TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ═══════════════════════════════════════
-- INVESTOR DATA
-- ═══════════════════════════════════════

CREATE TABLE public.investor_profiles (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name           TEXT NOT NULL,
  email               TEXT NOT NULL,
  firm                TEXT,
  title               TEXT,
  bio                 TEXT,
  linkedin_url        TEXT,

  -- Investment preferences
  check_size_min      INT,       -- USD
  check_size_max      INT,       -- USD
  stages              TEXT[],    -- ['Pre-seed', 'Seed']
  industries          TEXT[],    -- ['B2B SaaS', 'FinTech']
  geography           TEXT[],    -- ['US', 'UK']
  thesis_focus        TEXT,
  dealflow_capacity   INT,       -- intros accepted per month

  -- Matching thresholds
  minimum_q_score     INT DEFAULT 50,
  preferred_metrics   JSONB,     -- { minMRR, minGrowthRate, maxBurnMultiple }

  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════
-- MATCHING & COMMUNICATIONS
-- ═══════════════════════════════════════

CREATE TABLE public.matches (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  founder_id    UUID NOT NULL REFERENCES founder_profiles(id) ON DELETE CASCADE,
  investor_id   UUID NOT NULL REFERENCES investor_profiles(id) ON DELETE CASCADE,
  score         INT NOT NULL,       -- 0-100 match score
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),

  -- Match breakdown
  reasons       JSONB,             -- { industryMatch, stageMatch, qScoreOk, ... }

  -- Status machine
  status        TEXT DEFAULT 'pending' CHECK (
    status IN (
      'pending',          -- Match computed, not yet shown to founder
      'shown',            -- Founder can see this investor
      'intro_requested',  -- Founder clicked "Request Intro"
      'intro_accepted',   -- Investor accepted, messaging unlocked
      'intro_declined',   -- Investor passed
      'in_conversation',  -- Active messaging
      'passed',           -- Either party passed
      'invested'          -- Investment made
    )
  ),

  -- Investor feedback on decline
  decline_reason TEXT,

  UNIQUE(founder_id, investor_id)
);

CREATE TABLE public.investor_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id),
  sender_type   TEXT NOT NULL CHECK (sender_type IN ('founder', 'investor')),
  content       TEXT NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  read_at       TIMESTAMPTZ,

  attachments   JSONB  -- [{ type: 'pdf'|'link', name, url }]
);

-- ═══════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════

CREATE INDEX idx_assessments_founder_version  ON assessments(founder_id, version DESC);
CREATE INDEX idx_qscore_founder_date          ON qscore_history(founder_id, created_at DESC);
CREATE INDEX idx_metrics_founder_week         ON metrics_history(founder_id, week_of DESC);
CREATE INDEX idx_conversations_founder        ON agent_conversations(founder_id, updated_at DESC);
CREATE INDEX idx_messages_conversation        ON agent_messages(conversation_id, created_at ASC);
CREATE INDEX idx_tasks_founder_status         ON tasks(founder_id, status);
CREATE INDEX idx_matches_founder              ON matches(founder_id, status);
CREATE INDEX idx_matches_investor             ON matches(investor_id, status);
CREATE INDEX idx_investor_messages_match      ON investor_messages(match_id, created_at ASC);
```

### 9.2 Row Level Security (RLS) Policies

```sql
-- Profiles
ALTER TABLE founder_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder: own profile only"
  ON founder_profiles FOR ALL USING (auth.uid() = id);

-- Assessments
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder: own assessments only"
  ON assessments FOR ALL USING (auth.uid() = founder_id);

-- Q-Score history
ALTER TABLE qscore_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder: own Q-Score only"
  ON qscore_history FOR ALL USING (auth.uid() = founder_id);
-- Investors can see Q-Score of matched founders only
CREATE POLICY "Investor: see matched founder Q-Score"
  ON qscore_history FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.investor_id = auth.uid()
        AND matches.founder_id = qscore_history.founder_id
        AND matches.status NOT IN ('pending', 'shown')
    )
  );

-- Matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Founder: own matches"
  ON matches FOR SELECT USING (auth.uid() = founder_id);
CREATE POLICY "Investor: own matches"
  ON matches FOR SELECT USING (auth.uid() = investor_id);

-- Messages
ALTER TABLE investor_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Message participants only"
  ON investor_messages FOR ALL USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = investor_messages.match_id
        AND (m.founder_id = auth.uid() OR m.investor_id = auth.uid())
    )
  );
```

---

## 10. Security Architecture

### 10.1 Authentication Flow

```
User submits email/password
         │
         ▼
Supabase Auth → generates JWT
  Payload: { sub: userId, role: 'authenticated', email }
  Custom claims: { user_role: 'founder' | 'investor' }
         │
         ▼
JWT stored in Supabase cookie (httpOnly, secure)
         │
         ▼
middleware.ts runs on every request:
  1. createServerClient(cookies)
  2. supabase.auth.getSession()
  3. If no session → redirect /founder/onboarding
  4. If wrong role → redirect to appropriate area
  5. Refresh token if expiring
```

### 10.2 API Security

Every API route follows this pattern:

```typescript
// app/api/protected-route/route.ts
export async function POST(request: Request) {
  // 1. Create server client with cookies
  const supabase = createServerClient(...)

  // 2. Verify authenticated
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 3. Get data — RLS enforces row-level access automatically
  const { data } = await supabase
    .from('founder_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // RLS guarantees this only returns the user's own data
  // even if a bug in code sent wrong user.id
}
```

### 10.3 Data Validation

- **Input**: Zod schemas on all API inputs
- **Output**: TypeScript types ensure response shape
- **SQL**: Supabase parameterized queries (no SQL injection)
- **AI**: Groq responses are parsed and validated before storing

---

## 11. Infrastructure & Deployment

### 11.1 Current Infrastructure

| Service | Purpose | Status |
|---------|---------|--------|
| Vercel | Frontend + API hosting | Should be configured |
| Supabase | Database + Auth + Realtime | Partially configured |
| Groq | AI inference (LLM) | Active (`GROQ_API_KEY`) |
| localStorage | Temporary data store | Active (to be migrated) |

### 11.2 Recommended Infrastructure

```
Production
├── Vercel (Frontend + API)
│   ├── Production: edge-alpha.com
│   ├── Preview: pr-*.edge-alpha.vercel.app
│   └── Environment: GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEYS
│
├── Supabase (Database + Auth + Storage)
│   ├── Project: edge-alpha-prod
│   ├── Tables: all schema above
│   ├── RLS: all policies enabled
│   ├── Realtime: qscore_history, matches, investor_messages
│   └── Storage: buckets/pitch-decks, buckets/avatars
│
├── Resend (Transactional Email)
│   ├── Welcome email (on signup)
│   ├── Intro request notification (investor)
│   ├── Intro accepted notification (founder)
│   ├── New message notification
│   └── Weekly Q-Score digest
│
└── Monitoring
    ├── Vercel Analytics (performance)
    ├── Sentry (error tracking — /api/errors already wired)
    └── Supabase Dashboard (DB performance)
```

### 11.3 Environment Variables

```bash
# .env.local (development)
# .env.production (Vercel environment variables)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Server-side only, never expose to browser

# Groq AI
GROQ_API_KEY=gsk_...

# Email (when added)
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@edge-alpha.com

# App
NEXT_PUBLIC_APP_URL=https://edge-alpha.com
```

---

## 12. How Everything Connects

### 12.1 The Complete Data Journey

```
STEP 1: FOUNDER SIGNS UP
━━━━━━━━━━━━━━━━━━━━━━━
/founder/onboarding
  → Supabase Auth: create user
  → INSERT founder_profiles (name, email, stage, funding, time_commitment)
  → INSERT profiles (role: 'founder')
  → Redirect to /founder/assessment


STEP 2: Q-SCORE ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━
/founder/assessment
  → 7-section form (13 min)
  → Auto-save: localStorage (draft)
  → Submit: POST /api/assessment/submit
      → INSERT assessments (all responses, version: 1)
      → POST /api/qscore/calculate
          → calculatePRDQScore(assessmentData)
          → INSERT qscore_history (overall: 48, breakdown: {...})
          → Realtime fires → QScoreContext updates → Dashboard shows score
  → Redirect to /founder/dashboard


STEP 3: DASHBOARD LOADS
━━━━━━━━━━━━━━━━━━━━━━
/founder/dashboard
  → QScoreContext: SELECT FROM qscore_history LIMIT 1 → score: 48
  → useFounderData(): SELECT FROM founder_profiles
  → useMetrics(): SELECT FROM assessments LIMIT 1 → calculateMetrics()
  → RecommendedActions: qScore.breakdown → find 3 lowest dims → suggest agents
  → Shows: "Your GTM score is 35. Chat with Patel →"


STEP 4: AGENT CONVERSATION
━━━━━━━━━━━━━━━━━━━━━━━━━
/founder/agents/patel
  → Load context: founder_profiles + assessments + qscore_history
  → User types: "My cold emails have 1% reply rate. Help."
  → POST /api/agents/chat
      → Verify JWT
      → Load founder data from DB
      → Build system prompt (company + Q-Score context)
      → Groq: llama-3.1-70b → response
      → INSERT agent_messages (role: 'user', content)
      → INSERT agent_messages (role: 'assistant', content)
  → Response streamed to UI


STEP 5: METRICS UPDATE
━━━━━━━━━━━━━━━━━━━━━
Founder gets first paid customer.
/founder/metrics
  → Edit MRR: $0 → $200
  → POST /api/metrics
      → metricsService.calculateMetrics({ mrr: 200, ... })
      → INSERT metrics_history (week_of: '2026-01-20', mrr: 200, ...)
      → POST /api/qscore/calculate (reassess)
          → Q-Score: 48 → 55 (+7)
          → Realtime: toast "Q-Score updated to 55!"


STEP 6: INVESTOR MATCH UNLOCKS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Q-Score reaches 65.
  → Middleware: /founder/matching now accessible
  → Run matching algorithm:
      SELECT * FROM investor_profiles
      → Score each investor vs. founder profile
      → INSERT matches (score: 82, status: 'shown')
  → Founder sees top 20 investors
  → Founder clicks "Request Intro" on investor
      → UPDATE matches SET status = 'intro_requested'
      → Resend email to investor: "New intro request from Sarah Chen (TaskFlow)"


STEP 7: INVESTOR ACCEPTS
━━━━━━━━━━━━━━━━━━━━━━━
Investor logs in → /investor/dashboard
  → Pending intro card for Sarah Chen
  → Reviews Q-Score: 65, MRR: $5K, Industry: B2B SaaS
  → Clicks "Accept"
      → UPDATE matches SET status = 'intro_accepted'
      → Realtime: Founder gets notification "John Doe accepted your intro!"
      → Messaging unlocked

STEP 8: FOUNDER ↔ INVESTOR MESSAGING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/messages
  → INSERT investor_messages (content: "Hi! Tell me about your traction")
  → Realtime: investor sees new message
  → Investor replies
  → Founder shares pitch deck (Supabase Storage URL)
  → Call scheduled → Investment
```

### 12.2 How Onboarding Data Powers Everything

Every piece of onboarding data has a downstream use:

| Data Collected | Used In |
|---------------|---------|
| `problemStory` | Agent system prompt context, Market Q-Score |
| `targetCustomers` | Market Q-Score, Metrics calculations |
| `icpDescription` | GTM agent advice, investor matching |
| `solutionDescription` | Product Q-Score, Profile Builder |
| `conversationCount` | Product Q-Score |
| `channelsTried` | GTM Q-Score, agent "don't repeat these" |
| `mrr` | Financial Q-Score, Metrics, Runway calculation |
| `monthlyBurn` | Financial Q-Score, Runway calculation |
| `cac` | GTM Q-Score, Unit Economics |
| `averageDealSize` | LTV calc, Metrics Tracker |
| `growthRate` | Traction Q-Score, Metrics Tracker |
| `tam / sam / som` | Market Q-Score, Investor Matching |

---

## 13. Immediate Action Plan

### Must-Do Before Launch (In Order)

**Week 1 — Database Foundation**
```
1. Create all missing Supabase tables (schema above)
2. Enable RLS on all tables + add policies
3. Verify Supabase connections working (run verify-db script)
4. Delete lib/scoring/q-score.ts (9K line legacy file)
   → Consolidate to prd-aligned-qscore.ts only
```

**Week 2 — Remove localStorage Dependency**
```
5. Update assessment page: save to Supabase on submit (not just localStorage)
6. Update useFounderData hook: read from Supabase first (localStorage as fallback only)
7. Update agent chat: persist conversations to agent_conversations + agent_messages
8. Update metrics page: save weekly snapshots to metrics_history table
```

**Week 3 — Real-time & Notifications**
```
9. Add Realtime subscriptions for: matches, investor_messages
10. Set up Resend email service
11. Build email templates: welcome, intro request, intro accepted, new message
12. Wire notifications to matching + messaging flows
```

**Week 4 — Production Deploy**
```
13. Vercel production environment setup
14. Custom domain (edge-alpha.com)
15. Error monitoring (Sentry)
16. End-to-end test: full founder journey, full investor journey
17. Soft launch to beta users
```

---

**Document Version:** 1.0
**Last Updated:** February 2026
**Tech Stack:** Next.js 15 + React 19 + Supabase + Groq + Vercel
**Status:** MVP Complete → Moving to Production
