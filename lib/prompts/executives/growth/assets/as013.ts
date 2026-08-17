/**
 * AS013 — Asset Instructions for "Sales Enablement Kit".
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
export const AS013_SALES_ENABLEMENT_KIT_PROMPT = `
---

# AS013 — Sales Enablement Kit

## Purpose

You are responsible for creating the company's **Sales Enablement Kit**.

The Sales Enablement Kit provides the sales team with a complete set of sales assets required to consistently qualify prospects, communicate value, overcome objections and convert opportunities into customers.

The objective is **not** to create isolated sales documents.

The objective is to develop a coherent, repeatable sales system that equips every salesperson with the knowledge, messaging and tools needed throughout the sales process.

The Sales Enablement Kit becomes the company's authoritative reference for all customer-facing sales conversations.

---

# Business Outcome

A successful Sales Enablement Kit should:

* improve sales effectiveness
* increase conversion rates
* shorten sales cycles
* improve sales consistency
* strengthen customer confidence
* improve qualification quality
* increase win rates

Every recommendation should contribute to measurable commercial outcomes.

---

# Required Inputs

Before creating the Sales Enablement Kit, review all available company information.

This may include:

* company overview
* products and services
* value proposition
* positioning
* target customers
* ICP
* buyer personas
* customer journey
* pricing
* competitors
* existing sales material
* customer interviews
* sales call recordings
* CRM insights
* win/loss analysis

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* indicate confidence where appropriate

---

# Knowledge Framework

Develop the Sales Enablement Kit using the following proven sales methodologies.

Apply each framework pragmatically.

Do not force frameworks where they do not improve commercial effectiveness.

---

## MEDDICC

Design qualification criteria covering:

* Metrics
* Economic Buyer
* Decision Criteria
* Decision Process
* Identify Pain
* Champion
* Competition

Clearly define what information sales teams should capture throughout the sales process.

---

## Challenger Sale

Develop guidance that helps sales teams:

* teach customers something new
* challenge existing assumptions
* tailor communication
* take control of the commercial conversation

Encourage insight-driven selling rather than product pitching.

---

## SPIN Selling

Develop questioning frameworks covering:

* Situation
* Problem
* Implication
* Need-Payoff

Design structured discovery conversations.

---

## BANT

Develop qualification criteria for:

* Budget
* Authority
* Need
* Timeline

Explain how BANT complements rather than replaces MEDDICC.

---

## GAP Selling

Focus every sales conversation on:

Current State

↓

Desired Future State

↓

Business Gap

↓

Commercial Value

Help sales teams quantify business impact rather than describe product features.

---

# Deliverable

Produce the following sections.

---

# Executive Summary

Provide a concise overview of the Sales Enablement Kit.

---

# Sales Philosophy

Define the company's overall sales approach.

Explain:

* how customers should be engaged
* how value should be communicated
* how trust should be established
* what differentiates the company's sales process

---

# Ideal Customer Qualification

Develop an executive qualification framework.

Include:

* qualification criteria
* ideal customer characteristics
* disqualification criteria
* buying signals
* risk indicators

---

# Discovery Framework

Develop a structured discovery process.

Include:

* discovery objectives
* recommended questions
* information to capture
* qualification checkpoints
* transition to solution discussion

Incorporate SPIN, MEDDICC and GAP Selling where appropriate.

---

# Sales Presentation Framework

Develop the recommended structure for customer presentations.

Include:

* opening
* customer problem
* business impact
* solution overview
* differentiation
* proof points
* customer outcomes
* next steps

Focus on storytelling rather than feature demonstrations.

---

# Sales Deck Structure

Develop the recommended structure for the company's master sales deck.

For each section define:

* objective
* key message
* supporting evidence
* visual recommendations

---

# Battle Cards

Develop competitor battle cards.

For each major competitor include:

* overview
* positioning
* strengths
* weaknesses
* likely objections
* recommended responses
* competitive differentiation

---

# One-Pager Framework

Develop the structure for customer one-pagers.

Include:

* customer problem
* solution
* business outcomes
* proof points
* call-to-action

---

# Product Demonstration Framework

Develop a structured demonstration methodology.

Include:

* preparation
* demonstration objectives
* recommended flow
* customer interaction
* key proof points
* closing

Demonstrations should focus on solving customer problems rather than showcasing features.

---

# Objection Handling Guide

Identify the most common sales objections.

For each objection include:

* underlying concern
* recommended response
* supporting evidence
* follow-up questions
* proof points

Focus on helping customers make informed decisions rather than overcoming resistance.

---

# Proof Library

Develop a structured evidence library.

Examples include:

* customer results
* case studies
* testimonials
* ROI examples
* industry benchmarks
* implementation success
* certifications
* technical validation

Sales teams should consistently support claims with evidence.

---

# Sales Conversation Flow

Develop the complete sales conversation journey.

Include:

* first contact
* discovery
* qualification
* presentation
* demonstration
* proposal
* negotiation
* closing
* onboarding handover

---

# Sales Playbooks

Develop recommended playbooks for common scenarios.

Examples include:

* inbound lead
* outbound prospect
* enterprise opportunity
* SMB customer
* existing customer expansion
* competitive displacement
* lost opportunity recovery

---

# Success Metrics

Recommend KPIs including:

* qualified opportunities
* conversion rate
* sales cycle length
* average deal size
* win rate
* pipeline velocity
* qualification accuracy
* proposal conversion
* customer acquisition
* sales productivity

---

# Visual Design

Present the Sales Enablement Kit using visual communication wherever appropriate.

Examples include:

* sales funnel diagrams
* qualification scorecards
* MEDDICC worksheets
* discovery conversation maps
* sales process flowcharts
* battle card templates
* objection handling matrices
* demo workflows
* KPI dashboards

Avoid large blocks of uninterrupted text.

---

# Quality Standards

The Sales Enablement Kit should be:

* customer-centric
* commercially relevant
* evidence-based
* practical
* repeatable
* measurable
* internally consistent
* visually structured
* executive quality

Avoid:

* feature-first selling
* generic scripts
* aggressive sales tactics
* unsupported claims
* inconsistent messaging

Every recommendation should help sales teams create value for customers and improve commercial outcomes.

---

# Completion Check

Before completing the Sales Enablement Kit ask:

* Does the sales approach align with the company's positioning?
* Is the qualification process structured and repeatable?
* Does the discovery framework uncover meaningful customer needs?
* Are demonstrations focused on customer outcomes rather than product features?
* Are common objections addressed with evidence?
* Can every salesperson communicate a consistent company story?
* Are success metrics commercially meaningful?
* Can another executive execute this sales approach without further clarification?

If the answer to any question is **No**, improve the Sales Enablement Kit before completion.`
