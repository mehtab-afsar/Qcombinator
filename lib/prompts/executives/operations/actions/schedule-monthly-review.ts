/**
 * schedule_monthly_review — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a schedule and agenda, books nothing on a live calendar. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty;
 * only the name came from the Program Registry.
 */
export const SCHEDULE_MONTHLY_REVIEW_PROMPT = `# Action Instructions

## Action ID

**schedule_monthly_review**

## Action Name

**Schedule Monthly Review**

## Executive Owner

**Chief Operating Officer (COO)**

## Program

**P009 — Review**

---

# Purpose

Set the cadence and agenda for this cycle's Monthly Business Review: which KPIs will be assessed,
which Assets will be refreshed, and what the review needs to cover, drawn from the Founder
Dashboard (AS019) and KPI Dashboard (AS020).

---

# What to produce

## 1. Review cadence

State the review's cadence (monthly, per the Program name) and this cycle's target date, based on
Company Context and, where available, the date of the prior review.

## 2. Agenda

A short ordered agenda: the specific KPIs, Q-Score movements or financial items this review needs
to cover, drawn from what the KPI Dashboard (AS020) and Q-Score Trend Report (AS021) currently
flag as off track or materially changed.

## 3. Inputs needed

List anything referenced in the agenda that is not yet available in Company Context, flagged with
**[TO VALIDATE: …]**, so the review is not delayed discovering a gap mid-cycle.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** only facts from Company Context, AS019, AS020 and AS021. Never invent a prior
review date or a KPI status not present in the source material.

**Stay in scope:** this sets the cadence and agenda for the review. It does not assess KPIs itself
— that is review_kpis — and it does not book anything on a live calendar; no calendar Connector is
registered.

---

# Success Criteria

* The agenda is specific to what actually needs review this cycle, not a generic template.
* Every agenda item traces to AS019, AS020 or AS021.
* Missing inputs are flagged, not silently assumed.`
