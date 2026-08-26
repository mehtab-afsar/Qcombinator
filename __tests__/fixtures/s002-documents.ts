/**
 * Real S002 output, captured — the input every mandate parser is actually judged against.
 *
 * Shared by mandate-document.test.ts (splitting) and mandate-structure.test.ts (structuring)
 * rather than copied into both: these are the ground truth, and two drifting copies of ground
 * truth is worse than none. Not a *.test.ts file, so jest's testMatch does not collect it.
 *
 * The three differ in ways that matter, which is why all three are kept. The prompt
 * (lib/prompts/executives/ceo/s002.ts) prescribes the SECTION NAMES and nothing about how a
 * section's contents are laid out — so the model invents the labels, the emphasis style, the
 * numbering, and crucially WHICH sub-fields it bothers to emit. A parser that assumes any of
 * that is a parser that breaks on the next generation.
 */

/** All FOUR sub-fields, in **double** asterisks, value on the same line. Reported by a founder
 *  from their own live mandate (26 Aug 2026) — the literal `**` were rendering on screen, which
 *  is what prompted structuring in the first place. */
export const FOUR_FIELD_DOCUMENT = `
# Executive Objectives

**1. Define Business Model & Unit Economics**
**Why it matters:** Cannot price, sell, or scale without understanding how the business makes money.
**Expected business impact:** Enables pricing decisions, sales conversations, and investor discussions.
**Success criteria:** Documented pricing model, unit economics, and revenue model approved by founder.
**Priority:** High

**2. Validate Ideal Customer Profile**
**Why it matters:** Prevents wasted effort targeting wrong customers and enables focused GTM execution.
**Expected business impact:** Concentrates resources on highest-probability revenue opportunities.
**Success criteria:** ICP documented and validated through 5-10 discovery conversations with target customers.
**Priority:** High

**3. Establish Financial Visibility & Runway Management**
**Why it matters:** Founder cannot make informed decisions or communicate credibly to investors without financial model.
**Expected business impact:** Governs resource allocation, hiring, and fundraising timing.
**Success criteria:** 12-month financial model with unit economics, runway projection, and scenario planning.
**Priority:** High

**4. Sequence 90-Day Execution Roadmap**
**Why it matters:** Prevents scattered execution by clarifying what gets built when across product, GTM, and fundraising.
**Expected business impact:** Maximizes probability of achieving objectives within cycle.
**Success criteria:** Documented roadmap showing sequenced priorities across all functions.
**Priority:** Medium

---

# Recommended Strategic Pathway

**Product Validation**

**Why this pathway:**
Edge Alpha must validate core business assumptions - pricing, ICP, customer problems - before scaling commercial or fundraising efforts, making Product Validation the highest-leverage pathway for this cycle.

**Expected outcomes:**
Validated business model, documented ICP, financial foundation, and sequenced roadmap that enables confident commercial acceleration and investment readiness in subsequent cycles.

**Why alternatives were not selected:**
Commercial Acceleration requires validated ICP and pricing model (not yet established). Investment Readiness requires financial model and business model clarity (not yet built). Operational Excellence addresses scale challenges (premature at this stage).

---

# Executive Risks

**Strategic Risk:**
Customer discovery reveals ICP assumptions are incorrect, requiring business model pivot - mitigate by conducting discovery early in cycle and maintaining model flexibility.

**Execution Risk:**
Founder lacks capacity to complete 5-10 discovery conversations within 90 days - mitigate by providing discovery framework, scheduling support, and prioritizing highest-value conversations.

**Critical Assumption:**
Market demand exists at proposed pricing levels - validate through discovery conversations that include willingness-to-pay discussions before finalizing business model.
`

/** Captured verbatim from a real, successful S002 generation (7 Aug 2026).
 *  ⚠️ Objectives here carry only *Why it matters* and *Priority* — no expected impact and no
 *  success criteria — in SINGLE asterisks, and the pathway states no expected outcomes. Any
 *  layout reserving a row per field ships blank labels against this document. */
export const REAL_CAPTURED_DOCUMENT = `
# Executive Summary

**Current Position**
Edge Alpha has built a diagnostic (Q-Score) and is developing an Executive Operating System to help early-stage founders become investor-ready. The company has validated the problem space but has not yet proven commercial traction or investor adoption of its methodology.

**Recommended Direction**
Commercial validation through focused execution: ship the complete Executive Operating System to initial paying founders via P001, prove measurable Q-Score improvement, and secure investor pilot commitments that reference Q-Score in their diligence process.

---

# Executive Objectives

**1. Prove Commercial Model**
*Why it matters:* Revenue validates product-market fit and funds runway extension.
*Priority:* High

**2. Establish Q-Score as Investor Standard**
*Why it matters:* Investor adoption creates defensible moat and two-sided marketplace dynamics.
*Priority:* High

---

# Recommended Strategic Pathway

**Commercial Acceleration**

*Why this pathway:* The company has a diagnostic and a thesis but no revenue or proven delivery model.

*Why alternatives were not selected:* Investment Readiness would be premature without commercial traction; Product Validation risks over-building before proving founders will pay.

---

# Executive Asset Blueprint

| Asset | Purpose | Business Outcome | Responsible Co-Pilot | Priority |
|-------|---------|------------------|---------------------|----------|
| **ICP Definition** | Identify highest-probability founder segment | Focus commercial effort | Growth | High |

---

# Asset Dependencies

\`\`\`text
ICP Definition
    ↓
Positioning & Messaging Framework
\`\`\`

---

# Success Metrics

### Executive Objective 1: Prove Commercial Model
**Leading:** Qualified founder conversations
**Lagging:** Paying founders (target: 50), revenue

---

# Executive Risks

**Strategic Risk: Investor adoption lags founder adoption**
If investors don't adopt Q-Score, the two-sided network effect fails — monitor investor pilot engagement weekly.

**Execution Risk: P001 delivery doesn't improve Q-Score**
If founders complete the program without measurable score improvement, ROI is unproven.

---

# Executive Contract

### Mission
Build the fastest way for early-stage founders to get a fundable, investor-trusted operating system.

---

### Executive Priorities
- Acquire 50 paying founders by end of Q1 2027
- Secure 3 signed investor pilots using Q-Score in diligence

---

### Strategic Pathway
Commercial Acceleration — prove the business works through revenue, delivery, and investor adoption.

---

### Success Metrics
Paying founders, signed investor pilots, Q-Score improvement

---

### Executive Commitment

**Edge Alpha Executive Team**

"We commit to building the management systems, assets and execution support required to maximize the probability of achieving these objectives."
`

/** The "# Step N — Title" heading style the parser originally assumed and which the model never
 *  actually produces (verified across 9 generations). Kept because its sections are UNSTRUCTURED
 *  prose — one paragraph each — making it the proof that a section which cannot be structured
 *  still renders, as markdown, rather than failing. */
export const STEP_PREFIXED_DOCUMENT = `
# Step 1 — Executive Direction

Summary of the company's current position and recommended direction.

---

# Step 2 — Executive Objectives

1. Define the business model — why it matters, expected impact, success criteria, priority: High.
2. Establish financial foundations — why it matters, expected impact, success criteria, priority: High.

---

# Step 3 — Recommended Strategic Pathway

Product Validation. Chosen because product-market fit is unproven. Commercial Acceleration was
rejected because there is no repeatable channel yet.

---

# Step 4 — Executive Asset Blueprint

| Asset | Purpose | Business Outcome | Responsible Co-Pilot | Priority |
| --- | --- | --- | --- | --- |
| ICP Profiles | Define target buyer | Higher conversion | Growth | High |

---

# Step 5 — Asset Dependencies

Customer Discovery -> ICP -> Messaging

---

# Step 6 — Success Metrics

### Leading Indicators
Meetings, pilots.
### Lagging Indicators
Revenue, retention.

---

# Step 7 — Executive Risks

Strategic risk: market timing. Execution risk: hiring. Critical assumption: customers will pay.

---

# Executive Contract

### Mission
Build the thing.

### Strategic Pathway
Product Validation.
`
