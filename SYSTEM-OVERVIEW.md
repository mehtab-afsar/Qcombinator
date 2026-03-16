# Edge Alpha — System Overview

## Part 1: Q-Score

### What Is Q-Score?

Q-Score is an algorithmic investment-readiness score from **0–100**. It measures a startup across **6 weighted dimensions** and produces a letter grade (A+ to F) plus a cohort percentile ranking.

### The 6 Dimensions

| Dimension | Weight | What It Measures | Agent That Improves It |
|-----------|--------|-----------------|----------------------|
| **Market** | 20% | TAM size, conversion rate realism, daily activity, LTV:CAC ratio | Atlas |
| **Product** | 18% | Customer validation depth, learning velocity, failed assumptions & pivots | Nova |
| **Go-to-Market** | 17% | ICP clarity, channel testing breadth, messaging effectiveness | Patel |
| **Financial** | 18% | Unit economics (gross margin), revenue scale, runway, projection realism | Felix |
| **Team** | 15% | Domain expertise, team completeness, resilience & adaptability | Harper |
| **Traction** | 12% | Customer conversation volume, commitment level, revenue, growth signals | Susi |

Each dimension scores 0–100 independently, then they're combined via weighted average into the overall Q-Score.

### How Scoring Works (End-to-End)

```
Founder submits assessment (10-min form)
        ↓
Optional RAG semantic evaluation (LLM scores answer quality 0–100 per field)
Falls back to heuristic char-count scoring if LLM unavailable
        ↓
6 dimension calculators run independently
Each has 3–4 sub-sections with explicit point breakdowns
        ↓
Confidence adjustment
  • Counts fields with data vs expected fields per dimension
  • <30% confidence → blends score toward baseline of 30
  • 0 fields → dimension scores 0 (don't score what you don't have)
        ↓
Bluff detection (fraud signals)
  • Round numbers (3+ metrics are clean multiples of 1000)
  • Impossible ratios (LTV:CAC > 20:1)
  • AI phrases ("leveraging", "synergistic", etc.)
  • Generic language (200+ chars with zero specifics)
  • Inconsistent financials (MRR 10x burn but no ARR)
  • Conversation mismatch (50+ convos but no quotes)
  • Penalties: high -10%, medium -3%, low -1% each (max -30%)
        ↓
Weighted average with partial-data re-normalization
  • Missing dimensions: re-normalize weights + 5% penalty each
        ↓
Grade assigned: A+ (95+), A (90+), B+ (85+), B (80+), C+ (75+), C (70+), D (60+), F (<60)
Percentile calculated against all users' latest scores
        ↓
Saved to qscore_history table (chained via previous_score_id for delta tracking)
```

### Dimension Calculator Details

**Market (20%)**
- TAM size: 1B+ → 40pts, 100M+ → 35, 10M+ → 28, 1M+ → 20, <1M → 10
- Conversion rate realism: 0.5–5% → 30pts (realistic), >10% → 5pts (unrealistic)
- Daily activity realism: 10–50% of TAM → 20pts
- LTV:CAC: 3:1+ → 10pts, 2:1 → 7, 1:1 → 4

**Product (18%)**
- Customer validation (40pts): conversation count + evidence quality (quotes, surprises, commitments)
- Learning velocity (30pts): build time + hypothesis testing completeness
- Failed assumptions (30pts): specificity of beliefs, discoveries, reasoning, responses

**GTM (17%)**
- ICP clarity (35pts): role, company size, industry, trigger, exclusion criteria
- Channel testing (35pts): channels tried + results tracked + CAC validation
- Messaging (30pts): tested vs untested, result quality

**Financial (18%)**
- Unit economics (40pts): gross margin (80%+ = 20pts) + revenue scale (1M+ ARR = 20pts)
- Runway (30pts): 18+ months → 30pts, <3 months → 5pts
- Projections (30pts): growth realism + assumption documentation

**Team (15%)**
- Domain expertise (40pts): origin story depth + unique advantage (structural moats)
- Team completeness (30pts): team size + complementary skills
- Resilience (30pts): failure quality + iteration speed

**Traction (12%)**
- Customer base (40pts): conversation volume (100+ = 20pts) + commitment level
- Revenue (30pts): 1M+ ARR = 30pts down to none = 0
- Growth signals (30pts): activity proxy from convos + revenue

### Score Update Triggers

**1. Full re-assessment** — founder re-submits assessment form → complete recalculation

**2. Agent artifact signals** — one-time per artifact type per user:

| Artifact | Dimension Boosted | Points |
|----------|------------------|--------|
| icp_document | GTM | +5 |
| outreach_sequence | Traction | +4 |
| battle_card | Market | +4 |
| gtm_playbook | GTM | +6 |
| sales_script | Traction | +4 |
| brand_messaging | GTM | +4 |
| financial_summary | Financial | +6 |
| legal_checklist | Financial | +3 |
| hiring_plan | Team | +5 |
| pmf_survey | Product | +5 |
| competitive_matrix | Market | +5 |
| strategic_plan | Product | +4 |

Idempotent — tracked via `(user_id, source_artifact_type)`. Each type only boosts once.

**3. Score evidence** — founder uploads proof (Stripe screenshots, LOIs, contracts) → manual review → points_awarded

### Sector-Specific Weights

8 sector profiles adjust dimension weights:
- **B2B SaaS** (default): market & product high, traction lower
- **B2C SaaS**: product & traction highest (viral/retention)
- **Marketplace**: traction & financial (GMV, unit economics)
- **Biotech/DeepTech**: market & team dominant, traction minimal
- **Consumer Brand**: traction & GTM & financial
- **Fintech**: financial & market (regulatory)
- **Hardware**: financial & team (execution)
- **E-commerce**: financial & traction (ROAS)

### Key Database Tables

**`qscore_history`** — core scoring chain
- `overall_score`, `{dimension}_score` × 6, `grade`, `percentile`
- `previous_score_id` (self-referencing chain for delta tracking)
- `data_source` ("assessment" | "agent_completion")
- `source_artifact_type` (for idempotent agent signals)
- `assessment_data` JSONB (cached full assessment)
- `ai_actions` JSONB (cached "What gets me to 80?" recommendations)

**`qscore_with_delta`** — auto-calculated view joining current → previous scores

**`score_evidence`** — user-uploaded proof per dimension

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/qscore/calculate` | POST | Full assessment → calculate + save |
| `/api/qscore/latest` | GET | Current score + deltas + trends |
| `/api/qscore/benchmarks` | GET | Per-dimension cohort percentiles |
| `/api/qscore/actions` | GET/POST | AI-generated improvement actions (lazy + cached) |

---

## Part 2: AI Agents

### Architecture

9 specialist agents across 3 pillars:

| Pillar | Agents |
|--------|--------|
| Sales & Marketing | **Patel** (GTM), **Susi** (Sales), **Maya** (Brand) |
| Operations & Finance | **Felix** (Finance), **Leo** (Legal), **Harper** (HR) |
| Product & Strategy | **Nova** (Product/PMF), **Atlas** (Competitive), **Sage** (Strategy) |

Each agent has:
- Dedicated system prompt (`features/agents/{id}/prompts/system-prompt.ts`)
- A `DELIVERABLE CAPABILITIES` section listing which artifacts it can produce
- Tool-call triggering rules (never in first 3 messages, must have enough context)
- Registry entry in `lib/edgealpha.config.ts` (tools, dataTools, qscoreBoosts, relevance maps)

### Chat Flow

```
POST /api/agents/chat
  { agentId, message, conversationHistory, userContext, conversationId, userId }
        ↓
Usage limit check (50 msg/month, fail-open)
        ↓
System prompt assembly:
  1. Agent's dedicated system prompt
  2. CONVERSATION_RULES (be direct, 2-4 sentences, one focused question)
  3. MEMORY — own artifacts (via getAgentContext())
  4. FOUNDER CONTEXT — high/medium-relevance cross-agent artifacts
  5. CROSS-AGENT ACTIVITY — last N activity events
  (total prompt capped at ~6000 chars)
        ↓
LLM call (OpenRouter → claude-3.5-haiku, 900 tokens, temp 0.7)
  • Last 10 conversation messages + current message as context
        ↓
Tool-call detection: regex extracts <tool_call>{JSON}</tool_call>
  • 16 valid types: 12 artifacts + lead_enrich + web_research + create_deal + competitive_matrix
        ↓
Tool execution via executeTool() — rate limit → cache check → execute → log
        ↓
Message persistence (fail-open)
        ↓
Response JSON: { response, agentId, conversationId, timestamp, artifact? }
```

### 16 Tool Types

**Data Tools (3)**

| Tool | Agents | What It Does |
|------|--------|-------------|
| `lead_enrich` | Patel, Susi | Hunter.io domain search → markdown table of 8 contacts |
| `web_research` | Atlas, Patel | Tavily API (8 results) → second LLM pass synthesizes 3-5 insights |
| `create_deal` | Susi | Inserts deal into `deals` table + logs activity |

**Artifact Tools (12)**

All follow the same pattern: trigger 2-pass generation → persist to `agent_artifacts` → apply Q-Score signal → auto-create score evidence.

| Artifact | Agent | JSON Structure |
|----------|-------|---------------|
| `icp_document` | Patel | buyerPersona, firmographics, painPoints, buyingTriggers, channels |
| `outreach_sequence` | Patel | targetICP, 5-7 step sequence (email/LinkedIn/call) with personalization tokens |
| `battle_card` | Atlas | competitor, positioningMatrix, objectionHandling, win strategy + live Tavily sources |
| `gtm_playbook` | Patel | ICP, positioning, channels, messaging, metrics, 90-day plan (3 phases) |
| `sales_script` | Susi | discoveryQuestions, pitchFramework, objections, closingLines |
| `brand_messaging` | Maya | positioning, 5 taglines, elevator pitches (1-liner/30s/2min), voice guide |
| `financial_summary` | Felix | snapshot (MRR/ARR/burn/runway), unit economics verdict, fundraising rec |
| `legal_checklist` | Leo | company stage, priority actions, incorporation/IP/fundraising items, red flags |
| `hiring_plan` | Harper | current gaps, next hires with requirements, org roadmap, compensation bands |
| `pmf_survey` | Nova | interview script (5 phases), Ellis test, experiments, segment analysis |
| `competitive_matrix` | Atlas | competitors, feature comparison, SWOT, positioning, white space + live Tavily |
| `strategic_plan` | Sage | vision, core bets, OKRs, now/next/later roadmap, risks, fundraising milestones |

> Note: `battle_card` ownership moved from Patel+Atlas → **Atlas only** as part of the refactor. Patel reads battle cards as cross-agent context but cannot generate them.

### Artifact Generation (2-Pass)

```
POST /api/agents/generate
  { agentId, artifactType, conversationHistory, userId, conversationId }

Wrapped in executeTool() — logs to tool_execution_logs, handles retries

Pass 1: Context Extraction
  • LLM analyzes conversation → extracts all relevant facts as key-value JSON
  • Fallback: conversationSummary if extraction fails

Pass 2: Artifact Generation
  • getArtifactPrompt(type, context, researchData?) returns type-specific prompt
  • LLM generates structured JSON (3000 tokens, temp 0.4)
  • JSON cleaned (strip markdown fences)
  • Persisted to agent_artifacts table
  • Q-Score signal applied (quality multiplier: full=1.0, partial=0.6, minimal=0.3)
  • Score evidence auto-created (type='agent_artifact', status='verified')
  • Artifact embedded for RAG (skipped silently if circuit open)
```

---

## Part 3: Refactor — Full Universalization (27 Tasks)

This section documents the architectural refactor completed in the most recent session.

### Phase 1 — Constants & Naming (Tasks 1–3)

**New: `lib/constants/`**

| File | Contents |
|------|---------|
| `artifact-types.ts` | 12 `ARTIFACT_TYPES` as const (e.g. `ICP_DOCUMENT: 'icp_document'`) |
| `dimensions.ts` | 6 `DIMENSIONS` as const — uses `GTM: 'gtm'` (not `'goToMarket'`) |
| `agent-ids.ts` | 9 `AGENT_IDS` as const (patel, susi, maya, felix, leo, harper, nova, atlas, sage) |
| `table-names.ts` | All Supabase table names documented |
| `artifact-dimension-map.ts` | `ARTIFACT_DIMENSION_MAP` — 12 artifact types → affected dimensions |
| `index.ts` | Re-exports all of the above |

**Key naming decisions resolved:**
- `icp_document` — kept as-is (not renamed to `icp_profile`; DB rows exist)
- `gtm` — `Dimension` type's `improvesScore` field now uses `'gtm'`; Q-Score breakdown's `goToMarket` key unchanged (too many frontend consumers)
- `battle_card` — Atlas is sole owner; removed from Patel's tool list and system prompt

### Phase 2 — Agent Config Registry (Tasks 4–8)

**New: `lib/edgealpha.config.ts`** — master registry

```ts
interface AgentConfig {
  id: AgentId
  name: string
  pillar: 'sales-marketing' | 'operations-finance' | 'product-strategy'
  tools: ArtifactType[]           // artifact types this agent exclusively owns
  dataTools: string[]             // 'lead_enrich' | 'web_research' | 'create_deal' | ...
  actions: string[]
  qscoreBoosts: Partial<Record<Dimension, number>>
  highRelevanceAgents: AgentId[]
  mediumRelevanceAgents: AgentId[]
  memory: { ownArtifacts: number; otherArtifacts: number; activityEvents: number }
}
```

Also contains:
- `TOOLS` array — 16 entries with `executor`, optional `cache` (ttl + key), `costUsd`
- `ACTIONS` array — platform / enrichment / handoff classification with `confirmation` flags
- `getAgent(id)`, `getAgentTools(id)` helper functions

**Modified: `lib/llm/tools.ts`**
- `AGENT_TOOLS` record replaced by `getToolsForAgent(agentId)` → derives from registry
- `TOOL_DEFINITIONS` JSON schemas stay in this file

**Modified: `features/qscore/services/agent-signal.ts`**
- Added `quality: 'full' | 'partial' | 'minimal'` parameter
- Quality multiplier (1.0 / 0.6 / 0.3) applied before saving dimension boost
- Quality heuristic: `JSON.stringify(content).length > 800 = full`, `> 300 = partial`, else `minimal`

**Deleted: All 9 `features/agents/{id}/config.ts`**
- `features/agents/index.ts` — removed per-agent config re-exports
- All config now lives exclusively in `lib/edgealpha.config.ts`

### Phase 3 — Universal Executors (Tasks 9–12)

**New: `lib/tools/executor.ts`**

```ts
export async function executeTool<T = unknown>(
  toolId: string,
  args: unknown,
  userId: string | undefined,
  supabase: SupabaseClient,
  handler: (args: unknown) => Promise<T>,
  conversationId?: string,
): Promise<ToolExecutionResult<T>>
```

Features:
- Rate limiting — module-level counters, throws `ToolRateLimitError`
- In-memory cache — keyed by `${toolId}:${argsHash}`, respects TTL from TOOLS registry
- Retry — max 2 retries, exponential backoff, 30s per attempt
- Unified logging — inserts to `tool_execution_logs` (`tool_id`, `user_id`, `args_hash`, `status`, `latency_ms`, `cost_usd`, `cache_hit`, `error_msg`)

**Modified: `app/api/agents/chat/route.ts`**
- `lead_enrich` and `web_research` handlers now call `executeTool()` — removes inline logging
- Security fix: `userId` sourced from `supabase.auth.getUser()` server-side, never from request body
- Context injection: replaced 40-line raw Supabase block with `getAgentContext()` + `formatContextForPrompt()`

**Modified: `app/api/agents/generate/route.ts`**
- Entire 2-pass generation wrapped in `executeTool()` — gets retry, logging, rate limiting automatically
- Security fix: `userId` from server auth

**New: `lib/actions/executor.ts`**

```ts
export async function executeAction(
  actionId: string, userId: string, agentId: string,
  args: unknown, supabase: SupabaseClient,
): Promise<ActionExecutionResult>
```

- Validates prerequisites (checks required artifact types exist for user)
- Dispatches: platform → handler; enrichment → `executeTool()`; handoff → returns `{ deepLink, clipboardContent }`
- Logs every action to `agent_activity` (fixes gap where clipboard actions were never tracked)

**New: `lib/actions/handlers/` (7 stub files)**
`deploy-site`, `send-investor-update`, `screen-resume`, `generate-nda`, `blog-post`, `host-survey`, `track-competitor` — each exports a handler stub ready for logic extraction from existing API routes.

### Phase 4 — Smart Cross-Agent Context (Tasks 13–15)

**Modified: `lib/edgealpha.config.ts`** — relevance maps added to all 9 agents

```
patel:  high=[atlas, maya],                    medium=[felix, susi]
susi:   high=[patel, atlas],                   medium=[felix]
maya:   high=[patel],                          medium=[atlas, nova]
felix:  high=[sage],                           medium=[patel, nova, susi]
leo:    high=[],                               medium=[harper, felix]
harper: high=[patel],                          medium=[atlas, felix]
nova:   high=[patel, atlas],                   medium=[susi, sage]
atlas:  high=[patel, nova],                    medium=[sage, susi]
sage:   high=[felix, patel, nova, atlas, susi, maya, harper, leo]
```

**New: `lib/agents/context.ts`**

```ts
export async function getAgentContext(
  agentId: string, userId: string,
  supabase: SupabaseClient, topic?: string,
): Promise<AgentContext>

export function formatContextForPrompt(ctx: AgentContext): string
```

Logic:
1. Own artifacts — up to `memory.ownArtifacts` entries, newest first
2. High-relevance agents — always included, one DB query
3. Medium-relevance agents — only if `topic` matches agent's domain keywords (`AGENT_DOMAIN_KEYWORDS` map)
4. Activity events — up to `memory.activityEvents`, newest first
5. Low-relevance agents — skipped entirely

### Phase 5 — Q-Score Feedback Loop (Tasks 16–18)

**Modified: `app/founder/improve-qscore/page.tsx`**
- Fetches `qscore_history.ai_actions.rag_eval.conflicts` on mount
- Displays red "Data Mismatch" banners per conflicted dimension with fix instructions

**Modified: `app/founder/dashboard/page.tsx`**
- Fetches conflict dimensions from latest score history
- Red dot shown on dimension bars that have active conflicts

**New: `lib/constants/artifact-dimension-map.ts`**

```ts
export const ARTIFACT_DIMENSION_MAP: Record<ArtifactType, Dimension[]> = {
  [ARTIFACT_TYPES.ICP_DOCUMENT]:      [DIMENSIONS.GTM, DIMENSIONS.MARKET],
  [ARTIFACT_TYPES.BATTLE_CARD]:       [DIMENSIONS.GTM, DIMENSIONS.MARKET],
  [ARTIFACT_TYPES.FINANCIAL_SUMMARY]: [DIMENSIONS.FINANCIAL, DIMENSIONS.TRACTION],
  // ... 9 more entries
};
```

**Modified: `features/qscore/rag/embeddings/embedding-pipeline.ts`**
- After `embedArtifact()`, uses `ARTIFACT_DIMENSION_MAP` to invalidate only affected dimension columns in `rag_score_cache`
- Nulls specific JSONB columns (`${dim}_cache`) — does NOT delete the whole row

**New: `lib/qscore/staleness.ts`**

4 staleness conditions:
1. `deals` count > (assessment.customerCount × 2)
2. `survey_responses` count > 10 AND last assessment > 7 days ago
3. Landing page deployed AND GTM score < 40
4. `hiring_plan` artifact exists AND assessment team size < 3

When stale: inserts `agent_activity` row `action_type='assessment_stale'`. Deduplicates — max once per 7 days.

### Phase 6 — Data Layer & Renderer (Tasks 19–20)

**New: `lib/data/` (6 typed data access files)**

| File | Functions |
|------|-----------|
| `artifacts.ts` | `getArtifacts`, `getLatestArtifact`, `getArtifactById`, `saveArtifact` |
| `scores.ts` | `getLatestScore`, `getScoreHistory`, `getScoreWithDelta`, `saveScore` |
| `activity.ts` | `getActivity`, `logActivity` |
| `deals.ts` | `getDeals`, `createDeal`, `updateDealStage` |
| `conversations.ts` | `getConversation`, `getHistory`, `saveMessage` |
| `evidence.ts` | `getEvidence`, `saveEvidence` |

All use service-role Supabase client, handle errors, return typed results.

**New: `components/artifacts/`**

```
components/artifacts/
  ArtifactRenderer.tsx        ← switch on artifact_type, generic JSON fallback
  shared/
    ArtifactCard.tsx
    ArtifactSection.tsx
    ArtifactActions.tsx
    ArtifactMeta.tsx
```

> Note: Full renderer extraction from `app/founder/agents/[agentId]/page.tsx` is pending. The directory structure and shell are in place.

### Phase 7 — Observability (Tasks 21–23)

**New: `supabase/migrations/20260315000001_rag_logs_v2.sql`**

Columns added to `rag_execution_logs`:
- `dimension TEXT`, `rubric_score NUMERIC(5,2)`, `evidence_score NUMERIC(5,2)`
- `benchmark_score NUMERIC(5,2)`, `final_score NUMERIC(5,2)`, `tokens_used INT`, `cache_hit BOOL`

Columns added to `tool_execution_logs`:
- `args_hash TEXT`, `cost_usd NUMERIC(10,6)`, `cache_hit BOOL`, `conversation_id UUID`

**Modified: `features/qscore/rag/rag-orchestrator.ts`**
- Captures `t0 = Date.now()` before scoring
- Calls `logDimensionScores()` after blended scoring completes
- Inserts one `rag_execution_logs` row per dimension with per-layer scores (rubric, evidence, benchmark, final)

**Enhanced: `app/api/admin/metrics/route.ts`** + **`app/admin/metrics/page.tsx`**
- Added `avgScoreByDimension` — per-dimension RAG score aggregation
- Tool cache hit rate and estimated cost tracking
- Admin dashboard shows: RAG Health, Tool Success, Agent Activity, Q-Score Velocity, Cache Health

**New: `lib/observability/tracer.ts`**

```ts
export async function trace<T>(
  operation: string,
  fn: () => Promise<T>,
  meta?: Record<string, unknown>,
): Promise<T>
```

- Module-level ring buffer: last 500 spans
- `getRecentSpans(limit?)` — returns newest-first, for debug endpoints
- Designed to wrap: `executeTool()`, `runRAGScoring()`, `calculatePRDQScore()`, `executeAction()`

### Phase 8 — Launch Readiness (Tasks 24–27)

**Task 24 — Security audit**
- All API routes verified: `userId` from `supabase.auth.getUser()`, never from request body
- `app/api/agents/chat/route.ts` and `app/api/agents/generate/route.ts` both fixed

**Task 25 — New: `lib/circuit-breaker.ts`**

```ts
export type ServiceId = 'hunter_io' | 'tavily' | 'netlify' | 'resend' | 'openai_embeddings';

export async function withCircuitBreaker<T>(
  service: ServiceId,
  fn: () => Promise<T>,
  fallback?: T,
): Promise<T>
```

- Threshold: >3 failures in 60 seconds → circuit opens for 5 minutes
- Special case: `openai_embeddings` circuit open → `embedArtifact()` skipped silently (artifact generation must not be blocked)
- `getCircuitStates()` for admin/debug

**Task 27 — New: `CONTRIBUTING.md`**
- 5-step guide: How to Add a New Agent
- 4-step guide: How to Add a New Tool
- Architecture notes: single source of truth, single artifact owner, server-side auth, fire-and-forget logging

---

## File Inventory

### Created (33 files)

```
lib/constants/artifact-types.ts
lib/constants/dimensions.ts
lib/constants/agent-ids.ts
lib/constants/table-names.ts
lib/constants/artifact-dimension-map.ts
lib/constants/index.ts
lib/edgealpha.config.ts
lib/tools/executor.ts
lib/actions/executor.ts
lib/actions/handlers/deploy-site.ts
lib/actions/handlers/send-investor-update.ts
lib/actions/handlers/screen-resume.ts
lib/actions/handlers/generate-nda.ts
lib/actions/handlers/blog-post.ts
lib/actions/handlers/host-survey.ts
lib/actions/handlers/track-competitor.ts
lib/agents/context.ts
lib/data/artifacts.ts
lib/data/scores.ts
lib/data/conversations.ts
lib/data/deals.ts
lib/data/activity.ts
lib/data/evidence.ts
lib/qscore/staleness.ts
lib/observability/tracer.ts
lib/circuit-breaker.ts
components/artifacts/ArtifactRenderer.tsx
components/artifacts/shared/ArtifactCard.tsx
components/artifacts/shared/ArtifactSection.tsx
components/artifacts/shared/ArtifactActions.tsx
components/artifacts/shared/ArtifactMeta.tsx
supabase/migrations/20260315000001_rag_logs_v2.sql
CONTRIBUTING.md
```

### Modified (12 files)

```
lib/llm/tools.ts                              — AGENT_TOOLS → getToolsForAgent()
features/qscore/services/agent-signal.ts      — quality param + multiplier
features/qscore/rag/rag-orchestrator.ts       — per-dimension logging
features/qscore/rag/embeddings/embedding-pipeline.ts — dimension-specific cache invalidation
app/api/agents/chat/route.ts                  — executeTool(), getAgentContext(), server auth fix
app/api/agents/generate/route.ts              — executeTool() wrapper, server auth fix
app/api/admin/metrics/route.ts                — per-dimension aggregation, cost tracking
app/admin/metrics/page.tsx                    — enhanced dashboard panels
app/founder/improve-qscore/page.tsx           — evidence conflict banners
app/founder/dashboard/page.tsx                — conflict indicators on dimension bars
features/agents/index.ts                      — removed per-agent config re-exports
features/agents/types/agent.types.ts          — improvesScore type: goToMarket → gtm
```

### Deleted (9 files)

```
features/agents/patel/config.ts
features/agents/susi/config.ts
features/agents/maya/config.ts
features/agents/felix/config.ts
features/agents/leo/config.ts
features/agents/harper/config.ts
features/agents/nova/config.ts
features/agents/atlas/config.ts
features/agents/sage/config.ts
```

---

## Remaining Follow-Up Work

| Item | Priority | Notes |
|------|----------|-------|
| Extract 12 renderers into `components/artifacts/renderers/` | Medium | `app/founder/agents/[agentId]/page.tsx` still contains them inline |
| Wire `withCircuitBreaker()` around Hunter.io, Tavily, Netlify, Resend, OpenAI embed calls | High | Files exist; wiring not yet done |
| Populate `lib/actions/handlers/` stubs | Medium | Extract logic from existing `/api/agents/*/route.ts` files |
| Apply `supabase/migrations/20260315000001_rag_logs_v2.sql` | High | Run against Supabase project |
| Smoke test (Task 26) | High | Chat 2 agents → tool call → artifact → Q-Score updated |
| Wrap critical paths with `trace()` | Low | `executeTool`, `runRAGScoring`, `executeAction` |

---

## Architecture Principles

1. **Single source of truth** — all agent config in `lib/edgealpha.config.ts`. Never hardcode agent IDs, artifact types, or dimension names as string literals.
2. **Single artifact owner** — each artifact type is owned by exactly one agent. Others can reference via cross-agent context.
3. **Server-side auth** — API routes must get `userId` from `supabase.auth.getUser()`, never from request body.
4. **Fire-and-forget logging** — `void supabase.from(...).insert()` for non-critical logs so failures never block responses.
5. **Registry-driven execution** — `executeTool()` reads TOOLS registry for cache TTL, rate limits, cost tracking. No hardcoded tool behavior in route handlers.
6. **Circuit breakers on external APIs** — Hunter.io, Tavily, Netlify, Resend, OpenAI embeddings all protected. Embeddings silently skipped when circuit open.
