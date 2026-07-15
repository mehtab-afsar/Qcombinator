# Phase 0 Audit — every artifact & action creation path

*Step 2 of Phase 0 (`Roadmap.md`). Read-only: no code changed to produce this. Every claim is traced to a `file:line` verified against the tree at the time of writing.*

**Why this exists.** Two reasons. (1) The Roadmap requires "a written list; no side doors" before the new model is built. (2) This is the **parity checklist**: the new Executive model is not done until it has replaced everything listed here. Nothing below is a proposal to change anything — `app/api/agents/**` and `features/agents/**` are frozen (CLAUDE.md §0.4, ADR-014).

**Scope note.** "Artifact" = a row in `agent_artifacts` (the old model's deliverable). It is **not** a Management Asset (ADR-005/007) — that's a new-model concept with its own table and provenance. The two must not be conflated.

---

## 0. Headline findings

| # | Finding | Severity | Frozen? |
|---|---|---|---|
| 1 | **`atlas/weekly-scan` cron auth fails open** — public, unbounded, paid-API-spending endpoint if `CRON_SECRET` is ever unset | 🔴 latent security | Yes |
| 2 | **Artifact creation is NOT confined to `app/api/agents/**`** — the docs' assumption is refuted; 3 paths live outside the frozen tree, one of them client-side | 🔴 architectural | Partly |
| 3 | **The only approval gate is inert in both directions** — nothing is ever queued, and approving executes nothing | 🟠 | Yes |
| 4 | **Founder-typed metrics are stored as Felix's work and shown to investors as such** — provenance is lost at the boundary | 🟠 provenance | No |
| 5 | **The score-signal contract is not uniform** — 5 call sites, 3 conventions | 🟡 | Yes |
| 6 | **Only 13 of 63 artifact types move the Q-Score** (~79% already score-neutral) | 🟡 informational | — |
| 7 | The outreach blast path **cannot fire today** — 3 independent defects. Any one "fix" reactivates an ungated bulk-send | 🟠 latent | Yes |

---

## 1. Artifact creation paths (the parity checklist)

**9 live paths** (a 10th is dead). Reconciliation: 173 route files under `app/api/agents/`, of which **6** create artifacts and **167** do not — the ~150 per-agent routes return computed JSON without persisting. Any claim that "170 routes create artifacts" is wrong by ~28×.

| # | Path | Trigger | Score signal | Auth | Frozen |
|---|---|---|---|---|---|
| 1 | `app/api/agents/chat/route.ts:541` | POST, SSE branch, LLM tool call | `void` `:616` | user; writes service-role | Yes |
| 2 | `app/api/agents/chat/route.ts:783` | POST, non-stream branch | `void` `:809` | same | Yes |
| 3 | `app/api/agents/generate/route.ts:375` | POST, sync path | **awaited** `:434`, w/ quality | user | Yes |
| 4 | `app/api/agents/generate/run/route.ts:226` | POST, `x-run-secret` | **awaited** `:270`, hardcoded `'full'` | **none** — `userId` from body `:132` | Yes |
| 5 | `app/api/agents/process-delegation/route.ts:172` | POST, `x-internal-secret` | awaited `:197`, **error swallowed** `:199` | **none** — `userId` from task row | Yes |
| 6 | `app/api/agents/nova/interview-notes/route.ts:128` | POST | never | user | Yes |
| 7 | `app/api/agents/atlas/weekly-scan/route.ts:162` | POST **and cron GET** | never | see §2 | Yes |
| 8 | `app/api/investor/startup/[id]/memo/route.ts:155` | POST | never | user | **No** |
| 9 | `features/founder/services/metrics.service.ts:46` | **browser, client-side** | never | user JWT under RLS | **No** |
| — | `lib/agents/task-graph.ts:221` | — | — | — | **DEAD** — `executeTaskGraph` `:253` has zero importers repo-wide |

### 1a. Finding #2 — the frozen tree does not contain artifact creation

`Starthere.md` §3 and the whole strangler premise assume artifact creation lives in `features/agents/**` + `app/api/agents/**`. **It does not.** Paths 8 and 9 sit outside it. Path 9 is the sharpest: a **client-side insert from the browser** (`@/lib/supabase/client`) with no API route, no server-side validation, and no Zod — relying solely on RLS.

This matters for the migration: freezing `app/api/agents/**` does **not** freeze artifact creation. Story 1+ must account for paths 8 and 9, which no doc currently mentions.

### 1b. `lib/agents/task-graph.ts` is dead code

`executeTaskGraph` (`:253`) has **zero importers**. Only the `TaskGraph` *type* is imported, by `lib/agents/workflows/investor-readiness.ts:21`. `INVESTOR_READINESS_GRAPH` and `getWorkflowGraph` never execute.

**This contradicts CLAUDE.md §0.3 and ADR-014**, which name `task-graph` as a load-bearing engine component to "reuse, don't fork." It is currently a 389-line unexecuted module. Reusing it is still reasonable — but the docs describe it as proven machinery, and it has never run in production. **Flagging for Mo: this changes the risk profile of "reuse the engine."**

---

## 2. Finding #1 — `atlas/weekly-scan` cron auth fails open 🔴

```ts
// app/api/agents/atlas/weekly-scan/route.ts:208-212
const cronSecret = process.env.CRON_SECRET
const authHeader = request.headers.get('authorization')
if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {   // ← short-circuits when unset
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

If `CRON_SECRET` is unset, the guard evaluates to false and **the route is fully public**. It then loops up to 500 founders making 2 paid Tavily calls each (`:46`, `:68`). An attacker could replay it at will.

**Every other cron fails closed** and checks the secret's *existence* first:

| Route | Guard | Verdict |
|---|---|---|
| `cron/weekly-automation:21` | `if (!cronSecret) return 503` | ✅ closed |
| `cron/drip-emails:12` | `if (!cronSecret) return 503` | ✅ closed |
| `cron/investor-match-alerts:14` | | ✅ closed |
| `agents/schedule/run:302` | | ✅ closed |
| **`agents/atlas/weekly-scan:210`** | `if (cronSecret && ...)` | ❌ **open** |

This directly violates CLAUDE.md §3 — *"Fail closed, not open. Auth/rate-limit/mandate errors deny + alert; never silently allow."*

**Assessed as latent, not active.** If `CRON_SECRET` were unset, `weekly-automation` and `drip-emails` would return 503 and no founder would receive any email. Working emails ⇒ the secret is set ⇒ this hole is currently closed. It opens on any rotation or misconfiguration.

**Not fixed here.** The file is frozen (CLAUDE.md §0.4). The one-word fix (`if (!cronSecret || authHeader !== ...)`) requires an explicit decision from Mo — see §7.

---

## 3. Finding #3 — the approval gate is inert in both directions

An approval concept already exists and is **defined correctly**:

- `chat/route.ts:274` — `APPROVAL_REQUIRED_TOOLS = { send_outreach_sequence, bulk_enrich_pipeline }`
- `:453` — when gated, it blocks the tool and sets `loopState = 'exec_break'` ✅ **this half works**

But both ends are broken:

**The queue write fails silently.** `chat/route.ts:455` inserts `{user_id, agent_id, action_type, payload, status}` — omitting `title`, which is `TEXT NOT NULL` (`20260225000007_features_crm_content.sql:61`).

> **Mechanism, precisely:** `supabase-js` *returns* `{ error }`; it does not throw. The result is never destructured or checked, so the `NOT NULL` violation is invisible — the surrounding `catch { }` at `:462` never even fires. The row is simply never created and nothing reports it.

**Approval executes nothing.** `pending/route.ts:69` sets `status:'approved'` and returns. No cron, no drain, no consumer. `executed_at` is never written.

**Net:** gated tools never run — approved or not. It fails *safe*, but it is not a working approval system. Story 3 should treat this as a **naming precedent to reuse, not a foundation to build on**.

**Ungated exec tools** (`chat/route.ts:268`): `create_deal`, `initiate_voice_call`, `vapi_call`, `schedule_followup` run with no approval. `initiate_voice_call` is stubbed (`tool-runner.ts:302`) and `vapi_call` would place a **real, irreversible phone call**.

---

## 4. Finding #4 — founder-typed data is attributed to an agent 🟠

`features/founder/services/metrics.service.ts` — the founder's "Update metrics" form:

- `:46` inserts into `agent_artifacts` **from the browser**
- `:48` stamps `agent_id: AGENT_IDS.FELIX` — attributed to an agent that did not produce it
- `:43` does stamp `source: 'manual'` inside the `content` JSONB — **but nothing reads it** (verified: zero consumers repo-wide)

Meanwhile `app/api/investor/startup/[id]/route.ts:67,137,178` reads `financial_summary` and surfaces it to investors, setting `hasFinancialModel: true` (`:335`) — without checking `content.source`.

**Net: a founder types numbers into a form; an investor sees them as Felix's financial analysis.** No fabrication is required and it's not cross-tenant — but the provenance is lost exactly where it matters most.

Two consequences worth recording:

1. `Featureinventory.md` F16 (deferred) requires *"label every number verified vs self-reported."* That problem **exists in the live investor deep-dive today**, independent of the Evidence Pack.
2. This is the strongest available argument that ADR-007's `authored_by` must be a **first-class column** with consumers that read it — not a JSONB field like `content.source`, which is precisely the shape that got ignored here.

Also note migration `20260604000003` deliberately dropped the `artifact_type` CHECK constraint, reasoning *"validation is enforced in application code via ALL_ARTIFACT_TYPES."* True for `/api/agents/generate:236`. **Not true for the client-side path**, which has no server-side validation at all.

---

## 5. Finding #5/#6 — the score signal

**5 invocations across 4 files, all frozen. Three different conventions:**

| Site | Awaited? | 3rd arg | Quality |
|---|---|---|---|
| `process-delegation/route.ts:197` | awaited, **error swallowed** `:199` | `artifactType` | — |
| `chat/route.ts:616` | `void` | `toolName` | — |
| `chat/route.ts:809` | `void` | `toolName` | — |
| `generate/route.ts:434` | awaited | `artifactType` | LLM-derived |
| `generate/run/route.ts:270` | awaited | `artifactType` | hardcoded `'full'` |

### `toolName` vs `artifactType` — resolved: **by design, not coincidence**

`lib/llm/tools.ts:395` — `artifactTool(name, description)` constructs each tool's name **from the `ARTIFACT_TYPES` constant** (`:417` `artifactTool(ARTIFACT_TYPES.ICP_DOCUMENT, …)`). So `toolName === artifactType` is structurally guaranteed. Verified mechanically: **66 artifact tools, 0 key/name mismatches.** The chat route relies on this at `:611` (`type: toolName`) and `:631`.

The fragility is elsewhere — **two silent-failure paths** in `getToolsForAgent` (`tools.ts:698-708`): a `.filter(t => t !== undefined)` and a bare `catch { return [] }`. A bad tool id yields *zero tools* with no error.

**This is not theoretical.** `edgealpha.config.ts:163` gives Nova `ARTIFACT_TYPES.INTERVIEW_NOTES`, but `TOOL_DEFINITIONS` has **no `interview_notes` key** → silently dropped → **Nova can never produce it via chat.** Its advertised `[PARAMS.P1]: 8` (`:167`, "pmf_survey(5) + interview_notes(3)") is overstated by 3 points. It *is* still reachable via `POST /api/agents/generate` (allowlist = all 63 types). Two doors, one silently broken.

### Coverage: 13 of 63

`ARTIFACT_TYPES` defines **63** types; `ARTIFACT_BOOST` (`agent-signal.ts:16`) covers **13**. ~79% of the artifact surface is already score-neutral. The "documents raise the score" problem is real but **much narrower than the docs imply**.

### Dead ownership check — `agent-signal.ts:76-81` (NOT frozen)

```ts
const owningAgent = AGENTS.find(a => a.tools.includes(artifactType as ArtifactType));
if (!owningAgent) {
  // Fall back to legacy ARTIFACT_BOOST lookup for unknown types
}
```

The comment says *"Verify ownership via registry."* It computes `owningAgent`, the `if` block is **empty**, and the variable is never used again. **No ownership is verified.** Combined with `/api/agents/generate` accepting any of 63 types for any `agentId` (no ownership check), nothing stops one adviser generating another's artifact and claiming the score.

Dead code violating CLAUDE.md §5. In `features/qscore/**` — **not** frozen. Removing it changes no behaviour (it does nothing), but it is out of scope for a read-only audit. **Recommend as a Step 3 candidate; needs Mo's approval.**

### The two-sources-of-truth loop (flag, don't fix — dies with the old model)

`edgealpha.config.ts:59` states `qscoreBoosts` values are hand-copied from `ARTIFACT_BOOST`; `agent-signal.ts:4` imports `AGENTS` back from that config. Circular, hand-synced. Consumed only by `lib/cxo/cxo-config.ts:237` for a display number — which is why Nova's overstated total is cosmetic, not score-affecting.

---

## 6. Unattended execution — the Story-3 baseline

**Vercel Cron issues GET only.** 5 crons in `vercel.json`:

| Cron | Schedule | External effect | Human |
|---|---|---|---|
| `agents/schedule/run` | `0 8 * * *` | **none** — GET is a health check (`:301`); the drain is POST (`:36`), never called | — |
| `cron/weekly-automation` | `0 9 * * 1` | **4 Resend sends** (`:150,217,272,331`) × ≤500 founders | **NO** |
| `agents/atlas/weekly-scan` | `0 8 * * 1` | **paid Tavily** (`:46,68`) × ≤500 founders | **NO** + fails open |
| `cron/drip-emails` | `0 10 * * *` | **Resend** (`:79,104`) ≤100/day | **NO** |
| `cron/investor-match-alerts` | `0 11 * * *` | in-app notifications only (`:84`) — reversible | NO (fine) |

**Baseline answer for ADR-004: three paths cause unattended irreversible external effects today** (weekly-automation, atlas/weekly-scan, drip-emails). All are email or spend. **Every recipient is an existing platform user — no third party receives an unattended email, and no money moves via Stripe unattended** (all Stripe calls are reads; charges/refunds/payouts appear nowhere).

### Finding #7 — the outreach path is broken, and that's load-bearing

Three independent defects each individually prevent the bulk-outreach path from firing:

- **A.** `x-user-id` is written by `schedule/run:81,94` and `tool-runner.ts:259` — and **read by nobody** (zero readers repo-wide). `outreach/send:112` authenticates via cookies; server-to-server `fetch` carries none → **401 every time**.
- **B.** The drain cron hits GET (health check); the drain is POST.
- **C.** The approval queue write violates `NOT NULL` (§3).

**These are latent, not fixed.** Any one "cleanup" — wiring the cron to POST, or making `outreach/send` read `x-user-id` — immediately activates an **unattended bulk-email path to third-party contacts** with no working approval anywhere in the chain. Defect A looks exactly like a bug someone would helpfully fix.

**Recommendation:** record this in `DecisionLog.md` as a known trap before Story 3.

### Other dead/orphaned paths found

- `lib/actions/executor.ts` — **`executeAction` (`:174`) has zero callers.** CLAUDE.md §0.3 names it as engine to reuse; like `task-graph`, it has never run. Its `:185` prereq check is a *dependency* check, not consent — no approval gate.
- `app/api/investor/alerts/route.ts:202` — Resend batch send behind `INTERNAL_API_SECRET`; **no caller exists**.
- `app/api/cron/update-benchmarks/route.ts:44` — documented as monthly cron, **absent from `vercel.json`**, and POST-only.
- `lib/actions/handlers/track-competitor.ts:34` — writes `priority:'background'`, but the drain filters `priority='immediate'` (`schedule/run:143`); also omits `expires_at` which the query requires (`:145`). Never picked up.
- All `'background'` delegations (`delegation.ts:207,218,230`) are drained by nothing.
- `artifact_jobs` has **no reaper** — the only drainer is an in-request `void fetch` (`generate/route.ts:~285`). If it fails, the job is orphaned `pending` forever and `status/route.ts` polls indefinitely.

---

## 6b. Billing (Step 5) — the gap was narrower than documented, but sharper

**The webhook is in better shape than the docs claim.** Idempotency already existed (`processed_webhook_events` upsert with `ignoreDuplicates` + count), and the `string | Customer | null` handling the PRD flags as unsafe (§13.5) was **already correct** at `webhooks/stripe/route.ts:59-60`. The real gap was that **nothing tested any of it**.

### 🔴 `null` means opposite things in two layers — the live billing trap

| Layer | `limit_count = null` means | Source |
|---|---|---|
| **Database / enforcement** | **50 — the FREE cap** | `20260512000003_increment_usage_rpc.sql:48` — `v_limit := COALESCE(v_row.limit_count, 50)` |
| **UI** | **"Unlimited"** | `app/founder/billing/page.tsx:52` — `limit === null ? 'Unlimited' : …` |

`subscription_usage.limit_count` **is nullable** (`20250101000001:48`), so nothing at the DB level prevents the mistake. **If the webhook ever wrote `null` for a premium founder, the enforcement RPC would silently throttle a paying customer to the free tier** — a billing bug that produces no error, one plausible "let's use null for unlimited, it's cleaner" refactor away. This is why `999999` is load-bearing, not a wart.

Encoded in `lib/billing/plans.ts` (the warning is the file's opening comment) and pinned by a regression test (`never writes null for an unlimited feature`).

### Limits were in **five** places, not the documented three

`auth/callback:89` · `api/auth/signup:155` · `webhooks/stripe:87,173` · `founder/billing/status:6` (a `PLAN_LIMITS` constant **no other file imported**) · and **SQL** — `increment_usage_rpc.sql:24,37,48` hardcodes the free `agent_chat` value of 50 three times.

The four TypeScript sites now import `lib/billing/plans.ts`. **The SQL cannot** — it is a DB function and cannot import from TypeScript. That coupling is documented in `plans.ts`: changing the free `agent_chat` limit requires a migration too. **This is a residual single-source violation (CLAUDE.md §4) that Phase 0 does not close.**

### Typing: the TODO understated the problem by 4×

`lib/supabase/server.ts` carried a note to wire in the `Database` generic "once all API routes are updated (~50 files to fix)". The real count is **203**. `getAdminClient(): any` was explicitly `any` with an eslint-disable. Typing all of it is a migration, not a Phase 0 task — so `createTypedAdminClient()` was added and adopted **at the webhook only**, per the Roadmap's "type the admin client at billing/webhook call sites". The webhook typechecks clean against the real generated types. The other 202 call sites are untouched and remain untyped.

### The test was verified by mutation, not by passing

A mocked test that passes proves nothing. Each guard was confirmed to **fail** when the code is broken:

| Mutation | Caught? |
|---|---|
| Ignore the dedup result (`count === 0` → `false`) | ✅ idempotency test fails |
| Skip the missing-signature check | ✅ signature test fails |
| Premium `agent_chat` 500 → 50 (silent downgrade) | ✅ *after* a fix — see below |
| `UNLIMITED` → `null` (throttles paying founders) | ✅ two tests fail |

**The limits assertions were initially circular and worthless** — they compared the DB write against `FOUNDER_PLAN_LIMITS`, the same constant the route reads, so both sides moved together and mutation 3 passed silently. Rewritten to assert **literal production values** (500 / 999999 / 50 / 2 / 3), with a separate test proving the route still reads from the single source. Found only because the test was mutation-checked.

**Also noted, not fixed:** `increment_usage_rpc.sql:36-37` **fails open** on a limit check (`RETURN QUERY SELECT true, 50, NULL` when the row is not found), contrary to CLAUDE.md §3 ("fail closed"). Marked "should never happen" in the code. Out of Phase 0 scope; flagged for the billing owner.

---

## 7. Decisions taken (Mo, 15 Jul 2026)

1. **`atlas/weekly-scan` fail-open → FIXED under an explicit freeze exception.** `:210` changed from `if (cronSecret && …)` to `if (!cronSecret || …)`. One word. Rationale: it restores the fail-closed rule CLAUDE.md §3 already mandates, and it is the lone outlier among six `CRON_SECRET` consumers. Recorded as ADR-017.
   - ⚠️ **Action for Mo — confirm `CRON_SECRET` is set in Vercel prod.** It could not be verified from the repo. `.env.local` does **not** contain it, and `lib/env.ts:63-67` classifies it as *recommended*, not *critical* — the app boots with only a `console.warn` if it is absent, so nothing guarantees it exists.
   - The fix is correct either way: **if set** → no operational change, latent hole closed. **If unset** → `weekly-scan` now returns 503 and stops (correct fail-closed), and `weekly-automation`/`drip-emails` were already 503-ing, meaning founder emails were silently broken already.
2. **`agent-signal.ts:76-81` dead ownership check** → remove in Step 3 (not frozen; removing changes no behaviour).
3. **Paths 8 and 9** → **added to the parity checklist.** The strangler boundary is wider than `app/api/agents/**`. Recorded as ADR-018.
4. **`docs/edge-alpha-cto-review.md`** → leave as-is, no banner, not read.

### 7a. `CRON_SECRET` guard audit — all six consumers

| Route | Guard | Verdict |
|---|---|---|
| `agents/schedule/run:38`, `:303` | `if (!auth \|\| auth !== …)` | ✅ closed |
| `cron/weekly-automation:21` | `if (!cronSecret) return 503` | ✅ closed |
| `cron/drip-emails:12` | `if (!cronSecret) return 503` | ✅ closed |
| `cron/investor-match-alerts:14` | | ✅ closed |
| `admin/embed-investors:25` | `if (!secret \|\| authHeader !== …)` | ✅ closed |
| **`agents/atlas/weekly-scan:210`** | was `if (cronSecret && …)` | ❌ **open → FIXED** |

**5 of 6 fail closed.** Conclusive evidence of an oversight rather than a design choice.

---

## 8. Quarantine list (Amendment A)

*Suites failing on first run are listed here **explicitly — never silently skipped**. Discovered in Step 3 rather than Step 6, because running the suite locally was the only way to prove the Step 3 change broke nothing.*

**Baseline established 15 Jul 2026** (`npx jest`, clean tree): **7 failed · 162 passed · 169 total · 4 suites failing.**
After Step 3: **7 failed · 178 passed · 185 total.** Identical failure set — the 16 new tests all pass and nothing regressed.

### 🔴 These are pre-existing and have been failing invisibly, because Jest has never run in CI.

| # | Suite | Failing test | Notes |
|---|---|---|---|
| 1 | `features/qscore/tests/q-score-calculator.test.ts` | `constant denominator: Σ/150 regardless of exclusions` | **Q-Score engine.** Expected <0.2 deviation, got **3.87** |
| 2 | `features/qscore/tests/q-score-calculator.test.ts` | `pre-product stage: all P6 rawScore=0, still counted in denominator` | **Q-Score engine** |
| 3 | `features/qscore/tests/q-score-calculator.test.ts` | `commercial track: P5 all excluded, still in denominator` | **Q-Score engine** |
| 4 | `features/qscore/tests/reconciliation-engine.test.ts` | `2.5 low deviation → no vcAlert` | **Q-Score engine** |
| 5 | `features/qscore/tests/reconciliation-engine.test.ts` | `extreme deviation on 3.5 → vcAlert set, rawScore untouched` | **Q-Score engine** |
| 6 | `features/qscore/tests/p6-financials.test.ts` | `6.5 excluded when no COGS and no deal size` | **Q-Score engine** |
| 7 | `__tests__/agents/critical.test.ts` | `uses existing_artifact source when Maya artifact exists — no sub-call fired` | Old model (frozen) |

### ✅ TRIAGE RESULT (15 Jul 2026) — all six Q-Score failures are STALE TESTS. The score is **not** miscomputing.

Each failure is the same shape: **the code was deliberately improved, documented, and the test was never updated** — invisible because Jest never runs in CI.

| # | Root cause | Verdict |
|---|---|---|
| 1–3 | **Formula v1 → v2.** Tests assert a *constant* `/150` denominator using *raw* scores. `q-score-calculator.ts:4-10,124-134` states and implements the opposite: *"Denominator is DYNAMIC — only non-excluded indicators count"*, plus a confidence multiplier `clamp(conf/0.90, 0.50, 1.00)` and a sparsity penalty. Three effects the tests don't model — which is exactly where the 3.87 went. The test names give it away: *"still counted in denominator"* is the v1 behaviour v2 removed. | **stale test** |
| 4–5 | **LLM router migration.** `lib/profile-builder/reconciliation-engine.ts:19` imports `routedText` from `lib/llm/router` and **never calls `callClaude`**. The tests `jest.mock('@/lib/claude')` — an inert mock. The real call runs, fails without an API key, and the non-blocking error path returns `applied:false`. | **stale test** |
| 6 | **SaaS-default estimation added.** `p6-financials.ts:254-257` no longer excludes 6.5 when COGS is missing but MRR exists — it estimates gross margin from an 80% SaaS default, honestly marked (`confidence: 0.50`, reason *"SaaS default — no COGS provided; add COGS to improve accuracy"*). The exclusion rule at `:59` gained `&& !mrr` to match. The test asserts pre-feature behaviour. | **stale test** |

**Conclusion:** the calculator, the reconciliation engine and the P6 scorer are each *more* correct than their tests. No founder's score is wrong. ADR-019's revisit trigger ("if triage shows the calculator is genuinely miscomputing, that is a P0") **did not fire**.

**But the meta-finding stands, and it is the real lesson:** three separate improvements shipped, each leaving its tests behind, and nobody knew — because nothing runs them. The tests aren't just failing, they are **encoding a version of the product that no longer exists**. That is worse than having no tests, because it is what someone will read to learn how the score works. This is the argument for Step 6 being non-negotiable.

**#7 — `__tests__/agents/critical.test.ts`: also stale, and self-inconsistent.** It asserted `content` contains `'Positioning:'`, while **its own mock** supplies the key `positioningStatement` — which `orchestrator.ts:132-133` correctly renders as `"Positioning Statement:"` (the label is derived from the key). The code was right; the assertion string was never updated. *(This file is in `__tests__/agents/`, not the frozen `features/agents/**` or `app/api/agents/**`.)*

## ✅ RESOLVED — quarantine list is EMPTY, suite is green

All seven stale tests updated to assert current, documented behaviour. **Test files only — no product code touched, no behaviour changed.**

| | Baseline | Now |
|---|---|---|
| Tests | 162 passed / **7 failed** / 169 | **188 passed / 0 failed / 188** |
| Suites | 6 passed / **4 failed** | **11 passed / 0 failed** |

**The count went UP (169 → 188), not down** — the failures were fixed by asserting the real contract, never by deleting or weakening a test. Net +19: 16 score-invariant tests, plus 3 new assertions that close the gaps the stale tests had been hiding:

- `excluded indicators leave BOTH numerator and denominator` — a **structural** invariant (`activeIndicators + excluded === 30`; `availableIQ` tracks the active count) that is independent of the formula, so it fails loudly if the denominator ever silently reverts to a constant.
- `6.5 NOT excluded when MRR exists without COGS` — pins the SaaS-default behaviour that had no test at all.
- `the SaaS default is applied honestly` — asserts an estimate is never presented with the confidence of real data (`confidence === 0.50`, `verificationLevel === 'unverified'`, reason states *"SaaS default"*). Directly serves the verified-vs-self-reported principle in §4.

**Step 6's blocking Jest gate is now achievable rather than aspirational** — there is nothing left to quarantine.

### Why this matters more than a normal quarantine list

**Six of the seven failures are in the Q-Score engine** — `features/qscore/**`, which every doc designates *reuse, untouched* (CLAUDE.md §0.3, ADR-014, Architecture.md §11), and which is the **input to the entire product**: it feeds the mandate, and ADR-016 makes it the thing the founder is scored on.

Failure #1 is not a stale assertion — the calculator's headline invariant ("the denominator is always 150") is off by **3.87 points**. Either the invariant is wrong or the calculator is. Both are load-bearing, and nobody has been told, because nothing runs these tests.

**This does not change the Step 3 result** (identical failure sets, verified by stash/compare). It does mean the "reuse the Q-Score engine untouched" premise deserves scrutiny before Story 1 depends on it — alongside §1b/§6 (`task-graph.ts` and `lib/actions/executor.ts` have never executed).

**Decision needed:** triage these before Story 1, or quarantine and proceed? They are not caused by Phase 0 and block nothing mechanically — but #1–#6 mean the score may be miscomputed today.

**Known blocker for the `typecheck` script:** `tsconfig.json` includes `.next/dev/types/**/*.ts` (generated). `npx tsc --noEmit` reports **3 pre-existing syntax errors** in `.next/dev/types/routes.d.ts` — present before and after every Phase 0 change. A `typecheck` script cannot go green until that include is addressed.

**Known blocker for the `typecheck` script:** `tsconfig.json` includes `.next/dev/types/**/*.ts` (generated). `npx tsc --noEmit` currently reports **3 pre-existing syntax errors** in `.next/dev/types/routes.d.ts` — present both before and after the Step 1 change. A `typecheck` script cannot go green until this include is addressed.

---

## 9. What this means for the new model

- **Freezing `app/api/agents/**` does not freeze artifact creation** (§1a). Two live paths sit outside it, one client-side. The strangler boundary in the docs is drawn in the wrong place.
- **The engine is less proven than the docs claim** (§1b, §6): `task-graph.ts` and `lib/actions/executor.ts` — both named as reuse-don't-fork foundations — have never executed in production.
- **`authored_by` must be a column with real consumers** (§4), or it will be ignored exactly like `content.source` is today.
- **The approval gate must be built, not adopted** (§3). The existing one blocks correctly but is inert on both ends.
- **The score-decoupling job is smaller than feared** (§5): only 13 of 63 types boost, and per the standing decision the new model simply never calls the signal. The Step 3 invariant test is the whole job.
