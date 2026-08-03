# Security Review Pack — Story 3 (Connectors + Actions)

**For a human reviewer. This is a ship gate (PRD §525/§541) — nothing here is self-certified.**

Written 4 Aug 2026, after the first real emails were sent. Covers `lib/connectors/**`,
`lib/actions/**`, `app/api/connectors/**`, `app/api/actions/**`, and the `connector_grants` /
`action_log` tables.

Story 3 is the only part of this product that touches the outside world. Everything before it
wrote documents into a database. This sends email as the founder, to real people. The failure
mode is not a broken feature — it is **an email a founder did not authorise**.

**If you read one section, read §9 — what I am least confident about.** It is the honest list,
and it is longer than I would like.

---

## 1. What this system can actually do

One thing, today: **send an email through Gmail, as the founder, to recipients named in their own
Company Context, after the founder has explicitly approved that exact message.**

That is the entire external surface. There is no other write path to the outside world — no
posting, no spending, no price changes, no third-party API beyond Google's token and send
endpoints.

It is behind `FF_NEW_EXECUTIVE_MODEL`, which is **off in production**. With the flag off the
routes return 404, not 403 — they do not exist rather than refuse.

---

## 2. Trust boundaries

```
  Founder's browser
        │  cookie-authenticated (Supabase session)
        ▼
  Next route handlers ── Zod-validated ──▶ lib/**  (all business logic)
        │                                    │
        │                                    ├──▶ Postgres (RLS, founder-scoped)
        │                                    ├──▶ Supabase Vault (service_role only)
        │                                    └──▶ Anthropic (payload generation)
        │
        ▼
  ═══════ THE ONLY CROSSING ═══════
  lib/actions/execute.ts ──▶ lib/connectors/gmail.ts ──▶ Google
```

**Four distinct trust levels, and the ordering matters:**

1. **The founder** — authenticated, trusted to authorise their own actions, trusted with nothing
   else. They cannot reach another founder's rows (RLS), and cannot reach any secret.
2. **Our server code** (`service_role`) — the only principal that can resolve a credential.
3. **The language model** — **untrusted**. It composes text. It does not decide what is
   irreversible, who may receive mail, or whether something is approved. See §5.
4. **Google** — trusted to deliver, not trusted to be reachable or honest about outcomes. A
   timeout from Google is treated as genuinely unknown, never as success or failure.

**Company Context is data, not instructions** (CLAUDE.md §3). Founder uploads, and anything they
paste, reach the model as content. The model's output is then parsed as a payload and every
security-relevant field is re-derived from the Registry or re-checked in code, not taken from the
model's word.

---

## 3. Where secrets live and who can reach them

**No token is stored in any table.** `connector_grants.token_ref` is a UUID pointing into
Supabase Vault. The credential itself is encrypted at rest by the vault.

Access is through four `SECURITY DEFINER` RPCs
(`supabase/migrations/20260803000003_vault_connector_rpcs.sql`). `EXECUTE` is granted to
`service_role` **only**. The `authenticated` role has:

- no `USAGE` on the `vault` schema,
- no `SELECT` on `vault.decrypted_secrets`,
- no `EXECUTE` on any of the four RPCs.

**Consequence, and the F13 acceptance criterion: a full dump of the application database yields
no usable token.** A `token_ref` is a pointer to a vault a dump does not include, and a founder
holding one can do nothing with it.

**What is stored is a REFRESH token, never an access token.** `resolveGrant`
(`lib/connectors/grants.ts:149`) exchanges it for a short-lived access token on every single
resolve. That is one extra HTTP call per send, deliberately: it means the only credential at rest
is the one that is **useless without our client secret**, which lives in the environment and
never in the database.

**A credential enters process memory in exactly one function** — `resolveGrant`. Everything
downstream receives a `ResolvedGrant` object. There is one function to audit, not a scattering.

**Never logged, never in an error, never in a URL.** `toGrant()` structurally cannot return
`token_ref` — it is not on the returned type.

> ⚠️ **This was broken until 3 Aug 2026 and 621 tests said it was fine**, because every test
> mocked the vault, so a refresh token and an access token were the same string. Gmail's 401
> found it. See §9.1.

---

## 4. Every irreversible path and its gate

There is **one** irreversible action in the Registry today: `interview_customers` (P001), whose
`connector` is `gmail`.

`lib/actions/execute.ts` is the only function that reaches a provider. **Six checks, in order,
every one of which denies on failure:**

| # | Check | Failure code | What it stops |
|---|-------|--------------|---------------|
| 1 | Payload hash matches the approved hash | `payload_changed` | A message altered after the founder read it |
| 2 | A **confirmed** mandate still exists | `no_mandate` | Acting under a withdrawn or draft mandate |
| 3 | The action declares a connector | `not_external` | Anything reaching a provider by accident |
| 4 | The grant is live (`resolveGrant`) | `not_connected` / `no_credential` | Sending after a disconnect |
| 5 | Idempotency slot reserved **before** the call | `already_executed` | A double-click becoming two emails |
| 6 | Every recipient allowlisted (non-prod) | `RecipientBlockedError` | A stranger receiving mail during development |

**Approval is separate from execution on purpose.** Approving records consent; executing spends
it. Everything is re-checked at execution because the world changes in between — a mandate
revoked, a connector disconnected, a payload regenerated. Checking only at approval time would
be a time-of-check/time-of-use bug with an email as the payload.

**What "approved" binds to:** a **SHA-256 of the canonical, key-sorted payload**
(`lib/actions/payload.ts`). Not an action id, not a row id. Change one character of the body or
one address and the hash no longer matches and execution refuses. *Verified against reality —
swapping the recipient after approval was refused with `payload_changed`.*

**Approval expires after 24 hours.** An approval that has been sitting for a day is consent to a
plan that may no longer be current.

**The gate is not the model's decision.** `lib/actions/generate.ts` reads
`action.irreversible` **from the Registry, before the LLM call**. The Program Prompt contains
prose about approval rules (`lib/prompts/programs/p001.ts:685`); it is **deliberately not parsed**.
A model must never be able to talk its way into "this one doesn't need approval".

---

## 5. The recipient allowlist — the last line

`lib/connectors/allowlist.ts`. Outside production, the only permitted recipient is
`mo@innosphere.ventures`.

Four deliberate properties:

- **Not configurable by environment variable.** A variable is a thing someone sets wrongly at 2am;
  a constant is a thing someone must change in a reviewed diff.
- **Production requires BOTH `NODE_ENV === 'production'` AND `VERCEL_ENV === 'production'`.**
  Vercel preview deployments run with `NODE_ENV=production` — checking one alone would have made
  every preview branch a live sender.
- **Anything ambiguous counts as non-production.** Fails closed.
- **All-or-nothing.** One off-list recipient refuses the entire send. Filtering to the allowed
  subset would quietly deliver a message the founder approved for five people to one of them —
  quieter, and wrong in a way nobody notices.

**No email has ever been sent by this system to anyone but Mo.** Verified in Gmail's own record.

---

## 6. The audit log

`action_log`, append-only, enforced by a trigger rejecting both `UPDATE` and `DELETE` — stricter
than `asset_versions`' retire-only rule. Service-role only; founder-scoped RLS; no permissive
policy; no DELETE policy.

**It records denials as well as sends.** A log holding only successes cannot answer the question
an audit is for.

**What is deliberately NOT recorded** (CLAUDE.md §3 forbids PII in logs, while the PRD gives
`action_log` a `request jsonb` column — the tension is resolved here, explicitly):

| Recorded | Not recorded |
|----------|--------------|
| `payload_hash` | the message body |
| recipient **count** | recipient addresses |
| recipient **domains** | recipient names |
| subject **length** | the subject text |

Redaction happens **inside `recordAttempt`**, not at the call site. Making it the caller's job is
how a body eventually reaches the log.

**`unknown` is a first-class status.** Gmail has no idempotency key. A timeout leaves a genuinely
unanswerable question, so we record `unknown` and say so. Recording `failed` invites a retry that
double-sends; recording `executed` tells the founder something we cannot prove.

Partial recovery exists: the RFC-5322 Message-ID is derived deterministically from the payload
hash, so an ambiguous timeout is answerable later via a `rfc822msgid:` search. **That
reconciliation is designed, not built** — see §9.3.

---

## 7. Idempotency — and the trade-off I chose

The slot is `(action_id, execution_id)`, claimed by a partial unique index **before** the provider
call, the same fail-fast-before-cost rule `operating_rhythm_runs` follows. A `23505` becomes a
typed `AlreadyExecutedError`. The race is settled by the database, not by application logic we
would have to get right.

The reservation is written as `status='sending'`, distinct from `executed`. The index guards
`sending` only, so the outcome row lands beside the reservation rather than colliding with it.
Both halves of that were live bugs (§9.2).

**The trade-off, stated plainly because a reviewer should challenge it:**

> **A claimed slot is never released — not even after an apparent failure.**

We cannot reliably distinguish "Gmail never accepted it" from "Gmail accepted it and the
connection dropped". Releasing on a wrong guess sends the email **twice**. Holding on a wrong
guess sends it **zero** times. Zero is the recoverable one: the rhythm regenerates the Action next
cycle against a fresh `execution_id`, which is a fresh slot and a fresh approval.

The cost is real and worth naming: **a founder whose send genuinely failed waits a cycle.** I
believe that is right. A reviewer may disagree.

---

## 8. Threat cases considered, and what was actually proven

**Proven against reality (a real Google client, a real database, real emails):**

| Case | Result |
|------|--------|
| Two approve clicks fired at the same instant | **One email.** Confirmed in Gmail: thread `19fc8fc2e98af5f4` |
| A third attempt, same payload, same run | Refused — `AlreadyExecutedError` |
| Payload tampered after approval (recipient swapped) | Refused — `payload_changed` |
| Approve, then revoke the connection before sending | Refused — `not_connected`; Google confirmed the revocation |
| OAuth state forged / tampered / expired / malformed | All four refused |
| A fault on our side (missing client env) | Grant left untouched, error raised |
| Google refusing the refresh | Grant marked `expired`, founder asked to reconnect |
| Cross-tenant read of another founder's rows | Blocked — standing blocking CI test |

**Proven by test, not by a live provider:** unapproved irreversible actions cannot reach execute
(12 denial tests) · approval expiry · mandate re-check · the log cannot be mutated · a second
provider needs no new route · the allowlist refuses non-allowlisted recipients · the circuit
breaker bounds a runaway rhythm.

**619 tests passing, `tsc` clean.**

---

## 9. What I am least confident about

**The most valuable section in this document. None of these are hypothetical — the first three
were live defects found in the last 24 hours, by sending real email.**

### 9.1 Mocks hid a real credential bug for the entire build

`resolveGrant` handed the vault's **refresh** token to Gmail as a bearer token. **621 tests passed
while it was broken**, because every test mocked the vault and both credentials were the same
string.

This is the finding I would most want a reviewer to sit with. It is not "a bug we fixed" — it is
evidence that **our test suite cannot see the class of defect that matters most here.** The
mocked boundary *is* the security boundary. Every remaining assurance in §8's second table
carries this same caveat to some degree.

### 9.2 The audit log denied a send that really happened

The idempotency reservation was written as `status='executed'`, and the unique index covered
`executed`. Consequences, both live:

- the log recorded sends that never happened;
- a failed send permanently blocked its own slot, making a legitimate retry impossible;
- **worst:** the click that genuinely sent then collided with its own reservation, failed to
  record the outcome, and reported a refusal. **The email went out and the log said it did not.**

Invisible until an `execution_id` was present, because the index is partial on
`execution_id IS NOT NULL` and the very first send had none. Fixed and regression-tested — but a
reviewer should assume **similar partial-index blind spots exist elsewhere** and look for them.

### 9.3 Reconciliation is designed, not built

`unknown` is recorded honestly, and the deterministic Message-ID makes it *answerable* — but
**nothing currently answers it.** A timed-out send stays `unknown` forever, and no human is
alerted beyond a log line. This is the most likely place for a real founder to be confused about
whether something was sent.

### 9.4 The model composes the recipient list

`interview_customers` instructs the model that it may only address people appearing in the
founder's Company Context, and that an empty list is a valid answer. **That instruction is a
prompt, not an enforced constraint.** The two things that actually stop a bad address are the
founder reading it at approval, and the allowlist — and **the allowlist does nothing in
production**, which is exactly where it would matter.

I consider this the **largest unmitigated risk in Story 3.** A structural check — recipients must
intersect a stored, founder-authored contact set — would close it. It is not built.

### 9.5 Approval is a single human click, and approval fatigue is real

The design assumes the founder reads what they approve. Ten approvals a cycle and they will
click through. The system has no defence against a founder approving something they did not read;
arguably it should not, but it is worth naming.

### 9.6 The revocation ordering is right, but untested under partial failure

`revokeGrant` tells Google first, then marks our row, then deletes the secret — deliberately, so
we never discard the handle to a token that still works upstream. **I have tested the happy path
against real Google. I have not tested Google being unreachable mid-revoke.** The code aborts,
which I believe is correct, but it is reasoning, not evidence.

### 9.7 Scope of the OAuth client

The connector uses a **dedicated Google OAuth client** with `gmail.send` only, separate from
login-with-Google, so revoking connector access never touches sign-in. `gmail.send` cannot read
the inbox. But it *can* send **as the founder, to anyone**, with no per-recipient restriction at
Google's end. Google's own controls give us nothing here — everything protecting recipients is
our code.

### 9.8 Things I cannot verify from where I sit

- **Whether the production environment is configured as this document assumes.** I verified a
  local Supabase and a real Google client. I have not seen production's environment variables.
- **Whether the Vault's key management meets your requirements.** I verified access control; I
  have not audited Supabase's encryption implementation.
- **Whether the Google Cloud project is correctly restricted** — test users, publishing status,
  and consent-screen configuration are outside the codebase.
- **Anything about the frozen old model.** `features/agents/**` and `app/api/agents/**` were not
  touched and not reviewed.

---

## 10. Required before this is exposed to a real founder

1. **Rotate the Google client secret.** It was pasted into a chat transcript during development
   and must be considered compromised. *(Not yet done.)*
2. **A human security review of this document and the diff.** Ship gate.
3. **Decide on §9.4** — accept the risk explicitly, or build the structural recipient check.
4. **Decide on §9.3** — accept that `unknown` sends need manual chasing, or build reconciliation.
5. **Confirm production environment configuration** against §9.8.

---

## 11. Files a reviewer should read, in order

| Order | File | Why |
|-------|------|-----|
| 1 | `lib/actions/execute.ts` | The only crossing. Every gate is here. |
| 2 | `lib/connectors/allowlist.ts` | The last line before a stranger. |
| 3 | `lib/connectors/grants.ts` | The only place a credential enters memory. |
| 4 | `lib/actions/approve.ts` | What consent means and when it expires. |
| 5 | `lib/actions/log.ts` + `payload.ts` | What is recorded, and what is deliberately not. |
| 6 | `supabase/migrations/20260803000002_action_log.sql` | Append-only enforcement. |
| 7 | `supabase/migrations/20260803000003_vault_connector_rpcs.sql` | Who can reach a secret. |
| 8 | `supabase/migrations/20260804000001_action_log_sending_status.sql` | §9.2, with the reasoning. |
| 9 | `F13_F14_DESIGN.md` | The decisions and the rejected alternatives. |

**The honest summary:** the gates are real, layered, and fail closed, and the guarantees that
were tested against reality held. But three of the four defects found in this story were found by
**sending an actual email**, not by 619 passing tests — and §9.4 is a real risk that is currently
mitigated only by a founder reading carefully.
