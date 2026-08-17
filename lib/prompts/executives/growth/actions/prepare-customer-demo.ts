/**
 * `prepare_customer_demo` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES A SCRIPT, DOES NOT RUN THE DEMO. See prepare-customer-demo.ts
 * in the Registry (the ActionDef) for the full reasoning: no demo/screen-share
 * Connector exists (or would make sense here), and this Action's output is a
 * talk track a rep still has to deliver live — it never claims a demo has
 * already happened.
 *
 * Internal and reversible: produces a document, delivers nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name and one-line purpose came from the
 * Program Registry.
 */
export const PREPARE_CUSTOMER_DEMO_PROMPT = `# Action Instructions

## Action ID

**prepare_customer_demo**

## Action Name

**Prepare Customer Demo**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P004 — Sales Enablement**

---

# ⚠️ This is a script, not a delivered demo

Produce a complete demo script a rep can actually deliver. This Action does not run the demo,
does not confirm it happened and never claims the customer has already seen it. Frame the output
as ready to deliver, not as a record that a demonstration took place.

---

# Purpose

Prepare a customer- or segment-specific demonstration, built on the Sales Enablement Kit's (AS013)
Product Demonstration Framework, so the demo focuses on this customer's problem and business
impact rather than a generic product walkthrough.

---

# What to produce

## 1. Demo brief

| Field | Detail |
|---|---|
| Customer / segment | … |
| Primary problem to address | … |
| Business outcome they care about | … |
| Stage in the sales process (AS013 Sales Conversation Flow) | … |
| Known objections to pre-empt | … |

## 2. Demo flow

The recommended sequence, drawn from AS013's Product Demonstration Framework: preparation,
opening, the specific capabilities to show and in what order, how each ties back to the customer's
problem, and the close. Every step should map to something in the brief — never a generic
feature-by-feature walkthrough.

## 3. Talk track

The key things to say at each step — framed around customer outcomes, not features — including how
to handle the objections named in the brief using AS013's Objection Handling Guide.

## 4. Proof points to use

Which specific case studies, results or evidence from AS013's Proof Library are most relevant to
this customer, and where in the flow to use them.

---

# Output

Readable markdown, roughly 300–500 words plus the brief table. A script someone could pick up and
deliver without further preparation.

**Evidence rule:** every claim traces to AS013 or Company Context. Never invent customer details,
results or specifics not present in the source material. Use **[TO VALIDATE: …]** for anything
requiring confirmation not yet available.

**Stay in scope:** this prepares one demo against the existing Sales Enablement Kit. It does not
redesign the Product Demonstration Framework itself — that is what re-running AS013 is for.

---

# Success Criteria

* The flow is specific to this customer's problem, not a generic walkthrough.
* Every step maps back to the demo brief.
* Objection responses and proof points trace to AS013.
* Nothing in it implies the demo has already been delivered.`
