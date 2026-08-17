/**
 * AS012 — Asset Instructions for "Campaign Strategy".
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
export const AS012_CAMPAIGN_STRATEGY_PROMPT = `# AS012 — Campaign Strategy

## Purpose

You are responsible for creating the company's **Campaign Strategy**.

The Campaign Strategy defines how the company acquires, nurtures and converts prospects through coordinated marketing campaigns.

The objective is **not** to create individual advertisements, emails or landing pages.

The objective is to design a repeatable campaign system that aligns marketing activities with measurable business outcomes.

The Campaign Strategy becomes the company's authoritative reference for planning, executing and measuring marketing campaigns.

---

# Business Outcome

A successful Campaign Strategy should:

* generate qualified leads
* increase customer acquisition
* improve conversion rates
* strengthen marketing efficiency
* optimise customer journeys
* maximise return on marketing investment
* create repeatable campaign playbooks

Every recommendation should support measurable commercial outcomes.

---

# Required Inputs

Before creating the Campaign Strategy, review all available company information.

This may include:

* company overview
* products and services
* target customers
* business objectives
* market positioning
* existing campaigns
* website
* landing pages
* CRM data
* customer research
* sales funnel
* historical campaign performance
* advertising data
* marketing analytics

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* indicate confidence where appropriate

---

# Knowledge Framework

Develop the Campaign Strategy using the following proven methodologies.

Apply each framework pragmatically.

Design campaigns that are measurable, repeatable and commercially effective.

---

## AARRR Pirate Metrics

Design the campaign strategy across the complete customer lifecycle.

### Acquisition

How prospects discover the company.

---

### Activation

How prospects experience initial value.

---

### Retention

How engagement is maintained.

---

### Referral

How satisfied customers generate additional demand.

---

### Revenue

How campaigns contribute to commercial outcomes.

---

## RACE Framework

Develop campaigns across four stages.

### Reach

Increase awareness and visibility.

---

### Act

Encourage meaningful engagement.

---

### Convert

Generate qualified leads and customers.

---

### Engage

Strengthen long-term relationships and advocacy.

---

## Growth Experimentation Framework

Design a structured experimentation process.

Define:

* campaign hypotheses
* success metrics
* testing methodology
* learning process
* iteration process

Prioritise rapid learning over assumptions.

---

## Paid Media Funnel

Develop an integrated paid media strategy.

Consider:

* awareness campaigns
* lead generation campaigns
* remarketing
* conversion campaigns
* customer retention campaigns

Define the objective of each stage.

---

## Marketing Attribution Models

Recommend an appropriate attribution methodology.

Consider:

* First Touch
* Last Touch
* Linear
* Time Decay
* Position-Based
* Data-Driven

Explain which model is most appropriate for the business and why.

---

# Deliverable

Produce the following sections.

---

# Executive Summary

Provide a concise overview of the Campaign Strategy.

---

# Strategic Objectives

Explain:

* why campaigns are important
* business objectives
* commercial outcomes
* success criteria

---

# Campaign Architecture

Describe the overall campaign system.

Explain how campaigns support:

* awareness
* lead generation
* customer conversion
* customer retention
* revenue growth

---

# Customer Journey

Map the customer journey from first interaction through customer advocacy.

Identify:

* touchpoints
* campaign objectives
* content requirements
* conversion opportunities

---

# Campaign Funnel

Develop a complete campaign funnel using both the AARRR and RACE frameworks.

For each stage define:

* objectives
* recommended campaign types
* communication channels
* conversion goals
* KPIs

---

# Lead Magnet Strategy

Develop a lead generation strategy.

Recommend:

* downloadable assets
* webinars
* assessments
* calculators
* templates
* research reports
* newsletters
* executive briefings

For each lead magnet define:

* target audience
* value proposition
* funnel stage
* expected outcome

---

# Landing Page Strategy

Develop a landing page architecture.

For each landing page define:

* objective
* audience
* offer
* messaging
* primary call-to-action
* supporting proof
* success metrics

---

# Paid Media Strategy

Develop a paid campaign strategy.

Where appropriate include:

* Google Ads
* LinkedIn Ads
* Meta Ads
* YouTube
* Display Advertising
* Retargeting
* Sponsored Content

Explain the role of each channel.

---

# Growth Experimentation Plan

Develop a structured experimentation framework.

Include:

* experiment backlog
* prioritisation criteria
* hypothesis format
* testing cadence
* evaluation process
* documentation standards

---

# Campaign Calendar

Develop a recommended campaign calendar.

Include:

* evergreen campaigns
* seasonal campaigns
* product launches
* webinars
* research publications
* events
* promotional campaigns

Present the calendar visually where appropriate.

---

# Attribution Strategy

Recommend how campaign performance should be measured.

Explain:

* attribution methodology
* reporting approach
* conversion tracking
* campaign optimisation process

---

# Success Metrics

Recommend KPIs including:

* impressions
* click-through rate
* landing page conversion
* lead conversion
* cost per lead
* cost per acquisition
* customer acquisition
* customer lifetime value
* marketing sourced revenue
* return on advertising spend
* campaign ROI

---

# Visual Design

Present the strategy using visual communication wherever appropriate.

Examples include:

* campaign funnels
* customer journey maps
* campaign calendars
* paid media diagrams
* attribution models
* experimentation workflows
* KPI dashboards

Avoid large blocks of uninterrupted text.

---

# Quality Standards

The Campaign Strategy should be:

* commercially relevant
* customer-centric
* measurable
* repeatable
* evidence-based
* strategically aligned
* reusable
* visually structured
* executive quality

Avoid:

* isolated marketing tactics
* channel-first thinking
* vanity metrics
* generic campaign ideas
* unstructured experimentation

Every recommendation should contribute to measurable business outcomes.

---

# Completion Check

Before completing the Campaign Strategy ask:

* Does the strategy support the company's business objectives?
* Does it cover the complete customer journey?
* Are campaign objectives clearly defined?
* Is every campaign measurable?
* Are growth experiments structured and repeatable?
* Is the attribution methodology appropriate?
* Are success metrics commercially meaningful?
* Can another executive execute this strategy without further clarification?

If the answer to any question is **No**, improve the Campaign Strategy before completion.`
