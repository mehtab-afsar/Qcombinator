/**
 * `collect_feedback` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES A COLLECTION PLAN, DOES NOT SEND A SURVEY. See
 * collect-feedback.ts in the Registry (the ActionDef) for the full
 * reasoning: no survey/feedback-tool Connector exists, and this Action's
 * output is a plan a human still has to send out.
 *
 * Internal and reversible: produces a document, sends nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const COLLECT_FEEDBACK_PROMPT = `# Action Instructions

## Action ID

**collect_feedback**

## Action Name

**Collect Feedback**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P006 — Customer Success**

---

# ⚠️ This is a collection plan, not a sent survey

Produce a customer feedback collection plan. This Action does not connect to any survey or
feedback tool and does not send anything to any customer — it never claims feedback has already
been collected. Frame the output as ready for a human to send out.

---

# Purpose

Turn a lifecycle moment (onboarding complete, post-QBR, pre-renewal, or a churn signal) into a
structured feedback collection plan, built on the Customer Success Framework's (AS016) Customer
Feedback Framework — so feedback is gathered deliberately at the moments that inform continuous
improvement, not only when a customer volunteers it.

---

# What to produce

## 1. Collection context

| Field | Detail |
|---|---|
| Trigger for this collection (onboarding feedback, satisfaction survey, product feedback, QBR feedback, renewal feedback, churn interview — per AS016) | … |
| Customer(s) / segment in scope | … |
| Timing relative to the trigger event | … |

## 2. Questions

The specific questions to ask, tied to the collection type in AS016 — onboarding feedback probes a
different set of questions than a churn interview. Group questions by theme (experience, value
realised, friction, likelihood to recommend) rather than presenting a flat list.

## 3. Channel and format

The recommended channel (survey, structured call, embedded prompt) and format for this collection
type, per AS016's Customer Feedback Framework.

## 4. How this feeds continuous improvement

State plainly which downstream process should consume the results — health scoring
(monitor_health_scores), the next QBR (conduct_qbr), or the Customer Success Framework itself (a
future AS016 revision) — per AS016's "how feedback should inform continuous improvement."

---

# Output

Readable markdown: the context table, the grouped question set, and the channel/format
recommendation. Length follows the collection type — a churn interview guide is longer than a
one-question NPS prompt; do not pad either.

**Evidence rule:** every question and channel choice traces to AS016's Customer Feedback Framework
or Company Context. Never invent prior feedback, scores or customer quotes not present in the
source material. Use **[TO VALIDATE: …]** for anything requiring confirmation before send.

**Stay in scope:** this plans one feedback collection against the existing Customer Feedback
Framework. It does not redesign the Framework itself — that is what re-running AS016 is for. It
does not send anything — sending is outside this Action.

---

# Success Criteria

* The questions match the specific collection type in AS016, not a generic survey.
* The channel and timing are appropriate to the trigger event.
* The downstream use of the results is named explicitly.
* Nothing in the output implies feedback has already been collected.`
