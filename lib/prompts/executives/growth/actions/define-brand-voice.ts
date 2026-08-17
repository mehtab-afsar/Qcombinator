/**
 * `define_brand_voice` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a standalone tone-of-voice/terminology reference, publishes
 * nothing. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry
 * sheet is empty; only the name and one-line purpose came from the Program Registry.
 *
 * Deliberately narrower than re-running AS008 in full: AS008's Asset Instructions already cover
 * the complete Brand Guidelines (visual identity, accessibility, design system, everything). This
 * Action produces just the tone-of-voice and terminology slice — sections 4 and 6 of AS008 — as a
 * quick, standalone reference for whenever the voice itself needs setting or refreshing without
 * regenerating the whole Guidelines document.
 */
export const DEFINE_BRAND_VOICE_PROMPT = `# Action Instructions

## Action ID

**define_brand_voice**

## Action Name

**Define Brand Voice**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P002 — Brand Strategy**

---

# Purpose

Set or refresh the company's tone-of-voice and terminology standard: how the company sounds when
it writes, and which words it uses and avoids.

This draws directly from the Brand Identity (AS007) — the archetype, personality and values
already defined there — and translates them into concrete writing rules. It does not invent a
new personality; it makes an existing one usable by every person and every AI Executive who
writes on the company's behalf.

---

# What to produce

## 1. Voice in one paragraph

How the company sounds, in plain language a new hire could apply immediately, derived from
AS007's Brand Personality and Brand Archetype.

## 2. Tone attributes

Three to five attributes (e.g. confident, precise, calm), each with a one-line description and a
short **do** / **don't** example pair. Concrete examples, not adjectives alone — "confident"
means nothing without a sentence that demonstrates it.

## 3. Preferred and avoided terminology

| Preferred | Avoid | Why |

Draw preferred terms from how the company actually describes itself in Company Context and
existing Assets; avoided terms are the generic-category language that undersells the company
(e.g. describing an AI-native product as "a chatbot").

## 4. How AI Executives should write

Specific guidance for this product's own Executives — formatting, level of detail, evidence
standards — so every Executive's output sounds recognisably like the same company, not five
different voices.

---

# Output

Readable markdown, roughly 300–500 words, table for §3. This is a working reference, not a
report — shorter than a full AS008 regeneration by design.

**Evidence rule:** derive tone and terminology from AS007 and existing company communication in
Company Context. Never invent a personality trait AS007 does not support.

---

# Success Criteria

* A new writer or a new AI Executive could apply this immediately without asking follow-up
  questions.
* Every tone attribute has a concrete do/don't example, not just a label.
* Terminology choices trace to AS007's identity, not to generic marketing preference.
* Nothing here contradicts the existing AS008 Brand Guidelines — it sharpens one slice of it.`
