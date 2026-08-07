/**
 * lib/mandate/document.ts — splitting S002's generated document into sections a
 * founder can read as "why", not just the 4-field JSON summary.
 */

import { splitDocumentSections, pickReasoningSections } from '@/lib/mandate/document'

// A document using the "# Step N — Title" heading style this file's parser
// ORIGINALLY assumed. Verified live (7 Aug 2026, 9 real S002 calls) that the model
// never actually produces this prefix — kept here only to prove the parser still
// degrades sensibly on it (matches on heading depth + keyword, not a fixed prefix),
// not because it's representative. REAL_CAPTURED_DOCUMENT below is representative.
const STEP_PREFIXED_DOCUMENT = `
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

// Captured verbatim from a real, successful S002 generation (routedCall path,
// maxTokens 10,000, the tightened prompt in lib/prompts/executives/ceo/s002.ts) —
// not hand-written. This is what pickReasoningSections must actually work against.
const REAL_CAPTURED_DOCUMENT = `
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

describe('splitDocumentSections', () => {
  it('splits on real top-level headings, no fixed "Step N —" prefix required', () => {
    const sections = splitDocumentSections(REAL_CAPTURED_DOCUMENT)
    expect(sections.map(s => s.heading)).toEqual([
      'Executive Summary',
      'Executive Objectives',
      'Recommended Strategic Pathway',
      'Executive Asset Blueprint',
      'Asset Dependencies',
      'Success Metrics',
      'Executive Risks',
      'Executive Contract',
    ])
  })

  it("does not pick up the Executive Contract restatement's ### subheadings as their own sections", () => {
    const sections = splitDocumentSections(REAL_CAPTURED_DOCUMENT)
    const lastSection = sections[sections.length - 1]
    expect(lastSection.heading).toBe('Executive Contract')
    expect(sections.filter(s => s.heading === 'Mission')).toHaveLength(0)
    expect(sections.filter(s => s.heading === 'Strategic Pathway')).toHaveLength(0)
  })

  it('every section has a non-empty body', () => {
    const sections = splitDocumentSections(REAL_CAPTURED_DOCUMENT)
    for (const s of sections) expect(s.body.length).toBeGreaterThan(0)
  })

  it('still splits sensibly on a "Step N —" prefixed document (degrades gracefully, not a required format)', () => {
    const sections = splitDocumentSections(STEP_PREFIXED_DOCUMENT)
    expect(sections.map(s => s.heading)).toEqual([
      'Step 1 — Executive Direction',
      'Step 2 — Executive Objectives',
      'Step 3 — Recommended Strategic Pathway',
      'Step 4 — Executive Asset Blueprint',
      'Step 5 — Asset Dependencies',
      'Step 6 — Success Metrics',
      'Step 7 — Executive Risks',
      'Executive Contract',
    ])
  })

  it('degrades to [] rather than throwing on null/undefined/empty/malformed input', () => {
    expect(splitDocumentSections(null)).toEqual([])
    expect(splitDocumentSections(undefined)).toEqual([])
    expect(splitDocumentSections('')).toEqual([])
    expect(splitDocumentSections('no headings here at all')).toEqual([])
  })
})

describe('pickReasoningSections', () => {
  it('picks exactly Objectives, Pathway, and Risks from a real captured document', () => {
    const picked = pickReasoningSections(REAL_CAPTURED_DOCUMENT)
    expect(picked.map(s => s.heading)).toEqual([
      'Executive Objectives',
      'Recommended Strategic Pathway',
      'Executive Risks',
    ])
  })

  it("excludes the Executive Contract restatement even though its own 'Strategic Pathway' subheading contains the keyword", () => {
    const picked = pickReasoningSections(REAL_CAPTURED_DOCUMENT)
    // Only one Pathway section — Step 3's real reasoning, not the Step 8 restatement's echo.
    expect(picked.filter(s => s.heading.toLowerCase().includes('pathway'))).toHaveLength(1)
  })

  it('picks the same three sections from the Step-N-prefixed document too', () => {
    const picked = pickReasoningSections(STEP_PREFIXED_DOCUMENT)
    expect(picked.map(s => s.heading)).toEqual([
      'Step 2 — Executive Objectives',
      'Step 3 — Recommended Strategic Pathway',
      'Step 7 — Executive Risks',
    ])
  })

  it('a founder must never see a raw error over this cosmetic panel — degrades to [] on anything unexpected', () => {
    expect(pickReasoningSections(null)).toEqual([])
    expect(pickReasoningSections('garbage with no headings')).toEqual([])
  })
})
