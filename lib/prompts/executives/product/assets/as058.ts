/**
 * AS058 — Asset Instructions for "Product Backlog".
 *
 * Layer 3 of the Composer (ADR-012). See AS054's header (same directory) for the full reasoning
 * — same newly-minted-id situation, same precedent.
 */
export const AS058_PRODUCT_BACKLOG_PROMPT = `# AS058 — Product Backlog

## Purpose

You are responsible for creating the company's **Product Backlog**.

The Product Backlog takes the Product Roadmap's (AS055) sequencing and grooms it into a ranked
list of specific, buildable items — what's first, what's next after that, and what's been cut.
Where the Roadmap sequences at the level of themes and quarters, the Backlog ranks at the level of
actual items.

The objective is **not** to collect every idea that's been raised.

The objective is to produce one honestly ranked list the company can act on immediately — the top
item should be precise enough to become a PRD without further discussion.

This Backlog becomes the company's current build queue, cycle over cycle.

---

# Business Outcome

A successful Product Backlog should:

* rank items against what the Roadmap (AS055) just said matters, not by recency or loudness
* be specific — each item a real, scoped piece of work, not a restated roadmap theme
* state what's been cut or deprioritised this cycle, not just what moved up
* give the PRD (AS056) a precise, unambiguous top item to specify
* stay a manageable size — a backlog that only grows has stopped doing its job

Every section should contribute to one question: what, specifically, gets built next, in what
order.

---

# Required Inputs

Before creating the Product Backlog, review all available company information.

This may include:

* Company Context, Strategy Session and Executive Contract
* the Product Roadmap (AS055) this backlog grooms against
* the prior Product Backlog, if one exists, for continuity and to track what changed

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any item detail that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to three sentences. What's ranked first this cycle, and why.

---

# Ranked Backlog

The backlog items in rank order, each one specific and scoped — not a roadmap theme repeated at
higher resolution. For each: what it is, why it's ranked where it is, and which roadmap item it
serves.

---

# Cut or Deprioritised This Cycle

What moved down or off the backlog since the last cycle, and why — this section is what keeps the
backlog from only ever growing.

---

# Top Item — Ready for a PRD

Name the single item ranked first, explicitly, as the one draft_prd should specify next.

---

# Output

Readable markdown, roughly 350–600 words depending on backlog size. Favour a clear ranked list
over prose description.

**Evidence rule:** every item's ranking must trace to the Product Roadmap (AS055). Never invent
an item the roadmap gives no basis for. Use **[TO VALIDATE: …]** where a detail is needed and not
yet available.

**Stay in scope:** this ranks specific, buildable items. It does not re-sequence the roadmap's own
themes (that is AS055), and it does not write requirements for the top item (that is AS056) — it
only names which item is next.

---

# Quality Standards

The Product Backlog should be:

* ranked against real roadmap priority, not recency
* made of specific, scoped items, not restated themes
* honest about what's been cut, not silently growing
* precise enough that the top item is PRD-ready as-is

Avoid:

* a backlog that only ever grows, never trims
* vague items that would need clarification before becoming a PRD
* ranking by whoever asked most recently instead of roadmap priority
* silently dropping an item instead of naming it as cut

---

# Completion Check

Before completing the Product Backlog ask:

* Does every item's rank trace to the current Roadmap?
* Is the top item specific enough to become a PRD without further discussion?
* Is what's been cut or deprioritised named explicitly?
* Has anything been added without a traceable reason?
* Is the backlog a manageable, real working list — not an ever-growing wishlist?

If the answer to any question is **No**, improve the Product Backlog before completion.`
