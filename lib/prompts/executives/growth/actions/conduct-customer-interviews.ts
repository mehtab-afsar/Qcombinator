/**
 * `conduct_customer_interviews` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ PRODUCES AN INTERVIEW GUIDE OR A SYNTHESIS, DOES NOT SEND ANY EMAIL. See
 * conduct-customer-interviews.ts in the Registry (the ActionDef) for the full reasoning: this
 * Action's name reads like P001's real Gmail-send Action `interview_customers`
 * (`irreversible: true, connector: 'gmail'`), but it is deliberately not that — P001 already owns
 * the one deliberate real-send proof case (PRD §10). This prompt must never claim an interview has
 * actually been scheduled or a customer actually contacted.
 *
 * Internal and reversible: produces a document, sends nothing. Runs autonomously (ADR-004).
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const CONDUCT_CUSTOMER_INTERVIEWS_PROMPT = `# Action Instructions

## Action ID

**conduct_customer_interviews**

## Action Name

**Conduct Customer Interviews**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P008 — Market Intelligence**

---

# ⚠️ This produces an interview guide or a synthesis, not a scheduled interview

Produce either a structured interview guide ready for the founder or the team to use, or a
synthesis of findings from interview notes already present in Company Context. This Action does
not connect to email or any scheduling system and does not contact a customer — it never claims an
interview has already taken place. Frame the output as ready for a human to use, not as
confirmation the interview has happened.

---

# Purpose

Turn the Customer Insights gap in the Market Intelligence Report (AS018) into either a usable
interview guide or a synthesis of what customer evidence already exists, so customer understanding
in AS018 stays grounded in real customer voice rather than assumption.

---

# What to produce

Choose the mode that fits what Company Context actually contains.

## Mode A — Interview Guide (no interview notes exist yet)

### 1. Objective

What this round of interviews is meant to learn, tied to the specific gap in AS018's Customer
Insights section.

### 2. Target participants

The customer segment, role and buying-journey stage most likely to close that gap.

### 3. Question guide

Eight to twelve open-ended questions, ordered from context-setting to specific, covering buying
behaviour, buying criteria, pain points and unmet needs.

### 4. What "done" looks like

The specific customer insight this round of interviews should produce.

## Mode B — Synthesis (interview notes already exist in Company Context)

### 1. What was learned

The customer insights the existing notes actually support — segments, buying behaviour, buying
criteria, pain points, unmet needs.

### 2. What changed since the last review

Where these findings differ from AS018's current Customer Insights section.

### 3. Confidence level

Which findings are well-supported by multiple sources versus a single data point.

---

# Output

Readable markdown, roughly 300–500 words. State clearly at the top which mode was used and why.

**Evidence rule:** never invent a customer quote, statistic or finding not present in Company
Context. Use **[TO VALIDATE: …]** for anything requiring a real interview before it can be
confirmed.

**Stay in scope:** this produces an interview guide or a synthesis of existing findings. It does
not contact any customer, schedule any meeting, or send any email. It does not rewrite the Market
Intelligence Report itself — that is what update_market_report is for.

---

# Success Criteria

* The correct mode was chosen for what evidence actually exists.
* Nothing in the output implies a customer has already been contacted or an interview has already
  happened.
* Every question or finding traces to a specific gap in AS018.
* The output is immediately usable by a human, without further editing.`
