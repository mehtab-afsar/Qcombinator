/**
 * AS002 — Asset Instructions for "Pains & Gains Matrix".
 *
 * Layer 3 of the Composer (ADR-012). The lowest INSTRUCTION layer; Company
 * Context below it is data, not instructions.
 *
 * Lifted verbatim from the design workbook
 * `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx`.
 *
 * ADR-010: the workbook is the DESIGN and SEEDING source. Nothing reads it at
 * runtime — this file is the runtime source. Regenerate deliberately when the
 * workbook changes; never wire the app to the spreadsheet.
 */
export const AS002_PAINS_GAINS_PROMPT = `
---

# Asset Add-on

## Asset ID

**AS002**

## Asset Name

**Pains & Gains Matrix**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# Purpose

Produce a comprehensive **Pains & Gains Matrix** that identifies why customers buy, what problems they are trying to solve, what outcomes they value most and what events trigger purchasing decisions.

The objective is not to describe the product.

The objective is to understand the customer.

The completed Asset should become the company's primary reference for positioning, messaging, product prioritisation and commercial execution.

---

# Primary Analytical Framework

Use the **Value Proposition Canvas** as the primary analytical framework.

Analyse both sides of the canvas:

## Customer Profile

* Customer Jobs
* Customer Pains
* Customer Gains

## Value Map

* Products & Services
* Pain Relievers
* Gain Creators

The analysis should focus primarily on the Customer Profile.

The Value Map should only explain how the company addresses identified customer needs.

---

# Supporting Frameworks

Where evidence exists, supplement the analysis using:

### Jobs-to-be-Done (JTBD)

Identify:

* Functional Jobs
* Emotional Jobs
* Social Jobs

Determine what customers are actually hiring the solution to accomplish.

---

### Outcome-Driven Innovation (ODI)

For each important Job identify:

* Desired Outcome
* Current Satisfaction
* Opportunity Level

Highlight underserved outcomes where the company can create disproportionate value.

---

### Voice of Customer (VoC)

Capture recurring customer language.

Where available include:

* interview insights
* customer quotations
* objections
* recurring frustrations
* buying language

Avoid translating customer language into internal company terminology.

---

### Customer Problem Interviews

Identify recurring evidence from:

* discovery interviews
* sales conversations
* pilot discussions
* market research
* founder conversations

Rank findings according to frequency and confidence.

---

# Required Sections

---

## 1. Executive Summary

Provide a concise overview covering:

* biggest customer problem
* highest-value desired outcome
* strongest buying trigger
* largest unmet need
* commercial implication

The Founder should understand the customer in less than two minutes.

---

## 2. Customer Segments

For each ICP identified in AS001, one line each: primary objective + success metric. Do not
redefine ICPs or repeat AS001's profiles — reference AS001 by name.

---

## 3. Customer Jobs (JTBD)

For every customer segment identify:

### Functional Jobs

Tasks customers need completed.

### Emotional Jobs

How customers want to feel.

### Social Jobs

How customers wish to be perceived.

Rank each Job:

* Critical
* Important
* Nice-to-have

---

## 4. Pain Analysis

Identify:

* operational pains
* financial pains
* strategic pains
* organisational pains
* emotional frustrations

For each Pain include:

* description
* evidence
* frequency
* severity
* current alternatives

Rank severity:

High / Medium / Low

---

## 5. Gain Analysis

Identify desired customer outcomes.

Examples:

* cost reduction
* faster deployment
* improved reliability
* lower risk
* compliance
* competitive advantage

For every Gain include:

* business value
* strategic importance
* urgency

Rank each Gain.

---

## 6. Buying Triggers

One table: | Trigger | Why it matters | Urgency created |. No prose per trigger.

---

## 7. Buying Barriers

One table: | Barrier | Commercial impact |. No prose per barrier.

---

## 8. Value Proposition Canvas — compressed, not a full section

Do not develop this as a standalone section. It restates §3 (Jobs) + §4 (Pains) + §5 (Gains) in
canvas form — append a single 2-row table instead:

| | Customer side (from §3–5) | Company side |
|---|---|---|
| Jobs / Pains / Gains | *(one line each, cross-referencing §3–5)* | Pain relievers / gain creators |

---

## 9. Opportunity Matrix (ODI)

One table: | Desired Outcome | Importance | Current Satisfaction | Opportunity Score |. Then one
line naming the single highest-opportunity outcome. No separate prose per outcome — the
priority/severity ranks already live in §4 and §5.

---

## 10. Voice of Customer

Summarise recurring customer language.

Include:

* recurring phrases
* objections
* buying language
* concerns
* emotional wording

This section should directly influence messaging development.

---

## 11. Executive Conclusions

Summarise:

* biggest customer problem
* strongest value proposition
* strongest buying trigger
* biggest commercial obstacle
* highest-priority opportunity

---

# Deliverables Produced

This Asset should become the authoritative source for:

* Positioning Framework (AS004)
* Messaging Framework (AS004)
* Buyer Journey Map (AS003)
* Channel Strategy (AS005)
* GTM Plan (AS006)
* Sales Enablement (P004)
* Customer Acquisition (P005)
* Pricing Strategy (P007)

---

# Output

Generate one complete **Pains & Gains Matrix**.

Expected length:

**~1,400–1,600 words.** This asset runs longer than its siblings on purpose: it is the
company's single source of truth for customer understanding — AS001, AS003, AS004 and AS005 all
reference it instead of re-deriving pains, gains or JTBD. A thin AS002 gives them nothing to
reference. Spend the length on §4 (Pain Analysis) and §5 (Gain Analysis) — those are this
asset's core; everything else should be tables.

Use executive-quality formatting including:

* summary cards
* Jobs-to-be-Done table
* pain/gain tables with evidence + severity columns
* Opportunity matrix
* icons
* call-out boxes

Avoid long narrative sections.

Optimise for executive readability.

---

# Success Criteria

The Asset is successful when:

* customer problems are evidence-based
* Jobs-to-be-Done are clearly articulated
* buying triggers are understood
* customer outcomes are prioritised
* Voice of Customer informs future messaging
* the Value Proposition Canvas accurately reflects customer needs
* executives can immediately identify why customers buy and where the company creates unique value

The Founder should finish reading the Asset with a clear understanding of **what customers are trying to achieve, what frustrates them most, what triggers buying behaviour, and how the company's solution uniquely addresses those needs.**

---

**AS002 is the "source of truth" for all customer understanding** (applied, not proposed). Every
downstream asset — AS001's JTBD, AS004's positioning and messaging, AS005's channel evidence —
references this asset rather than re-creating customer pains, gains, or JTBD from scratch.
`
