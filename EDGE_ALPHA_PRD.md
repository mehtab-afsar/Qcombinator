# Edge Alpha — Product & Engineering Specification (Final)

*The canonical build document. Supersedes all earlier drafts. Combines the PRD (what and why) with the technical design (how). Written against a direct read of the codebase at git `664f7a7`, and reconciled with both review passes (Mo's spec + Roman's EAOS constitution).*

| | |
|---|---|
| **Status** | Build-ready. No blocking decisions — the two prior open questions are resolved (§14). |
| **Owners** | Product + CTO |
| **Audience** | Founder, engineering |
| **Companion files** | `Edge_Alpha_Agentic_OS_Template.xlsx` — the **design & seeding source** for the Registry (not a live runtime registry) |

### How this document is organized
Why → what → how → when. §1–3 make the case. §4–5 are the product. §6–10 are the engineering. §11–13 are the plan and guardrails. An engineer starting Monday reads §6–§12 and begins.

### What changed in this edition (read once, then move on)
1. **Repositioned: Edge Alpha is a *Founder Operating System*.** The "investor-trusted Q-Score is the asset" thesis is **removed from the core**. Investor marketplace, Evidence Packs, and the investor-facing score thesis are **deferred**, not part of the current justification.
2. **No automatic outcome→Q-Score updates.** The Q-Score is updated **separately**, from Company Builder artefacts. Outcomes are *evidence for later reassessment*, never an automatic score change. The dedicated Outcome Loop (`lib/outcomes/`, `POST /api/outcomes`, score mapping) is **out of Phase 1**.
3. **Asset Review is removed everywhere.** Asset maintenance happens *inside* Program execution — not as a separate stage, prompt, route, or requirement.
4. **The Operating Rhythm runs *all contract-active* Programs every cycle.** No `runsWhen` / event-aware skipping in v1 (that's a later cost optimisation).
5. **Contracts are immutable.** A new Strategy Session or Executive Contract starts a **new operating epoch** — it never edits in place and never deletes history.
6. **Assets are visible and editable by the Founder.** A saved edit creates a new immutable current version, used immediately. No approval, no gate.
7. **Prompt nomenclature is fixed:** *Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context.* ("Standard + Knowledge Base + Specific" is retired.)
8. **The runtime is generic from day one** — built for the full Registry of Executives/Programs/Assets/Actions. **P001 GTM is the first end-to-end proof case, not a special case.**
9. **The CEO is not a separate architectural layer** — it may own S001/S002 prompts, but mandate generation runs through the same Prompt Composer and Execution Engine.
10. **Kept:** just-in-time approval for irreversible external Actions at the Connector boundary; the strangler migration; generic routes; immutable Asset versioning; idempotent cycles; connector abstraction; runtime validation; RLS; audit logging; the engineering guardrails.

---

## 1. TL;DR

Edge Alpha is an **autonomous Founder Operating System**. The founder sets direction once — a **Strategy Session (S001)** producing an **Executive Contract (S002)**. From that mandate, an AI executive team runs **autonomously on a weekly rhythm**: maintaining the company's knowledge as **versioned Management Assets**, applying judgement through **Programs**, publishing **Executive Briefings**, and executing **Actions** through the founder's real tools via **Connectors**. The founder stays in command by issuing a new mandate (a new epoch) — not by approving each cycle. The only human checkpoint is **just-in-time approval on irreversible external Actions**.

The Q-Score is a **separate diagnostic**, updated from Company Builder artefacts. Creating an Asset never raises it.

Engineering-wise this is mostly refactoring. ~two-thirds of the machinery exists but is wired to the wrong shape (11 personas, ~170 near-duplicate routes). We replace that with a code-based **Registry** and build **three products**: the **Prompt Composer**, **Asset Persistence & Versioning**, and the **Operating Rhythm**. Plus the **Connector layer**. We build the runtime generically and prove it end-to-end on **P001 GTM**.

---

## 2. Problem, goals, non-goals

### Problem
Three things are broken. **(1) The system reasons from accumulated chat history**, which drifts, contradicts itself and goes stale — the classic AI trust failure. **(2) Capability is added by cloning per-agent routes** (~170 near-duplicates), so the codebase can't scale along the axis it's growing on. **(3) The Q-Score rises when an adviser produces a document** — a document is not proof the business improved. *(Mechanism, verified: `ARTIFACT_BOOST` + `applyAgentScoreSignal()` in `features/qscore/services/agent-signal.ts`, called from 4 routes under `app/api/agents/**`. The `qscoreBoosts` field in `lib/edgealpha.config.ts` is derived display data only — read by `lib/cxo/cxo-config.ts` — not the mechanism.)*

### Goals (this release)
1. Turn a Strategy Session into a confirmed **Executive Contract** that activates Programs — the founder's mandate.
2. Run the activated Programs **autonomously on a weekly Operating Rhythm**, maintaining **versioned Management Assets** as part of execution, and publishing **Executive Briefings**.
3. Make Assets **visible and directly editable** by the founder, with every edit creating a new immutable version.
4. Execute **Actions through real tools via Connectors**, with just-in-time approval on irreversible ones.
5. Replace the 11-persona / ~170-route model with a **code-based Registry** and a **generic runtime**, proven on P001 GTM.
6. **Decouple the Q-Score** from Asset creation.

### Non-goals (explicit; say no to these)
- **Unattended irreversible actions.** Send / publish / spend / change-price always take one just-in-time founder approval at the Connector boundary.
- **Automatic outcome→Q-Score updates.** Outcomes are evidence for reassessment, not a score trigger. The dedicated Outcome Loop is deferred.
- **Evidence Packs** — deferred; a later reporting feature derived from Assets, Briefings, Actions and results.
- **Investor marketplace / investor-trusted-score thesis** — deferred. This product is the Founder Operating System.
- **A separate Asset Review** — removed everywhere.
- **Event-aware Program skipping (`runsWhen`)** — v1 runs all contract-active Programs; optimise later.
- **A GTM-specific architecture** — build generic; GTM is only the first proof case.
- **A new job/queue engine** — extend `scheduled_actions` + Vercel Cron.
- **Collapsing the agent UI** before the Registry lands.

### Success metrics
- One founder completes: Strategy → confirmed Contract → Programs active → **rhythm cycle runs** → **versioned Assets created and measurably improved across ≥2 cycles** → **Briefing published** → (Story 3) **one Action executed through a Connector with approval**.
- **Mandate integrity:** no Program runs outside the current Contract; no irreversible Action executes without approval (unit-tested).
- **Asset integrity:** never overwritten; exactly one current version; founder edits create new versions; provenance complete.
- **Rhythm integrity:** the same cycle never runs twice.
- **Q-Score integrity:** creating an Asset never moves the score.
- **Week-4 retention** on the pilot cohort — the metric that decides whether we widen.

---

## 3. Strategy — the honest case

**The category is real and crowded.** "AI executives that run your company" is a funded, contested space — Cofounder.co ships six executing specialists across twelve verticals; Mastercard is rolling out a virtual CFO; OpenCFO raised institutionally. **"AI executives that generate deliverables" is table stakes.** Position there and we lose a breadth war to better-funded incumbents.

**The real risk isn't competition — it's retention.** Median gross revenue retention for AI-native products is ~40% (vs ~63% for B2B SaaS). If a product isn't clearly better than ChatGPT/Claude, founders try it and cancel in the first cycle. So the product must deliver something a chat window structurally cannot.

**What's actually different here — and it's not the agents.** Three things, and they compound:
1. **Persistent, versioned company memory.** Most AI products carry a conversation forward; over time it drifts and contradicts itself. Edge Alpha reasons from **today's validated Assets**, not last month's chat. That's a real, felt reliability difference.
2. **An operating rhythm, not a request queue.** The system runs *every week without being asked*, and reports through Briefings. It embeds in the founder's operating cadence rather than waiting for prompts.
3. **Real execution through Connectors.** It doesn't recommend the email — it sends it (with permission). Memo vs. action.

**The honest moat position.** The defensibility is the **compounding company memory + the weekly rhythm embedded in how the founder runs the business + real execution**. It's earned over cycles, not declared. The investor-side loop and an outcome-validated score may become a moat *later* — they are explicitly **not** the current justification, and nothing in Phase 1 depends on them.

**What a YC partner would push on.** *Boiling the ocean* → build the runtime generically but prove **one Program (P001 GTM)** end-to-end before widening. *Prove they come back* → week-4 retention is a named metric. *Founders want five verbs, not 29 programs* → one front door; hide the machinery.

**One sentence.** Be the operating system a founder actually runs their company on — persistent memory, weekly executive rhythm, real execution under a mandate they set — and earn everything else from there.

---

## 4. The product

### Users
- **Founder** — sets direction (Strategy + Contract), reads Executive Briefings, opens and edits Assets, approves irreversible Actions, redirects by issuing a new mandate.
- **AI Executive Team** — maintains Assets, applies judgement through Programs, produces Briefings, generates Actions.
- **Admin** — manages the Registry, prompts, scoring, billing.

### The core loop: Score → Mandate → Operate

```
 Founder
   │
   ▼
 SCORE      Q-Score (separate diagnostic) — updated from Company Builder
   │        artefacts. Informs the mandate; never moved by Asset creation.
   ▼
 MANDATE    Strategy Session (S001) → Executive Contract (S002)
   │        priorities · success metrics · executive responsibilities ·
   │        which Programs are active.  Founder confirms — once.
   │        (Contracts are immutable. A new Strategy/Contract =
   │         a NEW OPERATING EPOCH; all history is preserved.)
   ▼
 OPERATE    Weekly Operating Rhythm runs ALL contract-active Programs:
   │        ├─ apply PROGRAM judgement   (executive domain logic)
   │        ├─ update versioned ASSETS   (maintenance happens *inside*
   │        │                             execution — no Asset Review)
   │        ├─ publish EXECUTIVE BRIEFING (the founder-facing output)
   │        └─ generate ACTIONS
   │             reversible / internal      → run autonomously
   │             irreversible external      → just-in-time approval
   │                                          at the CONNECTOR boundary
   │
   │   Founder may open and EDIT any Asset at any time
   │   → creates a new immutable current version, used immediately.
   └───────────────────────────────► next cycle
```

### The operating model (settled)

| Layer | Rule |
|---|---|
| **Knowledge** (Assets: versioned company memory) | Maintained automatically inside Program execution. No approval. **Founder-visible and directly editable**; an edit creates a new immutable current version, used immediately. |
| **Reasoning** (Programs: judgement, Briefings) | Runs automatically every cycle for all contract-active Programs. No approval. |
| **Internal / reversible Actions** (draft, prepare, analyse) | Run autonomously. No approval. |
| **Irreversible external Actions** (send / publish / spend / change price) | **Just-in-time founder approval at the Connector boundary** — after the payload is prepared, before it executes. This does not violate "no approval gates," which applies to Programs. |
| **Q-Score** | A **separate diagnostic**, updated from Company Builder artefacts. Asset creation never raises it. Outcomes are evidence for later reassessment, not an automatic trigger. |
| **Direction** | Set via the mandate. Contracts are **immutable**; any change (priority, success metric, an executive's mandate, pausing a Program, new direction) creates a **new current version = a new operating epoch**. History is preserved. No per-cycle approval, no waiting state. |

---

## 5. User stories with acceptance criteria

The three stories are also the build sequence (§12).

**S1 — Generate Strategy and Executive Contract.** *As a Founder, I define the company strategy and receive an Executive Contract so Edge Alpha operates within a clear mandate.*
**Accept:** `POST /api/strategy` writes one current `strategy_sessions`. `POST /api/contracts` generates a draft Contract (priorities, goals, success metrics, executive responsibilities, active Programs) via the Prompt Composer; the founder confirms; the referenced Programs become `active`. Success state: exactly one current Strategy, one current Contract, defined Programs and responsibilities. Rendered on `/founder/executive`.

**S1b — Redirect by issuing a new epoch.** *As a Founder, I can change priorities, a success metric, an executive's mandate, or pause a Program.*
**Accept:** the change produces a **new current Contract version** (previous marked `superseded`, retained). The next rhythm cycle uses it. No approval gate, no waiting state, no history deleted.

**S2 — Run a Program and build Management Assets.** *As a Founder, I want Edge Alpha to run an Executive Program over several cycles so my Assets become progressively more complete and accurate.*
**Accept:** each Operating Rhythm cycle runs all contract-active Programs; each reviews current company information + current Assets, and creates/updates the affected Assets as **new versions**. A Briefing is published per Program run. The founder can see the active Program, current Assets, previous versions, how Assets improved across cycles, and each cycle's Briefing. **No Actions are created in this story; no external execution occurs.**

**S2b — Assets are visible and editable.** *As a Founder, I can open, inspect and amend any Asset.*
**Accept:** every saved amendment creates a **new immutable current version** (previous retained, authorship recorded as `founder`), used immediately by relevant Programs and Actions. No approval, no gate. Briefings point to material changes but never replace Asset access.

**S3 — Generate and execute Actions through Connectors.** *As a Founder, I want Program outputs converted into executable Actions delivered through the relevant external systems.*
**Accept:** a Program generates Actions; each is assigned to a Connector; the founder can see the prepared Action, its payload, the target system, execution status, delivery result, and any failure/retry. **Irreversible Actions require just-in-time approval at the Connector boundary**; nothing external executes without it. Every attempt is written to `action_log`.

---

## 6. System architecture

### 6.1 Current state (verified, not inherited)
Next.js 16 (App Router, RSC) · TypeScript strict · Supabase Postgres (no ORM) · Vercel · **Anthropic** via `lib/llm/router.ts` (single-vendor; see Architecture.md §5) · Stripe · Resend · Upstash Redis (rate-limit only) · Sentry + PostHog. No message queue; 5 Vercel Cron jobs + a DB-row job pattern.

Measured facts: chat route `app/api/agents/chat/route.ts` = **1,039 lines**. Monolith pages: profile-builder **3,100**, dashboard **1,905**, settings **1,472**. **275** API routes, ~170 per-agent. CI runs `npm run build` then serves E2E against `npm run dev`. Node pinned to 18; advisory CI phases non-blocking. **No billing integration test** (verified gap). A partial system-prompt assembler exists (`lib/agents/compose-system-prompt.ts`); 13 per-persona prompt files and ~26 per-agent route folders remain.

### 6.2 Target layers
```
┌──────────────────────────────────────────────────────────────┐
│ INTERFACE   Founder UI (thin) · one front door ("Morgan")      │
├──────────────────────────────────────────────────────────────┤
│ REGISTRY    Executives → Programs → Assets → Actions (in code) │  NEW
│             (authoritative runtime; Excel = design/seed source)│
├──────────────────────────────────────────────────────────────┤
│ PRODUCT 1   Prompt Composer  (Exec System Prompt + Program     │  NEW
│             Prompt + Asset/Action Instructions + Company Ctx)  │
├──────────────────────────────────────────────────────────────┤
│ MANDATE     Strategy Session (S001) + Executive Contract (S002)│  NEW
│             immutable · new version = new operating epoch      │
├──────────────────────────────────────────────────────────────┤
│ PRODUCT 3   Operating-Rhythm engine (weekly, idempotent):      │  NEW
│             run ALL contract-active Programs → version Assets  │
│             → Briefings → Actions.   (No Asset Review.)        │
├──────────────────────────────────────────────────────────────┤
│ PRODUCT 2   Asset Persistence & Versioning (immutable,         │  NEW
│             provenance, founder-editable)                      │
├──────────────────────────────────────────────────────────────┤
│ CONNECTORS  Shared adapters + credential vault + just-in-time  │  NEW
│             approval on irreversible + audit                   │
├──────────────────────────────────────────────────────────────┤
│ EXECUTION   Program Runtime (task-graph) · Action Executor ·   │  REUSE
│             Tool Executor · Scheduler · delegation             │
├──────────────────────────────────────────────────────────────┤
│ DIAGNOSTIC  Q-Score (separate; fed by Company Builder artefacts)│ REUSE
├──────────────────────────────────────────────────────────────┤
│ DATA        Supabase Postgres (RLS) · secrets vault            │
└──────────────────────────────────────────────────────────────┘
```

### 6.3 What stays / what's scrapped
| | Component | Decision |
|---|---|---|
| Keep, untouched | Q-Score (`features/qscore`, `lib/qscore`); LLM router (`lib/llm`); memory; RLS | Reuse |
| Keep, reuse as engine | `task-graph.ts`, `delegation.ts`, `orchestrator.ts`, `lib/actions/executor.ts`, `lib/tools/executor.ts`, `scheduled_actions`, `agent_artifacts` | Reuse |
| Rewrite | `lib/edgealpha.config.ts` → code Registry (`lib/registry/**`), seeded from the template workbook | Config-driven |
| Scrap (strangle, don't delete day one) | 11 personas + prompts (`features/agents/{persona}`), ~170 per-agent routes, the 11-agent `cxo` UI | Replace |
| New | Prompt Composer · Mandate (Strategy + Contract) · Operating-Rhythm engine · Asset Versioning · Connector layer | Build |

*(Salvage note: `features/agents/{persona}/components/*Renderer.tsx` are reusable UI — keep and reuse them; scrap the persona prompts/routes.)*

---

## 7. The framework — the Registry and the three Products

### 7.1 The Registry (authoritative, in code)
Executives, Program templates, Asset and Action definitions live in **TypeScript** — versioned, auditable, and the **authoritative runtime source**. The **Excel workbook is the design and seeding source**, not a second live registry. The database holds only per-founder **instances**.

**The runtime is generic from day one** — it must support the full Registry of Executives/Programs/Assets/Actions. P001 GTM is simply the first entry proven end-to-end.

```ts
// lib/registry/types.ts
type ExecutiveId = 'ceo' | 'growth' | 'product' | 'operations' | 'finance';

interface Executive {
  id: ExecutiveId; name: string; motto: string;
  domains: string[];
  programs: ProgramId[];
  systemPromptRef: string;       // 'S003' — the Executive System Prompt
  inheritsFrom: string[];        // current agent ids folded in as specialists
}
interface ProgramTemplate {
  id: ProgramId;                 // 'P001'
  handle: string;                // 'GTM'
  name: string;
  owner: ExecutiveId;
  objective: string;
  successMetric: string;
  assets: AssetId[];
  actions: ActionId[];
  programPromptRef: string;      // the Program Prompt
}
interface AssetDef  { id: AssetId; name: string; program: ProgramId; outputSchema: 'markdown'|'json'; instructionsRef: string; }
interface ActionDef { id: ActionId; kind: 'oneoff'|'recurring'; irreversible: boolean; connector?: ConnectorId; instructionsRef: string; }
```
Adding a capability = adding a Registry entry. No route, no persona.

**Executive roster** (11 agents → 5 executives; sub-personas become specialists called via the existing `delegation.ts`):

| Executive | Owns | Folds in |
|---|---|---|
| CEO / Chief of Staff | S001 Strategy, S002 Executive Contract, Q-Score interpretation, Quarterly Planning | `sage` |
| **Growth** (first proof) | P001 GTM, P002 Brand, P003 Demand, P004 Guide, P005 Acquire, P006 Success, P007 Pricing, P008 Intel | `patel`, `susi`, `maya`, `atlas`, `riley`, `carter` |
| Product | P015–P022 | `nova` |
| Operations | P009–P014 | `harper` |
| Finance | P023–P029 | `felix`, `leo` |

**The CEO is not a separate architectural layer.** It owns the S001/S002 prompts, but mandate generation runs through the same Prompt Composer and Execution Engine as every other Program.

### 7.2 Product 1 — Prompt Composer
Separates prompt *content* from prompt *execution*. Every execution package is assembled, in a fixed deterministic order, from four layers:

```
Executive System Prompt     = executive knowledge and operating principles
+ Program Prompt            = program objective, scope and execution rules
+ Asset / Action Instructions = specific generation or execution instructions
+ Company Context           = Strategy, Contract, Q-Score, current Assets, new information
```

**The Composer must:** resolve Registry entries from IDs · load the latest approved prompt versions · load the correct company-specific context · assemble in fixed deterministic order · preserve instruction hierarchy (lower layers never override higher) · remove duplicate context · exclude irrelevant Assets · prioritise current and authoritative information · respect model context limits · preserve source references for every component · emit one structured execution package. **Same assembly logic for all Executives and Programs.**

**Validation before release:** instruction hierarchy preserved · lower-level instructions don't override higher rules · Program prompt compatible with the Executive prompt · Asset/Action instructions match the requested execution · no unresolved contradictory mandatory instructions · the prompt requests no capability outside the Executive Contract · no prohibited actions.
**Outcomes:** *Valid* → release. *Invalid* → block execution + runtime error identifying `executionId`, failed rule, missing/conflicting component, affected Executive/Program/Asset/Action, timestamp.
*Example:* executing **P001** with the CTO system prompt (**S004**) is invalid — the Registry defines P001 under the **Growth** executive, whose Executive System Prompt is **S003**. *(Workbook IDs like "A003 Patel" are design-source nomenclature; the runtime Registry uses `ExecutiveId` — see §7.1.)*

### 7.3 Product 2 — Asset Persistence & Versioning
The company's permanent memory. **Why it matters:** the system reasons from *today's facts*, not last month's conversation — designing out the drift that erodes trust in chat-based AI.

**The system must:** store every Asset as a company-specific object, identified by Registry ID · preserve one current version and all previous · create a new version whenever a Program **or the founder** updates an Asset · never overwrite or delete · link every version to the execution (or founder edit) that created it · record source references, update reason, timestamp, and the responsible Executive/Program · make the current version immediately available to the Composer · allow retrieval of previous versions · prevent cross-company access (RLS) · maintain a complete audit history · validate output against the Asset definition before persistence · reject invalid/incomplete outputs with a runtime error · update the current-version pointer only after successful validation and storage.

**Versioning rules:** unique sequential version numbers · link to previous version · no duplicate versions from the same execution · immutable history · exactly one current · restoration creates a *new* current version (retaining original source/execution references).

**Founder editing (S2b):** Assets are living pages. The founder can open, inspect and amend any Asset. A saved edit **creates a new immutable current version**, authored `founder`, used immediately by relevant Programs and Actions. No approval, no gate.

*Example invalid persistence:* storing a **P003 Demand Generation** output as a version of **AS001 ICP Profiles** — the Registry defines AS001 under **P001 GTM**. Blocked.

### 7.4 Product 3 — Operating Rhythm
The recurring execution cycle. **It does not decide what should run — it executes the contract-active system every cycle.** **There is no Asset Review**; asset maintenance happens inside Program execution.

```
trigger (Vercel Cron, weekly)
  → create ONE operating_rhythm_run   (idempotent: unique per company per cycle)
  → load current Registry · Strategy · Executive Contract · Q-Score · current Asset versions
  → for EACH contract-active Program:
        Program judgement (Composer + Execution Engine)
          → create/update affected Assets as NEW VERSIONS
          → publish Executive Briefing
          → create/update Actions (reversible run; irreversible → pending_approval)
  → persist all outputs · update Company Operating State · record every stage's status
  → preserve execution order · run independent executions in parallel where dependencies allow
  → block dependents when a required stage fails · retry technical operations within limits
  → prevent cross-company access · preserve a complete audit history of each cycle
```
*Example invalid run:* starting the weekly cycle for `COMP-001` when that company/week already completed — it would duplicate Program runs, Asset versions, Briefings and Actions. Blocked.

### 7.5 Connectors
A shared, standard adapter — built once — rather than per-executive hand-wired integrations.

```
Program creates Action
  → payload prepared
  → approval required ONLY if irreversible   (just-in-time, at the Connector boundary)
  → Connector executes                        (POST /connectors/gmail/send, /crm/records …)
  → audit: attempt + result → action_log
```
**Rules:** OAuth only, least-privilege scopes; tokens by reference (`token_ref`) never plaintext; hard approval on irreversible acts; every action logged immutably; build narrow — email first, then CRM/calendar/analytics. Prefer MCP-client adapters. Do **not** build commodity plumbing (LLC, domain, bank).

### 7.6 The Q-Score (separate diagnostic)
The Q-Score is **not** part of the execution loop. It is updated from **Company Builder artefacts** (uploaded evidence documents) — the things that *prove* what is true. Management Assets are a **secondary layer** that helps the OS identify what changed, locate supporting artefacts, understand strategic context, and determine which indicators may need reassessment.

**Direction of influence:**
`Company artefacts → Q-Score update → Programs interpret the result → Assets updated → Actions executed → new artefacts → Q-Score updates again.`
**Never:** `Asset created → Q-Score rises.`

Outcomes of executed work are **evidence for future reassessment** — they do not automatically call `applyAgentScoreSignal()`. (The dedicated Outcome Loop is deferred; see §12.)

---

## 8. Data model

```sql
-- S001: the founder's direction. Versioned.
create table strategy_sessions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  version int not null default 1, is_current boolean not null default true,
  mission text, priorities jsonb default '[]', goals jsonb default '[]',
  created_at timestamptz not null default now()
);

-- S002: the mandate. IMMUTABLE once confirmed; a change creates a new version = new epoch.
create table executive_contracts (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  strategy_id uuid not null references strategy_sessions(id),
  epoch int not null default 1,                -- increments on each new mandate
  version int not null default 1, is_current boolean not null default true,
  status text not null default 'draft' check (status in ('draft','confirmed','superseded')),
  priorities jsonb, success_metrics jsonb, responsibilities jsonb, active_programs jsonb,
  previous_contract_id uuid references executive_contracts(id),
  confirmed_at timestamptz, created_at timestamptz not null default now()
);

-- Program instances activated by the current contract.
create table programs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references executive_contracts(id) on delete cascade,
  template_id text not null, owner text not null,
  objective text not null, success_metric text not null,
  status text not null default 'active' check (status in ('active','paused','complete')),
  created_at timestamptz not null default now()
);

-- Product 2: versioned company memory. Never overwritten.
create table asset_versions (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  asset_id text not null,                      -- 'AS001' from the Registry
  program_id uuid references programs(id),
  execution_id uuid,                            -- rhythm/program run (null for founder edits)
  version int not null, is_current boolean not null default true,
  content jsonb not null, registry_version text,
  executive_id text,
  authored_by text not null default 'program' check (authored_by in ('program','founder')),
  previous_version_id uuid references asset_versions(id),
  source_refs jsonb default '[]', update_reason text,
  created_at timestamptz not null default now()
);

-- The founder-facing output of each Program run.
create table executive_briefings (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  program_id uuid references programs(id), execution_id uuid,
  verdict text, body jsonb, created_at timestamptz not null default now()
);

-- Product 3: one cycle per company. Idempotent.
create table operating_rhythm_runs (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  contract_id uuid references executive_contracts(id),
  cycle_key text not null,                      -- 'COMP-001:2026-W28'
  status text not null default 'running' check (status in ('running','completed','failed')),
  stages jsonb default '{}',
  started_at timestamptz not null default now(), completed_at timestamptz,
  unique (founder_id, cycle_key)
);

-- Authorized connector connections (credential vault).
-- NOTE: named connector_connections, not `connections` — `app/api/connections` and the
-- founder->investor intro flow already own that namespace in the live product.
create table connector_connections (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  provider text not null,
  status text not null default 'active' check (status in ('active','revoked','expired')),
  scopes jsonb default '[]', token_ref text,   -- pointer to encrypted secret, never plaintext
  connected_at timestamptz not null default now()
);

-- Immutable audit of every Action attempt + result.
create table action_log (
  id uuid primary key default gen_random_uuid(),
  founder_id uuid not null references founder_profiles(user_id) on delete cascade,
  program_id uuid references programs(id),
  action_id text not null, provider text,
  status text not null check (status in ('pending_approval','executed','failed','declined')),
  approved_by text, request jsonb, result jsonb,
  created_at timestamptz not null default now()
);

alter table agent_artifacts   add column program_id uuid references programs(id);
alter table scheduled_actions add column program_id uuid references programs(id);
alter table scheduled_actions add column cadence     text;
alter table scheduled_actions add column next_run_at timestamptz;
```
All new tables: RLS mirroring existing tables (founder reads own rows; service role full). **Deferred:** an `outcomes` table (with the Outcome Loop, §12).

---

## 9. API surface

| Method + route | Purpose | Notes |
|---|---|---|
| `POST /api/strategy` | Create/update the Strategy Session (S001) | New version; previous retained |
| `POST /api/contracts` | Generate + confirm the Executive Contract (S002) | Confirm activates Programs |
| `POST /api/contracts/new-epoch` | Issue a new mandate (change priority/metric/mandate, pause a Program) | Creates a **new current version**; contracts are immutable; history preserved |
| `GET /api/executive/summary` | Founder command view — mandate, active Programs, latest Briefings | Visibility + command, not approval |
| `POST /api/rhythm/run` | Run one Operating-Rhythm cycle (Cron or manual) | Idempotent per `cycle_key` |
| `GET /api/programs/:id` | Program state + Briefings | — |
| `GET /api/assets/:id` | Current Asset + version history | Reads `asset_versions` |
| `PUT /api/assets/:id` | **Founder edits an Asset** | Creates a new immutable current version (`authored_by='founder'`); no approval |
| `POST /api/programs/:id/actions/:actionId` | Prepare/run an Action | Just-in-time approval if `irreversible` |
| `POST /api/connectors/:provider/oauth` | Start OAuth for a tool | Writes `connector_connections`. **Not** `/api/connections` — that route is taken by founder→investor intros |

Shared invariants: no Program runs outside the current Contract; irreversible Actions require approval at the Connector boundary; Zod validation at every boundary; every mutation preserves audit history.

---

## 10. First proof case — P001 GTM (the runtime is generic)

**The architecture is not GTM-specific.** P001 is simply the first Registry entry proven end-to-end.

- **Executive:** Growth (Patel, **S003**). **Program:** **P001 — Go-to-Market Strategy** (`programPromptRef: P001`).
- **Objective:** define ICPs, positioning, messaging and commercial channels to maximise sustainable revenue growth.
- **Assets (corrected scope):**
  - **AS001** ICP Profiles
  - **AS002** Pains & Gains Matrix
  - **AS003** Buyer Journey Map
  - **AS004** Positioning & Messaging Framework
  - **AS005** Channel Strategy
- **Actions:** Validate ICPs · **Interview Customers** · Prioritize Channels · Review Messaging · Approve GTM Plan.
  *The Story-3 connector proof:* **Interview Customers** sends interview invitations via the Gmail connector — **irreversible → just-in-time approval** → executes → `action_log`.
- **Prompt assembly:** `Executive System Prompt (S003) + Program Prompt (P001) + Asset Instructions (AS001…AS005) + Company Context (Strategy, Contract, Q-Score, current Assets)`.
- **Flow:**
```
Strategy Session → confirm Executive Contract (P001 active)
  → rhythm cycle: P001 judgement → new versions of AS001–AS005 → Executive Briefing
  → founder may open/edit any Asset → new current version, used next cycle
  → (Story 3) Action "Interview Customers" → payload prepared → APPROVE → Gmail → action_log
```
Every other Executive and Program reuses this exact machinery — only Registry entries and prompts differ.

---

## 11. Migration — strangler-fig, not big-bang

1. Build the Registry, tables, Composer, Mandate, Rhythm engine and Connectors behind flag `NEW_EXECUTIVE_MODEL` (default off).
2. Route new founders to the new model; leave existing founders on the old agents.
3. Reach parity on P001; run the pilot.
4. Migrate remaining founders; flip the flag on.
5. **Only then** delete the old agent routes, persona folders, and old config.

The Q-Score, store, scheduler and executor never fork — both models share them. The app keeps working throughout.

---

## 12. Build plan — by Story and Product (target: Stories 1–3 by end of September, "Sprint II")

**Phase 0 — clear the ground (~2–3 weeks).** Audit and close every artifact/action creation path so nothing runs outside the mandate. Single-source the score-boost signal and **decouple it from Asset creation**. Add the billing integration test (checkout → webhook → DB); type the Supabase admin client at those call sites. Settle "action" (one-off) vs "cadence" (recurring). Freeze the old agent routes. Add the `NEW_EXECUTIVE_MODEL` flag.

**Story 1 — Mandate (Products: Registry + Composer).** `lib/registry/**` (generic, seeded from the workbook: all Executives/Programs; P001 fully) · `lib/prompts/compose.ts` (4-layer + validation + runtime errors) · `strategy_sessions`, `executive_contracts` · `POST /api/strategy`, `POST /api/contracts`, `POST /api/contracts/new-epoch` · `/founder/executive` command view.
*Exit:* one current Strategy + one confirmed Contract + active Programs; a new mandate creates a new epoch with history intact.

**Story 2 — Rhythm + Assets (Products: Asset Versioning + Operating Rhythm).** `asset_versions` (+ validation, provenance, exactly-one-current) · `lib/assets/versioning.ts` · founder Asset pages + `PUT /api/assets/:id` (edit → new version) · `executive_briefings` · `lib/rhythm/run.ts` + `operating_rhythm_runs` (idempotent; runs **all contract-active Programs**; **no Asset Review**) · Cron trigger.
*Exit:* cycles run; AS001–AS005 improve across ≥2 cycles; Briefings published; founder can edit an Asset and the next cycle uses it. **No external execution yet.**

**Story 3 — Actions + Connectors.** `connector_connections` vault + Gmail OAuth (`app/api/connectors/**`) · connector adapter interface · Action generation from Programs · **just-in-time approval on irreversible** · `action_log` · status/result/retry visible to the founder.
*Exit:* "Interview Customers" prepared → approved → sent via Gmail → logged. Pilot behind the flag; watch **week-4 retention**.

**After Sprint II (deferred, in order).** More Programs/Executives (the runtime already supports them) → more Connectors → **event-aware rhythm (`runsWhen`)** as a cost optimisation → **Outcome Loop** (outcomes as evidence for Q-Score reassessment) → **Evidence Pack** (reporting derived from Assets/Briefings/Actions) → investor-side features. **None of these are in the current core.**

---

## 13. Testing, quality, and risks

**Quality gates (existing tooling — Jest, Playwright, Sentry):**
- Unit: no Program runs outside its Contract; no irreversible Action without approval.
- Unit: Asset versioning never overwrites; exactly one current; sequential versions; founder edits create versions; invalid-Asset persistence is blocked (the P003→AS001 case).
- Unit: Composer rejects an invalid package (the P001-with-S004 case).
- Unit: Operating Rhythm is idempotent (same `cycle_key` cannot run twice).
- Integration: billing round-trip (the verified gap).
- E2E: Strategy → Contract → rhythm cycle → versioned Assets → Briefing → (S3) approve + send.
- Make advisory CI phases blocking; run E2E against the production build; bump Node to 20+.

**Top risks (verified, prioritised):**
1. **Mandate / approval leakage** — a path that runs a Program outside the Contract, or sends without approval, breaks the trust model. → Phase 0 audit + unit tests.
2. **Retention** — AI-native GRR ~40%; if the first cycles don't feel valuable, founders churn. → week-4 retention is the go/no-go before widening.
3. **Cost & briefing fatigue** — v1 runs all contract-active Programs weekly for every company; that is real LLM spend and can flood founders. → keep the active set small in the pilot; `runsWhen` is the deferred optimisation.
4. **Billing untested** — has broken production before. → integration test before any billing change.
5. **Untyped Supabase admin client** — root cause of the billing incident class. → type it at webhook call sites.
6. **Connector reliability** — irreversible actions + credentials are the highest-risk surface (~74% of enterprises rolled back autonomous agents). → build narrow, approval-gate everything irreversible, full audit log, one human security review before Story 3 ships.
7. **Scope creep** — building the deferred layers (outcomes, evidence, investor) early. → §2 non-goals are binding.

---

## 14. Open decisions

**Both prior blockers are now resolved by the review:**
- ~~GTM outcome metric~~ → **not needed for Phase 1**; the Outcome Loop is deferred. Programs carry a `successMetric` for judgement/reporting only.
- ~~Confirm irreversible-action approval~~ → **confirmed**: just-in-time approval at the Connector boundary.

**Remaining (non-blocking, decide during Story 2/3):**
1. Rhythm cadence configuration (weekly default — per-company override?).
2. Which Executive/Program follows P001 (the runtime already supports all).
3. Whether Briefing digests aggregate across Programs when several are active.

**Operational (owner: Mo, outside this doc):** create InnoSphere-owned accounts (Supabase/Vercel/Stripe/LLM providers) and migrate off personal accounts; a quality-management/review agenda; the connector security review.

---

## 15. Appendix

**Glossary.** *Executive* — a stable AI persona owning a domain. *Program* — a repeatable initiative with objective, scope, assets, actions. *Management Asset* — versioned company knowledge; founder-visible and editable. *Action* — operational work (internal/reversible, or irreversible external via a Connector). *Strategy Session (S001)* — the founder's direction. *Executive Contract (S002)* — the founder's mandate; immutable; a new one starts a new **operating epoch**. *Operating Rhythm* — the recurring cycle that runs all contract-active Programs. *Executive Briefing* — the founder-facing output of a Program run. *Connector* — a shared adapter to an external system. *Q-Score* — a separate diagnostic fed by Company Builder artefacts.

**Key files.** Reuse: `features/qscore`, `lib/qscore`, `lib/agents/{task-graph,delegation,orchestrator}.ts`, `lib/actions/executor.ts`, `lib/tools/executor.ts`, `lib/llm/router.ts`. Rewrite: `lib/edgealpha.config.ts` → `lib/registry/**`. New: `lib/prompts/compose.ts`, `lib/mandate/**`, `lib/rhythm/**`, `lib/assets/**`, `lib/connectors/**`, `app/founder/executive/**`, `app/founder/assets/**`, `app/api/strategy/**`, `app/api/contracts/**`, `app/api/rhythm/**`, `app/api/assets/**`, `app/api/connectors/**` *(not `connections` — taken)*.

**Division of documents.** Roman's EAOS summary remains the **product constitution** (operating model, principles, the three Products, Connectors, the three stories). This document carries the **implementation**: data model, routes, migration, testing and delivery.

**Market sources.** Cofounder.co; Fortune (Mastercard Virtual CFO); OpenCFO raise; Menlo Ventures / Insight Partners on vertical-AI moats; NFX on AI defensibility; Userpilot 2026 AI retention data (AI-native GRR ~40%); enterprise agent-rollback survey (~74%).
