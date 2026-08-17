/**
 * `launch_upsell_campaign` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ IDENTIFIES TARGETS AND DRAFTS A CAMPAIGN PLAN, DOES NOT SEND OR COMMIT
 * TO COMMERCIAL TERMS. See launch-upsell-campaign.ts in the Registry (the
 * ActionDef) for the full reasoning on why this stays plan-only rather than
 * a connector-backed send, and why it does not fix pricing or discounting.
 *
 * Internal and reversible: produces a target list, offer outline and
 * messaging plan; sends nothing and commits to no commercial term. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const LAUNCH_UPSELL_CAMPAIGN_PROMPT = `# Action Instructions

## Action ID

**launch_upsell_campaign**

## Action Name

**Launch Upsell Campaign**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P006 — Customer Success**

---

# ⚠️ This is a target list and campaign draft, not a sent offer

Identify expansion-ready customers and draft an upsell/cross-sell campaign plan. This Action does
not send anything to any customer, does not connect to email or any outreach tool, and does not
fix pricing, discounting or any other commercial term — it never claims an offer has already gone
out. Commercial terms and strategic customer relationships require Founder involvement, per the
Program Prompt's Autonomous Actions section. Frame the output as ready for a human to review and
send.

---

# Purpose

Turn customer health and usage evidence into a concrete expansion campaign, built on the Customer
Success Framework's (AS016) Expansion Strategy and Net Revenue Retention approach — so upsell and
cross-sell effort targets customers who have demonstrated success, rather than being pushed as
sales pressure.

---

# What to produce

## 1. Campaign brief

| Field | Detail |
|---|---|
| Expansion type (upsell, cross-sell, additional business unit — per AS016) | … |
| Trigger for this campaign (health score run, QBR outcome, usage milestone) | … |
| Number of customers in scope | … |

## 2. Target customers

A table of expansion-ready customers ranked by fit, each with the specific evidence supporting
inclusion — health tier (see monitor_health_scores, if available), demonstrated value realised,
usage signal indicating readiness for more. Per AS016, expansion must be "based on customer success
rather than sales pressure" — exclude any customer without a clear success signal, even if
commercially attractive.

## 3. Offer outline and messaging

For each target tier, an outline of the expansion opportunity (what it is, the value case tied to
outcomes the customer has already achieved) and draft messaging themes. Do not state a specific
price, discount or contract term — flag where commercial terms need Founder or sales input.

## 4. Sequencing plan

| Customer / tier | Recommended owner (customer success, sales, executive) | Timing | Trigger to pause (renewal in progress, open risk, recent negative feedback) |

---

# Output

Readable markdown: the brief, the target table, offer outlines per tier, and the sequencing plan.
Length follows the number of targets — do not pad.

**Evidence rule:** every target and value claim traces to AS016, Company Context or the Required
Inputs (usage data, health scores, feedback). Never invent customer names, usage figures or results
not present in the source material. Use **[TO VALIDATE: …]** for anything requiring confirmation,
and explicitly flag every place a commercial term (price, discount, contract change) would need
Founder approval before anything is offered.

**Stay in scope:** this drafts one expansion campaign against the existing Expansion Strategy. It
does not redesign the Expansion Strategy or NRR approach itself — that is what re-running AS016 is
for. It does not send anything, and it does not set commercial terms — both require a human.

---

# Success Criteria

* Every target customer has a stated success signal, not just commercial attractiveness.
* No specific price, discount or contract term is stated as decided.
* Every commercial-term gap is flagged for Founder or sales input.
* Nothing in the output implies an offer has already been sent.`
