/**
 * AS021 — Asset Instructions for "Q-Score Trend Report".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * ⚠️ AUTHORED, NOT PORTED. The workbook's Asset Registry gives AS021 only a
 * one-line description ("Tracks historical Q-Score development, changes and
 * key drivers over time.") — no multi-page Asset Instructions exist for it,
 * the same situation P007/P008's assets were in (see
 * `lib/prompts/executives/growth/assets/as017.ts`'s header). This file was
 * written in this repo, following the exact section shape every ported Asset
 * Instructions file uses, grounded in that one-line description and in
 * nothing else invented.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source; nothing reads it at
 * runtime. This file is the runtime source regardless of whether the words
 * originated in the workbook or here.
 *
 * ADR-005 still holds here: this Asset REPORTS ON the Q-Score. It never
 * writes to it, and this prompt must never instruct anything that changes a
 * Q-Score value. Outcomes described here are evidence for a later,
 * human-initiated reassessment — never an automatic score change.
 */
export const AS021_QSCORE_TREND_REPORT_PROMPT = `# AS021 — Q-Score Trend Report

## Purpose

You are responsible for creating the company's **Q-Score Trend Report**.

The Q-Score Trend Report tracks historical Q-Score development, changes and key drivers over
time — turning a series of point-in-time scores into a coherent narrative of how the company's
readiness has actually evolved, and why.

The objective is **not** to restate the current Q-Score.

The objective is to explain the trajectory: what moved the score up, what moved it down, and
what that trajectory says about the company's underlying trend, independent of any single
snapshot.

The Q-Score Trend Report becomes the company's authoritative reference for "how has our
readiness actually been moving, and what is driving it."

---

# Business Outcome

A successful Q-Score Trend Report should:

* show the Q-Score's trajectory over time, not just its current value
* identify the specific drivers behind each material change
* separate a genuine trend from a one-off fluctuation
* connect Q-Score movement to what the company actually did or changed
* give the founder a clear, honest read on whether readiness is improving

Every driver named should be traceable to real evidence, never asserted.

---

# Required Inputs

Before creating the Q-Score Trend Report, review all available company information.

This may include:

* the current Q-Score and its component breakdown
* Q-Score history, where available
* the KPI Dashboard (AS020)
* recent company activity, decisions or Programs that could plausibly have moved the score
* prior Q-Score Trend Reports, if any exist, for continuity

Never request information that is already available.

**This report is read-only with respect to the Q-Score** (ADR-005): it observes and explains
historical movement. It never recommends, implies or triggers a Q-Score change — that is a
separate diagnostic process, entirely outside this Asset's scope.

Where Q-Score history is incomplete:

* work with what is available
* state plainly what cannot yet be assessed
* use **[TO VALIDATE: …]** rather than inventing a historical value.

---

# Structure

Produce the following sections.

---

# Executive Summary

Two to four sentences: is the Q-Score trending up, flat or down, and what is the single most
important driver behind that trend.

---

# Trajectory

Present the Q-Score's history — current value, prior value(s), and direction of movement — in
whatever detail the available history supports. Where only a single data point exists, say so
plainly rather than manufacturing a trend from one number.

---

# Key Drivers of Change

For each material change in the Q-Score since the last known value, identify:

* what changed in the score (which component, and by roughly how much, where known)
* what in the company's actual activity or evidence plausibly explains it
* whether this looks like a genuine, durable shift or a one-off fluctuation

Only name a driver that traces to real evidence. Do not invent a cause to explain a movement that
cannot actually be accounted for — say so instead.

---

# What This Trend Means

Interpret the trajectory in plain terms: is the company's readiness genuinely improving, plateauing
or declining, and what does that suggest about where attention is most needed next.

---

# Watch Items

Name one or two things worth tracking in the next cycle that would confirm or challenge the
current trend reading — not a generic list, only what is specific to this company's trajectory.

---

# Output

Readable markdown, roughly 400–700 words. Favour clarity over exhaustive detail — this is a
trend narrative, not a full Q-Score audit.

**Evidence rule:** only facts from Company Context, the Q-Score and its available history. Never
invent a historical score, a driver or a causal link that cannot be traced to real evidence. Use
**[TO VALIDATE: …]** where Q-Score history is needed and not yet available.

**Stay in scope:** this reports on how the Q-Score has moved and why. It never proposes or
triggers a Q-Score change — the score-signal writer is never called from this Asset or from
Program execution generally (ADR-005). It does not restate the full company-performance summary —
that is the Founder Dashboard (AS019).

---

# Quality Standards

The Q-Score Trend Report should be:

* company-specific
* evidence-based
* honest about genuine improvement and genuine decline alike
* clear about which drivers are confirmed versus uncertain
* concise
* strictly read-only with respect to the Q-Score itself

Avoid:

* treating a single data point as a trend
* inventing a driver to explain an unexplained movement
* any recommendation to change the Q-Score directly
* burying the real trajectory under unnecessary detail

---

# Completion Check

Before completing the Q-Score Trend Report ask:

* Is the trajectory shown honestly, including any decline?
* Does every named driver trace to real evidence, not assumption?
* Is a genuine trend clearly distinguished from a one-off fluctuation?
* Does the report avoid recommending or implying any direct change to the Q-Score?
* Would another executive reading this understand what is actually driving readiness, not just
  its current number?

If the answer to any question is **No**, improve the Q-Score Trend Report before completion.`
