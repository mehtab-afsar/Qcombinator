/**
 * AS015 — Asset Instructions for "Customer Acquisition Blueprint".
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
export const AS015_CUSTOMER_ACQUISITION_BLUEPRINT_PROMPT = `# AS015 — Customer Acquisition Blueprint

## Purpose

You are responsible for creating the company's **Customer Acquisition Blueprint**.

The Customer Acquisition Blueprint defines how the company consistently identifies, attracts, qualifies, nurtures and converts prospective customers into long-term clients.

The objective is **not** to design isolated marketing or sales activities.

The objective is to build a complete customer acquisition system that integrates marketing, sales, CRM, lead qualification and revenue operations into one repeatable commercial engine.

The Customer Acquisition Blueprint becomes the company's authoritative reference for customer acquisition.

---

# Business Outcome

A successful Customer Acquisition Blueprint should:

* generate predictable customer growth
* improve lead quality
* increase conversion rates
* reduce customer acquisition costs
* shorten sales cycles
* improve sales and marketing alignment
* create a scalable acquisition engine

Every recommendation should support measurable commercial outcomes.

---

# Required Inputs

Before creating the Customer Acquisition Blueprint, review all available company information.

This may include:

* company overview
* products and services
* target customers
* ICP
* buyer personas
* positioning
* pricing
* customer journey
* sales process
* CRM data
* marketing performance
* sales performance
* historical conversion data
* existing acquisition channels
* competitor analysis
* revenue objectives

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* indicate confidence where appropriate

---

# Knowledge Framework

Develop the Customer Acquisition Blueprint using the following proven methodologies.

Apply each framework pragmatically.

Design an acquisition engine that is scalable, measurable and commercially effective.

---

## AARRR Growth Funnel

Design the acquisition process across the complete customer lifecycle.

### Acquisition

How prospects discover the company.

---

### Activation

How prospects experience initial value.

---

### Retention

How customers remain engaged.

---

### Referral

How satisfied customers generate additional demand.

---

### Revenue

How customer relationships generate sustainable revenue.

---

## Bullseye Framework

Evaluate all major customer acquisition channels.

Prioritise channels based on:

* commercial potential
* scalability
* cost efficiency
* customer fit
* speed of learning

Identify:

* primary channels
* secondary channels
* future opportunities

---

## HubSpot Flywheel

Design a customer-centric growth model.

Include:

* Attract
* Engage
* Delight

Explain how satisfied customers contribute to future acquisition.

---

## Revenue Operations (RevOps)

Develop an integrated operating model across:

* marketing
* sales
* customer success

Define:

* ownership
* process handoffs
* shared KPIs
* reporting
* operational consistency

---

## Conversion Rate Optimisation (CRO)

Identify opportunities to improve conversion throughout the acquisition funnel.

Review:

* landing pages
* forms
* calls-to-action
* email sequences
* qualification process
* sales process
* onboarding

Recommend a structured optimisation methodology.

---

# Deliverable

Produce the following sections.

---

# Executive Summary

Provide a concise overview of the Customer Acquisition Blueprint.

---

# Strategic Objectives

Explain:

* customer acquisition objectives
* commercial priorities
* growth targets
* business outcomes

---

# Acquisition Philosophy

Define the company's overall customer acquisition approach.

Explain:

* how customers should be acquired
* how marketing and sales work together
* how growth should be measured
* what differentiates the acquisition strategy

---

# Customer Acquisition Funnel

Develop a complete acquisition funnel.

Include:

* awareness
* engagement
* qualification
* conversion
* onboarding
* expansion
* referral

For each stage define:

* objectives
* responsible team
* success metrics
* transition criteria

---

# Acquisition Channel Strategy

Evaluate all relevant acquisition channels.

Examples include:

* outbound sales
* inbound marketing
* SEO
* content marketing
* paid advertising
* partnerships
* referrals
* communities
* webinars
* events
* PR

For each channel define:

* objective
* target audience
* expected contribution
* measurement approach
* implementation priority

---

# Lead Generation Strategy

Develop a structured lead generation approach.

Include:

* lead sources
* lead magnets
* prospecting methods
* campaigns
* qualification process
* nurturing process

---

# CRM Strategy

Develop the recommended CRM operating model.

Define:

* pipeline stages
* customer lifecycle
* opportunity management
* contact management
* activity tracking
* reporting
* data quality standards

---

# Lead Scoring Framework

Develop a structured lead scoring methodology.

Include:

### Demographic Fit

* industry
* company size
* geography
* customer profile

---

### Behavioural Signals

* website activity
* content engagement
* email engagement
* webinar participation
* meeting requests
* product interest

---

### Buying Readiness

* urgency
* decision stage
* budget signals
* stakeholder engagement

Clearly define qualification thresholds.

---

# Revenue Operations Model

Develop a RevOps operating model.

Define:

* marketing responsibilities
* sales responsibilities
* customer success responsibilities
* handoff criteria
* reporting cadence
* shared KPIs
* governance

---

# Conversion Optimisation Strategy

Identify the highest-impact optimisation opportunities.

Review:

* website conversion
* landing pages
* qualification
* sales conversations
* proposals
* onboarding

Develop a prioritised optimisation roadmap.

---

# Customer Journey

Map the complete acquisition journey.

Identify:

* touchpoints
* customer objectives
* company objectives
* friction points
* conversion opportunities

Present the journey visually where appropriate.

---

# Technology Stack

Recommend the required commercial systems.

Examples include:

* CRM
* marketing automation
* email platform
* sales engagement
* analytics
* attribution
* reporting
* customer success platform

Define the purpose of each system.

---

# Success Metrics

Recommend KPIs including:

* website visitors
* marketing qualified leads
* sales qualified leads
* opportunity conversion
* pipeline value
* win rate
* customer acquisition cost
* customer lifetime value
* payback period
* revenue growth
* referral rate

---

# Acquisition Dashboard

Define the executive dashboard required to monitor customer acquisition performance.

Include:

* funnel performance
* channel performance
* pipeline health
* lead quality
* conversion rates
* revenue contribution
* acquisition efficiency

---

# Visual Design

Present the Customer Acquisition Blueprint using visual communication wherever appropriate.

Examples include:

* acquisition funnel diagrams
* customer journey maps
* CRM pipeline diagrams
* lead scoring matrices
* RevOps process maps
* channel comparison matrices
* conversion dashboards
* KPI scorecards

Avoid large blocks of uninterrupted text.

---

# Quality Standards

The Customer Acquisition Blueprint should be:

* commercially relevant
* customer-centric
* evidence-based
* measurable
* scalable
* repeatable
* operationally integrated
* visually structured
* executive quality

Avoid:

* disconnected marketing tactics
* channel-first thinking
* vanity metrics
* isolated sales processes
* unstructured lead generation
* generic acquisition advice

Every recommendation should contribute to building a predictable and scalable customer acquisition engine.

---

# Completion Check

Before completing the Customer Acquisition Blueprint ask:

* Does the acquisition strategy support the company's business objectives?
* Is the acquisition funnel clearly defined from awareness to referral?
* Are acquisition channels prioritised appropriately?
* Is the CRM designed to support the customer lifecycle?
* Is lead scoring objective and actionable?
* Are marketing, sales and customer success aligned through RevOps?
* Are conversion optimisation opportunities clearly identified?
* Are success metrics commercially meaningful?
* Can another executive execute this acquisition system without further clarification?

If the answer to any question is **No**, improve the Customer Acquisition Blueprint before completion.`
