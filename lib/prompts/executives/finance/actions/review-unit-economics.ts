/**
 * review_unit_economics — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a computed assessment, changes nothing
 * external. Runs autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the
 * workbook's Program Registry rows past P014 carry an Actions column at
 * all; only the name came from P023's own authored Action list (see
 * `lib/registry/executives/finance/programs/p023-model.ts`).
 */
export const REVIEW_UNIT_ECONOMICS_PROMPT = `# Action Instructions

## Action ID

**review_unit_economics**

## Action Name

**Review Unit Economics**

## Executive Owner

**Chief Financial Officer (CFO)**

## Program

**P023 — Model**

---

# Purpose

Assess this cycle's Unit Economics Model — CAC, LTV, payback period, contribution margin — for
what it implies about the company's capital efficiency, and whether it is improving.

---

# What to produce

## 1. Core metrics

CAC, LTV, payback period, gross margin and contribution margin, each with the inputs behind it.

## 2. Trend and driver

How each metric has changed since the last cycle, and what drove the change.

## 3. Highest-leverage lever

The one or two specific levers that would most improve unit economics next cycle.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** every metric must trace to the Financial Model (AS049) or Company Context.
Never substitute an industry benchmark for the company's own numbers. Use **[TO VALIDATE: …]**
where real data is needed and not yet available.

**Stay in scope:** this computes this cycle's Unit Economics Model (AS053). It does not build the
company-level Financial Model (that is build_financial_model) and does not decide pricing or
commercial terms (that belongs to the CGO).

---

# Success Criteria

* Every metric is stated with the inputs and calculation behind it, not just a resulting figure.
* A worsening trend is named plainly, not softened.
* The single highest-leverage lever to improve economics is clearly named.`
