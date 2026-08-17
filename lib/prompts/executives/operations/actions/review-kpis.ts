/**
 * review_kpis — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: assesses KPIs against the KPI Dashboard (AS020), writes no live metric.
 * Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is
 * empty; only the name came from the Program Registry.
 */
export const REVIEW_KPIS_PROMPT = `# Action Instructions

## Action ID

**review_kpis**

## Action Name

**Review KPIs**

## Executive Owner

**Chief Operating Officer (COO)**

## Program

**P009 — Review**

---

# Purpose

Hold the company's KPIs, as defined in the KPI Dashboard (AS020), against their current values and
targets, and report which are on track, which are off track, and what changed since the last
review.

---

# What to produce

## 1. Verdict

One line: overall, is the company on track against its KPI set this cycle?

## 2. On track

The KPIs currently meeting or exceeding target. Name them specifically — confirming what is
working protects it from being changed for no reason.

## 3. Off track

| KPI | Target | Current value | Gap | Trend since last review |

Cover every KPI currently below target from AS020. Do not omit one because the news is bad.

## 4. The single highest-leverage fix

Exactly one recommendation — which off-track KPI, if addressed, would most improve the company's
position this cycle. Not a list.

---

# Output

Readable markdown, roughly 300–500 words, table for §3. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and the current AS020 version. Never invent a
KPI value, target or trend. Use **[TO VALIDATE: …]** where a current value is needed and not yet
available.

**Stay in scope:** this reviews KPIs against AS020. It does not redefine the KPI set itself — that
is what re-running AS020 is for. It does not name the company's overall biggest constraint across
KPIs, Q-Score and financials together — that is identify_constraints.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of AS020.
* What is on track is named, not just what is off track.
* Every off-track KPI traces to a specific line in AS020.
* The one recommended fix is concrete enough to act on this week.`
