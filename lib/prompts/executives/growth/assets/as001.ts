/**
 * AS001 — Asset Instructions for "ICP Profiles".
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
export const AS001_ICP_PROFILES_PROMPT = `---

# Asset Add-on

## Asset ID

**AS001**

## Asset Name

**ICP Profiles**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# Purpose

Produce a comprehensive **Ideal Customer Profile (ICP) Report** that identifies, evaluates and prioritises the customer segments that offer the greatest commercial opportunity for the company.

The objective is not to describe every potential customer.

The objective is to determine **which customers the company should pursue first**, who makes the buying decision, and why those customers represent the highest probability of commercial success.

The completed Asset should become the company's authoritative reference for customer selection and commercial prioritisation.

---

# Primary Analytical Framework

Use **STP (Segmentation – Targeting – Positioning)** as the primary analytical framework.

Analyse:

1. Market Segmentation
2. Target Customer Selection
3. Positioning Implications

The report should clearly distinguish between:

* all possible customers
* attractive customers
* priority ICPs

---

# Supporting Frameworks

Where appropriate, supplement the analysis using:

### Ideal Customer Profile (ICP) Framework

Define the characteristics of organisations that are most likely to become successful long-term customers.

Consider:

* organisation type
* industry
* geography
* company size
* maturity
* budget
* urgency
* strategic fit
* buying behaviour

---

### Buyer Personas

Identify the key individuals involved in purchasing.

Describe:

* responsibilities
* motivations
* success measures
* concerns
* decision criteria

Focus on business behaviour rather than demographic descriptions.

---

### Decision-Making Unit (DMU)

Map the complete buying committee.

Identify:

* Economic Buyer
* Technical Buyer
* Champion
* End User
* Procurement
* Executive Sponsor
* Influencers
* Gatekeepers

Describe the role each stakeholder plays during the buying process.

---

### Jobs-to-be-Done (JTBD)

JTBD, pains and gains are owned by **AS002** — reference it; do not redevelop this framework
here.

---

# Required Sections

---

## 1. Executive Summary

Provide a concise overview covering:

* priority ICP
* secondary ICPs
* highest-value industry
* strongest commercial opportunity
* recommended commercial focus

The Founder should understand the customer strategy within two minutes.

---

## 2. Market Segmentation (STP)

Segment the market using relevant criteria, such as:

* industry
* customer type
* organisation size
* geography
* application
* purchasing behaviour
* regulatory environment

Explain why these segments are commercially distinct.

---

## 3. Target Market Evaluation

Assess each segment against criteria such as:

* market attractiveness
* urgency
* budget availability
* ease of access
* sales cycle
* strategic value
* competitive intensity
* likelihood of adoption

Present findings in a comparison table.

---

## 4. Priority ICP Profiles

Develop detailed profiles for the top three to five ICPs.

For each ICP include:

* organisation description
* industry
* organisation size
* geography
* typical use cases
* business objectives
* buying motivations
* purchasing characteristics
* strategic importance

Conclude with an overall ICP score or ranking.

---

## 5. Buyer Personas

For each ICP, one compact block per key persona — role, top objective, top concern, buying
influence. Bullets, not a full table per persona.

---

## 6. Decision-Making Unit (DMU)

This is the **authoritative DMU for the company** — AS003 references this section rather than
redefining it, so keep it complete.

Map the buying committee for each ICP.

Include:

| Role | Responsibility | Influence | Decision Power |

Explain:

* who initiates the purchase
* who approves budget
* who evaluates technical suitability
* who signs contracts
* who influences the process

---

## 7. Jobs-to-be-Done — owned by AS002

Do not include this section. Reference AS002 for JTBD.

---

## 8. ICP Prioritisation Matrix — merged into §4

Do not include this section. §4's closing "overall ICP score or ranking" already covers it — a
second weighted-scoring table over the same ICPs is redundant. If §4's ranking needs more than
one line, expand it there.

---

## 9. Customer Qualification Criteria

Define the characteristics of an ideal prospect.

Examples:

* minimum organisation size
* geography
* technology readiness
* budget
* urgency
* executive sponsorship
* regulatory fit
* operational maturity

These criteria become the qualification standard for Sales and Marketing.

---

## 10. Executive Conclusions

Summarise:

* recommended primary ICP
* secondary ICPs
* customers to avoid
* highest-priority commercial opportunities
* implications for GTM

---

# Deliverables Produced

This Asset becomes the primary reference for:

* AS002 — Pains & Gains Matrix
* AS003 — Buyer Journey Map
* AS004 — Positioning & Messaging Framework
* AS005 — Channel Strategy
* AS006 — 90-Day GTM Plan
* AS013 — Sales Enablement Kit
* AS015 — Customer Acquisition Blueprint
* AS016 — Customer Success Framework
* AS017 — Pricing & Packaging Strategy

---

# Output

Generate one complete **ICP Profiles Report**.

Expected length:

**~1,000–1,200 words.** This is a working reference, not a deck — every sentence should be one
a founder acts on. Where a Required Section calls for a table, use one; do not pad it with prose
that repeats what the table already says.

Use executive-quality formatting including:

* executive summary cards
* STP segmentation diagrams
* ICP profile cards
* decision-making unit map
* industry comparison table
* qualification scorecard
* icons
* call-out boxes

Avoid long narrative sections.

Optimise for executive readability.

---

# Success Criteria

The Asset is successful when:

* market segments are clearly defined
* priority ICPs are objectively selected
* buyer personas are commercially relevant
* the Decision-Making Unit is understood
* customer qualification criteria are explicit
* the rationale for customer prioritisation is evidence-based
* downstream GTM assets can use this report as the authoritative source for customer selection

The Founder should finish reading the Asset with complete clarity on **which customers to pursue, who makes the buying decisions, why those customers represent the best commercial opportunity, and how commercial resources should be prioritised.**

---

**Division of responsibility across the GTM assets** (applied, not proposed):

* **AS001 (this asset) = "Who should we sell to?"** — market selection, ICPs, personas, DMU, prioritisation.
* **AS002 = "Why do they buy?"** — jobs, pains, gains, triggers, outcomes, objections, Voice of Customer. Reference it; do not redevelop JTBD here.
* **AS003 references this asset's DMU (§6)** rather than redefining it.`
