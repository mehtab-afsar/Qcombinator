/**
 * AS049 — Asset Instructions for "Financial Model".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS049 is a newly minted Asset id (see
 * `lib/registry/executives/finance/programs/p023-model.ts`) — the workbook
 * names "Financial Model" as one of P023's Primary Assets, but assigns it no
 * id and no Asset Instructions at all. This file was written in this repo,
 * following the exact section shape every other Asset Instructions file
 * uses, grounded in nothing invented beyond the Asset's own name and P023's
 * Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS049_FINANCIAL_MODEL_PROMPT = `# AS049 — Financial Model

## Purpose

You are responsible for creating the company's **Financial Model**.

The Financial Model is the company's core revenue, cost and cash picture — the single set of
numbers every other financial Asset in this Program builds on. It projects revenue, cost of
revenue, operating expense, headcount and cash forward from current actuals and stated
assumptions, made explicit rather than buried.

The objective is **not** to produce an impressive-looking spreadsheet.

The objective is to produce one internally consistent model the founder can defend to an investor
line by line.

This model becomes the company's authoritative financial baseline, cycle over cycle.

---

# Business Outcome

A successful Financial Model should:

* project revenue, costs and cash from stated, explicit assumptions — never unstated ones
* stay internally consistent — every downstream number traces back to this model
* give the Budget (AS050), Cash Flow Forecast (AS051), Scenario Analysis (AS052) and Unit
  Economics Model (AS053) a reliable source to build on
* replace scattered, conflicting spreadsheets with one current baseline
* be defensible to an investor, not just internally comfortable

Every section should contribute to one question: what does this company's financial picture
actually look like, and what is it built on.

---

# Required Inputs

Before creating the Financial Model, review all available company information.

This may include:

* current revenue, cost and headcount actuals in Company Context
* pricing and revenue model
* the latest Q-Score, particularly financial constraints and Market Potential
* prior Financial Models, if any exist, for continuity and trend

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any figure that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. What is the company's current revenue and cash position, and what is the
single most important assumption this model depends on?

---

# Key Assumptions

State every material assumption explicitly — pricing, growth rate, headcount plan, cost
structure. An assumption left implicit is an assumption a founder cannot defend under
questioning.

---

# Revenue and Cost Projection

Project revenue, cost of revenue and operating expense forward, tied to the assumptions above.
Show the logic, not just the output figures.

---

# Cash Position Summary

Current cash, monthly burn and the resulting runway at a glance — the headline figure the Cash
Flow Forecast (AS051) will build out in full detail.

---

# Model Risks

The one or two assumptions in this model most likely to be wrong, and what would happen to the
picture above if they were.

---

# Output

Readable markdown, roughly 500–900 words. Favour explicit, labelled assumptions over unexplained
numbers.

**Evidence rule:** only actuals and assumptions present in Company Context. Never invent a revenue
figure, cost line or growth rate not grounded in the source material. Use **[TO VALIDATE: …]**
where a figure is needed and not yet available.

**Stay in scope:** this is the core model. It does not itself reconcile a budget (that is AS050),
forecast cash in detail (that is AS051), stress-test assumptions (that is AS052), or assess unit
economics (that is AS053) — it supplies the baseline those Assets draw on.

---

# Quality Standards

The Financial Model should be:

* internally consistent
* built on explicit, stated assumptions
* traceable to Company Context
* evidence-based
* defensible under investor questioning
* free of unexplained numbers

Avoid:

* an assumption left implicit rather than stated
* a number that does not trace to Company Context or a stated assumption
* optimism presented as fact
* complexity that obscures rather than clarifies the picture

---

# Completion Check

Before completing the Financial Model ask:

* Is every material assumption stated explicitly, not implied?
* Would AS050, AS051, AS052 and AS053 have a reliable baseline to build on from this model?
* Does every figure trace to Company Context or a stated assumption?
* Is anything presented as fact that is actually an assumption?
* Could the founder defend this model, line by line, to an investor?

If the answer to any question is **No**, improve the Financial Model before completion.`
