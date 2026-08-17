/**
 * AS009 — Asset Instructions for "Narrative Framework".
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
 *
 * The workbook itself notes AS009 should become the parent communication
 * asset — later assets (website copy, investor narrative, outbound
 * messaging, sales deck, ...) should depend on it rather than each inventing
 * its own story. Recorded here since nothing in the Registry types enforces
 * asset-to-asset dependencies yet; it is a fact for a future reader, not a
 * field to add speculatively (CLAUDE.md §7).
 */
export const AS009_NARRATIVE_FRAMEWORK_PROMPT = `# AS009 — Narrative Framework

## Purpose


Create the company's master communication framework.

The Narrative Framework defines how the company consistently communicates its purpose, positioning, value proposition and transformation to customers, partners, employees and investors.

The objective is **not** to write marketing copy.

The objective is to create the company's authoritative communication blueprint that becomes the foundation for all future messaging.

---

# Business Outcome

A high-quality Narrative Framework should:

* create a clear and memorable company story
* strengthen positioning
* improve communication consistency
* simplify sales conversations
* improve fundraising communication
* increase customer understanding
* align internal and external messaging

The Narrative Framework becomes the single source of truth for company communication.

---

# Required Inputs

Always review:

* Company Context
* Strategy Session (S001)
* Executive Contract (S002)
* Latest Q-Score
* Patel System Prompt
* Program Prompt
* Existing Company Assets
* Website
* Pitch Deck
* Sales Material
* Product Documentation
* Customer Interviews
* Founder Interviews

Where information is missing:

* make reasonable assumptions
* clearly identify assumptions
* assign confidence levels

---

# Knowledge Framework

Synthesize the following communication methodologies.

Do **not** mechanically apply them.

Use them to produce one coherent communication framework.

## StoryBrand (SB7)

Clarify:

* Character
* Problem
* Guide
* Plan
* Call to Action
* Success
* Failure

---

## Hero's Journey

Identify:

* current state
* desired transformation
* emotional tension
* future state

Apply only where useful.

Avoid unnecessary storytelling.

---

## Pixar Story Spine

Use to test logical narrative flow.

Once...

Every day...

Until one day...

Because of that...

Until finally...

---

## Simon Sinek — Golden Circle

Clearly define

WHY

HOW

WHAT

Ensure consistency throughout the document.

---

## Message House

Develop

Core Message

Supporting Pillars

Evidence

Proof Points

Audience Variations

---

# Deliverable

Produce the following sections.

---

# Executive Summary

One-page overview of the company's narrative.

---

# Company Story

A concise narrative describing:

* why the company exists
* what problem it solves
* why it matters
* how it creates value

---

# The Why

Purpose

Mission

Belief

Vision

---

# Customer Problem

Describe:

* the problem
* current alternatives
* frustrations
* consequences

---

# The Transformation

Illustrate the transformation.

Current State

↓

Desired Future State

Clearly describe how customers benefit.

---

# The Company's Role

Explain:

Why this company?

Why now?

Why is it uniquely positioned?

---

# Core Narrative

Develop one concise narrative suitable for general company communication.

Maximum approximately 300 words.

---

# Messaging Pillars

Develop three to five messaging pillars.

For each include:

* headline
* explanation
* supporting evidence

---

# Message House

Create a visual Message House including:

Core Message

↓

Supporting Messages

↓

Proof Points

---

# Audience Adaptation

Adapt the narrative for:

Customers

Investors

Partners

Employees

Media

Explain what changes.

Explain what remains constant.

---

# Proof Points

Support every important communication claim with evidence.

Examples:

* technology
* traction
* customers
* patents
* partnerships
* founder expertise
* market validation

Clearly distinguish evidence from aspiration.

---

# Tone of Voice

Define:

* personality
* communication style
* preferred vocabulary
* words to avoid
* writing principles

---

# Narrative Consistency Review

Review existing company communication.

Identify:

* inconsistencies
* conflicting messages
* duplicated messages
* weak positioning
* missing proof

Do not rewrite the material.

Simply document observations.

---

# Narrative Principles

Conclude with ten communication principles the company should consistently follow.

Examples:

* Speak about customer outcomes before technology.
* Use evidence before claims.
* Be specific rather than aspirational.
* Maintain one consistent positioning.
* Communicate with clarity before persuasion.

---

# Visual Design

Use visual communication wherever appropriate.

Examples include:

* Message House
* Story Flow Diagram
* Customer Transformation Diagram
* Golden Circle
* Messaging Matrix
* Positioning Matrix
* Before / After comparison
* Narrative hierarchy

Avoid long blocks of text.

---

# Relationship to Other Assets

The Narrative Framework becomes the communication foundation for:

* Website
* Pitch Deck
* Sales Deck
* Investor Narrative
* Messaging Framework
* Outbound Campaigns
* Social Media
* Thought Leadership
* Founder Biography

These assets should remain consistent with the Narrative Framework.

---

# Quality Standards

The Narrative Framework should be:

* authentic
* memorable
* evidence-based
* internally consistent
* commercially relevant
* founder-specific
* easy to communicate
* easy to reuse

Avoid:

* marketing clichés
* buzzwords
* exaggerated claims
* generic startup language
* unsupported statements

Every important communication claim should be supported by evidence or explicitly identified as an aspiration.

---

# Completion Check

Before completing the Narrative Framework ask:

* Does the narrative clearly explain why the company exists?
* Is the customer transformation obvious?
* Is the positioning distinctive?
* Can customers immediately understand the value proposition?
* Would investors understand the opportunity?
* Could every employee consistently communicate this story?
* Does this provide a reusable communication blueprint for the entire company?
* Are all major claims supported by evidence?

If the answer to any question is **No**, improve the Narrative Framework before completion.`
