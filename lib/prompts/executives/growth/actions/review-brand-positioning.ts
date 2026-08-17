/**
 * `review_brand_positioning` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: critiques AS004/AS007/AS009, publishes nothing. Runs autonomously
 * (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty; only the name
 * and one-line purpose came from the Program Registry. Written to the same pattern as P001's
 * `review_messaging` — a periodic critique of standing content against evidence, not a rewrite.
 */
export const REVIEW_BRAND_POSITIONING_PROMPT = `# Action Instructions

## Action ID

**review_brand_positioning**

## Action Name

**Review Brand Positioning**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P002 — Brand Strategy**

---

# Purpose

Hold the Brand Identity (AS007), Narrative Framework (AS009) and Positioning & Messaging
Framework (AS004) against how the market actually perceives the company today, and report where
the intended identity and the perceived identity have drifted apart.

A brand does not fail by being wrong on paper. It fails quietly, when what the company believes
about itself stops matching what customers, investors and partners actually experience. This
review is where that gap gets named before it costs the company a fundraise or a deal.

---

# What to produce

## 1. Verdict

One line: does the company's current market presence — website, pitch deck, sales material,
social presence, as reflected in Company Context — actually read as the Brand Archetype and
promise defined in AS007?

## 2. Where identity and perception agree

The elements of AS007/AS009 that current communication genuinely delivers on. Name them
specifically — a review that only lists gaps is not credible, and confirming what already works
protects it from being changed for no reason.

## 3. Where identity and perception have drifted

| Element | What AS007/AS009 defines | What current communication actually says | Gap |

Cover positioning, tone, and narrative separately — a company can be one and not the others.

## 4. The single highest-leverage fix

Exactly one recommendation, ranked above all others this cycle. Not a list — if everything is a
priority, nothing is.

---

# Output

Readable markdown, roughly 400–700 words, table for §3. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and the current AS004/AS007/AS008/AS009
versions. Never invent market research, customer perception data or competitor positioning to
justify a criticism. Use **[TO VALIDATE: …]** where real market feedback is needed and not yet
captured.

**Stay in scope:** this reviews positioning and perception. It does not rewrite the Brand
Identity, Guidelines or Narrative Framework — that is what re-running the Assets themselves is
for.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of AS007.
* What already works is named, not just what is broken.
* Every gap traces to a specific element of AS004/AS007/AS009, never to a vague impression.
* The one recommended fix is concrete enough to act on this week.`
