/**
 * validate_customer_problem — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces an analysis, changes nothing external.
 * Runs autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the workbook's
 * Program Registry rows past P014 carry an Actions column at all; only the
 * name came from P015's own authored Action list (see
 * `lib/registry/executives/product/programs/p015-validate.ts`).
 */
export const VALIDATE_CUSTOMER_PROBLEM_PROMPT = `# Action Instructions

## Action ID

**validate_customer_problem**

## Action Name

**Validate Customer Problem**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P015 — Validate**

---

# Purpose

Test a specific candidate customer problem against real evidence and reach a verdict — validated,
partially validated or not validated — feeding this cycle's Problem Validation Report.

---

# What to produce

## 1. The problem statement

The candidate problem, in plain language, drawn from the Customer Interview Report (AS043) or
Company Context.

## 2. The evidence

What supports the problem being real and recurring; what is missing or contradicts it.

## 3. The verdict

Validated, partially validated or not validated, with the reasoning stated in one or two
sentences.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** the verdict must trace to specific evidence in the Customer Interview Report
(AS043) or Company Context. Never validate a problem on assumption alone, and never invent
supporting evidence. Use **[TO VALIDATE: …]** where a claim needs confirmation.

**Stay in scope:** this validates one candidate problem for this cycle's Problem Validation
Report (AS045). It does not score overall product-market fit (that is
score_product_market_fit) and it does not rank features (that is prioritize_features).

---

# Success Criteria

* The verdict is traceable to specific evidence, not impression.
* The same evidence bar is applied regardless of how appealing the problem is.
* Missing evidence is named plainly rather than assumed away.`
