# Edge Alpha IQ Score — Profile Builder Reference

## What Is the Profile Builder?

The Profile Builder is a 5-section form that collects founder and startup data. When submitted, it runs the **Edge Alpha IQ Score v2** — a 30-indicator scoring engine that produces a single number from 0–100, a grade, and a full breakdown by parameter.

---

## The 5 Sections (What the Founder Fills In)

| Section | What It Captures |
|---------|-----------------|
| **1 — Market & Customers** | Who your customers are, how many conversations you've had, willingness to pay, pipeline activity, retention signals |
| **2 — Market Potential** | TAM description, why now, competitive landscape, expansion paths |
| **3 — IP & Defensibility** | Patents, technical architecture, proprietary know-how, build complexity |
| **4 — Founder & Team** | Domain experience, founder-market fit narrative, prior exits, team coverage, cohesion |
| **5 — Financials & Impact** | MRR/ARR, burn rate, runway, unit economics, gross margin, impact/SDG alignment |

You need **at least 3 sections at 70%+ completion** to submit. You can submit once per 24 hours.

---

## The Score Formula

```
Final IQ = sum of all 30 raw scores ÷ 150 × 100
```

- Every indicator scores **1.0–5.0** in 0.5 steps
- Max possible score per indicator = 5, max total = 150
- **Excluded indicators score 0 but stay in the denominator** — the denominator is always 150, never reduced
- Confidence is **display-only metadata** — it never changes a raw score

**Also computed:**
- `availableIQ` = sum of non-excluded scores ÷ (active count × 5) × 100 — shows your ceiling if excluded indicators had data
- `track` = `commercial` or `impact` — determines whether P5 counts

---

## The 6 Parameters and 30 Indicators

### P1 — Market Readiness
*How ready the market is to buy from you right now.*

| ID | Indicator | What It Measures | Excluded When |
|----|-----------|-----------------|---------------|
| 1.1 | Early Signal | Conversation count and quality of customer evidence | Never |
| 1.2 | Willingness to Pay | Paying customers, LOIs, commitment signals | Pre-product AND no pilots |
| 1.3 | Speed | Sales cycle length and pipeline activity | No active pipeline |
| 1.4 | Durability | Retention — NDR (B2B) or D30 (consumer) | No customers yet |
| 1.5 | Scale | TAM addressability and expansion potential | Never |

**Durability scoring (1.4) — explicit VC-aligned brackets:**

B2B Net Dollar Retention:
- NDR ≥ 130% → 5.0 · ≥ 120% → 4.5 · ≥ 110% → 4.0 · ≥ 100% → 3.5 · ≥ 90% → 2.5

Consumer Day-30 Retention:
- D30 ≥ 50% → 5.0 · ≥ 40% → 4.0 · ≥ 30% → 3.0 · ≥ 20% → 2.0

---

### P2 — Market Potential
*How big and real the opportunity is.*

| ID | Indicator | What It Measures | AI Flagged |
|----|-----------|-----------------|------------|
| 2.1 | Market Size | TAM quality — bottom-up vs top-down | Yes |
| 2.2 | Market Urgency | Why now — regulatory / tech / behaviour catalyst | No |
| 2.3 | Value Pool | Total economic value of the problem being solved | No |
| 2.4 | Expansion Potential | Adjacent markets and international paths | No |
| 2.5 | Competitive Space | Competitor density and differentiation room | Yes |

**Market Size (2.1) scoring logic:**
- Bottom-up calculation present (customers × price) → up to 5.0
- Top-down only (analyst report cited, no decomposition) → **capped at 3.0**
- VC alert fires: *"Top-down TAM only — VCs prefer: # target customers × ACV"*

---

### P3 — IP / Defensibility
*How hard it is for someone to copy what you've built.*

| ID | Indicator | What It Measures | Excluded When |
|----|-----------|-----------------|---------------|
| 3.1 | IP Protection | Patents filed/granted, trade secret documentation | Never |
| 3.2 | Technical Depth | Proprietary technology complexity | Never |
| 3.3 | Know-How Density | Tacit expertise that doesn't live in code | Never |
| 3.4 | Build Complexity | Time and talent required to build equivalent | Never |
| 3.5 | Replication Barrier | Cost/time to replicate for a funded competitor | AI flagged |

---

### P4 — Founder / Team
*Who is building this and why are they the right people.*

| ID | Indicator | What It Measures | Excluded When |
|----|-----------|-----------------|---------------|
| 4.1 | Domain Depth | Years of direct experience in this industry | Never |
| 4.2 | Founder-Market Fit | Why this founder for this market (archetype scoring) | Never |
| 4.3 | Founder Experience | Prior exits, companies built, operator track record | Never |
| 4.4 | Leadership Coverage | Key functions covered (tech, sales, product, finance, ops) | Never |
| 4.5 | Team Cohesion | How long the core team has worked together | Never |

**Founder-Market Fit (4.2) — Sequoia "Why you?" archetypes:**

| Archetype | Score Range | Signals |
|-----------|-------------|---------|
| **Insider** | 4.0–5.0 | Lived the problem, personal stake, concrete detail, operator background |
| **Academic** | 4.0–4.5 | PhD, research, invented the technology, published work |
| **Outsider** | 3.0–3.5 | Cross-industry pattern transfer, non-obvious insight articulated |
| No archetype | 1.5–2.5 | Generic narrative, no clear "why you" |

VC alert fires when no archetype is detected.

---

### P5 — Structural Impact
*For impact-track startups: SDG/climate/development alignment.*

| ID | Indicator | What It Measures | Excluded When |
|----|-----------|-----------------|---------------|
| 5.1 | Climate Leverage | Emissions reduction or climate adaptation impact | Commercial track |
| 5.2 | Resource Efficiency | Social/environmental resource efficiency | Commercial track |
| 5.3 | Development Relevance | Alignment with emerging market development goals | Commercial track |
| 5.4 | Business Model Alignment | Revenue model tied to impact outcomes | Commercial track |
| 5.5 | Strategic Relevance | SDG / Viksit Bharat 2047 alignment | Commercial track |

**If track = commercial, all 5 P5 indicators score 0 and stay in the denominator.**
The system determines track automatically from the startup's stated focus.

---

### P6 — Financials
*Revenue, burn, and unit economics.*

| ID | Indicator | What It Measures | Excluded When |
|----|-----------|-----------------|---------------|
| 6.1 | Revenue Scale | MRR/ARR absolute size | Pre-product or idea stage |
| 6.2 | Burn Efficiency | Burn multiple (burn ÷ net new ARR) | No MRR + burn data |
| 6.3 | Runway | Months of runway remaining | Pre-product or idea stage |
| 6.4 | Unit Economics | LTV : CAC ratio | < 10 customers (early/mid) |
| 6.5 | Gross Margin | Gross margin % | No COGS or deal size data |

**P6 exclusion rules by stage:**

| Stage | Exclusions |
|-------|-----------|
| `early` (pre-product / idea) | All 5 excluded |
| `mid` with MRR < $1,000 | 6.1, 6.4, 6.5 excluded; 6.3 runway kept |
| Any stage, < 10 customers | 6.4 excluded |
| Any stage, no burn data | 6.2 excluded |
| Any stage, no COGS data | 6.5 excluded |

**Revenue Scale (6.1) brackets (mid-stage B2B SaaS example):**
- MRR ≥ $250K (ARR $3M) → 5.0
- MRR $100K–$250K → 4.0–4.5
- MRR $25K–$100K → 3.0–4.0
- MRR $5K–$25K → 2.0–3.0
- MRR < $5K → 1.0–2.0

---

## Sector Weights

Each sector puts different emphasis on the 6 parameters. Order: P1, P2, P3, P4, P5, P6.

| Sector | P1 | P2 | P3 | P4 | P5 | P6 |
|--------|----|----|----|----|----|----|
| b2b_saas | 24% | 18% | 10% | 16% | 5% | 27% |
| marketplace | 28% | 24% | 8% | 16% | 6% | 18% |
| consumer | 26% | 22% | 6% | 14% | 6% | 26% |
| fintech | 20% | 18% | 18% | 20% | 8% | 16% |
| ai_ml | 20% | 20% | 18% | 22% | 6% | 14% |
| biotech | 8% | 18% | 32% | 26% | 8% | 8% |
| climate | 14% | 20% | 22% | 18% | 18% | 8% |
| hardware | 12% | 20% | 28% | 22% | 6% | 12% |
| healthtech | 16% | 18% | 22% | 20% | 10% | 14% |
| edtech | 18% | 20% | 10% | 16% | 12% | 24% |
| enterprise_software | 22% | 18% | 12% | 18% | 6% | 24% |
| logistics | 20% | 20% | 10% | 16% | 8% | 26% |
| agriculture | 14% | 20% | 18% | 18% | 16% | 14% |
| proptech | 18% | 22% | 10% | 16% | 8% | 26% |
| default | 20% | 20% | 17% | 18% | 8% | 17% |

---

## Stage Multipliers

Stage shifts the effective weight by multiplying the sector base then renormalizing.

| Stage | P1 | P2 | P3 | P4 | P5 | P6 |
|-------|----|----|----|----|----|----|
| early | 0.70× | 1.05× | 1.20× | 1.30× | 1.00× | 0.60× |
| mid | 1.00× | 1.00× | 1.00× | 1.00× | 1.00× | 1.00× |
| growth | 1.30× | 0.95× | 0.80× | 0.90× | 0.90× | 1.40× |

Example: B2B SaaS at early stage — team (P4) weight increases, financials (P6) decreases. At growth stage — financials (P6) and traction (P1) increase, team (P4) decreases.

---

## Grade Thresholds

| IQ Score | Grade | Meaning |
|----------|-------|---------|
| 85–100 | A+ | Exceptional — top decile |
| 75–84 | A | Strong investment signal |
| 65–74 | B | Promising, clear gaps |
| 55–64 | C | Early stage, needs work |
| 45–54 | D | Significant gaps |
| < 45 | F | Not yet investment-ready |

**Marketplace unlocks at IQ ≥ 45** (founder visible to investors).

---

## AI Flags (Reconciliation Engine)

4 indicators are AI-reconciled after scoring: **2.1** (Market Size), **2.5** (Competitive Space), **3.5** (Replication Barrier), **5.1** (Climate Leverage).

The AI **never changes the raw score**. It only:
- Adjusts `DataQuality.confidence` down if the founder's claim deviates from AI estimate
- Sets a `vcAlert` string shown to investors

Deviation rules:
- ≤ 50% deviation → no change
- 50–100% → confidence − 0.10
- > 100% → confidence − 0.20, vcAlert set
- > 500% or extreme keywords → confidence − 0.30, vcAlert = "extreme claim"

If the AI call times out or fails, the submission still completes.

---

## Cross-Indicator Validation Rules

8 rules that check for logical contradictions. Critical rules block submission.

| Code | Check | Severity |
|------|-------|----------|
| V01 | 1.2 ≥ 4 (strong WTP) AND 6.1 ≤ 1 (no revenue) | Critical — blocks |
| V02 | 1.4 ≥ 3 (retention claimed) AND 1.2 ≤ 1 (no paying customers) | Critical — blocks |
| V03 | Runway inconsistent with stated burn and cash balance | High — warning |
| V04 | Market size ≥ 4 but < 5 customer conversations | Medium — warning |
| V05 | ≥ 10 customers but MRR/customer < $100 | Medium — warning |
| V06 | Build complexity ≤ 2 but tech depth ≥ 4 | Medium — warning |
| V07 | Burn efficiency < 2 (high burn) but runway ≥ 4 (long runway) | Medium — warning |
| V08 | Domain experience > 20 years | Medium — suggestion |

---

## Data Quality Badges

Every indicator has a `DataQuality` object attached — shown in the UI as a badge.

| Badge | Meaning |
|-------|---------|
| Verified | Came from Stripe API or third-party source |
| Doc-supported | Backed by an uploaded document |
| Founder claim | Self-reported, no external verification |

Confidence ranges 0.5–1.0 and affects the ± score range shown on the dashboard (e.g. "72 ± 5") — it does not touch the raw score.

---

## Submit Pipeline (Order of Operations)

1. Authenticate user
2. Check ≥ 3 sections at 70%+ completion
3. Check 24-hour rate limit
4. Merge all sections → `AssessmentData`
5. Load `founder_profiles` for sector, stage, impact focus
6. Look up sector weight profile from DB (falls back to `default`)
7. Run confidence engine → `DataQuality` map (metadata only)
8. Run AI reconciliation on 2.1, 2.5, 3.5, 5.1 (non-blocking, 5s timeout)
9. Run `calculateIQScore()` → 30 raw scores, finalIQ, availableIQ, track
10. Run cross-indicator validation → block on critical issues
11. Fetch benchmark percentiles (non-blocking)
12. Insert row into `qscore_history` with `score_version = 'v2_iq'`
13. Update `founder_profiles.profile_builder_completed = true`
14. Return score, grade, iqBreakdown, track, availableIQ, validationWarnings
