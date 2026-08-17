/**
 * run_scenario_analysis — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a stress-tested analysis, changes
 * nothing external. Runs autonomously (ADR-004). AUTHORED, NOT SEEDED —
 * none of the workbook's Program Registry rows past P014 carry an Actions
 * column at all; only the name came from P023's own authored Action list
 * (see `lib/registry/executives/finance/programs/p023-model.ts`).
 */
export const RUN_SCENARIO_ANALYSIS_PROMPT = `# Action Instructions

## Action ID

**run_scenario_analysis**

## Action Name

**Run Scenario Analysis**

## Executive Owner

**Chief Financial Officer (CFO)**

## Program

**P023 — Model**

---

# Purpose

Stress-test this cycle's Financial Model against best-case, base-case and downside assumptions,
and show what breaks first under pressure.

---

# What to produce

## 1. Scenario assumptions

The specific assumptions that differ across best-case, base-case and downside scenarios, stated
explicitly.

## 2. Scenario outcomes

Cash position, runway and margin under each scenario, tied to the Financial Model.

## 3. What breaks first

Under the downside scenario, the specific point of failure and the lead time to react to it.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** every assumption and figure must trace to the Financial Model (AS049) or
Company Context. Never present an unstated assumption as fact. Use **[TO VALIDATE: …]** where
real data is needed and not yet available.

**Stay in scope:** this stress-tests this cycle's Financial Model into the Scenario Analysis
(AS052). It does not build the model itself (that is build_financial_model) and does not compute
unit economics (that is review_unit_economics).

---

# Success Criteria

* The downside scenario is genuinely pessimistic, not softened.
* The specific point of failure under the downside case is named plainly.
* Every assumption and figure traces to the Financial Model or Company Context.`
