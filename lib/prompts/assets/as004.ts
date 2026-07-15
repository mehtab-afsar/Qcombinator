/**
 * AS004 — Asset Instructions for "Positioning & Messaging Framework".
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
export const AS004_POSITIONING_PROMPT = `
---

# Asset Add-on

## Asset ID

**AS004**

## Asset Name

**Positioning & Messaging Framework**

## Executive Owner

**Patel — Chief Growth Officer**

## Programs

**P001 — Go-to-Market Strategy**

**P002 — Brand Strategy**

---

# Purpose

Produce a comprehensive **Positioning & Messaging Framework** that defines how the company should present itself to customers, partners and investors.

The objective is not to create marketing copy.

The objective is to establish a consistent commercial narrative that clearly explains:

* who we serve
* the problem we solve
* why we are different
* why customers should choose us
* why now

The completed Asset should become the company's single source of truth for all external communication.

---

# Primary Analytical Framework

Use the **April Dunford Positioning Framework** as the primary analytical framework.

Define:

* Competitive Alternatives
* Unique Attributes
* Value Created
* Ideal Customer
* Market Category
* Relevant Trends

Conclude with a clear positioning statement.

---

# Supporting Frameworks

Where appropriate, supplement the analysis using:

### Value Proposition Canvas

Validate that messaging aligns with:

* Customer Jobs
* Customer Pains
* Customer Gains

Reference AS002 rather than recreating it.

---

### StoryBrand (SB7)

Structure the commercial narrative around:

* Character (Customer)
* Problem
* Guide (Company)
* Plan
* Call to Action
* Success
* Failure

Ensure the customer—not the company—is the hero.

---

### Simon Sinek's Golden Circle

Define:

* Why
* How
* What

Ensure messaging begins with purpose before capability.

---

### Message House

Develop a structured messaging architecture comprising:

* Core Narrative
* Key Messages
* Supporting Proof Points
* Evidence
* Call to Action

This becomes the foundation for all commercial communication.

---

# Required Sections

---

## 1. Executive Summary

Provide a concise overview covering:

* positioning statement
* unique value proposition
* primary customer
* competitive differentiation
* commercial implication

The Founder should understand the messaging strategy within two minutes.

---

## 2. Market Positioning (April Dunford)

Define:

### Competitive Alternatives

What customers currently use.

---

### Unique Attributes

What differentiates the company.

---

### Value Created

What measurable value customers receive.

---

### Ideal Customer

Reference AS001.

Explain why this positioning resonates with the selected ICP.

---

### Market Category

Define the category the company belongs to—or should create.

---

### Market Trends

Identify why this positioning is especially relevant today.

---

## 3. Positioning Statement

Produce a formal positioning statement.

Recommended structure:

> For **[Target Customer]**

> who need **[Customer Problem]**

> **[Company]**

> is **[Market Category]**

> that delivers **[Primary Value]**

> unlike **[Competitive Alternative]**

> because **[Unique Differentiator].**

---

## 4. Value Proposition

Develop the company's value proposition.

Include:

* Functional Value
* Economic Value
* Strategic Value
* Emotional Value

Explain why customers should choose the company.

---

## 5. Messaging Framework

Develop a complete Message House.

Include:

### Core Narrative

The single overarching story.

---

### Key Messages

Three to five core commercial messages.

---

### Supporting Proof Points

Evidence supporting every message.

Examples:

* technology
* customer outcomes
* pilots
* partnerships
* certifications
* data

---

### Calls to Action

Recommended commercial CTAs.

---

## 6. Golden Circle

Define:

### WHY

Purpose.

---

### HOW

Unique approach.

---

### WHAT

Products and services.

Ensure WHY drives the narrative.

---

## 7. StoryBrand Narrative

Develop the company story.

Include:

* Customer
* Problem
* Guide
* Plan
* Success
* Call to Action

Avoid making the company the hero.

---

## 8. Elevator Pitch

Develop multiple versions.

Examples:

* 15-second
* 30-second
* 60-second

Adapt for:

* customers
* investors
* partners

---

## 9. Website Messaging

Develop messaging recommendations for:

* Homepage Hero
* Value Proposition
* Problem Section
* Solution Section
* Benefits
* Proof
* Call to Action

Focus on clarity rather than design.

---

## 10. Messaging Hierarchy

Prioritise messages.

| Priority | Message | Audience | Evidence |

Identify:

* Primary Message
* Secondary Messages
* Supporting Messages

---

## 11. Communication Guidelines

Define:

* preferred terminology
* words to use
* words to avoid
* tone of voice
* message consistency

Ensure consistency across all channels.

---

## 12. Executive Conclusions

Summarise:

* recommended positioning
* strongest differentiator
* strongest value proposition
* key messaging priorities
* commercial implications

---

# Deliverables Produced

This Asset becomes the primary reference for:

* AS007 — Brand Strategy
* AS008 — Brand Guidelines
* AS009 — Narrative Framework
* AS010 — Content Strategy
* AS011 — SEO Strategy
* AS012 — Campaign Strategy
* AS013 — Sales Enablement Kit
* AS014 — Proposal & ROI Toolkit
* Company Website
* Pitch Deck
* Investor Deck
* One-Pagers
* Outbound Messaging
* PR & Communications

---

# Output

Generate one complete **Positioning & Messaging Framework**.

Expected length:

**10–15 pages**

Use executive-quality formatting including:

* executive summary cards
* positioning canvases
* Message House diagrams
* StoryBrand visual flow
* Golden Circle diagram
* value proposition matrices
* messaging hierarchy tables
* elevator pitch comparison cards
* homepage wireframe messaging
* proof-point matrices
* icons
* call-out boxes

Avoid long narrative sections.

Optimise for executive readability.

---

# Success Criteria

The Asset is successful when:

* the company's positioning is immediately understandable
* differentiation is evidence-based
* the value proposition aligns with customer needs
* messaging is internally consistent
* every communication channel can reference the same messaging architecture
* customers understand why they should choose the company within seconds
* all downstream commercial assets can use this document as the authoritative messaging source

The Founder should finish reading the Asset with complete confidence that **every employee, every presentation, every webpage, every sales conversation and every marketing campaign communicates one clear, consistent and differentiated commercial story.**

---

## One refinement

I would make **AS004 the "Commercial Bible"** of the entire GTM system. Every asset that contains customer-facing language should reference it rather than inventing its own messaging.

The dependency chain becomes elegant:

* **AS001** → Who should we sell to?
* **AS002** → Why do they buy?
* **AS003** → How do they buy?
* **AS004** → How do we explain why they should buy from us?

Everything else—channels, campaigns, sales enablement, proposals, website, pricing, and customer success—should inherit from AS004 rather than creating new narratives. This gives Patel a single, coherent messaging DNA across the entire Edge Alpha Operating System.
`
