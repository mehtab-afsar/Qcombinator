# F10 — Operating Rhythm Engine · Design

*The last piece of Story 2: the weekly loop that ties F11 (Assets) and F12 (Briefings) together.
Design + safety plan. No external actions, no autonomous spend enabled — see §Safety. Behind
`FF_NEW_EXECUTIVE_MODEL` (off).*

## What a cycle does (PRD §7.4, UC-10)

For one founder, once per week:
1. **Create one run row** (`operating_rhythm_runs`) keyed `(founder_id, cycle_key)` — **fail-fast if
   it already exists** (idempotent: "never run the same cycle twice", US-10.2). This happens
   *before* any LLM work, so a duplicate trigger costs nothing.
2. Load the founder's **confirmed Contract** and its **active Programs**.
3. **For each active Program**, for each Asset the Program maintains (`getProgram(t).assets`):
   **judgement** — compose via F06 → LLM → parse → **write a new Asset version** (F11,
   `authored_by='program'`, `executionId = run.id`). Then **publish a Briefing** (F12,
   same `executionId`).
4. Record each stage in `stages jsonb`; a Program whose asset stage fails **blocks its own
   briefing** and is marked failed, but **other Programs continue** (per-program try/catch).
5. Finish the run: `status = 'completed'` if all clean, else `'failed'` (with `stages` showing
   exactly what happened); set `completed_at`.

**The one genuinely new thing:** step 3's *asset-content generation* — F11 built the persistence
sink and F12 built briefing-gen, but nothing yet composes a Program package, runs the LLM, and
persists asset content. That's F10's `judge`. It mirrors `generateMandate`/`generateBriefing`
exactly (compose → `routedText('reasoning')` with a 60s timeout → parse per the Asset's
`outputSchema` → persist).

## Schema — `20260715000009_operating_rhythm_runs.sql`

Per PRD §8: `id, founder_id, contract_id (FK), cycle_key text, status ('running'|'completed'|
'failed') default 'running', stages jsonb default '{}', started_at, completed_at, unique(founder_id,
cycle_key)`. RLS **SELECT-own only** (the run is written by the service role; authenticated users
only read their own). **No DELETE policy** (audit history). It is *mutable* by the service role
(running→completed/failed) — that's fine; no authenticated write policy exists.

**Plus the deferred FKs (this is where they land):** turn `asset_versions.execution_id` and
`executive_briefings.execution_id` into real FKs → `operating_rhythm_runs(id)`, `on delete set
null` (both are nullable-by-design). Idempotent via `drop constraint if exists` + `add constraint`
(Postgres has no `ADD CONSTRAINT IF NOT EXISTS`). Both tables are empty in prod, so no violation.

## Code — `lib/rhythm/**` (a fresh small orchestrator, not the old agent engine)

- `cycle-key.ts` — `weekCycleKey(date) → 'YYYY-Www'` (ISO week). Pure, unit-tested.
- `runs.ts` — `createRun` (insert; `23505` → `CycleAlreadyRanError`, fail-fast), `finishRun`
  (status + stages + completed_at), types. Service-role.
- `judge.ts` — `generateAssetContent(admin, {founderId, program, assetId, executionId, contractId,
  context})`: compose (`composePrompt`, passing `activePrograms` so the Composer enforces
  mandate-integrity) → LLM (retry once on transient failure) → parse by `outputSchema` →
  `persistAssetVersion({authoredBy:'program', executionId})`.
- `run.ts` — `runCycle(admin, {founderId, cycleKey?})`: the loop above. Builds a compact
  `CompanyContext` from Strategy + Contract + current Assets (Q-Score in context is a **v1
  omission** — noted; the Composer skips absent fields). Sequential for v1 ("parallelize where
  dependencies allow" is a deferred optimisation — correctness first).

Reuses: `getCurrentContract` + `getProgramsForContract` (`lib/mandate/contract.ts`),
`getProgram().assets` (Registry), `persistAssetVersion` + `getCurrentAsset` (F11),
`generateBriefing` (F12), `composePrompt` + `routedText`.

## Routes — `app/api/rhythm/**`

- **`POST /api/rhythm/run`** (manual): `flagOff → 404`, `verifyAuth`, service-role client, run the
  cycle scoped to `auth.user.id`. Mirrors `assets/[id]` PUT. Optional `cycleKey` in the body for
  dev testing (defaults to the current ISO week).
- **`GET /api/cron/rhythm`** (cron): the ADR-017 **fail-closed** `CRON_SECRET` guard (503 if unset,
  401 on mismatch) **and** a flag check (no-op when the flag is off), then loop founders with a
  confirmed contract, per-founder try/catch (mirrors `cron/weekly-automation`).
- `vercel.json`: add `{ "path": "/api/cron/rhythm", "schedule": "0 9 * * 1" }` (weekly Monday).

## ⚠️ Safety — no autonomous spend gets switched on by this change

- **Everything is behind `FF_NEW_EXECUTIVE_MODEL` (off).** The manual route 404s; the cron route
  no-ops. So on deploy, **nothing runs and nothing spends** until the flag is deliberately turned on.
- **The cron is doubly inert:** flag off **and** `CRON_SECRET` fail-closed (503 if unset). Adding it
  to `vercel.json` registers the schedule but it does nothing until *both* the flag is on and the
  secret is set — a deliberate future pilot decision, not a side effect of this build.
- **F10 v1 writes only internal, reversible state** — `asset_versions`, `executive_briefings`,
  `operating_rhythm_runs`. **No external sends, no spend, no irreversible actions** (those are
  Story 3 / F14). So ADR-004's approval gate is never reached inside a cycle.
- **Real LLM spend happens only when the founder (with the flag on) calls the manual route, or when
  the flag+cron+secret are all enabled** — i.e., only under explicit human action. I will flag the
  cron-enablement decision to you rather than treat it as done.

## Tests
- `cycle-key` pure test (ISO week).
- Orchestrator (mocked LLM + mocked F11/F12/contract reads): happy path (each active Program →
  assets + briefing → `completed`); **idempotency** (duplicate `cycle_key` → rejected, no work);
  **mandate integrity** (only contract-active Programs run); **failed stage** (asset gen throws →
  program failed, briefing blocked, other programs continue, run `failed`); **no score signal**.
- Migration guards + `operating_rhythm_runs` added to `rls-policies` `NEW_TABLES`.
- Local dry-run: migration applies; `unique(founder_id, cycle_key)` rejects a duplicate; the new
  `execution_id` FK accepts a real run id and rejects a bogus one; RLS read-only.

## Verification / landing
`npx jest` green · typecheck clean · local dry-run · **then gated**: `supabase db push` (only
`…09`) to prod on your go. `SCHEMA_DRIFT` (`operating_rhythm_runs` → PRESENT; the two FKs now real)
+ a new ADR. Cron-enablement left as your explicit decision.

## Explicitly NOT in F10 v1
External Actions / Connectors / the approval gate (Story 3) · per-company cadence override
(deferred, §14) · parallel program execution (deferred optimisation) · `runsWhen` event-skipping
(ADR-008 forbids it in v1) · Q-Score in the compose context (additive, noted).
