/**
 * AS007 — Asset Instructions for "Brand Identity".
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
export const AS007_BRAND_IDENTITY_PROMPT = `
---

# Asset Add-on

## Asset ID

**AS007**

## Asset Name

**Brand Identity**


## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P002 — Brand Strategy**

---

# Purpose

Produce a comprehensive **Brand Identity** that defines who the company is, what it stands for and how it should consistently be perceived by customers, partners, investors and employees.

The objective is not to create marketing campaigns or visual design assets.

The objective is to establish the company's enduring identity.

This Asset should become the company's authoritative reference for every future branding, communication and storytelling decision.

It should answer:

- Who are we?
- Why do we exist?
- What do we believe?
- What personality do we express?
- What promises do we consistently make?
- How should people remember us?

---

# Primary Analytical Framework

Use **Brand Archetypes** as the primary analytical framework.

Identify the Brand Archetype that most accurately represents the company's enduring identity.

Possible archetypes include:

- Sage
- Hero
- Creator
- Explorer
- Ruler
- Caregiver
- Magician
- Everyman
- Innocent
- Outlaw
- Lover
- Jester

Where appropriate identify:

- Primary Archetype
- Secondary Archetype

Explain why these archetypes best represent the organisation.

The chosen archetype should remain stable over time and guide future branding decisions.

---

# Supporting Frameworks

Where appropriate, supplement the analysis using:

### Kapferer Brand Identity Prism

Validate the identity across:

- Physique
- Personality
- Culture
- Relationship
- Reflection
- Self-Image

---

### Keller Customer-Based Brand Equity (CBBE)

Assess:

- Brand Salience
- Brand Meaning
- Brand Response
- Brand Resonance

Focus on the desired brand rather than current brand performance.

---

### Brand Pyramid

Structure the identity from:

- Attributes
- Functional Benefits
- Emotional Benefits
- Brand Values
- Brand Essence

---

### Simon Sinek's Golden Circle

Clearly define:

- WHY
- HOW
- WHAT

Ensure the WHY represents the company's enduring purpose.

---

# Required Sections

---

## 1. Executive Summary

Provide a concise overview covering:

- Brand Archetype
- Brand Purpose
- Core Identity
- Brand Promise
- Desired Market Perception

The Founder should understand the company's identity within two minutes.

---

## 2. Brand Purpose

Define:

- Vision
- Mission
- Purpose

Clearly distinguish between each concept.

---

## 3. Brand Archetype

Identify:

### Primary Archetype

Explain:

- why it fits
- behavioural characteristics
- communication style
- leadership style
- customer experience implications

---

### Secondary Archetype

Where appropriate identify a complementary archetype.

Explain how it strengthens the brand.

---

### Archetype Implications

Describe how the archetype influences:

- leadership
- culture
- customer experience
- partnerships
- innovation
- communication

---

## 4. Brand Values

Define the company's enduring values.

For each value include:

- description
- behavioural implication
- evidence
- why it matters

Values should guide decisions rather than describe aspirations.

---

## 5. Brand Personality

Describe the company's personality.

Examples include:

- visionary
- disciplined
- pragmatic
- ambitious
- trustworthy
- bold
- human
- precise

Avoid generic adjectives.

Prioritise characteristics that genuinely differentiate the company.

---

## 6. Brand Promise

Define the single promise the company consistently makes to its customers.

The promise should be:

- credible
- memorable
- enduring
- customer-centred

Explain why customers should believe this promise.

---

## 7. Desired Market Perception

Describe how the company wants to be perceived by:

- customers
- investors
- partners
- employees
- media

Focus on long-term perception rather than marketing slogans.

---

## 8. Brand Identity Prism

Complete the Kapferer Brand Identity Prism.

Include:

- Physique
- Personality
- Culture
- Relationship
- Reflection
- Self-Image

Summarise each dimension concisely.

---

## 9. Brand Pyramid

Develop the Brand Pyramid.

Include:

- Attributes
- Functional Benefits
- Emotional Benefits
- Brand Values
- Brand Essence

Conclude with one sentence that captures the company's Brand Essence.

---

## 10. Golden Circle

Define:

### WHY

The enduring reason the company exists.

---

### HOW

The unique philosophy through which it creates value.

---

### WHAT

Products and services delivered.

Ensure the WHY drives the narrative.

---

## 11. Brand Principles

Define the principles that should remain constant regardless of future products, markets or campaigns.

Examples include:

- customer philosophy
- innovation philosophy
- leadership philosophy
- communication philosophy
- decision-making philosophy

These principles should guide every future brand decision.

---

## 12. Identity Boundaries

Clearly define what the brand is **not**.

Examples:

- We are not consultants.
- We are not another AI tool.
- We are not an accelerator.
- We are not an outsourcing company.

Identity is often strengthened by defining what it refuses to become.

---

# 13. Founding Story (Nectar Story)

Develop the company's **Founding Story** using the Nectar Story methodology.

External Knowledge Sources

Where available, use:

Nectar Story GPT

https://chatgpt.com/g/g-67b74f01b1d08191a55ac41ba682de0d-nectar-gpt

to develop and refine the Founding Story.

Ensure complete consistency with the Brand Identity.

The Founding Story should translate the Brand Identity into an emotionally compelling narrative that people remember.

The story should inspire trust before it sells products.

It should become the foundation for:

- Founder presentations
- Investor decks
- Website About page
- Recruiting
- Keynote speeches
- PR
- Media interviews
- Company onboarding

If a dedicated Nectar Story agent or GPT is available, use it to develop and refine this section while ensuring complete consistency with the Brand Identity.

---

## Required Story Elements

Develop:

### The Origin

Why was the company founded?

---

### The Broken World

What fundamental problem or injustice does the company refuse to accept?

---

### The Turning Point

Why do traditional approaches no longer work?

---

### The New Belief

What does the company believe that most competitors do not?

---

### The Mission

What future is the company trying to create?

---

### The Invitation

Why should customers, employees, investors and partners join this journey?

---

### The One-Page Founding Story

Produce a polished narrative suitable for:

- website
- investor presentations
- founder presentations
- keynote speeches

The story should feel authentic, memorable and emotionally compelling.

Avoid hype.

Avoid marketing clichés.

---

## Relationship to Other Assets

Ensure complete consistency with:

- AS004 — Positioning & Messaging Framework
- AS008 — Brand Guidelines
- AS009 — Narrative Framework

The Founding Story should bring the Brand Identity to life.

It should not replace the Narrative Framework.

---

## 14. Key Findings

Summarise:

- defining identity
- primary archetype
- brand purpose
- brand promise
- defining beliefs
- desired perception
- founding story

Avoid tactical recommendations.

---

# Output

Generate one complete **Brand Identity** Management Asset.

Expected length:

**10–15 pages**

Use executive-quality formatting throughout.

Include where appropriate:

- executive summary cards
- Brand Archetype cards
- Brand Identity Prism
- Brand Pyramid
- Golden Circle diagram
- values matrix
- personality spectrum
- perception maps
- Founding Story call-out
- icons
- visual call-outs
- diagrams
- summary tables

Avoid long narrative sections.

Optimise for executive readability.

---

# Success Criteria

The Asset is successful when:

- the company's identity is immediately understandable
- the Brand Archetype accurately represents the organisation
- purpose, values and personality are internally consistent
- the Brand Promise is credible and memorable
- the Founding Story creates emotional connection
- future branding decisions can reference this Asset
- downstream assets inherit a consistent identity
- every AI Executive can understand how the company should think, communicate and behave

The Founder should finish reading this Asset with complete confidence that the company's identity is clearly defined, emotionally compelling, enduring and sufficiently robust to guide every future communication, hiring decision, presentation and customer interaction.`
