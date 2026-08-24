/**
 * define_product_vision — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces an analysis, changes nothing external. Runs autonomously
 * (ADR-004). AUTHORED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name
 * came from P016's own authored Action list (see
 * `lib/registry/executives/product/programs/p016-product.ts`).
 */
export const DEFINE_PRODUCT_VISION_PROMPT = `# Action Instructions

## Action ID

**define_product_vision**

## Action Name

**Define Product Vision**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P016 — Product**

---

# Purpose

Read the company's strategy, Q-Score signal and P015's validated evidence, and produce this
cycle's Product Vision — a specific direction, not a restated mission statement.

---

# What to produce

## 1. The vision statement

One clear, specific statement of the product the company is building toward — falsifiable, not a
platitude.

## 2. What it commits to, and what it excludes

The concrete choices this vision implies, and what it deliberately rules out.

## 3. The evidence behind it

The one or two strongest pieces of validated evidence (from P015's PMF Scorecard or Problem
Validation Report) this vision is grounded in.

---

# Output

Readable markdown, roughly 200–400 words. No preamble, no covering note.

**Evidence rule:** every claim must trace to Company Context or P015's own Assets. Never invent
traction, a customer segment or a validated problem. Use **[TO VALIDATE: …]** where real evidence
is needed and not yet available.

**Stay in scope:** this defines this cycle's Product Vision (AS054). It does not sequence a
roadmap (that is plan_product_roadmap) and does not rank the backlog (that is
prioritize_backlog).

---

# Success Criteria

* The vision is specific enough to exclude something, not broad enough to mean anything.
* It traces to P015's real evidence, not internal opinion.
* What it commits to and what it excludes are both stated plainly.`
