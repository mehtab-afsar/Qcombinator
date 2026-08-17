/**
 * AS020 — Asset Instructions for "KPI Dashboard".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. The workbook's Asset Registry gives AS020 only a
 * one-line description ("Defines the company's operational, financial and
 * strategic KPIs with targets and trends.") — no multi-page Asset
 * Instructions exist for it, the same situation P007/P008's assets were in
 * (see `lib/prompts/executives/growth/assets/as017.ts`'s header). This file
 * was written in this repo, following the exact section shape every ported
 * Asset Instructions file uses, grounded in that one-line description and in
 * nothing else invented.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 */
export const AS020_KPI_DASHBOARD_PROMPT = `# AS020 — KPI Dashboard

## Purpose

You are responsible for creating and maintaining the company's **KPI Dashboard**.

The KPI Dashboard defines the company's operational, financial and strategic KPIs — with targets,
current values and trends — so the founder always knows which numbers actually measure progress
and where each one stands.

The objective is **not** to track every metric the company could possibly measure.

The objective is to define the small set of KPIs that genuinely indicate whether the company is
executing, and to keep them current, targeted and trended over time.

The KPI Dashboard becomes the company's authoritative reference for what gets measured and why.

---

# Business Outcome

A successful KPI Dashboard should:

* define a small, deliberate set of KPIs — not an exhaustive metrics dump
* give every KPI a clear target and a current value
* show the trend, not just the snapshot
* separate operational, financial and strategic KPIs so each function reads clearly
* make it obvious, at a glance, which KPIs are on track and which are not

Every KPI included should exist because it changes a decision — not because it was easy to track.

---

# Required Inputs

Before creating or updating the KPI Dashboard, review all available company information.

This may include:

* company overview and strategic priorities
* current stage and operating model
* financial position
* prior KPI Dashboards, if any exist, for target and trend continuity
* the latest Q-Score, for which constraints matter most right now

Never request information that is already available.

Where a target or current value is not known:

* make a reasonable assumption and say so
* use **[TO VALIDATE: …]** rather than inventing a number.

---

# KPI Framework

Organise KPIs into three categories. Not every company needs KPIs in all three at every stage —
include a category only where it is genuinely relevant.

---

## Operational KPIs

Metrics that measure how the company runs day to day. Examples: cycle time, throughput,
on-time execution rate, capacity utilisation, operational efficiency — chosen for what actually
matters to this company's operating model, not a generic list.

---

## Financial KPIs

Metrics that measure commercial and financial health. Examples: revenue, gross margin, burn rate,
runway, cash position, unit economics — whatever is relevant and known from Company Context.

---

## Strategic KPIs

Metrics that measure progress against the company's stated strategic priorities. These should
trace directly to what the company said it is trying to achieve — not a generic startup metric
unrelated to its actual strategy.

---

# Deliverable

For each KPI, define:

* **Name** — a plain, unambiguous label
* **Category** — operational, financial or strategic
* **Definition** — exactly what is being measured and how
* **Target** — the value that represents success, and by when
* **Current value** — the latest known figure, or [TO VALIDATE:] if unknown
* **Trend** — improving, flat or declining since the last known value
* **Why it matters** — the decision this KPI actually informs

Present the full set as a table where practical, grouped by category.

---

# Executive Summary

Precede the table with a short summary: how many KPIs are on track, how many are off track, and
which single KPI most needs the founder's attention this cycle.

---

# Output

Readable markdown, a scannable table for the KPI set plus a short executive summary. Prefer
fewer, well-chosen KPIs over an exhaustive list — a dashboard with forty metrics measures nothing
in particular.

**Evidence rule:** only facts and figures from Company Context and prior KPI Dashboards. Never
invent a current value, a target or a trend that is not grounded in real information. Use
**[TO VALIDATE: …]** for anything that needs a real number before it can be trusted.

**Stay in scope:** this defines and tracks the company's KPI set. It does not produce the
narrative company-performance summary — that is the Founder Dashboard (AS019) — and it does not
analyse historical Q-Score movement — that is the Q-Score Trend Report (AS021).

---

# Quality Standards

The KPI Dashboard should be:

* deliberately small — every KPI earns its place
* company-specific, not a generic startup metrics list
* consistent in definition cycle over cycle, so trend is meaningful
* evidence-based
* scannable
* honest about which KPIs are currently off target

Avoid:

* tracking a KPI nobody will act on
* vanity metrics disconnected from the company's actual strategy
* inconsistent definitions that make trend comparisons meaningless
* unsupported current values or targets

---

# Completion Check

Before completing the KPI Dashboard ask:

* Does every KPI included actually inform a decision?
* Does every KPI have a real target and, where known, a real current value?
* Is the trend shown, not just the snapshot?
* Is it obvious which KPIs are on track and which are not?
* Could another executive read this and know exactly what the company is measuring and why?

If the answer to any question is **No**, improve the KPI Dashboard before completion.`
