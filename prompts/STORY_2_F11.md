# Claude Code prompt — Story 2, F11: Asset Persistence & Versioning

> Paste this whole file as your next message. It is **staged**: do Stage A, stop and show me,
> wait for my "go", then Stage B, then Stage C, then Stage D. Do not run ahead.

---

## Context — read before writing anything

1. `CLAUDE.md` — the rules. Especially **§4 Data rules** (assets versioned never overwritten;
   exactly one `current`; sequential versions; append-only history) and **§0 prime directives**
   (~300 lines/file, ~50/function, no `any`, Zod at every boundary).
2. `Featureinventory.md` → **F11** (the spec you are implementing) and **F06** (the Composer,
   which will consume `getCurrentAsset()`).
3. `EDGE_ALPHA_PRD.md` **§8** — the `asset_versions` schema.
4. `DecisionLog.md` — **ADR-007** (Assets are founder-visible and directly editable; a founder
   edit creates a new immutable current version, `authored_by='founder'`, used immediately —
   **no approval, no gate**), **ADR-006** (there is **no Asset Review** — do not add one),
   **ADR-005** (nothing here may call `applyAgentScoreSignal()`), **ADR-010** (the Registry in
   code is authoritative).
5. `SCHEMA_DRIFT.md` — confirms `asset_versions` does not exist yet. You are building it.
6. The Story 1 migrations `20260715000001` / `...02` — **follow their patterns exactly**:
   founder-scoped RLS with no permissive `using(true)`, database-enforced invariants, no DELETE
   policy on append-only tables.

## Boundaries — do not cross

- **This is Story 2, feature F11 only.** Do not build F12 (Briefings) or F10 (the Rhythm
  engine). No rhythm table, no cron, no cycle logic. F11 is the store they will later write into.
- **Do not touch the old model** — nothing under `features/agents/**` or `app/api/agents/**`.
- **No module you write may import or call `applyAgentScoreSignal`** (ADR-005). Assert this
  with a test.
- **No approval gate, no review stage** on Asset editing (ADR-006, ADR-007). If you find
  yourself adding a `pending` or `approved` status to an Asset, stop — that's the wrong model.
- Everything ships behind `FF_NEW_EXECUTIVE_MODEL` (default off).

---

## Stage A — DESIGN, NO CODE (show me, then wait)

Produce a short written plan covering:

1. **The `asset_versions` schema** you propose (columns, types, indexes), reconciled against
   PRD §8. Include provenance: `authored_by ('program'|'founder')`, execution ref, program,
   executive, sources, reason.
2. **How "exactly one `is_current` per `(founder_id, asset_id)`" is enforced.** Story 1 used a
   database-level unique index rather than app code, precisely because two concurrent requests
   can both pass an app-level check. State how you'll do the same here, and how the
   "unset previous, set new" transition stays atomic — a crash mid-way must not leave an Asset
   with zero current versions or two.
3. **How version numbers stay sequential** under concurrency.
4. **The validation gate before persisting** (F11 step 2): asset exists in the Registry ·
   belongs to the correct Program/Executive · output matches required structure · complete ·
   valid execution ref · sequential · not already persisted for this execution. Say where this
   lives and what error type it throws.
5. **RLS policies**, matching the Story 1 pattern. Note explicitly whether a DELETE policy
   exists (it should not — history is never deleted; "restore" is a new version).
6. **Any conflict you find** between the PRD, `Featureinventory.md` and the Story 1 code.
   Do not silently resolve it — surface it and recommend.

**Stop. Show me. Wait for "go".**

---

## Stage B — MIGRATION + CORE (after I approve Stage A)

- The `asset_versions` migration: idempotent, additive, reversible, RLS enabled **and**
  founder-scoped with no permissive escape hatch. Timestamped to apply **last**, in order.
- `lib/assets/versioning.ts` — the persistence path, the validation gate, `getCurrentAsset()`
  and `getAssetHistory()`. Split files if any approaches ~300 lines.
- Tests, including the two named acceptance cases:
  - a Program output stored as a new sequential version → previous retained, exactly one current;
  - **a P003 output stored as AS001 → blocked** (AS001 belongs to P001);
  - a duplicate persist for the same execution → rejected;
  - concurrent persists → still exactly one current (this is the one people skip; don't);
  - no module under `lib/assets/**` calls `applyAgentScoreSignal`.

Show me: the migration diff, the test output, and a **dry run against a local/shadow DB — not
production**. **Stop. Wait for "go" before anything touches the remote database.**

---

## Stage C — FOUNDER EDITING (ADR-007)

- `GET /api/assets/:id` and `PUT /api/assets/:id`, Zod-validated, auth-checked, thin routes
  (logic in `lib/**`).
- A `PUT` creates a **new immutable current version** with `authored_by='founder'`, effective
  immediately. **No approval. No gate. No review status.**
- Founder-facing Asset pages: view current, view history, edit, restore. Restore creates a
  *new* current version from an old one — it never deletes or rewinds history.
- Test: a founder edit produces a new current version with `authored_by='founder'` and no
  approval step exists anywhere in the path.

---

## Stage D — WIRE-UP + REPORT

- Confirm F06 (the Composer) reads Assets via `getCurrentAsset()` — one path, not a second
  parallel one (§0.2 "one of each").
- Update `SCHEMA_DRIFT.md`: `asset_versions` moves from ABSENT to PRESENT.
- Append any new locked decision to `DecisionLog.md` as a new ADR.
- Short completion report: what was built, what you deliberately did **not** build, anything
  you found that contradicts the docs, and anything you couldn't verify from where you sit.

---

## Definition of done

- [ ] `asset_versions` live; migration idempotent + reversible; RLS founder-scoped, no
      permissive policy, no DELETE policy.
- [ ] Exactly-one-current enforced **by the database**, holding under concurrency.
- [ ] Invalid persistence blocked (the P003→AS001 case) with a clear runtime error.
- [ ] Founder edit → new current version, `authored_by='founder'`, immediate, no approval.
- [ ] History never destroyed; restore = a new version.
- [ ] No new-model module calls `applyAgentScoreSignal` (tested).
- [ ] Behind the flag; old model untouched; types and production build green; all tests pass.
- [ ] Diff small and reviewable. F12 and F10 **not** started.

## A note on how you report

In Phase 0 you told me a build was "clean" based on an assumption you never tested, twice.
The lesson you drew was right: *say what you verified, and name what you didn't.* Apply it
here. If you can't observe something from where you sit — concurrency behaviour on the real
database, for instance — say so plainly rather than asserting it passed.
