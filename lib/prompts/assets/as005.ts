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

## 2. Commercial Channel Universe

Before evaluating channels, identify the complete universe of commercially relevant acquisition channels.

The purpose is to expose the Founder to the breadth of available commercial routes to market.

Unless clearly irrelevant, include both offline and online channels.

---

### Offline Channels

Examples include:

* Industry Conferences
* Trade Shows
* Founder Networking
* Industry Associations
* Chamber of Commerce
* Strategic Partnerships
* Channel Partners
* Resellers
* Government Programmes
* Procurement Portals
* Tender Platforms
* Accelerator Programmes
* Incubators
* Investor Introductions
* Customer Referrals
* Advisory Boards
* Executive Roundtables
* Workshops
* Customer Events
* Enterprise Direct Sales

---

### Online Channels

Examples include:

* SEO
* Google Search Ads
* LinkedIn Organic
* LinkedIn Advertising
* X (Twitter)
* YouTube
* Reddit
* GitHub
* Product Hunt
* Cold Email
* Cold Calling
* Newsletters
* Content Marketing
* Webinars
* Podcasts
* Influencer Marketing
* Public Relations
* Slack Communities
* Discord Communities
* Affiliate Marketing
* Partner Websites
* Review Platforms
* AI Search (ChatGPT, Perplexity, Gemini)
* Referral Programmes

---

## 3. Channel Catalogue

Document every relevant acquisition channel.

For each channel include:

| Channel | Online / Offline | Typical Purpose | Typical Buyer Stage | Typical Cost | Scalability |

This section serves as a commercial reference library.

Do not prioritise channels yet.

---

## 4. Channel Relevance Assessment

Evaluate every channel against the company's ICPs.

For each channel assess:

* ICP Fit
* Buyer Journey Fit
* Commercial Credibility
* Ease of Access
* Typical Sales Cycle
* Cost Efficiency
* Scalability
* Available Evidence
* Confidence Level

Present findings in a structured comparison table.

Clearly distinguish between:

* observed evidence
* inferred fit
* assumptions
* unknowns

---

## 5. Bullseye Channel Map

Classify channels into:

### Inner Ring

Strongest current evidence and commercial fit.

---

### Middle Ring

Promising but requiring further validation.

---

### Outer Ring

Limited evidence or currently weak commercial fit.

Explain the rationale for each classification.

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

## 7. Funnel Role by Channel

Map each channel to its primary commercial purpose.

| Channel | Reach | Activate | Convert | Engage |

Clarify whether each channel primarily supports:

* awareness
* education
* lead generation
* conversion
* relationship building
* retention
* referrals

---

## 8. Channel Constraints

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

## 9. Channel Dependencies

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

## 10. Assumptions & Unknowns

Document assumptions requiring future validation.

For each include:

| Assumption | Affected Channel | Confidence | Evidence Required |

Clearly distinguish assumptions from validated knowledge.

---

## 11. Key Findings

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

**8–12 pages**

Use executive-quality formatting including:

* executive summary cards
* Bullseye diagram
* channel catalogue
* PESO matrix
* channel comparison tables
* funnel-role matrix
* channel fit scorecards
* dependency maps
* confidence indicators
* heat maps
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
