/**
 * `update_crm` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ RECOMMENDS CRM CHANGES, DOES NOT WRITE THEM. See update-crm.ts in the
 * Registry (the ActionDef) for the full reasoning: no CRM Connector exists,
 * and this Action's output is a set of proposed record/stage changes a human
 * still has to apply in the CRM itself.
 *
 * Internal and reversible: produces a document, writes nothing to a live
 * system. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's
 * Action Registry sheet is empty; only the name came from the Program
 * Registry.
 */
export const UPDATE_CRM_PROMPT = `# Action Instructions

## Action ID

**update_crm**

## Action Name

**Update CRM**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# ⚠️ This is a set of recommended changes, not a live CRM write

Produce the specific pipeline-stage and record updates a set of leads or opportunities needs. This
Action does not connect to any CRM and does not change any live record — it never claims the CRM
has already been updated. Frame the output as ready to apply, not as confirmation the change has
happened.

---

# Read your live pipeline first

Company Context includes **"Your Lead Pipeline"** — the founder's real lead records as they stand
right now: company, role, contact name where one is known, current status, fit score, and whether a
verified email is on file. That is the live table, including any status the founder changed by
hand since the last cycle.

Work from those records. Where an earlier step in this chain also appears in Company Context, treat
it as that step's reasoning — the pipeline is the current state of the world.

Addresses are deliberately not listed there. If a lead shows no email yet, say what would be needed
rather than inventing one.

---

# Purpose

Keep the CRM's pipeline stages and records honest against what has actually happened with each
lead or opportunity — using the Customer Acquisition Blueprint's (AS015) CRM Strategy (pipeline
stages, lifecycle, data quality standards) — so reporting and forecasting reflect reality instead
of drifting from whatever a rep last updated by hand.

---

# What to produce

## 1. Batch context

| Field | Detail |
|---|---|
| Source of this batch (qualify_leads output, follow_up_prospects outcomes, other) | … |
| Number of records reviewed | … |
| Pipeline stages in effect (AS015 CRM Strategy) | … |

## 2. Recommended updates

| Lead / opportunity | Current stage (assumed) | Recommended stage | Reason (tie to AS015 transition criteria) | Other record updates (owner, next action date, disqualify reason) |

Every stage change should map to a specific transition criterion from AS015's CRM Strategy — never
a stage move justified only by time elapsed.

## 3. Data quality flags

Any records where required fields are missing or inconsistent against AS015's data quality
standards, so those gaps get fixed rather than silently carried forward.

---

# Output

Readable markdown, one recommended-updates table plus the batch context and data quality flags.
Length follows batch size — do not pad.

**Evidence rule:** every recommended stage change traces to a specific AS015 transition criterion
and to information actually available about the lead. Never invent activity history, deal size or
contact detail not provided. Use **[TO VALIDATE: …]** for anything needed but not yet confirmed.

**Stay in scope:** this recommends updates against the existing CRM Strategy. It does not redesign
pipeline stages or the CRM operating model itself — that is what re-running AS015 is for. It does
not write to any system — that requires a human or a future CRM Connector.

---

# Success Criteria

* Every recommended stage change ties to a specific AS015 transition criterion.
* Data quality gaps are flagged, not silently ignored.
* The output is specific enough that a human could apply it directly in the CRM.
* Nothing in the output implies the CRM has already been changed.`
