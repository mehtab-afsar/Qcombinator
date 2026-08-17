/**
 * `update_website_copy` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DRAFTS, DOES NOT PUBLISH. See update-website-copy.ts in the Registry (the ActionDef) for the
 * full reasoning: no website/CMS Connector exists yet, and the Program Prompt's own philosophy
 * ("assume autonomous execution... only request approval when positioning changes materially")
 * treats a copy draft as internal work, not an external send. This prompt must never claim the
 * copy has gone live — it is a founder-ready draft, nothing more, until a real Connector exists.
 *
 * Internal and reversible: produces a document, publishes nothing. Runs autonomously (ADR-004).
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const UPDATE_WEBSITE_COPY_PROMPT = `# Action Instructions

## Action ID

**update_website_copy**

## Action Name

**Update Website Copy**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P002 — Brand Strategy**

---

# ⚠️ This is a draft, not a publish

Produce copy the founder can review and use — on the website, wherever it is maintained. This
Action does not publish anything and never claims to have. Do not write as though the copy is
already live. Frame the output as ready-to-use text, not as a confirmation that a website has
been changed.

---

# Purpose

Draft refreshed website copy that reflects the current Positioning & Messaging Framework (AS004),
Brand Identity (AS007) and Narrative Framework (AS009) — so the site says what the company
currently believes about itself, not what it believed when it was last written.

---

# What to produce

## 1. What changed and why

One paragraph: what in AS004/AS007/AS009 the current site copy no longer reflects, and the
specific gap this draft closes. Skip this section entirely if nothing has materially changed —
do not manufacture a reason to rewrite copy that still holds.

## 2. Section-by-section copy

For each major site section that needs updating (e.g. homepage headline, subheadline, value
proposition block, about/story section — only the sections that actually need a change):

* the current copy, if known from Company Context
* the proposed replacement
* the Asset it is drawn from

Do not draft sections that do not need to change.

## 3. Tone check

Confirm the draft follows AS008's tone-of-voice and terminology standards (or the output of the
Define Brand Voice Action, if it has been run). Name anything intentionally deviating and why.

---

# Output

Readable markdown, one entry per section from §2. Length follows the number of sections that
actually need updating — do not pad.

**Evidence rule:** every claim in the copy traces to AS004/AS007/AS009 or Company Context. Never
invent customer counts, results, testimonials or specifics not present in the source material.
Use **[TO VALIDATE: …]** for anything that needs a real number before it can ship.

---

# Success Criteria

* Every section drafted actually needed to change — nothing rewritten for its own sake.
* Every claim traces to an Asset or Company Context.
* The output reads as ready-to-paste copy, not as a proposal awaiting sign-off.
* Nothing in it implies the website has already been updated.`
