/**
 * `update_commercial_terms` — Action Instructions (layer 3, ADR-012).
 *
 * ⚠️ DRAFTS, DOES NOT EXECUTE A CONTRACT. See update-commercial-terms.ts in the Registry (the
 * ActionDef) for the full reasoning: no contract/CLM Connector exists, and the registered Stripe
 * connector is read/sync only — neither writes a live contract or price. This prompt must never
 * claim commercial terms have already taken effect; it is a founder-ready draft, nothing more.
 *
 * Internal and reversible: produces a document, executes nothing. Runs autonomously (ADR-004).
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const UPDATE_COMMERCIAL_TERMS_PROMPT = `# Action Instructions

## Action ID

**update_commercial_terms**

## Action Name

**Update Commercial Terms**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P007 — Pricing & Packaging**

---

# ⚠️ This is a draft, not an executed contract

Produce updated commercial terms language the founder can review and use in real contracts. This
Action does not execute, sign or send anything, and never claims commercial terms are already in
effect. Frame the output as ready-to-use draft language, not as confirmation that terms have
changed.

---

# Purpose

Draft the commercial terms that follow from a change to the Pricing & Packaging Strategy (AS017)
— pricing terms, package inclusions, discount and renewal clauses — so contract language stays
current with the pricing model instead of drifting from whatever was last negotiated by hand.

---

# What to produce

## 1. What changed and why

One paragraph: what in AS017 the current commercial terms no longer reflect, and the specific gap
this draft closes. Skip this section entirely if nothing has materially changed — do not
manufacture a reason to rewrite terms that still hold.

## 2. Term-by-term language

For each commercial term that needs updating (pricing basis, package inclusions, discount
authority, renewal and uplift mechanics — only the terms that actually need a change):

* the current term, if known from Company Context
* the proposed replacement language
* the AS017 section it is drawn from

Do not draft terms that do not need to change.

## 3. Governance check

Confirm the proposed discount and pricing terms are consistent with the Discount Policy recorded
in approve_discounts. Name anything intentionally deviating and why.

---

# Output

Readable markdown, one entry per term from §2. Length follows the number of terms that actually
need updating — do not pad.

**Evidence rule:** every term traces to AS017 or Company Context. Never invent contract values,
customer names or commitments not present in the source material. Use **[TO VALIDATE: …]** for
anything that needs legal review or a real number before it can be used.

**Stay in scope:** this drafts commercial terms language against the existing Pricing & Packaging
Strategy. It does not redesign the pricing model itself — that is what re-running AS017 is for. It
does not execute or send any contract.

---

# Success Criteria

* Every term drafted actually needed to change — nothing rewritten for its own sake.
* Every term traces to AS017 or Company Context.
* The output is consistent with the recorded Discount Policy.
* Nothing in it implies commercial terms have already changed.`
