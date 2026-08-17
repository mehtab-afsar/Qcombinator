/**
 * `qualify_leads` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: scores a batch of leads against AS015's Lead
 * Scoring Framework, writes nothing to a live system. Runs autonomously
 * (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is
 * empty; only the name came from the Program Registry.
 *
 * Extended 18 Aug 2026 to fold in proposing a next meeting when
 * qualification succeeds — the founder's "Book Meeting" idea is covered
 * here, not as a tenth Action (see p005-acquire.ts's restructuring notes).
 * The registry entry (this Action's id, kind, irreversible, connector) did
 * not change — only this prompt's content did.
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
| Source of this batch (score_and_prioritize_leads run, inbound, other) | … |
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

## 5. Next step for qualified leads — proposing a meeting

When a lead lands in the qualified tier, do not stop at the tier label. Propose the concrete next
step: whether this lead is ready to book a meeting now, or needs one more qualifying touch first.
This is a judgement call folded into this Action's output — not a separate Action.

For each qualified lead ready for a meeting, state:

* the specific ask (e.g. "propose a 20-minute intro call")
* who should own booking it (founder, sales, follow_up_prospects)
* the single strongest reason from §3 to lead with when proposing it

If a qualified lead is not yet ready for a meeting ask despite scoring qualified, say so and name
what one more signal would change that — do not default every qualified lead into "book a meeting"
mechanically.

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
* Recommended next steps are specific enough to act on immediately.
* Every qualified lead has either a proposed meeting ask or a stated reason it isn't ready yet.`
