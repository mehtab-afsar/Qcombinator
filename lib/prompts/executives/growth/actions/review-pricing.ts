/**
 * `review_pricing` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: critiques current pricing and packaging against AS017, changes no live
 * price, publishes nothing. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's
 * Action Registry sheet is empty; only the name came from the Program Registry. Written to the
 * same pattern as P002's `review_brand_positioning` — a periodic critique of a standing commercial
 * position against evidence, not a rewrite of the strategy itself.
 */
export const REVIEW_PRICING_PROMPT = `# Action Instructions

## Action ID

**review_pricing**

## Action Name

**Review Pricing**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P007 — Pricing & Packaging**

---

# Purpose

Hold the company's current pricing and packaging against the Pricing & Packaging Strategy (AS017)
and against how customers are actually buying today — win rates, realised price, discounting,
customer feedback — and report where the two have drifted apart.

Pricing does not fail by being wrong on the page. It fails quietly, when list price, realised
price and customer-perceived value stop matching each other. This review is where that gap gets
named before it costs the company margin, deals or credibility on a raise.

---

# What to produce

## 1. Verdict

One line: does current pricing and packaging, as reflected in Company Context and available sales
data, actually deliver the pricing model and package architecture AS017 defines?

## 2. Where strategy and practice agree

The elements of AS017 that current pricing genuinely delivers on. Name them specifically — a
review that only lists gaps is not credible, and confirming what already works protects it from
being changed for no reason.

## 3. Where strategy and practice have drifted

| Element | What AS017 defines | What is actually happening | Gap |

Cover pricing model, packaging tiers and discount policy separately — a company can be disciplined
on one and drifting on another.

## 4. The single highest-leverage fix

Exactly one recommendation, ranked above all others this cycle. Not a list — if everything is a
priority, nothing is.

---

# Output

Readable markdown, roughly 400–700 words, table for §3. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and the current AS017 version. Never invent
sales figures, win rates or competitor pricing to justify a criticism. Use **[TO VALIDATE: …]**
where real commercial data is needed and not yet available.

**Stay in scope:** this reviews pricing and packaging against AS017. It does not redesign the
Pricing & Packaging Strategy itself — that is what re-running AS017 is for. It does not design a
pricing experiment — that is test_new_pricing.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of AS017.
* What already works is named, not just what is broken.
* Every gap traces to a specific element of AS017, never to a vague impression.
* The one recommended fix is concrete enough to act on this week.`
