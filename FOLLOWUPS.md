# Engineering Follow-ups

*Deferred code tasks — surfaced during a review but deliberately kept out of the current
commit to keep diffs small and single-purpose. Each says why it's deferred and what to do.*

---

## FU-001 — Lock down `confirm_executive_contract` (RPC exposure)

**Found:** during F11 Stage A review (the same class of issue F11 fixed for
`persist_asset_version`).

**What:** `confirm_executive_contract` (Story 1, `20260715000002_executive_contracts.sql`) is a
`plpgsql` function and is therefore exposed as a PostgREST RPC (`POST /rest/v1/rpc/
confirm_executive_contract`) callable by any `authenticated` user. There is no `revoke` on it.

**Severity: low** (unlike F11's function). It is `security invoker`, so RLS still applies — a
founder can only confirm *their own* draft contract, which they are allowed to do anyway. The
exposure just lets them do it without going through `app/api/contracts/**`. No integrity or
tenancy hole today.

**Do:** in a **separate** migration + commit (not F11), add
```sql
revoke execute on function confirm_executive_contract(uuid, jsonb) from public, anon, authenticated;
grant  execute on function confirm_executive_contract(uuid, jsonb) to service_role;
```
and confirm the confirm route calls it with a service-role client (it should already; verify).
Add a test asserting the function is not executable by `authenticated`, mirroring F11's.

**Why deferred:** touching Story 1's confirmed-and-shipped migration is a distinct change with
its own review; folding it into F11 would muddy F11's diff and mix two concerns.

---

## FU-002 — Consider retrofitting `strategy_sessions` to the atomic-write pattern

**Found:** during F11 Stage B (F11 uses a transactional `persist_asset_version` RPC precisely
because app-level retire-then-insert has a crash window).

**What:** `saveStrategy` (`lib/mandate/strategy.ts`) does retire-then-insert in application code.
A crash after the retire commits but before the insert would leave the founder with **zero**
current strategy versions — recoverable (a re-save fixes it, and `getCurrentStrategy` returns
null safely), but a real gap F11 chose to close for Assets.

**Severity: low.** Self-healing; the window is milliseconds; no data is lost.

**Do (optional):** if we decide consistency is worth it, wrap strategy's retire+insert in a
`persist_strategy_version` RPC like F11's. Not urgent; recorded so the divergence is a conscious
choice, not drift.

**Why deferred:** Story 1 is shipped and working; this is a robustness nicety, not a fix.

---

## FU-003 — Migrations don't replay from scratch (`supabase db reset` fails)

**Found:** during F11's Stage B local dry-run — the first attempt to rebuild the whole schema
from empty.

**What:** `supabase db reset` (replay all migrations into a fresh DB) fails at
`20260212000001_profiles_and_scoring_foundation.sql`: a policy on `investor_profiles`
references `founder_profiles` before that table is created (`relation "founder_profiles" does
not exist`, SQLSTATE 42P01). This is the same "dashboard-first migrations, written after the
fact, never replayed in order" class as Story 1's 8 `db push` blockers — there are likely
several such ordering issues, not just this one.

**Severity: medium, but not blocking today.** `supabase db push` (apply only *new* migrations to
the already-populated production DB) is unaffected — it never replays the old ones. So deploys
work. What does NOT work is rebuilding the schema from zero, which matters for: a new engineer's
local setup, CI running against a real DB, and disaster recovery.

**Do (separate effort):** walk `supabase db reset` forward, fixing each ordering error until a
clean rebuild succeeds — each fix being a guard or a reorder, none touching behaviour. Sizeable
but mechanical. Worth doing before the team grows or CI gets a database.

**Why deferred:** it's a pre-existing, repo-wide migration-hygiene task, entirely separate from
F11. Folding it in would balloon F11's diff and mix concerns.

---

## FU-004 — A run stuck in `running` (crash mid-cycle) blocks its week

**Found:** during the B5 fix (Story 2 remediation). B5 made **failed** runs retryable; a run
whose process *crashed* (row left `status='running'`, never finished) still blocks the week —
deliberately, because auto-clearing a 'running' row risks racing a genuinely live run.

**Severity: low-medium.** A crash mid-cycle is rare; the cost is one blocked week for one founder.

**Do:** add a staleness rule — e.g. treat a `running` run older than N hours as crashed and allow
the same delete-and-recreate path B5 uses for `failed`. Needs a careful timeout choice (a cycle
is minutes, so 2h is generous). Test the race: a live run must never be cleared.

---

## FU-005 — Audit quality items deferred from the Story 2 remediation (Mo's scope call)

- **Q-1:** the three-line `flagOff()` feature-flag guard is duplicated in ~6 new-model routes
  (`strategy`, `contracts`, `contracts/new-epoch`, `assets/[id]`, `briefings`, `rhythm/run`).
  Extract one helper into `lib/api/response.ts`. It grows by one copy per feature — the exact
  mechanism that produced the 173-route sprawl.
- **Q-3:** record an ADR that the ~300-line file limit applies to *code*; prompt-content modules
  (`lib/prompts/programs/**` etc., zero functions) are exempt. Undocumented, the exemption will
  be either violated or wrongly cited.

---

## FU-006 — Confirm the Upstash rate-limit env vars in Vercel prod (owner: Mo)

The middleware rate limiter **fails open** when `UPSTASH_REDIS_REST_URL` / `_TOKEN` are unset
(`middleware.ts` returns null and skips the check). S-1/S-2 added auth so nothing is *public*
any more, and B2's server-side `cycleKey` holds regardless — but every rate limit in the app is
advisory until these vars are confirmed present. Minutes to check in Vercel → Settings → Env.
