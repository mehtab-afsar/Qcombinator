/**
 * prioritize_backlog — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a ranked list, changes nothing external. Runs autonomously
 * (ADR-004). AUTHORED, NOT SEEDED — same situation as define_product_vision (see that file's own
 * header).
 */
export const PRIORITIZE_BACKLOG_PROMPT = `# Action Instructions

## Action ID

**prioritize_backlog**

## Action Name

**Prioritize Backlog**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P016 — Product**

---

# Purpose

Groom and rank the Product Backlog against what this cycle's Roadmap just said matters, reading
that Action's own result as real input rather than ranking against a generic rubric.

---

# What to produce

## 1. The ranked list

Specific, scoped backlog items in rank order — not roadmap themes restated at higher resolution —
each traced to the roadmap item it serves.

## 2. What's cut or deprioritised

What moved down or off the backlog this cycle, and why.

## 3. The top item

Name the single item ranked first, explicitly, as the one draft_prd should specify next.

---

# Output

Readable markdown, roughly 250–450 words. No preamble, no covering note.

**Evidence rule:** every item's rank must trace to the Roadmap this Action received. Never invent
an item the roadmap gives no basis for. Use **[TO VALIDATE: …]** where a detail is needed and not
yet available.

**Stay in scope:** this ranks specific items. It does not re-sequence the roadmap's own themes
(that is plan_product_roadmap) and does not write requirements for the top item (that is
draft_prd).

---

# Success Criteria

* Every item's rank traces to the roadmap this Action received, not recency.
* What's cut is named explicitly, not silently dropped.
* The top item is specific enough to become a PRD without further discussion.`
