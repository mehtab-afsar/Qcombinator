/**
 * AS011 — Asset Instructions for "SEO Strategy".
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
export const AS011_SEO_STRATEGY_PROMPT = `# AS011 — SEO Strategy

## Purpose

You are responsible for creating the company's **SEO Strategy**.

The SEO Strategy defines how the company builds long-term organic visibility by creating authoritative, relevant and discoverable content.

The objective is **not** to optimise individual webpages.

The objective is to design a sustainable search strategy that establishes topical authority, attracts qualified visitors and supports measurable business objectives.

The SEO Strategy becomes the company's authoritative reference for all search engine optimisation activities.

---

# Business Outcome

A successful SEO Strategy should:

* increase qualified organic traffic
* establish topical authority
* improve search visibility
* attract high-intent visitors
* strengthen brand credibility
* support lead generation
* create sustainable long-term growth

Every recommendation should support measurable business outcomes rather than search rankings alone.

---

# Required Inputs

Before creating the SEO Strategy, review all available company information.

This may include:

* company overview
* products and services
* target customers
* market positioning
* business objectives
* existing website
* existing content
* customer research
* competitor analysis
* available analytics
* keyword research
* industry trends

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* indicate confidence where appropriate

---

# Knowledge Framework

Develop the SEO Strategy using the following proven methodologies.

Apply each framework pragmatically.

Do not optimise for search engines at the expense of user value.

---

## Topic Cluster Model

Organise the company's expertise into clear knowledge domains.

Identify the major topics the company should own.

Each topic should represent a long-term area of authority rather than an isolated keyword.

For each Topic Cluster define:

* business relevance
* customer relevance
* commercial objective
* supporting content opportunities

---

## Search Intent Framework

Categorise search behaviour into:

### Informational

The user wants to learn.

---

### Navigational

The user wants to find a specific company or resource.

---

### Commercial Investigation

The user is comparing alternatives.

---

### Transactional

The user is ready to act.

Develop content appropriate for each search intent.

---

## E-E-A-T Principles

Ensure the strategy demonstrates:

### Experience

First-hand expertise.

---

### Expertise

Professional knowledge.

---

### Authoritativeness

Recognised industry leadership.

---

### Trustworthiness

Evidence-based, transparent and credible information.

Recommend methods to strengthen each dimension.

---

## Pillar & Cluster Strategy

Develop a content architecture where:

Pillar Pages provide comprehensive coverage of major topics.

Cluster Pages explore specific supporting themes.

Clearly define internal linking relationships.

The objective is to build topical authority rather than isolated pages.

---

## Keyword Opportunity Matrix

Prioritise keyword opportunities using:

* search intent
* business relevance
* competitive difficulty
* commercial value
* authority potential

Group opportunities into:

* High Priority
* Medium Priority
* Long-Term Opportunities

Avoid focusing exclusively on search volume.

---

# Deliverable

Produce the following sections.

---

# Executive Summary

Provide a concise overview of the SEO Strategy.

---

# Strategic Objectives

Explain:

* why SEO matters
* business objectives
* intended outcomes

---

# SEO Vision

Describe the long-term search strategy.

Explain:

* which topics the company should own
* how authority will be built
* how SEO supports the business strategy

---

# Target Search Audiences

Describe:

* primary audiences
* search behaviour
* information needs
* decision journey

---

# Search Intent Strategy

Develop a search intent matrix.

For each intent define:

* audience objective
* recommended content
* desired business outcome

---

# Topic Cluster Strategy

Develop the company's primary Topic Clusters.

For each Topic Cluster define:

* topic name
* business objective
* target audience
* supporting cluster topics
* recommended pillar page

Present the Topic Cluster architecture visually.

---

# Pillar & Cluster Architecture

Develop the recommended website architecture.

For each Pillar Page identify:

* supporting Cluster Pages
* internal linking strategy
* content relationships

---

# Keyword Opportunity Matrix

Develop a prioritised keyword strategy.

For each keyword opportunity include:

* keyword theme
* search intent
* commercial relevance
* competitive difficulty
* implementation priority

Focus on strategic keyword groups rather than isolated keywords.

---

# Authority Strategy

Describe how the company should build long-term authority through:

* original research
* thought leadership
* expert content
* case studies
* proprietary methodologies
* educational resources
* industry participation

---

# Technical SEO Priorities

Identify the most important technical priorities including:

* crawlability
* website architecture
* page performance
* structured data
* mobile optimisation
* metadata consistency
* internal linking

Focus on strategic priorities rather than implementation detail.

---

# Content Integration

Explain how SEO integrates with:

* website
* blog
* resource library
* content strategy
* newsletters
* webinars
* evergreen content
* thought leadership

SEO should strengthen the overall content ecosystem.

---

# Success Metrics

Recommend KPIs including:

* organic traffic
* keyword visibility
* topical authority
* indexed pages
* click-through rate
* backlinks
* domain authority
* qualified organic leads
* conversions
* content engagement

---

# SEO Roadmap

Recommend a phased implementation approach.

Include:

### Phase 1

Quick Wins

---

### Phase 2

Authority Building

---

### Phase 3

Long-Term Leadership

Prioritise sustainable growth over short-term ranking gains.

---

# Visual Design

Present the strategy using visual communication wherever appropriate.

Examples include:

* Topic Cluster maps
* Pillar & Cluster diagrams
* Search Intent matrices
* Keyword Opportunity matrices
* Website architecture diagrams
* SEO roadmap
* KPI dashboards

Avoid large blocks of uninterrupted text.

---

# Quality Standards

The SEO Strategy should be:

* audience-centric
* commercially relevant
* evidence-based
* strategically aligned
* sustainable
* measurable
* reusable
* visually structured
* executive quality

Avoid:

* keyword stuffing
* ranking-first thinking
* generic SEO checklists
* search volume obsession
* technical jargon without business value

---

# Completion Check

Before completing the SEO Strategy ask:

* Does the strategy support the company's business objectives?
* Are Topic Clusters clearly defined?
* Does every major topic support customer needs?
* Is search intent addressed throughout the customer journey?
* Does the strategy strengthen E-E-A-T?
* Are keyword priorities commercially relevant?
* Is the implementation roadmap realistic?
* Can another executive execute this strategy without further clarification?

If the answer to any question is **No**, improve the SEO Strategy before completion.`
