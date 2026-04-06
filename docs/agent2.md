# Edge Alpha — CXO Agent System v2
## What True Agency Actually Means

> **This document has been revised.** The previous version described a ReAct loop (plan → gather → reason → generate) as the goal. That's not enough. A ReAct loop makes a better document generator. This spec describes what makes the system truly agentic: a shared world model, persistent goals, and real async delegation between agents.

---

## 1. Where We Are Today

The current system (as of April 2026) is significantly more advanced than v1. These are already built and working:

| Capability | Status | Location |
|---|---|---|
| Native tool calling (15 tools) | ✅ Built | `lib/llm/tools.ts` |
| Model routing (5 task tiers) | ✅ Built | `lib/llm/router.ts` |
| SSE streaming < 1s first token | ✅ Built | `lib/llm/provider.ts` |
| Self-critique + regen pass | ✅ Built | `lib/agents/critique.ts` |
| Cross-agent context (relevance tiers) | ✅ Built | `lib/agents/context.ts` |
| Orchestration sub-calls (max 2) | ✅ Built | `lib/agents/orchestrator.ts` |
| Feature flags for all major features | ✅ Built | `lib/feature-flags.ts` |
| AI Score Intelligence (unlock cards) | ✅ Built | `features/qscore/services/score-intelligence.ts` |
| AI Investor Match rationale | ✅ Built | `features/matching/services/match-rationale.ts` |
| Async artifact generation | ✅ Built | `app/api/agents/generate/run/route.ts` |
| Agent context compression (4K budget) | ✅ Built | `lib/agents/context-compressor.ts` |

**What this gives us today:** Agents that respond well when asked. Quality output, real data tools, streaming. A very good AI assistant.

**What this does not give us:** True agency.

---

## 2. The Honest Gap: Why This Is Still Not Agentic

Adding a multi-tool loop (ReAct) to the current system would improve output quality. It would not make the platform agentic. Here is the exact distinction:

### What ReAct gives you

```
Founder asks → Agent thinks → Agent gathers data → Agent writes → Done
```

The agent is smarter. But it still only acts when asked. It still forgets everything between sessions. It still has no concept of what the founder is trying to achieve next month. It still cannot coordinate with another agent and wait for the result.

It is a more capable request-response machine.

### What true agency requires

```
Agent monitors startup state continuously
Agent notices something changed (MRR dropped, deal went stale, runway shortened)
Agent investigates (queries Stripe, checks pipeline, recalculates runway)
Agent delegates sub-tasks to other agents (Susi: check the churned account)
Agent waits for results and builds on them
Agent surfaces a conclusion to the founder — who never asked for any of this
```

The founder did not initiate. The agent did. That is the difference.

**Three things are missing that make the difference:**

1. **A shared world model** — agents don't have a live, structured picture of the startup. They have disconnected artifact files.
2. **Persistent goals** — agents have no objective that spans sessions. Every conversation starts from zero.
3. **Real async delegation** — when Sage "orchestrates" today, it injects text snippets. It cannot give Harper a real task, wait for it to complete, and use the result.

---

## 3. The Three Missing Pieces

### 3.1 The Startup State Object (Shared World Model)

One live record per founder. Every agent reads from it before acting. Every agent writes to it after generating. No agent operates on stale data.

```typescript
// lib/agents/startupState.ts

interface StartupState {
  userId: string
  updatedAt: Date

  // ── Company basics (set during onboarding, refined by agents) ────────────
  stage: 'early' | 'mid' | 'growth'
  sector: string
  track: 'commercial' | 'impact'

  // ── Financial picture (Felix writes, all agents read) ────────────────────
  mrr: number | null
  runway: number | null               // months
  burnRate: number | null             // monthly
  lastStripeSync: Date | null
  fundraisingGoal: number | null
  targetRaiseDate: Date | null

  // ── Market position (Patel + Atlas write) ───────────────────────────────
  icpLocked: boolean
  targetSegment: string | null
  primaryChannel: string | null
  positioningStatement: string | null

  // ── PMF signal (Nova writes) ─────────────────────────────────────────────
  pmfScore: number | null             // Sean Ellis %
  topCustomerPhrase: string | null    // exact words customers used
  mainJobToBeDone: string | null

  // ── Sales pipeline (Susi writes) ─────────────────────────────────────────
  openDeals: number
  pipelineValue: number | null
  avgSalesCycleDays: number | null
  staleDeals: number                  // deals with no activity 7+ days

  // ── Strategic state (Sage writes) ────────────────────────────────────────
  currentGoal: string | null          // e.g. "Series A ready in 4 months"
  biggestRisk: string | null
  openContradictions: ContradictionRecord[]
  investorReadinessScore: number | null

  // ── System signals ────────────────────────────────────────────────────────
  founderLastActive: Date
  agentsWithActiveGoals: AgentId[]
  lastContradictionScan: Date | null
  lastProactiveCheck: Date | null
}

interface ContradictionRecord {
  id: string
  severity: 'critical' | 'high' | 'medium'
  description: string
  agentsInvolved: AgentId[]
  detectedAt: Date
  resolved: boolean
}

// Every agent reads this at the start of every turn
async function getStartupState(userId: string): Promise<StartupState>

// Every agent writes their updates after generating
async function updateStartupState(userId: string, patch: Partial<StartupState>): Promise<void>
```

**Database:** One `startup_state` table row per founder. JSONB columns for complex nested fields. Updated via `updateStartupState()` — never replaced wholesale.

**Why this matters:** Right now Felix calculates runway and saves it in an artifact file. Sage has to load that artifact to know the runway. The startup state means every agent always has the current runway, current PMF score, current open contradictions — without loading artifact files. The platform has one live, consistent picture of the company.

---

### 3.2 Persistent Agent Goals

Every agent holds an objective that survives between sessions. The agent checks its goal status proactively. If the goal is at risk, the agent acts.

```typescript
// lib/agents/agentGoals.ts

interface AgentGoal {
  id: string
  userId: string
  agentId: AgentId
  goal: string                        // human-readable: "Keep runway above 12 months"
  successCondition: string            // measurable: "startupState.runway >= 12"
  evaluateFn: (state: StartupState) => GoalStatus
  deadline: Date | null
  priority: 'critical' | 'high' | 'medium'
  lastEvaluated: Date
  status: 'on_track' | 'at_risk' | 'blocked' | 'achieved'
  blockers: string[]
}

type GoalStatus = {
  status: 'on_track' | 'at_risk' | 'blocked' | 'achieved'
  reason: string
  suggestedAction?: string
}

// Default goals per agent — set when agent is first activated for a founder
const DEFAULT_GOALS: Record<AgentId, (state: StartupState) => AgentGoal> = {
  felix: (state) => ({
    goal: 'Maintain healthy runway and financial visibility',
    successCondition: 'runway >= 12 and financial_summary artifact exists and is < 30 days old',
    evaluateFn: (s) => {
      if (!s.runway) return { status: 'blocked', reason: 'No financial data available yet' }
      if (s.runway < 6) return { status: 'at_risk', reason: `Runway ${s.runway} months — critical`, suggestedAction: 'Build emergency scenarios immediately' }
      if (s.runway < 12) return { status: 'at_risk', reason: `Runway ${s.runway} months — below target`, suggestedAction: 'Begin fundraising preparation' }
      return { status: 'on_track', reason: `Runway ${s.runway} months` }
    },
    priority: 'critical',
    deadline: null,
  }),

  patel: (state) => ({
    goal: 'Lock ICP and build repeatable outreach pipeline',
    successCondition: 'icpLocked and outreach_sequence artifact exists',
    evaluateFn: (s) => {
      if (!s.icpLocked) return { status: 'blocked', reason: 'ICP not yet locked', suggestedAction: 'Complete ICP with market research' }
      if (!s.primaryChannel) return { status: 'at_risk', reason: 'No primary channel identified', suggestedAction: 'Build GTM playbook' }
      return { status: 'on_track', reason: 'ICP locked, channel identified' }
    },
    priority: 'high',
    deadline: null,
  }),

  susi: (state) => ({
    goal: 'Keep pipeline active and deals progressing',
    successCondition: 'openDeals >= 3 and staleDeals === 0',
    evaluateFn: (s) => {
      if (s.staleDeals > 0) return { status: 'at_risk', reason: `${s.staleDeals} deals with no activity`, suggestedAction: 'Generate follow-up sequences' }
      if (s.openDeals < 3) return { status: 'at_risk', reason: 'Pipeline too thin', suggestedAction: 'Request ICP refresh from Patel' }
      return { status: 'on_track', reason: `${s.openDeals} active deals` }
    },
    priority: 'high',
    deadline: null,
  }),

  sage: (state) => ({
    goal: 'Keep startup strategy coherent and investor-ready',
    successCondition: 'openContradictions.length === 0 and investorReadinessScore >= 65',
    evaluateFn: (s) => {
      const critical = s.openContradictions.filter(c => c.severity === 'critical')
      if (critical.length > 0) return { status: 'blocked', reason: `${critical.length} critical contradictions`, suggestedAction: 'Resolve contradictions before next investor conversation' }
      if ((s.investorReadinessScore ?? 0) < 50) return { status: 'at_risk', reason: `Readiness score ${s.investorReadinessScore} — too low`, suggestedAction: 'Run investor readiness workflow' }
      return { status: 'on_track', reason: `Readiness ${s.investorReadinessScore}` }
    },
    priority: 'critical',
    deadline: null,
  }),

  atlas: (state) => ({
    goal: 'Maintain current competitive intelligence',
    successCondition: 'competitive_matrix artifact exists and is < 14 days old',
    evaluateFn: (s) => ({ status: 'on_track', reason: 'Competitive monitoring active' }),
    priority: 'medium',
    deadline: null,
  }),

  nova: (state) => ({
    goal: 'Maintain PMF signal above 40%',
    successCondition: 'pmfScore >= 40',
    evaluateFn: (s) => {
      if (!s.pmfScore) return { status: 'blocked', reason: 'No survey data yet', suggestedAction: 'Launch PMF survey' }
      if (s.pmfScore < 40) return { status: 'at_risk', reason: `PMF score ${s.pmfScore}% — below threshold`, suggestedAction: 'Analyse low-score responses for product direction' }
      return { status: 'on_track', reason: `PMF score ${s.pmfScore}%` }
    },
    priority: 'high',
    deadline: null,
  }),

  harper: (state) => ({
    goal: 'Keep hiring plan aligned with financial constraints',
    successCondition: 'hiring_plan artifact exists and aligns with current headcount budget',
    evaluateFn: (s) => {
      if (!s.burnRate) return { status: 'blocked', reason: 'No financial data to derive headcount budget' }
      return { status: 'on_track', reason: 'Hiring plan in sync' }
    },
    priority: 'medium',
    deadline: null,
  }),

  maya: (state) => ({
    goal: 'Keep brand messaging aligned with latest PMF signal',
    successCondition: 'brand_messaging artifact exists and created after latest pmf_survey',
    evaluateFn: (s) => ({ status: 'on_track', reason: 'Brand monitoring active' }),
    priority: 'medium',
    deadline: null,
  }),

  leo: (state) => ({
    goal: 'Keep legal checklist current for current stage',
    successCondition: 'legal_checklist artifact exists for current stage',
    evaluateFn: (s) => ({ status: 'on_track', reason: 'Legal checklist maintained' }),
    priority: 'low',
    deadline: null,
  }),
}
```

**How goals are used:** The proactive engine evaluates every active goal daily. If a goal moves to `at_risk` or `blocked`, the agent creates an activity event and may trigger an automated action. The founder's dashboard shows goal status across all 9 agents — a live health check on every dimension of their company.

---

### 3.3 Real Async Agent Delegation

When one agent needs another agent to do real work — not just provide a summary — it creates a delegation task. The task runs in the background. The requesting agent picks up the result when it's ready.

This is fundamentally different from the current orchestration (which injects 300-token text snippets). This is one agent telling another: "Rebuild your plan. Here's the new constraint. Tell me when you're done."

```typescript
// lib/agents/delegation.ts

interface DelegationTask {
  id: string
  fromAgent: AgentId
  toAgent: AgentId
  userId: string

  instruction: string                 // what to do
  contextPayload: DelegationPayload   // typed — not free text
  requiredArtifactType: ArtifactType  // what the requesting agent needs back
  priority: 'immediate' | 'background'

  status: 'pending' | 'running' | 'complete' | 'failed'
  result?: ArtifactContent
  error?: string

  createdAt: Date
  completedAt?: Date
  expiresAt: Date                     // tasks expire after 24h if not picked up
}

// Typed payloads for each delegation type — not free text
type DelegationPayload =
  | {
      type: 'financial_constraint_changed'
      fromAgent: 'felix'
      toAgent: 'harper'
      data: {
        previousMonthlyBudget: number
        newMonthlyBudget: number
        runway: number
        reason: string
        affordableRoles: Array<{ role: string; maxSalary: number; urgency: 'now' | 'q2' | 'post_raise' }>
      }
    }
  | {
      type: 'competitive_landscape_changed'
      fromAgent: 'atlas'
      toAgent: 'patel'
      data: {
        newCompetitors: string[]
        positioningGapsChanged: boolean
        whiteSpaceOpportunities: string[]
        urgency: 'immediate' | 'this_week'
      }
    }
  | {
      type: 'icp_updated'
      fromAgent: 'patel'
      toAgent: 'susi'
      data: {
        newBuyerPersona: BuyerPersona
        updatedQualificationCriteria: QualificationCriteria
        objectionMap: Record<string, string>
        affectedDeals: string[]         // deal IDs that may need re-qualification
      }
    }
  | {
      type: 'pmf_signal_updated'
      fromAgent: 'nova'
      toAgent: 'maya'
      data: {
        topCustomerPhrases: string[]
        mainJobToBeDone: string
        beforeAfterStory: { before: string; after: string }
        pmfScore: number
        messagingImplication: string    // what this means for brand voice
      }
    }
  | {
      type: 'investor_readiness_requested'
      fromAgent: 'sage'
      toAgent: AgentId
      data: {
        targetDate: Date
        investorType: string
        focusArea: string               // which dimension sage needs refreshed
        currentGap: string
      }
    }

// Requesting agent creates a task and optionally waits
async function delegateTo(
  fromAgent: AgentId,
  toAgent: AgentId,
  payload: DelegationPayload,
  userId: string,
  options: { wait: boolean; timeoutMs?: number } = { wait: false }
): Promise<DelegationTask>

// Target agent picks up its pending tasks on each turn
async function getPendingDelegations(agentId: AgentId, userId: string): Promise<DelegationTask[]>

// Target agent marks task complete with result
async function completeDelegation(taskId: string, result: ArtifactContent): Promise<void>
```

**How this works in practice:**

```
Felix syncs Stripe → runway dropped from 14 to 9 months
Felix updates StartupState { runway: 9 }
Felix creates delegation task:
  → to: harper
  → type: 'financial_constraint_changed'
  → data: { previousBudget: 180000, newBudget: 95000, runway: 9, ... }
  → priority: 'immediate'

Harper picks up the delegation on next turn (or proactive engine triggers Harper)
Harper reads the typed payload — not guessing from text
Harper rebuilds hiring plan with $95K constraint
Harper calls completeDelegation(taskId, newHiringPlan)
Harper updates StartupState { hiringPlanBudget: 95000 }

Felix (or Sage) picks up the completed task
Sage now has a coherent, updated picture: financial reality → hiring plan updated
Sage detects no contradiction between financials and hiring

Founder opens app:
"Your runway dropped to 9 months. Harper automatically updated the hiring plan
 to reflect the new budget. Two Q2 roles were deprioritised. Review the changes."
```

The founder saw the conclusion. They did not watch three agents coordinate. The platform did the work.

---

## 4. The Proactive Engine (Revised)

With the world model and goals in place, the proactive engine becomes genuinely powerful. It's no longer just scheduled alerts — it's a continuous monitor that drives agent coordination.

```typescript
// lib/agents/proactiveEngine.ts

const PROACTIVE_RULES: ProactiveRule[] = [

  // ── Financial rules ────────────────────────────────────────────────────────
  {
    name: 'runway_critical',
    schedule: 'on_state_change',        // fires when runway field changes
    condition: (state) => (state.runway ?? 99) < 6,
    action: async (userId, state) => {
      await delegateTo('felix', 'felix', { type: 'investor_readiness_requested', ... }, userId, { wait: false })
      await createAgentActivity(userId, 'felix', 'runway_critical',
        `Runway ${state.runway} months — below critical threshold. Emergency scenarios being modelled.`)
      await sendNotification(userId, 'runway_critical', { runway: state.runway })
    },
  },

  {
    name: 'runway_warning',
    schedule: 'daily',
    condition: (state) => (state.runway ?? 99) < 12 && (state.runway ?? 99) >= 6,
    action: async (userId, state) => {
      // Trigger Harper to check if hiring plan still fits
      await delegateTo('felix', 'harper', {
        type: 'financial_constraint_changed',
        fromAgent: 'felix', toAgent: 'harper',
        data: { newMonthlyBudget: state.burnRate ?? 0, runway: state.runway ?? 0, ... }
      }, userId)
      await createAgentActivity(userId, 'felix', 'runway_warning',
        `Runway ${state.runway} months. Harper notified to review hiring plan.`)
    },
  },

  // ── Sales rules ────────────────────────────────────────────────────────────
  {
    name: 'stale_deals',
    schedule: 'daily',
    condition: (state) => state.staleDeals > 0,
    action: async (userId, state) => {
      // Susi generates follow-up sequences for each stale deal
      await triggerAgentWithGoal('susi', userId,
        `You have ${state.staleDeals} deals with no activity in 7+ days. Generate personalised follow-up sequences for each.`)
      await createAgentActivity(userId, 'susi', 'stale_deals',
        `${state.staleDeals} stale deals detected. Follow-up sequences being generated.`)
    },
  },

  {
    name: 'pipeline_thin',
    schedule: 'weekly',
    condition: (state) => (state.openDeals ?? 0) < 3 && state.icpLocked,
    action: async (userId, state) => {
      // Patel refreshes outreach sequence; Susi gets updated ICP context
      await triggerAgentWithGoal('patel', userId,
        'Pipeline is thin (fewer than 3 open deals). Refresh lead list with lead_enrich and build new outreach sequence.')
    },
  },

  // ── Competitive rules ──────────────────────────────────────────────────────
  {
    name: 'competitive_monitoring',
    schedule: 'weekly',
    condition: async (userId) => {
      const trackedCount = await getTrackedCompetitorCount(userId)
      return trackedCount > 0
    },
    action: async (userId) => {
      // Atlas re-runs web research on all tracked competitors
      await triggerAgentWithGoal('atlas', userId,
        'Run weekly competitive monitoring. Re-research all tracked competitors. Flag any pricing changes, funding, or significant hiring signals.')
    },
  },

  // ── Contradiction rules ────────────────────────────────────────────────────
  {
    name: 'contradiction_scan',
    schedule: 'on_artifact_created',   // fires on every artifact creation
    condition: async (userId) => {
      const artifactCount = await getArtifactCount(userId)
      return artifactCount >= 3        // need at least 3 to detect contradictions
    },
    action: async (userId) => {
      const state = await getStartupState(userId)
      const allArtifacts = await getAllArtifacts(userId)
      const contradictions = await detectContradictions(allArtifacts, state)

      if (contradictions.length > 0) {
        // Update world model
        await updateStartupState(userId, { openContradictions: contradictions })

        // Critical contradictions trigger Sage immediately
        const critical = contradictions.filter(c => c.severity === 'critical')
        if (critical.length > 0) {
          await triggerAgentWithGoal('sage', userId,
            `Critical contradiction detected: ${critical[0].description}. Resolve this before the founder's next investor conversation.`)
          await createAgentActivity(userId, 'sage', 'contradiction_detected',
            `Critical: ${critical[0].description}`)
          await sendNotification(userId, 'contradiction_critical', { contradiction: critical[0] })
        }
      }
    },
  },

  // ── Score milestone rules ──────────────────────────────────────────────────
  {
    name: 'score_milestone',
    schedule: 'on_score_update',
    condition: (_, data) => data.previousScore < 45 && data.newScore >= 45,
    action: async (userId) => {
      await sendEmail(userId, 'milestone_investor_marketplace', {})
      await createAgentActivity(userId, 'sage', 'score_milestone',
        'IQ Score crossed 45 — now visible to investors in the marketplace.')
    },
  },

  {
    name: 'series_a_ready',
    schedule: 'on_score_update',
    condition: (_, data) => data.previousScore < 70 && data.newScore >= 70,
    action: async (userId) => {
      await triggerAgentWithGoal('sage', userId,
        'Founder just crossed 70 IQ Score — Series A threshold. Generate a full investor readiness report.')
      await sendEmail(userId, 'milestone_series_a_threshold', {})
    },
  },

  // ── PMF rules ─────────────────────────────────────────────────────────────
  {
    name: 'pmf_signal_to_maya',
    schedule: 'on_artifact_created',
    condition: async (userId, event) => event.artifactType === 'pmf_survey',
    action: async (userId) => {
      const state = await getStartupState(userId)
      if (state.topCustomerPhrase) {
        // Nova tells Maya: customer language has updated, update your messaging
        await delegateTo('nova', 'maya', {
          type: 'pmf_signal_updated',
          fromAgent: 'nova', toAgent: 'maya',
          data: {
            topCustomerPhrases: [state.topCustomerPhrase],
            mainJobToBeDone: state.mainJobToBeDone ?? '',
            pmfScore: state.pmfScore ?? 0,
            messagingImplication: 'Update brand voice to reflect how customers actually describe the problem.',
            beforeAfterStory: { before: '', after: '' },
          }
        }, userId)
      }
    },
  },
]
```

---

## 5. How Each Agent Uses the Three Pieces

Every agent now operates in three phases on every turn:

**Phase 0 — Read world model (always)**
```typescript
const state = await getStartupState(userId)
const pendingDelegations = await getPendingDelegations(agentId, userId)
const myGoal = await getAgentGoal(agentId, userId)
```

**Phase 1 — Handle delegations first (if any)**
If another agent has given this agent a task, handle it before responding to the founder's message. A delegation from Felix to Harper (rebuild hiring plan with new budget) takes priority over a founder asking Harper about interview questions.

**Phase 2 — Normal conversation turn**
Gather real data with tools, reason, generate artifact if warranted, evaluate, refine.

**Phase 3 — Update world model (always, after generating)**
```typescript
await updateStartupState(userId, { /* whatever this agent learned */ })
```

---

## 6. Per-Agent Designs

### 6.1 Felix — CFO

**Goal:** Maintain healthy runway and financial visibility.

**World model reads:** `runway`, `burnRate`, `mrr`, `fundraisingGoal`, `targetRaiseDate`

**World model writes:** `mrr`, `runway`, `burnRate`, `lastStripeSync`, `fundraisingGoal`

**Delegation sends:**
- → Harper when headcount budget changes
- → Sage when runway drops below threshold

**Delegation receives:**
- ← Sage when investor readiness workflow is triggered

**Proactive triggers:**
- Daily: if `runway < 12`, evaluate goal → at_risk → alert
- Monthly: auto-sync Stripe if restricted key stored, update world model

**Tools in gather phase (concurrent):**
```
stripe_sync(restrictedKey)
db_query(table='qscore_history')
db_query(table='agent_artifacts', filters={agent_id:'felix'})
benchmark_lookup(metric='burn_multiple', sector, stage)
benchmark_lookup(metric='ltv_cac', sector, stage)
benchmark_lookup(metric='gross_margin', sector, stage)
```

**What changes from today:** Felix does not wait for the founder to ask for a financial summary. When Stripe data changes, Felix updates the world model immediately. When the world model shows runway dropped below 12 months, Felix triggers Harper's delegation before the founder opens the app.

---

### 6.2 Patel — CMO

**Goal:** Lock ICP and build repeatable outreach pipeline.

**World model reads:** `pmfScore`, `topCustomerPhrase`, `targetSegment`, `openDeals`

**World model writes:** `icpLocked`, `targetSegment`, `primaryChannel`, `positioningStatement`

**Delegation sends:**
- → Susi when ICP is updated or locked (updated qualification criteria)
- → Maya when positioning statement changes

**Delegation receives:**
- ← Atlas when competitive landscape changes
- ← Nova when PMF signal updates (top customer phrases changed)

**Proactive triggers:**
- Weekly: if `openDeals < 3 and icpLocked`, trigger lead refresh
- On Atlas artifact creation: re-evaluate positioning against new competitive data

**Tools in gather phase (concurrent):**
```
web_research(query, intent='competitor_intel')
web_research(query, intent='market_size')
web_research(query, intent='pricing')
lead_enrich(criteria, targetTitles)
db_query(table='agent_artifacts', filters={agent_id:'atlas'})
benchmark_lookup(metric='sales_cycle', sector, stage)
```

---

### 6.3 Atlas — Chief Strategy Officer

**Goal:** Maintain current competitive intelligence (< 14 days old).

**World model reads:** `positioningStatement`, `targetSegment`, `stage`

**World model writes:** Nothing directly — Atlas's competitive matrix is the source

**Delegation sends:**
- → Patel when competitive landscape shifts meaningfully

**Proactive triggers:**
- Weekly: re-research all tracked competitors
- On significant signal (funding, pricing change): immediate alert + Patel delegation

**Tools in gather phase (concurrent):**
```
web_research(query, intent='competitor_intel')      × per tracked competitor
web_research(query, intent='pricing')
web_research(query, intent='reviews')
web_research(query, intent='hiring')
web_research(query, intent='news')
```

---

### 6.4 Sage — CEO Advisor

**Goal:** Keep startup strategy coherent and investor-ready.

**World model reads:** Everything — Sage is the only agent with full read access.

**World model writes:** `currentGoal`, `biggestRisk`, `openContradictions`, `investorReadinessScore`

**Delegation sends:**
- → Any agent when a contradiction requires resolution
- → All agents when investor readiness workflow is triggered

**Special capability:** Sage is the only agent that can trigger other agents via `delegateTo()`. All other inter-agent coordination goes through Sage or is direct (Felix → Harper).

**Contradiction detection:** Runs every time any artifact is created (via proactive engine). If critical contradiction detected, Sage acts before the founder asks.

**What changes from today:** Contradiction detection is not a button the founder clicks. It runs automatically on every artifact creation. Sage holds the most important job: ensuring the platform's collective intelligence is coherent, not contradictory.

---

### 6.5 Nova — CPO

**Goal:** Maintain PMF signal above 40%.

**World model reads:** `stage`, `targetSegment`, `icpLocked`

**World model writes:** `pmfScore`, `topCustomerPhrase`, `mainJobToBeDone`

**Delegation sends:**
- → Maya when PMF signal updates (customer language changed)

**What changes from today:** When Nova analyses survey results, it updates the world model immediately. Maya is delegated to refresh brand messaging. The platform updates its understanding of what customers actually say — and that flows into messaging automatically.

---

### 6.6 Harper — Chief People Officer

**Goal:** Keep hiring plan aligned with financial constraints.

**World model reads:** `burnRate`, `runway`, `fundraisingGoal`, `icpLocked`, `targetSegment`

**World model writes:** Nothing directly — reads budget from Felix's world model writes

**Delegation receives:**
- ← Felix when headcount budget changes (most important delegation in the system)

**What changes from today:** Harper does not operate in isolation. When Felix's financial reality changes, Harper's hiring plan must change automatically. The delegation from Felix → Harper is the primary mechanism for keeping the hiring plan financially grounded without the founder mediating.

---

### 6.7 Maya — Brand Director

**Goal:** Keep brand messaging aligned with latest PMF signal.

**World model reads:** `topCustomerPhrase`, `mainJobToBeDone`, `positioningStatement`

**World model writes:** Nothing directly

**Delegation receives:**
- ← Nova when PMF signal updates
- ← Patel when positioning statement changes

**What changes from today:** Maya's messaging is no longer static. When Nova finds that customers describe the problem differently, Maya updates messaging automatically. The voice guide evolves with real customer language — not just the founder's initial framing.

---

### 6.8 Susi — CRO

**Goal:** Keep pipeline active and deals progressing.

**World model reads:** `icpLocked`, `targetSegment`, `primaryChannel`, `openDeals`, `staleDeals`

**World model writes:** `openDeals`, `pipelineValue`, `avgSalesCycleDays`, `staleDeals`

**Delegation receives:**
- ← Patel when ICP is updated (qualification criteria change)

**Proactive triggers:**
- Daily: check for stale deals, generate follow-up sequences automatically
- On Patel ICP update: re-qualify open deals against new criteria

---

### 6.9 Leo — General Counsel

**Goal:** Keep legal checklist current for current stage.

**World model reads:** `stage`, `sector`, `track`, `fundraisingGoal`

**World model writes:** Nothing directly

**No delegations.** Leo is the most autonomous agent — its work is primarily triggered by stage changes and founder requests. It does not coordinate with other agents because legal advice should not be automated cross-agent without explicit founder review.

---

## 7. The Investor Readiness Workflow (Full Coordination)

Triggered when: founder asks, or Sage detects `investorReadinessScore` meets threshold.

```
SAGE starts coordinator role
       │
       ├── PHASE 1: PARALLEL (no dependencies — all fire at once)
       │     ├── Atlas:  re-research competitors (fresh web data)
       │     ├── Felix:  sync Stripe + rebuild financial model
       │     └── Nova:   recompute PMF score from latest survey responses
       │
       ├── PHASE 2: DELEGATION CHAIN (depends on Phase 1 completing)
       │     ├── Felix → Harper: updated headcount budget (if changed)
       │     └── Atlas → Patel: updated competitive gaps (if changed)
       │
       ├── PHASE 3: CONTRADICTION SCAN (Sage, depends on Phase 2)
       │     └── Sage runs detectContradictions() across all updated artifacts
       │         → Auto-resolves low-severity contradictions
       │         → Flags critical contradictions for founder
       │
       ├── PHASE 4: WORLD MODEL UPDATE
       │     └── Sage updates: investorReadinessScore, biggestRisk, currentGoal
       │
       └── PHASE 5: SYNTHESIS
             └── Sage generates Investor Readiness Report:
                 { executiveSummary, iqScore, keyStrengths,
                   openQuestions, vcLikelyQuestions[],
                   90DayReadinessPlan, contradictionsResolved[] }
```

The founder gets one coherent output. Six agents ran in the background.

---

## 8. What the Founder Experiences

**Before this architecture (today):**
- Founder opens Patel. Types "build me an ICP."
- Patel writes an ICP from the founder's chat history.
- Founder opens Felix. Types "what's my financial status."
- Felix writes a summary from the IQ Score data.
- Founder asks Sage to check for contradictions.
- Sage finds that the hiring plan conflicts with the financial model.

**After this architecture:**
- Founder opens the app after 4 days away.
- Activity feed: "Felix noticed runway dropped to 9 months after Stripe sync. Harper automatically rebuilt the hiring plan with a reduced budget — 2 Q2 roles deprioritised. Sage ran a contradiction scan — no new conflicts. Your investor readiness score is 71."
- Founder didn't ask for any of this.

That is the difference between a tool that responds and a platform that works.

---

## 9. Database Schema Additions Required

| Table | New Columns | Purpose |
|-------|------------|---------|
| `startup_state` | New table — one row per founder | Shared world model |
| `agent_goals` | New table — one row per agent per founder | Persistent goal tracking |
| `delegation_tasks` | New table | Async agent-to-agent task queue |
| `agent_artifacts` | `embedding_vector float[]` | Semantic similarity for context retrieval |
| `founder_profiles` | `proactive_enabled boolean` | Founder opt-in for autonomous agent actions |

---

## 10. Implementation Order

### Phase A — Foundation (Weeks 1–2)
1. Create `startup_state` table + `getStartupState()` / `updateStartupState()`
2. Wire all 9 agents to read from startup state at turn start
3. Wire Felix and Susi to write to startup state after artifact creation
4. Deploy and verify state is consistent across agents

### Phase B — Goals (Week 3)
1. Create `agent_goals` table
2. Implement `DEFAULT_GOALS` for all 9 agents
3. Run goal evaluation daily via cron
4. Surface goal status on founder dashboard ("Agent Health" panel)

### Phase C — Delegation (Weeks 4–5)
1. Create `delegation_tasks` table
2. Implement `delegateTo()` and `getPendingDelegations()`
3. Wire Felix → Harper delegation (most impactful — financial constraint changes)
4. Wire Atlas → Patel delegation (competitive landscape changes)
5. Wire Nova → Maya delegation (PMF signal updates)

### Phase D — Proactive Engine (Week 6)
1. Implement full `PROACTIVE_RULES` array
2. Connect to startup state change events (not just cron)
3. Wire contradiction scan to every artifact creation
4. Test: simulate runway drop → verify Harper gets delegation without founder asking

### Phase E — Semantic Memory (Week 7)
1. Add `embedding_vector` column to `agent_artifacts`
2. Generate embeddings on artifact creation
3. Replace recency-based context loading with cosine similarity retrieval
4. Verify context quality improves for long-term users (3+ months of artifacts)

---

## 11. The Three Things That Make It Truly Agentic

Everything else in this document serves these three:

**1. Shared world model** — agents have a live, consistent picture of the startup. Not disconnected files. One truth.

**2. Persistent goals** — agents have an objective that survives between sessions. The platform knows what it's trying to achieve on the founder's behalf.

**3. Real async delegation** — agents give each other real tasks with typed payloads, wait for completion, and build on the results. Not text injection. Actual coordination.

Without these three, adding more tools and better prompts produces better documents. With these three, the platform begins to act on behalf of the founder — which is what "agentic" actually means.
