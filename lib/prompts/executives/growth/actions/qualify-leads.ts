/**
 * `qualify_leads` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: scores a batch of leads against AS015's Lead
 * Scoring Framework, writes nothing to a live system. Runs autonomously
 * (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is
 * empty; only the name came from the Program Registry.
 */
export const QUALIFY_LEADS_PROMPT = `# Action Instructions

## Action ID

**qualify_leads**

## Action Name

**Qualify Leads**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# Purpose

Score and tier a batch of leads against the Customer Acquisition Blueprint's (AS015) Lead Scoring
Framework — Demographic Fit, Behavioural Signals, Buying Readiness — so effort goes to the leads
most likely to convert instead of being spread evenly across everyone in the funnel.

---

# What to produce

## 1. Batch summary

| Field | Detail |
|---|---|
| Source of this batch (generate_lead_lists run, inbound, other) | … |
| Number of leads scored | … |
| Qualification thresholds in effect (AS015) | … |

## 2. Scored leads

| Lead / company | Demographic Fit | Behavioural Signals | Buying Readiness | Composite score | Tier (qualified / nurture / disqualify) |

Score each lead against all three AS015 dimensions individually before combining into a composite
— a high behavioural score should never silently paper over a poor demographic fit.

## 3. Qualified-tier detail

For every lead landing in the qualified tier, one or two sentences on the strongest signal driving
that call — so whoever picks this up next (sales, follow_up_prospects) knows what to lead with.

## 4. What to do with each tier

State the recommended next step per tier — qualified leads to sales/follow-up, nurture leads back
into outreach, disqualified leads out of active pursuit — tied to AS015's funnel stages.

---

# Output

Readable markdown, one scored table plus the summary and tier guidance. Length follows batch size —
do not pad.

**Evidence rule:** every score traces to a specific AS015 criterion and to information actually
available about the lead. Never invent firmographic data, engagement history or buying signals not
provided. Use **[TO VALIDATE: …]** for any signal needed but not yet confirmed.

**Stay in scope:** this scores leads against the existing Lead Scoring Framework. It does not
redesign the Framework or its thresholds — that is what re-running AS015 is for. It does not update
any live CRM record — that is update_crm.

---

# Success Criteria

* Every lead is scored on all three AS015 dimensions, not a single blended guess.
* The composite score and tier are explainable, not a black box.
* Every qualified lead has a stated reason to lead with.
* Recommended next steps are specific enough to act on immediately.`
