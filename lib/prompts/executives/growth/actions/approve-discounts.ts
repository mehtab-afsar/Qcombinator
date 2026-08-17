/**
 * `approve_discounts` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ THE NAME IS MISLEADING, same trap as P001's `approve_gtm_plan` and P002's `approve_messaging`
 * (see those files for the full reasoning). "Approve" here does NOT mean an approval gate, and it
 * does NOT authorise any individual discount transaction. This Action records the discount
 * governance the company has already decided to operate to — it does not ask permission, block
 * the Program, or create a waiting state. ADR-002 removed that gate deliberately; the only
 * checkpoint in this product is at the Connector boundary (ADR-004), and there is no discount- or
 * price-writing Connector here regardless. If a future reader is tempted to make this ask the
 * founder for sign-off on a specific discount, they are rebuilding the gate the PRD removed.
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const APPROVE_DISCOUNTS_PROMPT = `# Action Instructions

## Action ID

**approve_discounts**

## Action Name

**Approve Discounts**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P007 — Pricing & Packaging**

---

# ⚠️ What this Action is, and is not

This **records** the discount governance the company is now operating to. It is a governance
record, written after the thinking is done.

It is **not** a request for approval, and it is **not** a sign-off on any individual customer
discount. Do not ask the founder to confirm, sign off, review or authorise anything. Do not
describe the discount policy as "proposed", "draft" or "pending". The founder set commercial
direction once, in the Executive Contract; Programs run to it without asking again.

Write in the past and present tense of a decision taken — not the conditional tense of a proposal
awaiting a yes.

---

# Purpose

Produce the short, durable record of the discount governance this company operates to as of
today: approval levels, maximum thresholds, prohibited discounting — drawn from AS017's Discount
Policy section rather than invented here.

---

# What to produce

## 1. The governance in one paragraph

The discount philosophy and its purpose, in one paragraph someone joining next week could read
once and use immediately.

## 2. The thresholds

| Discount level | Maximum threshold | Who may approve it | Drawn from |
|---|---|---|---|

Every row must trace to AS017's Discount Policy. If AS017 does not yet support a row, write
**[TO VALIDATE: …]** rather than inventing the threshold here — this Action records decisions, it
does not make new ones.

## 3. What is explicitly prohibited

The discount situations AS017 rules out entirely, and why. A governance record that permits
everything has governed nothing.

## 4. Known weaknesses

The parts of current discount practice resting on assumption rather than evidence, taken from
AS017's own confidence levels. State them plainly.

---

# Output

Readable markdown, roughly 300–500 words. Concise: this is a reference document people re-read,
not an essay.

**Evidence rule:** everything traces to AS017 and Company Context. Never invent thresholds, deal
values or approval names. Date the record with the Current Date from Company Context; if it is
absent, omit dates entirely rather than guessing one.

---

# Success Criteria

* A new team member reads it once and knows what discounting is and is not allowed.
* Every threshold traces to AS017.
* Prohibited situations are explicit.
* Nothing in it asks the founder for permission, and nothing in it approves a specific customer's
  discount.`
