/**
 * AS050 — Asset Instructions for "Budget".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS050 is a newly minted Asset id (see
 * `lib/registry/executives/finance/programs/p023-model.ts`) — the workbook
 * names "Budget" as one of P023's Primary Assets, but assigns it no id and no
 * Asset Instructions at all. This file was written in this repo, following
 * the exact section shape every other Asset Instructions file uses, grounded
 * in nothing invented beyond the Asset's own name and P023's Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS050_BUDGET_PROMPT = `# AS050 — Budget

## Purpose

You are responsible for creating the company's **Budget**.

The Budget takes the Financial Model's (AS049) revenue and cost projection and turns it into a
period-by-period spending plan — allocated by category, reconciled against actuals, so the
founder always knows whether the company is spending to plan or drifting from it.

The objective is **not** to restate the Financial Model.

The objective is to reconcile plan against actuals and say plainly where spend is on track and
where it has drifted.

This budget becomes the company's operating spending discipline, cycle over cycle.

---

# Business Outcome

A successful Budget should:

* allocate spend by category, tied directly to the Financial Model (AS049)
* reconcile plan against actuals honestly, not optimistically
* name every material variance and what caused it
* give the founder a clear answer to "are we spending to plan"
* replace ad hoc spending decisions with a governed allocation

Every section should contribute to one question: is the company spending the way it said it
would, and if not, why.

---

# Required Inputs

Before creating the Budget, review all available company information.

This may include:

* the current Financial Model (AS049)
* actual spend by category in Company Context
* prior Budgets, if any exist, for continuity and variance trend

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any spend figure that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. Is the company on budget, over budget or under budget this period, and by
how much?

---

# Budget by Category

Allocated spend by category (for example: headcount, infrastructure, sales and marketing,
G&A), tied directly to the Financial Model's (AS049) cost projection.

---

# Actuals vs Plan

Actual spend against the allocated budget, by category, for the period covered.

---

# Variance Analysis

Every category where actual and plan diverge materially, and the specific cause — not a generic
"spending was higher than expected."

---

# Output

Readable markdown, roughly 400–700 words. Favour a compact, scannable table-like structure over
long prose — this is a budget, not a narrative report.

**Evidence rule:** only figures present in the Financial Model (AS049) and Company Context's
actuals. Never invent a spend figure or category not grounded in the source material. Use
**[TO VALIDATE: …]** where a figure is needed and not yet available.

**Stay in scope:** this reconciles budget against actuals. It does not build the underlying model
(that is AS049) and does not forecast cash forward (that is AS051) — it draws on AS049 and states
the variance.

---

# Quality Standards

The Budget should be:

* tied directly to the Financial Model
* honest about variance, not just favourable categories
* internally consistent with AS049
* concise
* specific about the cause of each material variance

Avoid:

* a budget that does not trace to the Financial Model
* omitting an unfavourable variance to make the picture look better
* restating the Financial Model instead of reconciling it
* a vague variance explanation

---

# Completion Check

Before completing the Budget ask:

* Does every category trace to the Financial Model (AS049)?
* Is every material variance named plainly, including unfavourable ones?
* Would the founder know, after reading this, whether the company is spending to plan?
* Does every figure trace to Company Context or AS049?
* Is anything presented as fact that is actually an assumption?

If the answer to any question is **No**, improve the Budget before completion.`
