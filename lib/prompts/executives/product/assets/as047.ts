/**
 * AS047 — Asset Instructions for "Feature Prioritisation Matrix".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS047 is a newly minted Asset id (see
 * `lib/registry/executives/product/programs/p015-validate.ts`) — the workbook
 * names "Feature Prioritisation Matrix" as one of P015's Primary Assets, but
 * assigns it no id and no Asset Instructions at all. This file was written in
 * this repo, following the exact section shape every other Asset
 * Instructions file uses, grounded in nothing invented beyond the Asset's own
 * name and P015's Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS047_FEATURE_PRIORITISATION_MATRIX_PROMPT = `# AS047 — Feature Prioritisation Matrix

## Purpose

You are responsible for creating the company's **Feature Prioritisation Matrix**.

The Feature Prioritisation Matrix ranks candidate features against validated customer problems
and the company's current product-market fit read, so the founder and the rest of the Executive
Team know what is worth building next and why — built so nothing reaches development on
popularity or internal enthusiasm alone.

The objective is **not** to list every feature that has been suggested.

The objective is to rank the features that trace to real, validated evidence, and to say plainly
which ones do not belong in the next build cycle.

The Feature Prioritisation Matrix becomes the company's ranked, evidence-based build candidate
list, cycle over cycle.

---

# Business Outcome

A successful Feature Prioritisation Matrix should:

* rank every candidate feature against a validated problem, not an assumption
* make the ranking rationale visible, not just the final order
* separate features worth building now from features that are not yet earned
* connect directly to the Problem Validation Report (AS045) and PMF Scorecard (AS044)
* replace internal opinion or the loudest voice with a consistent ranking method

Every section should contribute to one question: what should we build next, and why that and not
something else.

---

# Required Inputs

Before creating the Feature Prioritisation Matrix, review all available company information.

This may include:

* the Problem Validation Report (AS045) — the validated-problem list
* the PMF Scorecard (AS044) — the current fit read and what would move it
* the Product Feedback Log (AS046) — requests and friction from existing customers
* the company's strategic priorities and product maturity
* prior Feature Prioritisation Matrices, if any exist, for continuity

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any effort or impact estimate that cannot be confirmed from
  Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. How many candidate features were ranked this cycle? What is the top
priority, and which validated problem does it address?

---

# Ranking Method

State plainly what the ranking weighs (for example: validated problem strength, PMF impact,
build effort, strategic alignment). Keep this consistent cycle over cycle rather than changing
the method to fit a preferred outcome.

---

# Ranked Features

For each candidate feature, in rank order:

* the feature, in plain language
* the validated problem it addresses (must trace to AS045 — reject or flag any feature that does
  not)
* expected customer or PMF impact
* rough build effort or complexity, if known
* rank rationale in one sentence

A feature with no traceable validated problem should be listed separately in "Not Yet Earned"
below, not ranked alongside validated ones.

---

# Not Yet Earned

Candidate features that lack a validated problem behind them, or that failed validation in AS045.
State what evidence would need to exist before they could be ranked.

---

# Output

Readable markdown, roughly 500–900 words depending on the number of features ranked. Favour a
scannable table or ranked list over narrative prose.

**Evidence rule:** every ranked feature must trace to a specific validated problem in AS045.
Never rank a feature on the strength of internal enthusiasm alone, and never invent an impact or
effort estimate not grounded in Company Context. Use **[TO VALIDATE: …]** where an estimate is
needed and not yet available.

**Stay in scope:** this ranks features against already-validated problems. It does not itself
validate a problem (that is AS045) and it does not score product-market fit (that is AS044) — it
draws on both to produce the ranking.

---

# Quality Standards

The Feature Prioritisation Matrix should be:

* evidence-based
* consistently ranked using a stated method
* honest about features that are not yet earned
* traceable — every rank ties to a validated problem
* concise per feature
* free of internal-popularity bias

Avoid:

* ranking a feature with no validated problem behind it
* changing the ranking method to justify a preferred feature
* blending ranked and not-yet-earned features together
* inventing effort or impact figures not grounded in Company Context

---

# Completion Check

Before completing the Feature Prioritisation Matrix ask:

* Does every ranked feature trace to a specific validated problem in AS045?
* Is the ranking method stated and applied consistently?
* Are features that are not yet earned separated out plainly, not hidden?
* Would the Validation Roadmap (AS048) have a clean, defensible ranked list to record?
* Is anything ranked on assumption rather than evidence?

If the answer to any question is **No**, improve the Feature Prioritisation Matrix before
completion.`
