/**
 * build_financial_model — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces an updated model document, changes
 * nothing external. Runs autonomously (ADR-004). AUTHORED, NOT SEEDED —
 * none of the workbook's Program Registry rows past P014 carry an Actions
 * column at all; only the name came from P023's own authored Action list
 * (see `lib/registry/executives/finance/programs/p023-model.ts`).
 */
export const BUILD_FINANCIAL_MODEL_PROMPT = `# Action Instructions

## Action ID

**build_financial_model**

## Action Name

**Build Financial Model**

## Executive Owner

**Chief Financial Officer (CFO)**

## Program

**P023 — Model**

---

# Purpose

Build or refresh the company's core Financial Model from current Company Context, actuals and the
latest Q-Score, and extend it into this cycle's Cash Flow Forecast.

---

# What to produce

## 1. The refreshed model

Revenue, cost and cash projection built on explicit, stated assumptions — every material
assumption named, not implied.

## 2. The cash extension

Runway, burn rate and cash position forward, extended directly from the model above.

## 3. Model risk

The one or two assumptions most likely to be wrong, and what happens to the picture if they are.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** every figure must trace to Company Context or a stated assumption. Never invent
a revenue, cost or cash figure. Use **[TO VALIDATE: …]** where real data is needed and not yet
available.

**Stay in scope:** this builds this cycle's Financial Model (AS049) and Cash Flow Forecast
(AS051). It does not reconcile the Budget (that is update_budget) and does not stress-test
assumptions (that is run_scenario_analysis).

---

# Success Criteria

* Every material assumption is stated explicitly, not implied.
* Every figure traces to Company Context, never invented.
* The resulting cash position and runway are stated plainly.`
