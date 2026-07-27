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

## 4. Value Proposition — folded into §2/§3

Do not include as a standalone section. It restates Dunford's "Value Created" (§2) — if
functional/economic/strategic/emotional value needs stating, add one line each inside §2's
"Value Created" or §3's positioning statement, not a fourth restatement.

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

## 6. Golden Circle — cut, owned by §2/§3

Do not include this section. Why/How/What restates §2's positioning and unique attributes under
a different template — it is not new analysis.

---

## 7. StoryBrand Narrative — cut, owned by §3/§5

Do not include this section. Character/Problem/Guide/Plan restates the positioning statement
(§3) and the Message House (§5) under a different template.

---

## 8. Elevator Pitch

**One** 30-second version only — customer-facing. Do not produce 15s/60s/investor/partner
variants; they are length edits of the same content, not new thinking.

---

## 9. Website Messaging — cut, out of scope for this Asset

**Do not include this section.** This asset's own Purpose states *"the objective is not to
create marketing copy"* — homepage hero copy, "Proof" sections and CTAs are copywriting output,
not positioning strategy. It is also this asset's highest-risk section: a "Proof" section with
no real evidence yet invites inventing a customer, a quote, or a figure to fill it — never do
that. §2, §3 and §5 already give implementation teams everything they need to write website copy
elsewhere, later, with real evidence in hand.

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

Two short lists: words to use, words to avoid. One line on tone. No prose.

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

**~1,200–1,400 words.** This asset still carries the two artefacts people actually reuse
verbatim — the Positioning Statement (§3) and the Message House (§5) — so it runs slightly
longer than AS001/AS003/AS005. It does NOT carry four restatements of the same narrative in
different templates; §6, §7 and §9 are cut outright (see above), not compressed.

Use executive-quality formatting including:

* executive summary card
* positioning statement (verbatim, quotable)
* Message House (core narrative + key messages + proof points)
* messaging hierarchy table
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

**AS004 is the "Commercial Bible"** for the GTM system (applied, not proposed). Every asset that
contains customer-facing language references it rather than inventing its own messaging.

* **AS001** → Who should we sell to?
* **AS002** → Why do they buy?
* **AS003** → How do they buy?
* **AS004 (this asset)** → How do we explain why they should buy from us?
`
