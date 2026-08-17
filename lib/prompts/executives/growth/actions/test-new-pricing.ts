/**
 * `test_new_pricing` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DESIGNS AN EXPERIMENT, DOES NOT CHANGE A LIVE PRICE. See test-new-pricing.ts in the Registry
 * (the ActionDef) for the full reasoning: the registered Stripe connector is read/sync only
 * (billing status) — there is no connector capability to actually change a live price today. This
 * prompt must never claim a price has changed; it produces a test plan a human still has to run.
 *
 * Internal and reversible: produces a document, changes nothing live. Runs autonomously
 * (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const TEST_NEW_PRICING_PROMPT = `# Action Instructions

## Action ID

**test_new_pricing**

## Action Name

**Test New Pricing**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P007 — Pricing & Packaging**

---

# ⚠️ This is a test plan, not a live price change

Produce a structured design for a pricing or packaging experiment. This Action does not connect to
Stripe or any billing system and does not change any live price — it never claims a new price is
already in effect. Frame the output as ready for a human to execute, not as confirmation the test
has run.

---

# Purpose

Turn a proposed pricing or packaging change — from review_pricing's findings, a new AS017 revision,
or a founder question — into a structured experiment design, so a pricing change is validated with
evidence before it is rolled out rather than decided by instinct.

---

# What to produce

## 1. Hypothesis

The specific change being tested (a price point, a package boundary, a discount mechanism) and
the specific customer-value or price-sensitivity claim from AS017 it is meant to validate or
challenge.

## 2. Test design

| Field | Detail |
|---|---|
| Segment or cohort tested | … |
| Control vs. test group | … |
| Mechanism (new-customer pricing, cohort test, Van Westendorp survey, other) | … |
| Duration | … |
| What stays unchanged for existing customers | … |

## 3. Success criteria

The specific metric and threshold that would confirm the hypothesis (realised price, conversion
rate, win rate, stated willingness-to-pay), tied to AS017's Success Metrics — not a vague
"see how it goes."

## 4. Risks and guardrails

What could go wrong (existing-customer confusion, competitive exposure, sales team
inconsistency) and the guardrail that limits exposure until the test proves out.

---

# Output

Readable markdown: hypothesis, test design table, success criteria and risks. Length follows the
complexity of the test — do not pad.

**Evidence rule:** every hypothesis and threshold traces to AS017 or Company Context. Never invent
customer counts, revenue figures or prior test results not present in the source material. Use
**[TO VALIDATE: …]** for anything requiring confirmation before the test can launch.

**Stay in scope:** this designs one experiment against the existing Pricing & Packaging Strategy.
It does not redesign the strategy itself — that is what re-running AS017 is for. It does not
execute the test or touch any live pricing system.

---

# Success Criteria

* The hypothesis names a specific AS017 claim being tested, not a vague "try a new price."
* The test design isolates the variable being tested from everything else.
* Success criteria are measurable and threshold-based, not subjective.
* Nothing in the output implies a live price has already changed.`
