# Claude Code prompt — Story 3: Connectors + Actions (F13, F14)

> **Do not start this until:** the asset-truncation fix is verified, **FU-003 is done** (migrations
> replay from empty, so CI can have a database), and the sending credentials exist.
> Story 3 is the security story — building it on an untestable base is the wrong order.
>
> **Staged**: A → stop → B → stop → C → stop → D → stop → E. Never run ahead.

---

## Context — read before writing anything

1. `CLAUDE.md` — especially **§3 Security checklist** (every line applies to this story) and §4.
2. `Featureinventory.md` → **F13**, **F14**. `EDGE_ALPHA_PRD.md` §8/§9 for schema and routes.
3. `DecisionLog.md` — **ADR-004** (just-in-time approval on irreversible external Actions **only**,
   at the Connector boundary), **ADR-002** (no approval gates on Programs — this is the *one other*
   checkpoint in the product), **ADR-014** (strangler; old model frozen).
4. `SCHEMA_DRIFT.md` §4 — the namespace decision. `CODEBASE_AUDIT.md` — 188 routes bypass RLS;
   do not add to that number.
5. Your own Story 2 work — F11's revoked-function pattern and F10's fail-closed cron are the
   templates to follow here.

---

## Absolute rules for this story

**These are not guidelines. Violating any one of them is a stop-and-report event.**

1. **No token is ever stored in a table.** The database holds a `token_ref`; the secret lives in
   a secrets manager. Never plaintext, never in a log, never in an error message, never in a URL.
2. **Nothing irreversible executes without founder approval**, at the Connector boundary, after
   the payload is prepared and before it executes (ADR-004). Send, publish, spend, change price.
3. **Fail closed.** A missing secret, a failed auth check, an expired token, an unreachable vault
   → deny and log. Never proceed.
4. **Every attempt is logged to `action_log`** — append-only, never mutated, including denials
   and failures.
5. **During development, the ONLY permitted recipient is Mo's own address.** No email to any
   third party, ever, for any reason, including "realistic testing". Hard-code an allowlist in
   non-production and make it impossible to bypass.
6. **Sends must be idempotent.** A retry, a double-click, or a re-run must not send twice. Design
   this in from the start; retrofitting it is how people send the same email 40 times.
7. **Do not touch the old model.** Nothing under `features/agents/**` or `app/api/agents/**`.
8. **`x-user-id` — DO NOT "FIX" IT.** In the old model this header is written and read by nobody.
   It looks exactly like dead code worth cleaning up. **It is the only thing preventing unattended
   bulk email to third parties.** Leave it. If you believe you've found a reason to change it,
   stop and report instead.
9. Everything behind `FF_NEW_EXECUTIVE_MODEL`; routes 404 when off, not 403.

---

## Stage A — DESIGN, NO CODE (`F13_F14_DESIGN.md`, then stop)

1. **Namespace.** Use `connector_connections`, **not** `connections` — `connection_requests`
   already exists for founder↔investor intros and the names would sit confusingly together.
   *This is pending Roman's confirmation: flag it at the top of your design and proceed on the
   assumption, but mark clearly what changes if he decides otherwise.*
2. **`connector_connections` schema** — provider, founder, scopes, `token_ref`, status, expiry,
   revocation. Founder-scoped RLS, no permissive policy, no DELETE. State what is enforced by the
   database vs by application code, as you did for F11.
3. **The secrets manager.** Which one (Supabase Vault or provider KMS), how a `token_ref`
   resolves, who can resolve it, and what happens on failure. **Show that a database dump alone
   never yields a usable token.**
4. **`action_log` schema** — append-only, immutable, one row per attempt including denials.
   What is recorded, what is deliberately *not* recorded (payload contents? PII? say which and why).
5. **The Connector adapter interface** — one interface, prefer an MCP client. Show how a second
   provider is added **without a new route** (the Registry lesson). Gmail is the first, not a
   special case.
6. **Which Actions are irreversible**, derived from the Registry — and how the system *knows*.
   If irreversibility is a property an Action declares, say where it lives and what happens when
   it's absent. **Default must be "treat as irreversible."**
7. **The approval model.** Payload prepared → founder sees exactly what will be sent, to whom,
   via what → approves → executes → logged. Cover: approval expiry, payload changing after
   approval (must invalidate), and the double-approval race.
8. **Idempotency on send** — the stable key, and what happens on retry after a timeout where you
   don't know whether the send succeeded. This is the hard case; design it explicitly.
9. **The OAuth flow** — `POST /api/connectors/gmail/oauth`, least-privilege scopes (name them),
   state/CSRF handling, token refresh, revocation, and what the founder sees.
10. **Any conflict** with the PRD or Featureinventory — surface, recommend, do not silently resolve.

**Stop. Show me. Wait for "go".**

---

## Stage B — F13: vault + OAuth, NO SENDING

Build the connection: migration, secrets integration, adapter interface, the OAuth round-trip,
connect/disconnect UI. **Nothing can send yet — there is no send path in this stage.**

Tests: token never present in any row, log or error · RLS blocks cross-tenant · fail-closed on a
missing secret · revocation actually revokes · expired token refreshes or fails closed.

Verify against a real database and show me the results. **Stop.**

---

## Stage C — F14: actions + approval, still NO SENDING

`action_log`, action preparation from Programs, the approval flow, and the founder-visible status
(payload · target · state · result · failure/retry). The execute step is stubbed — it records
what *would* have happened.

Tests: an unapproved irreversible action **cannot** reach execute · an Action with no declared
irreversibility is treated as irreversible · approval expires · a payload change after approval
invalidates it · every attempt including denials lands in `action_log` · the log cannot be mutated.

**Stop.**

---

## Stage D — the first real send

Wire the real Gmail send, to **Mo's address only**. The full path: P001's "Interview Customers"
→ payload prepared → founder approves → sent → logged.

Then prove the hard cases against reality, not mocks: double-click the approve button · retry
after a timeout · approve then immediately revoke the connection · send with an expired token.
**None may result in a duplicate or an unapproved send.**

**Stop. Show me the `action_log` rows.**

---

## Stage E — verify, document, hand off for security review

- Runtime verification against a real database and a real provider; list every behaviour checked,
  and **name plainly what you could not verify from where you sit.**
- Update `SCHEMA_DRIFT.md`, `DecisionLog.md` (new ADRs), `FOLLOWUPS.md`.
- **Write `SECURITY_REVIEW_PACK.md`** for the human reviewer: the trust boundaries, where secrets
  live and who can reach them, every irreversible path and its gate, the threat cases you
  considered, and **the ones you're least confident about.** That last section is the most
  valuable thing in the document — do not leave it thin.

---

## Definition of done

- [ ] Gmail OAuth works; tokens by reference only; a DB dump yields nothing usable.
- [ ] `action_log` append-only, immutable, records denials as well as sends.
- [ ] **Nothing irreversible executes without a founder approval** that matches the exact payload.
- [ ] Sends are idempotent — retries and double-clicks cannot duplicate.
- [ ] Everything fails closed.
- [ ] A second provider needs no new route.
- [ ] `x-user-id` untouched. Old model untouched. Behind the flag.
- [ ] `SECURITY_REVIEW_PACK.md` written, including what you're unsure about.
- [ ] **No email was ever sent to anyone but Mo.**

## How to report

The rule that has held all project: **say what you verified, name what you didn't.** On this story
it matters more than on any other — the failure mode isn't a broken feature, it's an email a
founder didn't authorise. If something is untested, say so in plain words and let Mo decide.
