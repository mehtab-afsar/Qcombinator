# Qcombinator — Hardcoded Values Audit

> **Purpose:** Permanent reference for every hardcoded value in the codebase. Each entry includes a verdict, reasoning, and recommendation so future engineers (or you, six months from now) can understand *why* a value exists and whether it should be touched.
>
> **Verdicts:** `✅ GOOD` — principled, leave it | `⚠️ ACCEPTABLE` — works but document the rationale | `❌ BAD` — should be refactored | `🚨 NO LOGIC` — arbitrary, high risk, needs a decision
>
> **Last updated:** 2026-05-08

---

## Table of Contents

1. [Q-Score Weights, Grades & Decay](#1-q-score-weights-grades--decay)
2. [Q-Score Parameter Calculators P1–P6](#2-q-score-parameter-calculators-p1p6)
3. [Bluff Detection](#3-bluff-detection)
4. [Rate Limits & Tool Gates](#4-rate-limits--tool-gates)
5. [LLM Configuration](#5-llm-configuration)
6. [Agent Configuration](#6-agent-configuration-edgealphaconfigts)
7. [Business Logic Thresholds](#7-business-logic-thresholds)
8. [Subscription Tiers & Brand Values](#8-subscription-tiers--brand-values)
9. [Feature Flags](#9-feature-flags)
10. [Things Built Without Logic — Top 12](#10-things-built-without-logic--top-12)
11. [Priority Action Table](#11-priority-action-table)

---

## 1. Q-Score Weights, Grades & Decay

### 1.1 Sector Weight Arrays

**File:** `features/qscore/utils/sector-weights.ts` lines 33–68

Each sector gets a 6-float array `[P1, P2, P3, P4, P5, P6]` that must sum to 1.0. These weights determine how much each parameter contributes to the total score *for that sector*.

| Sector | P1 | P2 | P3 | P4 | P5 | P6 | Verdict |
|---|---|---|---|---|---|---|---|
| B2B SaaS | 0.20 | 0.18 | 0.20 | 0.18 | 0.14 | 0.10 | `⚠️ ACCEPTABLE` |
| B2C SaaS | 0.16 | 0.22 | 0.16 | 0.14 | 0.12 | 0.20 | `⚠️ ACCEPTABLE` |
| Marketplace | 0.18 | 0.14 | 0.16 | 0.20 | 0.12 | 0.20 | `⚠️ ACCEPTABLE` |
| Biotech/DeepTech | 0.26 | 0.22 | 0.12 | 0.16 | 0.20 | 0.04 | `⚠️ ACCEPTABLE` |
| Consumer Brand | 0.16 | 0.18 | 0.20 | 0.18 | 0.10 | 0.18 | `⚠️ ACCEPTABLE` |
| Fintech | 0.22 | 0.18 | 0.14 | 0.24 | 0.14 | 0.08 | `⚠️ ACCEPTABLE` |
| Hardware/IoT | 0.20 | 0.20 | 0.14 | 0.22 | 0.18 | 0.06 | `⚠️ ACCEPTABLE` |
| E-commerce/D2C | 0.16 | 0.14 | 0.18 | 0.24 | 0.10 | 0.18 | `⚠️ ACCEPTABLE` |

**Reasoning:** These represent considered domain judgment — Biotech has a low P6 weight (0.04) because early-stage biotech is pre-revenue by design; Fintech prioritises P4 team (0.24) because regulatory execution is founder-skill-dependent. The values are defensible. The problem: there is no written rationale and no version history. If a new sector is added, there is no framework for choosing the weights.

**Recommendation:** Add a `// RATIONALE:` comment block above each sector's array explaining the logic. Consider a separate `sector-weights.rationale.md` document. Do not change the values without a deliberate review.

---

### 1.2 Stage Multipliers

**File:** `features/qscore/calculators/q-score-calculator.ts` lines 54–57

These multiply per-parameter scores based on the startup's declared stage.

| Stage | P1 | P2 | P3 | P4 | P5 | P6 | Verdict |
|---|---|---|---|---|---|---|---|
| Early | 0.70 | 1.05 | 1.20 | 1.30 | 1.00 | 0.60 | `⚠️ ACCEPTABLE` |
| Mid | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | 1.00 | `✅ GOOD` |
| Growth | 1.30 | 0.95 | 0.80 | 0.90 | 0.90 | 1.40 | `⚠️ ACCEPTABLE` |

**Reasoning:** The mid-stage array being all 1.0 is correct — it's the baseline. Early-stage: boosting P3/P4 (IP/team) and penalising P1/P6 (GTM/financials) makes sense because early companies should be judged on team strength, not revenue. Growth-stage: boosting P1/P6 and discounting P3 makes sense because IP matters less once you have scale. The ordering is logical. Again: **no written rationale exists**.

**Recommendation:** Document the philosophy. The current values are reasonable; do not change without an explicit framework.

---

### 1.3 Grade Thresholds

**File:** `features/qscore/types/qscore.types.ts` lines 32–40

`[80, 68, 60, 52, 44, 36, 26, 0]` → A+, A, B+, B, C+, C, D, F

| Threshold | Grade | Verdict |
|---|---|---|
| >= 80 | A+ | `⚠️ ACCEPTABLE` |
| >= 68 | A | `⚠️ ACCEPTABLE` |
| >= 60 | B+ | `⚠️ ACCEPTABLE` |
| >= 52 | B | `⚠️ ACCEPTABLE` |
| >= 44 | C+ | `⚠️ ACCEPTABLE` |
| >= 36 | C | `⚠️ ACCEPTABLE` |
| >= 26 | D | `⚠️ ACCEPTABLE` |
| >= 0 | F | `⚠️ ACCEPTABLE` |

**Reasoning:** The thresholds are unequal intervals (12-point gap at the top, 8-point gaps in the middle). This concentrates discrimination at the top end — a deliberate choice to make A+ genuinely rare. The grade labels are shown to investors and founders so they carry real weight. There is no documented reason why 80 is the A+ cutoff and not 75 or 85.

**Recommendation:** The grade thresholds should be validated against the actual score distribution once you have 100+ founders. A distribution-based approach (e.g. top 5% = A+) would be more defensible than fixed cutoffs.

---

### 1.4 Confidence Data-Source Multipliers

**File:** `features/qscore/utils/confidence.ts` lines 83–86

| Source | Multiplier | Verdict |
|---|---|---|
| Stripe (verified) | 1.00 | `✅ GOOD` |
| Document upload | 0.85 | `✅ GOOD` |
| Self-reported | 0.55 | `✅ GOOD` |

**Reasoning:** This is the best-designed set of hardcoded values in the codebase. The hierarchy is principled: verified payment data > uploaded documents (which could be faked but require effort) > self-reported (highest risk of inflation). The 0.55 floor for self-reported is meaningfully penalising without being disqualifying. This is correct.

---

### 1.5 Temporal Decay Bands

**File:** `app/api/qscore/latest/route.ts` lines 64–67

| Age | Decay factor | Verdict |
|---|---|---|
| 0–90 days | 1.00 | `✅ GOOD` |
| 91–180 days | 0.975 | `✅ GOOD` |
| 181–270 days | 0.95 | `✅ GOOD` |
| 271–365 days | 0.90 | `✅ GOOD` |
| > 365 days | 0.80 | `✅ GOOD` |

**Reasoning:** Industry-standard staleness handling. A score assessed 18 months ago has an 80% weighting — it's still informative but flagged as stale. The decay is gentle and linear. No issues.

---

## 2. Q-Score Parameter Calculators P1–P6

These 6 files contain the backbone of the scoring engine: ~100 numeric thresholds that determine a founder's score on each dimension. The values are consequential — changing any one of them shifts scores for every founder in the system.

**The core problem:** almost none of these thresholds have a cited source. A future engineer cannot tell if the numbers come from YC benchmark data, Andreessen Horowitz research, internal observation, or a gut call. This section documents each one and flags the critical gaps.

---

### 2.1 P1 Market Readiness — `p1-market-readiness.ts`

| Value(s) | What it controls | Verdict | Source / Notes |
|---|---|---|---|
| `[0, 3, 10, 25]` | Early-stage conversation count brackets | `⚠️ ACCEPTABLE` | Industry-adjacent. "25 conversations" aligns with YC's "talk to 25 customers" rule. Cite this. |
| `[5, 10, 20, 50]` | Mid-stage conversation brackets | `⚠️ ACCEPTABLE` | Reasonable progression. |
| `[50, 200, 500, 1000]` | Growth-stage customer count brackets | `⚠️ ACCEPTABLE` | Matches SaaS growth benchmarks loosely. Cite source. |
| `[1000, 10000, 50000, 200000]` | MRR thresholds (early/mid/growth) | `🚨 NO LOGIC` | Why $1k, $10k, $50k, $200k? No documented rationale. These are the most influential numbers in P1. |
| `[50, 40, 30, 20]` | D30 retention brackets | `✅ GOOD` | Aligns with Andreessen Horowitz consumer cohort benchmarks (>40% = good, >25% = acceptable). **Document this citation.** |
| `[130, 120, 110, 100, 90]` | NDR (Net Dollar Retention) brackets | `✅ GOOD` | Industry standard: >120% = elite, >110% = good, >100% = acceptable. This is correct. |
| `0.5` | LOI/contract signal bonus | `⚠️ ACCEPTABLE` | Arbitrary but modest. |
| `'3+ months', '1-3 months', '1-4 weeks', '<1 week'` | Sales cycle enum values | `✅ GOOD` | Standard B2B sales cycle buckets. |

---

### 2.2 P2 Market Potential — `p2-market-potential.ts`

| Value(s) | What it controls | Verdict | Notes |
|---|---|---|---|
| `100x` inflation cap | Downrates TAM claims more than 100× implied | `✅ GOOD` | Correct sanity check. Founders routinely abuse TAM math. |
| `10, 80` char lengths | TAM/urgency description quality proxies | `🚨 NO LOGIC` | "At least 10 characters" is not a quality signal. A founder can write "big market" and pass. |
| `[0, 3, 5, 10]` | Competitor count thresholds | `⚠️ ACCEPTABLE` | 0 competitors = no market proven; 10+ = crowded. Loosely reasonable. |

---

### 2.3 P3 IP & Defensibility — `p3-ip-defensibility.ts`

| Value(s) | What it controls | Verdict | Notes |
|---|---|---|---|
| `[0.5, 1, 3, 6, 9, 12, 18]` | Build complexity in months | `⚠️ ACCEPTABLE` | Maps to replication difficulty. Reasonable time brackets. |
| `[$50k, $200k, $500k, $2M, $5M]` | Replication cost thresholds | `🚨 NO LOGIC` | Completely arbitrary. No cited source for why $50k is the floor or $5M is the ceiling. |
| `[3, 6, 12, 24]` | Replication time thresholds (months) | `⚠️ ACCEPTABLE` | Quarter/half-year/year/two-year natural boundaries. |
| `15, 60, 80, 120, 150` | Text length thresholds for quality checks | `🚨 NO LOGIC` | These are proxies for "did the founder write a real answer" but 15 chars is a single sentence fragment. Not meaningful quality signal. |

---

### 2.4 P4 Founder & Team — `p4-founder-team.ts`

| Value(s) | What it controls | Verdict | Notes |
|---|---|---|---|
| `['tech', 'product', 'sales', 'marketing', 'finance', 'ops']` | Key functions list | `✅ GOOD` | Standard startup functional coverage. Correct. |
| `[1, 3, 5, 7, 10]` | Domain experience year thresholds | `⚠️ ACCEPTABLE` | 1yr=novice, 3yr=developing, 5yr=experienced, 7yr=senior, 10yr=expert is industry-standard framing. |
| `[0, 1, 2, 3+]` | Prior exits thresholds | `✅ GOOD` | 0 exits = first-timer; 2+ = serial founder premium. Correct signal. |
| `[3, 6, 12, 24]` | Team cohesion months thresholds | `⚠️ ACCEPTABLE` | Quarter/half-year/year/two-year. Reasonable. |

---

### 2.5 P6 Financials — `p6-financials.ts`

| Value(s) | What it controls | Verdict | Notes |
|---|---|---|---|
| `[$10k, $50k, $100k, $250k, $500k]` | Mid-stage ARR brackets | `🚨 NO LOGIC` | $100k ARR is often cited as a meaningful milestone. But the others ($50k, $250k) have no documented source. |
| `[$500k, $1M, $5M, $10M]` | Growth-stage ARR brackets | `⚠️ ACCEPTABLE` | $1M ARR = SaaS milestone ("first million ARR"). $5M and $10M are less documented. |
| `[0.20, 0.40, 0.60, 0.75, 0.85]` | Gross margin thresholds | `⚠️ ACCEPTABLE` | SaaS industry standard is 70–80% gross margin. The 0.75 and 0.85 thresholds are appropriate. The 0.20 floor is too forgiving for SaaS but appropriate for hardware. No sector-conditional logic here — this is a gap. |
| `[1, 2, 3, 5, 8]` | LTV/CAC ratio brackets | `⚠️ ACCEPTABLE` | 3:1 is the universally cited minimum. Rest are reasonable. **Cite David Skok's SaaS metrics research.** |
| `[3, 6, 12, 18, 24]` | Runway month thresholds | `✅ GOOD` | Industry-standard. <3 months = crisis, 6 months = warning, 18+ months = healthy. |
| `10` | Min customers for unit economics to be calculable | `✅ GOOD` | Correct. LTV/CAC with fewer than 10 customers is statistically meaningless. |

---

## 3. Bluff Detection

**File:** `features/qscore/utils/bluff-detection.ts`

### 3.1 The AI Hallmark Phrases List — `🚨 NO LOGIC`

19 hardcoded strings used to detect AI-generated or exaggerated content:

```
"revolutionary", "game-changing", "unprecedented", "disruptive innovation",
"paradigm shift", "transformative solution", "next-generation", "cutting-edge",
"world-class", "best-in-class", "state-of-the-art", "industry-leading",
"breakthrough technology", "unique solution", "unparalleled", "innovative approach",
"pioneering", "groundbreaking", "visionary"
```

**Verdict:** `🚨 NO LOGIC`

**Reasoning:** This is a static enumeration of buzzwords. It will rot because:
1. LLM-generated text vocabulary shifts with each model update
2. Legitimate founders use some of these words correctly (a medical device genuinely could be "breakthrough")
3. A founder who knows the list can trivially evade it
4. The list is likely already incomplete — Claude 4.x generates different patterns than GPT-3-era models

**What to do:** Replace with an LLM-based quality scorer that evaluates *specificity* rather than vocabulary. The existing `specificity` function in the file is the right direction. The phrase list should be removed.

---

### 3.2 Penalty Values

| Value | Controls | Verdict |
|---|---|---|
| `[0.10, 0.03, 0.01]` | Penalty % for high/medium/low bluff signals | `⚠️ ACCEPTABLE` |
| `0.30` | Maximum total bluff penalty | `⚠️ ACCEPTABLE` |
| `LTV/CAC > 20` | Flags as impossible ratio | `✅ GOOD` |
| `MRR > $1,000` | Requires Stripe verification flag | `✅ GOOD` |
| `[10000, 1000, 1000, 10, 100]` | Thresholds for "suspicious round number" | `⚠️ ACCEPTABLE` |

---

## 4. Rate Limits & Tool Gates

### 4.1 Middleware Rate Limits

**File:** `middleware.ts` lines 7–16

| Route | Limit | Window | Verdict | Reasoning |
|---|---|---|---|---|
| `/api/agents/chat` | 12 req/min | 60s | `⚠️ ACCEPTABLE` | Reasonable but not tied to API cost. |
| `/api/agents/generate` | 5 req/min | 60s | `✅ GOOD` | Correctly more restrictive for expensive generation. |
| `/api/qscore/calculate` | 5 req/min | 60s | `✅ GOOD` | Right. Calculation is expensive. |
| `/api/agents/research` | 10 req/min | 60s | `⚠️ ACCEPTABLE` | Reasonable. |
| `/api/qscore/actions` | 6 req/min | 60s | `⚠️ ACCEPTABLE` | Reasonable. |
| `/api/analyze-pitch` | 8 req/min | 60s | `⚠️ ACCEPTABLE` | Reasonable. |

**Important caveat:** These limits are **per Vercel serverless instance**, not global. With 10 concurrent cold starts, the real limit is 10× the values above. This is documented in middleware comments but worth calling out explicitly.

---

### 4.2 Chat Route Constants

**File:** `app/api/agents/chat/route.ts`

| Value | Controls | Verdict | Reasoning |
|---|---|---|---|
| `AGENT_CHAT_MONTHLY_LIMIT = 50` (line 145) | Monthly free-tier chat cap | `🚨 NO LOGIC` | Why 50? At Sonnet pricing (~$0.02/message avg), 50 messages = ~$1/month per free user. No cost model documented. Is this priced to be a freemium funnel or a hard limit? |
| `userMsgCount >= 2` (line 849) | Minimum messages before tools unlock | `⚠️ ACCEPTABLE` | Lowered from 3 to 2 — the rationale is documented in INSTRUCTIONS.md. One exchange is enough for basic context. |
| `MAX_ITERATIONS = 5` (line 852) | Max tool loop cycles per request | `⚠️ ACCEPTABLE` | Standard agentic loop guard. |
| Last 30 messages (line 836) | History window injected into each request | `❌ BAD` | 30 messages × ~200 tokens avg = 6,000 tokens of history minimum. At Sonnet pricing this is ~$0.09 of context per request. No token budget math documented. Should be expressed as a token budget, not a message count. |
| `15_000` ms tool timeout (line 110) | External API call deadline | `✅ GOOD` | 15 seconds is appropriate for third-party APIs. |

---

### 4.3 Tool Executor

**File:** `lib/tools/executor.ts`

| Value | Controls | Verdict | Reasoning |
|---|---|---|---|
| `RATE_LIMIT_MAX_PER_WINDOW = 20` (line 53) | Max tool calls per minute per process | `❌ BAD` | In-process only. This provides no protection against concurrent instances. |
| `MAX_RETRIES = 2` (line 164) | Retry count on transient failures | `✅ GOOD` | Standard. |
| `ATTEMPT_TIMEOUT_MS = 30_000` (line 165) | Per-attempt deadline | `✅ GOOD` | 30s is reasonable for external calls. |

---

## 5. LLM Configuration

**File:** `lib/llm/router.ts`

| Config | Value | Verdict | Reasoning |
|---|---|---|---|
| Haiku model ID | `'claude-haiku-4-5-20251001'` | `❌ BAD` | Date-suffixed string. When Anthropic releases Claude Haiku 4.6, this string will silently point to an outdated model. Should be `process.env.MODEL_HAIKU \|\| 'claude-haiku-4-5-20251001'`. |
| Sonnet model ID | `'claude-sonnet-4-6'` | `❌ BAD` | Same issue. Should be `process.env.MODEL_SONNET`. |
| Extraction maxTokens | 2000 | `✅ GOOD` | Appropriate for extraction tasks. |
| Generation maxTokens | 3000 | `⚠️ ACCEPTABLE` | May be insufficient for complex multi-section artifacts. |
| Generation temperature | 0.55 | `⚠️ ACCEPTABLE` | Not 0.5, not 0.6. No documented reason for this specific value. |
| Reasoning temperature | 0.2 | `✅ GOOD` | Low temp for structured reasoning is correct. |
| Classification temperature | 0.0 | `✅ GOOD` | Deterministic. Correct for classification. |
| Summarisation maxTokens | 600 | `✅ GOOD` | Appropriate for summaries. |
| QScore actions maxTokens | 1600 | `🚨 NO LOGIC` | `app/api/qscore/actions/route.ts` line 159. Why 1600? Not a round number. No rationale. |
| Priority route maxTokens | 600 | `🚨 NO LOGIC` | `app/api/qscore/priority/route.ts` line 219. Same issue. |

---

## 6. Agent Configuration (`edgealpha.config.ts`)

### 6.1 Q-Score Boost Values

Each agent's artifact generation awards a Q-Score boost to specific dimensions.

| Agent | Boost | Dimension | Verdict | Reasoning |
|---|---|---|---|---|
| Patel | 9 (gtm_playbook 6 + outreach_sequence 3) | P1 | `⚠️ ACCEPTABLE` | Patel = GTM → P1. Largest boost reflects GTM being the most critical early dimension. Ordering is logical. Exact numbers are arbitrary. |
| Nova | 8 (pmf_survey 5 + interview_notes 3) | P1 | `⚠️ ACCEPTABLE` | Product-market fit research. Reasonable. |
| Atlas | 9 (competitive_matrix 5 + battle_card 4) | P2 | `⚠️ ACCEPTABLE` | Market intelligence → P2. Reasonable. |
| Felix | 6 (financial_summary) | P6 | `✅ GOOD` | Financials agent → P6. Correct mapping. |
| Harper | 5 (hiring_plan) | P4 | `✅ GOOD` | People agent → P4. Correct. |
| Leo | 3 (legal_checklist) | P3 | `⚠️ ACCEPTABLE` | Legal → IP/defensibility. Small boost is appropriate (legal compliance ≠ strong IP). |
| Susi | 4 (sales_script) | P1 | `⚠️ ACCEPTABLE` | Sales → GTM. Reasonable. |
| Maya | 3 (brand_messaging) | P2 | `⚠️ ACCEPTABLE` | Brand → market positioning. Reasonable. |
| Sage | 4 (strategic_plan) | P2 | `⚠️ ACCEPTABLE` | Strategy → market potential. Reasonable. |
| Carter | 6 (customer_health 3 + churn 3) | P1 | `⚠️ ACCEPTABLE` | CS signals → GTM execution. Reasonable. |
| Riley | 8 (growth_model 3 + growth_report 2 + paid_campaign 3) | P1+P2 | `⚠️ ACCEPTABLE` | Growth → GTM + market. Reasonable split. |

**Overall:** The boost values make intuitive sense as a system but none have documented mathematical rationale. The sum of all possible boosts from all agents across all dimensions has never been calculated — unknown ceiling effect.

---

### 6.2 Memory Window Sizes — `❌ BAD`

Each agent has three memory window sizes: own artifacts, cross-agent artifacts, activity events.

| Agent | Own | Cross | Events | Verdict |
|---|---|---|---|---|
| Patel | 3 | 5 | 10 | `🚨 NO LOGIC` |
| Susi | 2 | 4 | 10 | `🚨 NO LOGIC` |
| Maya | 2 | 3 | 8 | `🚨 NO LOGIC` |
| Felix | 2 | 4 | 8 | `🚨 NO LOGIC` |
| Leo | 2 | 2 | 5 | `🚨 NO LOGIC` |
| Harper | 2 | 3 | 8 | `🚨 NO LOGIC` |
| Nova | 3 | 4 | 10 | `🚨 NO LOGIC` |
| Atlas | 3 | 4 | 10 | `🚨 NO LOGIC` |
| Sage | 2 | 10 | 15 | `🚨 NO LOGIC` |
| Carter | 3 | 4 | 10 | `🚨 NO LOGIC` |
| Riley | 3 | 4 | 10 | `🚨 NO LOGIC` |

**Reasoning:** These are the most consequential arbitrary numbers in the config because they directly determine what each agent knows about the founder. Why does Sage get 10 cross-agent memories while Leo gets 2? Why does Sage get 15 activity events while Leo gets 5? No documented rationale exists. If an agent has too few cross-agent memories, it will produce inconsistent output. If too many, it wastes tokens. This needs a documented framework.

**Recommendation:** Calculate how many tokens each memory entry costs. Set memory windows based on a token budget per agent, not arbitrary counts.

---

### 6.3 Cache TTLs

**File:** `lib/edgealpha.config.ts` lines 274–281

| Tool | TTL | Verdict | Reasoning |
|---|---|---|---|
| `lead_enrich` | 86400s (24h) | `✅ GOOD` | Email addresses don't change hourly. 24h is correct. |
| `web_research` | 3600s (1h) | `✅ GOOD` | Web content updates frequently enough to warrant hourly refresh. |
| `apollo_search` | 3600s (1h) | `✅ GOOD` | Lead data is relatively stable. Hourly cache appropriate. |
| `posthog_query` | 300s (5m) | `✅ GOOD` | Analytics data can change quickly. 5 minutes is correct. |

---

### 6.4 Tool Costs

**File:** `lib/edgealpha.config.ts`

| Tool | Cost | Verdict | Question |
|---|---|---|---|
| `lead_enrich` | $0.001 | `🚨 NO LOGIC` | Is this the actual Hunter.io cost per lookup? Hunter.io charges ~$0.005/request at scale. If fictional, document why. |
| `apollo_search` | $0.002 | `🚨 NO LOGIC` | Apollo.io is subscription-based, not per-call. This number may not reflect real costs. |
| `web_research` | $0.005 | `🚨 NO LOGIC` | Tavily charges ~$0.001/search. This is 5× real cost. Why? |
| `vapi_call` | $0.05 | `⚠️ ACCEPTABLE` | VAPI charges ~$0.05/min for voice. If calls average ~1 min, this is accurate. |
| Artifact tools | $0.02–$0.03 | `🚨 NO LOGIC` | These are LLM generation costs. At Sonnet pricing (~$15/$25 per M tokens), a 3000-token generation costs ~$0.08. The hardcoded $0.02 underestimates real cost. |

---

## 7. Business Logic Thresholds

### 7.1 Investor Deal Flow Gates

**File:** `app/api/investor/deal-flow/route.ts`

| Value | Controls | Verdict | Reasoning |
|---|---|---|---|
| Q-Score `>= 50` | Whether a founder appears in investor deal flow at all | `🚨 NO LOGIC` | **This is the most consequential hardcoded value in the product.** A founder below 50 is invisible to investors. Why 50? The midpoint of 100 has no special significance in this scoring model. No documented rationale. This decision affects a founder's entire access to capital. |
| Q-Score `>= 80` | "Hot deal" tier | `⚠️ ACCEPTABLE` | Top quintile. Reasonable. |
| Q-Score `>= 70` | "High-Q" insight threshold | `⚠️ ACCEPTABLE` | Above median. Reasonable. |
| Q-Score `>= 55` + momentum `>= 4` | Stripe-verified hot deal | `⚠️ ACCEPTABLE` | Layered signal. Reasonable. |
| `<= 14` days since signup | "New founder" recency window | `⚠️ ACCEPTABLE` | Two-week window is standard for recency signal. |
| Activity `>= 3` weekly actions | "Active founder" signal | `🚨 NO LOGIC` | Why 3? Not tied to any engagement model. |

---

### 7.2 Profile Builder & Access Gates

**File:** `app/api/profile-builder/submit/route.ts`

| Value | Controls | Verdict | Reasoning |
|---|---|---|---|
| Section completion `>= 30%` | Minimum threshold to count a section as "done" | `🚨 NO LOGIC` | What does 30% mean empirically? A founder could write three sentences and pass. This threshold has no user research backing. |
| Minimum 1 section | Required to submit | `✅ GOOD` | Prevents empty submissions. Correct. |
| 24-hour recalculation rate limit | How often a founder can recalculate their Q-Score | `✅ GOOD` | Prevents gaming. Industry-standard cooldown. |
| Score `>= 70` | Investor Marketplace unlock gate | `🚨 NO LOGIC` | This is a paywall-equivalent. Founders below 70 cannot access investors. No documented rationale for 70 vs 65 or 75. |

---

### 7.3 Deal Flow Alerts

**File:** `lib/agents/deal-flow-alerts.ts`

| Value | Controls | Verdict | Reasoning |
|---|---|---|---|
| `>= 5 points` improvement | Minimum score delta to trigger investor notification | `🚨 NO LOGIC` | 5 points on a score with temporal decay is not a fixed quantity — a score can move 5 points purely from time decay without any founder action. The threshold should be a normalised delta, not an absolute point count. |
| `newScore >= 50` | Minimum score for alerts to fire | `🚨 NO LOGIC` | Same as deal flow gate. No documented rationale. |

---

### 7.4 Weekly Automation

**File:** `app/api/cron/weekly-automation/route.ts`

| Value | Controls | Verdict | Reasoning |
|---|---|---|---|
| `STALE_DEAL_DAYS = 7` | Days of inactivity before stale alert | `✅ GOOD` | Standard CRM staleness window. |
| `CHURN_ALERT_THRESHOLD = 8%` | Monthly churn rate that triggers alert | `✅ GOOD` | Matches B2B SaaS benchmarks. >5% = concerning, >8% = critical. |
| `RETENTION_ALERT_THRESHOLD = 30%` | D30 retention that triggers alert | `✅ GOOD` | <30% D30 retention is below acceptable for most consumer products. |
| Runway `< 6 months` | Warning alert | `✅ GOOD` | Industry standard. |
| Runway `< 3 months` | Critical alert | `✅ GOOD` | Industry standard. |
| Batch size `500` | Founders processed per cron job run | `⚠️ ACCEPTABLE` | Reasonable. Consider pagination if user base grows. |

---

## 8. Subscription Tiers & Brand Values

### 8.1 Subscription Tier Strings — `❌ BAD`

The strings `'free'` and `'pro'` appear as raw string literals in **6+ files**:

| File | Usage |
|---|---|
| `app/api/auth/signup/route.ts:111` | Default tier: `'free'` |
| `app/api/investor/ai-analysis/route.ts:26` | Gate: reject if tier `=== 'free'` |
| `app/api/investor/deal-flow/route.ts:24` | Gate: reject if tier `=== 'free'` |
| `app/api/investor/billing/checkout/route.ts:21` | Check: already `=== 'pro'` |
| `app/api/webhooks/stripe/route.ts:32` | Set: tier `= 'pro'` on payment |
| `app/api/webhooks/stripe/route.ts:59` | Reset: tier `= 'free'` on cancellation |

**Problem:** If a third tier is added (e.g. `'enterprise'`, `'team'`, `'trial'`), every conditional must be found and updated manually. A typo (`'Pro'` vs `'pro'`) silently breaks gating.

**Fix:** Create `lib/constants/subscription.ts`:
```typescript
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
} as const
export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS]
```

---

### 8.2 Email Address Inconsistency — `🚨 NO LOGIC` + `❌ BAD`

Email addresses are hardcoded in **15+ files** across two different domains:

| Address | Domain | Occurrences |
|---|---|---|
| `no-reply@edgealpha.ai` | `.ai` | 13 |
| `noreply@edgealpha.co` | `.co` | 6 |
| `support@edgealpha.ai` | `.ai` | 1 |
| `proposals@edgealpha.ai` | `.ai` | 1 |
| `outreach@edgealpha.ai` | `.ai` | 1 |

**Critical issue:** `@edgealpha.ai` and `@edgealpha.co` are **two different domains**. Some outbound emails come from `.ai`, some from `.co`. This is a live inconsistency — replies to `.co` emails go to a different inbox than replies to `.ai` emails.

**Fix:** Replace all with env vars:
```
EMAIL_NO_REPLY=no-reply@edgealpha.ai
EMAIL_SUPPORT=support@edgealpha.ai
EMAIL_PROPOSALS=proposals@edgealpha.ai
EMAIL_OUTREACH=outreach@edgealpha.ai
```

---

### 8.3 URL Inconsistency — `❌ BAD`

Three different domains used for the same product across the codebase:

| URL | File | Usage |
|---|---|---|
| `https://edgealpha.ai` | `app/layout.tsx:26` | Default `NEXT_PUBLIC_APP_URL` |
| `https://app.edgealpha.co` | `app/api/agents/nova/distribute/route.ts:64` | Survey distribution base URL |
| `https://edgealpha.vc` | `app/founder/profile-builder/page.tsx:2633` | Investor URL reference |

**Fix:** All derived URLs should come from `process.env.NEXT_PUBLIC_APP_URL`. No URL should be hardcoded.

---

## 9. Feature Flags

**File:** `lib/feature-flags.ts`

All flags use `process.env.NEXT_PUBLIC_FF_<NAME> !== 'false'` — default ON, opt-out via env var.

| Flag | Default | Verdict | Notes |
|---|---|---|---|
| `FF_STREAMING_CHAT` | `true` | `✅ GOOD` | Safe default. |
| `FF_MODEL_ROUTING` | `true` | `✅ GOOD` | Safe default. |
| `FF_CROSS_AGENT_ORCHESTRATION` | `true` | `✅ GOOD` | Safe default. |
| `FF_ARTIFACT_SELF_CRITIQUE` | `true` | `✅ GOOD` | Safe default. Adds cost but improves quality. |
| `FF_AI_SCORE_INTELLIGENCE` | `true` | `✅ GOOD` | Safe default. |
| `FF_AI_INVESTOR_MATCHING` | `true` | `✅ GOOD` | Safe default. |
| `FF_ASYNC_ARTIFACT_GENERATION` | `true` | `✅ GOOD` | Safe default. |
| `FF_AGENT_CONTEXT_COMPRESSION` | `true` | `✅ GOOD` | Safe default. |
| `FF_COORDINATOR_WORKFLOW` | `false` | `✅ GOOD` | The ONLY flag off by default. This is the correct use of feature flags: experimental features default off. Do not change. |

**Overall assessment:** The feature flag system is the best-designed part of the configuration layer. The pattern is consistent, env-var-driven, and has the right default (dangerous/experimental = off, everything else = on).

---

## 10. Things Built Without Logic — Top 12

These are the 12 hardcoded values with the highest product impact that have **zero documented rationale**. Changing any of these without understanding the original intent could silently break the product.

| # | Value | File | Impact | Why It Has No Logic |
|---|---|---|---|---|
| 1 | `Q-Score >= 50` investor visibility gate | `deal-flow/route.ts` | **CRITICAL** — determines if a founder is seen by investors at all | Midpoint of 100 has no special meaning in this model. No distribution analysis done. |
| 2 | `Q-Score >= 70` marketplace unlock | `profile-builder/submit/route.ts` | **HIGH** — paywall-equivalent access gate | 70 = "B+" in the grade system. No user research on conversion rate at different thresholds. |
| 3 | `AGENT_CHAT_MONTHLY_LIMIT = 50` | `agents/chat/route.ts` | **HIGH** — determines free tier value | No cost model. 50 messages might be too few to get a deliverable or too many to be profitable. |
| 4 | Memory windows per agent (2–15) | `edgealpha.config.ts` | **HIGH** — determines what each agent knows | No token budget math. Agents with small cross-memory windows produce inconsistent output. |
| 5 | Agent Q-Score boost values (3–9) | `edgealpha.config.ts` | **MEDIUM** — shapes score inflation pattern | No documented framework for why Patel = 9 and not 8. If all agents are used, total boost could be calculated. |
| 6 | P1 MRR thresholds `[$1k, $10k, $50k, $200k]` | `p1-market-readiness.ts` | **HIGH** — drives GTM score for every founder | Pure opinion. YC, a16z, Bessemer all publish benchmark data that could validate these numbers. |
| 7 | Tool cost values `[$0.001–$0.05]` | `edgealpha.config.ts` | **MEDIUM** — internal accounting | Real API costs don't match these values. Either they're fictional for budgeting or outdated. |
| 8 | 19 AI hallmark phrases in bluff detection | `bluff-detection.ts` | **MEDIUM** — penalises founders who use AI buzzwords | Static list will become outdated. A founder can trivially evade it by reading this file. |
| 9 | Conversation history: last 30 messages | `agents/chat/route.ts` | **MEDIUM** — API cost driver | Not expressed as a token budget. At scale this is the largest variable cost per request. |
| 10 | Deal alert threshold: `>= 5 point improvement` | `deal-flow-alerts.ts` | **MEDIUM** — determines investor notification frequency | 5 points can be achieved by time decay reversal without real improvement. |
| 11 | `generation temperature = 0.55` | `lib/llm/router.ts` | **LOW** — output creativity level | Not 0.5, not 0.6. No A/B test, no rationale. |
| 12 | Section completion gate: `>= 30%` | `profile-builder/submit/route.ts` | **LOW** — controls profile quality threshold | Three sentences passes 30%. Does not reflect meaningful founder effort. |

---

## 11. Priority Action Table

Ranked by **impact × effort** ratio. Fix the high-impact low-effort items first.

| Priority | Action | Effort | Impact | What to do |
|---|---|---|---|---|
| 🔴 P0 | Fix email domain inconsistency (`.ai` vs `.co`) | Low | Critical | Unify to `.ai`, move to env vars. Live bug — replies going to wrong inbox. |
| 🔴 P0 | Extract subscription tier strings to a constant | Low | High | `lib/constants/subscription.ts` with `SUBSCRIPTION_TIERS` object. |
| 🔴 P0 | Move model strings to env vars | Low | High | `process.env.MODEL_HAIKU` and `process.env.MODEL_SONNET` with current values as fallbacks. |
| 🟠 P1 | Document investor visibility gate rationale (`>= 50`) | None (doc only) | Critical | Write a decision record: why 50? What data supports this? If none, run a cohort analysis once you have 50+ founders. |
| 🟠 P1 | Document marketplace unlock rationale (`>= 70`) | None (doc only) | High | Same as above. This is an access gate that blocks founder-investor connections. |
| 🟠 P1 | Add `SOURCE:` comments to all P1–P6 scoring brackets | Low | High | For each bracket, add a one-line comment: `// SOURCE: YC benchmark data / industry standard / estimated` |
| 🟠 P1 | Express conversation history as token budget not message count | Medium | Medium | Calculate max tokens per history window, replace `30` with a `MAX_HISTORY_TOKENS` constant. |
| 🟡 P2 | Replace AI phrase list with LLM-based specificity scorer | High | Medium | The list will rot. The specificity function is the right approach. |
| 🟡 P2 | Document sector weight rationale | Low | Medium | One-paragraph comment above each sector array. |
| 🟡 P2 | Calculate and document total maximum Q-Score boost from all agents | Low | Low | Prevents gaming via agent-farming. |
| 🟢 P3 | Align tool cost values with real API costs | Low | Low | Either update to real costs or rename to `toolBudget` to make clear they're accounting constructs. |
| 🟢 P3 | Validate grade thresholds against actual score distribution | Requires data | Medium | Once 100+ founders exist, plot the distribution and check if A+ is genuinely rare. |
| 🟢 P3 | Add rationale to memory window sizes | Low | Medium | Document the token cost per memory entry and the intended budget per agent. |

---

*This document was generated by static analysis on 2026-05-08. Re-run the audit after significant scoring logic changes. All file:line references are as of this date.*
