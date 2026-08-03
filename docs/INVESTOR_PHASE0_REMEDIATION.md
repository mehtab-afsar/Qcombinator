# Investor Side — Phase 0-I Remediation Plan (Stage C draft)

*A plan, not the work. Brings the retained investor side up to the founder side's
typed/tested/RLS-enforced standard, before real investor data/money flows through features built
on Stage B's inventory. Prerequisite phase — nothing in `docs/INVESTOR_FEATURE_INVENTORY.md`'s
build order past step 1 should start until this closes. Every item traces to
`docs/INVESTOR_AUDIT.md`; nothing here is a new finding.*

---

## Exit criteria — what "Phase 0-I done" means, concretely

Phase 0-I is complete when all four are true, each independently verifiable:

1. **No CRITICAL or HIGH finding from `docs/INVESTOR_AUDIT.md` §2 remains open.**
2. **The CI tenancy-regression suite (`__tests__/cross-tenant-rls.test.ts`) covers investor tables
   and the investor-reads-gated-founder-data shape**, not just founder-vs-founder isolation. A
   future regression of H-1's class fails a build, the same way a founder-side regression already
   does.
3. **Every investor route that consumes a request body validates it with Zod** (closing the 16/23
   gap from audit H-3), matching the founder-side pattern (`parseBody` + typed schema).
4. **No investor route builds its own raw service-role client** — every admin-privileged call goes
   through `createAdminClient()`/`getAdminClient()`, so a future `grep -r "createAdminClient"`
   security sweep is complete by construction, not by memory.

---

## Priority 1 — cross-tenant / founder-data leak risk (fix before anything else)

### C-1 — `demo_investors` public RLS — **already fixed, 4 Aug 2026**
`supabase/migrations/20260804000003_fix_demo_investors_public_rls.sql`, applied and verified live.
No remaining work. Listed here only so this plan's exit criteria are checkable against a complete
list, not because it's outstanding.

### H-1 — Founder deep-dive/chat/memo/share/readiness routes don't check `visibility_gated`
**The single most important open item in this plan.** `visibility_gated` is enforced only at the
deal-flow list level; five direct-access routes trust a client-supplied `founderId` with no
ownership or gating check (audit §2, full route list there). This is the real "cross-tenant data
leak" the brief's prioritization language points at — it's founder-data exposure via the
investor surface, not investor-vs-investor, but it's the same class of bug the CI suite exists to
catch, just on a different owner-relationship shape.

**Fix, one pattern, five routes:**
```ts
// Add to app/api/investor/startup/[id]/{route,chat/route,memo/route,share/route}.ts
// and app/api/investor/ai-analysis/readiness/route.ts, before any data is read:
const { data: founder } = await admin
  .from('founder_profiles')
  .select('visibility_gated')
  .eq('user_id', founderId)
  .single()
if (founder?.visibility_gated) {
  return NextResponse.json({ error: 'Founder not available' }, { status: 404 })
}
```
Returning `404` rather than `403` avoids confirming a gated founder's existence to an investor who
guessed/enumerated an id — matches the deal-flow list's existing behavior of simply omitting the
row. **Effort: small** — one shared helper (`requireVisibleFounder(admin, founderId)`), five
call-sites. **Verify:** extend the CI suite (see below) with a test seeding one gated founder and
asserting all five routes return 404 for a real, authenticated investor.

### H-2 — `/api/investor/startup/[id]/share` writes to any `targetInvestorId` unvalidated
**Fix:** validate `targetInvestorId` resolves to a real row in `investor_profiles` before the
notification insert — same shape as any other foreign-key-implied-but-not-enforced check:
```ts
const { data: target } = await admin
  .from('investor_profiles').select('user_id').eq('user_id', targetInvestorId).maybeSingle()
if (!target) return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 })
```
**Effort: trivial.** **Verify:** a unit/integration test posting a random UUID and asserting 400.

---

## Priority 2 — billing (per the brief's own prioritization — checked, not assumed)

**Finding: investor billing is sound.** `checkout`, `portal`, and `status` routes
(`app/api/investor/billing/*`) are each `verifyAuth()`-gated and scope every query to
`.eq('user_id', user.id)` — the authenticated session's own id, never a client-supplied one. The
shared Stripe webhook (`app/api/webhooks/stripe/route.ts`) verifies `stripe-signature` against
`STRIPE_WEBHOOK_SECRET` before processing any event, and resolves investor rows by
`stripe_customer_id`/`stripe_subscription_id`, not by trusting event payload identity fields.

**No fix required.** The only action item is **coverage, not correctness**: add investor billing's
three routes to whatever route-level auth-pattern test exists for founder billing (if one doesn't
exist for founder billing either, this is a shared gap, not an investor-specific one — worth a
one-line note back to Mo rather than inventing investor-only scope for it).

---

## Priority 3 — validation debt (H-3)

**16 of 23 body-consuming investor routes have no Zod schema.** Full list in audit §2. Grouped by
effort, not by route, since the fix is mechanical once a schema exists per shape:

| Group | Routes | Schema shape needed |
|---|---|---|
| Simple id + enum body | `connections` (accept/decline), `watchlist` (add/remove) | `{ action: z.enum([...]) }` — closes the "any string silently declines" bug named in the audit as a concrete consequence, not just style |
| Free-text into LLM prompts | `ai-analysis/chat`, `startup/[id]/chat` | `{ message: z.string().max(N) }` — the max-length bound is the actual fix (unbounded token-cost/prompt-injection surface), Zod is the mechanism |
| Config/preference bodies | `messages`, `config`, `portfolio-config`, `outreach`, `portfolio-companies` (+`invite`,`import`,`[id]`), `startup/[id]/memo`, `startup/[id]/share` | Route-specific object schemas — mechanical, no design decisions, straightforward port of the founder-side `parseBody` pattern |
| Internal/cron | `alerts` | Already gated by `INTERNAL_API_SECRET` (not user-facing) — lowest priority in this group, include for completeness |

**Effort: medium, spread across ~15 routes, no architectural risk.** This is the largest line-item
in Phase 0-I by route count but the lowest risk per route — mechanical application of an existing,
proven pattern (`lib/api/validate.ts`'s `parseBody`).

---

## Priority 4 — hygiene (M-1 through M-5)

- **M-1 — delete `deal-flow-with-dimensions`.** Confirmed dead (zero callers) and confirmed
  silently broken (wrong Supabase client) in the audit. Remove the route file outright — per Stage
  B's F2.3, this is not "rebuild," it's deletion. **Effort: trivial.**
- **M-2 — migrate `alerts/route.ts` off its raw service-role client** onto
  `createAdminClient()`/`getAdminClient()`. Not itself a vulnerability (correctly gated by
  `INTERNAL_API_SECRET`), but closes a blind spot for future `grep`-based audits — ties directly to
  this plan's exit criterion 4. **Effort: trivial.**
- **M-3 — the 2 `as any` casts in `connections/route.ts`.** Already self-flagged with eslint-disable
  comments; type them properly once the Zod schema for that route (Priority 3) exists, since the
  cast is likely working around an untyped join result the schema will resolve naturally.
  **Effort: trivial, bundle with Priority 3's `connections` work.**
- **M-4 — standardize on `verifyAuth()`** in `config/route.ts` and (moot after M-1's deletion)
  `deal-flow-with-dimensions/route.ts`. **Effort: trivial.**
- **M-5 — `ADMIN_EMAILS` env-var admin gate.** Lower priority than the above — functionally sound
  (fails closed), just lacks an audit trail. Flag for a future roles-table pass; **not a blocker**
  for Phase 0-I's exit criteria as written above.

---

## The CI database extension — the concrete, testable core of this plan

`__tests__/cross-tenant-rls.test.ts` currently seeds two founders and asserts founder B cannot read
founder A's rows across `strategy_sessions`, `executive_contracts`, `asset_versions` — zero
investor tables. Two distinct extensions are needed, because they test two different relationship
shapes:

### Extension 1 — investor-vs-investor isolation (the same shape the suite already proves)
Add investor-owned tables to the existing `TABLES` array pattern, with an investor-flavored
`seedInvestor()` mirroring `seedFounder()`:
```ts
const INVESTOR_TABLES = [
  'investor_pipeline',
  'investor_watchlist',
  'investor_portfolio_companies',
  'investor_parameter_weights',
] as const
```
Same assertions as the existing suite: investor B reads zero of investor A's rows; B sees only its
own rows unfiltered; B cannot write a row owned by A. **This is mechanical — copy the existing
founder pattern, new fixture data, same assertions.**

### Extension 2 — the H-1 shape: investor reads gated founder data (NEW pattern, not a copy)
This is the shape the existing suite cannot catch by extension alone, because it isn't
investor-vs-investor — it's investor-vs-founder, gated by a moderation flag rather than by
ownership. Needs a new test block:
```ts
// Seed one founder with visibility_gated = true, one real investor.
// Assert: GET /api/investor/startup/[gatedFounderId] returns 404 for the investor,
// via the actual route handler (or the real DB query it issues), not a mock.
```
**This directly replaces the false-confidence mock test in `__tests__/rls.test.ts`** (the one
whose comment claims this route was "fixed" while testing a stand-in function). Once Extension 2
lands, that mock block should be deleted or explicitly marked superseded — leaving both would let
a future reader trust the mock's comment again.

### `connection_requests`/`messages` — deliberately NOT added to the mechanical extension
These tables are keyed by either a real `investor_id` or a `demo_investor_id`, and RLS can't OR
across the two (the audit confirmed this is *why* the app-layer ownership checks in
`messages/route.ts`/`connections/route.ts` exist and are correct). A naive
`.eq('investor_id', A)` test would pass vacuously for rows created via the `demo_investor_id` path.
**If these are added to CI coverage, it must be as an application-level integration test against
the route handlers, not a raw-table RLS test** — flagged here so Stage C execution doesn't silently
write a vacuous test and mark this covered.

---

## Explicitly out of scope for Phase 0-I

- **`docs/INVESTOR_PRD.md` §6b (the identity-substrate decision).** That's an architecture decision
  gating *new* Registry-shaped features (Stage B's F2.4/F3.4/F5.2/F5.3). It has no bearing on
  securing the *existing* routes this plan covers — conflating the two would stall a fixable,
  bounded security pass behind an unrelated, unbounded architecture decision.
- **The three conflicts in `docs/INVESTOR_PRD.md` §8** (ADR-009, Roadmap Phase 7/9 sequencing,
  CLAUDE.md's deferred list). Phase 0-I is worth doing regardless of how those resolve — a security
  fix isn't contingent on a sequencing decision. Restated from the PRD's own summary, not new here.

---

## Sequencing within Phase 0-I

| Step | Item | Effort | Depends on |
|---|---|---|---|
| 1 | H-1 fix (5 routes, 1 shared helper) | Small | — |
| 2 | H-2 fix | Trivial | — |
| 3 | M-1 delete dead route | Trivial | — |
| 4 | Priority 3 — Zod on ~15 routes | Medium | — (parallelizable with 1–3) |
| 5 | M-2, M-3, M-4 hygiene | Trivial each | M-3 benefits from step 4's schema work landing first |
| 6 | CI Extension 1 (investor-vs-investor tables) | Small | — (parallelizable with 1–5) |
| 7 | CI Extension 2 (H-1 regression guard) | Small | Step 1 (needs the fix to exist to test against) |
| 8 | Delete/supersede the false-confidence mock in `rls.test.ts` | Trivial | Step 7 |
| 9 | Billing test coverage (Priority 2) | Trivial | — |

Steps 1–6 and 9 have no dependencies on each other and can run in parallel. Step 7 must follow
step 1 (a regression test needs the fix present to assert against). Step 8 should be the literal
last commit of this phase — deleting the misleading test before its replacement exists would
briefly remove the only (false) signal on this route; after it exists, the mock is not just
redundant but actively worse than nothing.

**Total shape: mostly small/trivial items, one medium item (Zod coverage), zero large items.** Every
item in this plan was already fully diagnosed in Stage A — Phase 0-I is execution against a known
list, not further discovery.

---

## Summary for Stage D

Phase 0-I has no open design questions of its own — everything above is a fix, not a decision.
The one thing Stage D's roadmap needs from this plan: **Phase 0-I can start immediately and
independently of the three conflicts in `docs/INVESTOR_PRD.md` §8**, since none of those conflicts
bear on whether the existing routes are secure. Whatever Mo + Roman decide about sequencing,
architecture, or the deferred-features conflict, this plan's nine steps remain the same nine
steps.
