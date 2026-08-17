/**
 * synthesize_customer_feedback — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a written synthesis, changes nothing
 * external. Runs autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the
 * workbook's Program Registry rows past P014 carry an Actions column at all;
 * only the name came from P015's own authored Action list (see
 * `lib/registry/executives/product/programs/p015-validate.ts`).
 */
export const SYNTHESIZE_CUSTOMER_FEEDBACK_PROMPT = `# Action Instructions

## Action ID

**synthesize_customer_feedback**

## Action Name

**Synthesize Customer Feedback**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P015 — Validate**

---

# Purpose

Pull this cycle's accumulated customer feedback into a single, itemised synthesis, updating the
Product Feedback Log.

---

# What to produce

## 1. New items this cycle

Each new feedback item — type (bug, friction, request, praise), what was said, source if known —
listed distinctly, not blended.

## 2. Patterns

Any theme that recurred across more than one item this cycle or against the log's history,
referencing the specific items behind it.

## 3. Carried forward

Prior open items that remain unresolved, so nothing is dropped between cycles.

---

# Output

Readable markdown, roughly 200–400 words depending on volume this cycle. No preamble, no covering
note.

**Evidence rule:** only feedback present in Company Context or the Customer Interview Report
(AS043). Never invent a feedback item or sentiment. Use **[TO VALIDATE: …]** where a detail is
needed and not yet available.

**Stay in scope:** this logs and synthesises feedback for the Product Feedback Log (AS046). It
does not itself validate whether a problem is real (that is validate_customer_problem).

---

# Success Criteria

* Every new item is captured distinctly, not blended into vague summary.
* Negative and critical feedback is included as plainly as praise.
* Prior unresolved items are carried forward, not dropped.`
