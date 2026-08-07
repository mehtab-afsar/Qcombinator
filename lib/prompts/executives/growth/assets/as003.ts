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

### Decision-Making Unit (DMU)

Reference AS001's DMU (§6) for who the roles are. Here, only note when each role enters the
journey — see Required Section 5.

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

## 2–3. Buyer Journey, Stage by Stage

List the journey stages (suggested: Awareness → Problem Recognition → Research → Evaluation →
Internal Alignment → Vendor Selection → Procurement → Purchase → Onboarding → Expansion) as ONE
table: | Stage | Purpose | Customer Objective | Typical Concern |.

Then identify the **one or two stages that are the real conversion bottleneck** (named in your
Executive Summary) and give **those only** the full treatment: Customer Actions, Information
Required, Decision Criteria, Emotional State, Company Touchpoints, Success Indicators.

Depth on the bottleneck, not depth everywhere — a founder needs to know where deals are actually
won or lost, not read nine attributes for a stage that behaves exactly as expected.

---

## 4. Customer Journey Map

One compact visual (an arrow diagram or condensed table), not a separate written section — it
restates §2–3. Just the stage sequence with friction points marked.

---

## 5. Decision-Making Unit (DMU) — reference AS001, do not redefine

The DMU itself is defined in **AS001 §6** — do not redevelop who the roles are. Here, add only
what AS001 doesn't cover: **when** each role enters the journey.

One table: | Journey Stage | DMU Role (from AS001) | Enters here because... |

---

## 6. AIDA Assessment

One table: | Stage (Awareness/Interest/Desire/Action) | Current Effectiveness | Biggest Weakness |.
This is the funnel lens for the whole asset — do not also produce a See-Think-Do-Care pass; it's
the same funnel through a second, redundant framework. AIDA is the one to keep.

---

## 7. Journey Friction Analysis

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

## 8. Journey Opportunity Matrix

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

## 9. Executive Conclusions

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

**~1,000–1,200 words.** Full stage-by-stage depth goes ONLY on the 1–2 bottleneck stages named
in your Executive Summary — every other stage is one table row. That reallocation is what makes
this asset sharp instead of long.

Use executive-quality formatting including:

* executive summary card
* stage table with the bottleneck stage(s) expanded
* one compact journey visual
* AIDA table
* DMU-timing table (referencing AS001)
* journey friction + opportunity tables
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

**Division of responsibility across the GTM assets** (applied, not proposed):

* **AS001:** Who buys? (ICPs, Personas, DMU)
* **AS002:** Why do they buy? (Jobs, Pains, Gains, Triggers)
* **AS003 (this asset):** How do they buy? (Journey, Touchpoints, Decision Process — DMU
  referenced from AS001, never redefined)
`
