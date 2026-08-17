/**
 * approve_action_plan — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ RECORDS A DECISION, IS NOT AN APPROVAL GATE. See approve-action-plan.ts in the Registry (the
 * ActionDef) for the full reasoning — same naming trap as approve_gtm_plan, approve_messaging and
 * approve_discounts. This prompt must never ask the founder for permission or imply execution is
 * blocked pending sign-off; the plan is already reasoned through by identify_constraints and
 * assign_priorities.
 *
 * Internal and reversible: records the current operating plan, changes nothing external. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty;
 * only the name came from the Program Registry.
 */
export const APPROVE_ACTION_PLAN_PROMPT = `# Action Instructions

## Action ID

**approve_action_plan**

## Action Name

**Approve Action Plan**

## Executive Owner

**Chief Operating Officer (COO)**

## Program

**P009 — Review**

---

# ⚠️ This records a decision already made — it is not an approval request

Confirm this cycle's ranked priority list (from assign_priorities) as the company's current
operating plan. This Action does not ask the founder for permission and does not block on
sign-off — approval gates in this product exist only at the Connector boundary, for irreversible
external Actions (ADR-002). This is internal record-keeping, not one of those.

---

# Purpose

Give this cycle's ranked priorities (assign_priorities) a single, dated, current-operating-plan
status, so the next Monthly Business Review has a clear baseline to assess progress against.

---

# What to produce

## 1. The confirmed plan

Restate the ranked priorities from assign_priorities, verbatim, with the cycle date.

## 2. Baseline for next review

One or two sentences: what the next Monthly Business Review should check progress against, based
on this plan.

---

# Output

Readable markdown, roughly 100–250 words. No preamble, no covering note.

**Evidence rule:** the confirmed plan must match this cycle's assign_priorities output exactly —
never alter, add to or drop a priority when recording it.

**Stay in scope:** this records the plan already produced by assign_priorities. It does not itself
rank priorities and it does not request or wait on founder sign-off.

---

# Success Criteria

* The recorded plan matches assign_priorities exactly, unchanged.
* Nothing in the output asks the founder for permission.
* The baseline for the next review is stated plainly.`
