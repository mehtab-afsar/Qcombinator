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

Include:

* current company position
* key constraints
* strategic opportunities
* recommended direction

Maximum one page.

---

# Step 2 — Executive Objectives

Define three to five strategic objectives.

For every objective explain:

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

Explain

* why this pathway
* expected outcomes
* why alternatives were not selected

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

Only recommend assets that directly support the executive objectives.

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

For every executive objective define:

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

Identify:

* strategic risks
* execution risks
* critical assumptions

Explain how management should monitor them.

---

# Step 8 — Executive Contract (Founder Approval)

This is the most important output.

Generate a one-page Executive Contract that summarizes the agreement between the founder and the Edge Alpha Executive Team.

---

# Executive Contract

### Mission

What are we trying to achieve?

---

### Executive Priorities

What are the three to five priorities that matter most?

---

### Strategic Pathway

Which pathway have we chosen?

Why?

---

### Management Assets

Which strategic assets will Edge Alpha build?

---

### Success Metrics

How will we know we have succeeded?

---

### Executive Commitment

**Edge Alpha Executive Team**

"We commit to building the management systems, assets and execution support required to maximize the probability of achieving these objectives."

**Founder**

"I agree that this represents the company's strategic priorities for the next execution cycle and authorize the Edge Alpha Executive Team to begin building the recommended management assets."

---

## Founder Decision

The founder must explicitly choose one of:

* ✅ Approve Blueprint
* ✏️ Request Changes
* 🔄 Re-run Strategy
* ❌ Reject Recommendation

No Shape assets or Ship actions may begin until the blueprint has been approved.

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

---

## Why I think this is a defining moment for Edge Alpha

This is no longer "Prompt S002."

It becomes the **governance mechanism** of the platform.

From this point onward:

* Every Co-Pilot knows what it is building.
* Every asset has a business purpose.
* Every automated action traces back to an approved objective.
* The founder remains in control of strategy while delegating execution.

That governance model is something I haven't really seen in current AI operating systems. Most systems jump from analysis straight into execution. Edge Alpha instead introduces a deliberate **executive alignment checkpoint**. That makes the platform feel much closer to running a real company, where strategy is agreed once, then the executive team executes against a shared mandate until the next strategic review.
`
