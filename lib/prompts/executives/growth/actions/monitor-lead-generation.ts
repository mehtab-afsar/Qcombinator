/**
 * `monitor_lead_generation` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: reviews performance against AS012's KPIs,
 * publishes nothing. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the
 * workbook's Action Registry sheet is empty; only the name and one-line
 * purpose came from the Program Registry. Written to the same pattern as
 * P002's review_brand_positioning — a periodic check of standing performance
 * against evidence, not a rewrite of the underlying strategy.
 *
 * If the founder has clicked "Pull from PostHog" on this Action, a real trends query result
 * reaches Company Context as "Real Data You Pulled In" (`founder_pulled_data`,
 * `lib/rhythm/run.ts`'s `pulledDataContextFor`) — see the prompt's own note on weighting it.
 */
export const MONITOR_LEAD_GENERATION_PROMPT = `# Action Instructions

## Action ID

**monitor_lead_generation**

## Action Name

**Monitor Lead Generation**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P003 — Demand Generation**

---

# Real data, if the founder pulled it

If Company Context includes a section called **"Real Data You Pulled In,"** that is a real PostHog
query the founder ran on purpose before this cycle — weight it above any performance figures stated
elsewhere in this context, and say plainly what it does and doesn't cover. If that section is
absent, work from Company Context and AS012 alone, same as always.

---

# Purpose

Hold current lead generation performance — volume, source mix, conversion rate, as reflected in
Company Context — against the Campaign Strategy's (AS012) Success Metrics and Campaign Funnel, and
report where the demand engine is under- or over-performing.

A demand engine does not fail by having the wrong strategy on paper. It fails quietly, when actual
lead volume or quality drifts from what the strategy assumed and nobody names it until pipeline is
already short. This review is where that gap gets named before it costs a quarter.

---

# What to produce

## 1. Verdict

One line: is lead generation currently on track against AS012's Success Metrics, or is it falling
short — and by how much, where that is knowable from Company Context.

## 2. Where performance is on track

The sources, campaigns or channels currently meeting or exceeding their KPI. Name them
specifically — a review that only lists problems is not credible, and confirming what already
works protects it from being changed for no reason.

## 3. Where performance is falling short

| Source / channel | Expected (AS012 KPI) | Actual | Gap |

Cover volume, source mix and conversion rate separately — a channel can deliver volume and still
convert poorly, or vice versa.

## 4. The single highest-leverage fix

Exactly one recommendation, ranked above all others this cycle. Not a list — if everything is a
priority, nothing is.

---

# Output

Readable markdown, roughly 300–500 words, table for §3. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and AS012's current version. Never invent lead
counts, conversion rates or source data. Use **[TO VALIDATE: …]** where real performance data is
needed and not yet available.

**Stay in scope:** this reviews performance against the existing Campaign Strategy. It does not
redesign the Campaign Strategy itself — that is what re-running AS012 is for.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of AS012's targets.
* What already works is named, not just what is falling short.
* Every gap traces to a specific KPI in AS012, never to a vague impression.
* The one recommended fix is concrete enough to act on this week.`
