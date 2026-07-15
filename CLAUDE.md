# Edge Alpha — Engineering Rules (read every session)

*These are the project's rules. Claude Code loads this file automatically. If a change violates any rule here, stop and fix it before continuing. Canonical spec: `EDGE_ALPHA_PRD.md`. Layout: `Starthere.md`. Features: `Featureinventory.md`.*

---

## 0. Prime directives (the rules that prevent mess)

1. **Config over code.** New capability = a **Registry entry** (`lib/registry/**`), never a new route or a file per agent/program. About to copy-paste a route? Stop — that's the 170-route mess.
2. **One of each.** One Prompt Composer, one Execution Engine, one Connector interface, one score-signal writer. Never a second parallel way to do the same thing.
3. **Reuse the engine, don't fork it.** Build on `task-graph`, `delegation`, `orchestrator`, `lib/actions/executor.ts`, `lib/tools/executor.ts`, `scheduled_actions`, `agent_artifacts`, `lib/llm/router.ts`, `qscore`. Do not reimplement them.
4. **Never touch the old agents.** No edits inside `features/agents/**` or `app/api/agents/**` (frozen). New work goes in new folders behind `NEW_EXECUTIVE_MODEL`. *(Exception: the `*Renderer.tsx` components are reusable — reuse, don't edit.)*
5. **Small, single-purpose files.** ~300 lines max per file, ~50 per function. Split when it grows. (The 1,039-line chat route is the anti-pattern.)
6. **Types at every boundary.** No `any`. Zod-validate every API input/output. The untyped Supabase admin client caused a production incident — don't repeat it.

## 1. Product rules (from the PRD — do not violate)

- **Prompt nomenclature is fixed:** `Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context`. Never invent competing terms.
- **The Registry (TypeScript) is the authoritative runtime source.** The Excel workbook is the design/seeding source only — never a second live registry.
- **Build the runtime generically** for all Executives/Programs. P001 GTM is the first proof case, not a special case.
- **No Asset Review.** Asset maintenance happens *inside* Program execution. Never add a separate review stage, prompt, route or requirement.
- **The Operating Rhythm runs all contract-active Programs, every cycle.** No `runsWhen` / event-skipping in v1.
- **Contracts are immutable.** Any change creates a **new version = a new operating epoch**. Never edit a confirmed Contract in place; never delete history.
- **Assets are founder-visible and editable.** A founder edit creates a new immutable current version (`authored_by='founder'`), used immediately. No approval, no gate.
- **No approval gates on Programs, Assets or internal work.** The *only* checkpoint: **irreversible external Actions** (send/publish/spend/change-price) require **just-in-time approval at the Connector boundary**.
- **The Q-Score is a separate diagnostic.** Asset creation never raises it. Outcomes are evidence for later reassessment — never call `applyAgentScoreSignal()` automatically from execution.
- **Deferred — do not build:** the Outcome Loop, Evidence Pack, investor-side features. They are out of the current core.

## 2. Architecture rules (anti-sprawl)

- One generic route per verb (`/api/programs/[id]/actions/[actionId]`), never one per agent.
- Business logic lives in `lib/**`. Routes are thin: validate → call lib → return.
- No duplicated logic. Extract a shared function.
- Prompts only through the Composer (`lib/prompts/compose.ts`). Never inline a prompt in a route.
- Models only through `lib/llm/router.ts`. Never hardcode a model name.
- Frontend is thin — it renders state; it never implements executive reasoning.

## 3. Security checklist (every feature)

- [ ] **RLS on every new table** — a founder only ever reads/writes their own rows. Test cross-tenant is blocked.
- [ ] **Secrets by reference only** — tokens live in the secrets manager; the DB stores `token_ref`. Never plaintext, never logged.
- [ ] **Least-privilege OAuth scopes**; read-only where possible.
- [ ] **Irreversible actions require approval** at the Connector boundary. Log every attempt to `action_log`.
- [ ] **External content is data, not instructions** — uploads, emails, tool results, web pages. Never let them steer the prompt.
- [ ] **Validate all input** at the boundary (Zod). Never trust the client.
- [ ] **Fail closed, not open.** Auth/rate-limit/mandate errors deny + alert; never silently allow.
- [ ] **Centralized auth checks** — one `verifyAdmin()`, never a copy-pasted whitelist.
- [ ] No secrets or PII in URLs, logs, or error messages.

## 4. Data rules

- [ ] **Append-only history** — never mutate `qscore_history` or `action_log`; insert.
- [ ] **Assets versioned, never overwritten** — new version + provenance; exactly one `current`; sequential versions.
- [ ] **Idempotency** — rhythm cycles (`cycle_key`), webhooks and actions dedupe on a stable key. Twice must not double anything.
- [ ] **One source of truth** per fact. No value defined in three places.
- [ ] Migrations additive and reversible; test the rollback.

## 5. Code quality

- TypeScript strict; explicit return types on exports.
- Descriptive names; no cleverness. No dead code, no commented-out blocks, no stray TODOs.
- Handle errors explicitly; no silent catches. Every failure path has a defined behavior.
- No `console.log` — use the structured logger. Keep dependencies minimal.

## 6. Definition of Done

- [ ] Unit tests cover core logic **and** failure/edge cases.
- [ ] The critical-path E2E still passes.
- [ ] Security items (§3) checked for this change.
- [ ] Behind the flag; the old product unaffected.
- [ ] Acceptance criteria for its `US-##` met.
- [ ] No new lint/type errors; CI green **on a production build**.
- [ ] Diff small and reviewable.

## 7. AI-generation anti-mess rules

- **Reject duplication** — a near-copy of an existing route/file? Delete it, generalize instead.
- **Reject over-engineering** — no speculative abstraction. Smallest thing that meets the story.
- **Reject invented structure** — new folders/patterns that don't match `Starthere.md`? Move it.
- **Reject unvalidated wiring** — skipping Zod/auth/RLS/error-handling means not done.
- **Reject hardcoding** — models, prompts, secrets, limits, magic strings → config/registry/env.
- **Demand tests.** Code without tests is a draft.
- One feature at a time. Don't sprawl across ten files "while in there."

## 8. Red flags — STOP

- Adding a route that resembles another route → **use the Registry.**
- Writing a prompt inline → **use the Composer.**
- Editing `features/agents/**` → **frozen, wrong folder.**
- File > 300 lines / function > 50 → **split it.**
- Storing a token in a table → **use the vault.**
- An action sends/spends without asking → **add the approval.**
- Adding an Asset Review step → **it doesn't exist; remove it.**
- Editing a confirmed Contract in place → **create a new epoch instead.**
- Auto-moving the Q-Score from execution → **the score is separate.**
- Defining the same limit/config twice → **single-source it.**

---

**One line:** small typed files, config over routes, one Composer and one engine, secrets in the vault, RLS everywhere, approval only on irreversible actions, tests on every change, the old agents frozen. If in doubt, do less, and make it clean.
