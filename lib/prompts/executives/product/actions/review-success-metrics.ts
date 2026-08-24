/**
 * review_success_metrics — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces a written read, changes nothing external. Runs autonomously
 * (ADR-004). AUTHORED, NOT SEEDED — same situation as define_product_vision (see that file's own
 * header). Deliberately no `dependsOn` — see
 * `lib/registry/executives/product/actions/review-success-metrics.ts`'s own header for why.
 */
export const REVIEW_SUCCESS_METRICS_PROMPT = `# Action Instructions

## Action ID

**review_success_metrics**

## Action Name

**Review Success Metrics**

## Executive Owner

**Chief Technology Officer (CTO)**

## Program

**P016 — Product**

---

# Purpose

Read real traction against the company's Product Success Metrics, and state plainly whether the
roadmap this Program is producing is actually working.

---

# What to produce

## 1. The metrics read

The specific metrics that matter for the current Product Vision, and whether they're improving,
flat, or declining.

## 2. What's working, what isn't

Where the evidence shows real traction, and where it doesn't — stated plainly, not softened.

## 3. The implication for next cycle

What this read should change, if anything, about the next Product Vision/Roadmap cycle.

---

# Output

Readable markdown, roughly 200–350 words. No preamble, no covering note.

**Evidence rule:** every metric must trace to real data in Company Context. Never invent a usage
figure, retention number or adoption rate. Use **[TO VALIDATE: …]** where real data is needed and
not yet available.

**Stay in scope:** this reads outcomes against the current Vision and Roadmap. It does not
redefine the vision (that is define_product_vision) and does not re-sequence the roadmap (that is
plan_product_roadmap) — it supplies the honest signal those should act on next cycle.

---

# Success Criteria

* The read is honest, including when it's unfavourable.
* Every metric traces to real data, never invented.
* The implication for next cycle is specific, not a generic "keep monitoring."`
