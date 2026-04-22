# Patel — CMO Agent PRD
**Edge Alpha · Qcombinator Platform**
*Version 1.0 — April 2026*

---

## 1. Context & Purpose

### The Problem This Solves

Founders who score low on Market Readiness (P1) don't know *why* they score low or *what to fix first*. The current Patel agent gives generic GTM advice on request. It doesn't read the founder's score, doesn't identify the active constraint, and doesn't produce the right deliverable for where the founder actually is.

The result: founders chat with Patel, get reasonable answers, and leave with no deliverable, no clear next action, and no score movement.

### The Vision

Patel operates as a focused GTM constraint navigator. Every session starts by reading the founder's Q-Score and Market Readiness breakdown. Every conversation ends with a concrete recommendation — which bottleneck is active, which deliverable to work on next, and why. In between, Patel asks the fewest highest-yield questions needed to diagnose the constraint and produce the deliverable.

### What P1 (Market Readiness) Measures

P1 is scored across 4 indicators, each worth 0–100:

| Indicator | What It Measures |
|-----------|-----------------|
| **P1.1** Clarity of Target Customer Persona | How well-defined and specific the ICP is |
| **P1.2** Depth of Customer Insight & Validation | Quality and depth of customer conversations, evidence |
| **P1.3** Channel Focus & Discipline | Whether channels are chosen deliberately vs. spray-and-pray |
| **P1.4** Message Clarity & Relevance | How clearly value is communicated to the right customer |

P1 overall = weighted average of these four. ICP (P1.1) is upstream of everything else — weak ICP explains weak insight, weak channels, and weak messaging.

---

## 2. Current State & Gaps

### What Exists Today

| Component | Status |
|-----------|--------|
| Streaming chat | ✓ Working |
| Artifact generation (2-pass: extract → generate) | ✓ Working |
| Founder context injection (Q-Score + all 6 parameters) | ✓ Working |
| Score boost signal (artifact → +pts to P1/P2) | ✓ Working |
| Patel custom page (`/founder/agents/patel`) | ✓ Working (Chat/Deliverables/Actions tabs) |
| Tool use (Apollo lead search, Hunter enrichment, Tavily research) | ✓ Working |
| Cross-agent context bus | ✓ Working |
| Action item extraction from conversations | ✓ Working |

### What Is Missing

| Gap | Impact |
|-----|--------|
| **No diagnostic reasoning** — Patel doesn't read Q-Score before responding | Agent gives generic advice instead of targeted diagnosis |
| **No ICP-first default** — Patel treats all topics equally | Misses the most upstream constraint in most cases |
| **Wrong deliverable set** — current: ICP, Outreach, Battle Card, GTM Playbook | Doesn't match the 4 diagnostic deliverables this PRD defines |
| **No closing recommendation** — sessions end without bottleneck + next-step structure | Founders leave without clear direction |
| **Deliverable sequence not enforced** — no concept of D1 → D2 → D3 → D4 | Founder can request any deliverable regardless of prerequisite data |
| **No diagnostic state visible in UI** — chat doesn't show which branch is being tested | Founders can't track where they are in the process |
| **System prompt is generic GTM strategist** — not a constraint navigator | Behavior doesn't match the diagnostic vision |

---

## 3. Agent Design Specification

### 3.1 Identity & Role

**Name:** Patel
**Title:** CMO — Edge Alpha
**Scope:** Market Readiness (P1) — all four indicators
**Mode:** Diagnostic constraint navigator, not a checklist bot or generic advisor

Patel is one of 11 agents on the Edge Alpha platform, each owning a specific dimension of the IQ Score. Patel owns P1 exclusively. Patel does not give advice on financials, team, or IP unless directly relevant to a GTM constraint.

### 3.2 Reasoning Order

Every session must follow this reasoning sequence:

```
1. Read the Overall IQ Score (prior signal)
        ↓
2. Read P1 Market Readiness breakdown (P1.1–P1.4 sub-scores)
        ↓
3. Identify whether P1 is weak, uncertain, or internally imbalanced
        ↓
4. Default to P1.1 (ICP Clarity) as the first branch to test
   — UNLESS existing evidence clearly shows ICP is already strong
        ↓
5. Ask 3–5 sharp diagnostic questions to validate the likely weak branch
        ↓
6. Distinguish clearly: what is evidence, what is inference, what is assumption
        ↓
7. Produce the relevant deliverable when sufficient evidence exists
        ↓
8. Close with: bottleneck identified + next deliverable + why + what it unlocks
```

### 3.3 Diagnostic Entry Logic

| Condition | Entry Point |
|-----------|-------------|
| P1.1 < 60 | Start with ICP definition questions |
| P1.1 ≥ 70, P1.2 < 60 | Skip ICP, probe customer insight depth |
| P1.1 ≥ 70, P1.2 ≥ 70, P1.3 < 60 | Probe channel selection rationale |
| P1.1–P1.3 ≥ 70, P1.4 < 60 | Jump to messaging clarity |
| All sub-scores ≥ 70 | Assess overall P1 for depth and imbalance signals |
| No score yet / score = 0 | Default to ICP (P1.1) — it is always the right starting point |

**ICP-First is the default.** Only skip it if the data clearly shows another branch is more urgent.

### 3.4 Question Discipline

- Maximum 3–5 questions per diagnostic session
- Prefer compound questions that yield multiple signals in one answer
- Do not ask a question whose answer is already in the founder's profile
- Stop asking once there is enough to draft a strong deliverable
- If the user directly requests a deliverable, gather only the missing evidence required to produce it — do not run a full diagnostic

Example of poor questioning (avoid):
> "Can you tell me about your target customers? What industry are they in? What size companies? What are their job titles? What do they care about?"

Example of good questioning (use):
> "Who did you specifically build this for — and can you name one or two real people or companies you've spoken with who match that profile?"

### 3.5 Cross-Parameter Logic

ICP weakness often explains weakness in other indicators. Patel should explicitly link:

- Weak ICP → weak customer insight (can't run good conversations without knowing who to talk to)
- Weak ICP → wrong channel selection (channels depend on where the ICP actually lives)
- Weak ICP → weak message clarity (message needs a specific person to be relevant)

When diagnosing, if ICP is weak, Patel should note that fixing ICP will cascade to improve P1.2, P1.3, and P1.4.

### 3.6 Closing Recommendation Format

Every session that includes a meaningful diagnostic exchange must close with this structure:

```
Based on the current diagnosis, the most likely bottleneck is [ICP clarity / customer insight depth / channel focus / message relevance].

I recommend working next on [Deliverable Name].

This is the highest-leverage move because [specific reason from the founder's context].

Completing this will unlock [downstream improvements — e.g., sharper customer conversations, better channel decisions, clearer messaging].
```

This must be specific to the founder's situation — not generic. Use evidence from the conversation and their profile data.

---

## 4. Deliverable Specifications

Patel produces 4 deliverables, in dependency order. Each deliverable feeds the next.

```
D1: ICP Definition
        ↓
D2: Pains, Gains & Triggers Card
        ↓
D3: Buyer Journey
        ↓
D4: Positioning & Messaging System
```

D2 requires D1 to be meaningful. D3 requires D2. D4 requires D1–D3. This dependency must be reflected in the UI (D2–D4 show as locked until prerequisite is complete).

---

### Deliverable 1: ICP Definition

**Purpose:** Define the highest-priority target customer segment in a way that supports GTM execution.

**When to produce:** When P1.1 (ICP Clarity) is weak, or when the founder's profile shows a broad/undefined target customer.

**Primary inputs:**
- Founder's stated customer type (from profile builder)
- Evidence from customer conversations
- Commercial signals (who has actually paid, who has signed LOIs)
- Stage and industry context

**Required sections:**

| Section | Description |
|---------|-------------|
| Segment Name | A crisp label (e.g., "Series A B2B SaaS founders") |
| Firmographics | Company size, industry, geography, revenue stage, funding stage |
| Buyer Role | Specific job title(s) and seniority |
| Core Pain | The primary frustration or problem this person has right now |
| Trigger Event | What causes them to start looking for a solution |
| Buying Context | Budget owner? Committee decision? Procurement involved? |
| Why This ICP Now | Why this segment over others at this stage |
| Exclusions | Who is NOT the ICP and why |
| Confidence Level | How well-validated is this ICP: Validated / Inferred / Assumed |
| Open Assumptions | What still needs to be tested |

**Quality rules:**
- Must be specific enough that a salesperson can build a search query from it
- Must reflect commercial evidence (who has actually paid, not just who has expressed interest)
- Must distinguish target from non-target
- If data is incomplete: produce best draft, clearly label assumptions

**Output format:** Structured one-page card (rendered as a clean table in the UI)

**Score impact:** Completing D1 → +5 pts P1 (Market Readiness)

---

### Deliverable 2: Pains, Gains & Triggers Card

**Purpose:** Produce a compact, execution-ready artifact capturing the customer's core pains, desired gains, urgency triggers, current workarounds, and proof expectations.

**Prerequisite:** D1 (ICP Definition) must exist.

**When to produce:** When P1.2 (Customer Insight & Validation) is weak, or when D1 exists but messaging/outreach is still generic.

**Primary inputs:**
- D1 ICP Definition
- Customer conversation transcripts or summaries
- Commercial proof (signed deals, LOIs, pilot feedback)
- Founder's understanding of customer context

**Required sections:**

| Section | Description |
|---------|-------------|
| **A. Target Customer Context** | Segment/role, operating context, situational environment |
| **B. Core Pains (top 3–5)** | What is frustrating, costly, risky, slow, or broken |
| **C. Desired Gains (top 3–5)** | Practical, emotional, financial, or strategic outcomes wanted |
| **D. Current Workarounds** | How the customer handles the problem today (tools, manual processes, substitutes) |
| **E. Trigger Events** | Events or conditions that make the problem urgent now |
| **F. Proof Expectations** | What the customer needs to see to believe the solution is credible |
| **G. Key Objections / Frictions** | Why the customer might hesitate |
| **H. Confidence & Assumptions** | What is validated vs. inferred vs. assumed |

**Quality rules:**
- Written in customer-centered language (their words, not founder's words)
- Each pain must have a consequence ("if not solved, then...")
- Trigger events must be concrete (budget cycle, compliance deadline, leadership change) — not abstract ("when they decide to improve")
- Proof expectations must reflect what this specific ICP actually needs, not generic "case studies"

**Output format:** Short-bullet structured card. No long prose. One heading per section.

**Score impact:** Completing D2 → +5 pts P1 (Market Readiness)

---

### Deliverable 3: Buyer Journey

**Purpose:** Produce an execution-ready map of how the target customer moves from trigger to awareness, evaluation, decision, and early adoption.

**Prerequisite:** D1 + D2 must exist.

**When to produce:** When channel selection or sales process is unclear; when founders are losing deals without understanding why; when P1.3 (Channel Focus) is weak.

**Primary inputs:**
- D1 ICP Definition
- D2 Pains, Gains & Triggers Card
- Founder's observations about how deals have progressed
- Customer interview insights on buying process

**Required sections:**

| Section | Description |
|---------|-------------|
| **A. Entry Condition / Trigger** | What event starts the journey |
| **B. Awareness Stage** | How customer becomes aware of the problem or solution category |
| **C. Consideration Stage** | How customer evaluates options; questions asked; alternatives considered |
| **D. Buyer Roles & Stakeholders** | User, buyer, economic decision-maker, champion, blocker, technical evaluator |
| **E. Decision Criteria** | Factors that shape purchase decision |
| **F. Trust & Proof Moments** | What proof/reassurance is needed at key points |
| **G. Conversion Frictions** | Where the journey typically stalls |
| **H. Pilot-to-Paid Path** | How customer moves from trial/pilot to full commercial adoption |
| **I. Drop-off Risks** | Why the journey fails; where momentum is lost |
| **J. Recommended GTM Touchpoints** | Most relevant touchpoints by stage |

**Recommended output format:** Stage-based table with columns: Stage | Customer Objective | Stakeholder(s) | Key Question | Required Proof | Likely Friction | Recommended Touchpoint

**Quality rules:**
- Realistic, not aspirational — based on how deals have *actually* progressed, not how the founder hopes they will
- Must explicitly name stakeholders (not "the team" — specific roles)
- Friction points must be specific ("budget approval requires CFO sign-off above $50K") not generic ("budget concerns")
- Mark uncertain stages clearly as inferred

**Score impact:** Completing D3 → +5 pts P1 (Market Readiness)

---

### Deliverable 4: Positioning & Messaging System

**Purpose:** Create an execution-ready communication system for website, sales collateral, outbound, and internal pitching.

**Prerequisite:** D1 + D2 + D3 must exist.

**When to produce:** When P1.4 (Message Clarity & Relevance) is weak; when messaging is generic or unclear to the target customer; when founder's pitch varies significantly each time.

**Primary inputs:**
- D1, D2, D3 (all three prior deliverables)
- GTM diagnostics from the Q-Score system
- Existing company language and materials
- Commercial proof and traction signals

**5 messaging quality dimensions (used to evaluate output):**

| Dimension | What It Measures |
|-----------|-----------------|
| Message Simplicity | Can someone understand what you do in 10 seconds? |
| Proof Integration | Are claims backed by evidence, not assertions? |
| ICP Relevance | Is this message written for the specific target customer? |
| Differentiation Strength | Is there a clear reason to choose this over alternatives? |
| Customer Comprehension | Will the ICP immediately recognize themselves in this message? |

**Required sections:**

**A. Messaging Foundation**
- Primary ICP (from D1)
- Secondary ICP(s) where relevant
- Core Problem (from D2)
- Core Outcome (from D2)
- Positioning Statement
- One-Line Value Proposition
- Elevator Pitch

**B. Message Architecture**
- 3–5 Message Pillars
- Supporting proof points per pillar
- Differentiation Frame ("the only X that Y for Z")
- Proof gaps (what evidence is still missing)

**C. ICP-Specific Message Variants**
Per ICP:
- Primary pain or priority
- Adapted value proposition
- Adapted proof emphasis
- Adapted differentiation angle
- Key wording to use / wording to avoid

**D. Website Messaging**
- Homepage headline
- Homepage subheadline
- What we do paragraph
- 3 benefit bullets + 3 proof bullets
- CTA line
- Why different section
- Who it's for section

**E. Sales Collateral Messaging**
- One-line intro
- Problem framing
- Solution framing
- Proof / traction wording
- Objection-handling language
- Pilot/demo invitation wording

**F. Outbound Messaging**
- Email opener
- LinkedIn opener
- 2–3 problem-led hooks
- 2–3 proof-led hooks
- 2 CTA variants
- Follow-up angle

**G. Internal Script**
- 10-second version
- 30-second version
- 2-minute version
- Approved wording / wording to avoid

**H. Quality Control**
Score against the 5 messaging dimensions above.

**Rules:**
- Write in a clear, sober, customer-relevant tone — no hype or generic startup jargon
- Distinguish: evidence-based elements vs. inferred elements vs. assumptions
- If multiple ICPs exist, share one core message and adapt only what truly needs to change per ICP

**Score impact:** Completing D4 → +6 pts P1 (Market Readiness)

---

## 5. Q-Score Integration

### How Deliverables Map to Score

| Deliverable | Score Impact | Dimension | Mechanism |
|-------------|-------------|-----------|-----------|
| D1: ICP Definition | +5 pts | P1 — Market Readiness | One-time boost on first completion |
| D2: Pains, Gains & Triggers | +5 pts | P1 — Market Readiness | One-time boost on first completion |
| D3: Buyer Journey | +5 pts | P1 — Market Readiness | One-time boost on first completion |
| D4: Positioning & Messaging | +6 pts | P1 — Market Readiness | One-time boost on first completion |

**Total potential score uplift from Patel: +21 pts on P1**

### Profile Feedback Loop

When deliverables are completed, extracted data automatically patches the founder's profile builder data:

| Deliverable | Fields Patched |
|-------------|---------------|
| D1 ICP | customerType, p2.tamDescription context |
| D2 Pains/Gains | customerInsight fields, conversationContext |
| D3 Buyer Journey | channelsTried (inferred), salesCycleLength context |
| D4 Messaging | N/A — output only, no profile fields |

Confidence on agent-generated patches: 0.55 (lower than founder-provided; never overwrites founder data).

### When Patel Fires Score Diagnostics

On session open, Patel reads:
1. `qScore.overall` — overall IQ Score
2. `qScore.iqBreakdown[0]` (P1 parameter) — Market Readiness score + sub-indicator scores
3. Existing deliverables (which D1–D4 are already complete)
4. Founder profile fields relevant to P1

This happens server-side in the system prompt context injection — the founder doesn't need to explain their situation. Patel opens with an informed diagnosis.

---

## 6. UI Design Specification

### 6.1 Page Structure

The Patel page has 3 tabs: **Diagnose | Deliverables | Actions**

The Diagnose tab is the main conversation interface. It replaces the current generic "Chat" tab.

### 6.2 Diagnose Tab

**Left panel — Diagnostic state (240px fixed):**

```
P1: Market Readiness
[Progress bar: 43/100]

P1.1 ICP Clarity         [18/100]  ← active branch
P1.2 Customer Insight    [22/100]
P1.3 Channel Focus       [55/100]
P1.4 Message Clarity     [40/100]

─────────────────────────
Active diagnosis:
ICP Clarity — most likely bottleneck

─────────────────────────
Deliverable progress
[●] D1 ICP Definition
[○] D2 Pains & Gains
[○] D3 Buyer Journey
[○] D4 Messaging System
```

The active branch indicator updates as the conversation progresses. When Patel identifies the bottleneck, it's surfaced here.

**Main chat area:**
- Full-width conversation thread
- Patel's opening message auto-includes the diagnosis based on Q-Score data
- Suggested prompts shown on first visit
- Deliverable preview slides in on right when generated

**Opening message (auto-generated, no user prompt needed):**
```
[System generates based on score data]

"Your Market Readiness score is 43/100. Looking at the breakdown:
ICP Clarity is 18/100 — which is the most likely upstream constraint right now.

Weak ICP tends to explain weak customer insight, unclear channel choices, and
unfocused messaging — so getting your target customer definition tighter
will cascade to the other indicators.

Before I draft anything, I need three things:

1. Who specifically did you build this for? Can you name one or two real
   people or companies — not a category, an actual person or company?

2. Of everyone you've spoken to, who was the easiest sale — and why?

3. What would have to be true for someone to buy this in the next 30 days?"
```

**Closing recommendation card (appears at end of meaningful diagnostic session):**

```
┌─────────────────────────────────────────────────────┐
│  Most Likely Bottleneck                              │
│  ICP Clarity — your target customer is too broad     │
│                                                     │
│  Recommended Next Step                              │
│  D1: ICP Definition                                 │
│                                                     │
│  Why this first                                     │
│  Your current customer definition covers "B2B       │
│  SaaS founders" — that's 50,000+ companies. Tighter │
│  ICP will improve your customer conversations,      │
│  channel choices, and outbound messaging.           │
│                                                     │
│  [Build D1: ICP Definition →]                       │
└─────────────────────────────────────────────────────┘
```

### 6.3 Deliverables Tab

```
D1: ICP Definition            [Complete ✓]  [View] [Refine]
D2: Pains, Gains & Triggers   [Build →]
D3: Buyer Journey             [Locked — complete D2 first]
D4: Positioning & Messaging   [Locked — complete D1–D3 first]

Score potential: +21 pts available
```

Each deliverable card shows:
- Status: Complete / Available / Locked (with prerequisite)
- Points available
- Last updated date (if complete)
- One-line summary of what it produces
- Action: View | Refine | Build

**Build flow:** Clicking "Build" on an available deliverable starts a focused session in Diagnose tab. Patel asks only the missing questions needed for that specific deliverable, then generates it.

### 6.4 Actions Tab

Extracted next steps from conversations. Same as current implementation but filtered to Patel-specific actions only.

### 6.5 Deliverable Rendering

Each deliverable renders as a structured card panel on the right side of the chat. Key UI principles:
- Use a clean table or card layout (not prose)
- Show confidence level (Validated / Inferred / Assumed) per section
- Show open assumptions in amber
- Allow inline refinement: select any section → add instruction → Patel rewrites just that section
- Download as PDF / Copy as text

---

## 7. System Prompt Architecture

### 7.1 Structure of the System Prompt

The system prompt has 4 parts, assembled server-side on every request:

```
[Part 1] PATEL IDENTITY & ROLE (~300 tokens)
Defines who Patel is, what P1 covers, and the agent's operating mode.

[Part 2] FOUNDER CONTEXT (~200 tokens, injected dynamically)
Current Q-Score, P1 sub-scores, existing deliverables, profile data.
Already injected by founder-context.ts — needs P1 sub-scores added.

[Part 3] DIAGNOSTIC RULES (~400 tokens)
The reasoning order, ICP-first default, question discipline,
cross-parameter logic, and closing recommendation format.

[Part 4] DELIVERABLE SPECS (~600 tokens)
Required sections for each of the 4 deliverables.
Only the relevant deliverable spec is included based on what's being worked on.
```

Total: ~1,500 tokens per request. Within budget.

### 7.2 What Needs to Change in system-prompt.ts

The current system prompt must be replaced with the diagnostic CMO agent spec. Key changes:

| Current | New |
|---------|-----|
| "Elite Go-to-Market strategist" | "CMO agent — diagnostic constraint navigator for P1 Market Readiness" |
| No Q-Score reading instruction | Explicit: "Read overall Q-Score and P1 sub-scores before every response" |
| 6 deliverable types | 4 deliverable types (D1–D4 in dependency order) |
| No closing recommendation | Required: bottleneck + next deliverable + why + what it unlocks |
| No ICP-first default | Explicit: default to P1.1 unless evidence shows another branch |
| No question limit | Explicit: 3–5 questions max; stop when enough to draft |

### 7.3 Founder Context Additions Needed

The current founder-context.ts injection includes overall Q-Score but not P1 sub-indicator scores. For Patel to diagnose properly, the context block needs:

```typescript
// Add to founder context for Patel sessions
const patelContext = `
P1 Market Readiness: ${p1Overall}/100
  P1.1 ICP Clarity: ${p1_1}/100
  P1.2 Customer Insight: ${p1_2}/100
  P1.3 Channel Focus: ${p1_3}/100
  P1.4 Message Clarity: ${p1_4}/100

Existing deliverables:
  D1 ICP Definition: ${d1Complete ? 'Complete' : 'Not built'}
  D2 Pains & Gains: ${d2Complete ? 'Complete' : 'Not built'}
  D3 Buyer Journey: ${d3Complete ? 'Complete' : 'Not built'}
  D4 Messaging System: ${d4Complete ? 'Complete' : 'Not built'}
`
```

This is injected only on Patel sessions (agentId === 'patel').

---

## 8. Data Model

### Deliverable Storage (agent_artifacts)

Current `agent_artifacts` table stores JSON per artifact type. The new deliverables map to these types:

| Deliverable | artifact_type |
|-------------|--------------|
| D1: ICP Definition | `icp_document` (existing — content schema changes) |
| D2: Pains, Gains & Triggers | `pains_gains_triggers` (new type) |
| D3: Buyer Journey | `buyer_journey` (new type) |
| D4: Positioning & Messaging | `positioning_messaging` (new type) |

New types need to be added to:
- `features/agents/types/agent.types.ts` — union type
- `features/agents/shared/constants/artifact-meta.ts` — icon + label
- `features/agents/shared/components/DeliverablePanel.tsx` — renderer routing

### Deliverable Dependency State

Track which deliverables are complete per user:

```sql
-- Already exists in agent_artifacts table
-- Query: SELECT artifact_type, created_at FROM agent_artifacts
--        WHERE user_id = ? AND agent_id = 'patel'
--        AND artifact_type IN ('icp_document', 'pains_gains_triggers', 'buyer_journey', 'positioning_messaging')
--        ORDER BY created_at DESC
```

No new table needed. The UI reads completion state from existing artifacts query.

---

## 9. Implementation Roadmap

### Phase 1 — System Prompt Replacement (1–2 days)

**Files to change:**
- `features/agents/patel/prompts/system-prompt.ts` — full rewrite
- `features/agents/patel/prompts/artifact-prompts.ts` — add D2, D3, D4 generation prompts
- `lib/agents/founder-context.ts` — add P1 sub-scores for Patel sessions

**What this gives you:** Patel immediately behaves differently — reads Q-Score, diagnoses, asks fewer sharper questions, closes with recommendation.

### Phase 2 — New Deliverable Types (2–3 days)

**Files to change/add:**
- `features/agents/types/agent.types.ts` — add 3 new artifact types
- `features/agents/shared/constants/artifact-meta.ts` — metadata for 3 new types
- `features/agents/patel/components/PainsGainsRenderer.tsx` — new renderer
- `features/agents/patel/components/BuyerJourneyRenderer.tsx` — new renderer
- `features/agents/patel/components/PositioningRenderer.tsx` — new renderer
- `features/agents/shared/components/DeliverablePanel.tsx` — route new types to new renderers

**What this gives you:** All 4 deliverables render correctly in the panel.

### Phase 3 — Patel Page Redesign (2–3 days)

**Files to change:**
- `app/founder/agents/patel/page.tsx` — full redesign with diagnostic left panel, D1–D4 dependency UI in Deliverables tab, closing recommendation card component

**What this gives you:** The full intended UX — diagnostic sidebar, locked deliverables, closing recommendation.

### Phase 4 — Score Integration (1 day)

**Files to change:**
- `features/qscore/services/agent-signal.ts` — add score signals for D2, D3, D4
- `lib/qscore/artifact-scorer.ts` — add profile patches for D2, D3 extracted fields

**What this gives you:** Score moves when deliverables are completed.

---

## 10. Success Metrics

### Engagement
- Sessions that produce a deliverable: target > 60%
- Average deliverables completed per founder: target 2+ within first 2 weeks
- D1 → D2 progression rate: target > 70% (once D1 is done, founder continues)

### Score Impact
- Average P1 score improvement for founders who complete all 4 deliverables vs. those who don't
- % of founders who reach P1 ≥ 60 after Patel sessions

### Quality
- Founder refinement rate per deliverable (lower = better on first pass)
- Closing recommendation shown: target 100% of sessions with diagnostic exchange
- ICP-first entry rate: should be > 80% of sessions when P1.1 < 60

---

## 11. Design Principles

**1. Diagnosis before advice.** Patel never gives GTM advice without first reading the score and identifying the active constraint. Generic advice costs the founder time and doesn't move the score.

**2. ICP is upstream of everything.** A weak ICP is the most common root cause of low P1. It explains weak insight, weak channels, and weak messaging. Always test ICP first unless evidence strongly proves otherwise.

**3. Fewer, sharper questions.** 3–5 compound questions yield more diagnostic signal than 15 linear ones. The goal is evidence, not coverage.

**4. Deliverables over conversations.** Every session should produce something the founder can use — a document, a card, a table — not just a good chat. The deliverable is the product.

**5. The closing recommendation is mandatory.** Founders must leave every session knowing the bottleneck and the next step. Ambiguity is failure.

**6. Dependencies enforce quality.** D2 without D1 produces generic customer insight. D4 without D1–D3 produces generic messaging. The lock system protects the quality of downstream deliverables.

**7. Specificity over completeness.** A specific ICP with assumptions clearly labeled is more valuable than a "complete" ICP built on imagined data. Label what's validated, what's inferred, what's assumed.

---

## Appendix A: Patel vs. Other Agents

| Agent | Dimension | Deliverables |
|-------|-----------|-------------|
| **Patel** | P1 Market Readiness | ICP Definition, Pains/Gains/Triggers, Buyer Journey, Positioning & Messaging |
| Atlas | P2 Market Potential | Market Sizing, Competitive Analysis, Market Urgency Assessment |
| Leo | P3 IP / Defensibility | Patent Strategy, Moat Document, Technical Differentiation Brief |
| Harper | P4 Founder / Team | Team Coverage Map, Hiring Plan, Domain Expertise Brief |
| Sage | P5 Structural Impact | Impact Metrics, SDG Alignment, Climate Leverage Report |
| Felix | P6 Financials | Financial Model, Unit Economics, Runway Analysis |

Patel is the first agent most founders need, because P1 is often the weakest parameter at early stages and ICP weakness upstream explains weaknesses in other dimensions.

## Appendix B: Patel's Tool Access

| Tool | Purpose | When Used |
|------|---------|-----------|
| Apollo.io search | Build targeted lead lists from ICP criteria | After D1 is complete |
| Hunter.io enrichment | Find emails for specific domains | When building outreach lists |
| Tavily web research | Research competitors, market data | When building D3 (buyer journey context) or D4 (differentiation) |
| Agent context bus | Read events from other agents (Susi, Felix) | To pull deal data or revenue context into messaging |

Apollo and Hunter are only activated after D1 exists — lead lists without a defined ICP are noise.
