# Q-Score System — Deep Dive

> Complete reference: how the Q-Score is built, how it calculates, where it's stored, and how it's accessed.

---

## Table of Contents

1. [What is the Q-Score?](#1-what-is-the-q-score)
2. [File Map](#2-file-map)
3. [The 6 Dimensions](#3-the-6-dimensions)
4. [Scoring Pipeline — Start to End](#4-scoring-pipeline--start-to-end)
5. [Dimension Calculators (Formulas)](#5-dimension-calculators-formulas)
6. [RAG Semantic Evaluation (3 Layers)](#6-rag-semantic-evaluation-3-layers)
7. [Confidence Adjustment](#7-confidence-adjustment)
8. [Bluff / AI-Input Detection](#8-bluff--ai-input-detection)
9. [Weighted Overall Calculation](#9-weighted-overall-calculation)
10. [Sector-Specific Weights](#10-sector-specific-weights)
11. [Cohort Percentile Ranking](#11-cohort-percentile-ranking)
12. [Agent Artifact Boosts](#12-agent-artifact-boosts)
13. [Dynamic Threshold System](#13-dynamic-threshold-system)
14. [Database — Where Scores Are Stored](#14-database--where-scores-are-stored)
15. [API Routes — How Scores Are Accessed](#15-api-routes--how-scores-are-accessed)
16. [Client-Side Access (React Hook)](#16-client-side-access-react-hook)
17. [Grade Scale & Thresholds](#17-grade-scale--thresholds)
18. [IQ Scoring (Parallel System)](#18-iq-scoring-parallel-system)
19. [Example API Responses](#19-example-api-responses)

---

## 1. What is the Q-Score?

The Q-Score is Edge Alpha's proprietary 0–100 founder readiness score. It quantifies how investor-ready a startup is across **6 independent dimensions**, adjusted for sector, bluff detection, confidence penalties, and cohort percentile ranking.

It is:
- Recalculated whenever the founder submits their assessment
- Boosted incrementally when agents produce artifacts
- Stored as an immutable audit chain in `qscore_history`
- Exposed via 5 API routes and a React hook

---

## 2. File Map

```
features/qscore/
├── types/
│   └── qscore.types.ts               # All TS types, grade scale, PRD weights
├── calculators/
│   ├── prd-aligned-qscore.ts         # Main orchestrator — combines 6 dimensions
│   └── dimensions/
│       ├── market.ts                 # Market dimension calculator
│       ├── product.ts                # Product dimension calculator
│       ├── gtm.ts                    # GTM dimension calculator
│       ├── financial.ts              # Financial dimension calculator
│       ├── team.ts                   # Team dimension calculator
│       └── traction.ts              # Traction dimension calculator
├── services/
│   ├── agent-signal.ts               # Artifact boost logic (one-time per type)
│   ├── cohort-scorer.ts              # Percentile ranking vs cohort snapshots
│   └── threshold-config.ts          # DB threshold cache + tier scoring
├── utils/
│   ├── sector-weights.ts             # 8 sector weight configs
│   ├── confidence.ts                 # Confidence-based score penalties
│   ├── bluff-detection.ts            # Fabrication / AI-input detection
│   └── recommendations.ts           # Improvement recommendation generator
├── rag/                              # 3-layer RAG semantic evaluation pipeline
│   └── (multiple files)
└── hooks/
    └── useQScore.tsx                 # Client-side fetch + real-time subscriptions

app/api/qscore/
├── calculate/route.ts                # POST — full scoring pipeline entry point
├── latest/route.ts                   # GET — latest score with deltas and trends
├── benchmarks/route.ts               # GET — per-dimension cohort percentile ranks
├── actions/route.ts                  # GET/POST — AI improvement actions (cached)
├── priority/route.ts                 # GET — top-3 AI priorities (6h cache)
├── thresholds/route.ts               # GET — current DB tier configurations
├── activity-boost/route.ts           # POST — trigger artifact boost
└── validate-claim/route.ts           # POST — validate a single metric via AI

features/iq/
└── calculators/iq-orchestrator.ts    # Separate 25-indicator IQ score (fire-and-forget)

supabase/migrations/
├── 20260316000002_qscore_dynamic_thresholds.sql   # Tier config table + 60+ seed rows
├── 20260317000001_founder_metric_snapshots.sql    # Cohort snapshot table
├── 20260225000012_qscore_assessment_data.sql      # assessment_data JSONB column
└── 20260212000001_qscore_previous_score.sql       # previous_score_id chain column
```

---

## 3. The 6 Dimensions

Every Q-Score is composed of 6 dimensions, each scored independently from 0–100.

| # | Dimension   | Default Weight | What It Measures |
|---|-------------|---------------|-----------------|
| 1 | Market      | 20%           | TAM size, conversion realism, activity rate, LTV:CAC |
| 2 | Financial   | 18%           | Gross margin, ARR, runway months, projected growth |
| 3 | Product     | 18%           | Customer validation depth, learning velocity, failed assumptions |
| 4 | Go-to-Market| 17%           | ICP clarity, channel testing breadth, messaging experiments |
| 5 | Team        | 15%           | Domain expertise, team completeness, resilience story |
| 6 | Traction    | 12%           | Customer conversations, commitments/LOIs, revenue |

> Weights are **sector-specific** — see [Section 10](#10-sector-specific-weights).

---

## 4. Scoring Pipeline — Start to End

This is the complete flow from form submission to persisted score.

```
┌─────────────────────────────────────────────────────────┐
│  PHASE 1 — Input & Configuration                        │
│  • Founder submits assessment form (7 sections, 60+ fields)
│  • Load previous qscore from qscore_history             │
│  • Fetch sector from founder_profiles                   │
│  • Load DB thresholds (qscore_thresholds) → 1h cache    │
│  • Load sector weights (qscore_dimension_weights) → 1h  │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2 — RAG Semantic Evaluation (3 Layers)           │
│  Layer 1: LLM rubric scoring of narrative fields        │
│  Layer 2: pgvector retrieval vs known-good answers      │
│  Layer 3: Benchmark validation + conflict detection     │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 3 — 6 Dimension Calculators (run in parallel)    │
│  Market → Product → GTM → Financial → Team → Traction   │
│  Each returns a 0–100 score                             │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 4 — Confidence Adjustment                        │
│  Per dimension: penalise if expected fields are missing  │
│  none (0%) → low (<30%) → medium (30–70%) → high (70%+) │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 5 — Bluff / AI-Input Detection                   │
│  Round numbers, impossible ratios, AI phrases, etc.     │
│  High: −10% | Medium: −3% | Low: −1% | Max cap: −30%    │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 6 — Weighted Overall Calculation                 │
│  overall = Σ(dimension_score × sector_weight)           │
│  Clamped to 0–100                                       │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 7 — Percentile & Grade                           │
│  Percentile: % of founders scoring below this score     │
│  Grade: A+ → F via fixed thresholds                     │
│  Delta: computed vs previous_score_id                   │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 8 — Cohort Percentile (if ≥100 total founders)   │
│  Load founder_metric_snapshots for same sector          │
│  Replace raw dimension scores with percentile ranks     │
│  Recalculate overall with new percentile scores         │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 9 — Persistence & Async Tasks                    │
│  • INSERT into qscore_history (main row)                │
│  • UPDATE founder_profiles.assessment_completed = true  │
│  • Fire-and-forget: founder_metric_snapshots row        │
│  • Fire-and-forget: IQ scoring (25 indicators)          │
│  • Fire-and-forget: rag_execution_logs metadata         │
└────────────────────────┬────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 10 — Response                                    │
│  Return: overall, grade, percentile, 6 dim scores,      │
│  deltas, trends, RAG metadata (~200–500ms total)        │
└─────────────────────────────────────────────────────────┘
```

---

## 5. Dimension Calculators (Formulas)

### Market Dimension (`features/qscore/calculators/dimensions/market.ts`)

| Sub-metric | Max Pts | How Scored |
|------------|---------|-----------|
| TAM Size | 40 | Tier lookup: $1B+ = 40, $100M+ = 35, $10M+ = 28, $1M+ = 20, <$1M = 10 |
| Conversion Rate | 30 | Realism check: 0.5–5% = full pts; outside range = deducted |
| Activity Rate | 20 | `(dailyActiveUsers / targetCustomers) × 100`; ideal = 10–50% |
| LTV:CAC Ratio | 10 | ≥3:1 = full pts; <1:1 = 0 pts |

**Formula:** `market = TAM_pts + conversionRate_pts + activityRate_pts + ltvcac_pts`

---

### Product Dimension (`features/qscore/calculators/dimensions/product.ts`)

| Sub-metric | Max Pts | How Scored |
|------------|---------|-----------|
| Customer Validation — Quantity | 20 | Conversation count: ≥100 = 20, 50–100 = 18, 30–50 = 15, etc. |
| Customer Validation — Quality | 20 | LLM rubric score of evidence text (quotes, specifics) |
| Learning Velocity | 30 | Build time ≤7 days (10 pts) + LLM iteration quality (20 pts) |
| Failed Assumptions | 30 | LLM evaluation of discovery narrative + pivots documented |

**LLM calls:** `evaluateEvidenceQuality()`, `evaluateLearningVelocity()`, `evaluateFailedAssumptions()`

---

### GTM Dimension (`features/qscore/calculators/dimensions/gtm.ts`)

| Sub-metric | Max Pts | How Scored |
|------------|---------|-----------|
| ICP Clarity | 35 | LLM semantic score of ICP description (0–35) |
| Channel Testing — Channels Tried | 15 | Count of distinct channels tested |
| Channel Testing — Results Evidence | 10 | LLM evaluation of stated channel results |
| Channel Testing — CAC Realism | 10 | `CAC / avgDealSize`; target ratio 0.1–0.4 |
| Messaging Testing | 30 | LLM evaluation of messaging experiments described |

---

### Financial Dimension (`features/qscore/calculators/dimensions/financial.ts`)

| Sub-metric | Max Pts | How Scored |
|------------|---------|-----------|
| Gross Margin | 20 | `(avgDealSize − COGS) / avgDealSize × 100`; ≥80% = 20 |
| ARR / Revenue | 20 | Tier: $1M+ = 20, $500K+ = 17, $100K+ = 14, $50K+ = 10, <$50K = 0–6 |
| Runway | 30 | Tier: ≥18 months = 30, 12–18 = 25, 9–12 = 20, 6–9 = 15, 3–6 = 10, <3 = 5 |
| Projected Growth | 15 | 50–300% YoY = full; outside range = 3–12 pts |
| Financial Projections Exist | 15 | Boolean: have projections been built? |

---

### Team Dimension (`features/qscore/calculators/dimensions/team.ts`)

| Sub-metric | Max Pts | How Scored |
|------------|---------|-----------|
| Domain Expertise | 40 | LLM eval of problem origin + "unfair advantage" explanation |
| Team Completeness — Cofounders | 15 | Has cofounders = 15, solo = 0 |
| Team Completeness — Size | 15 | Team size ≥3 = 15, size = 2 = 10, solo = 0 |
| Resilience Story | 30 | LLM eval of hardship / adversity narrative |

---

### Traction Dimension (`features/qscore/calculators/dimensions/traction.ts`)

| Sub-metric | Max Pts | How Scored |
|------------|---------|-----------|
| Customer Conversations | 20 | ≥100 = 20, 50–100 = 18, 30–50 = 15, 15–30 = 12, 5–15 = 8, <5 = 3 |
| Customer Commitment | 20 | Paid customers = 20, LOI signed = 15, Waitlist = 8, No commitments = 0 |
| Revenue | 30 | $1M+ ARR = 30, $500K+ = 28, $250K+ = 25, $100K+ = 20, pre-revenue = 0 |
| Evidence Quality | 30 | LLM eval of traction evidence specificity |

---

## 6. RAG Semantic Evaluation (3 Layers)

The RAG pipeline enriches raw numeric scoring with semantic quality evaluation of the founder's narrative.

### Layer 1 — LLM Rubric Scoring
- Narrative fields sent to LLM: `problemStory`, `advantageExplanation`, `customerQuote`, `icpDescription`, `messagingTests`
- LLM outputs `AnswerQuality` scores (0–100) per field
- Feeds into dimension calculators as quality multipliers

### Layer 2 — pgvector Retrieval
- Each narrative field is embedded via the embeddings model
- Top 3 similar high-quality answers retrieved from the RAG knowledge base
- If founder's answer pattern matches successful founders: confidence boosted
- If contradictions detected: flagged in `ragMetadata.evidenceSummary`

### Layer 3 — Benchmark Validation
- Numeric metrics (ARR, runway, TAM) compared vs sector benchmarks
- Detects conflicts: e.g., claims $5M ARR but runway only 3 months
- Conflict flags feed into bluff detection (Section 8)

**All RAG execution is logged** to `rag_execution_logs` (fire-and-forget).

---

## 7. Confidence Adjustment

If a dimension has too little data, its raw score is penalised.

| Confidence Level | Data Completeness | Penalty |
|-----------------|-------------------|---------|
| `high`          | ≥ 70%             | 0%      |
| `medium`        | 30–70%            | ~2%     |
| `low`           | < 30%             | ~5%     |
| `none`          | 0%                | Max     |

**Applied per dimension.** A founder who skips the Financial section will have their financial score reduced before it enters the weighted calculation.

---

## 8. Bluff / AI-Input Detection

`features/qscore/utils/bluff-detection.ts`

The system detects potentially fabricated or AI-generated answers and applies score penalties.

| Signal Type | Severity | Penalty | Detection Method |
|-------------|----------|---------|-----------------|
| `round_numbers` | Medium | −3% | ≥3 metrics are multiples of 1,000 |
| `impossible` | High | −10% | LTV:CAC > 20:1 (unrealistic) |
| `generic_phrases` | Medium | −3% | AI phrases: "paradigm shift", "leveraging cutting-edge", "disruptive innovation" |
| `inconsistent_evidence` | High | −10% | 50+ conversations claimed but zero customer quotes |
| `rag_conflict` | Medium | −3% | RAG Layer 3 finds numerical contradictions |
| `too_perfect` | Medium | −3% | Multiple metrics land exactly at ideal thresholds |
| `specificity_missing` | Low | −1% | No dates, names, or dollar amounts in narrative |

**Formula:**
```
bluffPenalty = (highSignals × 10) + (mediumSignals × 3) + (lowSignals × 1)
bluffPenalty = min(bluffPenalty, 30)  // capped at -30%
adjustedScore = rawScore × (1 - bluffPenalty / 100)
```

---

## 9. Weighted Overall Calculation

**Formula:**
```
overall = Σ(dimension_score[i] × weight[i])
overall = clamp(overall, 0, 100)
```

**With default weights:**
```
overall = (market × 0.20)
        + (financial × 0.18)
        + (product × 0.18)
        + (gtm × 0.17)
        + (team × 0.15)
        + (traction × 0.12)
```

Bluff penalty is applied to the **overall** after this calculation.

---

## 10. Sector-Specific Weights

`features/qscore/utils/sector-weights.ts`

8 sectors are defined. Each overrides the default dimension weights to reflect what investors in that sector care about most.

| Sector | Market | Product | GTM | Financial | Team | Traction |
|--------|--------|---------|-----|-----------|------|----------|
| **Default** | 0.20 | 0.18 | 0.17 | 0.18 | 0.15 | 0.12 |
| **B2B SaaS** | 0.20 | 0.15 | 0.22 | 0.20 | 0.12 | 0.11 |
| **Consumer** | 0.15 | 0.20 | 0.25 | 0.12 | 0.12 | 0.16 |
| **Deep Tech** | 0.18 | 0.25 | 0.10 | 0.15 | 0.22 | 0.10 |
| **Marketplace** | 0.18 | 0.15 | 0.18 | 0.15 | 0.12 | 0.22 |
| **Fintech** | 0.20 | 0.18 | 0.15 | 0.22 | 0.15 | 0.10 |
| **Healthcare** | 0.20 | 0.22 | 0.12 | 0.15 | 0.20 | 0.11 |
| **E-commerce** | 0.15 | 0.12 | 0.25 | 0.18 | 0.10 | 0.20 |
| **Edtech** | 0.18 | 0.20 | 0.18 | 0.12 | 0.15 | 0.17 |

> Rationale example — B2B SaaS: GTM elevated (long sales cycles); Traction lower (enterprise deals take months).
> Deep Tech: Product + Team IP matters most; early traction is not expected.

**How sector is determined:**
1. Read `sector` field from `founder_profiles`
2. If blank: infer from text fields using keyword matching in `calculate/route.ts`

---

## 11. Cohort Percentile Ranking

`features/qscore/services/cohort-scorer.ts`

### When It Activates
- Only when there are ≥100 total founders in the system
- Per-sector: needs ≥40 founders in the same sector; otherwise falls back to cross-sector

### How It Works

**Step 1 — Snapshot saved (fire-and-forget after every score calculation):**
```
founder_metric_snapshots row:
  user_id, qscore_history_id, sector,
  metrics: { tam, arr, runway_months, ltv_cac_ratio, channels_tried, ... }
  dimension_scores: { market, product, goToMarket, financial, team, traction }
  overall_score, calculated_at
```

**Step 2 — On next score calculation:**
1. Load all `founder_metric_snapshots` for the founder's sector
2. For each dimension, sort all founders by that dimension's score
3. Calculate: `percentile = (# founders scoring below this) / total × 100`
4. Replace raw dimension scores with percentile scores
5. Recalculate `overall` using sector weights with the new percentile dimension scores

**Example:** If your `market` score is 65 and 72% of founders score below 65, your cohort-adjusted market score = 72.

### Metrics Captured for Cohort
- Market: `tam`, `conversion_rate`, `activity_rate`, `ltv_cac_ratio`
- Financial: `arr`, `gross_margin_pct`, `runway_months`, `projected_growth_pct`
- GTM: `channels_tried`, `channel_results`, `cac_ratio`
- Product/Team/Traction: `conversation_count`, `build_time_days`

---

## 12. Agent Artifact Boosts

`features/qscore/services/agent-signal.ts`

When an agent produces a deliverable (artifact), the relevant Q-Score dimension receives a one-time boost.

### Boost Table

| Artifact Type | Dimension Boosted | Max Pts |
|--------------|-------------------|---------|
| `gtm_playbook` | Go-to-Market | 6 |
| `financial_summary` | Financial | 6 |
| `competitive_matrix` | Market | 5 |
| `hiring_plan` | Team | 5 |
| `pmf_survey` | Product | 5 |
| `icp_document` | Go-to-Market | 5 |
| `battle_card` | Market | 4 |
| `outreach_sequence` | Traction | 4 |
| `sales_script` | Traction | 4 |
| `brand_messaging` | Go-to-Market | 4 |
| `strategic_plan` | Product | 4 |
| `interview_notes` | Product | 3 |
| `legal_checklist` | Financial | 3 |

### Quality Multiplier
Boost points are multiplied by artifact quality based on content length:

| Quality | Content Length | Multiplier |
|---------|---------------|-----------|
| Full | ≥ 800 chars | 1.0 |
| Partial | 300–800 chars | 0.6 |
| Minimal | < 300 chars | 0.3 |

**Example:** GTM Playbook (full quality) = `6 × 1.0 = +6 pts` to GTM dimension score.

### Idempotency Guard
Before applying a boost:
1. Query `qscore_history` for any row where `source_artifact_type = <this artifact type>` for this user
2. If found: skip (boost already applied)
3. If not found: apply boost, insert new `qscore_history` row with `data_source = 'agent_completion'`

### Flow
```
Agent produces artifact
    → POST /api/qscore/activity-boost
    → applyAgentScoreSignal(userId, artifactType, artifactContent)
    → idempotency check
    → fetch latest qscore_history row
    → compute new dimension score = min(old_dim_score + boost_pts, 100)
    → recalculate weighted overall
    → INSERT new qscore_history row
    → UI shows score boost toast
```

---

## 13. Dynamic Threshold System

`features/qscore/services/threshold-config.ts`

### Problem Solved
Hard-coded if/else chains in dimension calculators meant changing tier thresholds required a code deploy.

### Solution
All tier configurations are stored in `qscore_thresholds` table and loaded with a 1-hour in-memory cache.

### Table Schema: `qscore_thresholds`

| Column | Type | Example |
|--------|------|---------|
| `dimension` | text | `'market'` |
| `metric` | text | `'tam'` |
| `tier_rank` | int | `1` (highest tier) |
| `min_value` | numeric | `1000000000` |
| `max_value` | numeric | NULL |
| `points` | int | `40` |
| `max_points` | int | `40` |
| `label` | text | `'$1B+ TAM'` |
| `is_active` | boolean | `true` |

### Example: Market TAM Tiers (from seed data)

```
tier_rank=1, min_value=1_000_000_000,  points=40,  label="$1B+ TAM"
tier_rank=2, min_value=100_000_000,    points=35,  label="$100M+ TAM"
tier_rank=3, min_value=10_000_000,     points=28,  label="$10M+ TAM"
tier_rank=4, min_value=1_000_000,      points=20,  label="$1M+ TAM"
tier_rank=5, min_value=NULL,           points=10,  label="Under $1M"
```

**Scoring logic:** Iterate tiers ordered by `tier_rank ASC`. Return points from first tier where `value >= min_value`.

### 1-Hour Cache
```typescript
// threshold-config.ts
let thresholdCache: ThresholdConfig | null = null;
let cacheExpiry = 0;

export async function getThresholds(): Promise<ThresholdConfig> {
  if (thresholdCache && Date.now() < cacheExpiry) return thresholdCache;
  thresholdCache = await fetchFromDB();
  cacheExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
  return thresholdCache;
}
```

### Related Table: `qscore_dimension_weights`

| Column | Type |
|--------|------|
| `sector` | text |
| `dimension` | text |
| `weight` | numeric |

Also 1-hour cached. Allows sector weights to be updated via DB without code changes.

---

## 14. Database — Where Scores Are Stored

### Primary Table: `qscore_history`

This is the **immutable audit chain** of all scores. Every recalculation inserts a new row; nothing is updated.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Score row ID |
| `user_id` | UUID FK | Links to `auth.users` |
| `previous_score_id` | UUID FK | Links to prior score row (forms a chain) |
| `overall_score` | int | 0–100 |
| `market_score` | int | 0–100 |
| `product_score` | int | 0–100 |
| `gtm_score` | int | 0–100 |
| `financial_score` | int | 0–100 |
| `team_score` | int | 0–100 |
| `traction_score` | int | 0–100 |
| `percentile` | int | 0–100, vs all founders |
| `grade` | text | A+, A, B+, B, C+, C, D, F |
| `assessment_data` | JSONB | Full founder assessment form data |
| `ai_actions` | JSONB | Cached RAG evaluation + improvement actions + daily priorities |
| `data_source` | text | `'assessment'` / `'agent_completion'` / `'manual'` |
| `source_artifact_type` | text | Artifact type if boost (e.g., `'gtm_playbook'`) |
| `calculated_at` | timestamp | When this row was created |

**Indexes:**
- `idx_qscore_history_user_id_calc_at` — Fast "latest score by user" queries

**Chain example:**
```
Row A (first assessment):  previous_score_id = NULL
Row B (second assessment): previous_score_id = Row A
Row C (artifact boost):    previous_score_id = Row B
```

---

### Cohort Snapshots: `founder_metric_snapshots`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `qscore_history_id` | UUID FK | Links to the qscore row that triggered this snapshot |
| `sector` | text | Founder's sector at time of calculation |
| `metrics` | JSONB | Raw numeric metrics (TAM, ARR, runway, etc.) |
| `dimension_scores` | JSONB | Raw dimension scores (market, product, gtm, ...) |
| `overall_score` | int | |
| `calculated_at` | timestamp | |

**Indexes:** `idx_fms_sector`, `idx_fms_calculated_at`, GIN on `metrics` JSONB.

---

### Supporting Tables

| Table | Purpose |
|-------|---------|
| `qscore_thresholds` | Dynamic tier configurations for all dimension sub-metrics |
| `qscore_dimension_weights` | Per-sector dimension weight overrides |
| `score_evidence` | Manual evidence attachments (founder uploads proofs) |
| `rag_execution_logs` | Per-call RAG execution metadata + timing |
| `iq_scores` | Results of the parallel IQ scoring system (25 indicators) |

---

### View: `qscore_with_delta`

A SQL view that joins each `qscore_history` row to its `previous_score_id` row to compute deltas.

```sql
SELECT
  current.*,
  (current.overall_score - prev.overall_score) AS overall_change,
  (current.market_score  - prev.market_score)  AS market_change,
  CASE
    WHEN (current.overall_score - prev.overall_score) > 2  THEN 'up'
    WHEN (current.overall_score - prev.overall_score) < -2 THEN 'down'
    ELSE 'neutral'
  END AS trend
FROM qscore_history current
LEFT JOIN qscore_history prev ON current.previous_score_id = prev.id
```

---

### RLS Policies

- Users can only read/write their **own** rows in `qscore_history` and `founder_metric_snapshots`
- Service role (API routes) has full access for cross-user cohort queries
- Score evidence is user-scoped

---

## 15. API Routes — How Scores Are Accessed

### POST `/api/qscore/calculate`

**Purpose:** Full scoring pipeline entry point.

**Input:** Assessment form data (7 sections, 60+ fields).

**Process:**
1. Load DB thresholds + sector weights
2. Run RAG pipeline
3. Run 6 dimension calculators
4. Apply confidence + bluff adjustments
5. Calculate weighted overall
6. Compute percentile + grade
7. Check for cohort scoring (if ≥100 founders)
8. Persist to `qscore_history`
9. Fire-and-forget: metric snapshot + IQ scoring + RAG logs

**Returns:** `{ overall, grade, percentile, breakdown: { market, product, gtm, financial, team, traction }, deltas, ragMetadata }`

---

### GET `/api/qscore/latest`

**Purpose:** Fetch the founder's current score with trends.

**Process:** Queries `qscore_with_delta` view for latest row per `user_id`.

**Returns:**
```json
{
  "qScore": {
    "overall": 72,
    "grade": "C+",
    "percentile": 58,
    "change": 5,
    "breakdown": {
      "market":     { "score": 65, "weight": 0.20, "change": 3,  "trend": "up" },
      "product":    { "score": 72, "weight": 0.18, "change": 2,  "trend": "neutral" },
      "goToMarket": { "score": 68, "weight": 0.17, "change": 8,  "trend": "up" },
      "financial":  { "score": 75, "weight": 0.18, "change": -2, "trend": "down" },
      "team":       { "score": 70, "weight": 0.15, "change": 0,  "trend": "neutral" },
      "traction":   { "score": 58, "weight": 0.12, "change": 10, "trend": "up" }
    },
    "ragMetadata": {
      "scoringMethod": "blended",
      "ragConfidence": 72,
      "evidenceSummary": ["✓ Market TAM validates", "✗ GTM channel conflicts found"]
    }
  }
}
```

---

### GET `/api/qscore/benchmarks`

**Purpose:** Return the founder's percentile rank per dimension vs the cohort.

**Process:** Deduplicates to one row per user (latest), counts founders scoring below for each dimension.

**Returns:**
```json
{
  "benchmarks": {
    "overall": 58,
    "market": 35,
    "product": 72,
    "goToMarket": 28,
    "financial": 45,
    "team": 80,
    "traction": 38,
    "cohortSize": 127
  }
}
```

---

### GET `/api/qscore/actions`

**Purpose:** Return 5 personalised AI improvement actions.

**Caching:** First call generates via LLM, stores in `ai_actions` JSONB on `qscore_history` row. Subsequent calls read from cache.

**Returns:**
```json
{
  "actions": [
    {
      "title": "Validate your $10M TAM with primary research",
      "description": "Your TAM is below median for your stage...",
      "dimension": "market",
      "impact": "+7 points",
      "agentId": "atlas",
      "agentName": "Atlas",
      "timeframe": "1 week",
      "starterPrompt": "Hi Atlas, I need help validating my TAM..."
    }
  ]
}
```

---

### GET `/api/qscore/priority`

**Purpose:** Return AI-generated top-3 priorities for the week.

**Caching:** 6-hour cache in `ai_actions` JSONB.

**Data pulled for context:** Q-Score breakdown, agent activity (last 7 days), pipeline deals, runway.

---

### POST `/api/qscore/activity-boost`

**Purpose:** Apply an artifact boost after an agent produces a deliverable.

**Called from:** `app/api/agents/generate/route.ts` after artifact creation.

**Input:** `{ userId, artifactType, artifactContent }`

**Process:** Runs `applyAgentScoreSignal()` — idempotency check, boost calculation, new row insert.

---

### POST `/api/qscore/validate-claim`

**Purpose:** Validate a single metric claim via AI (used in the Improve Q-Score page).

**Input:** `{ dimension, metric, value, context }`

**Returns:** `{ valid: boolean, confidence: number, suggestion: string }`

---

## 16. Client-Side Access (React Hook)

`features/qscore/hooks/useQScore.tsx`

```typescript
const { qScore, loading, error, refetch } = useQScore();
```

**Behaviour:**
1. On mount: fetches `GET /api/qscore/latest`
2. Subscribes to Supabase real-time channel on `qscore_history` table filtered by `user_id`
3. On new row inserted (e.g., after artifact boost): auto-refetches + triggers score toast
4. Fallback: reads from `localStorage` if DB unavailable

**Used in:**
- `app/founder/dashboard/page.tsx` — Q-Score ring, dimension bars, grade, percentile
- `app/founder/improve-qscore/page.tsx` — full dimension breakdown, improvement actions
- `app/founder/portfolio/page.tsx` — investor-facing Q-Score ring
- `app/investor/startup/[id]/page.tsx` — investor deep-dive view of founder score

---

## 17. Grade Scale & Thresholds

| Grade | Score Range | Interpretation |
|-------|------------|----------------|
| A+    | 95–100     | Exceptional — top-tier VC-ready |
| A     | 90–94      | Excellent — strong Series A candidate |
| B+    | 85–89      | Very Good — seed-fundable |
| B     | 80–84      | Good — solid fundamentals |
| C+    | 75–79      | Decent — needs specific improvements |
| C     | 70–74      | Developing — several gaps |
| D     | 60–69      | Weak — major gaps in core areas |
| F     | 0–59       | Not ready — fundamental issues |

**Trend thresholds (from `qscore_with_delta` view):**
- `up`: Δ > +2 points
- `down`: Δ < −2 points
- `neutral`: −2 ≤ Δ ≤ +2

---

## 18. IQ Scoring (Parallel System)

`features/iq/calculators/iq-orchestrator.ts`

The IQ score is a **completely separate, parallel scoring system** that runs fire-and-forget after every Q-Score calculation. It does **not** affect the Q-Score — it is displayed independently in the dashboard as a second dimension of founder readiness.

---

### Overview

| Property | Value |
|----------|-------|
| Scale | 0–5 (raw) → normalized to 0–100 for display |
| Indicators | 25 (across 5 parameters) |
| Execution | Fire-and-forget after Q-Score pipeline completes |
| Data sources | Stripe API, agent artifacts, self-reported, AI reconciled |
| Storage | `iq_scores` + `iq_indicator_scores` tables |

---

### File Map

```
features/iq/
├── types/iq.types.ts               # All types, CONFIDENCE_MAP, PARAMETER_NAMES, IQScore
├── services/
│   └── confidence-engine.ts        # Source confidence × consistency penalty → effective score
├── calculators/
│   ├── data-resolver.ts            # 25 per-indicator data resolvers (multi-source hierarchy)
│   ├── indicator-scorer.ts         # Threshold-based 1–5 scoring per indicator
│   ├── cross-validator.ts          # 12 consistency rules → contradiction flags
│   ├── ai-reconciler.ts            # Anti-hallucination 2-call consensus for AI indicators
│   └── iq-orchestrator.ts          # Main pipeline orchestrator

app/api/iq/
├── calculate/route.ts              # POST — trigger full IQ scoring
├── latest/route.ts                 # GET — latest IQ score for user
└── indicators/route.ts             # GET/PATCH — read or update 25 indicator configs (admin)
```

---

### The 5 Parameters

Each parameter contains 5 indicators. Parameter weights are **sector-specific** (8 sectors, stored in `iq_parameter_weights`).

| ID | Parameter | What It Measures |
|----|-----------|-----------------|
| P1 | Market Readiness | Revenue intensity, growth, quality, concentration, density |
| P2 | Market Potential | SAM, margins, LTV:CAC, leverage, competitor density |
| P3 | IP / Defensibility | Registered IP, R&D intensity, technical team, build time, replication cost |
| P4 | Founder / Team | Domain depth, alignment, prior ventures, tech leadership, team stability |
| P5 | Structural Impact | Carbon impact, efficiency, SDG breadth, SDG revenue, Viksit Bharat alignment |

---

### The 25 Indicators

| Code | Parameter | Indicator | Data Source |
|------|-----------|-----------|------------|
| 1.1 | Market Readiness | Revenue Intensity | Stripe API / Felix artifact |
| 1.2 | Market Readiness | Revenue Growth | Stripe API / Felix artifact |
| 1.3 | Market Readiness | Revenue Quality | Stripe API / Felix artifact |
| 1.4 | Market Readiness | Revenue Concentration | Self-reported |
| 1.5 | Market Readiness | Revenue Density | Stripe API / Self-reported |
| 2.1 | Market Potential | SAM Size | AI reconciled + Tavily grounding |
| 2.2 | Market Potential | Gross Margin | Felix artifact / self-reported |
| 2.3 | Market Potential | LTV:CAC Ratio | Felix artifact / self-reported |
| 2.4 | Market Potential | Leverage | Self-reported |
| 2.5 | Market Potential | Competitor Density | AI reconciled + Tavily grounding |
| 3.1 | IP / Defensibility | Registered IP Count | Self-reported |
| 3.2 | IP / Defensibility | R&D Intensity | Self-reported |
| 3.3 | IP / Defensibility | Technical Team % | Harper artifact / self-reported |
| 3.4 | IP / Defensibility | Build Time | Self-reported |
| 3.5 | IP / Defensibility | Replication Cost | AI reconciled |
| 4.1 | Founder / Team | Domain Depth | Self-reported |
| 4.2 | Founder / Team | Team Alignment | Self-reported |
| 4.3 | Founder / Team | Prior Ventures | Self-reported |
| 4.4 | Founder / Team | Tech Leadership | Harper artifact / self-reported |
| 4.5 | Founder / Team | Team Stability | Self-reported |
| 5.1 | Structural Impact | Carbon Impact | Self-reported |
| 5.2 | Structural Impact | Efficiency Improvement | Self-reported |
| 5.3 | Structural Impact | SDG Breadth | AI reconciled |
| 5.4 | Structural Impact | SDG Revenue Linkage | Self-reported |
| 5.5 | Structural Impact | Viksit Bharat Alignment | AI reconciled |

---

### Data Source Hierarchy & Confidence Multipliers

Each indicator resolves data from the highest-trust source available.

| Source | Confidence Multiplier | Description |
|--------|-----------------------|-------------|
| `stripe_api` | 1.00 | Live Stripe metrics (most trusted) |
| `felix_artifact` | 0.85 | Financial Summary artifact from Felix agent |
| `harper_artifact` | 0.80 | Hiring Plan artifact from Harper agent |
| `atlas_artifact` | 0.78 | Competitive Matrix from Atlas agent |
| `ai_reconciled_grounded` | 0.72 | AI estimate with Tavily web grounding |
| `self_reported` | 0.55 | Founder-entered assessment data |
| `ai_reconciled` | 0.50 | AI estimate without grounding |
| `excluded` | 0.00 | Indicator skipped (insufficient data) |

**Resolution order per indicator:**
```
Stripe API → Agent Artifact → Self-reported → AI Estimated → Excluded
```

---

### Indicator Scoring Formula (1–5 Scale)

Each indicator is scored 1–5 using DB-driven thresholds from `iq_indicators`:

| Threshold Field | Meaning |
|----------------|---------|
| `score_1_max` | Max value that gets a score of 1 |
| `score_3_max` | Max value that gets a score of 3 |
| `score_5_min` | Min value that gets a score of 5 |

**Interpolation:**
```
if value <= score_1_max  → score = 1
if value >= score_5_min  → score = 5
else interpolate linearly between 1–5 based on position between thresholds
```

Inverted metrics (`higher_is_better = false`) flip the direction before scoring.

---

### AI Reconciler (Anti-Hallucination Consensus)

For 5 AI-reconciled indicators (2.1 SAM, 2.5 Competitor Density, 3.5 Replication Cost, 5.3 SDG Breadth, 5.5 Viksit Bharat):

**3-call consensus process:**

```
Call A (System A — conservative analyst):
  Inject: founder profile + live Tavily search results
  Output: { score: 1–5, reasoning: string, evidence_quotes: string[] }

Call B (System B — critical due-diligence analyst):
  Same context, independent call
  Output: { score: 1–5, reasoning: string, evidence_quotes: string[] }

If |scoreA - scoreB| <= 1.0:
  final = mean(scoreA, scoreB)
Else:
  Call C (tiebreaker):
    Inject: Call A + Call B reasoning
    Output: final score

Hallucination Guard:
  Each evidence_quote must be a verbatim substring of the injected Tavily context
  Quotes that don't pass → stripped from evidence_citations
```

---

### Cross-Validator (12 Consistency Rules)

`features/iq/calculators/cross-validator.ts`

Detects logical contradictions across indicators. Each flag reduces confidence.

| Rule | Severity | Trigger Condition |
|------|----------|------------------|
| `IP_DEVTIME_MISMATCH` | High | Claims IP but build time < 3 months |
| `LTV_CAC_CONCENTRATION` | Medium | High LTV:CAC but >50% revenue from 1 customer |
| `REVENUE_INTENSITY_NO_RECURRING` | High | High revenue but revenue_quality (recurring %) is low |
| `HIGH_GROWTH_NO_CUSTOMERS` | High | >100% growth but conversation count < 10 |
| `TEAM_STABILITY_MISMATCH` | Medium | Claims stable team but high churn indicators |
| `SDG_NO_REVENUE_LINK` | Low | Claims SDG impact but no SDG revenue linkage |
| `STRIPE_SELF_REPORT_DELTA` | High | Stripe MRR deviates >30% from self-reported MRR |
| `IP_NO_RD` | Medium | Claims IP but R&D intensity < 5% |
| + 4 more rules | Low–Medium | Various financial and team contradictions |

**Confidence penalties applied:**
- High severity flag: −15% confidence on affected indicators
- Medium: −8% | Low: −3%

---

### Confidence Engine

`features/iq/services/confidence-engine.ts`

For each indicator:
```
baseConfidence = CONFIDENCE_MAP[dataSource]   // 0.00–1.00
consistencyPenalty = Σ(flag.confidencePenalty) for all flags on this indicator
finalConfidence = max(baseConfidence - consistencyPenalty, 0.30)  // floor at 0.30
effectiveScore = rawScore × finalConfidence
```

**Parameter aggregation:**
```
parameterScore = Σ(effectiveScore[i] × indicatorWeight[i]) / 5
```

**Overall IQ Score:**
```
overallScore_0_to_5 = Σ(parameterScore[p] × sectorWeight[p])
normalizedScore_0_to_100 = (overallScore_0_to_5 / 5.0) × 100
```

---

### IQ Scoring Pipeline (Orchestrator)

```
POST /api/iq/calculate
    ↓
Load founder profile + sector
    ↓
Load 25 indicator configs from iq_indicators (1h cache)
Load sector parameter weights from iq_parameter_weights (1h cache)
    ↓
For each of 25 indicators:
  data-resolver.ts → resolve value from best available source
    ↓
For each indicator:
  if ai_reconciled = true → ai-reconciler.ts (2–3 LLM calls + Tavily)
  else → indicator-scorer.ts (threshold interpolation)
    ↓
cross-validator.ts → generate ConsistencyFlag[] for all indicators
    ↓
confidence-engine.ts → apply source confidence × consistency penalties
    ↓
Aggregate: indicator scores → parameter scores → overall 0–5 → normalize to 0–100
    ↓
Assign grade (same scale as Q-Score: A+ → F)
    ↓
INSERT iq_scores row
INSERT iq_indicator_scores rows (one per indicator, with reasoning + evidence)
    ↓
Return { iqScore }
```

---

### Database Tables

**`iq_scores`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `user_id` | UUID FK | |
| `previous_score_id` | UUID FK | Audit chain |
| `overall_score` | numeric | 0–5 raw score |
| `normalized_score` | int | 0–100 display score |
| `parameter_scores` | JSONB | `{ p1: 3.2, p2: 4.1, p3: 2.8, p4: 3.9, p5: 2.1 }` |
| `indicators_used` | int | Count of indicators with data |
| `indicators_excluded` | int | Count skipped (no data) |
| `scoring_method` | text | `'full'` / `'partial'` / `'estimated'` |
| `sector` | text | Sector used for parameter weights |
| `calculated_at` | timestamp | |

**`iq_indicator_scores`** (25 rows per scoring run)

| Column | Type | Description |
|--------|------|-------------|
| `iq_score_id` | UUID FK | Parent score row |
| `user_id` | UUID FK | |
| `indicator_code` | text | e.g., `'1.1'`, `'3.5'` |
| `raw_score` | numeric | 1–5 before confidence adjustment |
| `confidence` | numeric | 0.30–1.00 final confidence |
| `effective_score` | numeric | `raw_score × confidence` |
| `data_source` | text | e.g., `'stripe_api'`, `'self_reported'` |
| `raw_value` | numeric | The actual metric value scored |
| `reasoning` | text | AI or rule-based explanation |
| `evidence_citations` | JSONB | Verified quotes from Tavily/context |
| `consistency_flags` | JSONB | Array of contradiction flags triggered |

**`iq_indicators`** (config table, 25 static rows)

| Column | Description |
|--------|-------------|
| `code` | `'1.1'` through `'5.5'` |
| `parameter_id` | 1–5 |
| `name`, `description` | Human-readable |
| `score_1_max`, `score_3_max`, `score_5_min` | DB-driven thresholds |
| `higher_is_better` | boolean — invert scoring direction |
| `ai_reconciled` | boolean — use AI reconciler vs threshold scorer |
| `unit` | e.g., `'USD'`, `'%'`, `'months'` |

**`iq_parameter_weights`** (40 rows — 8 sectors × 5 parameters)

| Column | Description |
|--------|-------------|
| `sector` | `'saas_b2b'`, `'biotech_deeptech'`, `'fintech'`, etc. |
| `parameter_id` | 1–5 |
| `weight` | 0–1, sums to 1.0 per sector |

---

### IQ vs Q-Score: Key Differences

| | Q-Score | IQ Score |
|--|---------|----------|
| Scale | 0–100 | 0–5 → normalized 0–100 |
| Dimensions | 6 | 5 parameters, 25 indicators |
| Data sources | Assessment form + agent artifacts | Stripe + artifacts + self-reported + AI |
| LLM usage | Per dimension for narrative quality | Per AI-reconciled indicator (consensus) |
| Confidence | Applied globally (bluff detection) | Per-indicator (source + consistency) |
| Triggered by | Assessment form submit | Fire-and-forget after Q-Score |
| Affects Q-Score | No | No (completely independent) |
| Audit chain | `previous_score_id` chain | `previous_score_id` chain |
| Admin tunable | DB thresholds (1h cache) | DB thresholds + parameter weights (1h cache) |

---

## 19. Example API Responses

### Full Calculate Response
```json
{
  "success": true,
  "score": {
    "overall": 74,
    "grade": "C+",
    "percentile": 62,
    "breakdown": {
      "market":     { "score": 72, "weight": 0.20 },
      "product":    { "score": 80, "weight": 0.18 },
      "goToMarket": { "score": 65, "weight": 0.17 },
      "financial":  { "score": 71, "weight": 0.18 },
      "team":       { "score": 85, "weight": 0.15 },
      "traction":   { "score": 60, "weight": 0.12 }
    },
    "previousScore": 69,
    "delta": 5,
    "bluffPenalty": 3,
    "confidenceAdjustments": {
      "market": 0, "product": 2, "goToMarket": 5, "financial": 0, "team": 0, "traction": 2
    },
    "ragMetadata": {
      "scoringMethod": "rag_enhanced",
      "ragConfidence": 78,
      "layersUsed": ["rubric", "retrieval", "benchmark"],
      "evidenceSummary": [
        "✓ Problem narrative is specific and credible",
        "✓ TAM calculation methodology is sound",
        "✗ GTM channels tried lacks evidence of results",
        "⚠ Financial projections appear optimistic vs sector benchmarks"
      ]
    }
  }
}
```

---

## Summary

```
Assessment Form (60+ fields)
        ↓
RAG Pipeline (3 layers: rubric + retrieval + benchmarks)
        ↓
6 Dimension Calculators (formulas + LLM eval)
        ↓
Confidence Penalties + Bluff Detection
        ↓
Weighted Overall (sector-specific weights)
        ↓
Percentile + Grade
        ↓ (if ≥100 founders)
Cohort Percentile Replacement
        ↓
INSERT → qscore_history (immutable audit chain)
        ↓ (fire-and-forget)
founder_metric_snapshots + IQ scoring + RAG logs
        ↓
Client reads via useQScore() hook
        ↓ (real-time)
Supabase subscription → auto-refetch on new rows
```

The entire pipeline runs in **200–500ms** end-to-end.
