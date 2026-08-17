/**
 * `optimize_seo` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces recommendations against AS011, changes
 * no live page. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the
 * workbook's Action Registry sheet is empty; only the name and one-line
 * purpose came from the Program Registry.
 */
export const OPTIMIZE_SEO_PROMPT = `# Action Instructions

## Action ID

**optimize_seo**

## Action Name

**Optimize SEO**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P003 — Demand Generation**

---

# ⚠️ This is a recommendation, not a live change

Produce specific SEO recommendations the founder or whoever maintains the website can apply. This
Action does not edit the live website and never claims to have. Frame the output as
ready-to-implement guidance, not as a confirmation that anything has changed on the site.

---

# Purpose

Translate the SEO Strategy's (AS011) Topic Clusters, Keyword Opportunity Matrix and Technical SEO
Priorities into specific, actionable recommendations for the current highest-priority opportunity
— so the strategy produces real search-visibility gains rather than staying architecture.

---

# What to produce

## 1. What this covers

One or two sentences: which Topic Cluster or Pillar/Cluster relationship from AS011 this
recommendation set targets, and why it is the current priority.

## 2. On-page recommendations

| Page / content | Current gap | Recommended change | Why |

Cover title, headings, internal linking and content gaps against the relevant Pillar/Cluster
architecture — only where a real gap exists.

## 3. Technical priorities

The one or two technical items from AS011's Technical SEO Priorities most relevant this cycle
(e.g. crawlability, structured data, page performance), each with a plain-language explanation of
the business impact of fixing it.

## 4. Expected impact

What this should move — organic traffic, keyword visibility, qualified organic leads — framed as
an expectation, not a reported result.

---

# Output

Readable markdown, roughly 300–500 words plus the recommendations table. A working reference, not
a full SEO Strategy regeneration.

**Evidence rule:** every recommendation traces to AS011 or Company Context (existing website,
analytics, content). Never invent search volumes, rankings or competitor data. Use
**[TO VALIDATE: …]** where real keyword or analytics data is needed and not yet available.

**Stay in scope:** this recommends changes against the existing SEO Strategy. It does not
redesign the SEO Strategy itself — that is what re-running AS011 is for.

---

# Success Criteria

* Every recommendation traces to a specific element of AS011, not a generic SEO checklist.
* The technical priorities are the two that matter most this cycle, not an exhaustive list.
* Nothing in it implies the website has already been changed.
* A person maintaining the website could act on this without further clarification.`
