/**
 * AS005 — Asset Instructions for "Channel Strategy".
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
export const AS005_CHANNEL_STRATEGY_PROMPT = `# Asset Add-on

## Asset ID

**AS005**

## Asset Name

**Channel Strategy**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---


# Purpose

Produce a comprehensive **Channel Strategy** that captures, evaluates and organises the company's commercial acquisition channels.

The objective is **not** to create a campaign plan or recommend marketing tactics.

The objective is to document:

* which commercial channels exist
* which channels are relevant for the company's ICPs
* what evidence supports each channel
* what constraints exist
* which channels appear most promising based on available evidence

This Asset should become the company's authoritative reference for commercial channel selection.

---

# Primary Analytical Framework

Use the **Bullseye Framework** as the primary analytical framework.

Classify channels into:

* **Inner Ring** — strongest evidence and highest commercial fit
* **Middle Ring** — promising but insufficient evidence
* **Outer Ring** — currently low fit or unsupported

The framework should organise channel knowledge rather than prescribe campaigns.

---

# Supporting Frameworks

Where appropriate, supplement the analysis using:

### Bullseye Framework

Prioritise commercial channels according to current evidence.

---

### PESO Model

Classify channels as:

* Paid
* Earned
* Shared
* Owned

---

### AARRR Funnel

Assess where each channel contributes:

* Acquisition
* Activation
* Retention
* Referral
* Revenue

---

### RACE Framework

Evaluate contribution to:

* Reach
* Act
* Convert
* Engage

Use supporting frameworks only where they improve understanding.

---

# Required Sections

---

## 1. Executive Summary

Provide a concise overview covering:

* overall channel landscape
* strongest current acquisition channels
* major channel constraints
* evidence gaps
* key observations

Do not recommend campaigns.

---

## 2–3. Channel Universe + Catalogue (merged, one table)

Do not list the channel universe and then catalogue it separately — that's the same channel
names twice. One table, covering both offline (conferences, founder networking, partnerships,
referrals, etc.) and online (SEO, cold email, LinkedIn, content, etc.) channels relevant to this
company's ICPs:

| Channel | Online/Offline | Typical Purpose | Typical Buyer Stage | Typical Cost | Scalability |

Skip channels with no plausible fit rather than listing all ~35 generic options — relevance to
*this* company's ICPs, not exhaustiveness, is the bar.

---

## 4. Channel Relevance Assessment — this is the asset's core table; protect it

This table carries the whole asset's evidence discipline — do not thin it out. For each channel
assess ICP Fit, Buyer Journey Fit, Commercial Credibility, Ease of Access, Sales Cycle, Cost
Efficiency, Scalability, and (the two columns that matter most) **Available Evidence** and
**Confidence Level** — every row must clearly read as observed evidence, inferred fit,
assumption, or unknown. Never round an assumption up to evidence.

Add **two more columns to this same table** rather than building §5 and §7 as separate
sections:

* **Bullseye Ring** — Inner (strongest current evidence + fit) / Middle (promising, unvalidated)
  / Outer (weak fit or unsupported), scored from the columns already in this table.
* **Funnel Role** — which of Reach / Activate / Convert / Engage this channel primarily serves.

One table, ten-ish columns, not three separate tables re-sorting the same channel list.

---

## 6. Top Recommended Channels

Based on the available evidence, identify the channels that currently appear most relevant.

---

### Top Offline Channels

Recommend the **two to three highest-fit offline channels**.

For each include:

* rationale
* ICP alignment
* supporting evidence
* confidence level

---

### Top Online Channels

Recommend the **two to three highest-fit online channels**.

For each include:

* rationale
* ICP alignment
* supporting evidence
* confidence level

These recommendations should be based on available evidence rather than opinion.

---

## 7. Channel Constraints

Document factors that influence channel performance.

Examples include:

* long enterprise sales cycles
* procurement complexity
* regulatory restrictions
* limited founder capacity
* weak market awareness
* insufficient content
* lack of customer references
* limited marketing budget
* low brand recognition

Present constraints without proposing solutions.

---

## 8. Channel Dependencies

Identify dependencies required for successful channel execution.

Examples include:

* AS001 — ICP Profiles
* AS002 — Pains & Gains Matrix
* AS003 — Buyer Journey Map
* AS004 — Positioning & Messaging Framework
* case studies
* customer references
* landing pages
* product demonstrations
* pricing assets
* proposal templates

This section should illustrate how channels rely on other commercial assets.

---

## 9. Assumptions & Unknowns — pairs with §4, protect explicitly

Document assumptions requiring future validation.

For each include:

| Assumption | Affected Channel | Confidence | Evidence Required |

Clearly distinguish assumptions from validated knowledge.

---

## 10. Key Findings

Summarise the most important observations supported by available evidence.

Include:

* strongest commercial channels
* weakest channels
* major evidence gaps
* highest-confidence opportunities
* biggest commercial constraints

Do not include:

* campaign plans
* execution roadmaps
* tactical recommendations

unless explicitly requested by another Program.

---

# Output

Generate one complete **Channel Strategy** Management Asset.

Expected length:

**~1,000–1,200 words.** The evidence-graded channel table (§4, with its Ring and Funnel Role
columns) is one table doing the job five separate sections used to do — do not rebuild the
Bullseye map or funnel-role matrix as their own sections.

Use executive-quality formatting including:

* executive summary card
* one channel table (relevance + evidence + ring + funnel role, all columns)
* top-recommended-channels shortlist
* dependency list
* assumptions/unknowns table
* icons
* call-out boxes

Avoid long narrative sections.

Optimise for executive readability.

---

# Success Criteria

The Asset is successful when:

* founders understand the full universe of available acquisition channels
* online and offline channels are clearly differentiated
* the most relevant channels are identified using evidence
* channel fit is evaluated consistently against ICPs and buyer journeys
* assumptions are clearly separated from validated knowledge
* channel dependencies are documented
* future Programs can confidently use this Asset to prioritise channel investments and commercial execution

The Founder should finish reading this Asset with a clear understanding of **which acquisition channels exist, how they compare, which are most relevant for the business, and why**—without confusing the Asset with a campaign or execution plan.`
