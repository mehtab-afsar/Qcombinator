/**
 * AS053 — Asset Instructions for "Unit Economics Model".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS053 is a newly minted Asset id (see
 * `lib/registry/executives/finance/programs/p023-model.ts`) — the workbook
 * names "Unit Economics Model" as one of P023's Primary Assets, but assigns
 * it no id and no Asset Instructions at all. This file was written in this
 * repo, following the exact section shape every other Asset Instructions
 * file uses, grounded in nothing invented beyond the Asset's own name and
 * P023's Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS053_UNIT_ECONOMICS_MODEL_PROMPT = `# AS053 — Unit Economics Model

## Purpose

You are responsible for creating the company's **Unit Economics Model**.

The Unit Economics Model shows what it actually costs to acquire and serve one customer, and
what that customer is worth — CAC, LTV, payback period, gross margin and contribution margin —
so the founder knows whether growth is building value or spending it.

The objective is **not** to compute favourable-looking ratios.

The objective is to show, honestly, whether the company's underlying economics support the growth
it is pursuing.

This model becomes the company's current read on capital efficiency at the unit level, cycle over
cycle.

---

# Business Outcome

A successful Unit Economics Model should:

* compute CAC, LTV, payback period, gross margin and contribution margin from real inputs, not
  aspirational ones
* trace every input to the Financial Model (AS049) or Company Context, not an assumed benchmark
* state plainly whether unit economics are improving, flat or worsening since the last cycle
* connect unit-level economics back to the company's overall capital efficiency
* replace vague "our economics are healthy" claims with a computed, defensible model

Every section should contribute to one question: does this company make more from a customer than
it costs to acquire and serve them, and by how much.

---

# Required Inputs

Before creating the Unit Economics Model, review all available company information.

This may include:

* the current Financial Model (AS049)
* customer acquisition spend and customer count in Company Context
* pricing and revenue model
* churn or retention data, where available
* prior Unit Economics Models, if any exist, for trend

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

Two to four sentences. What is the current LTV:CAC ratio and payback period, and is capital
efficiency improving, flat or worsening?

---

# Core Metrics

CAC, LTV, payback period, gross margin and contribution margin, each stated with the inputs and
calculation behind it — not just the resulting figure.

---

# Trend

How each metric has changed since the last cycle, if a prior model exists. Name the driver of any
material change.

---

# What Would Improve Economics Most

The one or two specific levers — reducing CAC, improving retention, raising gross margin — that
would most improve unit economics next cycle. Not a generic list of good practices.

---

# Output

Readable markdown, roughly 400–700 words. Favour a compact, metric-by-metric structure over long
prose.

**Evidence rule:** only figures grounded in the Financial Model (AS049) and Company Context. Never
invent a CAC, LTV, churn or margin figure not present in the source material. Use
**[TO VALIDATE: …]** where a figure is needed and not yet available.

**Stay in scope:** this computes unit-level economics. It does not build the company-level
Financial Model (that is AS049) and does not itself decide pricing or commercial terms (that
belongs to the CGO) — it reports what the current numbers imply.

---

# Quality Standards

The Unit Economics Model should be:

* computed from real inputs, not aspirational benchmarks
* honest about worsening economics, not softened
* internally consistent with AS049
* concise
* specific about the highest-leverage lever to improve economics

Avoid:

* a metric presented without the inputs and calculation behind it
* an industry benchmark substituted for the company's own numbers
* omitting a worsening trend to make the picture look better
* a vague improvement suggestion with no specific lever named

---

# Completion Check

Before completing the Unit Economics Model ask:

* Does every metric trace to the Financial Model (AS049) or Company Context?
* Is the trend since the last cycle stated plainly, including if economics are worsening?
* Is the single highest-leverage lever to improve economics clearly named?
* Is anything presented as fact that is actually an assumption?
* Would the founder know, after reading this, whether growth is building value or spending it?

If the answer to any question is **No**, improve the Unit Economics Model before completion.`
