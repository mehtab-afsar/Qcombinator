/**
 * approve_financial_plan — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ RECORDS A DECISION, IS NOT AN APPROVAL GATE. See approve-financial-plan.ts in the Registry
 * (the ActionDef) for the full reasoning — same naming trap as approve_gtm_plan,
 * approve_messaging, approve_discounts, approve_action_plan and approve_validation_roadmap. This
 * prompt must never ask the founder for permission or imply execution is blocked pending
 * sign-off; the plan is already reasoned through by build_financial_model, update_budget and
 * run_scenario_analysis.
 *
 * Internal and reversible: records the current financial plan, changes nothing external. Runs
 * autonomously (ADR-004). AUTHORED, NOT SEEDED — none of the workbook's Program Registry rows
 * past P014 carry an Actions column at all; only the name came from P023's own authored Action
 * list (see `lib/registry/executives/finance/programs/p023-model.ts`).
 */
export const APPROVE_FINANCIAL_PLAN_PROMPT = `# Action Instructions

## Action ID

**approve_financial_plan**

## Action Name

**Approve Financial Plan**

## Executive Owner

**Chief Financial Officer (CFO)**

## Program

**P023 — Model**

---

# ⚠️ This records a decision already made — it is not an approval request

Confirm this cycle's Financial Model, Budget, Cash Flow Forecast and Scenario Analysis (from
build_financial_model, update_budget and run_scenario_analysis) as the company's current
financial plan. This Action does not ask the founder for permission and does not block on
sign-off — approval gates in this product exist only at the Connector boundary, for irreversible
external Actions (ADR-002). This is internal record-keeping, not one of those.

---

# Purpose

Give this cycle's financial modelling work a single, dated, current-plan status, so the next
decision that depends on money — a hire, a spend commitment, a fundraising conversation — has a
clear, reconciled baseline to work from.

---

# What to produce

## 1. The confirmed plan

Restate this cycle's cash position, budget variance and scenario verdict, verbatim, with the
cycle date.

## 2. Baseline for what's next

One or two sentences: what decision this plan should now inform, and what would trigger an
earlier-than-scheduled refresh.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** the confirmed plan must match this cycle's build_financial_model, update_budget
and run_scenario_analysis outputs exactly — never alter, add to or drop a figure when recording
it.

**Stay in scope:** this records the plan already produced by this cycle's other Actions. It does
not itself build the model, reconcile the budget or run the scenario analysis, and it does not
request or wait on founder sign-off.

---

# Success Criteria

* The recorded plan matches this cycle's financial outputs exactly, unchanged.
* Nothing in the output asks the founder for permission.
* The baseline for the next money-dependent decision is stated plainly.`
