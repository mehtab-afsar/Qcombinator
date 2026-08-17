/**
 * AS010 — Asset Instructions for "Content Strategy".
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
export const AS010_CONTENT_STRATEGY_PROMPT = `
---

# AS010 — Content Strategy

## Purpose

You are responsible for creating the company's **Content Strategy**.

The Content Strategy defines how the company attracts, educates, nurtures and converts its target audiences through consistent, high-quality content.

The objective is **not** to create individual articles, social media posts or campaigns.

The objective is to design a repeatable content system that guides all future publishing activities and ensures every piece of content supports measurable business objectives.

The Content Strategy becomes the company's authoritative reference for all content creation.

---

# Business Outcome

A successful Content Strategy should:

* increase brand awareness
* establish thought leadership
* educate target audiences
* generate qualified demand
* strengthen customer trust
* support commercial objectives
* create reusable intellectual property

Every recommendation should contribute to measurable business outcomes.

---

# Required Inputs

Before creating the Content Strategy, review all available company information.

This may include:

* company overview
* products and services
* target customers
* market positioning
* business objectives
* existing content
* website
* social media
* sales material
* customer research
* market research
* competitor analysis
* available marketing assets

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* indicate confidence where appropriate

---

# Knowledge Framework

Develop the Content Strategy using the following proven methodologies.

Apply each framework pragmatically.

Do not force frameworks where they do not improve the quality of the strategy.

---

## TOFU – MOFU – BOFU Content Funnel

Develop a complete content journey.

### TOFU (Top of Funnel)

Focus on:

* awareness
* education
* discovery
* market understanding

---

### MOFU (Middle of Funnel)

Focus on:

* trust
* expertise
* consideration
* evaluation

---

### BOFU (Bottom of Funnel)

Focus on:

* proof
* conversion
* confidence
* decision support

---

## Content Pillars Framework

Develop four to six long-term editorial themes.

Each pillar should:

* address audience interests
* support business objectives
* demonstrate expertise
* remain sustainable over time

Every future content asset should belong to one content pillar.

---

## PESO Model

Develop an integrated content distribution strategy across:

### Paid Media

Advertising

Sponsored content

Promoted campaigns

---

### Earned Media

Public relations

Media coverage

Guest articles

Podcasts

Industry publications

---

### Shared Media

LinkedIn

Social media

Communities

Referrals

Partner channels

---

### Owned Media

Website

Blog

Newsletter

Knowledge hub

Resource centre

---

## Hub-and-Spoke Content Model

Identify:

### Hub Content

Evergreen flagship content that demonstrates expertise.

Examples include:

* guides
* reports
* research
* webinars
* whitepapers
* executive insights

---

### Spoke Content

Derivative content created from Hub assets.

Examples include:

* social posts
* newsletters
* infographics
* videos
* podcasts
* email campaigns

Every Spoke should reinforce a Hub asset.

---

## Editorial Calendar Framework

Develop a sustainable publishing cadence.

Consider:

* daily
* weekly
* monthly
* quarterly
* annual initiatives

Balance consistency with available resources.

---

# Deliverable

Produce the following sections.

---

# Executive Summary

Provide a concise overview of the Content Strategy.

---

# Strategic Objectives

Explain:

* why content matters
* business objectives
* intended outcomes

---

# Target Audiences

Describe:

* primary audiences
* information needs
* buying journey
* content preferences

---

# Content Funnel

Develop a complete TOFU–MOFU–BOFU content strategy.

For each stage include:

* audience intent
* objectives
* recommended content
* distribution channels
* success metrics

---

# Content Pillars

Develop four to six editorial pillars.

For each pillar define:

* purpose
* target audience
* business objective
* key themes
* example content ideas

---

# Channel Strategy

Define the role of each communication channel.

Where appropriate include:

* website
* blog
* newsletter
* LinkedIn
* YouTube
* podcasts
* webinars
* PR
* community
* events

Explain the purpose of each channel.

---

# Hub-and-Spoke Strategy

Identify:

Primary Hub Assets

↓

Supporting Spoke Content

Demonstrate how flagship content generates multiple derivative assets.

---

# Editorial Calendar

Develop a recommended publishing rhythm.

Include:

* publishing frequency
* campaign planning
* seasonal opportunities
* flagship content initiatives

Present the recommendations visually where appropriate.

---

# Campaign Architecture

Describe how content campaigns should be structured.

Include:

* objective
* audience
* core content
* supporting content
* distribution
* call-to-action
* measurement

---

# Content Governance

Define:

* content ownership
* editorial workflow
* review process
* approval process
* version control
* content reuse principles

---

# Success Metrics

Recommend KPIs including:

* reach
* engagement
* subscribers
* qualified leads
* conversions
* website traffic
* organic search
* community growth
* thought leadership
* content reuse

---

# Visual Design

Present the strategy using visual communication wherever appropriate.

Examples include:

* funnel diagrams
* editorial calendars
* content pillar maps
* channel matrices
* campaign workflows
* publishing timelines
* KPI dashboards

Avoid long blocks of uninterrupted text.

---

# Quality Standards

The Content Strategy should be:

* audience-centric
* commercially relevant
* practical
* sustainable
* measurable
* internally consistent
* reusable
* visually structured
* executive quality

Avoid:

* random content ideas
* trend chasing
* channel-first thinking
* vanity metrics
* generic marketing advice

Every recommendation should support a defined business objective.

---

# Completion Check

Before completing the Content Strategy ask:

* Does the strategy support the company's business objectives?
* Does it address the entire customer journey?
* Are the content pillars clearly defined?
* Does every communication channel have a clear purpose?
* Is the publishing cadence realistic?
* Are success metrics measurable?
* Can another executive execute this strategy without further explanation?

If the answer to any question is **No**, improve the Content Strategy before completion.`
