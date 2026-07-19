# F11 — Asset Persistence & Versioning · Stage A (Design, no code)

*This is the design for your review. No code is written yet, nothing touches any database.
Approve with "go" and I proceed to Stage B (migration + core logic + local dry-run).*

---

## 1. The `asset_versions` schema (reconciled to PRD §8)

```sql
create table if not exists asset_versions (
  id                   uuid        primary key default gen_random_uuid(),
  founder_id           uuid        not null references founder_profiles(user_id) on delete cascade,

  -- Registry AssetId ('AS001'). NOT a foreign key — the Registry is code, not data
  -- (ADR-010). Validated in lib/assets against getAsset() before insert.
  asset_id             text        not null,

  -- The program INSTANCE (programs table row) that produced this. Null for founder edits.
  program_id           uuid        references programs(id) on delete set null,

  -- The run that produced this. Caller-supplied UUID; NO foreign key yet — the run
  -- table (operating_rhythm_runs) is built by F10, later (see Conflict D1).
  execution_id         uuid,

  version              int         not null check (version >= 1),
  is_current           boolean     not null default true,

  -- The Asset content. jsonb per PRD; markdown assets store a JSON string, json
  -- assets store an object. Consumers read getAsset(id).outputSchema to interpret (D3).
  content              jsonb       not null,

  -- Provenance (PRD §8).
  registry_version     text,                       -- which Registry build produced it
  executive_id         text,                       -- owning ExecutiveId, derived (D2)
  authored_by          text        not null default 'program'
                                   check (authored_by in ('program','founder')),
  previous_version_id  uuid        references asset_versions(id) on delete set null,
  source_refs          jsonb       not null default '[]',
  update_reason        text,
  created_at           timestamptz not null default now(),

  -- "Valid execution reference" as a DATABASE invariant, not just an app rule:
  -- a program-authored version HAS a run; a founder edit does NOT. Mirrors
  -- executive_contracts' confirmed_at<->status biconditional check.
  constraint asset_versions_execution_matches_author
    check ((authored_by = 'founder') = (execution_id is null))
);
```

### Indexes / database-enforced invariants
```sql
-- (a) EXACTLY ONE current per (founder, asset) — the core guarantee, enforced by the
--     database, not app code (two concurrent writes cannot both check-then-insert).
create unique index if not exists asset_versions_one_current_per_asset
  on asset_versions (founder_id, asset_id) where is_current;

-- (b) Sequential, no duplicate version numbers per (founder, asset).
create unique index if not exists asset_versions_founder_asset_version
  on asset_versions (founder_id, asset_id, version);

-- (c) "Not already persisted for THIS execution" — the dedupe rule (F11 edge case).
create unique index if not exists asset_versions_one_per_execution
  on asset_versions (asset_id, execution_id) where execution_id is not null;

-- (d) History reads, newest first.
create index if not exists asset_versions_history
  on asset_versions (founder_id, asset_id, version desc);
```

---

## 2. Exactly-one-current, and atomic transition (the crash question)

Story 1's `strategy_sessions` does retire-then-insert **in application code**, relying on the
partial unique index as the guarantee. That is safe against *concurrency* (the index rejects a
second current row), but it has one honest gap the F11 brief explicitly asks about: **a crash
between the retire (committed) and the insert would leave the Asset with zero current
versions.** Recoverable, but real.

**Design choice — strengthen it here.** F11's persistence path runs inside a `plpgsql` function
`persist_asset_version(...)`, `security invoker` (so RLS still applies — a founder can never
write another's Asset), doing **retire + insert in one transaction** with `select … for update`.
This mirrors Story 1's `confirm_executive_contract()` and closes the crash window: either both
the retire and the insert commit, or neither does. Two-current is impossible (index a);
zero-current is impossible (single transaction). This is a deliberate improvement over the
strategy pattern, justified by the brief naming crash-atomicity as a requirement.

The read/write lib (`getCurrentAsset`, `getAssetHistory`) still mirrors `strategy.ts` exactly.

**Sequential versions under concurrency:** the function computes `version = coalesce(current
version, 0) + 1` under the row lock; index (b) is the backstop if two somehow race. A loser gets
Postgres `23505`, surfaced as a typed `AssetPersistenceError` → HTTP 409, never swallowed.

---

## 3. The validation gate (F11 UC-11 step 2 — all seven checks)

Lives in `lib/assets/validation.ts`, runs **before** `persist_asset_version` is called, throws a
typed `AssetPersistenceError` with a machine-readable `code`:

| # | Check | How |
|---|---|---|
| 1 | Asset ID exists in the Registry | `getAsset(assetId)` (throws `AssetNotFoundError` on unknown) |
| 2 | Belongs to the correct **Program** | writing program's `template_id` ∈ `listProgramsForAsset(assetId)` → **this is the P003→AS001 block**. `listProgramsForAsset` (not `asset.program` alone) so AS004 shared with P002 is allowed |
| 2b | …and **Executive** | `getProgram(template_id).owner` — the derived Executive (D2); stored as `executive_id` |
| 3 | Output matches required structure | `getAsset(assetId).outputSchema`: `json` → content is an object; `markdown` → content is a non-empty string |
| 4 | Complete | content non-empty (not `{}`, `[]`, or `""`) |
| 5 | Valid execution reference | `authored_by='program'` ⟹ `execution_id` is a UUID; `authored_by='founder'` ⟹ absent (also a DB CHECK) |
| 6 | Sequential version | guaranteed by the function + index (b); the gate does not pre-read |
| 7 | Not already persisted for this execution | dedupe index (c); insert surfaces `23505` → `AssetPersistenceError('duplicate_execution')` |

**Honest limitation to surface:** check #3 ("required structure") can only verify *format*
(markdown-string vs json-object) + non-emptiness. The Registry defines `outputSchema` as the
format, **not** a per-Asset field schema (e.g. "an ICP must have ≥1 segment"). Deeper structural
validation isn't expressible from the Registry today. I'll validate format + completeness and
note that richer per-Asset schemas can be added to the Registry later without touching F11's shape.

---

## 4. RLS + write path (revised after review — the validation gate must be un-bypassable)

**The problem the first draft had.** The seven-check gate (§3) is TypeScript that runs *before*
the write. Anything that lets an authenticated user reach the write **directly** skips it — and
the Registry checks (P003→AS001, `authored_by` integrity) cannot live in the database (ADR-010),
so skipping the gate defeats them. There were **two** such doors:
1. `persist_asset_version` is exposed as a PostgREST RPC (`POST /rest/v1/rpc/…`) by default.
2. An `insert`/`update` RLS policy for `authenticated` allows a direct `POST /rest/v1/asset_versions`.

Both let a founder forge a `authored_by='program'` version or store P003 content as AS001 —
within their own rows (RLS still confines tenancy), so it is an **integrity** hole, not a
cross-tenant breach. But an audit trail you can forge is not an audit trail.

**The fix — `asset_versions` is read-only for authenticated; all writes are server-side.**

```sql
alter table asset_versions enable row level security;

-- founder reads own — the ONLY thing authenticated may do directly.
drop policy if exists "asset_versions_select_own" on asset_versions;
create policy "asset_versions_select_own" on asset_versions for select
  using (auth.uid() = founder_id);

-- NO insert / update / delete policy for authenticated → direct writes are RLS-denied.
-- NO permissive using(true) policy (the Phase 0 bug). History is append-only (no DELETE).
```

```sql
-- The RPC is server-side only. Without this it is a public endpoint that skips the gate.
revoke execute on function persist_asset_version(...) from public, anon, authenticated;
grant  execute on function persist_asset_version(...) to service_role;
```

All writes flow: **route → `verifyAuth` (derive founder_id) → validation gate → service-role
client → `persist_asset_version(founder_id, …)`**. The service role bypasses RLS (by design), so
write-tenancy is enforced by the route (it only ever passes the *verified* founder's id), and the
integrity gate is guaranteed to have run because nothing else can write.

**What still protects every write, service role included:** the one-current index, the sequential
index, the dedupe index, the execution-ref CHECK, and the immutability trigger are all
database-level — they hold no matter who writes. Only the Registry checks depend on the gate, and
the gate is now the sole write path.

`asset_versions` is added to `NEW_TABLES` in `__tests__/rls-policies.test.ts` (SELECT-own policy,
no `using(true)`, no DELETE — it passes that guard). A new test asserts the migration revokes
`execute` on the function from `authenticated`.

Plus an **immutability trigger** `asset_versions_reject_content_edit` (mirrors
`executive_contracts_reject_content_edit`): a `before update` trigger that rejects any change to
content/provenance columns (`content`, `asset_id`, `program_id`, `execution_id`, `executive_id`,
`authored_by`, `version`, `source_refs`, `previous_version_id`) and allows **only** `is_current`
to flip true→false. A version, once written, is immutable except for retirement. RLS narrows
*who* and *to what status*; the trigger enforces *which columns may never change* (a policy sees
only NEW, not OLD).

`asset_versions` is added to the `NEW_TABLES` list in `__tests__/rls-policies.test.ts`, and the
migration is auto-checked by `__tests__/migration-idempotency.test.ts`.

---

## 5. Conflicts found between PRD / Featureinventory / code — surfaced, not silently resolved

- **D1 — execution ref has no owning table yet.** `execution_id` is meant to point at
  `operating_rhythm_runs`, which **F10 builds after F11**. The PRD already anticipated this —
  `execution_id uuid` has no `references`, unlike its sibling `program_id uuid references
  programs(id)`. **Resolution:** caller-supplied UUID now, validated by the biconditional CHECK +
  dedupe index; the real FK is added in F10's migration. Recorded as a new ADR in Stage D.
- **D2 — Executive is not on the Asset.** `AssetDef` has `program` + `sharedWith` but no
  `executive` field (confirmed in `lib/registry/types.ts:89`). **Resolution:** derive via
  `getProgram(asset.program).owner`; store the `ExecutiveId` (e.g. `'growth'`) in `executive_id`.
- **D3 — content format.** PRD says `content jsonb`; AS001–AS005 are `outputSchema:'markdown'`.
  **Resolution:** one `jsonb` column; markdown stored as a JSON string, json as an object;
  `outputSchema` tells consumers which. Single column, PRD schema intact.
- **Strengthening over the strategy pattern (§2):** F11 uses a transactional RPC rather than
  app-level retire-then-insert. Called out so it's a conscious divergence, not drift.

---

## 6. What Stage A does *not* decide (stays out, per the brief)
No Rhythm engine, no `operating_rhythm_runs`, no cron (F10). No Briefings (F12). No Q-Score call.
No approval or review stage on Assets. Founder editing (the `PUT` route + pages) is designed in
Stage C, on top of this same `persist_asset_version` path with `authored_by='founder'`.

---

## Files Stage B will create (for reference)
- `supabase/migrations/20260715000006_asset_versions.sql` — table, indexes, CHECKs, RLS, trigger,
  `persist_asset_version()` function, rollback block.
- `lib/assets/versioning.ts` — `getCurrentAsset`, `getAssetHistory`, `persistAssetVersion` (calls
  the RPC), types, `AssetPersistenceError`.
- `lib/assets/validation.ts` — the seven-check gate (split out to keep files < ~300 lines).
- `__tests__/assets-versioning.test.ts` — the named acceptance + concurrency + no-score-signal tests.
```
```
