# F13 + F14 — Connectors and Actions: design

*Story 3, Stage A. **Design only — no code.** Written 3 Aug 2026.*

*This is the security story: the first thing this product builds that reaches outside itself. The
question every decision below answers is not "does it work" but "what happens when it goes
wrong, and who finds out".*

---

## 1. Scope, and what is already settled

**Settled before this document — not re-argued here:**

| Decision | Where |
|---|---|
| Table `connector_grants` (not `connections`, not "mandate") | ADR-031 |
| Routes under `app/api/connectors/**` | ADR-021 (route half stands) |
| Secrets in **Supabase Vault**; the DB stores a `token_ref` | ADR-032 |
| Action instruction prompts exist and compose | Stage 0, commit `8511c92` |
| `irreversible` is a Registry property, enforced at import time | `lib/registry/index.ts:168-178` |

**In scope:** the `connector_grants` vault, `action_log`, the adapter interface, Action generation
inside the rhythm, the approval model, and Gmail as the first provider.

**Out of scope, deliberately:** F15 Outcome Loop, F16 Evidence Pack, F17 investor side (ADR-009 —
do not build). Any connector beyond Gmail. Anything under `features/agents/**`.

---

## 2. `connector_grants`

```sql
create table connector_grants (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founder_profiles(user_id) on delete cascade,
  provider      text not null,                      -- 'gmail'; matches ActionDef.connector
  status        text not null default 'active'
                check (status in ('active','revoked','expired')),
  scopes        jsonb not null default '[]',        -- exactly what was granted, as granted
  token_ref     text,                               -- vault secret id. NEVER a token.
  account_email text,                               -- which account, so the founder can tell
  connected_at  timestamptz not null default now(),
  expires_at    timestamptz,                        -- access-token expiry, for proactive refresh
  revoked_at    timestamptz,
  last_used_at  timestamptz
);

create unique index connector_grants_one_active_per_provider
  on connector_grants (founder_id, provider) where status = 'active';
```

**Why `expires_at` / `revoked_at` exist when the PRD's DDL has only `status`:** a status alone
cannot answer *when*, and both questions get asked in an incident. The PRD's DDL is a floor.

**The partial unique index is the load-bearing constraint.** One active grant per provider per
founder, enforced by the database rather than by a `select`-then-`insert` in application code —
the same argument F11 makes for one-current-asset (`20260715000006:63-65`). Without it, a founder
who clicks "connect" twice gets two active grants and a coin-flip about which token is used.
Revoked and expired rows remain: **history is not pruned**, matching every other new-model table.

### What the database enforces vs what application code enforces

Stating this split explicitly, as F11 did, because the difference is where bugs hide:

| Guarantee | Enforced by |
|---|---|
| One active grant per (founder, provider) | **Database** — partial unique index |
| A founder reads only their own grants | **Database** — RLS `select`-own |
| Status is one of three values | **Database** — check constraint |
| Grants are never deleted, only revoked | **Database** — no DELETE policy |
| `token_ref` points at a live vault secret | **Application** — nothing in Postgres links them |
| Scopes are least-privilege | **Application** — set at the OAuth request |
| A revoked grant is unusable | **Application** — checked at execution time |

The last three are the ones to test hardest, precisely because the database will not catch them.

**RLS:** `select`-own only. **No insert/update/delete policy for `authenticated`** — writes are
service-role, exactly as `asset_versions` does, because a grant's lifecycle is the system's to
manage and a founder should not be able to forge one. Revocation is a *route*, not a table write.

---

## 3. Secrets — how a `token_ref` resolves

**Storage:** `vault.create_secret(<refresh_token>, <name>, <description>)` returns a uuid. That
uuid is `connector_grants.token_ref`. The token itself never touches a table, a log, an error
message or a URL.

**Resolution:** server-side only, `select decrypted_secret from vault.decrypted_secrets where id = $1`,
from a service-role path. Nothing in the browser can do this — **verified**, not assumed:

- `authenticated` has **no `USAGE`** on the `vault` schema and **no `SELECT`** on
  `vault.decrypted_secrets` (both `false`).
- A raw dump of `vault.secrets` yields ciphertext only.

**This gives two independent failures before a token leaks**, not one. Even if RLS on
`connector_grants` were misconfigured tomorrow and a founder read another's `token_ref`, the ref
is inert to them. That property is the reason for choosing Vault over a plaintext column, and it
is the F13 acceptance criterion — *"a DB dump yields nothing usable"* — satisfied structurally.

**When the vault is unreachable: fail closed.** No cached token, no "try without it", no degraded
send. The Action is marked failed with reason `vault_unreachable`, logged, and the chain stops.
CLAUDE.md §3: *"Fail closed, not open."*

**Rotation on refresh:** Google returns a new access token and sometimes a new refresh token. Use
`vault.update_secret()` on the **same** `token_ref` so the grant row never changes and there is no
window where the ref points at nothing.

**Rejected — plaintext column.** The existing precedent (`linear_tokens.api_key`,
`founder_profiles.*_api_key`) stores credentials in plain text, and `linear_tokens`' RLS
(`for all using (user_id = auth.uid())`) lets **the browser read the raw key**. That is the
anti-precedent; the new model must not copy it. Those tables are old-model and frozen (ADR-014).

**Accepted cost, stated for the security review:** Vault ties secrets to Postgres. A database
compromise *with key access* is not defended against — that is what a separate KMS would buy.
Revisit if the pilot succeeds and the connector surface widens.

---

## 4. `action_log`

```sql
create table action_log (
  id            uuid primary key default gen_random_uuid(),
  founder_id    uuid not null references founder_profiles(user_id) on delete cascade,
  program_id    uuid references programs(id),
  execution_id  uuid references operating_rhythm_runs(id) on delete set null,
  action_id     text not null,                     -- Registry ActionDef.id
  provider      text,                              -- null for internal actions
  irreversible  boolean not null,                  -- as resolved AT THE TIME
  status        text not null
                check (status in ('pending_approval','approved','executed','failed','declined','unknown')),
  payload_hash  text,                              -- sha256 of the canonical payload
  request       jsonb not null default '{}',       -- METADATA ONLY — see below
  result        jsonb,
  approved_by   text,
  approved_at   timestamptz,
  created_at    timestamptz not null default now()
);
```

### What is deliberately NOT recorded, and why

The PRD gives `action_log` a `request jsonb` column, which invites storing the email body and the
recipient address. CLAUDE.md §3 forbids PII in logs. **Both cannot be honoured literally**, so:

**`request` stores metadata, never content.** Recorded: recipient **count** and **domain**,
subject **length**, the Registry action id, the connector, the program. Not recorded: the body,
the subject line, or any address. Reason: an audit log answers *"did we send, to how many, when,
under whose approval"* — none of which requires the prose. Storing bodies turns the audit trail
into the largest PII store in the product and makes right-to-erasure harder than it needs to be.

**`payload_hash` is what makes the audit meaningful without the content.** It proves *which*
payload was approved and *which* was sent, without retaining either. If they differ, that is
provable after the fact from the hash alone.

**Two statuses beyond the PRD's four.** `approved` (approved but not yet executed — without it,
approval and execution are indistinguishable in the log) and **`unknown`** (see §8 — a send whose
outcome we genuinely do not know). Recording `failed` when we do not know is a lie the log would
carry forever.

### Append-only, with the lesson already learned

Same trigger shape as `executive_briefings` (ADR-025) — reject UPDATE and DELETE — **but shipping
from day one with the `pg_trigger_depth() > 1` carve-out** that briefings needed a follow-up
migration to add.

That fix exists because the Story-2 e2e test caught it: the append-only trigger blocked
`auth.users → founder_profiles → executive_briefings` cascade, so **a founder with any history
could never delete their account** (right-to-erasure). The guarantee wanted is *"nobody edits or
prunes history"*, not *"records outlive the founder"*. A direct delete (depth 1) stays forbidden;
a cascaded one (depth > 1) is allowed. UPDATE is forbidden unconditionally.

`action_log` inherits that requirement exactly, so it must not repeat the bug.

**Status transitions therefore append a new row rather than mutating.** A send is a *sequence* of
rows sharing a `payload_hash`, not one row edited four times. That is the same shape as
`qscore_history` and it is what "append-only" actually costs.

---

## 5. The adapter interface — one interface, no route per provider

```
interface Connector {
  provider: string
  send(grant: ResolvedGrant, payload: unknown): Promise<ConnectorResult>
  revoke(grant: ResolvedGrant): Promise<void>
}
```

One registry mapping `provider → Connector`, resolved from `ActionDef.connector`. **Adding a
second provider is a new adapter module plus one registry line — no route, no schema change, no
change to the approval flow.** That is the DoD's actual test (*"a second provider needs no new
route"*), and it is the Registry lesson applied: capability is config, not code paths.

**Route shape: the generic `POST /api/connectors/:provider/oauth`** — the PRD's form. Three other
documents say `/connectors/gmail/oauth`; they are wrong, and a per-provider route would fail the
DoD line above on the day a second connector arrives. `POST /connectors/gmail/send` appears only
in a prose flow diagram and is **not** a route: sending is reached through
`POST /api/programs/:id/actions/:actionId`, which is already the PRD's route table.

**Prefer an MCP client** where the provider offers one (Architecture.md), but Gmail's REST API is
the concrete first implementation. The interface is what matters; the transport is an
implementation detail behind it.

---

## 6. Irreversibility — where the flag lives, and the default

**Source of truth: `ActionDef.irreversible` in the Registry.** Enforced at import time — the
process refuses to boot if any Action declares a `connector` without `irreversible: true`
(`lib/registry/index.ts:168-178`). This is structural, not conventional, and must stay that way.

**"Absent ⇒ treat as irreversible" applies at the runtime/data boundary, not in TypeScript.**
`irreversible: boolean` is a *required* field, so it cannot be absent in a Registry entry —
testing that case in TS would be theatre. Where it genuinely can be absent:

- an `action_id` arriving from `action_log`, `scheduled_actions`, or a request payload
- a Registry entry that no longer resolves (a Program renamed between generation and execution)

At every such boundary: **unresolvable ⇒ irreversible ⇒ requires approval.** Never default to
"reversible, run it".

**Do not derive irreversibility from the Program Prompt.** `lib/prompts/executives/growth/programs/p001.ts:685` has
an `# Autonomous Actions` section whose approval rules (pricing, public claims, budget) are prose
that contradicts ADR-004. Parsing it would put a language model in charge of a safety decision the
Registry owns and the boot sequence enforces. It is layer-2 prose; `ACTION_FORMAT_RULE` already
tells the model that higher-layer templates do not govern here.

---

## 7. The approval model

```
generated ──> pending_approval ──approve──> approved ──execute──> executed
                    │                          │                     │
                    │                          └── payload changed ──┴─> invalidated
                    ├── decline ──> declined                          └─> failed / unknown
                    └── expire  ──> expired
```

**Approval binds to a payload hash, not to a row.** The DoD requires that nothing executes without
"an approval that matches the *exact* payload". So the approval record stores the
`payload_hash` it approved, and execution recomputes the hash and compares. **Mismatch ⇒ refuse.**
This is what makes "approved" mean something specific rather than "someone clicked yes on this
action id once".

**Expiry: 24 hours.** An approval is a statement about a payload *and a moment* — the founder
approved emailing these five people about this, today. A week later the context has moved and
they would want to look again. Expired approvals are not deleted; they land as `expired` and the
Action returns to `pending_approval`.

**The double-approval race.** Two clicks, two tabs, a retried request. Handled by the database,
not by application checks: a **partial unique index on `(action_id, execution_id)` where status =
'executed'** means the second execution attempt gets a `23505`, converted to a typed
`AlreadyExecutedError` and reported as success-already-done. This is the same shape as
`asset_versions(asset_id, execution_id)` and `executive_briefings(program_id, execution_id)` —
**follow the established pattern, do not invent a lock.**

**Re-check at execution time, not only at generation** (`Featureinventory.md:339`): the mandate is
still confirmed, the Program is still active, the grant is still `active`, the approval has not
expired, and the payload hash still matches. A Program paused between approval and execution must
block. Five checks, all fail-closed.

---

## 8. Idempotency — including the case that actually matters

The easy cases (double-click, retried request) are covered by the unique index in §7.

**The hard case: a timeout where we do not know whether Gmail accepted the message.** Retrying
risks sending twice; not retrying risks the founder believing an email went out when it did not.
Both are wrong, and "pick one" is not a design.

**Design: make the send self-identifying before it happens.**

1. Generate an RFC-5322 `Message-ID` ourselves, deterministically from the payload hash, and
   record it **before** calling Gmail — the fail-fast-before-cost rule `operating_rhythm_runs`
   already follows (row created before any LLM work).
2. Send with that `Message-ID` in the headers.
3. On an ambiguous failure (timeout, connection reset), **do not retry blindly.** Record status
   `unknown`.
4. Reconcile by asking Gmail: query the sent messages for `rfc822msgid:<our id>`. It either
   exists — mark `executed`, no second send — or it does not — now a retry is safe.

This turns "did it send?" from an unanswerable question into a **query**, which is the only honest
way to resolve it. Gmail has no native idempotency key (unlike Stripe), so we manufacture one out
of a header it preserves.

If reconciliation itself fails, the Action stays `unknown` and surfaces to the founder as
*"we could not confirm whether this sent — check your Sent folder"*. **An honest unknown beats a
confident wrong answer**, and this product has a standing rule about not claiming work that did
not verifiably happen.

---

## 9. The OAuth flow

**A dedicated Google Cloud OAuth client for connector access**, separate from the existing
`[auth.external.google]` Supabase login provider. Connector authority must not be entangled with
identity: revoking "may send email as me" should never mean touching "may sign in as me".

**Scope: `https://www.googleapis.com/auth/gmail.send` — that one, alone.** Not `gmail.modify`,
not `gmail.readonly`, not full `mail.google.com`. `gmail.send` can send and cannot read the
founder's mailbox, which is the least privilege that satisfies the requirement. If a future
feature needs to read replies, that is a **new scope, a new consent, and a new argument** — not a
quiet widening now.

**CSRF/state:** a signed, single-use `state` parameter bound to the founder's session and stored
server-side with a short TTL. A callback whose state is missing, unknown or already consumed is
rejected — the classic OAuth hole, closed explicitly.

**Refresh:** `access_type=offline`, `prompt=consent` on first grant to guarantee a refresh token.
Refresh proactively when `expires_at` is near; on failure, mark the grant `expired` and fail
closed — never attempt a send with a token we know is stale.

**Revocation:** call Google's revoke endpoint, set `status='revoked'` and `revoked_at`, and delete
the vault secret. Order matters: revoke upstream **first**, so a failure leaves us with a
still-valid grant we know about, rather than an orphaned token we have lost the reference to.

**What the founder sees:** which account is connected, what it may do (*"send email as you"*),
when it was connected, and a disconnect button that works without support.

---

## 10. Conflicts surfaced, not silently resolved

Stage A's item 10 requires flagging rather than quietly picking:

1. **Route shape** — PRD says `:provider`, three other docs say `gmail`. **Recommend the PRD's
   generic form**; the DoD's "second provider needs no new route" settles it.
2. **`request jsonb` vs no-PII** — irreconcilable as literally written. **Recommend metadata +
   hash** (§4). Needs sign-off, because it narrows what the PRD implied the log would hold.
3. **`scheduled_actions` becomes a live unattended sender.** Adding `cadence`/`next_run_at` is
   specified — but today that cron *cannot* send, because the send route is cookie-only and a
   server-to-server fetch carries no cookies (401). That accidental guard disappears the moment
   recurrence works. **Recommend: recurring irreversible Actions still require an unexpired
   approval per occurrence**, checked at execution. ADR-020 already implies this ("a recurring
   Action is still an Action"); it must be built, not assumed.
4. **`x-user-id` — leave it alone.** The build prompt is right that it must not be touched, though
   not for the stated reason: nothing reads it. Honouring it would create an unauthenticated
   impersonation header. Server-to-server auth uses `INTERNAL_RUN_SECRET` plus an approval record.
5. **`scheduled_actions.completed_at` does not exist** but the cron writes it
   (`app/api/agents/schedule/run/route.ts:105`), casting to silence TypeScript — so that update
   likely fails silently today, leaving rows stuck in `running`. Old-model and frozen; **flagged,
   not fixed**, but Story 3 must not build recurrence on top of a column that isn't there.

---

## 11. What I am least confident about

*Carried into `SECURITY_REVIEW_PACK.md` at Stage E. This section is the most valuable part of the
document and is deliberately not thin.*

1. **Vault operational behaviour under load and failure.** I verified the security properties
   (ciphertext at rest, `authenticated` locked out) but not what happens when the vault is slow,
   during a Postgres failover, or how `update_secret` behaves under concurrent refreshes. A
   refresh race could plausibly leave a grant pointing at a secret mid-write.
2. **Google's actual timeout semantics.** The §8 reconciliation assumes Gmail preserves a
   client-supplied `Message-ID` and that `rfc822msgid:` search finds it promptly. **Both need
   empirical confirmation at Stage D** — if the search is eventually-consistent, a fast retry
   could still double-send.
3. **Whether 24-hour approval expiry is right.** Chosen by judgement, not evidence. Too short
   annoys; too long lets context drift. A pilot should tune it.
4. **The blast radius of a wrong `irreversible: false`.** The import-time check catches
   `connector && !irreversible`, but an Action with a connector added later and the flag missed
   would send without approval. The check is good; I have not proven it cannot be circumvented by
   a code path that constructs an ActionDef outside the Registry.
5. **PII in `result`.** I have specified what `request` holds, but a provider error response can
   itself contain a recipient address. Results need scrubbing on the way in, and I have not
   designed that scrubber.
6. **Recurring actions are the least-designed part of this document.** They are P1, not P0
   (`Featureinventory.md:331`), and I have deliberately given them less thought than the send
   path — but they are also the path where an approval is most likely to be bypassed, per the
   old model's own `schedule_followup` hole. **Do not ship recurrence without revisiting §10.3.**

---

## Stage A is complete. Nothing here has been built.

Per the staged prompt: **stop, review, then Stage C** (the credential-free half — Actions in the
rhythm, `action_log`, approval with execution stubbed). Stage B (Gmail OAuth) waits on a Google
Cloud OAuth client.
