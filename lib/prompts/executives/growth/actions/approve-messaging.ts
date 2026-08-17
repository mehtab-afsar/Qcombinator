/**
 * `approve_messaging` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan` (see that file for the full
 * reasoning). "Approve" here does NOT mean an approval gate. This Action records a decision that
 * has already been taken — it does not ask permission, block the Program, or create a waiting
 * state. ADR-002 removed that gate deliberately; the only checkpoint in this product is at the
 * Connector boundary (ADR-004). If a future reader is tempted to make this ask the founder for
 * sign-off, they are rebuilding the gate the PRD removed.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const APPROVE_MESSAGING_PROMPT = `# Action Instructions

## Action ID

**approve_messaging**

## Action Name

**Approve Messaging**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P002 — Brand Strategy**

---

# ⚠️ What this Action is, and is not

This **records** the brand messaging the company is now operating to. It is a commitment record,
written after the thinking is done.

It is **not** a request for approval. Do not ask the founder to confirm, sign off, review or
authorise anything. Do not describe the messaging as "proposed", "draft" or "pending". The
founder set direction once, in the Executive Contract; Programs run to it without asking again.

Write in the past and present tense of a decision taken — not the conditional tense of a
proposal awaiting a yes.

---

# Purpose

Produce the short, durable record of what this company's brand messaging **is** as of today: the
core narrative, the positioning, the voice — drawn from AS004, AS007, AS008 and AS009 rather than
invented here.

---

# What to produce

## 1. The messaging in one paragraph

The core narrative and positioning, in one paragraph someone joining next week could read once
and use immediately.

## 2. The commitments

| Area | What we say | Drawn from |
|---|---|---|
| Core narrative | … | AS009 |
| Positioning | … | AS004 |
| Brand voice | … | AS008 |
| Identity/archetype | … | AS007 |

Every row must trace to an Asset. If an Asset does not yet support a row, write
**[TO VALIDATE: …]** rather than inventing the commitment here — this Action records decisions,
it does not make new ones.

## 3. What this messaging explicitly does not claim

The positions and claims deliberately left out this cycle, and why. A messaging record that
claims everything has committed to nothing.

## 4. Known weaknesses

The parts resting on assumption rather than evidence, taken from the Assets' own confidence
levels. State them plainly.

---

# Output

Readable markdown, roughly 300–500 words. Concise: this is a reference document people re-read,
not an essay.

**Evidence rule:** everything traces to AS004/AS007/AS008/AS009 and Company Context. Never invent
claims, quotes or results. Date the record with the Current Date from Company Context; if it is
absent, omit dates entirely rather than guessing one.

---

# Success Criteria

* A new team member reads it once and knows what the company is currently saying about itself.
* Every commitment traces to an Asset.
* Exclusions are explicit.
* Nothing in it asks the founder for permission.`
