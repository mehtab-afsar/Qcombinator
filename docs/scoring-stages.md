# Q-Score: How It's Defined, Calculated & Used

> Last updated: 2026-03-23

---

## 1. What Is the Q-Score?

The **Q-Score** (0–100) is Edge Alpha's primary measure of **founder + startup quality**. It answers one question: *How investment-ready is this company right now?*

It is NOT a vanity metric. It is designed to be:
- **Hard to game** — bluff detection flags AI-generated or inflated inputs
- **Sector-relative** — weights shift per industry (SaaS, Fintech, Biotech, etc.)
- **Multi-signal** — combines self-reported data, agent artifacts, RAG evaluation, and behavioural patterns
- **Temporal** — each recalculation generates a new row; history is preserved with a linked chain

---

## 2. The Six Dimensions

The Q-Score is built from **six dimensions**, each scored 0–100 before being collapsed to an overall weighted score.

| Dimension | What It Measures |
|-----------|-----------------|
| **Market** | TAM/SAM/SOM clarity, market timing, defensibility |
| **Product** | Stage, differentiation, IP, technical depth |
| **GTM** | ICP specificity, channel strategy, pipeline, outreach |
| **Financial** | MRR, burn, runway, LTV/CAC, unit economics |
| **Team** | Co-founder mix, hires, domain experience |
| **Traction** | Revenue, customers, growth rate, pilot quality |

---

## 3. Sector-Specific Weights

A Fintech startup's **Financial** dimension matters more than a Biotech's. Weights are applied per sector so the final score reflects what investors actually care about:

| Sector | Market | Product | GTM | Financial | Team | Traction |
|--------|--------|---------|-----|-----------|------|----------|
| SaaS B2B | 0.15 | 0.20 | 0.25 | 0.15 | 0.10 | 0.15 |
| SaaS B2C | 0.20 | 0.20 | 0.20 | 0.10 | 0.10 | 0.20 |
| Marketplace | 0.15 | 0.15 | 0.20 | 0.15 | 0.10 | 0.25 |
| Biotech/DeepTech | 0.15 | 0.30 | 0.10 | 0.10 | 0.20 | 0.15 |
| Consumer | 0.20 | 0.20 | 0.15 | 0.10 | 0.10 | 0.25 |
| Fintech | 0.15 | 0.20 | 0.20 | 0.20 | 0.15 | 0.10 |
| Hardware | 0.15 | 0.25 | 0.15 | 0.15 | 0.15 | 0.15 |
| E-commerce | 0.15 | 0.15 | 0.20 | 0.20 | 0.05 | 0.25 |

The formula is:

```
overallScore = Σ (dimensionScore[d] × weight[sector][d])
```

---

## 4. The Calculation Pipeline

When a founder submits an assessment (`POST /api/qscore/calculate`), the pipeline runs in sequence:

### Step 1 — Load Configuration
- Fetch `qscore_thresholds` from DB (1-hour LRU cache) — defines metric tier breakpoints per dimension
- Fetch `qscore_dimension_weights` — sector overrides if set in DB (else fall back to `sector-weights.ts` hardcoded values)
- Load founder profile: sector, stage, linked Stripe/Hunter API data

### Step 2 — Build Assessment Data
- Map form inputs + agent artifacts into `AssessmentData` struct
- Tag each financial field with its **data source**: `stripe_live` → `founder_claimed` → `ai_estimated` (provenance hierarchy)
- Sources influence confidence scoring downstream in IQ

### Step 3 — RAG Semantic Evaluation
- Embed the assessment text
- Query the knowledge library vector store for relevant playbooks / benchmarks
- LLM evaluates each dimension against retrieved context
- Returns raw dimension scores (0–100) + reasoning per dimension

### Step 4 — Bluff Detection
Runs 9 independent signal checks across the assessment:

| Signal | What It Catches |
|--------|----------------|
| `round_numbers` | Revenue/ARR always ending in 000 with no variation |
| `impossible_ratios` | LTV/CAC > 50 without verification, 500%+ MoM growth |
| `ai_phrases` | Boilerplate language ("leveraging AI to disrupt", "paradigm shift") |
| `specificity` | Generic ICP descriptions with no named customers |
| `inconsistent_financials` | MRR × 12 ≠ stated ARR, CAC < $1 |
| `conversation_mismatch` | Agent conversation claims diverge from form inputs |
| `high_growth_no_customers` | 50%+ MoM with 0 customers |
| `revenue_pipeline_mismatch` | $500K pipeline but $0 MRR |
| `paid_claimed_no_stripe` | Claims paid revenue but no Stripe key connected |

**Penalty applied:**
```
high severity  → -10% of raw score
medium severity → -3%
low severity   → -1%
Total cap: -30% maximum across all signals
```

### Step 5 — Score + Persist
- Apply sector weights → `overallScore`
- Compute `cohort_scores` (percentile rank per dimension vs peers in same sector, only active when ≥ 100 founders in cohort)
- Run `runGTMDiagnostics` → `gtm_diagnostics` (D1/D2/D3, see §8)
- Insert new row into `qscore_history`:
  ```
  overall_score, market_score, product_score, gtm_score,
  financial_score, team_score, traction_score,
  assessment_data, cohort_scores, gtm_diagnostics,
  previous_score_id  ← links to prior row (chain)
  ```

### Step 6 — Fire-and-Forget (async, non-blocking)
These run after the API responds to the founder:

| Task | What It Does |
|------|-------------|
| **Metric Snapshot** | Saves MRR, ARR, customers, runway, LTV/CAC to `metric_snapshots` for trend charts. Retries once (1s delay) on failure. |
| **IQ Scoring** | Triggers full 25-indicator IQ calculation. Retries once (2s delay, `skipTavily=true`) on failure. |
| **Momentum** | Updates `founder_profiles.momentum_score` (see §7). |
| **Behavioural Scoring** | Updates behavioural signals (see §6). |

---

## 5. Score Persistence & History Chain

Every Q-Score calculation creates a **new row** in `qscore_history`. Rows are linked via `previous_score_id`:

```
qscore_history row 1 (initial)
    ↓  previous_score_id
qscore_history row 2 (after agent artifact)
    ↓  previous_score_id
qscore_history row 3 (after resubmit with Stripe connected)
```

This means:
- Full score trajectory is always preserved
- Dashboard can show a chart of score over time
- Momentum is computed as a delta between rows

**Score sources tracked:**
- `data_source: 'assessment'` — direct submission
- `data_source: 'agent_signal'` — boost from completing an agent artifact
- `source_artifact_type` — which artifact triggered the boost

---

## 6. Behavioural Scoring (Non-Gameable Signals)

Behavioural scoring adds a **non-gameable overlay** on top of the self-reported score. It reads patterns from `agent_conversations` and `agent_messages`.

Three components, weighted composite:

### Iteration Speed (40%)
- Measures median days between agent sessions and between assessment retakes
- < 7 days = 100 points → > 90 days = 10 points
- Rewards founders who keep their strategy tight and iterate fast

### ICP Refinement (35%)
- Tracks ICP documents across multiple Patel conversations
- Checks if each version improves on: job title specificity, company size ranges, trigger events, explicit exclusions, named customer examples
- Rewards founders who sharpen their targeting over time

### Contradiction Engagement (25%)
- When Atlas identifies a competitor the founder hadn't listed, does the founder follow up?
- Measures reply rate after competitive discoveries
- Rewards intellectual honesty over confirmation bias

```
behaviouralScore = 0.40 × iterationSpeed
                 + 0.35 × icpRefinement
                 + 0.25 × contradictionEngagement
```

---

## 7. Momentum

**Momentum** measures how fast a founder is improving relative to their cohort. Range: -100 to +100.

**How it's calculated:**

1. Fetch last two `qscore_history` rows within the past 30 days
2. `rawDelta = currentScore - previousScore`
3. Compare delta against the cohort distribution for the same sector/stage
4. Normalise to -100 → +100 (cohort percentile of delta)
5. Save to `founder_profiles.momentum_score`

**If only one score exists** → `momentum_score = 0` (not null)

**Labels for display:**

| Score | Label | Color |
|-------|-------|-------|
| > 15 | 🔥 Hot | red |
| 5–15 | ↑ Rising | green |
| -5–5 | → Steady | gray |
| -15 to -5 | ↓ Slowing | amber |
| < -15 | ↓↓ Falling | red |

Investors see momentum when viewing a startup's deep-dive — it signals urgency and founder quality independent of the score itself.

---

## 8. GTM Diagnostics (D1/D2/D3)

Runs inside every Q-Score calculation. Produces three sub-scores that are persisted in `qscore_history.gtm_diagnostics` and surface on the **Improve Q-Score** page when `goToMarket < 70`.

### D1 — ICP Clarity
5 indicators scored 0–4 each:
- Persona specificity (job title, company size, geography present?)
- Validation signals (named customers, interview count)
- Commercial alignment (pain → willingness to pay link)
- Iteration evidence (ICP has been refined over multiple versions)
- Team alignment (founding team agrees on ICP)

### D2 — Customer Insight
5 indicators:
- Problem insight depth (symptoms vs root causes articulated?)
- Customer context (workflow, stack, org structure understood?)
- Validation depth (qualitative interviews + quantitative survey?)
- Buying insight (budget holder, procurement process known?)
- Value proof (specific outcomes promised vs delivered?)

### D3 — Channel Focus
5 indicators:
- Channel clarity (primary channel named and justified?)
- ICP-channel fit (channel actually reaches the stated ICP?)
- Discipline (< 2 active channels at seed stage?)
- Execution consistency (evidence of regular channel activity?)
- Learning loop (A/B tests, conversion tracking in place?)

**Score < 60 on any D** → tagged with `routed_to: 'patel'` and shown as a "Fix with Patel →" CTA on the Improve Q-Score page.

---

## 9. Agent Artifact Boosts

Completing agent deliverables gives a **one-time boost** per artifact type — idempotent (won't double-count). Each boost targets the most relevant dimension:

| Artifact | Dimension | Max Boost |
|----------|-----------|-----------|
| ICP Document | GTM | +5 pts |
| Outreach Sequence | GTM | +3 pts |
| Battle Card | GTM / Market | +4 pts |
| GTM Playbook | GTM | +6 pts |
| Sales Script | Traction | +4 pts |
| Brand Messaging | Product | +3 pts |
| Financial Summary | Financial | +6 pts |
| Legal Checklist | Team | +3 pts |
| Hiring Plan | Team | +5 pts |
| PMF Survey | Traction | +5 pts |
| Competitive Matrix | Market | +5 pts |
| Strategic Plan | Market | +4 pts |

**Quality multiplier** is applied before the boost:
- Full artifact (high quality score) → 1.0×
- Partial → 0.6×
- Minimal → 0.3×

A new `qscore_history` row is written for each boost, linked to the prior row via `previous_score_id`.

---

## 10. Threshold Configuration

Dimension metrics are evaluated against **tiers** fetched from `qscore_thresholds` in the DB (1h cache). This allows adjusting scoring without a code deploy.

Each threshold row defines: `dimension`, `metric`, `tier` (1–5), `min_value`, `max_value`, `score_value`.

Example for `financial.mrr`:
```
tier 1: $0–$999     → 10 pts
tier 2: $1K–$9.9K   → 35 pts
tier 3: $10K–$49.9K → 60 pts
tier 4: $50K–$199K  → 80 pts
tier 5: $200K+      → 100 pts
```

Sector-specific weight overrides can also be set in `qscore_dimension_weights` and will take precedence over the hardcoded sector table.

---

## 11. IQ Score (Investment Readiness) — Companion System

The **IQ Score** (0–100) is a separate but complementary signal fired async after every Q-Score calculation. It answers: *Would an investor trust the data behind this score?*

### 25 Indicators across 5 Parameters

| Parameter | Weight (SaaS B2B default) | Example Indicators |
|-----------|--------------------------|-------------------|
| Market Opportunity | 0.25 | TAM validation, defensibility, timing |
| Business Model | 0.20 | Revenue model clarity, pricing consistency |
| Traction & Validation | 0.25 | Customer count, NPS, pilot quality |
| Team & Execution | 0.15 | Technical depth, founder-market fit |
| Financial Health | 0.15 | Runway, burn multiple, LTV/CAC |

### Scoring Path Per Indicator
Each indicator is scored via one of two paths:
- **Threshold-based**: numeric value checked against DB tiers → direct score
- **AI-reconciled**: LLM evaluates qualitative inputs, optionally enriched with Tavily web research for market sizing / competitive data

### Cross-Validation (12 Rules)
After individual scoring, 12 logical consistency checks run and flag contradictions:

| Rule | Catches |
|------|---------|
| `IP_DEVTIME_MISMATCH` | 5+ patents with < 1 year dev time |
| `LTV_CAC_CONCENTRATION` | LTV/CAC > 10 with > 80% revenue concentration |
| `HIGH_GROWTH_NO_CUSTOMERS` | > 50% MoM with < 5 customers |
| `LEVERAGE_PRE_REVENUE` | Debt > $100K with $0 revenue |
| `REVENUE_QUALITY_ZERO_ARR` | MRR > 0 but ARR = 0 |
| `STRONG_IP_NO_TECHNICAL_TEAM` | IP claims with 0 technical hires |
| … + 6 more | Sector-specific claims validation |

Flags don't reduce the score directly — they reduce **confidence**, which then penalises the final IQ score.

### Bluff Signal Propagation
Bluff signals detected during Q-Score are passed into IQ scoring. High-severity bluff flags mark `self_reported` and `ai_reconciled_estimated` indicators with lower confidence, reducing the IQ score for those parameters.

### Async Race Protection
If the IQ score is requested before the async calculation completes, `GET /api/iq/latest` returns:
```json
{ "iqScore": null, "calculating": true }
```
The dashboard shows a spinner instead of a blank. Once the IQ calculation resolves, the full score is available.

---

## 12. Cohort Scoring (Percentile)

When the platform has **≥ 100 founders** in a given sector, cohort scoring activates.

Instead of absolute dimension scores, each dimension gets a **percentile rank** against same-sector peers. This is stored in `qscore_history.cohort_scores`:

```json
{
  "market": { "percentile": 72, "cohortSize": 143 },
  "gtm":    { "percentile": 58, "cohortSize": 143 },
  ...
}
```

Percentile is computed via a Postgres function (`compute_qscore_percentile`) using a `DISTINCT ON` window — single round-trip, no full-table scan in JS.

Below 100 founders → `cohort_scores: null`, absolute scores used instead.

---

## 13. "What Gets Me to 80?" — Action Generation

`GET /api/qscore/actions` returns 5 personalized action cards generated by Claude (via OpenRouter). Each action:

```json
{
  "title": "Build an ICP with named accounts",
  "description": "Your GTM score is 42. Define 5 named target accounts...",
  "dimension": "goToMarket",
  "impact": "high",
  "agentId": "patel",
  "timeframe": "1 week",
  "starterPrompt": "Help me build an ICP targeting mid-market HR teams..."
}
```

Generated actions are cached in `qscore_history.ai_actions`. A `POST` to the route clears cache and regenerates.

Actions are informed by RAG context: relevant playbooks and benchmarks are retrieved from the knowledge library and injected into the prompt before generation.

---

## 14. Data Flow Summary

```
Founder submits assessment
        │
        ▼
POST /api/qscore/calculate
        │
        ├── Load thresholds + weights (DB / cache)
        ├── Build AssessmentData (form + artifacts)
        ├── RAG evaluation (LLM × 6 dimensions)
        ├── Bluff detection (9 signals → penalty)
        ├── Apply sector weights → overallScore
        ├── Compute cohort percentiles (if ≥ 100 peers)
        ├── Run GTM diagnostics (D1 / D2 / D3)
        ├── INSERT qscore_history row
        │       (linked via previous_score_id)
        │
        ├── [async] Metric snapshot (1-retry)
        ├── [async] IQ scoring 25 indicators (1-retry)
        ├── [async] Momentum delta vs cohort
        └── [async] Behavioural signal update
                (iteration speed, ICP refinement,
                 contradiction engagement)

Agent artifact completed
        │
        ▼
applyAgentScoreSignal()
        │
        ├── Check idempotency (already boosted?)
        ├── Apply quality-adjusted dimension boost
        ├── Recalculate weighted overall score
        └── INSERT new qscore_history row (chain)
```

---

## 15. Where Scores Surface in the UI

| Page | What's Shown |
|------|-------------|
| **Dashboard** | Overall score, trajectory chart, 3 weakest dimension cards, momentum badge, live metrics strip |
| **Improve Q-Score** | Full dimension breakdown, GTM D1/D2/D3 cards, score simulator, unlock challenges (12 artifact challenges), evidence attachment |
| **Portfolio** | Q-Score ring with dimension spokes, verified proof section |
| **Investor Deal Flow** | Q-Score badge per startup, momentum (hot/trending/steady) |
| **Investor Startup Deep-Dive** | Full breakdown, AI analysis derived from scores, financial artifact data |
| **Agent Pages** | Score boost toast (4s) after artifact generated, challenge banner when entered via `?challenge=<dimension>` |
| **Workspace** | Score shown per artifact alongside version history |
