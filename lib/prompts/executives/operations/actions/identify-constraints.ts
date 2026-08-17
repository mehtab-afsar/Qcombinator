/**
 * identify_constraints — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: names the company's biggest constraint, changes nothing external. Runs
 * autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty;
 * only the name came from the Program Registry.
 */
export const IDENTIFY_CONSTRAINTS_PROMPT = `# Action Instructions

## Action ID

**identify_constraints**

## Action Name

**Identify Constraints**

## Executive Owner

**Chief Operating Officer (COO)**

## Program

**P009 — Review**

---

# Purpose

Name the single biggest operational, commercial or financial constraint limiting the company
right now, synthesised across the Founder Dashboard (AS019), KPI Dashboard (AS020) and Q-Score
Trend Report (AS021) — the one constraint that, if resolved, would unlock the most progress this
cycle.

---

# What to produce

## 1. The constraint

One or two sentences naming the constraint plainly. Not a category ("execution is slow") — the
specific, concrete bottleneck.

## 2. Evidence

The specific facts from AS019, AS020 and AS021 that point to this constraint, not a general
impression. Where multiple candidates exist, briefly explain why this one outranks the others
this cycle.

## 3. What it is limiting

What the company cannot do, or is doing more slowly or at higher cost, because of this constraint.

## 4. What resolving it would unlock

The concrete improvement expected if this constraint is addressed — grounded in AS019/AS020/AS021,
not speculative.

---

# Output

Readable markdown, roughly 200–400 words. No preamble, no covering note.

**Evidence rule:** only facts from Company Context, AS019, AS020 and AS021. Never invent a
constraint that cannot be traced to those sources.

**Stay in scope:** this names the single biggest constraint. It does not produce the ranked
priority list for addressing it — that is assign_priorities.

---

# Success Criteria

* Exactly one constraint is named, not a list.
* The constraint is specific and concrete, not a vague category.
* Every claim traces to AS019, AS020 or AS021.
* A founder reading this understands immediately what is actually holding the company back.`
