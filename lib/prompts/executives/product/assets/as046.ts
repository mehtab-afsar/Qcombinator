/**
 * AS046 — Asset Instructions for "Product Feedback Log".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS046 is a newly minted Asset id (see
 * `lib/registry/executives/product/programs/p015-validate.ts`) — the workbook
 * names "Product Feedback Log" as one of P015's Primary Assets, but assigns
 * it no id and no Asset Instructions at all. This file was written in this
 * repo, following the exact section shape every other Asset Instructions
 * file uses, grounded in nothing invented beyond the Asset's own name and
 * P015's Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS046_PRODUCT_FEEDBACK_LOG_PROMPT = `# AS046 — Product Feedback Log

## Purpose

You are responsible for creating the company's **Product Feedback Log**.

The Product Feedback Log is the running, dated record of feedback customers have given about the
existing product — bugs, friction, requests and praise — captured as a continuous log rather than
a one-off snapshot, so nothing customers say gets lost between cycles.

The objective is **not** to interview customers from scratch.

The objective is to log what has already been said or observed this cycle, organised so patterns
across entries are easy to see.

The Product Feedback Log becomes the company's continuous record of customer sentiment about
what already exists, cycle over cycle.

---

# Business Outcome

A successful Product Feedback Log should:

* capture new feedback this cycle without losing prior entries
* separate distinct feedback items rather than blending them into a summary
* tag each item by type (bug, friction, request, praise) and rough severity or frequency
* surface any pattern across multiple feedback items
* replace scattered feedback channels with one running log

Every section should contribute to one question: what are customers telling us about what
already exists.

---

# Required Inputs

Before creating or updating the Product Feedback Log, review all available company information.

This may include:

* feedback, support tickets, reviews or comments provided in Company Context
* the Customer Interview Report (AS043), where interviews surfaced feedback on the existing
  product
* the prior Product Feedback Log, if one exists, to append to rather than overwrite

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any feedback item that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. How many new feedback items this cycle? What is the single most notable
pattern or item?

---

# New Feedback This Cycle

For each new feedback item, record:

* type (bug, friction, request or praise)
* what was said, close to the source's own words
* source, if known (customer, role, channel)
* rough frequency or severity, if more than one customer raised it

List items individually — do not merge distinct feedback into one summary line.

---

# Patterns Across Entries

Any theme that recurred across more than one feedback item this cycle or against the log's
history. Quote or reference specific entries rather than asserting a pattern without evidence.

---

# Carried Forward

Prior open items (from the previous log, if one exists) that remain unresolved, so nothing is
silently dropped between cycles.

---

# Output

Readable markdown, roughly 400–800 words depending on volume this cycle. Favour a scannable,
itemised log format over narrative prose.

**Evidence rule:** only feedback present in Company Context or AS043. Never invent a feedback
item, a customer or a sentiment that is not in the source material. Use **[TO VALIDATE: …]**
where a detail is needed and not yet available.

**Stay in scope:** this logs feedback about the existing product. It does not validate whether an
underlying problem is real (that is AS045) and it does not rank features (that is AS047) — it
supplies raw signal those Assets may draw on.

---

# Quality Standards

The Product Feedback Log should be:

* faithful to what was actually said or observed
* itemised, not blended into vague summary
* honest about negative feedback, not filtered to look positive
* traceable to a source where known
* continuous — carrying forward unresolved items, not dropping history

Avoid:

* summarising away specific feedback into generic impressions
* omitting negative or critical feedback
* inventing a feedback item not present in the source material
* losing prior entries when updating the log

---

# Completion Check

Before completing the Product Feedback Log ask:

* Is every new item this cycle captured distinctly, not blended?
* Are negative items included as plainly as positive ones?
* Is a real pattern across entries named, if one exists?
* Does every item trace to Company Context or AS043?
* Were prior unresolved items carried forward, not dropped?

If the answer to any question is **No**, improve the Product Feedback Log before completion.`
