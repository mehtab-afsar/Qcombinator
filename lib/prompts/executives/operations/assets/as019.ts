/**
 * AS019 — Asset Instructions for "Founder Dashboard".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. The workbook's Asset Registry gives AS019 only a
 * one-line description ("Executive dashboard summarising company
 * performance, KPIs, Q-Score, financials and strategic progress.") — no
 * multi-page Asset Instructions exist for it, the same situation P007/P008's
 * assets were in (see `lib/prompts/executives/growth/assets/as017.ts`'s
 * header). This file was written in this repo, following the exact section
 * shape every ported Asset Instructions file uses, grounded in that one-line
 * description and in nothing else invented.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS019_FOUNDER_DASHBOARD_PROMPT = `# AS019 — Founder Dashboard

## Purpose

You are responsible for creating the company's **Founder Dashboard**.

The Founder Dashboard is the executive summary of the whole company: a single-page view of
company performance, KPIs, Q-Score, financials and strategic progress, built so the founder can
read it in minutes and know exactly where the company stands.

The objective is **not** to restate every number the company tracks.

The objective is to surface the handful of facts that actually change what the founder does next
— what improved, what deteriorated, what needs attention now — and to say so plainly.

The Founder Dashboard becomes the company's authoritative single view of "where do we stand,
right now."

---

# Business Outcome

A successful Founder Dashboard should:

* give the founder a complete picture of company health in one read
* surface the most important change since the last cycle, not every change
* connect Q-Score, KPIs and financial performance into one coherent story
* name the biggest constraint and the biggest opportunity without hedging
* replace scattered spreadsheets and one-off updates with one trusted source

Every section should contribute to one question: is the company on track, and if not, why not.

---

# Required Inputs

Before creating the Founder Dashboard, review all available company information.

This may include:

* company overview and strategic priorities
* the latest Q-Score and its history
* the KPI Dashboard (AS020)
* the Q-Score Trend Report (AS021)
* financial position and recent financial performance
* organisational and operating context
* prior Founder Dashboards, if any exist, for trend

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

Three to five sentences. Is the company on track against its strategic priorities? What is the
single most important thing that changed this cycle? What deserves the founder's attention first?

---

# Company Health at a Glance

A compact summary combining:

* current Q-Score and its direction (up, flat, down) since the last cycle
* the two or three KPIs that moved most, from the KPI Dashboard (AS020)
* current financial position in one line (cash position, burn or revenue trend — whatever is
  known from Company Context)

This section should be readable in under thirty seconds.

---

# What Improved

Name specifically what got better this cycle, and why it matters. Skip generic praise — only
name a change that is real and traceable to evidence.

---

# What Deteriorated

Name specifically what got worse this cycle, and why. A dashboard that only shows good news is
not doing its job; do not omit a real deterioration to make the summary look better.

---

# Biggest Constraint

The single operational, commercial or financial constraint most limiting the company right now.
Not a list of concerns — the one that matters most this cycle.

---

# Biggest Opportunity

The single highest-leverage opportunity available to the company right now, grounded in the KPI
Dashboard, Q-Score Trend or financial position — not a generic strategic suggestion.

---

# Strategic Progress

Assess progress against the company's stated strategic priorities (per Company Context). Where
progress is on track, say so briefly. Where it is behind, say by how much and why.

---

# Recommended Focus

One to three things the founder should focus on this cycle, ranked. Each should trace to a
specific fact above — a KPI, a Q-Score driver, a financial figure — not a generic recommendation.

---

# Output

Readable markdown, roughly 500–800 words. Favour a compact summary layout (short paragraphs,
tables where they aid scanning) over long prose. This is a dashboard, not a report — every
section should be scannable at a glance.

**Evidence rule:** only facts from Company Context, the Q-Score, the KPI Dashboard (AS020) and the
Q-Score Trend Report (AS021). Never invent a metric, a financial figure or a trend that is not
present in the source material. Use **[TO VALIDATE: …]** where real data is needed and not yet
available.

**Stay in scope:** this summarises company performance for the founder. It does not define the
company's KPIs (that is AS020) and it does not analyse Q-Score history in depth (that is AS021) —
it draws on both and presents the synthesis.

---

# Quality Standards

The Founder Dashboard should be:

* company-specific
* current — reflecting this cycle, not a stale snapshot
* internally consistent with the KPI Dashboard and Q-Score Trend Report
* evidence-based
* concise
* scannable
* honest about both good and bad news

Avoid:

* restating every number the company tracks
* burying the real headline under minor detail
* vague reassurance in place of a real verdict
* unsupported figures or invented trends

---

# Completion Check

Before completing the Founder Dashboard ask:

* Could the founder read this in under five minutes and know where the company stands?
* Does it say plainly what improved and what deteriorated?
* Is the biggest constraint actually the biggest one, not just the easiest to describe?
* Does every claim trace to Company Context, the Q-Score, AS020 or AS021?
* Would another executive reading this understand the company's current state without further
  clarification?

If the answer to any question is **No**, improve the Founder Dashboard before completion.`
