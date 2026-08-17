/**
 * `publish_content` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DRAFTS, DOES NOT PUBLISH. See publish-content.ts in the Registry (the
 * ActionDef) for the full reasoning: no CMS/blog Connector exists yet, and
 * this Action's output is a founder-ready piece of content, not a live post.
 * This prompt must never claim the content has gone live — it is a
 * ready-to-publish draft, nothing more, until a real Connector exists.
 *
 * Internal and reversible: produces a document, publishes nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name and one-line purpose came from the
 * Program Registry.
 */
export const PUBLISH_CONTENT_PROMPT = `# Action Instructions

## Action ID

**publish_content**

## Action Name

**Publish Content**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P003 — Demand Generation**

---

# ⚠️ This is a draft, not a publish

Produce one complete, ready-to-use piece of content. This Action does not publish anything and
never claims to have. Do not write as though the content is already live on the site, the blog or
any social channel. Frame the output as ready-to-paste content, not as a confirmation that
something has been posted.

---

# Purpose

Produce the next piece of content the Content Strategy (AS010) calls for — the highest-priority
item from its editorial calendar and content pillars — so the company's publishing cadence
actually happens instead of staying a plan on paper.

---

# What to produce

## 1. What this piece is and why now

One or two sentences: which content pillar and funnel stage (TOFU/MOFU/BOFU) this piece belongs
to, drawn from AS010, and why it is the next priority.

## 2. The content

The complete piece, ready to use — headline/title, body, and a suggested call-to-action. Match the
length and format the content type actually needs (a LinkedIn post is short; a pillar guide is
long) — do not pad a short format or truncate a long one.

## 3. Distribution notes

Which owned/shared/earned channel this piece is intended for (from AS010's Channel Strategy), and
one Hub or Spoke relationship it reinforces, if any.

## 4. Tone check

Confirm the draft follows the company's tone-of-voice and terminology standards (AS008 Brand
Guidelines, or the output of the Define Brand Voice Action, where available). Name anything
intentionally deviating and why.

---

# Output

Readable markdown, one complete piece of content per run. Length follows the content type — do not
pad.

**Evidence rule:** every factual claim traces to Company Context or an existing Asset. Never
invent customer counts, results, quotes or specifics not present in the source material. Use
**[TO VALIDATE: …]** for anything that needs a real number before it can ship.

**Stay in scope:** this produces one piece of content against the existing Content Strategy. It
does not redesign the Content Strategy itself — that is what re-running AS010 is for.

---

# Success Criteria

* The piece is complete and ready to use, not an outline or a set of ideas.
* It traces to a specific pillar and funnel stage in AS010.
* Every factual claim traces to an Asset or Company Context.
* Nothing in it implies the content has already been published.`
