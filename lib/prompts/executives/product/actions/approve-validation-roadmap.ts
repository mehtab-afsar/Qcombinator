/**
 * approve_validation_roadmap — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ RECORDS A DECISION, IS NOT AN APPROVAL GATE. See approve-validation-roadmap.ts in the
 * Registry (the ActionDef) for the full reasoning — same naming trap as approve_gtm_plan,
 * approve_messaging, approve_discounts and approve_action_plan. This prompt must never ask the
 * founder for permission or imply execution is blocked pending sign-off; the roadmap is already
 * reasoned through by score_product_market_fit, validate_customer_problem and
 * prioritize_features.
 *
 * Internal and reversible: records the current validation roadmap, changes nothing external.
 * Runs autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the workbook's Program Registry
 * rows past P014 carry an Actions column at all; only the name came from P015's own authored
 * Action list (see `lib/registry/executives/product/programs/p015-validate.ts`).
 */
export const APPROVE_VALIDATION_ROADMAP_PROMPT = `# Action Instructions

## Action ID

**approve_validation_roadmap**

## Action Name

**Approve Validation Roadmap**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P015 — Validate**

---

# ⚠️ This records a decision already made — it is not an approval request

Confirm this cycle's PMF read, validated problems and ranked feature priorities (from
score_product_market_fit, validate_customer_problem and prioritize_features) as the company's
current Validation Roadmap. This Action does not ask the founder for permission and does not
block on sign-off — approval gates in this product exist only at the Connector boundary, for
irreversible external Actions (ADR-002). This is internal record-keeping, not one of those.

---

# Purpose

Give this cycle's validation results a single, dated, current-roadmap status, so the next Program
in the Product portfolio (P016 — Product, P017 — Build) has a clear baseline to build from.

---

# What to produce

## 1. The confirmed roadmap

Restate this cycle's PMF verdict, validated problems and ranked feature priorities, verbatim,
with the cycle date.

## 2. Baseline for what's next

One or two sentences: what P016 or P017 should treat as the current, evidenced starting point.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** the confirmed roadmap must match this cycle's score_product_market_fit,
validate_customer_problem and prioritize_features outputs exactly — never alter, add to or drop
an item when recording it.

**Stay in scope:** this records the roadmap already produced by this cycle's other Actions. It
does not itself score fit, validate a problem or rank a feature, and it does not request or wait
on founder sign-off.

---

# Success Criteria

* The recorded roadmap matches this cycle's validation outputs exactly, unchanged.
* Nothing in the output asks the founder for permission.
* The baseline for the next Program is stated plainly.`
