/**
 * assign_priorities — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a ranked priority list, assigns nothing on a live
 * project-management system. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's
 * Action Registry sheet is empty; only the name came from the Program Registry.
 */
export const ASSIGN_PRIORITIES_PROMPT = `# Action Instructions

## Action ID

**assign_priorities**

## Action Name

**Assign Priorities**

## Executive Owner

**Chief Operating Officer (COO)**

## Program

**P009 — Review**

---

# Purpose

Translate this cycle's identified constraint (identify_constraints) into a short, ranked set of
execution priorities the founder can act on immediately.

---

# What to produce

## 1. The ranked list

Three priorities at most, ranked. For each:

* the priority, stated as a concrete action
* why it is ranked here — how it traces to the constraint named by identify_constraints
* what "done" looks like for this cycle

## 2. What is deliberately NOT prioritised

One or two things that could reasonably seem urgent but are deliberately left off the list this
cycle, and why. A priority list that includes everything prioritises nothing.

---

# Output

Readable markdown, roughly 200–400 words. No preamble, no covering note.

**Evidence rule:** every priority traces to the constraint identified by identify_constraints, or
to a specific fact in Company Context, AS019 or AS020. Never invent a priority disconnected from
the cycle's actual findings.

**Stay in scope:** this ranks priorities. It does not itself identify the underlying constraint —
that is identify_constraints — and it does not record the plan as final — that is
approve_action_plan.

---

# Success Criteria

* No more than three priorities, genuinely ranked, not a flat list.
* Every priority traces to the cycle's identified constraint or real evidence.
* What was deliberately excluded is stated, not silently dropped.
* Each priority is concrete enough to act on this cycle without further clarification.`
