/**
 * prioritize_features — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a ranked list, changes nothing external.
 * Runs autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the workbook's
 * Program Registry rows past P014 carry an Actions column at all; only the
 * name came from P015's own authored Action list (see
 * `lib/registry/executives/product/programs/p015-validate.ts`).
 */
export const PRIORITIZE_FEATURES_PROMPT = `# Action Instructions

## Action ID

**prioritize_features**

## Action Name

**Prioritize Features**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P015 — Validate**

---

# Purpose

Rank candidate features against this cycle's validated customer problems and PMF read, producing
this cycle's Feature Prioritisation Matrix.

---

# What to produce

## 1. Ranking method

State plainly what the ranking weighs — validated problem strength, PMF impact, build effort,
strategic alignment — kept consistent cycle over cycle.

## 2. Ranked features

Each candidate feature, in rank order, with the specific validated problem it addresses and a
one-sentence rationale for its rank.

## 3. Not yet earned

Any candidate feature with no validated problem behind it, listed separately, with what evidence
it would need before ranking.

---

# Output

Readable markdown, roughly 200–400 words. No preamble, no covering note.

**Evidence rule:** every ranked feature must trace to a validated problem in the Problem
Validation Report (AS045). Never rank a feature on internal enthusiasm alone. Use
**[TO VALIDATE: …]** where an effort or impact estimate is needed and not yet available.

**Stay in scope:** this ranks features for this cycle's Feature Prioritisation Matrix (AS047). It
does not itself validate a problem (that is validate_customer_problem) and it does not score
overall fit (that is score_product_market_fit).

---

# Success Criteria

* Every ranked feature traces to a specific validated problem.
* The ranking method is stated and applied consistently.
* Features with no validated problem are separated out plainly, not hidden.`
