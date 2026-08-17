/**
 * AS008 — Asset Instructions for "Brand Guidelines".
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
export const AS008_BRAND_GUIDELINES_PROMPT = `
---

# Asset Add-on

## Asset ID

**AS008**

## Asset Name

**Brand Guidelines**


## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P002 — Brand Strategy**

---

# Purpose

Produce a comprehensive **Brand Guidelines** document that defines how the company's Brand Identity should be consistently expressed across every communication channel and customer interaction.

The objective is not to redesign the brand.

The objective is to establish clear standards that ensure every employee, AI Executive and external partner communicates the company consistently.

This Asset becomes the company's official Brand Manual.

---

# Knowledge Base

Use the following Knowledge Base references when developing this Asset.

## Primary Knowledge Base

- **Brand Identity Prism**

Use the Brand Identity defined in AS007 as the foundation for all communication standards.

---

## Supporting Knowledge Bases

- Nielsen Norman Writing Principles
- Atomic Design
- WCAG Accessibility Guidelines
- Tone of Voice Framework

Use these frameworks where they strengthen consistency and usability.

---

# Required Inputs

Before beginning, review:

- AS004 — Positioning & Messaging Framework
- AS007 — Brand Identity
- Existing website
- Marketing materials
- Pitch deck
- Sales collateral
- Social media
- Product interface (where applicable)

Do not redefine the Brand Identity.

Translate it into practical communication standards.

---

# Required Sections

---

## 1 Executive Summary

Summarise:

- Brand Identity
- Communication objectives
- Tone of voice
- Visual philosophy
- Consistency principles

The Founder should understand the purpose of the Brand Guidelines within two minutes.

---

## 2 Brand Foundations

Summarise the identity established in AS007.

Include:

- Brand Purpose
- Brand Promise
- Brand Archetype
- Brand Personality
- Brand Values

Do not recreate the Brand Identity.

Reference AS007.

---

## 3 Visual Identity

Define the visual language.

Include:

### Logo

- usage
- clear space
- sizing
- incorrect usage

---

### Colour Palette

Define:

- primary colours
- secondary colours
- accent colours
- neutral palette

Include intended usage.

---

### Typography

Define:

- heading fonts
- body fonts
- hierarchy
- spacing

---

### Iconography

Describe:

- icon style
- consistency rules
- line weights
- illustration principles

---

### Photography & Imagery

Describe:

- preferred style
- composition
- colour treatment
- subjects
- imagery to avoid

---

## 4 Tone of Voice

Define how the company speaks.

Describe the desired tone using examples.

Examples:

- Executive
- Confident
- Clear
- Evidence-based
- Practical
- Calm
- Intelligent

Avoid generic marketing language.

---

## 5 Writing Standards

Using Nielsen Norman principles define:

- sentence length
- reading level
- paragraph length
- headings
- lists
- calls to action
- terminology
- readability

Define preferred writing conventions.

---

## 6 Terminology Guide

Create a glossary.

Include:

Preferred terminology.

Examples:

✓ AI-native company

✓ Operating System

✓ AI Executive Team

✓ Founder in Command

✓ Executive Briefing

✓ Management Assets

✓ Score → Shape → Ship

---

Words to avoid.

Examples:

✗ AI chatbot

✗ Consulting

✗ Productivity Tool

✗ Accelerator

✗ Automation Platform

Explain why.

---

## 7 Design System Principles

Using Atomic Design define:

- design consistency
- reusable interface components
- navigation principles
- page hierarchy
- layout standards

Focus on principles rather than implementation.

---

## 8 Accessibility Standards

Using WCAG guidelines define:

- colour contrast
- typography
- readability
- accessibility
- inclusive design

Document minimum accessibility expectations.

---

## 9 Communication Standards

Define standards for:

- website
- presentations
- sales material
- investor decks
- reports
- proposals
- emails
- LinkedIn
- social media

Each communication channel should feel recognisably Edge Alpha.

---

## 10 AI Executive Communication Standards

Define how AI Executives should communicate.

Include:

- professionalism
- tone
- formatting
- executive style
- level of detail
- evidence standards

Ensure every Executive writes consistently.

---

## 11 Brand Consistency Checklist

Develop a checklist for reviewing future assets.

Examples:

□ Consistent terminology

□ Consistent positioning

□ Tone of voice maintained

□ Brand Promise reinforced

□ Visual identity respected

□ Executive writing standard achieved

□ Clear call to action

---

## 12 Key Findings

Summarise:

- communication principles
- visual identity
- tone of voice
- terminology
- consistency standards

Do not recommend campaigns.

---

# Output

Generate one complete **Brand Guidelines** Management Asset.

Expected length:

**8–12 pages**

Use executive-quality formatting.

Include where appropriate:

- colour palettes
- typography hierarchy
- icon examples
- layout examples
- tone-of-voice cards
- writing examples
- terminology tables
- communication matrices
- checklists
- call-out boxes
- visual standards

Optimise for practical day-to-day use.

---

# Success Criteria

The Asset is successful when:

- every employee communicates consistently
- every AI Executive writes with the same voice
- the Brand Identity is expressed consistently across all channels
- visual identity supports the Brand Identity
- terminology is standardised
- communication becomes recognisably Edge Alpha regardless of channel or author

The Founder should finish reading this Asset with complete confidence that the company's identity can now be expressed consistently by designers, marketers, sales teams, executives and AI agents alike.`
