# Edge Alpha — Registration & Profile Builder Flow

## Overview

New users go through two completely separate stages before they see a real Q-Score:

```
/founder/onboarding  →  /founder/profile-builder  →  /founder/dashboard
   (Registration)          (Evidence collection)        (Score revealed)
```

**Registration = identity.** Who you are, where you are, what stage.
**Profile Builder = evidence.** Proof for the scoring engine.

---

## Stage 1 — Company Registration (`/founder/onboarding`)

Three-page stepper. Collects baseline identity data and creates the account. No scoring pressure.

### Page 1 — Company Basics
| Field | Required |
|-------|---------|
| Company name | Yes |
| Website URL | No |
| Founded date (month/year) | No |
| Incorporation type | No |
| Industry (12 options) | Yes |
| One-line description (max 100 chars) | Yes |

### Page 2 — Stage & Revenue
| Field | Options | Required |
|-------|---------|---------|
| Current stage | Pre-Product / MVP / Beta / Launched / Growing | Yes |
| Revenue status | Pre-revenue / <$10K MRR / $10K–$100K MRR / $100K+ MRR | Yes |
| Funding status | Bootstrapped / Friends & family / Pre-seed / Seed / Series A+ | Yes |
| Team size | 1–2 / 3–5 / 6–15 / 16+ | Yes |

### Page 3 — Founder Basics + Auth
| Field | Required |
|-------|---------|
| Full name | Yes |
| LinkedIn URL | No (labelled "improves your score") |
| Co-founder count | Yes |
| Years on this problem | Yes |
| Prior startup experience | Yes |
| Work email | Yes |
| Password (min 8 chars) | Yes |

### What happens on submit
1. `POST /api/auth/signup` — creates Supabase auth user + `founder_profiles` row with all 15 registration fields
2. `qscore_history` row inserted: `overall_score = 0`, `data_source = 'registration'`
3. Silent LinkedIn enrichment fired (non-blocking): `POST /api/profile-builder/linkedin-enrich`
4. Auto sign-in via `supabase.auth.signInWithPassword`
5. Redirect to `/founder/profile-builder`

---

## Stage 2 — Profile Builder (`/founder/profile-builder`)

Five-section conversational wizard. Each section targets one or more Q-Score parameters. Requires ≥3 sections at 70%+ to submit.

### Step 0 — Document Upload (optional)

Upload pitch decks, financial models, cap tables, patent lists, founder bios, or impact reports. The AI parses and pre-fills fields across sections.

| File type | What gets extracted |
|-----------|-------------------|
| Pitch deck (PDF/PPTX) | TAM, competitors, team, ICP, problem story |
| Financial model (XLSX/CSV) | MRR, ARR, burn, runway, CAC, LTV, gross margin |
| Patent/IP list (PDF) | Patent numbers, filing dates, coverage |
| Founder bios (PDF/PNG) | Domain years, prior exits, team coverage |
| Impact metrics (PDF/CSV) | CO2 reduction, SDG links, resource savings |

Max 10 MB per file. Accepted: PDF, PPTX, XLSX, CSV, PNG, JPG.

---

### Section 1 — Market Validation (P1: Market Readiness)

**Scores:** Early signal strength, willingness to pay, sales speed, durability, scale of commitment.

Questions adapt to stage:
- Pre-product → asks about conversations and interest, not deals
- Growing → asks about MRR, churn, expansion revenue

Upload triggers: "LOI", "signed", "contract", "invoice", "pilot agreement"

Required fields: `customerCommitment`, `hasPayingCustomers`, `salesCycleLength`, `hasRetention`, `largestContractUsd`

---

### Section 2 — Market & Competition (P2: Market Potential)

**Scores:** TAM credibility, market urgency, value pool size, expansion paths, competitive density.

Questions require bottom-up thinking — not report TAMs.

Upload triggers: "deck", "market research", "competitive analysis", "TAM", "SAM"

Required fields: `p2.tamDescription`, `p2.marketUrgency`, `p2.valuePool`, `p2.expansionPotential`, `p2.competitorDensityContext`

---

### Section 3 — IP & Technology (P3: IP/Defensibility)

**Scores:** Patent protection, technical depth, know-how density, build complexity, replication barrier.

Questions adapt for HealthTech (leads with FDA/CE, not just patents).

Upload triggers: "patent", "filing", "IP", "architecture", "technical spec"

Required fields: `p3.hasPatent`, `p3.technicalDepth`, `p3.knowHowDensity`, `p3.buildComplexity`, `p3.replicationCostUsd`

---

### Section 4 — Team (P4: Founder/Team)

**Scores:** Domain years, founder-market fit, prior exits, team function coverage, cohesion.

LinkedIn enrichment may pre-fill some fields (low confidence — self-reported baseline).

Upload triggers: "LinkedIn", "bio", "team slide", "CV", "resume"

Required fields: `p4.domainYears`, `p4.founderMarketFit`, `p4.priorExits`, `p4.teamCoverage`, `p4.teamCohesionMonths`

---

### Section 5 — Financials & Impact (P1 revenue + P5: Structural Impact)

**Scores:** MRR, burn, runway, gross margin, plus optional ESG/impact signals.

Section 5 is optional — a "Skip" link is available. Skipping leaves P5 at minimum score.

Stripe CTA is surfaced here: connecting Stripe raises financial field confidence to 1.0.

Upload triggers: "financial model", "cap table", "revenue breakdown", "spreadsheet"

Required fields: `financial.mrr`, `financial.monthlyBurn`, `financial.runway`, `p5.climateLeverage`, `p5.revenueImpactLink`

---

### Step 6 — Review & Submit

Shows all 5 section cards with completion %. "Calculate My Q-Score" button activates when ≥3 sections ≥70%.

On submit (`POST /api/profile-builder/submit`):
1. Load all `profile_builder_data` rows for user
2. `mergeToAssessmentData()` → single `AssessmentData` object with `dataSourceMap`
3. `fetchQScoreThresholds()` + `fetchDimensionWeights()` from DB
4. `runRAGScoring(assessmentData)` — 3-layer semantic pipeline
5. `calculatePRDQScore(assessmentData, semanticEval, thresholds, weights)`
6. Bluff penalty: incomplete sections (<30%) blend score toward baseline
7. INSERT `qscore_history`: `data_source = 'profile_builder'`
8. UPDATE `founder_profiles.profile_builder_completed = true`
9. Return `{ score, grade, breakdown }`
10. Client shows animated score reveal → redirect to Dashboard

---

## Confidence System

| Source | Confidence | Mapped to |
|--------|-----------|----------|
| Stripe connected | 1.0 | `'stripe'` |
| Uploaded document | 0.85 | `'document'` |
| Founder corrected AI extract | 0.70 | `'document'` |
| Self-reported (typed answer) | 0.55 | `'self_reported'` |
| Missing / not answered | 0 | field = null |

`dataSourceMap` is populated by `data-merger.ts` and passed into the scoring engine. `applySourceMultiplier()` in `features/qscore/utils/confidence.ts` applies multipliers automatically — no changes needed to the scoring engine.

---

## Section Completion Logic

Each section has 5 required fields. A section is **complete** when ≥70% of required fields are non-null. This allows founders to skip non-applicable fields (e.g. a pre-product founder won't have MRR).

```typescript
// lib/profile-builder/question-engine.ts
isSectionComplete(extractedFields, section) // returns true when ≥70%
getSectionCompletionPct(extractedFields, section) // returns 0–100
```

---

## Draft Persistence

After every answer, `POST /api/profile-builder/save` upserts a `profile_builder_data` row for `{user_id, section}`. On page load, `GET /api/profile-builder/draft` restores all in-progress sections. Founders can leave mid-section and return later.

---

## Dashboard Gate

When `profile_builder_completed = false`, the dashboard shows:
- Q-Score ring with `0`
- Blue banner: "Complete your Profile Builder to get your Q-Score"
- CTA: "Start Profile Builder →" links to `/founder/profile-builder`

---

## Key API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/signup` | POST | Create account with all registration fields |
| `/api/profile-builder/upload` | POST | Parse document + LLM extraction |
| `/api/profile-builder/extract` | POST | Extract fields from a conversation answer |
| `/api/profile-builder/save` | POST | Upsert section progress to DB |
| `/api/profile-builder/draft` | GET | Restore in-progress session |
| `/api/profile-builder/submit` | POST | Full Q-Score pipeline + mark complete |
| `/api/profile-builder/linkedin-enrich` | POST | Silent background enrichment |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `founder_profiles` | Registration data + `profile_builder_completed` flag |
| `profile_builder_data` | One row per user per section (1–5), upserted on each save |
| `profile_builder_uploads` | Document upload records with extracted text + parsed data |
| `qscore_history` | Immutable score chain — `data_source = 'registration'` (score 0) then `'profile_builder'` (real score) |

---

## Key Library Files

| File | Purpose |
|------|---------|
| `lib/profile-builder/document-parser.ts` | PDF/PPTX/XLSX/CSV/image text extraction |
| `lib/profile-builder/extraction-prompts.ts` | LLM system prompts per section (JSON output spec) |
| `lib/profile-builder/question-engine.ts` | Stage-aware questions, completion logic, upload triggers |
| `lib/profile-builder/data-merger.ts` | Maps all 5 sections → `AssessmentData` + `dataSourceMap` |
