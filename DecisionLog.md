# Edge Alpha — Decision Log

*The decisions we've settled, recorded so they stop being re-opened. Each entry: the decision, why, what it costs, what we rejected. Aligned to `EDGE_ALPHA_PRD.md` (the canonical spec). Update this only when a decision genuinely changes — not every time it's questioned.*

**Status:** 🔒 Locked (don't re-open without new evidence) · 🕒 Revisit at a named trigger

---

## ADR-001 — Edge Alpha is a Founder Operating System 🔒
**Decision:** the product is an autonomous operating system the founder runs their company on — persistent memory, a weekly executive rhythm, real execution under a mandate they set.
**Why:** it's what a chat window structurally can't do, and it's honest about what we can deliver now.
**Cost:** we give up the punchier "investor-trusted score" pitch for the time being.
**Rejected:** positioning the investor-trusted Q-Score as the central asset (deferred — ADR-009); "AI executives that generate deliverables" (table stakes, loses a breadth war).

## ADR-002 — The Executive Contract is the mandate; no approval gates on Programs 🔒
**Decision:** the founder sets direction once (S001 Strategy → S002 Executive Contract, confirmed once). Programs then run autonomously within that mandate. No proposed status, no sign-off, no activation gate, no waiting state.
**Why:** a per-cycle gate adds complexity and decision load; the Program and its Assets are already defined. Introduce a gate only if founders need one.
**Cost:** less per-step human control; correctness depends on the mandate being right.
**Rejected:** the per-plan sign-off gate from earlier drafts (superseded).

## ADR-003 — Contracts are immutable; a change starts a new operating epoch 🔒
**Decision:** confirmed Contracts are never edited in place. Any change (priority, success metric, an executive's mandate, pausing a Program, new direction) creates a **new current version = a new epoch**. All historical Assets, Briefings, Actions and execution records are preserved.
**Why:** immutability gives a clean audit trail and a coherent "what were we operating under, when."
**Cost:** slightly more machinery than an in-place edit.
**Rejected:** editable contracts; "reset the clock" (which implied destroying history).

## ADR-004 — Just-in-time approval on irreversible external Actions only 🔒
**Decision:** internal and reversible execution is autonomous. **Irreversible external side effects** (send, publish, spend, change price) require founder approval **at the Connector boundary** — after the payload is prepared, before it executes.
**Why:** current AI is reliable enough to reason, not to be handed irreversible actions unwatched (~74% of enterprises rolled back autonomous agents in 2026). This is the safety line, and it doesn't violate "no approval gates," which applies to Programs.
**Cost:** the founder is in the loop on sends.
**Rejected:** unattended irreversible actions; approval during Program execution.

## ADR-005 — The Q-Score is a separate diagnostic 🔒
**Decision:** the Q-Score is updated from **Company Builder artefacts** (uploaded evidence), not from the execution loop. Creating a Management Asset **never** raises the score. Outcomes are evidence for later reassessment — they never automatically call `applyAgentScoreSignal()`.
**Why:** Assets *describe and direct* the company; artefacts *prove* what's true. A score based on document production is gameable and meaningless.
**Direction of influence:** artefacts → Q-Score → Programs interpret → Assets updated → Actions → new artefacts → Q-Score again.
**Rejected:** Asset-creation score boosts (the gameable status quo); automatic outcome→score updates.

## ADR-006 — No Asset Review 🔒
**Decision:** there is no separate Asset Review cycle, prompt, route or runtime stage. Asset maintenance happens **inside** Program execution.
**Why:** a standalone review duplicates what Programs already do, adds prompts and complexity, and risks becoming an approval-like checkpoint.
**Rejected:** an Asset Review stage in the Operating Rhythm (removed everywhere).

## ADR-007 — Assets are founder-visible and directly editable 🔒
**Decision:** Management Assets are living pages. The founder can open, inspect and amend any Asset. A saved edit creates a **new immutable current version** (`authored_by='founder'`), used immediately by relevant Programs and Actions. No approval, no gate. Briefings point to material changes but never replace Asset access.
**Why:** Assets are the company's knowledge, not hidden system objects. Founder in command.
**Rejected:** hidden/system-only Assets; an approval workflow on edits.

## ADR-008 — The Operating Rhythm runs all contract-active Programs 🕒
**Decision:** every cycle, the rhythm executes **all Programs the current Executive Contract marks active**. No event-aware skipping (`runsWhen`) in v1.
**Why:** simplicity and predictability first; the Contract already decides what's active.
**Cost:** real LLM spend and possible briefing volume — mitigated by keeping the active set small in the pilot.
**Revisit trigger:** when cost or briefing fatigue shows up at scale → introduce `runsWhen` as an optimisation.
**Rejected:** "runs all *registered* Programs" (wrong — the Contract decides).
**Amended by ADR-028 (20 Jul 2026):** this decision governs *Program-level scheduling*, which stays unconditional. *Asset-level regeneration* within a cycle is now conditional on the founder-activity delta — an unchanged asset is not rewritten. See ADR-028.

## ADR-009 — Investor features, Outcome Loop and Evidence Pack are deferred 🕒
**Decision:** the investor marketplace, the investor-trusted-score thesis, the dedicated Outcome Loop (`lib/outcomes/`, `POST /api/outcomes`, score mapping) and the Evidence Pack are **out of the current core**.
**Why:** none of them are needed to prove the Founder OS, and building them early is the named scope-creep risk.
**Revisit trigger:** after the retention gate passes and the founder loop is proven.
**Rejected:** making the investor-trusted score the current justification/moat.

## ADR-010 — The Registry lives in code; Excel is the design/seed source 🔒
**Decision:** the TypeScript Registry (`lib/registry/**`) is the **authoritative runtime source** for Executives, Programs, Assets and Actions. The Excel workbook is the **design and seeding source**, never a second live registry.
**Why:** one source of truth at runtime; versioned and auditable in git.
**Rejected:** a live Excel/DB registry (two sources of truth).

## ADR-011 — Build the runtime generically; P001 GTM is the first proof case 🔒
**Decision:** Products 1–3 support the **full Registry** from the beginning. P001 GTM is simply the first Program proven end-to-end.
**Why:** a GTM-specific architecture would have to be rewritten for every other Program.
**Cost:** slightly more up-front generality.
**Rejected:** building GTM-specific and generalising later.
**P001 scope (corrected):** AS001 ICP Profiles · AS002 Pains & Gains Matrix · AS003 Buyer Journey Map · AS004 Positioning & Messaging Framework · AS005 Channel Strategy.

## ADR-012 — Prompt nomenclature is fixed 🔒
**Decision:** every execution package = `Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context`, assembled by one Composer in a fixed deterministic order, validated before release.
**Why:** one vocabulary and one assembly path; prevents prompt sprawl and competing taxonomies.
**Rejected:** "Standard + Knowledge Base + Specific" (retired); inline/per-agent prompts.

## ADR-013 — The CEO is not a separate architectural layer 🔒
**Decision:** the CEO perspective may own the S001/S002 prompts, but mandate generation runs through the **same Prompt Composer and Execution Engine** as every other Program.
**Why:** a special-case CEO layer would fork the engine — exactly what we're removing.
**Rejected:** a bespoke CEO pipeline.

## ADR-014 — Keep the engine, scrap the personas (strangler, not big-bang) 🔒
**Decision:** reuse the Q-Score engine, task-graph, delegation, orchestrator, executors, scheduler and document store untouched. Replace the 11 personas and ~170 per-agent routes via the Registry. Build behind `NEW_EXECUTIVE_MODEL`; delete the old only after parity.
**Why:** ~two-thirds of the machinery works; a big-bang rewrite breaks the live app for months.
**Cost:** old and new coexist temporarily.
**Rejected:** deleting the old agents first.
**Salvage note:** `features/agents/{persona}/components/*Renderer.tsx` are reusable UI — keep them.

## ADR-022 — `epoch` counts confirmed mandates; `version` counts rows 🔒
**Decision:** on `executive_contracts` the two columns mean different things.
- **`version`** increments on **every row** — including drafts the founder redrafts or never confirms.
- **`epoch`** increments only when a **new mandate supersedes a confirmed one**. Drafting does not burn an epoch.

> draft `v1 e1` → redraft `v2 e1` → founder confirms `v2 e1` → later change → `v3 e2`.

**Why this needed deciding:** four documents state *"a new version **=** a new operating epoch"* as an identity (CLAUDE.md §0, ADR-003, PRD §4, Featureinventory F08) while PRD §8's schema gives **two columns**. Taken literally they are always equal — the same fact in two places, which CLAUDE.md §4 names a red flag ("no value defined in three places") and which *will* drift the first time someone updates one and not the other.
**Why this reading:** ADR-003's own rationale is *"a coherent 'what were we operating under, when'"* — that is the **epoch**, an operating period, not a row counter. Story 2's Assets and Briefings can be stamped with the epoch that governed them. And a founder redrafting before they commit should not consume an epoch — nothing was operating under a draft.
**Cost:** the two numbers diverge, so neither can be inferred from the other. That is the point.
**Rejected:** dropping `version` (loses redraft history); keeping both always-equal as the PRD literally reads (CLAUDE.md §4 — one fact, one column).
**Consequence:** `epoch` is what the founder and the audit trail care about; `version` is bookkeeping.

## ADR-023 — The mandate composes through the same Composer, but is not a Program 🔒
**Decision:** `lib/prompts/compose.ts` gains a second entry point, `composeMandatePrompt()`, for S001/S002. Same module, same discipline — fixed order, validation, source refs, Company Context fenced as data. It is **not** a second Composer (CLAUDE.md §0.2); it is the same one, which is what ADR-013 requires ("mandate generation runs through the same Prompt Composer and Execution Engine").
**Why not model the mandate as a Program** — the decisive argument: **ADR-008 makes the Rhythm run every contract-active Program, every cycle.** A Contract-generation Program would therefore **regenerate the founder's mandate weekly**, directly contradicting *"the founder confirms — once"* (ADR-002) and *"Contracts are immutable"* (ADR-003). Escaping that would need a `runsWhen`-style exception, which ADR-008 forbids. Modelling the mandate as a Program is not awkward — it is wrong.
**Shape:** the workbook's Executive Registry lists S001/S002 as the CEO's **System Prompt Refs**, one per function ("Strategy", "Executive Contract"). So a mandate package is *Executive System Prompt (S002) + Company Context* — layers 1 and 4. Layers 2 and 3 do not apply: S002 states outright *"This prompt does not create management assets or actions."*
**Cost:** two entry points into one module; a mandate package has two layers, not four.
**Rejected:** Programs for the CEO (above); making `programId` optional on `composePrompt` (pushes an "is this a mandate?" branch into every validation rule of the one function everything depends on).

## ADR-024 — Asset versions: execution ref deferred, writes server-side only 🔒
**Decision (Story 2 / F11, `asset_versions`):** three linked calls.
1. **Execution ref is a caller-supplied UUID with no foreign key yet.** `asset_versions.execution_id` records which run produced a version, but the run table (`operating_rhythm_runs`) is built by **F10, later**. The column is a bare nullable `uuid`; the FK to `operating_rhythm_runs(id)` is **added in F10's migration**. "Valid execution reference" (F11 UC-11 step 2) is enforced instead by a biconditional CHECK — `(authored_by='founder') = (execution_id is null)` — plus a partial unique index on `(asset_id, execution_id)` for the "no duplicate persist per execution" rule. So F11 builds and tests standalone; F10 adds referential integrity without reshaping anything.
2. **The write path is server-side only.** The persistence validation gate (Asset in the Registry · belongs to the correct Program/Executive · structure) is TypeScript — the Registry is code, not data (ADR-010) — so it cannot be a database constraint and must be un-bypassable. Therefore `asset_versions` is **read-only for `authenticated`** (a single `SELECT`-own policy; no insert/update/delete policy), and `persist_asset_version` is **revoked from `authenticated`, granted to `service_role`**. All writes flow route → verifyAuth → gate → service-role client → function. This closes both the direct-table-INSERT and the PostgREST-RPC bypass.
3. **Atomic retire+insert via a transactional function.** `persist_asset_version` retires the current version and inserts the new one in one transaction — strengthening the app-level retire-then-insert `strategy_sessions` uses, which has a crash window that can leave zero current versions (recorded as FU-002).
**Why:** an audit trail (`authored_by`, provenance) that a founder can forge is not an audit trail; and a validation gate that a direct write skips is decoration. The database still enforces one-current, sequential, dedupe, immutability, and the execution biconditional for **every** writer including the service role — only the Registry checks depend on the gate, and the gate is now the sole write path.
**Also settled:** `content` is a single `jsonb` column (markdown stored as a JSON string, json as an object; `outputSchema` tells consumers which) — PRD §8 schema intact. The Executive is **derived** via `getProgram(asset.program).owner` (an `AssetDef` has no `executive` field), stored in `executive_id`.
**Cost:** F11 diverges from `strategy_sessions` (user-scoped writes) — asset writes are service-role. Justified by the un-DB-enforceable Registry validation; documented in the migration header.
**Rejected:** an FK to a table that doesn't exist yet (would block F11 on F10); user-scoped asset writes (reopens the gate bypass); moving Registry validation into the database (impossible — ADR-010); a separate `assets` + `asset_versions` split (one versioned table suffices).
**Related:** ADR-005 (F11 never moves the Q-Score — tested), ADR-006 (no Asset Review), ADR-007 (founder edit → new current version, `authored_by='founder'`, no approval), ADR-010, ADR-021 (the same RPC-exposure class applies to `confirm_executive_contract` — FU-001).

## ADR-025 — Briefings are per-Program append-only rows; a digest is a view, not a schema 🔒
**Decision (Story 2 / F12, `executive_briefings`):**
1. **One briefing per Program per run, append-only.** This resolves the open question — *"Whether Briefings aggregate into one digest when several Programs are active"* (previously Open / "decide during Story 2"). Store **per-program rows**: the schema's `program_id`, F12's acceptance ("one Briefing per Program run"), and the plural read API all point here. **A digest is a *view* over these rows, not a different storage shape** — if founders ever want one (only relevant with several active Programs; the P001 pilot has one), it is rendered later with no migration. So per-program is the correct foundation regardless. Briefings are never edited or removed: no `version`/`is_current`, a plain insert, and a trigger rejecting UPDATE **and** DELETE (CLAUDE.md §4 append-only, stricter than `asset_versions`' retire-only rule).
2. **Execution ref deferred (as F11).** `execution_id` is a bare `uuid` with no FK — the run table (`operating_rhythm_runs`) is F10's. Idempotency ("one briefing per Program run") is a partial unique index on `(program_id, execution_id)`; the FK lands in F10.
3. **Epoch stamped via `contract_id`.** ADR-022 says briefings carry the epoch, but PRD §8's briefing schema omits the column. Added `contract_id uuid references executive_contracts(id)` (nullable, set by the writer); epoch derives from the immutable contract — single source, no duplicated int.
4. **Writes server-side only, no RPC.** The table is read-only for `authenticated` (a single `SELECT`-own policy; no write policy → direct writes RLS-denied); the rhythm writes via the service-role client. A single insert is already atomic, so unlike F11 there is no function to expose or revoke.
5. **F12 ships the store + the generator + read API + the surfaces (F09 panel, F04 card).** The generator (`lib/briefings/generate.ts`) composes through a new Composer entry point `composeBriefingPrompt` (F06; ADR-023's several-entry-points pattern), runs the LLM (`routedText`, mirroring F08b), and persists. **The briefing structure is *generic*, defined in the Composer** — not a per-Program Registry field — the smallest thing that works (CLAUDE.md §7); a `briefingRef` can be added later like `AssetDef.instructionsRef` if a Program needs a bespoke shape. F10 only *calls* `generateBriefing` once per active Program per cycle. Two edge cases live in the generator: **no material change → a short deterministic briefing (no LLM call), never silence**; **generation fails → no briefing row is written and the run's Asset versions stay intact** (the failed *stage* is recorded on F10's run record, not on the briefing — the briefing table has no status). The model writes the narrative; the **database supplies the authoritative Asset links** (`body.changedAssets` from `asset_versions`), so provenance can't be model-invented. *(This corrects an earlier draft of this ADR that placed generation in F10 — `prompts/STORY_2_F12.md` scopes the generator into F12.)*
**Why:** briefing volume/fatigue (ADR-008) is a *rendering/frequency* concern, not a reason to fold the data model into a lossy digest up front — per-program rows keep every run's record and let a digest be an additive view. Append-only matches ADR-003 (briefings are preserved history across epochs).
**Cost:** with several active Programs, N briefings per cycle — mitigated by keeping the active set small in the pilot (ADR-008), and by an optional future digest view.
**Rejected:** a single aggregated digest row per cycle (lossy — can't retrieve one Program's briefing in order, contradicts F12 acceptance; and it's derivable as a view anyway); an FK to `operating_rhythm_runs` now (blocks F12 on F10); a duplicated `epoch int` column (two sources of one fact — CLAUDE.md §4).
**Related:** ADR-008 (rhythm runs all active Programs → the "volume" this addresses), ADR-022 (epoch stamping), ADR-024 (F11's sibling deferral + server-side-write pattern), ADR-005 (F12 never moves the Q-Score — tested).

## ADR-026 — The Operating Rhythm is internal-only in v1, doubly inert, idempotent 🔒
**Decision (Story 2 / F10, `operating_rhythm_runs` + `lib/rhythm/**`):**
1. **v1 writes only internal, reversible state** — new Asset versions (F11) and Briefings (F12), plus the run record. **No external Actions, sends, spend, or Connectors** — those are Story 3 (F13/F14), explicitly tagged "(Story 3)" in UC-10 step 4. So ADR-004's irreversible-action approval gate is never reached inside a cycle, and a cycle runs unattended (ADR-002).
2. **Idempotent by construction.** The run row is created **first**, keyed `unique(founder_id, cycle_key)` (`cycle_key` = ISO week `YYYY-Www`). A duplicate trigger fails at the insert (`23505` → `CycleAlreadyRanError`) **before any LLM spend** — "never run the same cycle twice" (US-10.2, CLAUDE.md §4).
3. **Mandate integrity is enforced twice.** The loop only iterates `getProgramsForContract` filtered to `status='active'` on the *confirmed* contract (a draft mandates nothing); and `composePrompt` independently rejects a Program not in `activePrograms` (ADR-008 — the Contract decides, the rhythm runs *all* active Programs, no `runsWhen`).
4. **No autonomous spend is switched on by shipping F10.** Everything is behind `FF_NEW_EXECUTIVE_MODEL` (off) — the manual `POST /api/rhythm/run` 404s, the cron `GET /api/cron/rhythm` no-ops. The cron is **doubly inert**: flag off **and** `CRON_SECRET` fail-closed (503 if unset, ADR-017). Registering it in `vercel.json` therefore spends nothing until the flag is on **and** a secret is set — a deliberate future pilot decision, flagged to Mo, not a side effect of the build.
5. **Resilience + the failed-stage contract.** Per-program try/catch: one Program's failure records a stage error and **blocks its dependent Briefing**, but the other Programs still run; the run ends `failed` (with `stages` jsonb showing exactly what happened) rather than aborting. The LLM step retries once ("retry within limits", UC-10 step 5).
6. **The asset-content generator (`judge.ts`) is the new piece** F11 deferred — compose (F06) → `routedText` → parse per `outputSchema` → `persistAssetVersion(authored_by='program')`, mirroring `generateMandate`/`generateBriefing`. Nothing in `lib/rhythm/**` calls the score signal (ADR-005, tested).
**Cost:** v1 runs **sequentially** (parallelism where dependencies allow is a deferred optimisation — correctness first) and omits the Q-Score from the compose context (additive, noted in `F10_DESIGN.md`).
**Rejected:** enabling the cron / auto-spend as part of the build (must be an explicit pilot decision); `runsWhen` event-skipping (ADR-008 forbids it in v1); running from a *draft* mandate; folding external Actions in (Story 3); an `execution_id` FK that predates this table (it lands here, closing ADR-024/025's deferral).
**Related:** ADR-002, ADR-004, ADR-006, ADR-008, ADR-017, ADR-024, ADR-025.

## ADR-027 — A failed rhythm cycle is retryable; a successful one is not 🔒
**Decision (Story 2 remediation, B5):** `createRun` inspects the existing run for `(founder,
cycle_key)` before inserting: **`completed` → rejected** (the once-a-week guarantee, unchanged) ·
**`running` → rejected** (never race a live run) · **`failed` → the stale run row is deleted and a
fresh run created.** The delete is status-guarded (only if still `failed`) and two concurrent
retries still serialize on the unique constraint at the insert — so idempotency for successful
runs is not weakened.
**Why:** without this, any transient failure (LLM outage, timeout) stranded the founder with a
half-written week and no recovery until the next ISO week. An idempotency rule that blocks
*recovery* protects the mistake, not the founder.
**Amends ADR-026 (deliberately):** the run record is audit history for *completed* cycles; a
**failed** run row is operational state, not history — its deletion is the retry mechanism. What
IS preserved regardless: every asset version and briefing the failed run produced (append-only
tables; their `execution_id` links go null via `on delete set null`, the content remains).
**Known limitation:** a run *crashed* mid-cycle (stuck `running`) still blocks its week — a
staleness rule is FU-004, deferred so a live run can never be cleared by accident.
**Rejected:** upsert/reset-in-place of the failed row (an UPDATE-based reset invites partial
state to leak into the new run; delete-and-recreate is unambiguous); auto-clearing `running`
(race with a live run); keying idempotency on "a completed run exists" only (would allow
unbounded concurrent attempts while none has completed).

## ADR-028 — A cycle is fed by a founder-activity delta; unchanged assets are not regenerated 🔒
**Decision (B8, Option 1 — Mo, 20 Jul 2026):** each Operating-Rhythm cycle builds a **delta
digest** of founder activity since the last *completed* run — direct Asset edits (ADR-007),
Company Builder uploads/artefacts, Q-Score changes, metric snapshots — and feeds it to judgement
as the Composer's "New Information This Cycle". **An asset that already exists and has no new
input is not regenerated** (relevance is cycle-level in v1); a missing asset is always generated.
With nothing new, the cycle publishes the honest "no material change" briefing — which this
decision makes **reachable** for the first time (previously the engine regenerated
unconditionally, so that path was decorative and every briefing reported model variance as
change).
**Amendment to ADR-008 — explicit, not a side note (Mo's first amendment):** ADR-008 governs two
levels that this decision now separates. **Program-level scheduling stays unconditional** — the
rhythm still runs every contract-active Program, every cycle, on the calendar; no `runsWhen`,
exactly as ADR-008 locked. **Asset-level regeneration becomes conditional** on the delta. ADR-008
is hereby amended to say so rather than pretending the skip lives outside it.
**Open question for the pilot (Mo's second amendment):** every signal in the digest requires
*founder action*. A passive founder therefore produces honest no-change briefings — correct, but
it means the system is only as alive as its founder. Whether an **autonomous external signal**
(market news, competitor moves, connected-account data) is needed to give a passive founder a
reason to return is deliberately left open until the pilot shows how often real founders go
quiet. Do not build it pre-emptively.
**Why:** without new inputs, cross-cycle "improvement" is temperature-0.3 variance — Story 2's
exit criterion was unmeetable and week-4 retention indefensible (see `B8_DECISION.md`). The
criterion's honest restatement: *cycle N+1's assets demonstrably incorporate founder signal from
week N.*
**Cost:** reads of three old-model tables (read-only — the freeze and ADR-005 are intact); a
quiet week produces a briefing that says so rather than fresh-looking documents.
**Rejected:** event-driven cycles (Option 2 — reopens ADR-008's scheduling level for little
gain); repositioning the claim instead of fixing the feed (Option 3 — measures the wrong
product); per-asset relevance mapping in v1 (over-engineering before pilot data).
**Related:** ADR-007 (the edit signal, consumed as designed), ADR-008 (amended as above),
ADR-009 (Story 3's Action outcomes join the digest later — the minimal Outcome-Loop slice),
ADR-026/027.

## ADR-020 — Action is the genus; "cadence" is a frequency, not an entity 🔒
**Decision:** an **Action** is any operational work a Program generates. It is **one-off or recurring** — `ActionDef.kind: 'oneoff' | 'recurring'` (PRD §7.1, the authoritative runtime type). A **cadence** is **not a thing that executes**: it is the *frequency* of a recurring Action, a value such as `'weekly'` stored in `scheduled_actions.cadence` (PRD §8).

> One-off Action · recurring Action · a recurring Action **has** a cadence. There is no "Cadence" entity.

**Why (this settles the Roadmap's own question, and rejects its framing):** `Roadmap.md:47` and `PRD §12` pose the task as *settle "action" (one-off) vs "cadence" (recurring)* — which reads as two **sibling entities**. That framing is rejected, because:
1. **It contradicts the authoritative type.** `ActionDef.kind: 'oneoff'|'recurring'` already makes recurrence a *property* of an Action. Siblings would need a second `CadenceDef` shape and a second execution path — CLAUDE.md §0.2 ("one of each") and §0.1 ("config over code").
2. **Safety — the real argument.** ADR-004: *"every **irreversible Action** requires just-in-time approval."* If a cadence were a separate entity, that rule would not obviously bind it, and a recurring send could slip the gate on a technicality. One genus ⇒ ADR-004 covers recurring work **for free**, with no second rule to keep in sync. `PHASE0_AUDIT.md` §6 shows this is not hypothetical: the outreach path already schedules future sends via `schedule_followup` with **no approval**, because it sits in `EXEC_TOOLS` and not `APPROVAL_REQUIRED_TOOLS`.
3. **The data model already says so.** `cadence` is a `text` **column**, not a table (PRD §8). Entities get tables; values get columns.

**The word was doing three jobs** (Phase 0 audit): a recurring entity (`Roadmap:47`), a frequency column (`PRD:427`), and the rhythm's schedule (`PRD:537`, *"Rhythm cadence configuration"*). Senses 2 and 3 are the same idea — a frequency — and both survive. Sense 1 is retired.

**Consequences:** `Featureinventory.md` F14.3/UC-14.5 should read *"recurring **Actions** extend `scheduled_actions` (`cadence`, `next_run_at`)"*, not *"recurring cadences extend…"*. "Rhythm cadence configuration" (PRD §14.1) stays — it is sense 3, and correct.
**Cost:** one Roadmap line is now non-normative. Recorded here rather than silently overridden.
**Rejected:** action/cadence as siblings (above); dropping "cadence" entirely (clearer, but churns the data model and discards a word already in three docs for no safety gain).

## ADR-021 — The connector namespace is `connectors`, not `connections` 🔒
### ⚠️ The TABLE NAME half is **superseded by ADR-031** (`connector_grants`). The ROUTE half stands.
**Decision (route half — still binding):** connector routes live at **`app/api/connectors/**`** —
e.g. `POST /api/connectors/:provider/oauth`.
~~**Table:** `connector_connections`.~~ → **`connector_grants`** (ADR-031, 3 Aug 2026).
**Why:** the documented path (`/api/connections/:provider/oauth`, table `connections`) **collides with a live feature**. `app/api/connections/route.ts` already exists and serves founder→investor intro requests against the `connection_requests` table. Two different meanings of "connection" on one path is how outages get made. `connectors` also matches the `/connectors/gmail/send` nomenclature already used in the PRD's own connector section.
**Status:** 🔒 **resolved 3 Aug 2026.** The route namespace was confirmed as adopted; the table
name was settled by ADR-031, which chose `connector_grants` over BOTH `connector_connections`
and Roman's "mandate". No longer pending anyone. No code depended on either name, so the rename
cost nothing — which was the whole point of deciding it before Story 3 Stage A rather than after.
**Cost:** none realised — the divergence this ADR flagged was closed before any code was written.
**Rejected:** reusing `/api/connections` (collides with live routes); renaming the existing founder→investor flow (churns working product to free up a word).

## ADR-017 — One freeze exception: security guards may be fixed in place 🔒
**Decision:** the freeze on `features/agents/**` and `app/api/agents/**` (ADR-014, CLAUDE.md §0.4) does **not** cover a fix that restores a security invariant CLAUDE.md §3 already mandates. Such a fix must be minimal, reviewed, and recorded here.
**First and only application:** `app/api/agents/atlas/weekly-scan/route.ts:210` — the cron auth guard read `if (cronSecret && authHeader !== …)`, which **fails open**: with `CRON_SECRET` unset the route was fully public and would spend paid Tavily budget across up to 500 founders. Changed to `if (!cronSecret || …)`. One word.
**Why:** "frozen" means *stop adding capability*, not *preserve a known security hole for months*. Five of the six `CRON_SECRET` consumers already fail closed — this was an oversight, not a design choice. See `PHASE0_AUDIT.md` §2, §7a.
**Cost:** a precedent that could be stretched. Bounded by: security invariants only, minimal diff, an ADR entry each time.
**Rejected:** leaving it until the old model is deleted (leaves an unauthenticated spend endpoint one config change away from live); deleting the cron from `vercel.json` (removes a live feature to avoid a one-word fix).
**Related:** `CRON_SECRET` is only *recommended* in `lib/env.ts:63-67` — the app boots without it. Consider promoting it to *critical*.

## ADR-018 — The strangler boundary is wider than the agents folder 🔒
**Decision:** artifact creation is **not** confined to `app/api/agents/**`. Two live paths sit outside the frozen tree and are **in scope** for the new model's parity checklist:
- `app/api/investor/startup/[id]/memo/route.ts:155` — writes `investment_memo`.
- `features/founder/services/metrics.service.ts:46` — a **client-side, browser-side** insert of `financial_summary`, stamped `agent_id: felix`, with no API route, no server-side validation and no Zod.
**Why:** every doc assumed freezing `app/api/agents/**` freezes artifact creation. The audit refuted this. Left unrecorded, Story 1+ would reach "parity" while two creation paths continued writing outside the model.
**The sharp edge:** `metrics.service.ts` writes founder-typed numbers attributed to Felix. `app/api/investor/startup/[id]/route.ts:137,178` then surfaces them to investors as agent output. `content.source: 'manual'` is written (`:43`) but **read by nothing**. This is the live instance of the "verified vs self-reported" problem, and the reason **ADR-007's `authored_by` must be a first-class column with real consumers** — not a JSONB field, which is exactly the shape that got ignored here.
**Cost:** a wider migration surface than planned.
**Rejected:** treating both as out of scope (leaves the provenance hole permanently, and lets "parity" be declared falsely).

## ADR-019 — "Reuse the engine" means *present*, not *proven* 🕒
**Decision:** ADR-014 stands — we still build on the existing engine. But the docs imply that engine is battle-tested, and **it is not**. Anything reused must be treated as **unverified until it has a passing test**, not as a working foundation.

**Verified state (Phase 0 audit, 15 Jul 2026):**

| Component | Docs say | Actually |
|---|---|---|
| `lib/agents/task-graph.ts` (389 lines) | CLAUDE.md §0.3 "reuse, don't fork" | **Zero callers.** `executeTaskGraph:253` has never executed in production |
| `lib/actions/executor.ts` (228 lines) | CLAUDE.md §0.3 "reuse, don't fork" | **Zero callers.** `executeAction:174` has never executed |
| `features/qscore/**` | "Keep, untouched" · "reuse" (Architecture.md §11) | Live and exercised. 6 failing tests — **triaged: all stale, the score is correct** (see below) |
| Jest suite (8 files) | CLAUDE.md §7 "Demand tests" | **Never runs in CI.** Failing invisibly for an unknown period |

**Q-Score triage outcome (15 Jul 2026): the engine is exonerated.** All six failures are stale tests, not defects — the formula moved v1→v2 (constant→dynamic denominator), the LLM layer migrated to `lib/llm/router`, and P6 gained SaaS-default estimation. In each case the code was improved and documented; the tests were left behind. `features/qscore` is therefore **genuinely reusable**, as the docs claim. Detail: `PHASE0_AUDIT.md` §8.

**Why this is an ADR and not just an audit note:** PRD §1 justifies the plan with *"~two-thirds of the machinery exists but is wired to the wrong shape."* That sentence is doing real work — it is why this is scoped as *mostly refactoring*. Two of the named modules have never run, and the third has failing tests. **Existing ≠ working.** Story 1+ must not assume otherwise.

**What this does NOT change:** the reuse decision itself. Unexecuted is not the same as broken, and rewriting from scratch is worse. `delegation.ts`, `orchestrator.ts`, `lib/tools/executor.ts` and `lib/llm/router.ts` **are** live and exercised.

**Consequences:**
1. Q-Score triage is timeboxed and happens **before Story 1** — it feeds the mandate and is what ADR-016 measures.
2. First reuse of `task-graph.ts` or `lib/actions/executor.ts` carries a test, and is estimated as new code.
3. Jest becomes blocking in CI (Phase 0 Step 6) so this cannot recur.

**Revisit trigger:** if triage shows the Q-Score calculator is genuinely miscomputing, that is a P0 on its own — it means live founder scores are wrong.
**Rejected:** re-opening ADR-014 on this evidence (unexecuted ≠ broken); leaving it in the audit only (the PRD's premise would stay uncorrected).

## ADR-015 — Engineering invariants (non-negotiable) 🔒
Generic routes (never per-agent) · immutable Asset versioning with provenance · idempotent rhythm cycles · a shared Connector abstraction · runtime validation on composition and persistence · RLS on every table · immutable audit logging (`action_log`) · secrets by reference only. See `CLAUDE.md`.

## ADR-016 — Success is week-4 retention, not documents shipped 🔒
**Decision:** the go/no-go for widening is whether the pilot cohort returns in week 4, plus one founder completing the full loop (mandate → cycles → improving Assets → Briefing → approved Action executed).
**Why:** AI-native products churn fast (~40% GRR); shipping features nobody returns to is failure dressed as progress.
**Cost:** we may pause expansion — by design.
**Rejected:** measuring success by Programs built or Assets generated.

---

## ADR-029 — The ~300-line file limit applies to code; prompt-content modules are exempt 🔒
**Decision (CODEBASE_AUDIT Q-3, actioned 27 Jul 2026):** CLAUDE.md §0.5's *"~300 lines max per
file"* governs **modules containing logic**. A **prompt-content module** — one that exports
prompt prose and **contains no functions, no branching and no logic of any kind** — is exempt and
should be kept whole. Today that means `lib/prompts/programs/p001.ts` (1,010 lines),
`lib/prompts/knowledge/*.ts` and `lib/prompts/assets/as00N.ts`.
**Why:** these files are one continuous document written for a model to read. Splitting them at
an arbitrary line count would scatter a single argument across files and make the prompt harder
to review, which is the opposite of what the rule protects. The rule exists to stop *logic*
becoming untraceable; prose has no control flow to lose.
**The condition is load-bearing, not decorative:** the moment such a file gains a function, a
conditional, or any exported behaviour, it is code again and the limit applies in full. "It's
mostly a prompt" is not a defence.
**Why it's written down:** the exemption was already being applied in practice but existed
nowhere. Undocumented, the next person either splits `p001.ts` pointlessly or cites it to justify
a 1,000-line file that genuinely *is* logic. Story 3's Connector prompts are the first new thing
to test this rule.
**Rejected:** raising the global limit (it would license large logic files); mechanically
splitting the prompt files (harms the artefact the limit is meant to protect).

---

## ADR-030 — The Operating Rhythm's self-triggering chain carries a hard step ceiling 🔒
**Decision (27 Jul 2026):** the chunked rhythm chain fails its run once `step_count` reaches a
ceiling derived from the run's own Programs (`lib/rhythm/limits.ts`), recording
`failure_reason = 'step_limit_exceeded'`. **A run stopped this way is NOT auto-retried** —
`createOrResumeRun` refuses it instead of clearing and restarting.
**Why:** every step is a paid Claude call that schedules the next one. A bug in "what's next"
would bill forever, and the in-process `runCycle` loop would do it faster and more quietly than
the HTTP chain. The counter therefore lives in **its own column, claimed before any generation**
— never in the `stages` jsonb, because the failure being guarded against is precisely one where
`stages` stops advancing, which would freeze a counter stored there too.
**Cost, accepted deliberately (Mo, 27 Jul):** a tripped week is lost until a human clears it.
Allowing one automatic retry would halve the protection and, in a genuine runaway, double the
bill. A fuse that resets itself is not a fuse.
**Scope, stated honestly:** it bounds *steps*, not tokens — `judge.ts` retries once internally,
so the true ceiling in model calls is up to ~2×.

---

## ADR-031 — The Connector layer's table is `connector_grants` 🔒
**Decision (Mo, 3 Aug 2026):** Story 3's Connector table is named **`connector_grants`**. It
stores, per founder, that they have granted the system permission to act through a connector —
the provider, the scopes, and a `token_ref` pointing at the secrets manager. **Never the token
itself** (CLAUDE.md §3).
**Why this name, over the two alternatives that were live:**
- **`connections` / `connector_connections` — rejected.** `connection_requests` already exists
  for founder↔investor intros, alongside `investor_contacts` and `investor_pipeline`. A future
  engineer reading "connections" would reasonably assume investor matching. Near-synonyms across
  two subsystems is precisely the confusion the rewrite exists to remove.
- **`mandate` (Roman's suggestion) — rejected, with the reasoning recorded because the instinct
  was sound.** It does describe the thing: the founder authorises action on their behalf. But
  "mandate" already means the **Executive Contract** (ADR-002/ADR-003), and that meaning is
  load-bearing — mandates are immutable and changing one opens a new epoch. Two meanings for one
  word, where one of them carries strict rules, is how a correct reading of the docs produces a
  bug.
**Why `grants` is right rather than merely free:** a grant is *given* and can be *revoked*, which
is exactly the lifecycle of connector authority — and it matches the base-privilege sense already
used in `20260727000002`. The name carries the semantics instead of just avoiding a clash.
**Consequence:** unblocks Story 3 Stage A. `action_log` (the append-only record of every
irreversible attempt) is unaffected and keeps its name. The old-model tables
(`pending_actions`, `agent_actions`, `tool_execution_logs`) are **not** to be repurposed for
either — see `SCHEMA_DRIFT.md` §5.

---

## ADR-032 — Connector secrets live in Supabase Vault; the database stores only a `token_ref` 🔒
**Decision (Mo, 3 Aug 2026):** third-party credentials (Gmail OAuth refresh tokens first) are
stored via **`vault.create_secret()`**, which returns a uuid. **That uuid is the `token_ref`**
held in `connector_grants`. Resolution happens **server-side only**, through
`vault.decrypted_secrets`, from a service-role path. CLAUDE.md §3's "secrets by reference only"
finally has an implementation.
**Verified before deciding, not assumed** (local Supabase, 3 Aug):
- `supabase_vault` 0.3.1 is **installed**, with `create_secret` / `update_secret` / decrypt.
- A raw dump of `vault.secrets` yields **ciphertext only** — the token is not recoverable from a
  database dump, which is the F13 acceptance criterion.
- **`authenticated` has neither `USAGE` on the `vault` schema nor `SELECT` on
  `vault.decrypted_secrets`** (both false). This is the load-bearing part: even if RLS on
  `connector_grants` were misconfigured tomorrow, a founder who obtained a `token_ref` still
  could not resolve it. Two independent failures would be required, not one.
**Why Vault over the alternatives:**
- **App-level envelope encryption — rejected.** It moves the problem rather than solving it: the
  master key lives in an env var, and we would own rotation, versioning and re-encryption. More
  code, more to get wrong, no vendor removed (Postgres is already trusted with the data).
- **External KMS (AWS/GCP) — rejected for now.** Stronger isolation and a better audit trail, but
  a new vendor, new credentials and a new failure mode, for a pilot that has not yet proven
  retention (ADR-016). Revisit if the pilot succeeds and the connector surface widens.
**Explicitly rejects the existing precedent.** `linear_tokens.api_key` (`20260225000007`) and
`founder_profiles.{calendly,posthog,fireflies}_api_key` (`20260700000001`) store credentials
**plaintext**, and `linear_tokens`' RLS (`for all using (user_id = auth.uid())`) lets the browser
read the raw key. Those are old-model and frozen (ADR-014); the new model must not copy them.
**Cost, stated honestly:** Vault ties the secret store to Postgres, so a database compromise with
key access is not defended against — that is what a separate KMS would buy. Recorded so the
human security review (a Story 3 ship gate) evaluates a known trade-off rather than rediscovering
it.

---

## ADR-033 — A reservation is not a send, and a held slot is never released 🔒

**Date:** 4 Aug 2026 · **Status:** Locked · **Trigger:** the first real emails, Story 3 Stage D

`executeApprovedAction` claims an idempotency slot before calling the provider. It originally
claimed it as `status='executed'`, which produced three live defects that 621 passing tests could
not see — every test mocked the provider boundary that was wrong:

1. the audit log recorded sends that never happened;
2. a failed send blocked its own `(action_id, execution_id)` slot permanently, so a legitimate
   retry became impossible;
3. worst — the attempt that genuinely *sent* then collided with its own reservation on the unique
   index, failed to record the outcome, and reported a refusal. **The email went out and the log
   denied it.** Latent until an `execution_id` was present, because the index is partial on
   `execution_id IS NOT NULL` and the first send had none.

**Decision, two parts:**

**(a) Reserve as `sending`, and let the index guard `sending` only.** The reservation states "I
hold this slot", not "this was delivered". The outcome row — `executed`, `failed` or `unknown` —
lands beside it. Idempotency is unchanged: the reservation row is never removed (the table is
append-only), so it holds the slot permanently and a second click still loses at the database.

**(b) A held slot is NEVER released, even after an apparent failure.** We cannot reliably
distinguish "the provider never accepted it" from "the provider accepted it and the connection
dropped". Releasing on a wrong guess sends the email **twice**; holding on a wrong guess sends it
**zero** times. Zero is the recoverable one — the rhythm regenerates the Action next cycle against
a fresh `execution_id`, which is a fresh slot and a fresh approval.

**Accepted cost:** a founder whose send genuinely failed waits one cycle. Named explicitly in
`SECURITY_REVIEW_PACK.md` §7 so the human reviewer evaluates a known trade-off rather than
discovering it.

**Corollary — our faults and Google's refusals are different facts.** A `not_configured` error
raised on our side must not mark a founder's grant `expired`; only a refusal *from Google* means
the grant is dead. A script run without the client env once killed a working connection, which
means a deployment typo would have told every founder to reconnect.

**The wider lesson, recorded because it outlives this ADR:** the mocked boundary *was* the
security boundary. Three of Story 3's four defects were found by sending an actual email, not by
the test suite. Assurance about the Connector layer that rests only on mocks should be treated as
weaker than assurance elsewhere in this codebase.

---

## ADR-034 — The adviser layer is deleted, not frozen 🔒

**Date:** 4 Aug 2026 · **Status:** Locked · **Supersedes:** ADR-014 (the strangler freeze)

**Decision (Mo):** delete the old adviser layer outright — `features/agents/**` (99 files),
`app/api/agents/**` (173 routes), `app/founder/cxo/**`, `components/cxo/**`, `lib/cxo/**`,
`app/founder/workspace`, `app/apply/**`, and the orphaned half of `lib/agents/**`. **288 files,
roughly 67,000 lines.** The repo went from 903 TypeScript files to 615.

**Why now, when ADR-014 said "delete only after parity":** ADR-014 protected *live users*. There
are none — the Executive model has never been switched on in production, and the old product has
no cohort to break. The condition the freeze existed to satisfy is vacuous, so the freeze was
costing organisation without buying safety. Mo took the call explicitly.

**Sequencing, which was the real decision:** the door first, then the deletion. The Executive
model had no entry point (see the ExecutiveEntryCard commit), so deleting the old product first
would have left a window with **no reachable product at all** — the old one gone, the new one
invisible. Building the door first meant a working product at every point.

**What was kept, and why:**

- **The `agent_*` tables.** Deleting code is reversible in git; deleting founder data is not.
  `lib/rhythm/delta.ts` also still reads `agent_artifacts` to compute what changed since the last
  cycle. Dropping the tables is a separate decision, deliberately not taken here.
- **`features/qscore/**`.** The PRD keeps the Q-Score as a separate diagnostic. Its one tie to
  the advisers, `generateAgentRecommendations`, was **dead code with zero consumers** — the whole
  dependency was holding a door open for nothing.
- **`lib/agents/{deal-flow-alerts,orchestrator,context,context-compressor}.ts`** — still imported
  by the live profile-builder route and the surviving test suite.

**What the deletion actually cost in rewiring**, recorded because it is the part that would be
underestimated next time: 288 files deleted broke only **6** files at the type level. The real
tail was **28 string references across 16 files** — nav items, CTA links, four buttons inside the
Monday founder email — none of which the type checker or 636 tests could see. A dead `href` is a
404 a founder finds, not a build error. **"It compiles" is not "it works" when the coupling is a
URL.**

Two were worse than dead links: `/api/agents/agent-goals` was still fetched on every dashboard
load, and the old approval inbox PATCHed a deleted route — the founder would have clicked
Approve, watched the item disappear, and had nothing recorded. That is precisely the failure F14's
approval gate exists to prevent, and it does not get to survive as a ghost of the old model.

**Consequences:**
- `CLAUDE.md` rules 0.3, 0.4 and §8 rewritten — they described frozen folders that no longer exist.
- Q-Score recommendations and five dashboard surfaces now point at `/founder/executive`.
- The sidebar's "CXO Suite" (badge: 9 advisers) is now **"Executive team"** — the primary door.
- There is no adviser chat surface, and there must not be one again. The Executive model works to
  a mandate; it does not wait to be messaged.

---

## Open (non-blocking)

- Rhythm cadence configuration (weekly default — per-company override?). *Decide during Story 2.*
- Which Executive/Program follows P001. *Decide after the retention gate.*
- ~~Whether Briefings aggregate into one digest when several Programs are active.~~ **Resolved (ADR-025):** per-Program rows; a digest is a later view, not a schema change.

**Operational (owner: Mo, outside this doc):** InnoSphere-owned accounts + migration off personal accounts · a quality-management/review agenda · a human security review of the Connector layer before Story 3 ships.

---

## How to use this log

- Before re-arguing a decision, check here. If it's 🔒 and there's no *new evidence*, don't re-open it.
- When something genuinely changes, add a new ADR that supersedes the old one (mark the old "Superseded by ADR-N") — never silently rewrite history.
- Any new permanent constraint — something the team would refuse to violate under deadline — belongs here, in this format.
