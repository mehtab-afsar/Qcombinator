# The 3 Scoring Stages — How a Founder's Score Evolves

Every founder on Edge Alpha goes through three distinct scoring stages. Each one is deeper than the last, and each one produces a more accurate Q-Score.

---

## Overview

| | Stage 1 | Stage 2 | Stage 3 |
|--|---------|---------|---------|
| **Name** | Onboarding Chat | Full Assessment Interview | Artifact Challenges |
| **When** | During signup | Anytime after onboarding | Ongoing — via AI agents |
| **Format** | 5-question conversation | 7-topic conversational deep-dive | Agent-generated deliverables |
| **Time** | ~5 minutes | ~15–30 minutes | Per artifact (~10–30 min each) |
| **Fields collected** | ~10 key signals | 75+ fields across 6 dimensions | Content quality per artifact |
| **Score produced** | Initial Q-Score | Full Q-Score with percentile | Incremental dimension boosts |
| **Stored as** | `data_source = 'onboarding'` | `data_source = 'assessment'` | `data_source = 'agent_artifact'` |

---

## Stage 1 — Onboarding Chat (5 Questions)

**Files:**
- `app/founder/onboarding/page.tsx` — UI (conversational chat)
- `app/api/onboarding/chat/route.ts` — LLM conversation handler
- `app/api/onboarding/extract/route.ts` — extracts structured fields from conversation
- `app/api/onboarding/complete/route.ts` — runs scoring + saves to DB

### What it is

A natural conversation with the Edge Alpha Adviser during signup. No forms, no dropdowns — just answers typed in chat. It asks exactly **5 questions** covering the 4 most signal-rich areas of founder readiness, plus one adaptive follow-up on the weakest answer.

### The 5 Questions

| # | Question | Dimension it feeds | Max Points |
|---|----------|-------------------|-----------|
| Q1 | "How did you discover this problem? Tell me the personal story." | Team (domain expertise) | 25 pts |
| Q2 | "Why are YOU the right person to solve this?" | Team (unique advantage) | 25 pts |
| Q3 | "Have you spoken to real users? Any commitments or direct quotes?" | Product + Traction | 30 pts |
| Q4 | "What's the hardest moment you've faced building this? How close did you get to quitting?" | Team (resilience) | 20 pts |
| Q5 | Adaptive follow-up on the weakest answer from Q1–Q4 | Varies | — |

### What fields are extracted

After the conversation ends, the LLM extracts structured data from the full chat transcript:

| Field | Source Question | Used In |
|-------|----------------|---------|
| `problemStory` | Q1 | Team dimension — domain expertise |
| `advantages` | Q2 | Team dimension — unique advantage list |
| `advantageExplanation` | Q2 | Team dimension — LLM quality eval |
| `customerQuote` | Q3 | Product dimension — validation quality |
| `conversationCount` | Q3 | Product + Traction — conversation tier |
| `customerCommitment` | Q3 | Traction dimension — paid/LOI/waitlist |
| `customerSurprise` | Q3 | Product dimension — learning signal |
| `failedBelief` | Q3 | Product dimension — failed assumptions |
| `hardshipStory` | Q4 | Team dimension — resilience eval |

### How the score is calculated from these 5 questions

The extracted fields are passed to `calculatePRDQScore()` as a partial assessment. Because only ~10 of the 75 total fields are populated, most dimensions receive **confidence penalties** for missing data — this is intentional, as the onboarding score is explicitly a first approximation.

```
Q1 → problemStory → LLM evaluates domain depth → Team score (partial)
Q2 → advantageExplanation → LLM evaluates unfair advantage → Team score (partial)
Q3 → customerQuote + conversationCount + customerCommitment → Product + Traction scores
Q4 → hardshipStory → LLM evaluates resilience → Team score (partial)
All missing fields → confidence penalties applied per dimension
```

The 6 dimensions are still all calculated and weighted — but Market, Financial, and GTM will score low because the founder hasn't answered those questions yet. The overall score reflects that incompleteness honestly.

### What it produces

```
Output of Stage 1:
├── overall_score         (typically 30–55, reflects partial data)
├── grade                 (usually D or C)
├── 6 dimension scores    (Team scores highest; Market/Financial/GTM score low)
├── data_source           = 'onboarding'
└── saved to qscore_history + partial founder_profiles row
```

**Side effect:** If the initial score is ≥ 50, an investor alert is triggered.

**What it does NOT give:** percentile (too few fields), full dimension breakdown, improvement actions.

---

## Stage 2 — Full Assessment Interview (7 Topics)

**Files:**
- `app/founder/assessment/page.tsx` — UI (topic-by-topic chat interface)
- `app/api/assessment/interview/route.ts` — LLM handler (extracts fields per message)
- `app/api/assessment/submit/route.ts` — submits completed assessment → triggers full scoring
- `app/api/assessment/draft/route.ts` — auto-saves draft every 30 seconds

### What it is

A structured conversational interview across **7 topics**, each targeting a specific Q-Score dimension. The AI interviewer adapts its questions to the founder's answers, extracts structured data in real-time, and auto-advances to the next topic when ~70% of the topic's fields are filled. It terminates after a maximum of **25 total exchanges** or **4 exchanges per topic**.

Founders can also upload PDFs and CSVs (pitch decks, financial models) — the system extracts relevant fields directly from the documents.

The assessment can be entered fresh **or** as a continuation from onboarding — in the latter case, Stage 1 data pre-fills relevant fields so the founder doesn't repeat themselves.

### The 7 Topics — Questions, Fields, and Scoring

---

#### Topic 1 — Your Story
**Dimension:** Team
**Purpose:** Understand whether the founder has earned the right to build this — domain depth, unique advantage, unfair position.

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `problemStory` | The personal origin story — how did they encounter this problem? |
| `advantages` | List of specific advantages (e.g. "10 years in pharma supply chain") |
| `advantageExplanation` | Why these advantages translate into an unfair edge |

**How these score:**
- `problemStory` → LLM evaluates specificity, credibility, personal connection (0–40 pts)
- `advantageExplanation` → LLM evaluates how compelling the unfair advantage is (0–40 pts)
- `advantages` count → Team completeness sub-score

---

#### Topic 2 — Customer Evidence
**Dimension:** Product + Traction
**Purpose:** Did they actually go talk to customers, and what did they hear?

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `customerQuote` | Verbatim quotes from customer conversations |
| `customerSurprise` | What surprised them most — learning signal |
| `customerCommitment` | Paid / LOI / waitlist / no commitment |
| `conversationCount` | Number of customer discovery conversations |
| `failedBelief` | An assumption they held that turned out to be wrong |

**How these score:**
- `conversationCount` → tier lookup: ≥100 = 20 pts, 50–100 = 18, 30–50 = 15, etc. (max 20 pts)
- `customerCommitment` → paid = 20, LOI = 15, waitlist = 8, none = 0 (max 20 pts)
- `customerQuote` → LLM evaluates specificity and credibility (max 20 pts)
- `failedBelief` → LLM evaluates quality of learning from failed assumption (max 30 pts)

---

#### Topic 3 — What You've Learned
**Dimension:** Product
**Purpose:** How fast and well do they build, test, and iterate?

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `tested` | What specifically did they test with customers? |
| `buildTime` | How long did it take to build the initial version? |
| `measurement` | How do they measure whether something is working? |
| `results` | What did the test results show? |
| `learned` | What did they conclude from the test? |
| `changed` | What did they actually change as a result? |

**How these score:**
- `buildTime` → tier: ≤7 days = 10 pts, ≤14 = 8, ≤30 = 5, >30 = 2 (max 10 pts)
- `tested + results + learned + changed` → LLM evaluates iteration quality and learning velocity (max 20 pts)
- `failedBelief` (from Topic 2) + this narrative → LLM evaluates failed assumptions quality (max 30 pts)

---

#### Topic 4 — Market & Competition
**Dimension:** Market
**Purpose:** Do they understand who their customer is, how many there are, and what the economics look like?

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `targetCustomers` | Total addressable customers (number) |
| `conversionRate` | Expected % who will become customers |
| `lifetimeValue` | Revenue per customer over their lifetime |
| `costPerAcquisition` | How much it costs to acquire one customer |

**How these score:**
- `targetCustomers × lifetimeValue` → TAM calculation → tier lookup: $1B+ = 40 pts, $100M+ = 35, $10M+ = 28, etc.
- `conversionRate` → realism check: 0.5–5% = full 30 pts; outside that range = deductions
- `lifetimeValue / costPerAcquisition` → LTV:CAC ratio → ≥3:1 = 10 pts; <1:1 = 0

---

#### Topic 5 — Go-to-Market
**Dimension:** GTM
**Purpose:** Do they know exactly who they're selling to, which channels they've tested, and what their messaging says?

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `icpDescription` | Ideal Customer Profile — who specifically is the first buyer? |
| `channelsTried` | List of channels tested (e.g. cold email, LinkedIn, events) |
| `currentCAC` | Current cost to acquire a customer |

**How these score:**
- `icpDescription` → LLM evaluates specificity and clarity (max 35 pts): a vague ICP ("SMBs") scores low; a specific ICP ("ops managers at Series B SaaS companies with 20–100 employees") scores high
- `channelsTried` → count of distinct channels: 3+ = 15 pts, 2 = 10, 1 = 5, 0 = 0
- `currentCAC / avgDealSize` → ratio target 0.1–0.4 = 10 pts (channel efficiency)
- `messagingTests` field (if collected) → LLM evaluates messaging experiment quality (max 30 pts)

---

#### Topic 6 — The Numbers
**Dimension:** Financial
**Purpose:** What are the real financials — revenue, burn, runway?

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `mrr` | Monthly Recurring Revenue ($) |
| `monthlyBurn` | Monthly cash spend ($) |
| `runway` | Months of runway remaining |

**How these score — calculated fields:**
- `mrr × 12` = ARR → tier lookup: $1M+ = 20 pts, $500K+ = 17, $100K+ = 14, $50K+ = 10, <$50K = 0–6
- `runway` → tier: ≥18 months = 30, 12–18 = 25, 9–12 = 20, 6–9 = 15, 3–6 = 10, <3 = 5
- `grossMargin = (avgDealSize - COGS) / avgDealSize × 100` → ≥80% = 20 pts
- `projectedGrowth` (derived or stated) → 50–300% YoY = 15 pts

---

#### Topic 7 — Resilience
**Dimension:** Traction
**Purpose:** Has this person proven they won't quit when things get hard?

**Fields extracted:**
| Field | What it captures |
|-------|----------------|
| `hardshipStory` | The hardest moment building this company |
| `motivation` | Why they are still doing this despite that hardship |

**How these score:**
- `hardshipStory` → LLM evaluates authenticity, severity, and how they handled it (max 30 pts)
- `motivation` → LLM evaluates conviction vs cliché (feeds into Team resilience sub-score)

---

### The Auto-Advance System

The interview doesn't ask every question mechanically. After each founder reply, the AI:
1. Extracts any fields it can from the answer
2. Checks what % of the current topic's fields are populated
3. If ≥70% of topic fields are filled → suggests moving to next topic
4. If the founder gives a rich answer that covers multiple topics at once → extracts cross-topic fields

Minimum 4 of 7 topics must be completed before the assessment can be submitted.

### How the full score is calculated from all 7 topics

After submit, `POST /api/qscore/calculate` runs the full pipeline:

```
All extracted fields → calculatePRDQScore()
    ↓
6 dimension calculators run in parallel (formulas + LLM quality eval)
    ↓
RAG pipeline:
  Layer 1: LLM rubric scoring of narrative fields
  Layer 2: pgvector retrieval vs known-good answers
  Layer 3: Benchmark validation — flags conflicts
    ↓
Confidence penalties applied per dimension (missing fields)
    ↓
Bluff detection: round numbers, AI phrases, impossible ratios → up to -30%
    ↓
Weighted overall = Σ(dimension × sector_weight)
    ↓
Percentile vs all founders in same sector
    ↓
Grade assigned (A+ → F)
    ↓
INSERT qscore_history row (data_source = 'assessment')
    ↓
Fire-and-forget:
  - founder_metric_snapshots (for future cohort scoring)
  - IQ scoring (25 indicators)
  - RAG execution logs
```

### What it produces

```
Output of Stage 2:
├── overall_score              (0–100, full data)
├── grade                      (A+ to F)
├── percentile                 (vs all founders in sector)
├── 6 dimension scores         (each 0–100)
├── delta                      (change from Stage 1 score)
├── trend per dimension        (up / down / neutral)
├── confidenceAdjustments      (per dimension)
├── bluffPenalty               (if detected)
├── ragMetadata                (which fields scored well/poorly)
├── data_source                = 'assessment'
└── IQ Score triggered async   (25 indicators, 5 parameters)
```

**What changes vs Stage 1:**
- All 6 dimensions now have full data → scores are accurate, not penalised
- Percentile is now calculated (enough fields to compare vs cohort)
- Improvement actions generated via LLM and cached in `ai_actions` JSONB
- IQ scoring runs for the first time (Stripe + artifact + self-reported pipeline)

---

## Stage 3 — Artifact Challenges (Ongoing)

**Files:**
- `app/founder/improve-qscore/page.tsx` — shows 12 challenges with completion status
- `features/qscore/services/agent-signal.ts` — applies the boost
- `app/api/agents/generate/route.ts` — triggers boost after artifact creation
- `app/api/qscore/activity-boost/route.ts` — boost API endpoint

### What it is

After Stage 2, the only way to increase the Q-Score further is to **produce deliverables through the AI agents**. Each of the 12 artifact types triggers a one-time, idempotent dimension boost. The more complete the artifact (measured by content length), the larger the boost applied.

This stage is **not a new assessment** — it is an evidence layer that says: "This founder didn't just describe their GTM strategy, they actually built one with an AI agent."

### The 12 Challenges

| # | Challenge | Agent | Dimension | Max Boost | Quality Multiplier |
|---|-----------|-------|-----------|-----------|-------------------|
| 1 | GTM Playbook | Patel | Go-to-Market | +6 pts | 1.0 if ≥800 chars |
| 2 | Financial Summary | Felix | Financial | +6 pts | 1.0 if ≥800 chars |
| 3 | ICP Document | Patel | Go-to-Market | +5 pts | |
| 4 | Competitive Matrix | Atlas | Market | +5 pts | |
| 5 | PMF Survey | Nova | Product | +5 pts | |
| 6 | Hiring Plan | Harper | Team | +5 pts | |
| 7 | Outreach Sequence | Patel | Traction | +4 pts | |
| 8 | Battle Card | Atlas | Market | +4 pts | |
| 9 | Sales Script | Susi | Traction | +4 pts | |
| 10 | Brand Messaging | Maya | Go-to-Market | +4 pts | |
| 11 | Strategic Plan | Sage | Product | +4 pts | |
| 12 | Legal Checklist | Leo | Financial | +3 pts | |

**Quality multiplier:**
- ≥ 800 characters of content → 1.0× (full boost)
- 300–800 characters → 0.6×
- < 300 characters → 0.3×

**Example:** A GTM Playbook with 1,200 chars of content → `6 × 1.0 = +6 pts` added to the GTM dimension score.

### How the boost is applied

```
Founder completes artifact via agent
    ↓
POST /api/agents/generate saves artifact to agent_artifacts table
    ↓
Calls POST /api/qscore/activity-boost with { userId, artifactType, content }
    ↓
applyAgentScoreSignal():
  Check qscore_history: has this artifact type already boosted this user?
  If yes → skip (idempotent, no stacking)
  If no:
    Fetch latest qscore_history row
    qualityMultiplier = content.length >= 800 ? 1.0 : content.length >= 300 ? 0.6 : 0.3
    boostPts = basePts × qualityMultiplier
    newDimScore = min(currentDimScore + boostPts, 100)
    newOverall = recalculate weighted sum with new dim score
    INSERT new qscore_history row (data_source = 'agent_artifact')
    ↓
UI shows score boost toast (animated, 4s)
```

### What it produces

```
Output of Stage 3 (per artifact completed):
├── new qscore_history row        (data_source = 'agent_artifact')
├── one dimension score boosted   (capped at 100)
├── overall_score recalculated    (weighted sum with new dim score)
├── delta shown in UI             (e.g. "+5 pts from GTM Playbook")
└── score boost toast displayed   (real-time via Supabase subscription)
```

**What changes vs Stage 2:**
- Dimension scores can only go up, never down from this stage
- Each of the 12 artifact types can only contribute once per user (idempotent)
- Maximum theoretical boost: `6+6+5+5+5+5+4+4+4+4+4+3 = 55 pts` across dimensions (if all artifacts are full quality and all dimensions start from 0)

---

## How the 3 Stages Connect

```
SIGNUP
  │
  ▼
Stage 1 — Onboarding Chat (5 questions, 5 min)
  │  → Initial Q-Score saved (partial, typically 30–55)
  │  → Team dimension most populated
  │  → Market/Financial/GTM score low (not asked yet)
  │
  ▼
Stage 2 — Full Assessment (7 topics, 15–30 min)
  │  → Full Q-Score saved (all 6 dimensions populated)
  │  → Percentile calculated for first time
  │  → IQ Score runs (25 indicators, fire-and-forget)
  │  → Stage 1 data pre-fills relevant fields (no repetition)
  │  → Score typically jumps significantly from Stage 1
  │
  ▼
Stage 3 — Artifact Challenges (ongoing, via agents)
     → Up to +55 pts across dimensions (if all 12 artifacts completed)
     → Each artifact = one-time idempotent boost
     → Score updates in real-time on dashboard
     → Shows which dimensions still have un-triggered boosts
     → Investor-facing portfolio updates automatically
```

---

## Score Trajectory Example

| Stage | Event | Overall Score | What changed |
|-------|-------|--------------|--------------|
| Stage 1 | Onboarding chat complete | 38 | Team scored from story + resilience; rest penalised for missing data |
| Stage 2 | Full assessment submitted | 64 | All 6 dimensions now have real data; percentile = 45th |
| Stage 3 | GTM Playbook completed (Patel) | 69 | GTM dim: 58 → 64; overall recalculated |
| Stage 3 | Financial Summary (Felix) | 73 | Financial dim: 61 → 67 |
| Stage 3 | Competitive Matrix (Atlas) | 77 | Market dim: 70 → 75 |
| Stage 3 | Hiring Plan (Harper) | 80 | Team dim: 72 → 77 |
| Stage 3 | All 12 artifacts done | 85–90 | All dimensions near ceiling |
