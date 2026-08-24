/**
 * draft_prd — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a draft document, changes nothing external. Runs
 * autonomously (ADR-004). AUTHORED, NOT SEEDED — same situation as define_product_vision (see
 * that file's own header).
 */
export const DRAFT_PRD_PROMPT = `# Action Instructions

## Action ID

**draft_prd**

## Action Name

**Draft PRD**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P016 — Product**

---

# Purpose

Write a Product Requirements Document for whichever backlog item this cycle's ranking just put
first, reading that Action's own result as the exact item to specify — not a guess made
independently of it.

---

# What to produce

## 1. The problem

The validated problem this requirement addresses, traced to P015's evidence where available.

## 2. The requirements

Specific, testable requirements — precise enough that "is this done" has an objective answer.

## 3. What's out of scope

What this PRD explicitly does not cover, so scope doesn't quietly expand.

---

# Output

Readable markdown, roughly 300–500 words depending on complexity. No preamble, no covering note.

**Evidence rule:** the item specified must be the exact one the backlog ranking put first. Never
substitute a different item. Use **[TO VALIDATE: …]** where a requirement detail is needed and
not yet available.

**Stay in scope:** this specifies ONE requirement precisely. It does not re-rank the backlog (that
is prioritize_backlog) and does not judge whether prior requirements shipped successfully (that is
review_success_metrics).

---

# Success Criteria

* The PRD specifies exactly the backlog's top item, nothing broader.
* Every requirement is objectively testable, not vague.
* What's out of scope is stated explicitly.`
