# Edge Alpha — Architecture & Tech Stack

*The overall system: architecture style, layers, components, the technology in each, and how data, AI, execution and security fit together. Grounded in a direct read of the live codebase (git `664f7a7`) and the operating model in `EDGE_ALPHA_PRD.md` (canonical). Legend: 🟢 exists/reuse · 🔵 new · ⛔ deferred.*

---

## 1. Architecture at a glance

Edge Alpha is a **single Next.js application — a modular monolith — deployed on Vercel, backed by Supabase Postgres**, with the AI executive layer organised as an internal, config-driven operating system. There is no separate backend service, no microservices, no message queue. Asynchronous and recurring work runs through **Vercel Cron + a database-row job pattern**, extended by a new **Operating-Rhythm engine** that drives the weekly cycle.

Three properties define the shape:

- **Config over code.** Executives, Programs, Assets and Actions are **Registry entries in code**, not routes. Capability grows by adding catalog entries — this is what replaces the 11-persona / ~170-route sprawl (173 of 275 routes, 63%, sit under `app/api/agents/**`).
- **Stateless reasoning over versioned memory.** The system reasons from the **current versioned Assets**, not accumulated chat history. Company memory lives in a versioned store, not a conversation.
- **Autonomous within a mandate, gated only on irreversible acts.** Programs run automatically under the founder's Executive Contract. The **only** human checkpoint is just-in-time approval on irreversible external Actions, at the Connector boundary.

---

## 2. Layered architecture (target)

```
┌───────────────────────────────────────────────────────────────────┐
│ INTERFACE    Founder UI (thin) · one front door ("Morgan")          │ 🟡
├───────────────────────────────────────────────────────────────────┤
│ REGISTRY     Executives → Programs → Assets → Actions (in code)     │ 🔵
│              authoritative runtime; workbook = design/seed source   │
├───────────────────────────────────────────────────────────────────┤
│ PRODUCT 1    Prompt Composer — 4 layers:                            │ 🔵
│              Executive System Prompt + Program Prompt +             │
│              Asset/Action Instructions + Company Context            │
├───────────────────────────────────────────────────────────────────┤
│ MANDATE      Strategy Session (S001) + Executive Contract (S002)    │ 🔵
│              immutable · a change = a new operating epoch           │
├───────────────────────────────────────────────────────────────────┤
│ PRODUCT 3    Operating-Rhythm engine — weekly, idempotent,           │ 🔵
│              runs ALL contract-active Programs. No Asset Review.     │
├───────────────────────────────────────────────────────────────────┤
│ PRODUCT 2    Asset Persistence & Versioning — immutable,             │ 🔵
│              provenance, founder-editable                           │
├───────────────────────────────────────────────────────────────────┤
│ CONNECTORS   Shared adapters + credential vault + just-in-time       │ 🔵
│              approval on irreversible + immutable audit             │
├───────────────────────────────────────────────────────────────────┤
│ EXECUTION    Program Runtime (task-graph) · Action Executor ·        │ 🟢
│              Tool Executor · Scheduler · delegation                 │
├───────────────────────────────────────────────────────────────────┤
│ DIAGNOSTIC   Q-Score — SEPARATE; fed by Company Builder artefacts   │ 🟢
├───────────────────────────────────────────────────────────────────┤
│ DATA         Supabase Postgres (RLS) · Storage · secrets vault ·    │ 🟢
│              Upstash Redis (rate limit)                             │
├───────────────────────────────────────────────────────────────────┤
│ PLATFORM     Vercel (Edge + Node) · Vercel Cron · GitHub Actions    │ 🟢
└───────────────────────────────────────────────────────────────────┘
     Observability across all layers: Sentry · PostHog · structured logger
```

**Not in this architecture (deferred, ADR-009):** an Outcome Loop, an `outcomes` table, an Evidence Pack, investor-side features.

---

## 3. Tech stack (by layer)

| Layer | Technology | Purpose | Status |
|---|---|---|---|
| Web framework | **Next.js 16** (App Router, RSC, Turbopack) | Founder/investor UI + API routes in one app | 🟢 |
| Language / UI | **TypeScript (strict)**, **React 19** | Whole application layer | 🟢 |
| Styling | Tailwind 3.4 + tokens (`lib/constants/colors.ts`) + framer-motion; Radix/shadcn; lucide; Tremor; sonner | UI system | 🟢 |
| Database / Auth / Storage | **Supabase** (Postgres 17, Auth, Storage), RLS multi-tenant | System of record | 🟢 |
| Query layer | Raw `@supabase/supabase-js` + generated types (no ORM) | DB access | 🟢 *(type the admin client)* |
| Registry | TypeScript modules (`lib/registry/**`) | Executives/Programs/Assets/Actions as code | 🔵 |
| Prompt composition | `lib/prompts/compose.ts` (4-layer + validation) | Deterministic, validated assembly | 🔵 |
| LLM routing | `lib/llm/router.ts` → **Groq** + **Anthropic** | Task-class model selection; vendor independence | 🟢 |
| Autonomous engine | `lib/rhythm/**` on **Vercel Cron** + `operating_rhythm_runs` | Weekly, idempotent cycle | 🔵 |
| Execution engine | `task-graph.ts`, `delegation.ts`, `orchestrator.ts`, `lib/actions/executor.ts`, `lib/tools/executor.ts` | Multi-step program/action execution | 🟢 |
| Scheduler / async | Vercel Cron (5 jobs) + DB-row jobs (`scheduled_actions`, `artifact_jobs`) | Recurring cadences, long jobs | 🟢 *(extend)* |
| Asset memory | `asset_versions` (immutable, provenance, founder-editable) | Versioned company knowledge | 🔵 |
| Connectors | Adapters (prefer MCP client) + `connector_connections` vault + `token_ref` → secrets manager | Act in the founder's real tools | 🔵 |
| Secrets | Secrets manager (Supabase Vault or provider KMS) | Encrypted tokens by reference | 🔵 |
| Rate limiting | **Upstash Redis** (sliding window, middleware) | Abuse protection *(currently fails open — fix)* | 🟢 |
| Payments | **Stripe** (checkout + webhooks) | Subscriptions, usage metering | 🟢 *(harden)* |
| Email | **Resend** (platform) + **Gmail** (connector) | Digests + founder-sent mail | 🟢 / 🔵 |
| External tools | Apollo, Tavily, PostHog, Calendly, Hunter | Enrichment, research, analytics | 🟢 |
| Validation | **Zod 4** (`lib/api/validate.ts`) | Boundaries + composer/persistence validation | 🟢 |
| Observability | **Sentry** + **PostHog** + structured logger | Errors, analytics, run tracing | 🟢 |
| Testing | **Jest 30** (unit) + **Playwright 1.59** (E2E) | Unit + critical-flow E2E | 🟠 *(Jest never runs in CI — see §9)* |
| CI/CD | **GitHub Actions** → **Vercel** | Build, test, deploy | 🟠 *(needs fixes — §9)* |
| Runtime | Vercel **Edge** (streaming) + **Node** (uploads, jobs) | No Docker/K8s | 🟢 |

---

## 4. Data architecture

**Postgres is the single system of record**, multi-tenant with RLS enforced per company. Four disciplines matter:

- **Append-only history.** `qscore_history` and `action_log` are never mutated — every change is a new row.
- **Immutable versioning.** `asset_versions` never overwrites; each Program execution *or founder edit* writes a new version with provenance (`authored_by`, execution, program, executive, sources, reason), exactly one marked `current`. `executive_contracts` are immutable too — a change creates a new version (a new **epoch**), never an edit.
- **Idempotent cycles.** `operating_rhythm_runs` is unique per `(founder_id, cycle_key)` — a weekly cycle can never run twice and duplicate work.
- **Registry in code, instances in the DB.** Definitions live in TypeScript (versioned, auditable); the database holds only per-founder instances.

**New tables:** `strategy_sessions`, `executive_contracts`, `programs`, `asset_versions`, `executive_briefings`, `operating_rhythm_runs`, `connector_connections`, `action_log`.
**Extended:** `agent_artifacts` (+`program_id`), `scheduled_actions` (+`cadence`, `next_run_at`).
**Deferred:** an `outcomes` table (ADR-009).

**Secrets** never live in application tables — only a `token_ref`; the material sits in a secrets manager.

> **Namespace note:** the connector vault is `connector_connections` and its routes live at `app/api/connectors/**`. `app/api/connections` is already taken by founder→investor intro requests.

---

## 5. AI / intelligence architecture

- **LLM Router (`lib/llm/router.ts`).** All model calls route through one place that selects a provider by declared task class — Groq for fast/cheap, Anthropic for premium reasoning. Vendor independence is architectural: a new provider is a config change. Never hardcode a model at a call site.
- **Prompt Composer (4 layers).** `Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context`, assembled deterministically then **validated** before execution (hierarchy preserved; Program compatible with its Executive; no capability outside the Contract). Invalid → runtime error, not a bad call.
- **Stateless reasoning.** Programs reason from the current Asset versions and Q-Score, not from accumulated conversation — designing out the drift failure mode of chat-based AI.
- **Q-Score (separate diagnostic).** Confidence-weighted scoring across 6 dimensions, updated from **Company Builder artefacts**. **Creating an Asset never raises it.** Nothing in the new model calls `applyAgentScoreSignal()` — a unit test enforces this.
  *Verified mechanism (old model):* `ARTIFACT_BOOST` + `applyAgentScoreSignal()` in `features/qscore/services/agent-signal.ts`, called from routes under `app/api/agents/**` (frozen — the old model keeps boosting until it's deleted). `qscoreBoosts` in `lib/edgealpha.config.ts` is derived display data only.

---

## 6. Autonomous execution architecture

A weekly **Operating Rhythm**, triggered by Vercel Cron:

```
Vercel Cron (weekly)
  → create operating_rhythm_runs row (idempotent per cycle_key)
  → load: current Registry · Strategy · Executive Contract · Q-Score · current Asset versions
  → for EACH contract-active Program:            (no Asset Review — maintenance is inside execution)
        Program judgement  (task-graph + composer + router)
          → new Asset versions   (immutable, provenance)
          → Executive Briefing    (founder-facing)
          → Actions:  internal/reversible → run;  irreversible → pending_approval
  → connector executes approved actions → action_log
  → persist outputs · update Company Operating State · record stage status
```

Key choices: **idempotency** (no duplicate cycles) · **mandate integrity** (only contract-active Programs run) · **partial-failure isolation** (a failed stage doesn't take down the app; dependents block, technical ops retry) · **parallelism** where dependencies allow.

**No `runsWhen` / event-skipping in v1** (ADR-008) — the rhythm runs all contract-active Programs. Event-awareness is a deferred cost optimisation. *Cost control today: keep the active Program set small during the pilot.*

No dedicated queue — Vercel Cron + DB-row runs suffice at pilot scale; a managed queue is a later scaling lever, not a day-one dependency.

---

## 7. Connector / integration architecture

A **shared adapter layer**, built once, rather than per-executive integrations:

```
Program creates Action
  → payload prepared
  → approval required ONLY if irreversible    (just-in-time, at the Connector boundary)
  → adapter (MCP client) calls the real tool  (POST /connectors/gmail/send, /crm/records …)
  → audit: attempt + result → action_log
```

Rules: **OAuth only, least-privilege scopes**; tokens by reference (`token_ref`), never plaintext; hard approval on irreversible acts; every action logged immutably; **build narrow** — email first, then CRM/calendar/analytics. Do **not** build commodity plumbing (LLC, domain, bank).

---

## 8. Security architecture

- **Multi-tenant isolation** via RLS on every table.
- **Secrets** in a manager, referenced by `token_ref`; the app never stores raw credentials.
- **The one human checkpoint:** irreversible external Actions require just-in-time approval.
- **Immutable audit** (`action_log`, append-only score history).
- **Auth:** Supabase JWT; middleware handles session refresh, route protection, CSRF (Origin check), rate limiting.
- **Known fixes required:** centralize admin auth into one `verifyAdmin()`; make the rate limiter **fail closed with alerting** rather than silently open.
- **Composition validation** prevents an execution requesting capabilities outside its Executive Contract.
- **External content is data, not instructions** — uploads, emails, tool results, web pages.

---

## 9. Deployment, CI & runtime

Single Vercel project, Vercel-native end to end (no Docker/K8s). **Edge runtime** for streaming; **Node runtime** for uploads and long jobs. **Vercel Cron** drives scheduled work including the Operating Rhythm. Rollout is gated behind `NEW_EXECUTIVE_MODEL` (strangler migration).

**CI — verified state and required fixes (Phase 0):**

| Finding | Fix |
|---|---|
| **Jest never runs in CI.** `.github/workflows/e2e-tests.yml` is the only workflow and never invokes `npm test` — all suites are unenforced, so "demand tests" is currently unenforceable | Add `npm test` as a **blocking** step |
| **Node 18 pinned; Next.js 16 requires Node 20.9+** | Bump to `20.x`; add `engines` + `.nvmrc` |
| **CI builds then discards** — runs `npm run build`, then serves E2E against `npm run dev` | Serve E2E against `npm run start` (the production build) |
| **Advisory phases are non-blocking** (`continue-on-error: true`) | Make blocking (one at a time; quarantine known failures on a tracked list) |
| **No `typecheck` script** | Add `tsc --noEmit` and run it in CI |
| `eslint-config-next@^15` against `next@^16` | Note; fix only if it surfaces errors |

---

## 10. Scalability & evolution

- **Capability scales by configuration** — a new Program/Asset/Action is a Registry entry executed by the shared engine. No new routes.
- **Per-company isolation** means growth is founder-count, which Supabase/Vercel absorb at this stage.
- **Deferred scaling levers (don't build early):** event-aware rhythm (`runsWhen`), a managed job queue, a read cache, a dedicated worker service.

---

## 11. Reused vs. new

**Reused untouched:** Q-Score engine, LLM router, task-graph / delegation / orchestrator, action & tool executors, scheduler, document store, memory, RLS, Stripe/Resend/Sentry/PostHog.
**Rewritten:** `lib/edgealpha.config.ts` → the code Registry (`lib/registry/**`).
**New:** Prompt Composer · Mandate (Strategy + Contract) · Operating-Rhythm engine · Asset Versioning · Connector layer.
**Frozen (never edited, deleted only after parity):** the 11 personas (`features/agents/**`) and ~170 per-agent routes (`app/api/agents/**`). *Exception: `*Renderer.tsx` components are reusable.* Note `lib/agents/compose-system-prompt.ts` is the old 3-part assembler — frozen; it dies with the old model.

**Net:** the same Next.js/Supabase/Vercel foundation and the same execution engine, re-shaped from persona/route sprawl into a config-driven autonomous operating system — mostly refactor, targeted new build.

---

## 12. The architecture in one sentence

A modular-monolith Next.js app on Vercel and Supabase, where a small config-driven Registry of AI executives runs autonomously on a weekly, idempotent operating rhythm under a founder-set mandate — reasoning from versioned, founder-editable company memory, routing every prompt through one 4-layer Composer and every model call through one router, acting in the founder's real tools through a shared Connector layer with approval only on irreversible steps, while the Q-Score stays a separate diagnostic fed by Company Builder artefacts.
