/**
 * S002 — Executive Contract (CEO).
 *
 * Layer 1 of a mandate package (ADR-023). Turns S001's conclusions into the
 * founder's mandate, for confirmation.
 *
 * NOT a Program prompt — the prompt itself is explicit: "This prompt does not
 * create management assets or actions. Instead, it defines the executive
 * mandate that governs the entire Shape and Ship phases."
 *
 * Lifted verbatim from `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx`.
 * ADR-010: the workbook is the design/seed source — nothing reads it at runtime.
 *
 * Two sections cut here (6 Aug 2026), same reasoning as the S001 trim: a stale
 * "Founder Decision" block asking the model to write 4 emoji-labeled options that
 * no longer match the real UI (`OneConfirm.tsx` has 3 buttons — Confirm / Refine /
 * Revise direction), never cited by `CONTRACT_JSON_TAIL` in composer/mandate.ts;
 * and a trailing "Why I think this is a defining moment" aside that reads as the
 * workbook author's own commentary about the prompt, not an instruction. Unlike
 * S001, Steps 1-8 here ARE load-bearing — Step 4's table is the only source for
 * `responsibilities`, Step 8's headings are cited by name for `priorities`/
 * `successMetrics` — so they're kept in full; the actual latency fix is
 * surfacing `contract.document` to the founder instead (see MandateReveal.tsx),
 * not shortening what gets generated.
 */
export const S002_EXECUTIVE_CONTRACT = `
---

# S002 — Executive Contract

## Objective

Transform the strategic recommendations from S001 into a clear executive blueprint for the next execution cycle.

The purpose of S002 is to create a shared understanding between the founder and the Edge Alpha Executive Team about:

* where the company is going
* what will be built
* what success looks like
* how success will be measured

This prompt **does not create management assets or actions**.

Instead, it defines the executive mandate that governs the entire Shape and Ship phases.

No Co-Pilot should begin building assets until this blueprint has been approved by the founder.

---

# Guiding Principles

Think like an experienced executive committee preparing the next quarterly strategy.

Focus on:

* clarity
* leverage
* business outcomes
* founder alignment
* simplicity

Everything should answer one question:

> **What gives this company the highest probability of success over the next 90 days?**

---

# Step 1 — Executive Direction

Summarize the conclusions from S001.

Include, in ONE short paragraph each — a summary, not a re-argument:

* current company position
* key constraints
* strategic opportunities
* recommended direction

Four short paragraphs total. Not one page — this is a recap, not a rewrite of S001.

---

# Step 2 — Executive Objectives

Define three to five strategic objectives.

For every objective explain, in ONE concise sentence each — a working note, not a report:

* why it matters
* expected business impact
* success criteria
* priority

These become the company's executive agenda.

---

# Step 3 — Recommended Strategic Pathway

Recommend the preferred pathway.

Examples

* Commercial Acceleration
* Investment Readiness
* Product Validation
* Operational Excellence

Explain, in ONE concise sentence each:

* why this pathway
* expected outcomes
* why alternatives were not selected — name them, do not re-argue each one

---

# Step 4 — Executive Asset Blueprint

Identify every strategic management asset required.

For every asset include

| Field                | Description                                       |
| -------------------- | ------------------------------------------------- |
| Asset                | Name                                              |
| Purpose              | Why it exists                                     |
| Business Outcome     | What it should improve                            |
| Responsible Co-Pilot | Growth / Finance / Product / Operations / Capital |
| Priority             | High / Medium / Low                               |

Only recommend assets that directly support the executive objectives. No more than 5 —
this blueprint names what matters most, not everything that could conceivably help.

---

# Step 5 — Asset Dependencies

Show the logical build sequence.

Example

\`\`\`text
Customer Discovery

↓

ICP

↓

Messaging

↓

Outbound Engine

↓

Pipeline Dashboard
\`\`\`

This becomes the Shape roadmap.

---

# Step 6 — Success Metrics

For every executive objective, name up to 2 leading and 2 lagging indicators —
metric names only, not paragraphs.

### Leading Indicators

Examples

* meetings
* pilots
* qualified leads

### Lagging Indicators

Examples

* revenue
* runway
* fundraising
* retention

---

# Step 7 — Executive Risks

Identify, in ONE sentence each — the top 2-3 only, not an exhaustive list:

* strategic risks
* execution risks
* critical assumptions

Explain how management should monitor them.

---

# Step 8 — Executive Contract (Founder Approval)

This is the most important output — the founder reads this section, not the steps above it.

Transcribe what you already established in Steps 1-7 into this fixed, compact shape.
Bullets and short phrases, not new prose or re-argued reasoning — everything here was
already explained above.

---

# Executive Contract

### Mission

One sentence.

---

### Executive Priorities

Three to five short bullets.

---

### Strategic Pathway

The pathway name, and why, in one sentence.

---

### Management Assets

The assets from Step 4, by name only — one line each.

---

### Success Metrics

Up to 4 metric names, no explanation — already explained in Step 6.

---

### Executive Commitment

**Edge Alpha Executive Team**

"We commit to building the management systems, assets and execution support required to maximize the probability of achieving these objectives."

**Founder**

"I agree that this represents the company's strategic priorities for the next execution cycle and authorize the Edge Alpha Executive Team to begin building the recommended management assets."

---

No Shape assets or Ship actions may begin until the founder has approved this blueprint.

---

# Output Structure

\`\`\`
Executive Summary

↓

Executive Objectives

↓

Recommended Strategic Pathway

↓

Executive Asset Blueprint

↓

Asset Dependencies

↓

Success Metrics

↓

Executive Risks

↓

Executive Contract

↓

Founder Approval
\`\`\`
`
