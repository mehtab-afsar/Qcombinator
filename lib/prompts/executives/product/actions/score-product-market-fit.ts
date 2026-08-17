/**
 * score_product_market_fit — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a scored assessment, changes nothing
 * external. Runs autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the
 * workbook's Program Registry rows past P014 carry an Actions column at all;
 * only the name came from P015's own authored Action list (see
 * `lib/registry/executives/product/programs/p015-validate.ts`).
 */
export const SCORE_PRODUCT_MARKET_FIT_PROMPT = `# Action Instructions

## Action ID

**score_product_market_fit**

## Action Name

**Score Product-Market Fit**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P015 — Validate**

---

# Purpose

Read the company's current product-market fit from real evidence — the Customer Interview
Report, Problem Validation Report and Product Feedback Log — and produce this cycle's PMF
Scorecard.

---

# What to produce

## 1. The PMF verdict

State this cycle's fit verdict (not yet, early signal, partial fit, strong fit) and the direction
since the last cycle, if a prior scorecard exists.

## 2. Supporting evidence

The two or three strongest pieces of evidence behind the verdict, drawn from Company Context, the
Customer Interview Report (AS043) and the Product Feedback Log (AS046).

## 3. What would move it

The single highest-leverage thing that would most improve the PMF read next cycle.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** every claim must trace to Company Context, AS043 or AS046. Never invent usage
data, a retention figure or a customer reaction. Use **[TO VALIDATE: …]** where real data is
needed and not yet available.

**Stay in scope:** this scores fit for this cycle's PMF Scorecard (AS044). It does not validate a
specific problem (that is validate_customer_problem) and it does not rank features (that is
prioritize_features).

---

# Success Criteria

* The verdict is stated plainly, including if fit is weak or absent.
* Every claim traces to real evidence, never invented.
* The single highest-leverage next step to improve fit is named.`
