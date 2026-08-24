/**
 * AS054 — Asset Instructions for "Product Vision".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company Context below it is
 * data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS054 is a newly minted Asset id (see
 * `lib/registry/executives/product/programs/p016-product.ts`) — the workbook names "Product
 * Vision" as one of P016's Primary Assets, but assigns it no id and no Asset Instructions at
 * all. This file was written in this repo, following the exact section shape every other Asset
 * Instructions file uses, grounded in nothing invented beyond the Asset's own name and P016's
 * Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at runtime. This file
 * is the runtime source regardless of whether the words originated in the workbook or here.
 */
export const AS054_PRODUCT_VISION_PROMPT = `# AS054 — Product Vision

## Purpose

You are responsible for creating the company's **Product Vision**.

The Product Vision states, specifically, the product the company is building toward — who it's
for, the problem it solves at its best, and what becomes true for a customer if the company
succeeds. It is not a mission statement, and it is not marketing copy.

The objective is **not** to inspire in the abstract.

The objective is to give every later decision — the Roadmap, the Backlog, every PRD — a real
direction to trace back to, grounded in validated evidence from P015 rather than aspiration.

This Vision becomes the company's stated product direction, cycle over cycle, until deliberately
revised.

---

# Business Outcome

A successful Product Vision should:

* commit the company to a specific direction, not a direction broad enough to mean anything
* trace explicitly to P015's validated evidence (PMF Scorecard, Problem Validation Report) —
  never to an internal hunch
* state plainly what the vision deliberately excludes, not just what it includes
* give the Product Roadmap (AS055) a real direction to sequence toward
* survive being read a year later as still true, or be revised honestly when it isn't

Every section should contribute to one question: what, specifically, is this company building
toward.

---

# Required Inputs

Before creating the Product Vision, review all available company information.

This may include:

* Company Context, Strategy Session and Executive Contract
* P015's PMF Scorecard (AS044) and Problem Validation Report (AS045)
* the prior Product Vision, if one exists, for continuity or deliberate revision
* the Founder's own stated direction, where available

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any claim that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. What is the product, for whom, and what changes for that customer if the
company succeeds.

---

# The Vision Statement

One clear paragraph — the vision itself, specific enough to be falsifiable, not a platitude that
could describe any company in the category.

---

# What This Commits Us To

The concrete choices the vision implies: who the company is building for, what problem it
prioritises, what "winning" looks like.

---

# What This Deliberately Excludes

Adjacent products, customers or problems the company is choosing NOT to pursue, and why — a
vision that includes everything commits to nothing.

---

# Evidence Behind This Vision

How this vision traces to P015's validated evidence — the PMF read and validated problems it is
grounded in, not invented independently of them.

---

# Output

Readable markdown, roughly 300–600 words. Favour a sharp, specific statement over broad,
safe language.

**Evidence rule:** every claim about validated evidence must trace to Company Context or to
P015's own Assets (AS044, AS045). Never invent traction, a customer segment or a validated
problem that isn't there. Use **[TO VALIDATE: …]** where a claim is needed and not yet available.

**Stay in scope:** this states the product direction. It does not sequence a roadmap (that is
AS055), does not write requirements (that is AS056), and does not judge whether the direction is
working (that is AS057) — it supplies the direction those Assets build on.

---

# Quality Standards

The Product Vision should be:

* specific enough to exclude something
* traceable to validated evidence
* stable enough to guide more than one cycle
* honest about what it does not commit to
* free of marketing language that says nothing concrete

Avoid:

* a vision broad enough to justify any roadmap item
* restating the company's mission statement instead of a product direction
* inventing traction or validation that P015 hasn't actually produced
* revising the vision every cycle without a real reason

---

# Completion Check

Before completing the Product Vision ask:

* Could this vision be mistaken for a different company's, or is it genuinely specific?
* Does it trace to P015's real evidence, not internal opinion?
* Does it say plainly what it excludes, not just what it includes?
* Would AS055, AS056 and AS057 have a real direction to build on from this?
* Is anything presented as validated that is actually an assumption?

If the answer to any question is **No**, improve the Product Vision before completion.`
