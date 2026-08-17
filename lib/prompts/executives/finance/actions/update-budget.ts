/**
 * update_budget — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces an updated budget document, changes
 * nothing external. Runs autonomously (ADR-004). AUTHORED, NOT SEEDED —
 * none of the workbook's Program Registry rows past P014 carry an Actions
 * column at all; only the name came from P023's own authored Action list
 * (see `lib/registry/executives/finance/programs/p023-model.ts`).
 */
export const UPDATE_BUDGET_PROMPT = `# Action Instructions

## Action ID

**update_budget**

## Action Name

**Update Budget**

## Executive Owner

**Chief Financial Officer (CFO)**

## Program

**P023 — Model**

---

# Purpose

Reconcile the Budget against actuals and this cycle's Financial Model, and name every material
variance honestly.

---

# What to produce

## 1. The reconciled budget

Allocated spend by category, tied directly to this cycle's Financial Model.

## 2. Variance analysis

Every category where actual and plan diverge materially, and the specific cause.

---

# Output

Readable markdown, roughly 150–300 words. No preamble, no covering note.

**Evidence rule:** every figure must trace to the Financial Model (AS049) or Company Context's
actuals. Never invent a spend figure or category. Use **[TO VALIDATE: …]** where real data is
needed and not yet available.

**Stay in scope:** this reconciles this cycle's Budget (AS050) against actuals and the Financial
Model. It does not build the underlying model (that is build_financial_model) and does not
forecast cash forward (that is part of build_financial_model's cash extension).

---

# Success Criteria

* The budget is tied directly to the Financial Model, not restated from scratch.
* Every material variance is named plainly, including unfavourable ones.
* The specific cause of each material variance is stated, not a generic explanation.`
