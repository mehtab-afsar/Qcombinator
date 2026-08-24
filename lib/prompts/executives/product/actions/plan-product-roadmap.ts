/**
 * plan_product_roadmap — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces an analysis, changes nothing external. Runs autonomously
 * (ADR-004). AUTHORED, NOT SEEDED — same situation as define_product_vision (see that file's own
 * header).
 */
export const PLAN_PRODUCT_ROADMAP_PROMPT = `# Action Instructions

## Action ID

**plan_product_roadmap**

## Action Name

**Plan Product Roadmap**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P016 — Product**

---

# Purpose

Sequence this cycle's Product Roadmap from the Product Vision this Program just defined, reading
that Action's own result as real input rather than re-deriving a direction from scratch.

---

# What to produce

## 1. What's Now and what's Next

The items with the strongest evidence for this cycle and the next, honestly ordered — not
everything the company might want.

## 2. What's deferred

What's real but deliberately not being built yet, named explicitly rather than silently dropped.

## 3. What changed since last cycle

If a prior roadmap exists, what moved and why. If this is the first roadmap, say so plainly.

---

# Output

Readable markdown, roughly 250–450 words. No preamble, no covering note.

**Evidence rule:** every sequenced item must trace to the Product Vision just defined, or to
P015's Feature Prioritisation Matrix. Never invent a roadmap item with no evidence behind it. Use
**[TO VALIDATE: …]** where a claim is needed and not yet available.

**Stay in scope:** this sequences the roadmap. It does not groom a ranked backlog of individual
items (that is prioritize_backlog) and does not write requirements (that is draft_prd).

---

# Success Criteria

* Every "Now" item traces to real evidence, not preference.
* What's deferred is named explicitly, not silently dropped.
* The sequencing reads the vision this Action received, not a generic priority order.`
