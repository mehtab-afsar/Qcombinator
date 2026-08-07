/**
 * `approve_gtm_plan` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ THE NAME IS MISLEADING and the Registry entry says so at length: "approve" here is NOT an
 * approval gate. This Action **records a decision that has already been taken** — it does not
 * ask permission, block a Program, or create a waiting state. ADR-002 removed that gate
 * deliberately; the only checkpoint in this product is at the Connector boundary (ADR-004).
 *
 * So this prompt must never produce anything resembling a request for sign-off. If a future
 * reader is tempted to make it one, they are rebuilding the gate the PRD removed.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const APPROVE_GTM_PLAN_PROMPT = `# Action Instructions

## Action ID

**approve_gtm_plan**

## Action Name

**Approve GTM Plan**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# ⚠️ What this Action is, and is not

This **records** the go-to-market plan the company is now operating to. It is a commitment
record, written after the thinking is done.

It is **not** a request for approval. Do not ask the founder to confirm, sign off, review or
authorise anything. Do not describe the plan as "proposed", "draft" or "pending". The founder
set direction once, in the Executive Contract; Programs run to it without asking again.

Write in the past and present tense of a decision taken — not the conditional tense of a
proposal awaiting a yes.

---

# Purpose

Produce the short, durable record of what this company's GTM plan **is** as of today: who it
sells to, through what, saying what, and how it will know the plan is working. It is the
one-page answer to "what are we actually doing?" — drawn from AS001–AS005 rather than invented
here.

---

# What to produce

## 1. The plan in one paragraph

Who the company sells to, through which channel, with what core message, and what it expects to
see. Written so someone joining next week understands the commitment immediately.

## 2. The commitments

| Area | What we are doing | Drawn from |
|---|---|---|
| Target customer | … | AS001 |
| Primary channel | … | AS005 |
| Core message | … | AS004 |
| Buying motion | … | AS003 |

Every row must trace to an Asset. If an Asset does not yet support a row, write
**[TO VALIDATE: …]** rather than inventing the commitment here — this Action records decisions,
it does not make new ones.

## 3. How we will know it is working

Two or three observable signals with the timeframe to expect them. Signals, not vanity metrics:
something that would genuinely change the plan if it failed to appear.

## 4. What this plan explicitly does not include

The segments, channels and motions deliberately out of scope this quarter. A plan that excludes
nothing has committed to nothing.

## 5. Known weaknesses

The parts resting on assumption rather than evidence, taken from the Assets' own confidence
levels. State them plainly — this record is more valuable for being honest about where it is
thin, and a founder reading it in three months needs to know which parts were guesses.

---

# Output

Readable markdown, roughly 400–600 words. Concise: this is a reference document people re-read,
not an essay.

**Evidence rule:** everything traces to AS001–AS005 and Company Context. Never invent metrics,
customers, results or dates. Date the record with the Current Date from Company Context; if it
is absent, omit dates entirely rather than guessing one.

---

# Success Criteria

* A new team member reads it once and knows what the company is doing commercially.
* Every commitment traces to an Asset.
* Exclusions are explicit.
* Weaknesses are stated rather than smoothed over.
* Nothing in it asks the founder for permission.`
