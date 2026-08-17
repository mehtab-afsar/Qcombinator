/**
 * `update_market_report` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ UPDATES THE INTERNAL REPORT, DOES NOT PUBLISH ANYTHING. No publishing or distribution
 * Connector is involved — the Market Intelligence Report stays inside the product for the Founder
 * and Executive Team. This prompt must never claim the report has been sent or published anywhere.
 *
 * Internal and reversible: updates a document, publishes nothing. Runs autonomously (ADR-004).
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const UPDATE_MARKET_REPORT_PROMPT = `# Action Instructions

## Action ID

**update_market_report**

## Action Name

**Update Market Report**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P008 — Market Intelligence**

---

# Purpose

Fold what monitor_competitors, conduct_customer_interviews and track_industry_trends have
surfaced this cycle into an updated Market Intelligence Report (AS018), so the report stays a
current, trustworthy picture of the competitive and market environment rather than a snapshot that
quietly goes stale between reviews.

---

# What to produce

## 1. What changed this cycle

One paragraph naming what is genuinely new since the last AS018 version — competitor moves,
customer insight, market trends. Skip anything already reflected in the current version; do not
restate it as if it were new.

## 2. Section-by-section update

For each AS018 section that needs a change (Competitor Landscape, Customer Insights, Market
Trends, Five Forces / SWOT, Executive Recommendations — only the sections that actually need one):

* the current content, if known from the existing AS018 version
* the proposed replacement or addition
* the evidence it is drawn from (monitor_competitors, conduct_customer_interviews,
  track_industry_trends, or Company Context directly)

Do not rewrite sections that have not materially changed.

## 3. Updated Executive Recommendations

Where the changes above shift the priority or content of AS018's Executive Recommendations, state
the updated three-to-five recommendations, each with Business Rationale, Expected Commercial
Impact and Suggested Priority — per AS018's own Required Sections.

---

# Output

Readable markdown, one entry per section from §2, plus §1 and §3. Length follows how much
genuinely changed — do not pad a quiet cycle into a long report.

**Evidence rule:** every update traces to this cycle's monitor_competitors, conduct_customer_interviews
or track_industry_trends output, or to Company Context directly. Never invent a competitor fact,
customer statistic or market figure to fill a section. Use **[TO VALIDATE: …]** where confirmation
is still needed.

**Stay in scope:** this updates the existing Market Intelligence Report with what changed. It does
not re-run the underlying competitor, customer or trend analysis itself — that is what
monitor_competitors, conduct_customer_interviews and track_industry_trends are for.

---

# Success Criteria

* Every update traces to a specific piece of evidence from this cycle.
* Sections that have not materially changed are left alone, not padded.
* The updated Executive Recommendations reflect what actually changed, not a generic restatement.
* Nothing in the output implies the report has been published or sent anywhere.`
