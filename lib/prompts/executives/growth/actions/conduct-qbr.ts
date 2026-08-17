/**
 * `conduct_qbr` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES A QBR DOCUMENT, NOT A MEETING. See conduct-qbr.ts in the
 * Registry (the ActionDef) for the full reasoning: no calendar/meeting
 * Connector exists, and this Action's output is a QBR document a human still
 * has to present.
 *
 * Internal and reversible: produces a document, holds no meeting. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const CONDUCT_QBR_PROMPT = `# Action Instructions

## Action ID

**conduct_qbr**

## Action Name

**Conduct QBR**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P006 — Customer Success**

---

# ⚠️ This is a QBR document, not a held meeting

Produce a Quarterly Business Review presentation for a customer. This Action does not connect to
any calendar or meeting tool and does not hold the review itself — it never claims the QBR has
already taken place. Frame the output as ready for a human to present.

---

# Purpose

Turn the last quarter's evidence about a customer into a Quarterly Business Review, built on the
Customer Success Framework's (AS016) QBR methodology — so the review is grounded in business
outcomes the customer cares about, not a walkthrough of product features.

---

# What to produce

## 1. QBR header

| Field | Detail |
|---|---|
| Customer | … |
| Review period | … |
| Executive stakeholders attending (from Company Context, where known) | … |
| Current customer health tier (see monitor_health_scores, if a recent run exists) | … |

## 2. Business outcomes and KPI review

The objectives agreed with the customer, the KPIs tracking them, and the value delivered this
period — framed as business outcomes achieved, per AS016's "focus on customer business outcomes
rather than product features."

## 3. Challenges and product adoption

Honest coverage of what has not gone well this period — adoption gaps, unresolved issues, slower
than expected progress — alongside adoption evidence, so the QBR is credible rather than a
highlight reel.

## 4. Opportunities and agreed next steps

Expansion opportunities visible from this quarter's usage and outcomes, plus the specific next
steps and owners agreed for the coming period, per AS016's Expansion Strategy.

---

# Output

Readable markdown structured as QBR presentation sections (header, outcomes/KPIs, challenges,
opportunities/next steps) — not slide-by-slide, but organised so it converts directly into slides.
Length follows the customer's complexity — do not pad.

**Evidence rule:** every KPI, outcome and challenge traces to AS016, Company Context or the Required
Inputs (customer contracts, feedback, usage data). Never invent metrics, quotes or results not
present in the source material. Use **[TO VALIDATE: …]** for anything needing confirmation before
the review is presented.

**Stay in scope:** this prepares one customer's QBR against the existing Customer Success Framework.
It does not redesign the QBR methodology itself — that is what re-running AS016 is for. It does not
score customer health from scratch — that is monitor_health_scores.

---

# Success Criteria

* The review leads with business outcomes, not feature usage.
* Challenges are stated honestly, not glossed over.
* Every next step has an owner.
* The output is presentation-ready without further restructuring.`
