# Q-Score & Profile Builder — Technical Deep Dive

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Profile Builder — How It Works](#profile-builder)
3. [Where Questions Come From](#where-questions-come-from)
4. [Data Extraction Pipeline](#data-extraction-pipeline)
5. [How Scoring Works](#how-scoring-works)
6. [The 6 Parameters & 30 Indicators](#the-6-parameters--30-indicators)
7. [Sector & Stage Adaptive Weights](#sector--stage-adaptive-weights)
8. [Final Score Calculation](#final-score-calculation)
9. [Key Safeguards](#key-safeguards)
10. [Data Flow — Complete Chain](#data-flow--complete-chain)
11. [Database Tables](#database-tables)
12. [What's Left — Task List](#whats-left--task-list)

---

## Architecture Overview

```
Founder Answers (chat) ──→ LLM Extraction ──→ Section Data (DB)
         ↑                                            │
Document Upload ─────────────────────────────────────┘
                                                      │
                                             Submit Route (orchestrator)
                                                      │
                                        ┌─────────────┼─────────────┐
                                        │             │             │
                                  IQ Calculator  AI Reconcile  Benchmarking
                                        │
                               30 Indicator Scores (0–5 each)
                                        │
                              Final IQ = Σ / 150 × 100
```

**Key files:**
| File | Role |
|---|---|
| `lib/profile-builder/question-engine.ts` | Questions, completion %, required fields |
| `lib/profile-builder/smart-questions.ts` | Post-upload gap questions |
| `lib/profile-builder/extraction-prompts.ts` | LLM system prompts (one per section) |
| `app/api/profile-builder/extract/route.ts` | Per-answer LLM extraction |
| `app/api/profile-builder/upload/route.ts` | Document parsing + bulk extraction |
| `app/api/profile-builder/submit/route.ts` | Submission orchestrator |
| `features/qscore/calculators/iq-score-calculator.ts` | Core IQ formula |
| `features/qscore/calculators/parameters/p1–p6` | Per-parameter scoring |
| `features/qscore/utils/sector-weights.ts` | Sector weight definitions |

---

## Profile Builder

The Profile Builder is a 5-section conversational assessment. Each section has:
- An **opening question** (stage + industry adaptive)
- A **follow-up loop** that keeps asking until the section is 70%+ complete
- An optional **document upload** that pre-fills fields from PDFs, decks, financials

### The 5 Sections

| # | Name | Feeds Into | Key Fields |
|---|---|---|---|
| 1 | Market Validation | P1 Market Readiness | customer count, pilots, LOIs, MRR, retention |
| 2 | Market & Competition | P2 Market Potential | TAM, urgency, value pool, competitors |
| 3 | IP & Technology | P3 IP/Defensibility | patents, build complexity, replication cost |
| 4 | Team & Founder | P4 Founder/Team | domain years, prior exits, team coverage |
| 5 | Financials & Impact | P5 Structural Impact + P6 Financials | MRR, burn, runway, gross margin |

### Two Entry Paths
1. **Full flow** (no doc): Pitch → Sections 1–5 with full chat
2. **Fast flow** (doc uploaded): Upload → Extract Results → Smart Q&A (7 gap questions max)

---

## Where Questions Come From

### 1. Initial Questions (`question-engine.ts`)
`getInitialQuestion(section, founderProfile)` returns a different question based on **stage** and **industry**.

```
Section 1:
  pre-product → "Have you had conversations with potential customers..."
  growing     → "Walk me through your sales motion — how many paying customers..."

Section 3:
  healthtech  → "Have you filed or applied for any patents, FDA clearances, or CE marks..."
  deeptech    → "What's the core technical breakthrough? Have you filed patents?..."
  default     → "What's technically hard about what you've built..."
```

### 2. Follow-up Questions (LLM-generated)
After each answer, `FOLLOW_UP_PROMPT` is sent to the LLM with:
- The founder's stage, industry, revenue status
- The full conversation so far (to avoid repeating)
- Already-extracted fields
- Missing required fields

The LLM returns one sentence, or `"SECTION_COMPLETE"` if all required fields are filled.

**Anti-repetition rules baked into the prompt:**
- If founder mentioned a topic (even roughly), never ask again
- `replicationCostUsd` + `replicationTimeMonths` = ONE question, not two
- Never rephrase something already asked
- Max one sentence, no framework jargon

### 3. Smart Questions (post-upload)
After PDF upload, `generateSmartQuestions(extractedBySections, stage)` creates up to 7 targeted questions for the gaps — fields the LLM couldn't find in the document. Each question includes a `contextHint` showing what was already found (e.g., "We found 3 paying customers — still need retention data").

### 4. Context-Aware Section Openers
When entering a section that already has data from a PDF, the opening message changes:
- Data found, gaps remain → "I extracted some info from your documents, but still need: [X, Y, Z]. Can you fill in the gaps?"
- Data found, no gaps → "I already have everything I need — feel free to add anything or move on."
- No data → Generic initial question

---

## Data Extraction Pipeline

### Per-Answer Extraction (`/api/profile-builder/extract`)
1. Founder types an answer in chat
2. The answer + conversation history is sent to Groq (`llama-3.3-70b-versatile`)
3. The LLM uses one of 5 `EXTRACTION_PROMPTS[1..5]` as the system prompt
4. Returns structured JSON with fields + per-field `confidence` scores (0–0.85)
5. New fields merged with existing (non-destructive — never overwrites higher-confidence values)
6. Completion % recalculated
7. If section ≥70% complete → follow-up returns `SECTION_COMPLETE`
8. Otherwise → LLM generates one more targeted question

### Document Upload Extraction (`/api/profile-builder/upload`)
1. PDF/PPTX/XLSX parsed to text by `document-parser.ts`
2. All 5 extraction prompts run **in parallel** via `Promise.allSettled`
3. Each prompt includes a `startup_document: true/false` gate — if the LLM flags the doc as irrelevant (novel, article, etc.), that section's results are discarded
4. Results deep-merged across all 5 prompts
5. Per-section completion scores calculated using `confidenceMap` (fields with confidence < 0.45 don't count)
6. Results upserted to `profile_builder_data` per section
7. Uploaded file + fields count stored in `uploaded_documents` column (survives refresh)

### Confidence Scale
| Level | Value | Meaning |
|---|---|---|
| Specific company + signed doc | 0.85 | High — verified |
| Named company, no doc | 0.65 | Good |
| Vague / implied | 0.45 | Minimum threshold |
| None / absent | 0.00 | Not counted |

**Fields with confidence < 0.45 are excluded from section completion scoring.** This prevents a novel from triggering high scores.

---

## How Scoring Works

### Step 1 — Section Completion
Each section tracks `completionScore` (0–100%).  
Required fields vary by stage:

```
Section 1 (Market):
  Always:    customerCommitment, hasPayingCustomers
  Revenue+:  salesCycleLength, hasRetention, largestContractUsd
  Growth:    p2.expansionPotential, p2.competitorDensityContext

Section 2 (Market Potential):
  Always:    p2.tamDescription, p2.marketUrgency, p2.valuePool
  Growth:    p2.expansionPotential, p2.competitorDensityContext

Section 3 (IP):
  Always:    p3.hasPatent, p3.buildComplexity
  Growth:    p3.technicalDepth, p3.knowHowDensity, p3.replicationCostUsd

Section 4 (Team):
  Always:    p4.domainYears, p4.founderMarketFit
  Growth:    p4.priorExits, p4.teamCoverage, p4.teamCohesionMonths

Section 5 (Financials):
  Always:    financial.monthlyBurn, financial.runway
  Revenue+:  financial.mrr
  Growth:    p5.climateLeverage, p5.revenueImpactLink
```

A section is **complete** when ≥70% of its required fields are filled with confidence ≥0.45.

### Step 2 — Submission Gate
`/api/profile-builder/submit` requires:
- ≥3 of 5 sections at 70%+ completion
- 24-hour cooldown between submissions (rate limit)

### Step 3 — Assessment Data Merge
All 5 section objects are flattened into a single `AssessmentData` structure with every field the calculators need.

### Step 4 — IQ Score Calculation
Each of the 6 parameter calculators runs against `AssessmentData` and returns 5 indicator scores (0–5 each). See below for exact logic.

### Step 5 — Bluff Detection
If 2+ sections have `completion_score < 30`, the final score is blended down:
```
blendFactor = incompleteSections / 5   (0.0–1.0)
finalScore  = finalScore × (1 − blendFactor × 0.3) + 30 × blendFactor × 0.3
```
Protects against gaming with minimal data.

---

## The 6 Parameters & 30 Indicators

### P1 — Market Readiness (feeds from Section 1)

| Indicator | What it measures | Score brackets |
|---|---|---|
| **1.1 Early Signal** | Customer conversations + LOIs | 0 convos → 1.0 … 25+ or signed LOI → 5.0 |
| **1.2 Willingness to Pay** | MRR or payment signal | Verbal intent → 2.0 … $10K+ MRR → 5.0 |
| **1.3 Speed** | Sales cycle length | 3+ months → 1.5 … <1 week → 5.0 |
| **1.4 Durability** | Retention / NDR / D30 | NDR <90% → 1.5 … NDR ≥130% → 5.0 |
| **1.5 Scale** | Expansion plan to adjacent markets | No plan → 1.5 … Live in 3+ markets → 5.0 |

VC Alert triggered on growth-stage B2B if NDR not explicitly stated.

---

### P2 — Market Potential (feeds from Section 2)

| Indicator | What it measures | Key rule |
|---|---|---|
| **2.1 Market Size** | TAM quality + bottom-up reasoning | Top-down only (analyst report, no bottom-up) → capped at 3.0. TAM > 100× implied from (customers × LTV) → also capped at 3.0 |
| **2.2 Market Urgency** | "Why now" catalyst | Specific trigger + time reference (last 2–3 years) → 5.0 |
| **2.3 Value Pool** | $ customers currently waste | $ + waste framing + detail → 5.0 |
| **2.4 Expansion Potential** | Adjacent markets + phased plan | Phased plan + detail → 5.0 |
| **2.5 Competitive Space** | Competitor density + positioning | 1–3 named competitors + clear positioning → 5.0; 10+ competitors → 1.5 |

---

### P3 — IP / Defensibility (feeds from Section 3)

| Indicator | What it measures | Score brackets |
|---|---|---|
| **3.1 IP Protection** | Patents, filings, trade secrets | None → 1.5 … Patent with filing number → 5.0 |
| **3.2 Technical Depth** | ML, proprietary algorithms, complexity | Inferred from keywords + text length |
| **3.3 Know-How Density** | Proprietary data, certifications, partnerships | Accumulated specialist knowledge |
| **3.4 Build Complexity** | Months for competitor to replicate | <1 month → 1.0 … 12+ months → 5.0 |
| **3.5 Replication Barrier** | Network effects, data moats, switching cost | Parsed from `replicationCostUsd` + `replicationTimeMonths` |

---

### P4 — Founder / Team (feeds from Section 4)

| Indicator | What it measures | Score brackets |
|---|---|---|
| **4.1 Domain Depth** | Years of relevant experience | 0–1 yr → 1.0 … 10+ yrs → 5.0 |
| **4.2 Founder-Market Fit** | Insider / operator / academic fit | INSIDER_FIT pattern matching + narrative length |
| **4.3 Founder Experience** | Prior exits, built & scaled companies | First-time → 2.0 … 2+ exits → 5.0 |
| **4.4 Leadership Coverage** | Functions: tech/sales/product/finance/ops | Counted from `teamCoverage` array |
| **4.5 Team Cohesion** | How long team worked together | <3 months → 1.0 … 18+ months → 5.0 |

---

### P5 — Structural Impact (feeds from Section 5)

> **Commercial track startups: all 5 indicators return rawScore = 0 (fully excluded).**
> Only scored for impact-track startups (`is_impact_focused = true` in `founder_profiles`).

| Indicator | What it measures |
|---|---|
| **5.1 Climate Leverage** | Carbon reduction, emissions, sustainability |
| **5.2 Resource Efficiency** | Waste reduction, efficiency vs. baseline |
| **5.3 Development Relevance** | UN SDG alignment, health/education/poverty |
| **5.4 Business Model Alignment** | Revenue tied to impact (>75% core = 5.0) |
| **5.5 Strategic Relevance** | Viksit Bharat 2047 domain alignment |

---

### P6 — Financials (feeds from Section 5)

Exclusion rules by stage:
| Indicator | Pre-product | Revenue | Growth |
|---|---|---|---|
| 6.1 Revenue Scale | ❌ Excluded | ❌ if MRR < $1K | ✅ Scored |
| 6.2 Burn Efficiency | ❌ | ✅ if both MRR + burn known | ✅ |
| 6.3 Runway | ❌ | ✅ | ✅ |
| 6.4 Unit Economics | ❌ | ❌ if <10 customers | ✅ |
| 6.5 Gross Margin | ❌ | ❌ if no COGS data | ✅ |

**Excluded indicators contribute rawScore = 0 to the numerator.**

| Indicator | Brackets |
|---|---|
| **6.1 Revenue Scale** | ARR <$10K → 1.0 … ARR $10M+ → 5.0 (growth) |
| **6.2 Burn Efficiency** | Burn multiple >10× → 1.0 … ≤1× → 5.0 |
| **6.3 Runway** | <3 months → 1.0 … 24+ months → 5.0 |
| **6.4 Unit Economics** | LTV/CAC <1 → 1.0 … LTV/CAC 8×+ → 5.0 |
| **6.5 Gross Margin** | <0% → 1.0 … 85%+ → 5.0 |

---

## Sector & Stage Adaptive Weights

Weights are applied as a **multiplier layer** on top of base sector weights, then renormalized to sum = 1.0.

### Base Sector Weights  
`[P1, P2, P3, P4, P5, P6]`

| Sector | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|
| b2b_saas | 0.24 | 0.18 | 0.10 | 0.16 | 0.05 | **0.27** |
| biotech | 0.08 | 0.18 | **0.32** | 0.26 | 0.08 | 0.08 |
| marketplace | **0.28** | 0.24 | 0.08 | 0.16 | 0.06 | 0.18 |
| climate | 0.14 | 0.20 | 0.22 | 0.18 | **0.18** | 0.08 |
| ai_ml | 0.20 | 0.20 | 0.18 | **0.22** | 0.06 | 0.14 |
| fintech | 0.20 | 0.18 | 0.18 | 0.20 | 0.08 | 0.16 |
| consumer | **0.26** | 0.22 | 0.06 | 0.14 | 0.06 | **0.26** |
| hardware | 0.12 | 0.20 | **0.28** | 0.22 | 0.06 | 0.12 |
| default | 0.20 | 0.20 | 0.17 | 0.18 | 0.08 | 0.17 |

### Stage Multipliers (applied then renormalized)

| Stage | P1 | P2 | P3 | P4 | P5 | P6 |
|---|---|---|---|---|---|---|
| **early** | 0.70 | 1.05 | 1.20 | **1.30** | 1.00 | **0.60** |
| **mid** | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 |
| **growth** | **1.30** | 0.95 | 0.80 | 0.90 | 0.90 | **1.40** |

**Logic:** Early-stage investors care about team + IP (founders and defensibility matter when there's no revenue). Growth-stage investors care about traction + financials (prove you can scale).

### Example Calculation
Climate startup, early stage, base weights `[0.14, 0.20, 0.22, 0.18, 0.18, 0.08]`:
```
× stage multipliers: [0.70, 1.05, 1.20, 1.30, 1.00, 0.60]
= raw:    [0.098, 0.21, 0.264, 0.234, 0.18, 0.048]
sum:      1.034
÷ 1.034 → [0.095, 0.203, 0.255, 0.226, 0.174, 0.046]  (sums to 1.0)
```

---

## Final Score Calculation

```
Final IQ = Σ(all 30 rawScores) ÷ 150 × 100
```

**The denominator is always 150 (30 indicators × max 5 each).** Excluded indicators contribute 0 to the numerator — they are NOT removed from the denominator. This penalises early-stage startups with many excluded financial indicators.

```
Available IQ = Σ(active rawScores) ÷ (# active indicators × 5) × 100
```
Available IQ shows what the score could be if all currently-active indicators scored perfectly. It represents the ceiling given current data completeness.

### Grading
| Grade | Score range |
|---|---|
| A | 85 – 100 |
| B | 70 – 84 |
| C | 50 – 69 |
| D | 30 – 49 |
| F | 0 – 29 |

### Legacy Dimension Mapping (for backward compat)
These 0–100 values are derived from IQ parameter averages for pages that use the old dimension names:
```
market_score    = P1.averageScore × 20
product_score   = P3.averageScore × 20
gtm_score       = P2.averageScore × 20
financial_score = P6.averageScore × 20
team_score      = P4.averageScore × 20
traction_score  = P1.averageScore × 20
```

---

## Key Safeguards

| Safeguard | Where | What it does |
|---|---|---|
| **Confidence gate** | `getSectionCompletionPct` | Fields with confidence < 0.45 don't count toward section completion |
| **Startup document gate** | Each extraction prompt | LLM returns `{"startup_document": false}` for novels/articles; results discarded |
| **Bluff detection** | Submit route | 2+ sections < 30% complete → score blended down toward 30 baseline |
| **AI reconciliation** | Submit route (async) | AI checks for anomalies (inflated TAM, claimed NDR without evidence); sets VC alerts but does NOT override scores |
| **Consistency validation** | Submit route | Cross-indicator logic (e.g., NDR 110% contradicts 10% churn) — blocking errors reject submission |
| **Rate limiting** | Submit route | 24-hour cooldown between profile submissions |
| **Submission gate** | Submit route | Requires ≥3 of 5 sections at ≥70% completion |
| **TAM cross-check** | P2 calculator | If stated TAM > 100× implied (customers × LTV) → capped at 3.0 |
| **Top-down TAM cap** | P2 calculator | Analyst-report-only TAM (no bottom-up) → capped at 3.0 |

---

## Data Flow — Complete Chain

```
1. Founder enters section chat
   └→ getInitialQuestion(section, {stage, industry}) → displayed in chat UI

2. Founder types an answer
   └→ POST /api/profile-builder/extract
       ├→ EXTRACTION_PROMPTS[section] + answer → Groq LLM
       ├→ JSON parsed: fields + confidence map
       ├→ mergeDeep(existing, new) → merged extracted fields
       ├→ getSectionCompletionPct(merged, section, stage, confidenceMap) → 0–100%
       ├→ getMissingFields → array of missing field paths
       └→ if incomplete: FOLLOW_UP_PROMPT → LLM → next question
          if complete: return "SECTION_COMPLETE"

3. (Optional) Founder uploads document
   └→ POST /api/profile-builder/upload
       ├→ parseDocument(buffer) → text
       ├→ Promise.allSettled([1,2,3,4,5].map → EXTRACTION_PROMPTS[n] + text → Groq)
       ├→ filter results where startup_document === false
       ├→ deep-merge all section results
       ├→ for each section: getSectionRelevantFields + getSectionCompletionPct(confidenceMap)
       ├→ upsert profile_builder_data per section (extracted_fields, completion_score, uploaded_documents)
       └→ return sectionSummaries[] with completionPct + missingLabels per section

4. Page receives sectionSummaries
   └→ setSections: apply completionScore + isComplete per section
      → sidebar progress bars update immediately

5. On entering a section with extracted data
   └→ useEffect detects extractedFields not empty
      → getMissingFields → build context-aware opening: "I extracted X, still need Y, Z"

6. Founder submits profile
   └→ POST /api/profile-builder/submit
       ├→ load all 5 sections from profile_builder_data
       ├→ check 3+ sections ≥70% complete
       ├→ mergeToAssessmentData(sections) → AssessmentData
       ├→ load founder_profiles: stage, industry, is_impact_focused
       ├→ normalizeSector(industry) → known sector key
       ├→ inferStage(stage) → 'early' | 'mid' | 'growth'
       ├→ load sector weights from DB (or SECTOR_WEIGHTS fallback)
       ├→ apply stage multipliers → renormalize weights
       ├→ enrichDataQuality(assessmentData) — metadata only, no score impact
       ├→ reconcileIndicators() → vcAlert strings (async, non-blocking)
       ├→ calculateIQScore(assessmentData, stage, track, weights)
       │   ├→ scoreP1 → 5 indicator rawScores (0–5)
       │   ├→ scoreP2 → 5 indicator rawScores
       │   ├→ scoreP3 → 5 indicator rawScores
       │   ├→ scoreP4 → 5 indicator rawScores
       │   ├→ scoreP5 → 5 rawScores (all 0 if commercial track)
       │   └→ scoreP6 → 5 rawScores (exclusions by stage)
       ├→ Σ(30 rawScores) / 150 × 100 = finalIQ
       ├→ bluff detection → blend down if 2+ sections < 30%
       ├→ validateConsistency → blocking errors or warnings
       ├→ getAllIndicatorPercentiles → rank vs. sector/stage cohort
       ├→ insert qscore_history row
       └→ return { score, grade, iqBreakdown, availableIQ, reconciliationFlags }
```

---

## Database Tables

| Table | Key columns | Purpose |
|---|---|---|
| `profile_builder_data` | user_id, section, extracted_fields JSONB, confidence_map, completion_score, uploaded_documents JSONB | Per-section draft storage, persists across refresh |
| `profile_builder_uploads` | user_id, section, filename, storage_path, extracted_text, parsed_data, confidence | Audit log of every uploaded file |
| `qscore_history` | user_id, overall_score, grade, iq_breakdown JSONB, assessment_data JSONB, score_version | Score history, used for trajectory charts |
| `founder_profiles` | user_id, stage, industry, is_impact_focused, company_name | Founder context used for adaptive weights |
| `score_evidence` | user_id, dimension, evidence_type, title, data_value, status, points_awarded | Manual evidence attachments |
| `ai_actions` | (column in qscore_history) | Cached AI-generated improvement actions |

---

## What's Left — Task List

### 🔴 Critical / Correctness

- [ ] **P5 exclusion for commercial track is too aggressive** — currently all 5 P5 indicators return 0 for non-impact startups. Even commercial startups can have strong business model alignment (5.4) and strategic relevance (5.5). Consider scoring 5.4 and 5.5 for all tracks, only excluding 5.1–5.3 for commercial.

- [ ] **Available IQ denominator bug** — `availableIQ` should divide by `(# active indicators × 5)` but if P5 is fully excluded (commercial track), it still shows an inflated available IQ. Verify this is calculated correctly after exclusions.

- [ ] **Section completion doesn't sync after submit** — after a successful submit, `profile_builder_data.completion_score` is not updated to reflect confidence-gated scores. Old rows may have inflated completion scores from before the confidence gate was added.

- [ ] **Draft loading ignores `extractionSummary`** — on page refresh, `extractionSummary` state (used in extract-results step and context-aware questions) is not restored. The context-aware section opener falls back to `getMissingFields` which works, but the "Extraction Results" review page is blank after a refresh.

- [ ] **`mergeToAssessmentData` field mapping gaps** — verify every field name the parameter calculators expect (e.g., `p4.teamCoverage` as an array) matches exactly what extraction prompts return. A field name mismatch silently produces `undefined` and drops the indicator score to its floor.

---

### 🟡 Scoring Quality

- [ ] **P3 Build Complexity parsing** — `buildComplexity` is a categorical string (`<1 month | 1-3 months | ...`) extracted by the LLM. The calculator needs to parse this string to a numeric estimate. Verify the regex handles all enum variants without falling through to default.

- [ ] **P6 gross margin edge cases** — if a founder says "we don't track COGS" but has MRR and deal sizes, the gross margin indicator is excluded. Consider adding a heuristic: software with no COGS mentioned → default 80% gross margin assumption (common for pure SaaS).

- [ ] **P2 TAM cross-check false positives** — the `TAM > 100× (customers × LTV)` cap can incorrectly penalise early-stage founders with few customers but a large addressable market. Consider only applying this cap at mid/growth stage.

- [ ] **Bluff detection threshold tuning** — the current threshold of 30% section completion for "bluff detection" may be too aggressive for founders who uploaded a good PDF but didn't complete chat sections. The PDF-populated sections often have 40–60% completion even without chat — these shouldn't trigger bluff blending.

- [ ] **Confidence thresholds per field type** — currently all fields use a flat 0.45 threshold. Numeric fields (`financial.mrr`, `p4.domainYears`) should likely require ≥0.65 to count, while boolean fields (`p3.hasPatent`) can count at 0.45.

---

### 🟡 Profile Builder UX

- [ ] **`extractionSummary` not persisted across refresh** — the "Extraction Results" step (`flowMode === 'fast'`) is blank after a browser refresh. Either store sectionSummaries in the DB and reload them, or regenerate them from stored `extracted_fields` on mount.

- [ ] **Section messages not saved** — conversation messages (`sections[key].messages`) are not persisted to the DB. Returning to a section always shows an empty chat (or the initial question fires again). Save `raw_conversation` as message history and reload it.

- [ ] **`flowMode` not persisted** — after refresh, `flowMode` resets to `'full'` even if the founder used the fast (document) path. Store `flowMode` in `profile_builder_data` or `founder_profiles` and restore on mount.

- [ ] **Upload deduplication race condition** — the 60-second idempotency window in the upload route prevents duplicate inserts but the UI still shows the file as "uploading" if the same file is selected twice in quick succession. Add client-side dedup by filename before sending the request.

- [ ] **No progress autosave during chat** — `saveSection` is only called after a full LLM round-trip. If the user types an answer and navigates away before the response arrives, that answer is lost. Consider a debounced autosave of the raw conversation text.

---

### 🟡 Submission Flow

- [ ] **Submission success page / transition** — after a successful submit, the page currently just shows the preview score. There's no clear CTA to go to the dashboard, no animation, no clear "what's next" guidance.

- [ ] **24-hour rate limit UX** — if the user hits the rate limit, the error is returned as a raw API error. The UI should show a countdown or a friendly "Score locked until [time]" message.

- [ ] **Re-submission score history** — each submission creates a new `qscore_history` row. The dashboard trajectory chart should show all submissions over time, not just the latest. Verify `previous_score_id` FK is being set correctly.

---

### 🟢 Nice to Have / Future

- [ ] **Sector auto-detection from pitch** — currently sector weights use the `industry` field from `founder_profiles` (set during onboarding). Consider inferring sector from Section 2 answers using the LLM and updating `founder_profiles.industry` accordingly.

- [ ] **Confidence transparency to founder** — show founders which of their answers were treated as high vs. low confidence (e.g., "We scored your TAM at 3.0 because we couldn't find a bottom-up calculation — add one to push toward 5.0").

- [ ] **Dynamic threshold adjustment** — the `getSectionCompletionPct` 70% threshold for "section complete" is hardcoded. Consider making it stage-aware: early-stage needs fewer fields filled to mark complete than growth-stage.

- [ ] **P4 team coverage validation** — `teamCoverage` is extracted as a string array (`['tech', 'sales', 'product']`). The scoring looks for specific strings. Validate that the LLM extraction consistently uses these exact strings (not "engineering" instead of "tech").

- [ ] **Batch re-scoring** — if a sector weight or indicator formula changes, there's no batch re-score mechanism. All existing `qscore_history` rows keep old scores. Add an admin endpoint that re-runs `calculateIQScore` against stored `assessment_data` and creates new history rows.

- [ ] **Webhook / notification on score milestone** — when a founder's score crosses 70 (marketplace unlock threshold), trigger a Resend email notification and create an `agent_activity` event so the notification bell lights up.
