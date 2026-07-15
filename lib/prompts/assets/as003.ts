/**
 * AS003 — Asset Instructions for "Buyer Journey Map".
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
export const AS003_BUYER_JOURNEY_PROMPT = `
---

# Asset Add-on

## Asset ID

**AS003**

## Asset Name

**Buyer Journey Map**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# Purpose

Produce a comprehensive **Buyer Journey Map** that documents how target customers discover, evaluate, purchase, implement and expand the company's solution.

The objective is not to describe the sales process.

The objective is to understand the customer's decision-making journey and identify the highest-impact opportunities to accelerate commercial conversion.

The completed Asset should become the company's authoritative reference for Marketing, Sales and Customer Success.

---

# Primary Analytical Framework

Use **Buyer Journey Mapping** as the primary analytical framework.

Map the complete customer journey from:

**Problem Awareness → Purchase Decision → Customer Success**

The journey should be described from the customer's perspective—not the company's.

---

# Supporting Frameworks

Where appropriate, supplement the analysis using:

### Customer Journey Mapping

Identify:

* customer objectives
* customer actions
* decision criteria
* emotions
* questions
* barriers
* touchpoints

for every stage of the journey.

---

### AIDA Framework

Analyse how customers move through:

* Awareness
* Interest
* Desire
* Action

Identify where commercial momentum is lost.

---

### See – Think – Do – Care

Evaluate the journey using Google's customer intent model.

Identify:

* See
* Think
* Do
* Care

and align marketing and sales activities accordingly.

---

### Decision-Making Unit (DMU)

For each stage identify:

* Economic Buyer
* Technical Buyer
* Champion
* Procurement
* Executive Sponsor
* End User

Explain how influence changes throughout the buying process.

---

# Required Sections

---

## 1. Executive Summary

Provide a concise overview covering:

* overall buying journey
* largest conversion bottleneck
* highest-impact improvement
* strongest buying trigger
* strategic implication

The Founder should understand the customer journey within two minutes.

---

## 2. Buyer Journey Overview

Present the complete customer journey.

Suggested stages:

1. Awareness
2. Problem Recognition
3. Research
4. Evaluation
5. Internal Alignment
6. Vendor Selection
7. Procurement
8. Purchase
9. Onboarding
10. Expansion

Explain the purpose of each stage.

---

## 3. Stage-by-Stage Journey Analysis

For every stage document:

* Customer Objective
* Customer Questions
* Customer Actions
* Information Required
* Decision Criteria
* Typical Concerns
* Emotional State
* Company Touchpoints
* Success Indicators

Present findings in a structured table.

---

## 4. Customer Journey Map

Create a visual journey showing:

* journey stages
* customer actions
* customer emotions
* company interactions
* decision points
* friction points

Highlight where customers typically stall or exit.

---

## 5. Decision-Making Unit (DMU)

For each journey stage identify:

| Journey Stage | Decision Maker | Influence | Responsibility |

Explain:

* who enters the buying process
* who approves progression
* who creates objections
* who signs contracts

Highlight changes in influence throughout the journey.

---

## 6. AIDA Assessment

Assess the customer journey using:

* Awareness
* Interest
* Desire
* Action

For each stage identify:

* current effectiveness
* weaknesses
* opportunities
* commercial implications

---

## 7. See – Think – Do – Care Analysis

Classify customer behaviour.

For every phase identify:

* customer intent
* information needs
* preferred channels
* recommended company activities

Highlight where current marketing assets are missing.

---

## 8. Journey Friction Analysis

Identify barriers that reduce conversion.

Examples include:

* technical uncertainty
* lack of trust
* procurement complexity
* insufficient proof
* pricing uncertainty
* slow response
* internal politics

Rank each by commercial impact.

---

## 9. Journey Opportunity Matrix

Identify opportunities to improve conversion.

Examples:

* customer education
* case studies
* pilots
* ROI calculators
* executive sponsorship
* product demonstrations
* onboarding improvements

Estimate expected commercial impact.

---

## 10. Executive Conclusions

Summarise:

* biggest journey bottleneck
* highest-converting touchpoint
* largest trust gap
* strongest buying trigger
* highest-priority improvement

---

# Deliverables Produced

This Asset becomes the primary reference for:

* AS004 — Positioning & Messaging Framework
* AS005 — Channel Strategy
* AS006 — 90-Day GTM Plan
* AS010 — Content Strategy
* AS012 — Campaign Strategy
* AS013 — Sales Enablement Kit
* AS015 — Customer Acquisition Blueprint
* AS016 — Customer Success Framework

---

# Output

Generate one complete **Buyer Journey Map**.

Expected length:

**8–12 pages**

Use executive-quality formatting including:

* executive summary cards
* visual customer journey maps
* AIDA diagrams
* See–Think–Do–Care matrices
* decision-making unit maps
* funnel diagrams
* conversion heat maps
* touchpoint matrices
* journey timelines
* opportunity scorecards
* icons
* call-out boxes

Avoid long narrative sections.

Optimise for executive readability.

---

# Success Criteria

The Asset is successful when:

* the complete buying journey is clearly documented
* customer behaviour is understood at every stage
* the Decision-Making Unit is mapped throughout the journey
* conversion bottlenecks are identified
* journey friction is evidence-based
* opportunities to improve conversion are prioritised
* downstream Marketing, Sales and Customer Success assets can use this report as the authoritative reference for customer buying behaviour

The Founder should finish reading the Asset with a clear understanding of **how customers progress from first awareness to long-term partnership, where deals are won or lost, and which improvements will have the greatest impact on commercial conversion.**

---

## One refinement

I would actually **remove the DMU framework from AS003** as a primary framework. You've already developed the DMU in **AS001 (ICP Profiles)**. In AS003, the DMU should simply be **referenced** to show **when** each stakeholder enters the buying journey—not redefine who they are.

That gives you a cleaner architecture:

* **AS001:** Who buys? (ICPs, Personas, DMU)
* **AS002:** Why do they buy? (Jobs, Pains, Gains, Triggers)
* **AS003:** How do they buy? (Journey, Touchpoints, Decision Process)

This creates a much tighter knowledge graph across Patel's GTM assets with minimal overlap.
`
