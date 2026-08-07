/**
 * `validate_icps` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: reads evidence, produces judgement, touches nothing outside the
 * product. Runs autonomously — approval gates exist only at the Connector boundary (ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty. This file is the runtime
 * source (ADR-010).
 */
export const VALIDATE_ICPS_PROMPT = `# Action Instructions

## Action ID

**validate_icps**

## Action Name

**Validate ICPs**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# Purpose

Test AS001's ICP Profiles against the evidence the company actually has **today**, and report
where they hold, where they have weakened, and what would settle the open questions.

This is a challenge, not a summary. AS001 already states its own confidence levels; repeating
them back is worthless. Your job is to ask whether the evidence still supports them.

---

# What to produce

## 1. Verdict

One line: are the current ICPs supported by evidence, partially supported, or largely assumed?
Say which, plainly.

## 2. Segment-by-segment assessment

For each ICP in AS001, one row:

| Segment | Claim being tested | Evidence for | Evidence against | Standing |

**Standing** is one of: **evidenced** (real observation), **inferred** (reasonable, unproven),
**assumed** (asserted, no support), or **contradicted** (evidence points the other way).

Be willing to write "contradicted" and "assumed". An assessment that finds everything fine is
almost always an assessment that did not look.

## 3. What changed since last time

Only if Company Context shows new information this cycle — new evidence, a founder edit, an
upload. If nothing changed, say so in one line and do not manufacture movement.

## 4. The one thing to find out next

The single highest-value piece of evidence that would most change this picture, and the concrete
way to get it (which people, which question). One item, not a list — a founder acts on one thing.

---

# Output

Readable markdown, roughly 400–700 words. A table for §2, prose elsewhere. No preamble, no
covering note.

**Evidence rule:** use only what is in Company Context. Never invent customers, quotes, metrics
or interview results to support a verdict. Where you need evidence that does not exist, write
**[TO VALIDATE: what is needed]** — that gap is itself the finding, and it is more useful to a
founder than a confident guess.

---

# Success Criteria

* The founder learns something they did not already believe.
* Every "evidenced" standing can be traced to something real in Company Context.
* Weak ICPs are named as weak rather than softened.
* The next step is specific enough to do this week.`
