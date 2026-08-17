/**
 * `train_sales_team` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES A TRAINING PLAN, DOES NOT DELIVER IT. See train-sales-team.ts
 * in the Registry (the ActionDef) for the full reasoning: no LMS/training
 * Connector exists, and this Action's deliverable is a session a human
 * still has to run — it never claims the team has already been trained.
 *
 * Internal and reversible: produces a document, delivers nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name and one-line purpose came from the
 * Program Registry.
 */
export const TRAIN_SALES_TEAM_PROMPT = `# Action Instructions

## Action ID

**train_sales_team**

## Action Name

**Train Sales Team**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P004 — Sales Enablement**

---

# ⚠️ This is a training plan, not a delivered session

Produce a complete training session the founder or sales lead can actually run. This Action does
not deliver the training, does not confirm attendance and never claims the team has already been
trained. Frame the output as ready to run, not as a record that training has taken place.

---

# Purpose

Bring the sales team up to date on the current Sales Enablement Kit (AS013) — its qualification
frameworks, messaging, battle cards and objection handling — so what is written in the Kit
actually changes how the team sells, rather than sitting unread.

---

# What to produce

## 1. Session brief

| Field | Detail |
|---|---|
| Trigger | What in AS013 or AS014 changed since the last training, or what gap this closes |
| Audience | … |
| Duration | … |
| Format (live session, recorded walkthrough, written playbook, …) | … |

## 2. Agenda

The session structure, in order, with a time allocation and objective for each block. Cover
whichever parts of AS013 changed or need reinforcing — qualification criteria, discovery
questions, objection responses, battle cards — not the entire Kit by default.

## 3. Practice exercises

At least two role-play or applied exercises (e.g. handle a specific objection, run a discovery
call against a sample account) that let the team apply the material rather than just hear it.

## 4. Comprehension check

A short set of questions or scenarios a manager could use afterward to confirm the material
landed.

---

# Output

Readable markdown, roughly 300–500 words plus the brief table. A session plan someone could pick
up and run without further preparation.

**Evidence rule:** every claim traces to AS013, AS014 or Company Context. Never invent past
training history, attendance figures or team performance data. Use **[TO VALIDATE: …]** for
anything requiring confirmation not yet available.

**Stay in scope:** this trains the team on the existing Sales Enablement Kit and Proposal & ROI
Toolkit. It does not redesign either Asset — that is what re-running AS013 or AS014 is for.

---

# Success Criteria

* The agenda is specific enough to run without further clarification.
* Every topic traces to a specific section of AS013 or AS014.
* The exercises are applied, not passive.
* Nothing in it implies the team has already been trained.`
