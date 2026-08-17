/**
 * AS048 — Asset Instructions for "Validation Roadmap".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS048 is a newly minted Asset id (see
 * `lib/registry/executives/product/programs/p015-validate.ts`) — the workbook
 * names "Validation Roadmap" as one of P015's Primary Assets, but assigns it
 * no id and no Asset Instructions at all. This file was written in this
 * repo, following the exact section shape every other Asset Instructions
 * file uses, grounded in nothing invented beyond the Asset's own name and
 * P015's Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS048_VALIDATION_ROADMAP_PROMPT = `# AS048 — Validation Roadmap

## Purpose

You are responsible for creating the company's **Validation Roadmap**.

The Validation Roadmap is the confirmed record of this cycle's validated problems,
product-market-fit read and ranked feature priorities — the single current statement of "this is
what we now believe is worth building, and why," built so the next Program in the Product
portfolio (P016 — Product, P017 — Build) has a clear, evidenced baseline to work from.

The objective is **not** to re-rank or re-validate anything.

The objective is to confirm, in one place, the outputs already produced this cycle by AS044,
AS045 and AS047 — dated, so the next cycle knows exactly what baseline it is updating.

The Validation Roadmap becomes the company's current, dated validation-and-priority record, cycle
over cycle.

---

# Business Outcome

A successful Validation Roadmap should:

* confirm this cycle's validated problems, PMF read and feature ranking without altering them
* give the next Program a clear, dated baseline to build from
* make it obvious what changed since the last Validation Roadmap, if one exists
* replace informal "what are we building next" conversations with one current record

Every section should contribute to one question: what has this cycle of validation actually
settled, and what happens next.

---

# Required Inputs

Before creating the Validation Roadmap, review all available company information.

This may include:

* the PMF Scorecard (AS044) — this cycle's fit verdict
* the Problem Validation Report (AS045) — this cycle's validated problems
* the Feature Prioritisation Matrix (AS047) — this cycle's ranked features
* the prior Validation Roadmap, if one exists, for comparison

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for anything that cannot be confirmed from AS044, AS045 or AS047.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. What is this cycle's headline validation result, and what is the top
build priority coming out of it?

---

# Confirmed PMF Read

Restate this cycle's PMF verdict from AS044, unchanged, with the cycle date.

---

# Confirmed Validated Problems

Restate this cycle's validated-problem list from AS045, unchanged.

---

# Confirmed Feature Priorities

Restate this cycle's ranked features from AS047, unchanged, in rank order.

---

# What Changed Since Last Cycle

If a prior Validation Roadmap exists, state plainly what moved — a problem newly validated or
newly rejected, a feature that rose or fell in rank, a PMF read that improved or declined. If no
prior roadmap exists, state that this is the first.

---

# Baseline for Next Cycle

One or two sentences: what P016 — Product and P017 — Build should treat as the current, evidenced
starting point, and what the next validation cycle should re-check.

---

# Output

Readable markdown, roughly 300–600 words. No preamble, no covering note.

**Evidence rule:** the confirmed PMF read, validated problems and feature priorities must match
AS044, AS045 and AS047 exactly — never alter, add to or drop an item when recording it here.

**Stay in scope:** this records what AS044, AS045 and AS047 already produced this cycle. It does
not itself score fit, validate a problem or rank a feature, and it does not request or wait on
founder sign-off before taking effect.

---

# Quality Standards

The Validation Roadmap should be:

* an exact, unaltered record of AS044, AS045 and AS047
* dated and comparable cycle over cycle
* clear about what changed since the last cycle
* concise
* immediately usable as a baseline by P016 and P017

Avoid:

* re-ranking or re-validating anything in this document
* silently dropping an item that AS044, AS045 or AS047 included
* vague framing that hides what actually changed this cycle
* asking the founder for approval before the roadmap takes effect

---

# Completion Check

Before completing the Validation Roadmap ask:

* Does the confirmed PMF read, problem list and feature ranking match AS044, AS045 and AS047
  exactly?
* Is what changed since the last cycle stated plainly?
* Would P016 or P017 know exactly what evidenced baseline to start from?
* Does anything in this document ask the founder for permission?
* Is the cycle date present?

If the answer to any question is **No**, improve the Validation Roadmap before completion.`
