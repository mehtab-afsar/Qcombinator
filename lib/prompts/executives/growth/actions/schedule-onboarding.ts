/**
 * `schedule_onboarding` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES A PLAN, NOT A CALENDAR BOOKING. See schedule-onboarding.ts in
 * the Registry (the ActionDef) for the full reasoning: no calendar Connector
 * exists, and this Action's output is a ready-to-schedule plan a human still
 * has to put on the calendar.
 *
 * Internal and reversible: produces a document, books nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const SCHEDULE_ONBOARDING_PROMPT = `# Action Instructions

## Action ID

**schedule_onboarding**

## Action Name

**Schedule Onboarding**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P006 — Customer Success**

---

# ⚠️ This is an onboarding plan, not a calendar booking

Produce a structured onboarding plan for a newly signed customer. This Action does not connect to
any calendar and does not book any session — it never claims a meeting has already been scheduled.
Frame the output as ready for a human to put on the calendar.

---

# Purpose

Turn a new signing into a structured onboarding plan, built on the Customer Success Framework's
(AS016) Onboarding Framework and Customer Success Lifecycle — so onboarding starts from a
deliberate, milestone-based plan instead of an ad hoc kickoff call.

---

# What to produce

## 1. Customer context

| Field | Detail |
|---|---|
| Customer / segment | … |
| Products or services purchased | … |
| Customer's stated objectives (from Required Inputs, where known) | … |
| Executive stakeholders on the customer side | … |

## 2. Onboarding milestones

A structured table of onboarding sessions and milestones — welcome, implementation, training,
first value checkpoint — each with an objective, owner, target timing (days/weeks from contract
signature) and the success criterion that marks it complete, per AS016's Onboarding Framework.

## 3. Time-to-value objective

State the specific outcome and timeframe that defines a successful onboarding for this customer,
tied to AS016's time-to-value objectives — not a generic "onboarding complete" checkbox.

## 4. Risks to a smooth start

Anything already known (from Required Inputs) that could slow onboarding — missing stakeholder
access, technical dependencies, competing priorities — so it can be addressed before it becomes a
delay.

---

# Output

Readable markdown: the customer context table, the milestone table, and the risk list. Length
follows the complexity of the onboarding — do not pad.

**Evidence rule:** every milestone and objective traces to AS016's Onboarding Framework or Company
Context. Never invent customer names, commitments or timelines not present in the source material.
Use **[TO VALIDATE: …]** for anything requiring confirmation from the customer before the plan is
finalised.

**Stay in scope:** this plans onboarding for one customer against the existing Customer Success
Framework. It does not redesign the Onboarding Framework itself — that is what re-running AS016 is
for. It does not run the QBR that follows onboarding — that is conduct_qbr.

---

# Success Criteria

* Every milestone has an owner, a timing and a success criterion.
* The time-to-value objective is specific, not generic.
* Known risks to onboarding are surfaced, not silently omitted.
* The plan is immediately usable to schedule the first session.`
