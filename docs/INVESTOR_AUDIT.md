# Investor Side — Stage A Audit

*Read-only orientation audit of the investor side as it exists today, verified directly against
code and migrations — not against `INVESTOR_SIDE_PLAN.md`'s claims. Produced 4 Aug 2026. This
document corrects that plan draft in several material places; treat the corrections here, not the
original claims, as ground truth going into Stage B.*

**A note on sourcing:** the brief for this audit asked to read `CODEBASE_AUDIT.md` as a reference
for the founder side's quality bar. **That file does not exist anywhere in this repository** —
confirmed via a full-repo `find`. The closest available equivalents, used instead, are
`docs/SECURITY_REVIEW_PACK.md` and `docs/SCHEMA_DRIFT.md`. If `CODEBASE_AUDIT.md` exists elsewhere
(a different branch, a doc Mo has locally), this audit should be re-checked against it.

---

## 1. What actually exists

Ground truth counts: **16 investor pages** (`app/investor/**/page.tsx`), **43 API routes**
(`app/api/investor*/**/route.ts` + `app/api/investors/route.ts`), **11 investor-prefixed tables**.
`INVESTOR_SIDE_PLAN.md`'s "~13 pages, ~40 routes, 12 tables" is roughly right on routes/tables but
undercounts pages.

Verified against the plan's 5-vertical table, per vertical:

### Vertical 1 — Sourcing / signal: **CONFIRMED**

`app/investor/deal-flow/page.tsx` fetches only internal endpoints
(`/api/investor/{deal-flow,watchlist,pipeline,outreach}`, lines 317–404).
`app/api/investor/deal-flow/route.ts:8-38` queries only `founder_profiles`/`qscores` via
`createAdminClient()`. No crawler code exists anywhere in the repo — a broad grep for
Apollo/Hunter/Clearbit/crawl/scrape/puppeteer/playwright across `app/` and `lib/` only matches the
**founder** side (`app/founder/settings/page.tsx:43`, `lib/llm/tools.ts:104-308`,
`lib/edgealpha.config.ts:75,248,280`) — these are lead-enrichment tools *founders* use for their own
GTM outreach, not investor-side sourcing of startups.

**Correction:** the plan's own §3 (Vertical 1) claim that "Apollo/Hunter are already wired in the
old model" for investor enrichment is misleading — they're wired for founders. Reusing them for
investor-side enrichment would be new integration work, not existing wiring.

### Vertical 2 — Screening / triage: **PARTIALLY TRUE**

- `thesis-upload` is real: `app/api/investor/thesis-upload/route.ts` extracts thesis fields via
  Claude. The text-extraction path correctly uses `routedText('extraction', ...)` (line 104), but
  the scanned-PDF vision path (lines 70–100) **hardcodes `model: 'claude-haiku-4-5-20251001'`
  directly via the Anthropic SDK**, bypassing `lib/llm/router.ts` — a CLAUDE.md §2 violation
  ("Models only through `lib/llm/router.ts`. Never hardcode a model name").
- `weights` is real: `app/api/investor/weights/route.ts` reads/writes `investor_parameter_weights`
  (`supabase/migrations/20260317000001_metrics_cohorts_momentum.sql:125`).
- **`deal-flow-with-dimensions` exists as a working route but is dead code.** A repo-wide grep for
  the string `deal-flow-with-dimensions` finds it only in the route file itself and in
  `INVESTOR_SIDE_PLAN.md` — **no page or component calls it.** Worse: it queries `founder_profiles`
  using the RLS-scoped client, not `createAdminClient()` (`app/api/investor/deal-flow-with-dimensions/route.ts:10-38`)
  — and `founder_profiles` RLS only grants `auth.uid() = user_id`
  (`supabase/migrations/20260700000001_founder_profiles_squashed.sql:186-189`), so even if something
  called this route, it would silently return an empty/near-empty result for any investor caller.

**Correction:** the actual scoring UI in `deal-flow/page.tsx` uses only `/api/investor/deal-flow` +
the investor's `weights` — `deal-flow-with-dimensions` is not part of the live thesis-scoring flow
and should not be cited as evidence Vertical 2 is more built-out than it is.

### Vertical 3 — Diligence: **PARTIALLY TRUE — one major overstatement**

- `startup/[id]/memo`: real and wired (`app/api/investor/startup/[id]/memo/route.ts:133-136`,
  button in `app/investor/startup/[id]/page.tsx:210-360`). Generation goes through `callClaude()` in
  `lib/claude.ts`, which **hardcodes `const MODEL = 'claude-haiku-4-5-20251001'`** (`lib/claude.ts:19`)
  — bypassing both `lib/llm/router.ts` and `lib/llm/provider.ts`. Same CLAUDE.md violation as above.
- `startup/[id]/chat`: real and wired, and **correctly** routed —
  `app/api/investor/startup/[id]/chat/route.ts:130` uses `routedText('reasoning', ...)`.
- `ai-analysis/readiness`: genuinely **4 independent parallel agents** (financial / GTM / market /
  product — `app/api/investor/ai-analysis/readiness/route.ts:265-270`), each calling
  `llmChat(..., modelTier:'fast')` → `claude-haiku-4-5`
  (`lib/llm/providers/anthropic.ts:6`), followed by a 5th "Sage" synthesis call at
  `modelTier:'capable'` → `claude-sonnet-4-5` (`route.ts:280-288`). This one *does* go through the
  provider/router abstraction properly, contrary to what "old-model" framing would suggest.

**Correction — the important one:** `ai-analysis/readiness` **has no UI path that reaches it.** Its
only consumer, `features/investor/hooks/useReadinessReport.ts:33`, has **zero component imports**
anywhere in the codebase. `app/investor/ai-analysis/page.tsx` calls a *different* endpoint
(`/api/investor/ai-analysis`, not `/ai-analysis/readiness`). The plan doc's claim that this vertical
is "already a real diligence product" / "surprisingly strong" **overstates current reality: the
backend is real, well-engineered, and unreachable from the app.** It is backend-complete, unshipped
— a completion task, not a discovery task, for Stage B.

### Vertical 4 — CRM / relationship: **PARTIALLY TRUE — one claim is backwards**

- `pipeline`, `connections`, `messages` all confirmed real and wired to real tables
  (`investor_pipeline`, `connection_requests`, `messages`).
- `watchlist` is a real **feature** but not a standalone page — embedded inside
  `deal-flow/page.tsx:317-332`, backed by `investor_watchlist`
  (`supabase/migrations/20260604000004_investor_watchlist.sql:4`).
- `outreach` is a real **action**, not a page — `app/api/investor/outreach/route.ts` writes to
  `connection_requests`; there is no `app/investor/outreach/page.tsx`.
- **`investor_contacts` — the table exists
  (`supabase/migrations/20260225000007_features_crm_content.sql:305-322`) but its RLS policy is
  literally named `"Founders manage own investor contacts"` (lines 318-320).** It's where a
  *founder* stores contacts of investors they want to reach — the mirror image of investor CRM. A
  repo-wide grep finds **zero query usages anywhere** — no route reads or writes it.

**Correction:** `investor_contacts` should not appear in an investor-CRM feature list at all; it's
an unused founder-side table. The plan doc's Vertical 4 entry needs this removed.

### Vertical 5 — Portfolio / LP reporting: **PARTIALLY TRUE — understated in the wrong direction**

- `portfolio-companies` (+ `import`, `bulk-invite`) is real and substantial: 850-line page, 5 API
  routes, backed by `investor_portfolio_companies`
  (`supabase/migrations/20260522000001_investor_portfolio_companies.sql:5`).
- **`investor_updates` — table exists
  (`supabase/migrations/20260225000007_features_crm_content.sql:203-223`) but its RLS policy is
  `"Founders manage own updates"` (lines 219-221)** — again a founder-side table (founders sending
  updates to *their* investors), not investor-generated LP reports. Referenced only as a name
  constant in `lib/constants/table-names.ts:47` — **zero actual queries against it anywhere.**
- **`portfolio_views` — table exists
  (`supabase/migrations/20260225000005_qscore_evidence_and_cache.sql:53`) with zero usages anywhere**
  in `app/`, `lib/`, or `features/`. Fully orphaned.
- **No LP-reporting-specific code exists at all.** A broad grep for LP-report/LP-update/export
  patterns turns up nothing except a UI label in `app/investor/settings/page.tsx` ("Upload your fund
  thesis or LP deck") — that's for *thesis extraction*, unrelated to generating LP reports.

**Correction:** the plan doc's "Portfolio yes; LP reporting thin" undersells how absent LP reporting
actually is. It isn't thin — it's **nonexistent**, and both tables the plan doc implicitly points to
as evidence (`investor_updates`, `portfolio_views`) are dead schema built for the founder side, not
live investor features.

### Corrected summary table

| Vertical | Plan doc's verdict | Verified verdict | Correction |
|---|---|---|---|
| 1. Sourcing | Confirmed as-is | **Confirmed** | None needed |
| 2. Screening | Exists, works | **Partially true** | `deal-flow-with-dimensions` is dead + silently broken (wrong client) |
| 3. Diligence | Exists, surprisingly strong | **Partially true (overstated)** | 4-agent readiness synthesis has zero UI wiring; memo hardcodes model outside the router |
| 4. CRM | Exists, basic | **Partially true (one claim backwards)** | `investor_contacts` is an unused *founder*-side table |
| 5. Portfolio/LP | Portfolio yes; LP reporting thin | **Partially true (understated)** | LP reporting is absent, not thin; cited tables are dead + founder-side |

---

## 2. Quality + security reality

Scope: all 46 route files under `app/api/investor*/**`, `app/api/investors/**`,
`app/api/auth/investor-signup/**`, `app/api/cron/investor-match-alerts/**`,
`app/api/admin/embed-investors/**`, every `app/investor/**` page, and every investor-touching
migration.

### CRITICAL

**C-1 — `demo_investors` is directly, publicly readable at the database layer, including real
investor PII, independent of any app-level fix.**

`supabase/migrations/20260508000001_demo_investors_rls.sql:13-16`:
```sql
CREATE POLICY "demo_investors_select"
  ON demo_investors
  FOR SELECT
  USING (is_active = true);
```
No `TO` clause — in Postgres this defaults to `PUBLIC`, which includes the unauthenticated `anon`
role. Any caller with the public anon key (embedded in every browser bundle,
`lib/supabase/client.ts:6-21`) can query this table directly via PostgREST, no session required,
bypassing Next.js entirely.

This is not just seed data. Real investor PII is written into it on every onboarding:
`app/api/investor/onboarding/route.ts:86-101` inserts `name, firm, location, check_sizes, stages,
sectors, geography, thesis` for every real investor via the `demo_investor_id` bridge, and
`:112-124` keeps it in sync on every profile edit.

The app-layer fix at `app/api/investors/route.ts:13-16` (added in commit `95b74e6`, "S-2: auth on
analyze-pitch + investors routes") only gates the Next.js route — it does **not** touch this RLS
policy, so the underlying data is still fully exposed to direct Supabase access. **The "Phase 0
fixed it" claim in the plan doc is true only for the app route, not for the table.**

This is the exact bug class `supabase/migrations/20260715000004_fix_permissive_rls.sql` fixed for
`scheduled_actions`, `agent_goals`, `delegation_tasks`, and `founder_metric_snapshots` — it was
never applied to `demo_investors`.

### HIGH

**H-1 — Founder deep-dive/chat/memo/share routes trust a client-supplied `founderId` with no
`visibility_gated` check.**

`visibility_gated` (the moderation flag defined in
`20260700000001_founder_profiles_squashed.sql`) is enforced only at the deal-flow **list** level
(`app/api/investor/deal-flow/route.ts:30,179,216` — `visible = withMatch.filter(f =>
!f.visibilityGated)`). It is **not** enforced on any direct-access route:
- `app/api/investor/startup/[id]/route.ts:14-36` — only checks `subscription_tier !== 'free'`.
- `app/api/investor/startup/[id]/chat/route.ts:15-52` — only `verifyAuth()`, no tier check, no
  gating check.
- `app/api/investor/startup/[id]/memo/route.ts:17-27` — only `verifyAuth()`, generates and persists
  an AI memo for any `founderId`.
- `app/api/investor/startup/[id]/share/route.ts:41-61` — only `verifyAuth()`.
- `app/api/investor/ai-analysis/readiness/route.ts:188-203` — `founderId` taken straight from
  `request.json()`, tier-gated but not ownership/visibility-gated.

**Net effect:** any investor who already has a founder's `user_id` (from watchlist history,
pipeline, a shared link, or enumeration) can pull the full profile/financials, run AI chat/memo
generation over it, and forward it to other investors — completely bypassing the moderation gate the
platform relies on to hide a founder from marketplace listing. Real, currently exploitable.

**H-2 — `/api/investor/startup/[id]/share` writes an arbitrary notification to any
`targetInvestorId`, unvalidated.**

`app/api/investor/startup/[id]/share/route.ts:44-49,67-81` — `targetInvestorId` is only checked for
truthiness, never validated against `investor_profiles`. The admin client then inserts a
`notifications` row for whatever UUID is supplied — could target a founder account or any arbitrary
user id, injecting a spoofed "X shared a startup with you" notification into any user's inbox.

**H-3 — 16 of 23 body-consuming investor routes have no Zod validation.**

Routes *with* Zod/`parseBody`: `pipeline`, `verify`, `weights`, `team/join`, `team/invite`,
`onboarding`, `auth/investor-signup` (7 total).

Routes with raw `await req.json()` and only ad-hoc `if (!x)` checks: `messages/route.ts:144`,
`config/route.ts:61-70`, `alerts/route.ts:427-439`, `connections/route.ts:130-133`,
`portfolio-config/route.ts:215-223`, `portfolio-companies/route.ts:281-286`,
`outreach/route.ts:335-337`, `watchlist/route.ts:648-649,676-677`,
`ai-analysis/chat/route.ts:233-237`, `ai-analysis/readiness/route.ts:188-190`,
`portfolio-companies/invite/route.ts:16-17`, `portfolio-companies/[id]/route.ts:15-16`,
`portfolio-companies/import/route.ts:15-19`, `startup/[id]/chat/route.ts:19-22`,
`startup/[id]/memo/route.ts:23-27`, `startup/[id]/share/route.ts:45-48`.

Concrete consequences, not just style: `ai-analysis/chat/route.ts:19-23` and
`startup/[id]/chat/route.ts:19-22` accept free-text with **no max-length check** before it's
interpolated into an LLM prompt (unbounded token-cost / prompt-injection surface);
`connections/route.ts:143` accepts any string for `action` with no enum validation.

### MEDIUM

- **M-1** — `deal-flow-with-dimensions` (see §1) is dead code that's also silently broken by RLS —
  worth deleting outright in Stage C, not just leaving flagged. Also uses raw
  `supabase.auth.getUser()` instead of the shared `verifyAuth()` helper, and has zero Zod usage.
- **M-2** — `app/api/investor/alerts/route.ts:393,445-448` builds its own raw
  `@supabase/supabase-js` client with the service-role key instead of the shared
  `createAdminClient()`/`getAdminClient()` factory. Functionally gated correctly (`INTERNAL_API_SECRET`
  header check, fail-closed if unset) — not itself a hole, but a blind spot for any future
  `grep -r "createAdminClient"` sweep.
- **M-3** — Exactly **two** self-flagged `as any` casts in the entire investor API surface
  (`app/api/investor/connections/route.ts:243,245`, each preceded by an eslint-disable comment).
  Worth stating plainly: **investor-side type hygiene is good** — this was not the expected finding
  going in.
- **M-4** — Inconsistent auth-check style: most routes use the shared `verifyAuth()` helper
  (`lib/auth/verify.ts:17-26`, well-built, fails closed); `config/route.ts:13-18,55-59` and
  `deal-flow-with-dimensions/route.ts:10-15` call `supabase.auth.getUser()` directly instead.
  Functionally equivalent, worth standardizing.
- **M-5** — `app/api/investor/verify/route.ts` (approve/reject investor verification) gates on a
  comma-separated `ADMIN_EMAILS` env var (lines 17,25-27,78-80). Fails closed if unset, but has no
  audit trail or rotation story — candidate for a proper roles table later.

### Verified sound (no findings)

- RLS ownership scoping on `investor_profiles`, `investor_pipeline`, `investor_watchlist`,
  `investor_portfolio_companies`, `investor_configs`, `investor_parameter_weights`,
  `investor_team_members`, `investor_team_invites`, and `connection_requests` is consistently
  owner-scoped (`auth.uid() = user_id`/`investor_id`/`investor_user_id`, or role-membership `EXISTS`
  checks for team tables). No `USING(true)` escape hatches and no other missing-`TO` bugs found
  besides C-1.
- Service-role writes to `connection_requests`/`messages` correctly re-derive and enforce ownership
  in application code before querying (`messages/route.ts:154-176`, `connections/route.ts:151-170`,
  `messages/[id]/route.ts:22-45`, `messages/[id]/read/route.ts:21-44`) — necessary because those
  tables are keyed by either a real `investor_id` or a `demo_investor_id`, which RLS can't OR across
  natively, so admin-client + app-level ownership checks is the correct pattern here, not a smell.
- `/api/investors` (plural) confirmed **no longer public** — `verifyAuth()` gate added in commit
  `95b74e6`. Before that commit it had no auth check at all, so the plan doc's "was public until
  Phase 0 fixed it" is accurate for the *route* (but see C-1 — the table it reads from still is).
- No LP/limited-partner-specific tables exist anywhere (`limited_partner`/`lp_`/`fund_lp` patterns
  searched, none found) — consistent with §1's LP-reporting-is-absent finding.
- `app/investor/**` pages are gated by `middleware.ts:65,83,96`; the two client-side Supabase reads
  found (`getting-started/page.tsx:114-117`, `onboarding/page.tsx:114`) are correctly
  `.eq('user_id', user.id)`-scoped.

### Founder-side comparison standard

`app/api/founder/profile/route.ts` and `app/api/profile-builder/submit/route.ts` both: call
`verifyAuth()` first; validate with `parseBody(req, founderProfilePatchSchema)` plus a nested-JSONB
schema for `startup_profile_data`; and return a fully-typed `FounderProfile` interface, not an
untyped passthrough. Investor-side Zod coverage is 7/23 routes vs. essentially 100% on this founder
comparison route — the concrete gap H-3 needs to close in Phase 0-I.

---

## 3. Entanglement with the shared founder engine — the central architectural bet, tested

`INVESTOR_SIDE_PLAN.md` §2 stakes the entire plan on one claim: *"Reuse the founder engine... turns
'build a VC platform' into 'add Registry entries and prompts.'"* This section tests that claim
directly against the engine's code, component by component.

### Part A — Is the engine actually generic enough?

**Registry (`lib/registry/**`, 18 files).** A Registry entry is one of four flat objects
(`Executive`, `ProgramTemplate`, `AssetDef`, `ActionDef` — `lib/registry/types.ts:46-137`), loaded
into arrays and cross-validated at import time (`lib/registry/index.ts:54-72,82-181`).

- **Programs / Assets / Actions: generic, investor-ready as-is.** `ProgramId`/`AssetId`/`ActionId`
  are open template-literal types — adding a new one is pure config, exactly as claimed.
- **Executive: founder-specific, needs real rework.** `ExecutiveId` is a **closed union of exactly
  five roles** — `'ceo' | 'growth' | 'product' | 'operations' | 'finance'`
  (`lib/registry/types.ts:30`) — and the file's own comment states *"the roster is fixed at five"*
  (`:21-24`). Adding an "Investor" or "Analyst" Executive requires **editing this type**, which is a
  code change, not a Registry addition — contradicting the "config, not code" premise the plan
  leans on for exactly this axis. The five-role roster also maps 1:1 onto founder company functions;
  there's no natural slot for investor-side concepts (a deal, a portfolio company, an LP).

**Composer (`lib/prompts/compose.ts` + `lib/prompts/**`).** **Generic, investor-ready as-is.**
`CompanyContext` (`lib/prompts/types.ts:50-70`) is `{ companyName?, currentDate?, strategy?,
contract?, qScore?, currentAssets?, newInformation? }` — no founder-specific field names, and
`renderCompanyContext()` (`lib/prompts/composer/company-context.ts:25-73`) is a pure function with a
prompt-injection defense, no DB reads. The founder-coupling is entirely upstream, in the *caller*
(Rhythm), not in the Composer itself.

**Rhythm (`lib/rhythm/**`). Founder-specific, needs real rework — not a rename.** `founderId` is a
first-class, hardcoded parameter throughout (`RunCycleArgs { founderId: string; ... }`,
`lib/rhythm/run.ts:36-40`, threaded into every downstream call). More decisive than the parameter
name: **the DB foreign keys enforce founder-only ownership as a hard constraint**:
```sql
-- supabase/migrations/20260715000001_strategy_sessions.sql:15
founder_id uuid not null references founder_profiles(user_id) on delete cascade,
-- 20260715000002_executive_contracts.sql:12,71 — same pattern
-- 20260715000006_asset_versions.sql:26 — same pattern
-- 20260803000002_action_log.sql:22 — same pattern
```
with RLS written against that literal column (`strategy_sessions_select_own` uses `auth.uid() =
founder_id`). `lib/rhythm/delta.ts:85-141` reads `asset_versions.founder_id`,
`agent_artifacts.user_id`, `qscore_history.user_id`, and `founder_metric_snapshots.user_id` directly
— exactly the dependency CLAUDE.md §0.4 already flags for the founder side itself.

**Assets (`lib/assets/**`, 2 files — genuinely thin, as expected).** CLAUDE.md's claim of
"immutable versions, provenance, exactly one current" is confirmed in code: `persistAssetVersion()`
(`lib/assets/versioning.ts:163-189`) calls a Postgres RPC that surfaces a `23505` unique-violation
conflict rather than silently overwriting; every row carries `authoredBy`, `programId`,
`executionId`, `previousVersionId`, `sourceRefs` (`:19-35`). But `AuthoredBy` is a closed union
`'program' | 'founder'` (`:17`), `founderId: string` is a literal field name, and the table carries
the same `founder_id → founder_profiles(user_id)` FK as Rhythm. **Generic mechanics, founder-specific
identity model.**

**Connectors (`lib/connectors/**`). Generic, investor-ready as-is for the interface + approval gate.**
Only Gmail is implemented, but the `Connector` interface (`lib/connectors/types.ts:64-73`) is
provider-agnostic. The just-in-time approval chain is genuinely solid and Registry-driven, not
founder-specific in logic:
1. `lib/registry/index.ts:168-178` — boot-time refusal if an irreversible action lacks `irreversible: true`.
2. `lib/actions/generate.ts:150-167` ("THE GATE") — irreversibility read from the Registry before
   the model runs; the model's opinion is never consulted (`:11-12`).
3. `lib/actions/approve.ts:93-154` — payload-hash re-check, 24h TTL, mandate-still-confirmed re-check.
4. `lib/actions/execute.ts:47-59` — re-checks everything again immediately before calling the provider.

Same pattern as Rhythm/Assets at the identity layer, though: `founder_id` FK on `action_log`
(`20260803000002_action_log.sql:22`) and `founderId: string` parameters throughout. Note also: an
**unrelated, pre-ADR-034 old-model investor action handler already exists**
(`lib/actions/handlers/send-investor-update.ts`, reads `founder_profiles.investor_emails`) —
architecturally distinct from this new engine, not part of what CLAUDE.md calls "the engine."

**Mandate (`lib/mandate/**`).** Type shapes (`StrategySession`, `ExecutiveContract`) are abstract
enough to plausibly hold investor concepts (`priorities`, `mission`, `goals` are generic
strings/arrays) — **generic but needs a role param** for the types. But every accessor takes
`founderId: string` as a required named parameter, and the table is `founder_id →
founder_profiles(user_id)` with matching RLS — **founder-specific, needs real rework** for
persistence.

### Part A summary

| Component | Verdict | Evidence |
|---|---|---|
| Registry — Programs/Assets/Actions | Generic, investor-ready | Open template-literal IDs |
| Registry — Executive | **Founder-specific, needs real rework** | `ExecutiveId` closed 5-role union, "fixed at five" by comment |
| Composer | Generic, investor-ready as-is | Pure functions, no founder-typed fields |
| Rhythm | **Founder-specific, needs real rework** | `founderId` params + hard FK on every table it touches |
| Assets | Generic mechanics / founder-specific identity | `AuthoredBy: 'program'|'founder'` closed union + FK |
| Connectors | Generic, investor-ready as-is (interface + gate) | Provider-neutral interface, Registry-driven gate |
| Mandate | Generic types / founder-specific persistence | Abstract type shapes, but FK + RLS hardcode `founder_profiles` |

**Bottom line: the engine's *shape* is legitimately generic and built that way on purpose. What is
not generic is its *identity substrate* — `founder_id` as a literal column with a hard FK to
`founder_profiles(user_id)`, replicated across `strategy_sessions`, `executive_contracts`,
`asset_versions`, `action_log`, plus matching RLS, plus TypeScript signatures that take `founderId:
string` by name throughout `lib/rhythm/**`, `lib/mandate/**`, `lib/assets/**`, `lib/actions/**`.**
Reusing the engine for investors is realistic for the *code paths and patterns*, but requires either
(a) a schema migration adding an owner-type-agnostic identity layer across ~5 core tables plus
matching RLS rewrites, or (b) parallel investor-flavored tables + an abstraction over "who owns this
row." Neither is "add Registry entries and prompts." **This is a direct correction to the plan
doc's central architectural claim** — the engine reuse is real and worth doing, but it is a
migration project, not a config exercise.

### Part B — What does the current (old-model) investor side depend on?

None of the `app/investor/**` page components read tables directly — all reads go through
`app/api/investor/**` routes (good hygiene), but this doesn't reduce the dependency itself:

| Table | Used by | For |
|---|---|---|
| `founder_profiles` | `deal-flow`, `deal-flow-with-dimensions`, `startup/[id]`, `startup/[id]/chat`, `startup/[id]/share`, `connections`, `watchlist`, `messages`, `personalize`, `portfolio`, `ai-analysis/*`, `onboarding` | Core founder identity, `startup_profile_data`, scoring columns, everywhere |
| `qscore_history` | `deal-flow` (via RPC `get_latest_qscores`), `startup/[id]`, `connections`, `watchlist`, `messages`, `personalize`, `cron/investor-match-alerts`, `matching/scores` | Score ranking + display throughout |
| `agent_artifacts` | `deal-flow` (activity signal), `startup/[id]` (specific artifact types), `startup/[id]/chat`, `ai-analysis/readiness`, `startup/[id]/memo` (**reads AND writes**) | Deep-dive content + memo generation |
| `profile_builder_data` | `startup/[id]` | Onboarding-extracted structured fields merged into founder deep-dive |
| `founder_profiles.startup_profile_data` (JSON) | `deal-flow`, `startup/[id]`, `ai-analysis/*`, `deal-flow-with-dimensions` | Free-form fields (TAM, business model, funding ask) |
| `demo_investors` | `onboarding` (writes), `app/api/investors` (reads), `matching/scores` | Investor-discoverable directory |

**Confirming CLAUDE.md §0.4's "hidden dependency" concern applies here too, and more broadly:** the
investor side's dependency on old-model tables is a **superset** of what `lib/rhythm/delta.ts`
itself touches. Two investor features (**deal-flow ranking, the founder deep-dive page**) cannot
function at all without `agent_artifacts`/`qscore_history`/`profile_builder_data`. The investor memo
route **writes** to `agent_artifacts` — a read-only freeze of these tables (as has been discussed for
the old adviser layer generally) would not just make the investor side stale, it would break memo
generation outright.

None of this lives behind the new engine's abstractions — it's raw Supabase queries against
old-model tables directly from route handlers, architecturally identical in style to the pre-ADR-034
adviser layer already deleted from the founder side. **If `agent_artifacts`, `qscore_history`,
`profile_builder_data`, or `startup_profile_data` are ever restructured as the new engine matures —
which is the explicit direction the founder side is heading — the entire current investor product
(deal flow, founder deep-dive, watchlist, connections, messaging previews, AI analysis, match
alerts) breaks simultaneously.** This is the strongest evidence in this audit that "reuse the
founder engine for investors" is a rebuild of the investor side, not an incremental addition to it —
the current investor side isn't adjacent to the new engine's data model, it's entirely dependent on
the model the new engine is designed to move away from.

**Also worth surfacing:** CLAUDE.md's own "Deferred — do not build" list (§1) already names
investor-side features. The plan doc doesn't address this existing instruction; Stage B should
resolve the conflict explicitly rather than let the agent cite one document against the other.

---

## 4. What's genuinely strong

Stated plainly, not just as counterpoints to the corrections above:

- **The diligence memo and chat are real, wired, and functional today** — model-hardcoding aside,
  an investor can generate an AI memo and chat about a specific founder right now.
- **The 4-agent readiness synthesis is well-engineered** — properly parallelized, properly routed
  through the LLM provider abstraction (unlike the memo route), with a sensible cheap-then-expensive
  model tiering (4× Haiku → 1× Sonnet synthesis). It is backend-complete; only the UI wiring is
  missing, which makes it the fastest possible win in Stage B, not a rebuild.
- **Investor-side type hygiene is good** — only 2 self-flagged `any` casts across the entire 46-route
  surface. This was not the expected finding and is worth Mo and Roman knowing plainly: the "old-model
  quality" framing in the plan doc is accurate for security/validation coverage (§2) but not for raw
  TypeScript hygiene.
- **RLS is correctly owner-scoped everywhere except the one critical gap (`demo_investors`)** — the
  team clearly applied the RLS discipline broadly; C-1 reads as a single missed spot, not a pattern.
- **Portfolio-companies (invite/import/bulk-invite) is substantial and real**, not a stub — 850 lines,
  5 routes, a real CSV import path.

---

## 5. The honest gap

Confirmed directly: sourcing is inbound-only, exactly as the plan doc states. There is no ranking
by momentum or trajectory today — `deal-flow`'s ranking uses a **static time-decay formula** on the
latest Q-Score (`app/api/investor/deal-flow/route.ts:151-156`), not a trend.

First-party signal that could be surfaced **without any new ingestion**, using data the platform
already captures:
- **GTM asset-version history** (`asset_versions`, once founders are operating on the new engine) —
  a live "this founder shipped 3 asset revisions this cycle" signal no external crawler can see.
- **`qscore_history` as a trend, not a snapshot** — the table already stores every historical score;
  today's deal-flow only reads the latest value with decay. Surfacing the delta (score moving up 12
  points over 3 cycles) is a query change, not a data-pipeline project.
- **`agent_artifacts` presence/type as an activity signal** — already partially used (deal-flow's
  artifact count, §1/§3), but not yet surfaced as a "these founders are actively building" feed.

This matches the plan doc's own Vertical 1 strategy (§3: "first-party signal... mostly reading data
you already generate") — the gap is real, and the plan's proposed direction for closing it is
consistent with what the codebase can actually support today.

---

## Summary for Stage B

Three corrections should shape the Stage B PRD/Feature-Inventory directly:

1. **Vertical 3's "surprisingly strong" diligence claim is a wiring task, not evidence of maturity**
   — the 4-agent readiness synthesis needs a UI, not a rebuild. Prioritize accordingly; it's cheaper
   than the plan doc implies.
2. **The engine-reuse bet is real but is a migration project, not a config exercise** — the identity
   substrate (`founder_id` FK chains, the closed `ExecutiveId` union) needs explicit design work
   before "add Registry entries" becomes true. Stage B's build-order should put this design decision
   before any investor Executive/Program work, not alongside it.
3. **Phase 0-I (security/quality remediation) has a concrete, prioritized list already** — C-1
   (public PII) should be the first fix regardless of what else Stage B proposes, since it's
   exploitable today with zero dependency on any architectural decision.
