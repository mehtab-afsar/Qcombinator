# Edge Alpha — Complete Product & Architecture Reference

---

## 1. What Is Edge Alpha?

Edge Alpha is a **founder-facing startup operating system** built around a single question investors implicitly ask: *"Is this team investment-ready?"*

The platform gives founders three things:

| Layer | What It Is | What It Does |
|-------|-----------|-------------|
| **Q-Score** | Algorithmic investment-readiness score (0–100) | Quantifies readiness across 6 weighted dimensions, tracks trajectory, surfaces gaps |
| **AI Agents** | 9 specialist AI advisors | Build real deliverables (GTM plans, financial models, hiring plans, etc.) that feed back into the score |
| **Investor Matching** | Sector/stage/score-aware deal flow | Connects founders with pre-vetted investors; investors see a live portfolio of scored startups |

### Core Value Proposition

Most pitch prep is subjective and unverifiable. Edge Alpha makes it objective and evidence-backed. When a founder says "we have strong PMF," the Q-Score either confirms or challenges that with a number derived from their actual data, their agent-produced artifacts, and semantic evaluation of their answers.

### What Founders Experience

1. Complete a 10-minute structured assessment
2. Receive a Q-Score with dimension-by-dimension breakdown and percentile rank
3. Chat with specialist agents to build deliverables — each deliverable directly boosts the relevant dimension
4. Portfolio page is automatically investor-ready: Q-Score ring, proof artifacts, metrics
5. Connect with matched investors who see live score data and verified deliverables

---

## 2. How It Was Built

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14 (App Router) | Full-stack framework, SSR, API routes |
| **Language** | TypeScript | Type safety across the full stack |
| **Database** | Supabase (PostgreSQL) | Auth, row-level security, real-time, storage |
| **Vector Search** | pgvector (Supabase extension) | Semantic similarity search for RAG evidence cross-reference |
| **LLM** | OpenRouter → claude-3.5-haiku | All agent conversations, artifact generation, RAG scoring |
| **Animation** | Framer Motion | UI transitions and micro-interactions |
| **Email** | Resend | Investor updates, weekly digests |
| **Lead Enrichment** | Hunter.io | Domain → contact discovery for Patel/Susi agents |
| **Web Research** | Tavily | Real-time web search for Atlas/Patel agents |
| **Payments** | Stripe (restricted key, read-only) | Felix agent reads live MRR/ARR without storing credentials |
| **Site Deploy** | Netlify Files API | Patel/Maya deploy landing pages directly from agent chat |

### Palette (consistent across all pages)

```
bg="#F9F7F2"   surf="#F0EDE6"   bdr="#E2DDD5"
ink="#18160F"  muted="#8A867C"
blue="#2563EB" green="#16A34A"  amber="#D97706"  red="#DC2626"
```

### App Router Structure

```
app/
  page.tsx                        ← Landing page
  founder/
    dashboard/page.tsx            ← Q-Score ring, dimension breakdown, challenges
    agents/[agentId]/page.tsx     ← Main agent chat UI (22k lines — all 9 agents)
    agents/page.tsx               ← Agent hub with progress tracker
    workspace/page.tsx            ← Deliverables portfolio
    portfolio/page.tsx            ← Investor-facing view (PDF export)
    improve-qscore/page.tsx       ← Score simulator, challenges, evidence upload
    metrics/page.tsx              ← KPI dashboard (MRR, ARR, burn, LTV/CAC)
    matching/page.tsx             ← Investor matching with real match scores
    pitch-deck/page.tsx           ← AI-generated pitch deck from agent artifacts
    activity/page.tsx             ← Agent activity feed grouped by date
  investor/
    deal-flow/page.tsx            ← Investor-side startup pipeline
    startup/[id]/page.tsx         ← Deep-dive on a specific founder
    onboarding/page.tsx           ← Investor onboarding flow
  api/
    qscore/calculate/             ← POST: full assessment → score
    qscore/latest/                ← GET: current score + deltas
    qscore/benchmarks/            ← GET: per-dimension cohort percentiles
    qscore/actions/               ← GET/POST: AI improvement recommendations
    agents/chat/                  ← POST: main agent conversation
    agents/generate/              ← POST: 2-pass artifact generation
    agents/landingpage/deploy/    ← POST: Netlify deploy
    agents/felix/stripe/          ← POST: live Stripe metrics
    agents/felix/investor-update/ ← POST: investor update email via Resend
    agents/harper/apply/          ← POST: resume screener
    agents/leo/nda/               ← POST: NDA generator
    agents/atlas/track/           ← POST: competitor tracker
    agents/deals/reminders/       ← POST: stale deal reminders
    connections/                  ← GET/POST: investor connection requests
    notifications/                ← GET: founder notification center
    digest/weekly/                ← POST: weekly digest email
    investor/deal-flow/           ← GET: enriched founder pipeline for investors
    investor/startup/[id]/        ← GET: full founder deep-dive
    admin/metrics/                ← GET: system health + observability

features/
  agents/
    shared/                       ← Shared UI components (DeliverablePanel, CopyBtn, ShareModal)
    data/agents.ts                ← Display data: avatars, colors, suggested prompts
    types/agent.types.ts          ← TypeScript types
    {patel,susi,maya,felix,leo,harper,nova,atlas,sage}/
      prompts/system-prompt.ts    ← Per-agent system prompt
      components/                 ← Per-agent artifact renderers
  qscore/
    calculators/                  ← 6 dimension calculators + main orchestrator
    rag/                          ← 3-layer RAG pipeline
    services/agent-signal.ts      ← Q-Score dimension boosting on artifact creation
    utils/                        ← Bluff detection, confidence adjustment, sector weights

lib/
  constants/                      ← Artifact types, dimensions, agent IDs (single source of truth)
  edgealpha.config.ts             ← Master agent registry (tools, boosts, relevance maps)
  tools/executor.ts               ← Universal tool executor (rate limit, cache, retry, log)
  actions/executor.ts             ← Universal action executor (platform/enrichment/handoff)
  agents/context.ts               ← Registry-driven cross-agent context injection
  data/                           ← Typed data access layer (6 files, one per table group)
  qscore/staleness.ts             ← Proactive re-assessment trigger
  circuit-breaker.ts              ← External API circuit breakers
  observability/tracer.ts         ← Async span tracing
```

### Key Database Tables

| Table | Purpose |
|-------|---------|
| `founder_profiles` | Onboarding data: sector, stage, company info |
| `agent_artifacts` | All generated deliverables (JSONB content, versioned) |
| `agent_conversations` | Conversation sessions per agent per user |
| `agent_messages` | Individual messages in conversations |
| `agent_activity` | Cross-agent event bus (artifact created, deal created, survey deployed, etc.) |
| `qscore_history` | Chained score history (previous_score_id self-reference for delta tracking) |
| `qscore_with_delta` | View joining current → previous score for deltas |
| `score_evidence` | Founder-uploaded proof (Stripe screenshots, LOIs, contracts) |
| `rag_score_cache` | Cached RAG dimension scores per user (column-level invalidation) |
| `rag_execution_logs` | Per-dimension RAG scoring telemetry |
| `tool_execution_logs` | Tool call audit log (latency, cost, cache hits) |
| `deals` | Susi's CRM: prospects at each pipeline stage |
| `demo_investors` | Pre-seeded investor profiles for matching |
| `connection_requests` | Founder → investor connection requests |
| `artifact_embeddings` | pgvector embeddings of agent artifacts (for evidence cross-reference) |

---

## 3. Q-Score: The Complete System

### 3.1 The 6 Dimensions

| Dimension | Weight | What It Measures | Primary Agent |
|-----------|--------|-----------------|---------------|
| **Market** | 20% | TAM realism, conversion rate validity, LTV:CAC ratio | Atlas |
| **Financial** | 18% | Unit economics (gross margin), revenue scale, runway, projection realism | Felix |
| **Product** | 18% | Customer validation depth, learning velocity, failed assumptions | Nova |
| **Go-to-Market** | 17% | ICP clarity, channel testing breadth, messaging effectiveness | Patel |
| **Team** | 15% | Domain expertise, team completeness, resilience | Harper |
| **Traction** | 12% | Conversation volume, commitment level, revenue, growth signals | Susi |

Dimensions score 0–100 independently, combined via weighted average. Missing dimensions are re-normalized (other weights scale up + 5% penalty per missing dim).

### 3.2 End-to-End Scoring Pipeline

```
Founder submits 10-minute assessment form
          ↓
POST /api/qscore/calculate
  1. Authenticate user (Supabase)
  2. Run runRAGScoring(assessmentData) — 3-layer semantic evaluation
     • Falls back gracefully if RAG unavailable
          ↓
  3. calculatePRDQScore(assessmentData, ragResults)
     • 6 dimension calculators run independently
     • Each scores sub-sections with explicit point breakdowns
     • Confidence adjustment per dimension
          ↓
  4. detectBluffSignals(assessmentData)
     • 6 fraud signals checked
     • Penalties applied: high -10%, medium -3%, low -1% (max -30%)
          ↓
  5. Weighted average (with partial-data re-normalization)
          ↓
  6. Grade assignment + cohort percentile
          ↓
  7. Save to qscore_history (chain via previous_score_id)
     • Store RAG metadata in ai_actions.rag_eval
          ↓
  8. Fire-and-forget: log to rag_execution_logs (never blocks response)
          ↓
Response: { overall, grade, percentile, breakdown × 6, delta, ragMetadata }
```

**Grade Scale:**

| Grade | Score |
|-------|-------|
| A+ | 95+ |
| A | 90+ |
| B+ | 85+ |
| B | 80+ |
| C+ | 75+ |
| C | 70+ |
| D | 60+ |
| F | < 60 |

### 3.3 Three-Layer RAG Architecture

The RAG pipeline runs before the dimension calculators, producing semantic quality scores (0–100 per field) that replace or supplement character-count heuristics.

**Layer 1 — Semantic Rubric Scoring**

LLM evaluates free-text assessment answers against explicit rubrics. Fields scored:

| Field | What Dimension It Feeds |
|-------|------------------------|
| `problemStory` | Team (founder-market fit, domain expertise) |
| `advantageExplanation` | Team (structural moat, unfair advantage) |
| `customerQuote` | Product (quality of customer evidence) |
| `customerSurprise` | Product (depth of genuine learning) |
| `failedBelief` | Product (intellectual honesty, assumption testing) |
| `failedDiscovery` | Product (what was learned from failure) |
| `icpDescription` | GTM (ICP specificity: role, size, pain, trigger) |
| `messagingResults` | GTM (messaging test documentation quality) |

Output: `AnswerQualityScores` — one 0–100 score per field, semantic not length-based.

**Layer 2 — Evidence Cross-Reference**

Searches the user's own `agent_artifacts` using pgvector (cosine similarity) to find corroborations or conflicts with assessment claims.

- `corroborations`: artifact content supports the assessment claim (similarity > 0.8) — score boosted
- `conflicts`: artifact data contradicts the claim (e.g., Felix financial_summary shows $20K MRR but assessment claims $200K) — score penalized
- `unverified`: no artifacts to cross-reference yet (cold-start state)

Conflicts are stored in `qscore_history.ai_actions.rag_eval.conflicts` and surfaced as red "Data Mismatch" banners on the dashboard and improve-qscore page.

**Layer 3 — Benchmark Validation**

Compares founder's market metrics against sector-specific benchmarks:
- TAM realism (`realistic` / `optimistic` / `unrealistic`)
- Conversion rate validity (e.g., >10% flagged as unrealistic for B2B SaaS)
- LTV:CAC ratio comparison against cohort

**Fallback Chain (graceful degradation):**

```
Try RAG (3 layers)
  → On failure: try blended (heuristic + partial LLM)
    → On failure: pure heuristic (char-count + keyword detection)
      → Response always returns; RAG failure never blocks scoring
```

`scoringMethod` in response: `'rag'` | `'blended'` | `'heuristic'`

### 3.4 Bluff Detection — 6 Fraud Signals

| Signal | Detection Logic | Penalty |
|--------|----------------|---------|
| **Impossible ratios** | LTV:CAC > 20:1 | High (-10%) |
| **AI hallmark phrases** | 2+ phrases like "leveraging cutting-edge", "game-changing", "paradigm shift" | Medium (-3%) |
| **Round numbers** | 3+ metrics are exact multiples of 1,000 | Medium (-3%) |
| **Generic language** | 200+ chars with zero specifics (no dates, numbers, names) | Low (-1%) |
| **Inconsistent financials** | MRR claims 10× burn but no ARR reported | Medium (-3%) |
| **Evidence mismatch** | Claims 50+ customer conversations but no quotes or surprises | Low (-1%) |

Max combined penalty: **-30%**. Result clamped to `[0, original_score]`.

### 3.5 Dimension Calculator Details

**Market (20%)**
- TAM size: ≥$1B → 40pts, ≥$100M → 35, ≥$10M → 28, ≥$1M → 20, <$1M → 10
- Conversion rate realism: 0.5–5% → 30pts; >10% → 5pts
- Daily active user realism: 10–50% of TAM → 20pts
- LTV:CAC: 3:1+ → 10pts, 2:1 → 7pts, 1:1 → 4pts

**Product (18%)**
- Customer validation (40pts): conversation count + evidence quality (quotes, surprises, commitments)
- Learning velocity (30pts): build cycle time + hypothesis testing completeness
- Failed assumptions (30pts): specificity of what they believed, discovered, reasoned, and changed

**GTM (17%)**
- ICP clarity (35pts): role definition, company size, industry, buying trigger, exclusion criteria
- Channel testing (35pts): channels tried + results tracked + CAC validated
- Messaging quality (30pts): tested vs untested; result documentation

**Financial (18%)**
- Unit economics (40pts): gross margin 80%+ → 20pts + revenue scale ≥$1M ARR → 20pts
- Runway (30pts): 18+ months → 30pts; <3 months → 5pts
- Projection realism (30pts): growth rate realism + assumption documentation

**Team (15%)**
- Domain expertise (40pts): origin story depth + structural moat
- Team completeness (30pts): size + complementary skills coverage
- Resilience (30pts): failure quality + iteration speed

**Traction (12%)**
- Customer base (40pts): conversation volume (100+ = 20pts) + commitment level
- Revenue (30pts): ≥$1M ARR → 30pts; $0 → 0pts
- Growth signals (30pts): activity proxy from conversations + revenue data

### 3.6 Score Update Triggers

**1. Full re-assessment** — founder re-submits form → complete recalculation.

**2. Agent artifact signals** — one-time per artifact type per user (idempotent):

| Artifact | Dimension Boosted | Base Points |
|----------|------------------|-------------|
| `gtm_playbook` | GTM | +6 |
| `financial_summary` | Financial | +6 |
| `icp_document` | GTM | +5 |
| `hiring_plan` | Team | +5 |
| `competitive_matrix` | Market | +5 |
| `pmf_survey` | Product | +5 |
| `outreach_sequence` | Traction | +4 |
| `battle_card` | Market | +4 |
| `sales_script` | Traction | +4 |
| `brand_messaging` | GTM | +4 |
| `strategic_plan` | Product | +4 |
| `legal_checklist` | Financial | +3 |

Points are multiplied by a **quality multiplier** based on artifact content length:
- `full` (>800 chars): ×1.0
- `partial` (>300 chars): ×0.6
- `minimal` (≤300 chars): ×0.3

Idempotency key: `(user_id, source_artifact_type)` — each type boosts exactly once.

**3. Manual score evidence** — founder uploads proof (Stripe screenshots, LOIs, pilot contracts) → verified by status change → `points_awarded` applied.

### 3.7 Sector-Specific Weights

8 sector profiles shift dimension weights to reflect what investors in that category prioritize:

| Sector | Market | Product | GTM | Financial | Team | Traction |
|--------|--------|---------|-----|-----------|------|---------|
| **B2B SaaS** (default) | 20% | 18% | 17% | 18% | 15% | 12% |
| **B2C SaaS** | 15% | 25% | 15% | 15% | 10% | 20% |
| **Marketplace** | 18% | 15% | 15% | 22% | 10% | 20% |
| **Biotech/DeepTech** | 28% | 20% | 10% | 18% | 20% | 4% |
| **Consumer Brand** | 15% | 15% | 25% | 22% | 8% | 15% |
| **Fintech** | 25% | 15% | 15% | 25% | 12% | 8% |
| **Hardware** | 18% | 15% | 15% | 25% | 22% | 5% |
| **E-commerce** | 15% | 10% | 20% | 30% | 8% | 17% |

### 3.8 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/qscore/calculate` | POST | Full assessment submission → score + save |
| `/api/qscore/latest` | GET | Current score, deltas, breakdown, RAG metadata |
| `/api/qscore/benchmarks` | GET | Per-dimension cohort percentile ranks |
| `/api/qscore/actions` | GET/POST | AI "What gets me to 80?" recommendations (lazy, cached in `ai_actions` column) |

---

## 4. The 9 AI Agents

All agents share the same infrastructure:
- Model: `anthropic/claude-3.5-haiku` via OpenRouter
- Non-streaming JSON path with 2-pass `<tool_call>{...}</tool_call>` XML detection
- 900 token response limit, temperature 0.7 for chat; 3000 tokens, temp 0.4 for artifact generation
- Memory injection from `getAgentContext()` using `lib/agents/context.ts`
- Every tool call goes through `lib/tools/executor.ts` (rate limit → cache → retry → log)

---

### PILLAR 1: SALES & MARKETING

---

### 4.1 PATEL — Go-to-Market Strategist

**Role:** ICP definition, channel strategy, and GTM execution for repeatable acquisition.

**Core Methodology:**
- Data-first: demands actual numbers (CAC, conversion rate, channel spend) before giving advice
- Brutally honest about what isn't working; connects every recommendation to Q-Score GTM dimension
- Gives frameworks *and* executes them — doesn't just answer, builds the artifact
- Proactively references Atlas's battle cards for competitive context (does not generate them)

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `icp_document` | Target market, product, current customers/hypothesis, pain points | buyerPersona, firmographics, painPoints, buyingTriggers, channels |
| `outreach_sequence` | ICP, value prop, desired action (demo/trial/signup) | targetICP, 5-7 steps with email/LinkedIn/call + personalization tokens |
| `gtm_playbook` | ICP, channels tested, messaging, budget, timeline | ICP, positioning, channels, messaging, metrics, 90-day plan (3 phases) |

**Data Tools:**
- `lead_enrich` (Hunter.io) — domain → 8 decision-maker contacts with title, email, LinkedIn

**Phase 3 Execution Features:**
- Deploy landing page via Netlify Files API → returns live URL
- Gmail compose link for outreach (one click per email step)
- Google Alerts setup per competitor

**Q-Score Impact:**
- GTM +5 (icp_document) + GTM +6 (gtm_playbook) + Traction +4 (outreach_sequence) = **15 total pts**

**Cross-Agent Relationships:**
- High relevance: Atlas (reads battle cards), Maya (brand/messaging alignment)
- Medium relevance: Felix (unit economics for GTM budget), Susi (pipeline handoff)

---

### 4.2 SUSI — Sales Process Architect

**Role:** Cold outreach, lead qualification, conversion optimization, and deal pipeline management.

**Core Methodology:**
- Practical and tactical; gives templates and scripts, not theory
- Role-plays objection scenarios when helpful
- Focuses on ICP-specific buying psychology — understands economic buyer vs champion
- Proactively auto-creates deals when founder mentions a prospect (prevents pipeline loss)
- Needs to know before generating: ACV, economic buyer title, close rate, sales cycle length

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `sales_script` | Product, target persona (title + company size), ACV, top 2-3 objections | discoveryQuestions, pitchFramework, objections + rebuttals, closingLines |

**Data Tools:**
- `lead_enrich` (Hunter.io) — same as Patel; domain → contacts
- `create_deal` — inserts prospect into `deals` table at correct pipeline stage; logs to `agent_activity`

**Deal Stages:** `lead → qualified → proposal → negotiating → won → lost`

**Phase 3 Execution Features:**
- Deal reminders banner in chat: surfaces deals with `next_action_date` within 3 days
- Gmail compose integration for outreach follow-ups

**Q-Score Impact:**
- Traction +4 (sales_script) = **4 total pts**

**Cross-Agent Relationships:**
- High relevance: Patel (ICP/outreach context), Atlas (competitive objection handling)
- Medium relevance: Felix (deal size/ACV calibration)

---

### 4.3 MAYA — Brand & Content Strategist

**Role:** Brand positioning, content strategy, and founder personal branding.

**Core Methodology:**
- Creative but conversion-focused — every content piece serves an acquisition goal
- Asks for current positioning before suggesting anything
- Gives actual copy samples, not just frameworks
- Workshops the differentiator if the founder can't articulate it in one sentence
- Connects content output to GTM dimension score improvement

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `brand_messaging` | Product description, target customer (title + pain), primary differentiator, 1-2 value props, brand voice | positioning statement, 5 taglines, elevator pitches (1-liner/30s/2min), voice guide |

**Phase 3 Execution Features:**
- Deploy landing page via Netlify (same endpoint as Patel)
- Blog post generator: brand-voice post via LLM → downloadable HTML
- Social templates: downloads HTML with 3 SVG templates (Instagram 1080×1080, Twitter 1200×628, LinkedIn 1584×396)

**Q-Score Impact:**
- GTM +4 (brand_messaging) = **4 total pts**

**Cross-Agent Relationships:**
- High relevance: Patel (ICP/positioning alignment)
- Medium relevance: Atlas (competitive differentiation), Nova (PMF-to-messaging translation)

---

### PILLAR 2: OPERATIONS & FINANCE

---

### 4.4 FELIX — Financial Strategist

**Role:** SaaS financial modeling, unit economics, burn rate analysis, and fundraising readiness.

**Core Methodology:**
- Precise and numbers-driven; demands actual figures (not "around $10K")
- Explains the "so what" behind every metric — not just what the number is, but what it means
- Flags real problems in numbers without softening (e.g., "your runway is 4 months, that's a crisis")
- Connects every recommendation to the Financial Q-Score dimension
- Always asks for: MRR, monthly burn, runway months, gross margin %

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `financial_summary` | MRR/revenue stage, monthly burn, gross margin %, one of: CAC/LTV/runway | snapshot (MRR/ARR/burn/runway), unit economics verdict, 12-month projection, fundraising recommendation |

**Data Tools:**
- `fetch_stripe_metrics` — connects to founder's Stripe account (restricted key, not stored) → reads live MRR, ARR, customer count

**Phase 3 Execution Features:**
- Stripe live metrics connect: restricted key → real MRR/ARR/customers
- Investor update email: YC-style HTML email via Resend
- CSV export: downloads financial model with 12-month MRR projection (Google Sheets compatible)

**Q-Score Impact:**
- Financial +6 (financial_summary) = **6 total pts**

**Cross-Agent Relationships:**
- High relevance: Sage (fundraising/strategy alignment)
- Medium relevance: Patel (GTM budget), Nova (product metrics), Susi (revenue/pipeline)

---

### 4.5 LEO — Startup Legal Advisor

**Role:** Entity formation, founder agreements, IP protection, customer contracts, regulatory compliance, fundraising documents.

**Core Methodology:**
- Plain language — no legalese unless legally necessary
- Flags risk levels (low / medium / high) for every issue
- Recommends when to hire an actual lawyer (not a replacement)
- Always includes disclaimer: *"This is general information, not legal advice. Consult a licensed attorney for your specific situation."*
- Focuses on the 2-3 highest-risk items requiring immediate action

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `legal_checklist` | Company stage (pre-incorporation/incorporated/fundraising/scaling), co-founder status, IP assets, customer/investor presence | company stage assessment, priority actions by risk level, incorporation items, IP items, fundraising items, red flags |

**Phase 3 Execution Features:**
- NDA generator: template-based mutual/one-way NDA as downloadable HTML
- Clerky integration: copies incorporation details to clipboard + opens Clerky
- Stripe Atlas integration: same pattern for alternative incorporation path

**Q-Score Impact:**
- Financial +3 (legal_checklist) = **3 total pts**

**Cross-Agent Relationships:**
- High relevance: (none — Leo is domain-isolated)
- Medium relevance: Harper (founder agreements), Felix (fundraising docs)

---

### 4.6 HARPER — People Operations Expert

**Role:** Hiring strategy, interview design, compensation benchmarking, equity structure, culture design.

**Core Methodology:**
- Empathetic but pragmatic — people decisions are hard and have lasting consequences
- Gives templates: job descriptions, interview scorecards, offer letter structure
- Honest about what "great" looks like vs available talent in current market
- Always connects to Team dimension Q-Score improvement
- Opens every conversation: *"What's the biggest execution bottleneck right now?"*

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `hiring_plan` | Current team size/roles, biggest execution gap, funding stage, budget/equity range for next hire | current gaps analysis, next 3 hires with full requirements, 12-month org roadmap, compensation/equity bands |

**Phase 3 Execution Features:**
- Wellfound post: copies JD to clipboard + opens wellfound.com/jobs/new
- Resume screener: LLM scores uploaded resumes 0–100 against role requirements; public apply page at `/apply/[userId]/[roleSlug]`
- Applications inbox in chat: loads scored candidates from `/api/agents/harper/apply`

**Q-Score Impact:**
- Team +5 (hiring_plan) = **5 total pts**

**Cross-Agent Relationships:**
- High relevance: Patel (role requirements informed by ICP and GTM stage)
- Medium relevance: Atlas (competitive intel on talent market), Felix (compensation budget)

---

### PILLAR 3: PRODUCT & STRATEGY

---

### 4.7 NOVA — Product Strategist

**Role:** PMF validation, feature prioritization, discovery frameworks, roadmap design, user research.

**Core Methodology:**
- Evidence-driven; challenges assumptions relentlessly
- Helps founders distinguish polite feedback from real PMF signals
- Practical frameworks with real examples — not just theory
- For pre-launch founders: focuses on discovery interviews, not retention metrics
- Opens every conversation: *"What's the retention rate at Day 7 and Day 30?"*

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `pmf_survey` | Product description, target user, current stage (pre-launch/beta/live), PMF hypothesis to validate | 5-phase interview script, Sean Ellis test, top 3 experiments to run, segment analysis framework |
| `interview_notes` | Completed customer conversations with quotes and surprises | Structured synthesis: patterns, surprises, key quotes, conviction level per hypothesis |

**Phase 3 Execution Features:**
- Hosted PMF survey: live survey page at `/s/[surveyId]` with localStorage response collection
- Survey HTML download: standalone HTML file with full survey + response tracking
- Survey results API: aggregate responses available at `/api/survey/results`

**Q-Score Impact:**
- Product +5 (pmf_survey) + Product +3 (interview_notes) = **8 total pts**

**Cross-Agent Relationships:**
- High relevance: Patel (PMF → ICP refinement), Atlas (market context for hypothesis validation)
- Medium relevance: Susi (customer conversations → traction evidence), Sage (PMF → strategic direction)

---

### 4.8 ATLAS — Competitive Intelligence Analyst

**Role:** Competitive landscape mapping, positioning differentiation, market timing, unfair advantage identification, battle cards.

**Core Methodology:**
- Strategic and analytical; thinks 3 moves ahead (not just feature comparison)
- Challenges both underestimation ("we have no competitors") and overestimation of competition
- Uses frameworks: positioning matrix, value curve, jobs-to-be-done map
- Connects competitive advantage to Market Q-Score improvement
- Opens every conversation: *"Who do customers currently use? Include 'doing nothing' as an option."*
- Has access to live web data via Tavily — injects real competitor information into artifacts

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `competitive_matrix` | Product description, 2-3 competitor names, key differentiating dimensions | competitor profiles, feature comparison matrix, SWOT, positioning map, white space opportunities + live Tavily sources |
| `battle_card` | Specific competitor, your product, ICP overlap | competitor positioning, positioningMatrix, objection handling per persona, win strategy, proof points + live Tavily data |

**Data Tools:**
- `web_research` (Tavily) — 8 real-time results → second LLM pass synthesizes 3-5 actionable insights; results injected into `competitive_matrix` and `battle_card` artifacts; cached 1 hour per query

**Phase 3 Execution Features:**
- Google Alerts setup: one-click alert chip per competitor in the matrix
- Competitor tracker API: ongoing monitoring at `/api/agents/atlas/track`

**Q-Score Impact:**
- Market +5 (competitive_matrix) + Market +4 (battle_card) = **9 total pts**

**Cross-Agent Relationships:**
- High relevance: Patel (ICP/market context), Nova (product-market positioning)
- Medium relevance: Sage (strategic context), Susi (competitive objection handling in sales)

---

### 4.9 SAGE — Strategic Advisor

**Role:** 12-month and 3-year roadmap design, OKR frameworks, build/buy/partner decisions, Series A/B readiness, platform strategy.

**Core Methodology:**
- Visionary but grounded — big picture always connected to immediate next actions
- Asks uncomfortable questions about long-term defensibility
- Helps founders distinguish urgent vs important (most founders confuse them)
- Synthesizer: has the widest cross-agent context window of all 9 agents (sees all other agents' artifacts)
- Opens every conversation: *"What does winning look like in 5 years?"*

**Deliverable Artifacts:**

| Artifact | Minimum Context Required | Output Structure |
|----------|------------------------|-----------------|
| `strategic_plan` | 3-5 year vision, current stage + key metrics, top 2-3 priorities this quarter, biggest strategic risks | vision statement, 3 core strategic bets, OKRs (3 objectives × 3 KRs), now/next/later roadmap, risk register, fundraising milestones |

**Phase 3 Execution Features:**
- Linear export: copies OKRs as markdown + opens linear.app/new
- Investor update email (via Sage's Resend endpoint)

**Q-Score Impact:**
- Product +4 (strategic_plan) = **4 total pts**

**Cross-Agent Relationships:**
- High relevance: **ALL 8 other agents** — Sage is the synthesizer; it gets the broadest context window (8 cross-agent artifacts + 15 activity events)
- Medium relevance: (none — already at maximum breadth)

---

## 5. Agent System Design

### 5.1 Chat Pipeline — Step by Step

```
POST /api/agents/chat
  { agentId, message, conversationHistory, userContext, conversationId }
          ↓
1. Server-side auth: userId from supabase.auth.getUser() — never from request body
          ↓
2. Usage limit check: 50 messages/month per user — fail-open (never blocks on error)
          ↓
3. System prompt assembly:
   a. Agent's dedicated system-prompt.ts (role, rules, deliverable capabilities)
   b. CONVERSATION_RULES (2-4 sentences, one focused question, data-first)
   c. MEMORY: getAgentContext(agentId, userId, topic) injects:
      • Own artifacts: up to N newest (N varies by agent, from lib/edgealpha.config.ts)
      • High-relevance agents: always included
      • Medium-relevance agents: only if topic matches domain keywords
      • Cross-agent activity events: last N from agent_activity
   d. Budget guard: if prompt > 6000 chars, trim MEMORY to 3 items
          ↓
4. LLM call: OpenRouter → claude-3.5-haiku
   • Context: last 10 messages + current message
   • max_tokens: 900, temperature: 0.7
          ↓
5. Tool-call detection: regex extracts <tool_call>{...}</tool_call> from response
   • 16 valid types: 12 artifacts + lead_enrich + web_research + create_deal + competitive_matrix
          ↓
6. Tool execution (if detected):
   Artifact tools → POST /api/agents/generate (2-pass generation)
   lead_enrich    → executeTool('lead_enrich', {domain}, userId, supabase, handler)
   web_research   → executeTool('web_research', {query}, userId, supabase, handler)
   create_deal    → executeTool('create_deal', {company, stage}, userId, supabase, handler)
          ↓
7. Message persistence (fail-open):
   • Upsert agent_conversations
   • Insert agent_messages (user + assistant roles)
          ↓
Response: { response, agentId, conversationId, timestamp, artifact? }
```

### 5.2 Two-Pass Artifact Generation

```
POST /api/agents/generate
  { agentId, artifactType, conversationHistory, userId, conversationId }

Wrapped in executeTool() — gets rate limiting, retry, logging automatically
          ↓
PASS 1: Context Extraction
  • LLM analyzes the full conversation
  • Extracts all relevant facts as key-value JSON (company, ICP, metrics, etc.)
  • Fallback: { conversationSummary: "..." } if extraction fails
          ↓
PASS 2: Artifact Generation
  • getArtifactPrompt(artifactType, extractedContext, researchData?)
    → returns artifact-specific prompt (e.g., ICP → 5-section template with exact field names)
  • LLM generates structured JSON: 3000 tokens, temp 0.4 (more deterministic)
  • JSON cleaned: strip markdown fences, parse
          ↓
POST-GENERATION (all 3 in parallel):
  • Persist to agent_artifacts: { user_id, agent_id, artifact_type, title, content JSONB }
  • applyAgentScoreSignal(): quality multiplier → dimension boost → new qscore_history row
  • Auto-create score_evidence: type='agent_artifact', status='verified'
  • embedArtifact(): pgvector embedding (skipped silently if circuit open)
          ↓
Response: { artifact: { id, type, title, content }, scoreBoost? }
```

### 5.3 Universal Tool Executor

Every tool call goes through `lib/tools/executor.ts`:

```
executeTool(toolId, args, userId, supabase, handler, conversationId?)
  1. Look up tool config from TOOLS registry (lib/edgealpha.config.ts)
     → cache TTL, cost per call, rate limit settings
  2. Rate limit check: module-level counter per (userId, toolId)
     → throws ToolRateLimitError if exceeded
  3. Cache check: key = SHA-256(toolId + JSON.stringify(args))
     → returns cached result + fromCache=true if within TTL
     → lead_enrich: 24h TTL | web_research: 1h TTL | artifacts: no cache
  4. Execute handler with retry:
     → max 2 retries, exponential backoff (30s per attempt)
  5. Fire-and-forget log to tool_execution_logs:
     → tool_id, user_id, args_hash, status, latency_ms, cost_usd, cache_hit, error_msg
  6. Return: { result, fromCache, latencyMs, costUsd }
```

### 5.4 The 16 Tool Types

**Data Tools (4):**

| Tool | Executor | Cache | Cost | Agents |
|------|---------|-------|------|--------|
| `lead_enrich` | Hunter.io domain search → 8 contacts markdown table | 24h | $0.001 | Patel, Susi |
| `web_research` | Tavily (8 results) → LLM synthesizes 3-5 insights | 1h | $0.005 | Atlas, Patel |
| `create_deal` | Insert into `deals` table + log activity | None | Free | Susi |
| `fetch_stripe_metrics` | Stripe restricted key → MRR/ARR/customers | None | Free | Felix |

**Artifact Tools (12) — all route to 2-pass generation:**

`icp_document` · `outreach_sequence` · `gtm_playbook` · `sales_script` · `brand_messaging` · `financial_summary` · `legal_checklist` · `hiring_plan` · `pmf_survey` · `interview_notes` · `competitive_matrix` · `battle_card` · `strategic_plan`

### 5.5 Circuit Breakers

`lib/circuit-breaker.ts` protects all external API calls:

```
withCircuitBreaker(serviceId, fn, fallback?)
  Threshold: >3 failures in 60 seconds → open circuit for 5 minutes
  Services: hunter_io | tavily | netlify | resend | openai_embeddings

  Special case: openai_embeddings circuit open
    → embedArtifact() skipped silently
    → Artifact generation continues unblocked
    → RAG cross-reference degrades gracefully
```

---

## 6. Cross-Agent Context System

Every agent's system prompt is enriched with context from other agents' work via `lib/agents/context.ts`.

### 6.1 Relevance Map

| Agent | High Relevance (always injected) | Medium Relevance (topic-conditional) |
|-------|----------------------------------|--------------------------------------|
| **Patel** | Atlas, Maya | Felix, Susi |
| **Susi** | Patel, Atlas | Felix |
| **Maya** | Patel | Atlas, Nova |
| **Felix** | Sage | Patel, Nova, Susi |
| **Leo** | — | Harper, Felix |
| **Harper** | Patel | Atlas, Felix |
| **Nova** | Patel, Atlas | Susi, Sage |
| **Atlas** | Patel, Nova | Sage, Susi |
| **Sage** | ALL 8 others | — |

### 6.2 How Context Is Built

```
getAgentContext(agentId, userId, topic?)
  1. Own artifacts: agent_artifacts WHERE agent_id=X AND user_id=Y
     LIMIT: varies (2–3 per agent)
  2. High-relevance agents: one query for all high-relevance IDs
     → always included regardless of topic
  3. Medium-relevance agents: only if topic matches AGENT_DOMAIN_KEYWORDS
     e.g., Patel's medium agents (Felix, Susi) only injected if message
     mentions pricing, budget, pipeline, revenue, etc.
  4. Activity events: agent_activity WHERE user_id=Y ORDER BY created_at DESC
     LIMIT: 5–15 (Sage gets 15, others 8–10)
  5. Low-relevance agents: skipped entirely
  6. Budget guard: if total prompt > 6000 chars, trim own artifacts to 3
```

### 6.3 Memory Window Sizes by Agent

| Agent | Own Artifacts | Cross-Agent | Activity Events |
|-------|--------------|-------------|----------------|
| Patel | 3 | 5 | 10 |
| Susi | 2 | 4 | 10 |
| Maya | 2 | 3 | 8 |
| Felix | 2 | 4 | 8 |
| Leo | 2 | 2 | 5 |
| Harper | 2 | 3 | 8 |
| Nova | 3 | 4 | 10 |
| Atlas | 3 | 4 | 10 |
| **Sage** | 2 | **8** | **15** |

---

## 7. Q-Score × Agent Feedback Loop

The Q-Score and agents are bidirectionally coupled — not separate systems.

### Forward Direction: Agents → Score

1. Founder chats with Patel
2. Patel generates `icp_document`
3. `applyAgentScoreSignal('icp_document', quality='full')` fires
4. GTM dimension gets +5 pts (×1.0 multiplier)
5. New `qscore_history` row inserted (chained to previous)
6. Dashboard updates: score trajectory ticks up

### Reverse Direction: Score → Agents

1. Founder's GTM score is 42
2. Dashboard "Score Challenges" shows GTM card → links to `/founder/agents/patel?challenge=gtm`
3. Agent page loads with yellow challenge banner: "Your GTM score is 42. Build your ICP to improve it."
4. Agent conversation opened in challenge mode

### Evidence Conflict Loop

1. Founder's assessment claims $50K MRR
2. Felix generates `financial_summary` showing $8K MRR
3. RAG evidence cross-reference detects conflict (Layer 2)
4. Conflict stored in `qscore_history.ai_actions.rag_eval.conflicts`
5. Red "Data Mismatch" banner appears on dashboard dimension bar
6. Improve-qscore page shows: "Your Financial assessment conflicts with your Felix financial summary. Update your assessment to reflect actual MRR."

### Staleness Detection

`lib/qscore/staleness.ts` checks 4 conditions after any significant activity:

| Condition | What It Means |
|-----------|--------------|
| `deals` count > (assessed customer count × 2) | Founder has more pipeline than they reported |
| Survey responses > 10 AND last assessment > 7 days ago | PMF data has grown since last scoring |
| Landing page deployed AND GTM score < 40 | Founder is further along than their score reflects |
| `hiring_plan` artifact exists AND assessed team size < 3 | Team has grown beyond what was assessed |

When stale: inserts `agent_activity` row (`action_type='assessment_stale'`). Dashboard shows "Update your assessment" banner. Deduplicates to max once per 7 days.

---

## 8. Investor-Facing System

### What Investors See

- **Deal flow page** (`/investor/deal-flow`): all founders with `onboarding_completed=true`, enriched with Q-Score and momentum label (hot/trending/steady based on recent score delta)
- **Startup deep-dive** (`/investor/startup/[id]`): Q-Score breakdown, financials from Felix artifact, team from Harper artifact, competitors from Atlas artifact, AI analysis derived from dimension scores
- **Portfolio page** (`/investor/portfolio`): accepted connections with Q-Score breakdowns and Felix financial data

### Match Score Algorithm

```
computeMatchScore(investor, founder)
  Base:            40 pts
  Sector match:   +30 pts (if investor.sectors[] includes founder.industry)
  Stage match:    +20 pts (if investor.stages[] includes founder.stage)
  Q-Score bonus:  +10 pts (if qScore > 70)
  Response rate:   +5 pts (investor.response_rate > 0.8)
  Max:            100 pts
```

---

## Quick Reference

### All 13 Artifact Types → Owning Agent

| Artifact | Owner | Dimension Boosted |
|----------|-------|------------------|
| `icp_document` | Patel | GTM +5 |
| `outreach_sequence` | Patel | Traction +4 |
| `gtm_playbook` | Patel | GTM +6 |
| `sales_script` | Susi | Traction +4 |
| `brand_messaging` | Maya | GTM +4 |
| `financial_summary` | Felix | Financial +6 |
| `legal_checklist` | Leo | Financial +3 |
| `hiring_plan` | Harper | Team +5 |
| `pmf_survey` | Nova | Product +5 |
| `interview_notes` | Nova | Product +3 |
| `competitive_matrix` | Atlas | Market +5 |
| `battle_card` | Atlas | Market +4 |
| `strategic_plan` | Sage | Product +4 |

### Total Max Score Boost From Agents

If a founder generates all 13 artifacts at full quality, they can earn up to **+58 points** in dimension boosts across 6 dimensions:
- GTM: +15 (Patel ×2 + Maya)
- Financial: +9 (Felix + Leo)
- Traction: +8 (Patel + Susi)
- Product: +12 (Nova ×2 + Sage)
- Market: +9 (Atlas ×2)
- Team: +5 (Harper)
