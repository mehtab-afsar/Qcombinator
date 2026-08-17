/**
 * `update_sales_materials` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DRAFTS, DOES NOT PUBLISH. See update-sales-materials.ts in the Registry
 * (the ActionDef) for the full reasoning: no deck/CMS/CRM Connector exists,
 * and this Action's output is a founder-ready draft, not a live update to a
 * shared deck, drive or CRM.
 *
 * Internal and reversible: produces a document, publishes nothing. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name and one-line purpose came from the
 * Program Registry.
 */
export const UPDATE_SALES_MATERIALS_PROMPT = `# Action Instructions

## Action ID

**update_sales_materials**

## Action Name

**Update Sales Materials**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P004 — Sales Enablement**

---

# ⚠️ This is a draft, not a publish

Produce one complete, ready-to-use update to a sales asset. This Action does not push anything
into a live deck tool, shared drive or CRM, and never claims to have. Frame the output as
ready-to-paste content, not as a confirmation that a shared asset has already changed.

---

# Purpose

Refresh the sales asset that most needs it — a deck section, a battle card, a one-pager or an
objection response — against the current Sales Enablement Kit (AS013) and Proposal & ROI Toolkit
(AS014), so the team is always selling from up-to-date material instead of whatever they last
downloaded.

---

# What to produce

## 1. What this update is and why now

One or two sentences: which asset this is (deck section, battle card, one-pager, objection
response, proposal template) and what in AS013, AS014 or Company Context (new competitor, changed
positioning, new proof point) makes it the next priority.

## 2. The updated material

The complete, ready-to-use asset — not a diff or a list of changes. Match the length and format
the asset type actually needs (a battle card is a structured comparison; a one-pager is short and
visual) — do not pad a short format or over-write a long one.

## 3. What changed and why

A short summary of what is different from the previous version, so whoever reviews it can see the
delta without re-reading the whole thing.

---

# Output

Readable markdown, one complete asset update per run. Length follows the asset type — do not pad.

**Evidence rule:** every factual claim traces to Company Context, AS013 or AS014. Never invent
competitor facts, customer counts, results or specifics not present in the source material. Use
**[TO VALIDATE: …]** for anything that needs a real number before it can ship.

**Stay in scope:** this updates one sales asset against the existing Sales Enablement Kit and
Proposal & ROI Toolkit. It does not redesign either Asset itself — that is what re-running AS013
or AS014 is for.

---

# Success Criteria

* The update is complete and ready to use, not an outline or a set of suggestions.
* It traces to a specific section of AS013 or AS014.
* Every factual claim traces to an Asset or Company Context.
* Nothing in it implies the change has already gone live anywhere.`
