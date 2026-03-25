# Q-Score Engineering Reference
## Before → After / User Story / What Still Needs Work

---

## 1. Before vs After — What Changed

### Before (what existed when the audit started)

| Component | State |
|-----------|-------|
| **Artifact dimension mappings** | 5 of 13 artifacts boosted the wrong dimension. PMF Survey → Product (should be Traction). Brand Messaging → GTM (should be Product). Legal Checklist → Financial (should be Team). The "challenge" CTAs sent founders to the wrong agents. |
| **Artifact quality** | Every artifact got `quality = 'full'` (1.0× multiplier) regardless of content. A 50-character shell got the same score boost as a fully detailed GTM Playbook. |
| **Sector weights in artifact boost** | `applyAgentScoreSignal()` recalculated the overall score using hardcoded weights (GTM: 17%, Team: 15%) even when the founder's DB sector weights said otherwise. A Biotech founder's Hiring Plan was weighted at 15% team, not 20% biotech team weight. |
| **score_evidence** | Founders could attach verified proof (LOI, Stripe screenshot, patent) on the Improve Score page. `points_awarded` was saved to DB. **Nothing ever read it.** Zero effect on the score. Completely orphaned. |
| **Profile builder cooldown** | No rate limiting. Submit → see score → tweak answers → submit again → higher score. Unlimited gaming, no cooldown, no detection. |
| **Score decay** | Score was fully sticky forever. A founder who scored 72 in 2024 still showed 72 in 2026 to investors. No freshness signal. |
| **Investor pages** | Raw stored score shown. No staleness indicator. No decay. No way for an investor to know if the data is 3 days old or 3 years old. |
| **IQ Score** | DB had 25 seeded indicators from Bessemer, YC, Carta. Code was deleted in a cleanup. `calculate/route.ts` had a comment saying "IQ scoring fires here" — it did nothing. |
| **GTM Diagnostics** | Fully implemented in code, storing D1/D2/D3 per scoring run. Already wired to the Improve page. Was not broken — just unverified. ✓ |
| **RAG pipeline** | 3-layer system existed and ran: rubric LLM scoring + pgvector evidence cross-reference + benchmark validation. Working, but confidence varied. |
| **Portfolio confidence chip** | No confidence indicator on Q-Score ring. No decay indicator. Just the number. |
| **Dashboard decay indicator** | Staleness banner existed (visual warning) but score shown was always the raw stored score regardless of age. |

---

### After (what is true now)

| Component | What changed |
|-----------|-------------|
| **Artifact dimension mappings** | All 13 artifact types now map to the correct dimensions in both `agent-signal.ts` (ARTIFACT_BOOST) and `generate/route.ts` (ARTIFACT_DIMENSION). Single source of truth. PMF Survey → Traction, Brand Messaging → Product, etc. |
| **Artifact quality** | After every artifact is saved, a fast LLM call (80 tokens, temp 0.1) scores it 0–100 on completeness/specificity/actionability. Result maps to `full` / `partial` / `minimal`. Passed to `applyAgentScoreSignal()`. A shallow artifact now gets `round(5 × 0.3) = 2 pts` not 5. |
| **Sector weights in artifact boost** | `applyAgentScoreSignal()` now calls `fetchDimensionWeights(supabase, sector)` using the founder's actual industry from `founder_profiles`. Biotech founders get team weighted at 20%, not 15%. Uses the same cache as the full assessment. |
| **score_evidence** | `calculate/route.ts` now queries `score_evidence WHERE status = 'verified'`, groups by dimension, sums `points_awarded`, and applies them as additive boosts BEFORE saving the final qscore_history row. Verified proof actually moves the score. |
| **Profile builder cooldown** | `submit/route.ts` checks `qscore_history WHERE data_source = 'profile_builder' AND calculated_at > NOW() - 30 days`. If found, returns HTTP 429 `{ error: "Assessment locked for 30 days", retakeAvailableAt }`. First submission always allowed. |
| **Score decay** | `/api/qscore/latest` computes `effectiveScore = storedScore × decayFactor` before returning. 0–89d = 1.0×, 90–179d = 0.975×, 180–269d = 0.95×, 270–364d = 0.90×, 365d+ = 0.80×. Stored row is never modified. Decay is a read-time presentation adjustment only. Returns `overall` (effective), `rawOverall`, `decayApplied`, `daysSince`. |
| **Investor deal flow** | Shows decay-adjusted score. Freshness badge: green "Fresh" (<30d), amber "Xd old" (30–90d), red "Stale Xd" (90d+). Both the deal-flow API and startup deep-dive API apply the same decay formula. |
| **Investor startup deep-dive** | Q-Score header shows "Updated Xd ago" in colour. If decay reduced the score, shows raw score in parentheses. IQ Score now shown in sidebar as "Data Confidence" card. |
| **IQ Score** | `features/iq/calculators/iq-calculator.ts` built. Threshold-based, no LLM. Reads 25 indicators from `iq_indicators` DB table. Extracts raw values from AssessmentData. Scores each indicator 1/3/5 via thresholds. Applies confidence (direct: 90%, derived: 70%, estimated: 45%). Excluded indicators don't penalise — they just narrow coverage. Result: `normalizedScore` (0–100), grade, scoring method. Fires async after every Q-Score calculation via `calculate/route.ts`. `GET /api/iq/latest` returns latest score or `{ iqScore: null }`. |
| **Portfolio confidence chip** | Q-Score ring now shows: (1) confidence chip — "High / Medium / Low confidence" based on `ragMetadata.ragConfidence`, (2) decay indicator — "Xd old — reassess" in amber when decay is active. Both values flow from `/api/qscore/latest` via `portfolio.service.ts`. |
| **Dashboard decay indicator** | When `decayApplied === true` and `rawOverall !== overall`, shows "Score reduced from X — reassess to restore" in red under the age indicator. |
| **`PRDQScore` type** | Now includes `rawOverall?`, `decayApplied?`, `daysSince?` so the type system reflects what the API actually returns. |

---

## 2. The Q-Score User Story (How It Actually Works)

### The full journey for a founder

**Step 1 — First assessment (Profile Builder)**
The founder fills the 7-section profile builder. On submit, the server:
1. Requires ≥ 3 sections at 70%+ completion
2. Checks 30-day cooldown (blocks gaming)
3. Runs `mergeToAssessmentData()` → builds the unified `AssessmentData` object
4. Calls `calculatePRDQScore()` with DB thresholds, sector weights, optional RAG output
5. Applies "bluff detection" — if incomplete sections exist, blends toward baseline
6. Inserts a `qscore_history` row with `data_source = 'profile_builder'`

**Step 2 — Deep assessment (full form)**
The founder completes the full assessment with all 6 dimensions of data. The server runs the complete pipeline:
1. `dataSourceMap` built — marks each metric as `stripe` (1.0×), `self_reported` (0.55×)
2. RAG pipeline runs: LLM rubric scoring → pgvector evidence cross-reference → benchmark validation → blended confidence score
3. Bluff detection: 9 signal types, max −30% penalty
4. `score_evidence` verified proof boosts applied per dimension
5. Percentile computed via Postgres RPC
6. `qscore_history` row inserted with full audit trail
7. Fire-and-forget: signal_strength, integrity_index, momentum, behavioural score, **IQ Score**

**Step 3 — Working with agents (incremental improvement)**
The founder uses an AI agent (Patel, Felix, Harper, etc.) and generates an artifact:
1. LLM generates the artifact (2-pass: context extraction → generation)
2. Artifact saved to `agent_artifacts`
3. Embeddings computed fire-and-forget → stored in `artifact_embeddings` (pgvector)
4. **LLM quality evaluation**: completeness + specificity + actionability → `full / partial / minimal`
5. `applyAgentScoreSignal()` runs:
   - Idempotency check (one boost per artifact type per user, ever)
   - Fetches sector weights from DB
   - Applies `adjustedPoints = round(basePoints × qualityMultiplier)`
   - Recalculates overall with correct sector weights
   - Inserts new `qscore_history` row with `data_source = 'agent_completion'`
6. `score_evidence` auto-created (`status = 'verified'`, type = `agent_artifact`)

**Step 4 — Investor views the score**
1. `/api/qscore/latest` (or the investor deal-flow/startup API) computes decay on read
2. Decay factor applied: 0–89 days = no decay, 90+ days = gradually reduced to 80% at 1 year
3. Investor sees: effective score, freshness badge, IQ Score (data confidence), momentum badge
4. If the founder scores well but data is 8 months old → amber freshness badge + reduced score

**Step 5 — Score recovery**
The founder can restore their full score by:
- Retaking the full assessment (30-day cooldown per profile builder; full assessment has no cooldown)
- Connecting Stripe (upgrades financial field source from `self_reported` to `stripe` → higher confidence → higher score on next calculation)
- Attaching verified proof via score_evidence (now actually applied to scoring)
- Generating more agent artifacts (incremental dimension boosts, idempotent, quality-gated)

---

## 3. What Is Actually Working Right Now

### ✅ Fully working

- **6-dimension weighted scoring** — market, product, GTM, financial, team, traction. Weights loaded from DB per sector, fallback to TypeScript constants.
- **DB-driven thresholds** — `qscore_thresholds` table, 1h cache. Tier breakpoints per metric (TAM, MRR, CAC, etc.) are configurable without code deploy.
- **RAG Layer 1 — Rubric Scorer** — LLM scores 8 free-text fields (problemStory, customerQuote, icpDescription, etc.) on a 0–100 scale. Blended with heuristic baseline at `ragConfidence` weight.
- **RAG Layer 2 — Evidence Cross-Reference** — `context-assembler.ts` queries `artifact_embeddings` via `match_artifact_embeddings` Postgres RPC (pgvector cosine similarity). Corroborations boost dimension scores; conflicts add to bluff signals.
- **RAG Layer 3 — Benchmark Validation** — `benchmark-retriever.ts` has 48 authoritative rows (8 sectors × 6 metrics) from OpenView, Bessemer, NFX, a16z, CB Insights. Classifies founder claims as realistic/optimistic/unrealistic. Injected into LLM scoring prompt.
- **Bluff detection** — 9 signal types. Max −30% penalty. Reduces scores for fabricated/inflated inputs.
- **score_evidence boosts** — verified proof now applied during scoring.
- **30-day cooldown** — profile builder rate-limited.
- **Temporal decay** — computed on read across all API endpoints.
- **IQ Score** — async calculator fires after every full assessment. 25 indicators, threshold-based. API route available.
- **GTM Diagnostics (D1/D2/D3)** — 15 indicators across ICP Clarity, Customer Insight, Channel Focus. Runs on every full assessment. Stored in `qscore_history.gtm_diagnostics`. Surfaced on Improve page.
- **Momentum score** — 30-day delta vs cohort. Tracked in `founder_profiles.momentum_score`. Shown to investors.
- **Behavioural scoring** — `behaviouralScore` column updated after every assessment. Tracks iteration speed, ICP refinement, contradiction engagement.
- **Cohort percentile** — Postgres RPC `compute_qscore_percentile`, O(log n).
- **Signal strength + integrity index** — computed from data source mix and bluff detection signals. Controls `visibility_gated`.

---

## 4. What Was Fixed (Session 2 — 2026-03-25)

All P1–P7 items from the previous session are now complete.

| # | Status | What changed |
|---|--------|-------------|
| **P1** | ✅ Done | Layer 2 RAG no longer needs `OPENAI_API_KEY`. Replaced pgvector cosine similarity with a single OpenRouter LLM call (`matchClaimsAgainstArtifacts` in `llm-semantic-matcher.ts`). Fetches last 6 agent artifacts, flattens to text snippets, asks LLM to identify corroborations/conflicts. `embedding-pipeline.ts` skips silently when `OPENAI_API_KEY` absent. |
| **P2** | ✅ Done | Created `qscore_knowledge_chunks` Supabase table (migration `20260326000002`). 51 chunks seeded: all 31 existing TypeScript rows + 20 new VC-grade additions (YC criteria, Sequoia Why Now, Bessemer efficiency score, a16z network effects, First Round founder-market fit, India benchmarks from Blume/PeakXV, PMF test, pricing signals, cross-artifact consistency rubric). `retrieval.ts` now loads DB chunks via `loadKnowledgeBase(supabase)` with 1h cache + TypeScript fallback. Called from `calculate/route.ts` and `actions/route.ts`. |
| **P3** | ✅ Done | Profile builder initial questions for sections 3 and 4 now explicitly request numeric IQ indicator fields (`replicationCostUsd`, `replicationTimeMonths`, `domainYears`, `priorExits`, `teamCohesionMonths`). Follow-up prompt updated with HIGH-PRIORITY field list that directs follow-up questions to gather these numbers first when still null. |
| **P4** | ✅ Done | `STAGE_BENCHMARK_REGISTRY` added to `benchmark-data.ts` with per-stage rows for saas_b2b and saas_b2c (pre-seed/seed/series-a × 6 metrics). `retrieveBenchmarks()` now accepts optional `stage` param — tries stage-specific first, falls back to `all`, then to flat registry. `buildBenchmarkContext()` also accepts stage. |
| **P5** | ✅ Done | `consistency-checker.ts` created. After each artifact is generated, compares MRR/ARR/burn/runway/customers between the artifact content and the latest `assessment_data`. Deviations >3× write a `consistency_flag` entry to `score_evidence` with `points_awarded = -N`. Wired fire-and-forget into `generate/route.ts` after `applyAgentScoreSignal`. |
| **P6** | ✅ Done | `scoreRange` (±N integer) now returned from `/api/qscore/latest`. Formula: `max(2, round(10 × (1 - ragConfidence) × dataPenalty))` where `dataPenalty = 0.7` if Stripe-verified, `1.0` otherwise. Shown as `72 ±5` in the portfolio Q-Score ring and investor startup deep-dive sidebar. |
| **P7** | ✅ Done | Migration `20260326000003_sector_weights_spec_alignment.sql` updates `qscore_dimension_weights`: saas_b2b GTM 0.17→0.25, market 0.20→0.18, team 0.15→0.12; biotech/deeptech product+team raised, GTM lowered. |

---

## 5. What Still Needs Work (Remaining Gaps)

### 🟡 One remaining known gap — Admin UI for knowledge base
New VC content can now be added to `qscore_knowledge_chunks` via SQL (no deploy needed). There is no `/admin/knowledge` UI yet — to add chunks you run a SQL INSERT. This is fine for internal use but would be better with a simple admin CRUD page.

### 🟢 Backfill for existing artifacts (optional)
Existing `agent_artifacts` are not yet embedded (Layer 2 RAG works via LLM matching now, not embeddings, so this is no longer needed). The `artifact_embeddings` table still exists and is used if `OPENAI_API_KEY` is ever added — at that point a backfill script would improve Layer 2 quality.

---

## 6. Priority Order for Next Sprint (Updated)

```
ALL P1–P7 COMPLETE. Remaining stretch goals:

NICE TO HAVE:
  1. Admin UI at /admin/knowledge for adding/editing knowledge chunks via browser
  2. Surface consistency flags on investor deep-dive page (yellow warning badge)
  3. IQ Calibration questionnaire — 10-question post-assessment form to boost IQ coverage
  4. Stage-aware benchmarks for remaining 6 sectors (marketplace, fintech, etc.) —
     currently only saas_b2b and saas_b2c have per-stage rows
```

---

## 7. Architecture Diagram (Updated)
  3. Add missing IQ indicator fields to profile builder UI (domainYears, hasPatent, etc.)
  4. Stage-aware benchmark rows in the benchmark registry

NICE TO HAVE (polish + honesty):
  5. Cross-artifact consistency check (MRR in form vs MRR in Felix artifact)
  6. Score confidence interval ±X shown on investor pages
  7. Update sector weights in DB to match spec
```

---

## 6. Architecture Diagram — Q-Score Data Flow

```
INPUTS
  Founder profile builder form
  Full assessment answers
  Agent artifact content
  Stripe connection
  score_evidence (verified proof)
          │
          ▼
CALCULATE PIPELINE  (/api/qscore/calculate)
  1. Load DB thresholds + sector weights (1h cache)
  2. Build dataSourceMap  →  stripe / self_reported
  3. RAG Layer 1          →  LLM rubric scoring (8 text fields)
     RAG Layer 2          →  pgvector evidence cross-reference  ← needs OPENAI_API_KEY
     RAG Layer 3          →  benchmark validation (48 rows, in-memory)
  4. Dimension calculators × 6 (DB thresholds with TypeScript fallback)
  5. Bluff detection  →  max −30% penalty
  6. score_evidence boosts  →  verified proof adds points per dimension
  7. Weighted overall = Σ(dim_score × sector_weight)
  8. Percentile RPC
  9. INSERT qscore_history
  10. Fire-and-forget:
        signal_strength, integrity_index, visibility_gating
        metric snapshot  →  cohort scoring
        momentum update  →  30-day delta
        behavioural score
        IQ Score  →  25 indicators, threshold-based
          │
          ▼
READ PIPELINE  (/api/qscore/latest)
  Fetch latest qscore_history row
  Apply temporal decay (read-time, not stored)
  Return: overall (effective), rawOverall, decayApplied, daysSince,
          breakdown, ragMetadata, percentile, grade
          │
          ▼
CONSUMER SURFACES
  Founder dashboard  →  ring + decay notice + confidence chip
  Founder portfolio  →  ring + confidence + decay
  Investor deal flow →  effective score + freshness badge + momentum
  Investor deep-dive →  effective score + age + IQ Score card
  Improve Q-Score    →  GTM diagnostics D1/D2/D3 + challenges
```

---

## 7. The Single Biggest Lever

**Set `OPENAI_API_KEY` and generate 5 artifacts.**

That's it. Here's why:

1. Artifacts get embedded into `artifact_embeddings` (pgvector)
2. On the next Q-Score calculation, Layer 2 RAG finds these embeddings
3. The assessment claims are cross-referenced against the artifact content
4. If the GTM Playbook says "target VP Sales at B2B SaaS companies" and the assessment ICP says "enterprise CIOs" — that's a conflict → bluff signal → integrity flag
5. If the financial_summary and the assessment both cite $50K MRR → corroboration → score confidence goes up
6. `ragConfidence` increases, which means the rubric scores get blended at higher weight
7. The IQ Score indicator count goes up (artifact content fills in field estimates)
8. The investor sees "High confidence" chip on the portfolio instead of "Low confidence"

The whole system is designed to reward founders who build real things with real agents and use real data. The more a founder actually uses Edge Alpha, the more signal the score captures — and the more credible it is to a VC.
