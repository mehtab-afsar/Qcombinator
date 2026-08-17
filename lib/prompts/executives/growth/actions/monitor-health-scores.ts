/**
 * `monitor_health_scores` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: scores a batch of customers against AS016's
 * Customer Health Score Framework, writes nothing to a live system. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const MONITOR_HEALTH_SCORES_PROMPT = `# Action Instructions

## Action ID

**monitor_health_scores**

## Action Name

**Monitor Health Scores**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P006 — Customer Success**

---

# Purpose

Score and tier a batch of customers against the Customer Success Framework's (AS016) Customer
Health Score Framework — product usage, engagement, business outcomes achieved, support activity,
executive engagement, commercial relationship, satisfaction, renewal likelihood — so risk surfaces
before a customer churns instead of at the renewal conversation.

---

# What to produce

## 1. Batch summary

| Field | Detail |
|---|---|
| Number of customers scored | … |
| Health categories and escalation criteria in effect (AS016) | … |
| Data sources used (usage data, support requests, feedback, renewal pipeline) | … |

## 2. Scored customers

| Customer | Product usage | Engagement | Business outcomes achieved | Support activity | Executive engagement | Commercial relationship | Composite health score | Category (healthy / at-risk / critical) |

Score each customer against every AS016 indicator individually before combining into a composite —
strong product usage should never silently mask weak executive engagement or a stalled renewal.

## 3. At-risk and critical detail

For every customer landing in the at-risk or critical category, one or two sentences on the
specific indicator driving that call and the earliest point the risk became visible — so the
response is targeted, not generic outreach.

## 4. Recommended interventions

State the recommended intervention per category, tied to AS016's escalation criteria — critical
accounts to executive engagement or a renewal risk review, at-risk accounts to a targeted
touchpoint, healthy accounts to expansion consideration (see launch_upsell_campaign).

---

# Output

Readable markdown, one scored table plus the summary and intervention guidance. Length follows
batch size — do not pad.

**Evidence rule:** every score traces to a specific AS016 indicator and to information actually
available about the customer. Never invent usage figures, feedback or renewal signals not
provided. Use **[TO VALIDATE: …]** for any indicator needed but not yet confirmed.

**Stay in scope:** this scores customers against the existing Customer Health Score Framework. It
does not redesign the Framework or its thresholds — that is what re-running AS016 is for. It does
not run the QBR or feedback collection that a health signal might prompt — those are conduct_qbr
and collect_feedback.

---

# Success Criteria

* Every customer is scored on all AS016 indicators, not a single blended guess.
* The composite score and category are explainable, not a black box.
* Every at-risk or critical customer has a stated reason and earliest warning point.
* Recommended interventions are specific enough to act on immediately.`
