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

For each ICP identified in AS001 include:

* customer description
* business context
* primary objectives
* success metrics

Do not redefine ICPs.

Reference AS001 where appropriate.

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

Identify events that initiate purchasing behaviour.

Examples:

* new regulation
* funding received
* operational failure
* growth
* competitive pressure
* board mandate
* digital transformation
* procurement cycle

For each Trigger explain:

* why it matters
* typical buying behaviour
* urgency created

---

## 7. Buying Barriers

Identify recurring obstacles.

Examples:

* procurement complexity
* budget
* internal politics
* technical risk
* implementation concerns
* switching costs
* lack of references

Estimate commercial impact.

---

## 8. Value Proposition Canvas

Summarise the complete Canvas.

Include:

### Customer Profile

| Customer Jobs | Pains | Gains |

### Value Map

| Products & Services | Pain Relievers | Gain Creators |

Show explicit relationships between customer needs and company value.

---

## 9. Opportunity Matrix (ODI)

Rank customer opportunities.

| Desired Outcome | Importance | Current Satisfaction | Opportunity Score |

Highlight:

* underserved needs
* over-served areas
* highest commercial opportunities

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

**8–12 pages**

Use executive-quality formatting including:

* summary cards
* prioritisation tables
* Value Proposition Canvas
* Jobs-to-be-Done matrix
* Opportunity matrix
* customer journey visuals
* heat maps
* comparison tables
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

I would also make one architectural refinement to your registry: **AS002 should explicitly become the "source of truth" for all customer understanding.** Every downstream asset—positioning, messaging, campaigns, sales enablement, pricing, and customer success—should reference AS002 rather than re-creating customer pains, gains, or JTBD from scratch. That gives the entire Edge Alpha OS a single, consistent customer intelligence layer.
`
