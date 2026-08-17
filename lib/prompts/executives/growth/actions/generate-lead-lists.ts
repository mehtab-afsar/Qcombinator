/**
 * `generate_lead_lists` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES A LIST, NOT A DATA PULL. See generate-lead-lists.ts in the
 * Registry (the ActionDef) for the full reasoning: no prospecting/enrichment
 * Connector exists, and this Action's output is a prioritised target list a
 * human still has to load into outreach tooling or the CRM.
 *
 * Internal and reversible: produces a document, contacts nobody. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const GENERATE_LEAD_LISTS_PROMPT = `# Action Instructions

## Action ID

**generate_lead_lists**

## Action Name

**Generate Lead Lists**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# ⚠️ This is a target list, not a live data pull

Produce a prioritised list of prospect companies and contacts a human can load into outreach
tooling or the CRM. This Action does not query any external data source or prospecting tool, and
never claims the contacts have been verified against one. Mark anything that needs real-world
verification before use.

---

# Purpose

Turn the Customer Acquisition Blueprint's (AS015) ICP, Bullseye channel prioritisation and Lead
Scoring Framework into a concrete, ranked set of companies and contacts worth pursuing right now —
so outreach starts from a deliberate target list instead of whoever is easiest to find.

---

# What to produce

## 1. Targeting brief

| Field | Detail |
|---|---|
| Segment / ICP tier this list serves (AS015) | … |
| Primary channel this list supports (AS015 Bullseye) | … |
| Target list size | … |
| Sourcing approach (the method, not a live query) | … |

## 2. The list

A structured table of prospect companies (and, where the segment calls for named contacts, the
likely buyer/influencer role) ranked by fit against the ICP and Demographic Fit criteria in AS015's
Lead Scoring Framework. Group by priority tier — do not present a flat, unranked list.

## 3. Rationale per tier

For the top tier specifically, one or two sentences on why these accounts rank highest — which
Demographic Fit and Behavioural Signal criteria they best match.

---

# Output

Readable markdown, one ranked table plus the brief. Length follows the list size — do not pad with
narrative.

**Evidence rule:** every fit judgement traces to AS015's ICP and Lead Scoring Framework or Company
Context. Never invent company names, contact names, firmographic data or verified detail not
present in the source material. Use **[TO VALIDATE: …]** for any company or contact that needs
real-world confirmation before outreach.

**Stay in scope:** this ranks and lists prospects against the existing Customer Acquisition
Blueprint. It does not redesign the ICP or Lead Scoring Framework itself — that is what re-running
AS015 is for. It does not draft outreach copy — that is launch_outreach.

---

# Success Criteria

* Every prospect is ranked, not just listed.
* The ranking traces to specific AS015 criteria, not general impressions.
* Anything requiring real-world verification is flagged, not presented as confirmed.
* The list is immediately usable to plan the next outreach run.`
