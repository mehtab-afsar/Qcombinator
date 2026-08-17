/**
 * AS017 — Asset Instructions for "Pricing & Packaging Strategy".
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
export const AS017_PRICING_PACKAGING_STRATEGY_PROMPT = `# AS017 — Pricing & Packaging Strategy

## Purpose

You are responsible for creating the company's **Pricing & Packaging Strategy**.

The Pricing & Packaging Strategy defines how the company prices, packages and commercialises its products and services to maximise customer value, commercial competitiveness and long-term revenue growth.

The objective is **not** to recommend a single price.

The objective is to design a structured pricing system that aligns customer value, product packaging, commercial strategy and financial sustainability.

The Pricing & Packaging Strategy becomes the company's authoritative reference for all pricing, packaging and commercial policy decisions.

---

# Business Outcome

A successful Pricing & Packaging Strategy should:

* maximise customer value
* improve pricing confidence
* increase revenue growth
* improve gross margins
* simplify purchasing decisions
* reduce unnecessary discounting
* create scalable commercial packaging

Every recommendation should contribute to measurable commercial outcomes.

---

# Required Inputs

Before creating the Pricing & Packaging Strategy, review all available company information.

This may include:

* company overview
* products and services
* target customers
* ICP
* customer segments
* value proposition
* positioning
* pricing history
* competitor pricing
* sales process
* customer feedback
* revenue model
* financial assumptions
* cost structure
* unit economics
* historical sales performance

Never request information that is already available.

Where information is incomplete:

* make reasonable assumptions
* clearly distinguish assumptions from facts
* indicate confidence where appropriate.

---

# Knowledge Framework

Develop the Pricing & Packaging Strategy using the following proven methodologies.

Apply each framework pragmatically.

Design a pricing strategy that reflects customer value rather than internal costs alone.

---

## Value-Based Pricing

Develop pricing based on the value delivered to customers.

Consider:

* customer outcomes
* economic impact
* business value
* willingness to pay
* competitive differentiation
* strategic importance

Prioritise value creation over cost recovery.

---

## Van Westendorp Price Sensitivity Meter

Evaluate customer price perception using four pricing thresholds:

* Too Cheap
* Cheap
* Expensive
* Too Expensive

Identify the acceptable pricing range.

Explain how pricing decisions should balance customer perception with commercial objectives.

---

## Good–Better–Best Packaging

Develop a structured packaging strategy.

Design product or service tiers with progressively increasing value.

For each tier define:

* target customer
* included features
* business outcomes
* differentiation
* upgrade path

Ensure each package has a clear purpose.

---

## Price Waterfall

Develop a pricing governance framework.

Consider:

* list price
* promotional pricing
* negotiated discounts
* channel discounts
* rebates
* incentives
* final realised price

Identify where commercial value is created or lost throughout the pricing process.

---

## SaaS Unit Economics

Where applicable, evaluate pricing using SaaS commercial metrics.

Consider:

* Customer Acquisition Cost (CAC)
* Customer Lifetime Value (LTV)
* Gross Margin
* Payback Period
* Average Revenue Per User (ARPU)
* Monthly Recurring Revenue (MRR)
* Annual Recurring Revenue (ARR)
* Churn

Where SaaS metrics are not applicable, adapt the framework to the company's commercial model.

---

# Deliverable

Produce the following sections.

---

# Executive Summary

Provide a concise overview of the Pricing & Packaging Strategy.

---

# Strategic Objectives

Explain:

* pricing objectives
* commercial priorities
* revenue objectives
* business outcomes

---

# Pricing Philosophy

Define the company's overall pricing philosophy.

Explain:

* how pricing reflects value
* how commercial decisions should be made
* pricing principles
* customer value proposition

---

# Customer Value Assessment

Identify the primary sources of customer value.

Describe:

* measurable business outcomes
* financial impact
* operational improvements
* strategic value
* competitive advantage

Explain how pricing reflects customer value.

---

# Pricing Model

Develop the recommended pricing model.

Examples may include:

* subscription
* recurring revenue
* licence
* usage-based
* seat-based
* project-based
* transaction-based
* outcome-based
* hybrid pricing

Explain why the recommended model best supports the business.

---

# Packaging Strategy

Develop a structured product and service packaging model.

For each package define:

* package name
* target customer
* included capabilities
* business outcomes
* differentiation
* upgrade path
* commercial positioning

Present the package architecture visually where appropriate.

---

# Price Sensitivity Analysis

Assess pricing using the Van Westendorp methodology.

Define:

* acceptable pricing range
* pricing opportunities
* pricing risks
* customer perception

Explain the rationale behind recommended pricing decisions.

---

# Competitive Pricing Review

Review the competitive pricing landscape.

Identify:

* pricing approaches
* positioning differences
* pricing advantages
* pricing risks
* opportunities for differentiation

Focus on strategic positioning rather than simple price comparison.

---

# Discount Policy

Develop a structured discount policy.

Define:

* approval levels
* maximum discount thresholds
* strategic discount situations
* prohibited discounting
* commercial governance

Ensure discounting supports long-term pricing integrity.

---

# Revenue Model

Describe how pricing contributes to long-term revenue generation.

Consider:

* recurring revenue
* expansion revenue
* renewals
* upselling
* cross-selling
* customer lifetime value

Explain how pricing supports sustainable business growth.

---

# Unit Economics Assessment

Evaluate the commercial viability of the pricing model.

Where applicable assess:

* CAC
* LTV
* CAC:LTV ratio
* Gross Margin
* Payback Period
* ARPU
* MRR
* ARR
* Churn

Explain the commercial implications.

---

# Financial Scenario Analysis

Develop multiple pricing scenarios.

Examples include:

* conservative
* expected
* premium

Compare:

* revenue impact
* profitability
* customer adoption
* commercial risks

Present scenario comparisons visually where appropriate.

---

# Pricing Governance

Define pricing governance including:

* pricing ownership
* review frequency
* approval process
* exception handling
* pricing documentation
* commercial oversight

---

# Success Metrics

Recommend KPIs including:

* average selling price
* gross margin
* revenue growth
* customer acquisition
* customer lifetime value
* renewal rate
* expansion revenue
* average discount
* realised price
* pricing win rate
* package adoption

---

# Visual Design

Present the Pricing & Packaging Strategy using visual communication wherever appropriate.

Examples include:

* pricing architecture
* package comparison tables
* value ladders
* pricing waterfalls
* unit economics dashboards
* scenario comparisons
* pricing matrices
* revenue model diagrams

Avoid large blocks of uninterrupted text.

---

# Quality Standards

The Pricing & Packaging Strategy should be:

* customer-centric
* value-based
* commercially relevant
* financially sound
* evidence-based
* scalable
* measurable
* internally consistent
* visually structured
* executive quality

Avoid:

* cost-plus pricing without value justification
* arbitrary pricing decisions
* excessive discounting
* unnecessary pricing complexity
* feature-driven packaging
* unsupported pricing assumptions

Every recommendation should strengthen long-term commercial performance while delivering clear customer value.

---

# Completion Check

Before completing the Pricing & Packaging Strategy ask:

* Does pricing clearly reflect customer value?
* Is the pricing model commercially sustainable?
* Are product packages clearly differentiated?
* Is the discount policy governed appropriately?
* Does the revenue model support long-term growth?
* Are unit economics commercially viable?
* Are pricing recommendations evidence-based?
* Can another executive implement this pricing strategy without further clarification?

If the answer to any question is **No**, improve the Pricing & Packaging Strategy before completion.`
