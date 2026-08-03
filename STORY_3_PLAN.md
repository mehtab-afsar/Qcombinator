# Story 3 — Connectors + Actions: direction check and build plan

*Written 3 Aug 2026, from the PRD, Featureinventory, DecisionLog, Architecture, CLAUDE.md,
SCHEMA_DRIFT, missingwork and `prompts/STORY_3_CONNECTORS.md`, plus a read of the code those
documents assume exists. Supersedes nothing; it is the plan the staged prompt executes against.*

---

## 0. The one-paragraph answer

**Story 3 is pointed the right way.** The approval model is coherent and correctly placed, the
namespace is settled, the staged A→E build order is right, and the security rules in the build
prompt are stricter than the PRD's — which is the correct direction for the one story that
touches the outside world. **But three things in the plan are not true yet**, and two of them are
assumed by the design rather than built. They must be resolved in Stage A or the story will stall
mid-build. None is a reason to change course; all three are reasons not to start Stage B on
schedule and hope.

---

## 1. Direction check — what's right

These are settled and should not be re-litigated:

- **The approval model is right and precisely placed.** ADR-004: internal and reversible work is
  autonomous; only *irreversible external* effects (send, publish, spend, change price) require
  approval, **at the Connector boundary**, after the payload is prepared and before it executes.
  This does not contradict "no approval gates" (ADR-002), which governs Programs. The distinction
  is real and the docs state it consistently in five places.
- **Recurrence is a property of an Action, not a separate entity** (ADR-020). This matters more
  than it looks: it means ADR-004 covers recurring sends *for free*. The old model proves the
  alternative fails — `schedule_followup` sits in `EXEC_TOOLS` but not `APPROVAL_REQUIRED_TOOLS`,
  so an agent can already defer a send past the gate on a technicality.
- **`irreversible` is already enforced at import time.** `lib/registry/index.ts:168-178` refuses
  to boot if any Action declares a `connector` without `irreversible: true`. The safety property
  is structural, not conventional. Keep it that way.
- **The staged A→E order with hard stops is right**, and Stage D's "prove the hard cases against
  reality, not mocks" is exactly the standard that caught real bugs in Story 2.
- **"A second provider needs no new route"** is the correct architectural test, and it resolves
  the one route-shape conflict below.

## 2. Direction check — what must change before Stage B

### ✅ 2a. The secrets manager does not exist — RESOLVED 3 Aug (ADR-032, Supabase Vault)

*Left in full below because the reasoning is what the security review will examine.*

The entire F13 design rests on: *the database stores `token_ref`; the secret lives in a secrets
manager.* I searched every migration and every file under `lib/` and `app/`:

- No Supabase Vault (`vault.`, `vault.create_secret`, `supabase_vault`, `pgsodium`) — zero hits.
- No encryption helper (`createCipheriv`, `crypto.subtle.encrypt`, `aes-256`) — zero hits.
- No KMS client of any kind. No `token_ref` column anywhere.

**This is not a coding task, it is an unmade architectural decision** — and it is the one that
the required human security review will focus on. It cannot be discovered halfway through Stage B.

Worse, the existing precedent points the wrong way and must be explicitly rejected, not copied:

| Existing credential | Where | Problem |
|---|---|---|
| `linear_tokens.api_key` | `20260225000007:356-363` | **Plaintext**, and its RLS is `FOR ALL USING (user_id = auth.uid())` — so **the browser can read the raw key with the anon key** |
| `founder_profiles.{calendly,posthog,fireflies}_api_key` | `20260700000001:105-108` | Plaintext columns on a founder-readable table |

Gmail OAuth in Story 3 is **the first per-founder OAuth token this product has ever held.** There
is no refresh, rotation or revocation code to reuse. Everything is new.

### ✅ 2b. Actions cannot be composed — RESOLVED 3 Aug (Stage 0)

*Left in full below: the diagnosis explains why the fix touched the Composer as well as the
prompt registry.*

`composePrompt({ actionId: 'interview_customers', … })` **fails**, and it is pinned by tests that
currently assert the failure:

- `lib/prompts/registry.ts:48-54` registers `AS001`–`AS005` only. **No action ref is registered.**
- `lib/prompts/registry.ts:82-86` → `getInstructionPrompt` throws `PromptNotFoundError`.
- `__tests__/prompt-composer.test.ts:315-351` asserts that throw for three action ids, with a
  comment naming it a workbook gap.

`missingwork.md:102-105` already flagged this: the Action Registry sheet was never generated, so
there are no per-action instruction prompts. **F14 cannot prepare a payload without them.**

The fix is smaller than it sounds — five prompt files plus five registry entries, no architecture
change — but it is a prerequisite, and it is *content* work (what should the model be told when
drafting a customer-interview email?), not plumbing. It also inverts three existing tests.

Two related defects to fix in the same pass:
- **`lib/prompts/composer/execution.ts:101-103` resolves the action ref wrongly.** It uses the
  action **id** from the program's array rather than `getAction(actionId).instructionsRef`. It
  works today only because id and ref happen to be identical for all five actions. The asset
  branch one line above does it correctly.
- **Actions get no format rule.** `ASSET_FORMAT_RULE` and `ASSET_CLOSING_REMINDER` are gated on
  `input.assetId`, so an action package ships with no format, length or anti-fabrication rules.
  An email payload needs its own contract — an `ACTION_FORMAT_RULE`.

### 🟠 2c. Story 3 will remove the accidental guard on unattended email

The build prompt says `x-user-id` is "the only thing preventing unattended bulk email to third
parties" and must not be touched. **The warning is right; the stated reason is not**, and the
difference matters for the plan.

Nothing reads `x-user-id` — three call sites write it, zero read it. The *actual* guard is that
`/api/agents/outreach/send` authenticates **cookie-only** (`:112-116`), and a server-to-server
`fetch` carries no cookies. So both machine-initiated send paths get a hard 401 today; the cron's
`send_email_step` branch has never sent an email.

**The consequence for Story 3:** the moment `cadence` / `next_run_at` are added to
`scheduled_actions`, that cron becomes a live unattended sender. An accidental guard is replaced
by nothing unless the plan replaces it deliberately — with an approval record checked **at
execution time**, not at generation time (which `Featureinventory.md:339` already requires).

Do not "fix" `x-user-id`: honouring it would turn a vestigial header into an unauthenticated
impersonation mechanism. Use the existing `INTERNAL_RUN_SECRET` pattern plus an approval record.

### 🟡 2d. Four smaller conflicts for Stage A to resolve (do not silently pick)

1. **Route shape.** PRD `:447` specifies generic `POST /api/connectors/:provider/oauth`;
   Featureinventory, Roadmap and the build prompt all say `gmail`. **The generic form wins** —
   CLAUDE.md §2 and the DoD line "a second provider needs no new route" both demand it.
2. **`/connectors/gmail/send` appears only in a prose flow diagram**, never in the PRD's route
   table. Per-provider send routes would violate the same DoD line. Treat as illustrative.
3. **`action_log.request jsonb` vs "no PII in logs"** (CLAUDE.md §3). The PRD schema as written
   invites storing recipient addresses and email bodies. The build prompt demands a decision on
   what is deliberately *not* recorded. Recommendation: store a payload **hash** plus non-PII
   metadata (recipient domain, subject length, template id), never the body.
4. **Expiry/revocation columns.** The prompt requires them; the PRD DDL has neither — only
   `status` and `connected_at`. The PRD schema is a floor, not the finished table.

---

## 3. What to reuse, and what not to

CLAUDE.md §0.3 says "reuse the engine, don't fork it." Applied honestly, that gives a mixed answer:

| Component | Verdict |
|---|---|
| **Idempotency patterns** | ✅ **Reuse verbatim.** Four proven shapes exist — `asset_versions(asset_id, execution_id)`, `operating_rhythm_runs(founder_id, cycle_key)`, briefings `(program_id, execution_id)`, `processed_webhook_events`. All insert the row **before** the expensive call and convert Postgres `23505` into a typed error. Story 3's send-idempotency must follow this, not invent one. |
| **`lib/tools/executor.ts`** | ⚠️ **Partial.** Its retry/timeout loop and non-blocking logging are good. But its retry is **unsafe for an irreversible send** (3 attempts, no idempotency key — a network failure after Gmail accepted means a second email), its registry lookup reads the frozen old config, and its rate limiter is in-process so it does nothing on serverless. |
| **`lib/actions/executor.ts`** | ❌ **Do not reuse.** Zero callers (ADR-019), dispatches on the old agent config, logs to `agent_activity`, and **has no approval gate anywhere** — adding one inverts its control flow. Reference for shape only. |
| **The old approval UI** (`pending_actions` + `/api/agents/pending` + dashboard inbox) | ❌ Frozen (ADR-014), and **its approve→execute loop is never closed** — status moves to `approved` and nothing consumes it. Study the trap; do not copy the code. |
| **`scheduled_actions`** | ✅ Extend. Its RLS hole was genuinely fixed (`20260715000004:70`) and it is now SELECT-own with service-role writes. Needs `program_id`, `cadence`, `next_run_at`, an idempotency key — and `completed_at`, which the cron already writes but **does not exist**, so that update likely fails silently today. |

---

## 4. The build plan

### ✅ Stage 0 — prerequisites — **DONE 3 Aug 2026**

1. **Secrets manager decided: Supabase Vault** (ADR-032), and **verified before deciding** —
   `supabase_vault` 0.3.1 is installed; a raw dump of `vault.secrets` yields ciphertext only; and
   `authenticated` has neither `USAGE` on the `vault` schema nor `SELECT` on
   `vault.decrypted_secrets`. So a founder holding a `token_ref` cannot resolve it even if RLS on
   `connector_grants` were wrong — two failures required, not one.
2. **All five Action prompts written and registered.** `composePrompt({ actionId })` now succeeds;
   it threw `PromptNotFoundError` before. F14's core path is unblocked.
3. **Two latent defects fixed in the same pass:**
   - `composer/execution.ts` resolved layer 3 from the action **id** rather than
     `getAction(id).instructionsRef`. It worked only because the two coincide today; the first
     Action whose ref differed would have silently loaded the wrong instructions.
   - **Actions received no format, length or evidence rules at all** — both existing rules are
     gated on `assetId`. The path that reaches real people was the only one with no
     anti-fabrication instruction. Added `ACTION_FORMAT_RULE`, leading with the recipient rule:
     *an invented figure misleads a founder; an invented recipient emails a stranger, and the
     approval step does not catch it because a plausible address looks correct.*
4. **Tests: the closed gap inverted, the guarantee preserved.** The five tests that asserted the
   throw now assert composition — but "never a silent empty layer" was the principle underneath
   them, so it is re-tested directly against an unknown ref rather than deleted with the
   instance. 547 passing.

### Stage A — design only, no code → `F13_F14_DESIGN.md`, then stop

Everything in `prompts/STORY_3_CONNECTORS.md:56-87`, plus explicit resolutions for §2c and §2d
above. The two items to spend the most care on, because they are where this goes wrong:

- **Idempotency on an ambiguous failure** — a timeout where you don't know whether the send
  succeeded. This is the hard case; design it explicitly.
- **The approval lifecycle** — expiry, invalidation when the payload changes after approval, and
  the double-approval race. These are prompt-only requirements but they bind via the DoD.

### Stage B — F13: vault + OAuth. **No send path exists in this stage.**
Migration, secrets integration, adapter interface, OAuth round-trip, connect/disconnect UI.
Tests against a real database: token never present in any row/log/error · RLS blocks cross-tenant
· fail closed on a missing secret · revocation actually revokes.

### Stage C — F14: actions + approval. **Execute is stubbed — it records what *would* have happened.**
`action_log`, action preparation, approval flow, founder-visible status. Tests: an unapproved
irreversible action cannot reach execute · approval expires · a payload change invalidates it ·
denials land in `action_log` · the log cannot be mutated.

### Stage D — the first real send, **to Mo's address only**
`Interview Customers` → payload prepared → approved → sent → logged. Then prove against reality:
double-click approve · retry after timeout · approve-then-revoke · expired token. **None may
produce a duplicate or an unapproved send.** Stop and show the `action_log` rows.

### Stage E — verify, document, hand off
Runtime verification; update SCHEMA_DRIFT / DecisionLog / FOLLOWUPS; write
`SECURITY_REVIEW_PACK.md` — including, honestly, what could not be verified.

---

## 5. Gates that are not mine to clear

- **`RESEND_API_KEY`** — needed only at Stage D. Stages 0–C do not need it. *Do not fake a send.*
- **A human security review of the Connector layer before this ships** — required by the PRD
  (`:525`, `:541`), ADR, and `missingwork.md:143`. Not optional, not something I can self-certify.
- **PostHog** — unrelated to Story 3's code, but the October retention gate cannot be measured
  retroactively.

## 6. Definition of done (from the build prompt — the strictest list governs)

Gmail OAuth works, tokens by reference only, a DB dump yields nothing usable · `action_log`
append-only including denials · **nothing irreversible executes without an approval matching the
exact payload** · sends idempotent under retry and double-click · everything fails closed · **a
second provider needs no new route** · `x-user-id` untouched · old model untouched · behind the
flag · `SECURITY_REVIEW_PACK.md` written · **no email ever sent to anyone but Mo.**
