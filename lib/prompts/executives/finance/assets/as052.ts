/**
 * AS052 — Asset Instructions for "Scenario Analysis".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS052 is a newly minted Asset id (see
 * `lib/registry/executives/finance/programs/p023-model.ts`) — the workbook
 * names "Scenario Analysis" as one of P023's Primary Assets, but assigns it
 * no id and no Asset Instructions at all. This file was written in this
 * repo, following the exact section shape every other Asset Instructions
 * file uses, grounded in nothing invented beyond the Asset's own name and
 * P023's Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS052_SCENARIO_ANALYSIS_PROMPT = `# AS052 — Scenario Analysis

## Purpose

You are responsible for creating the company's **Scenario Analysis**.

The Scenario Analysis stress-tests the Financial Model (AS049) against best-case, base-case and
downside assumptions, so the founder knows what breaks first under pressure — not just what the
model shows if everything goes to plan.

The objective is **not** to produce an optimistic range that flatters the base case.

The objective is to show, honestly, how the company's financial position changes if key
assumptions move against it.

This analysis becomes the company's stress-tested read on financial resilience, cycle over
cycle.

---

# Business Outcome

A successful Scenario Analysis should:

* build best-case, base-case and downside scenarios from the Financial Model (AS049), not from
  scratch
* name the specific assumptions that differ between scenarios, and by how much
* show what breaks first under the downside scenario — cash, margin, or a specific commitment
* give the founder a decision-ready view of resilience, not just three sets of numbers
* replace a single-point forecast with a real range of outcomes

Every section should contribute to one question: how resilient is this company if things do not
go to plan.

---

# Required Inputs

Before creating the Scenario Analysis, review all available company information.

This may include:

* the current Financial Model (AS049)
* the current Cash Flow Forecast (AS051), if already produced this cycle
* known risks or dependencies in Company Context
* prior Scenario Analyses, if any exist, for continuity

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any assumption that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. Under the downside scenario, what breaks first, and how much runway or
margin does the company retain?

---

# Scenario Assumptions

The specific assumptions that differ across best-case, base-case and downside scenarios (for
example: growth rate, churn, pricing, hiring pace), stated explicitly for each.

---

# Scenario Outcomes

Cash position, runway and margin under each of the three scenarios, tied directly to the
Financial Model (AS049) and Cash Flow Forecast (AS051).

---

# What Breaks First

Under the downside scenario, the specific point of failure — cash runs out, a covenant is
breached, a commitment cannot be met — and how much lead time the company would have to react.

---

# Output

Readable markdown, roughly 400–700 words. Favour a compact, scenario-by-scenario structure over
long prose.

**Evidence rule:** only assumptions and figures grounded in the Financial Model (AS049) and
Company Context. Never invent a scenario assumption without stating it as an assumption. Use
**[TO VALIDATE: …]** where a figure is needed and not yet available.

**Stay in scope:** this stress-tests the model. It does not itself build the model (that is
AS049) or forecast the base-case cash position in detail (that is AS051) — it varies AS049's
assumptions and reports what changes.

---

# Quality Standards

The Scenario Analysis should be:

* built directly on the Financial Model
* honest about the downside scenario, not softened
* internally consistent with AS049 and AS051
* concise
* specific about what breaks first and when

Avoid:

* a downside scenario that is not actually pessimistic
* an assumption left implicit rather than stated for each scenario
* restating the base case three times with cosmetic differences
* omitting the specific point of failure under the downside case

---

# Completion Check

Before completing the Scenario Analysis ask:

* Are the assumptions that differ across scenarios stated explicitly?
* Is the downside scenario genuinely pessimistic, not softened?
* Is the specific point of failure under the downside case named plainly?
* Does every figure trace to the Financial Model (AS049) or Company Context?
* Would the founder know, after reading this, how much lead time they would have to react?

If the answer to any question is **No**, improve the Scenario Analysis before completion.`
