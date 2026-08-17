/**
 * AS044 — Asset Instructions for "PMF Scorecard".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. AS044 is a newly minted Asset id (see
 * `lib/registry/executives/product/programs/p015-validate.ts`) — the workbook
 * names "PMF Scorecard" as one of P015's Primary Assets, but assigns it no id
 * and no Asset Instructions at all. This file was written in this repo,
 * following the exact section shape every other Asset Instructions file
 * uses, grounded in nothing invented beyond the Asset's own name and P015's
 * Purpose.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS044_PMF_SCORECARD_PROMPT = `# AS044 — PMF Scorecard

## Purpose

You are responsible for creating the company's **PMF Scorecard**.

The PMF Scorecard is an honest, evidence-based read of the company's current product-market
fit — how strongly customers need what the company offers, how they currently behave, and what
that behaviour says about fit, built so the founder knows plainly whether the company has found
it, is approaching it, or is still searching.

The objective is **not** to reassure the founder.

The objective is to score fit against real evidence and say plainly where it is strong, where it
is weak, and what would move it.

The PMF Scorecard becomes the company's honest, current read on product-market fit, cycle over
cycle.

---

# Business Outcome

A successful PMF Scorecard should:

* give the founder a clear current PMF read, not a vague impression
* ground every score in specific evidence, not intuition
* name what would most improve fit, not just describe the current state
* connect directly to the Customer Interview Report (AS043) and Problem Validation Report (AS045)
* replace founder gut-feel about fit with a structured, evidence-based assessment

Every section should contribute to one question: does the market actually want this, and how do
we know.

---

# Required Inputs

Before creating the PMF Scorecard, review all available company information.

This may include:

* the Customer Interview Report (AS043)
* the Problem Validation Report (AS045), if already produced this cycle
* the Product Feedback Log (AS046), if already produced this cycle
* usage, retention or engagement signal in Company Context, if available
* the latest Q-Score, particularly Market Readiness
* prior PMF Scorecards, if any exist, for trend

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* use **[TO VALIDATE: …]** for any figure or signal that cannot be confirmed from Company Context.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences. Does the company currently have product-market fit, partial fit, or not
yet? What is the single strongest piece of evidence behind that verdict?

---

# Fit Signals

Assess the evidence available under each heading, using only what Company Context and AS043
actually provide:

* problem intensity — how strongly and consistently customers describe the problem
* current behaviour — what customers do today (workarounds, spend, switching) that signals need
* product reaction — how customers respond to the company's product or concept where known
* retention or repeat signal — where usage or renewal data exists

Mark a heading **[TO VALIDATE: …]** rather than scoring it if no real evidence exists.

---

# PMF Score and Direction

A single current fit verdict (for example: not yet, early signal, partial fit, strong fit) with
one paragraph of justification tied directly to the Fit Signals above. State the direction since
the last cycle if a prior Scorecard exists (improving, flat, declining).

---

# What Would Move Fit Most

The one or two things — closing a specific gap, validating a specific problem, changing a
specific behaviour — that would most improve the PMF read next cycle. Not a generic list of good
practices.

---

# Output

Readable markdown, roughly 500–800 words. Favour a compact, scannable layout over long prose —
this is a scorecard, not a research report.

**Evidence rule:** only facts from Company Context, AS043, AS045 and AS046. Never invent a usage
number, a retention figure or a customer reaction that is not present in the source material. Use
**[TO VALIDATE: …]** where real data is needed and not yet available.

**Stay in scope:** this scores product-market fit. It does not itself validate a problem (that is
AS045) and it does not rank features (that is AS047) — it draws on the evidence those Assets
produce and states the verdict.

---

# Quality Standards

The PMF Scorecard should be:

* evidence-based
* honest about weak or absent fit, not just strong fit
* internally consistent with AS043, AS045 and AS046
* concise
* specific about what would move the score
* free of vague reassurance

Avoid:

* scoring fit as strong without specific supporting evidence
* omitting a weak signal to make the verdict look better
* restating the Customer Interview Report instead of scoring it
* an unsupported PMF verdict

---

# Completion Check

Before completing the PMF Scorecard ask:

* Does the verdict trace to specific evidence, not impression?
* Is a weak or absent signal named plainly, if that is the truth?
* Is the single highest-leverage next step to improve fit clearly named?
* Does every claim trace to Company Context, AS043, AS045 or AS046?
* Would the founder know, after reading this, whether the company has found fit?

If the answer to any question is **No**, improve the PMF Scorecard before completion.`
