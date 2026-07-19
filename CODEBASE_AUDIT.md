# Edge Alpha — Full Codebase Audit

*Independent review of the whole repository, measured against `CLAUDE.md`. Every claim below
was checked directly against the code, not inferred from documentation. Snapshot: 19 Jul 2026,
`master` after F12.*

---

## 1. Shape

| | |
|---|---|
| TypeScript files | 779 |
| Lines of code | ~155,600 |
| API routes | **282** — of which **173 (61%) under `app/api/agents/**`** |
| Migrations | 69 |
| Test files | 49 (19 Jest / blocking · 29 Playwright / mostly advisory) |

The route concentration is the sprawl the rebuild exists to fix, and it hasn't moved — correctly.
Those routes are frozen and get deleted at Phase 7, not before.

---

## 2. What is genuinely strong

**Type safety is excellent.** Across ~155,600 lines there are **10 uses of `any`** total (3 `: any`,
7 `as any`). Most codebases this size have hundreds. The new-model code has **zero**.

**Logging discipline.** **2** `console.log` in the entire repository. A structured logger is used
everywhere else.

**No committed secrets.** No `.env` files tracked in git, no hardcoded keys, no private key
material anywhere in the source.

**Internal endpoints are properly gated.** `process-delegation` and `generate/run` — the two
routes that trigger LLM work autonomously — both verify `INTERNAL_RUN_SECRET` before doing
anything. (An earlier pass of this audit flagged them as unauthenticated; that was a false
positive from a grep that didn't know the header name. They are fine.)

**Of 282 routes, only 16 have no authentication gate**, and most of those are legitimately public
(signup, password reset, email confirmation, unsubscribe, invite validation, survey).

**The new-model code is markedly better than what it replaces.** Routes are 43–121 lines; the old
model's worst files are 3,467 / 2,831 / 2,280 lines. Invariants are enforced in the database
rather than by convention.

---

## 3. Security findings

### 🔴 S-1 — `/api/analyze-pitch` is a public, unauthenticated endpoint that spends your LLM budget

`app/api/analyze-pitch/route.ts` has **no authentication of any kind** — no session check, no
internal secret, no API key. It calls `callClaude()` directly with user-supplied text.

The only control is a middleware rate limit of **8 requests/minute**. Two problems:

1. Even when working, 8/min sustained is **~11,500 Claude calls per day**, billed to you, from
   anyone on the internet.
2. **The rate limiter fails open.** `middleware.ts` returns `null` when Upstash isn't configured
   (`if (!url || !token) { _redisUnavailable = true; return null }`), and the caller skips the
   check. So if `UPSTASH_REDIS_REST_URL` / `_TOKEN` are absent or wrong in production, the
   endpoint is **unauthenticated and unlimited**.

**Do now:** confirm the Upstash variables are set in Vercel production. Then require auth on this
route, or move it behind an internal secret. Cost exposure, not data exposure — but unbounded.

### 🟠 S-2 — `/api/investors` is public **and** bypasses RLS

`app/api/investors/route.ts` uses `createAdminClient()` (service role — RLS does not apply) with
**no auth check**, returning investor profiles including firm, thesis, check sizes and portfolio.

This may be an intentional public directory. But *unauthenticated + service-role* is the single
riskiest combination in the codebase: the database's own protection is switched off and nothing
else stands in front of it. **Confirm intent.** If it is meant to be public, restrict the selected
columns to what you'd publish on a marketing page. If not, add `verifyAuth()`.

### 🟠 S-3 — 188 routes use the service-role client

188 of 282 routes construct an admin/service-role client, which bypasses RLS entirely. 130 are
under the frozen `agents/**` tree. This is why the Phase 0 RLS leak went unnoticed for months:
**when most code bypasses RLS, RLS being wrong is invisible.**

Not fixable now (it's the old model), but it is the strongest argument for the new model's
discipline — and a reason not to let the new tree drift toward the same pattern. Currently only
F11's deliberate, revoked-and-gated use qualifies. Keep it that way.

### 🟡 S-4 — Cross-tenant enforcement is still not proven automatically

Two Jest RLS tests exist. Both say in their own headers that they do **not** touch a database —
one parses migration SQL as text, the other checks query-builder patterns. The test that actually
proves founder B cannot read founder A's row is `e2e/security/rls-idor-tests.spec.ts`, which runs
with `continue-on-error: true` and therefore cannot fail CI.

Blocked by **FU-003** (migrations don't replay from empty → CI can't have a database).
**Until then, verify by hand with two accounts.** This claim has now appeared as a bare ✅ in
three separate project documents; it deserves stricter wording than the rest.

---

## 4. Quality findings

### Q-1 — `flagOff()` duplicated five times

The same three-line feature-flag guard is independently defined in:

```
app/api/strategy/route.ts:46      app/api/assets/[id]/route.ts:37
app/api/contracts/route.ts:32     app/api/briefings/route.ts:16
```

plus inline in `contracts/new-epoch/route.ts`. Violates §2 (*"No duplicated logic — extract a
shared function"*) and §7 (*"Reject duplication"*). `lib/api/response.ts` already exists as the
natural home.

**Small, but it grows one copy per feature — F12 added the fifth without anyone noticing.** That
is exactly the mechanism that produced 173 routes: nothing was ever big, it was just copied once
more. It is also a security-relevant guard, so five copies means five places to get it wrong.

### Q-2 — Two logic files exceed the ~300-line rule

- `lib/prompts/compose.ts` — **532 lines**. The most important file in the system.
- `lib/mandate/contract.ts` — **386 lines**.

And four functions exceed the 50-line rule: `validate()` **81**, `createDraft()` **80**,
`composePrompt()` 52, `renderCompanyContext()` 47.

Cohesive rather than tangled — but `validate()` at 81 lines inside a 532-line Composer is where
the file starts becoming risky to change, and it is the file you least want to fear.

### Q-3 — The prompt-content exemption is real but undocumented

`lib/prompts/programs/p001.ts` is **1,010 lines**; `knowledge/growth.ts` 486; `assets/as004.ts`
461. On paper, flagrant breaches — in fact they contain **zero functions**. They are prompt prose.
Splitting them would harm readability.

Keeping them whole is right. **But it isn't written down**, so the next person either splits them
pointlessly or cites them to justify a 1,000-line file that *is* logic. Record an ADR: *the
~300-line limit applies to code; prompt-content modules are exempt **provided they contain no
logic**.*

---

## 5. Old model vs new model

| | Old (`agents/**`, frozen) | New (`lib/registry|prompts|mandate|assets|briefings`) |
|---|---|---|
| Routes | 173 | 5 generic |
| Largest file | 3,467 lines | 1,010 (prompt content) / 532 (code) |
| `any` | a handful | **zero** |
| Bypasses RLS | 130 routes | one, deliberately, revoked + gated |
| Invariants | convention | **database triggers + unique indexes** |
| Tests | sparse | 411 passing, incl. concurrency and negative cases |

The rebuild is producing better code by every measure available. The old tree's numbers are the
justification for the strangler, not a criticism of current work.

---

## 6. What to do, in order

1. **Check `UPSTASH_REDIS_REST_URL` / `_TOKEN` are set in Vercel production** (S-1). Minutes. If
   they're missing, a public endpoint is spending your money without limit right now.
2. **Decide `/api/investors`** (S-2) — public by design, or add auth?
3. **Extract `flagOff()`** into one shared helper (Q-1). Ten minutes, before Story 3 adds more routes.
4. **Verify cross-tenant isolation by hand** with two accounts (S-4). Ten minutes; the guarantee
   most asserted and least proven.
5. **FU-003** — make migrations replay from empty. Unblocks CI-enforced security testing. Schedule
   before F10.
6. **Split `compose.ts` and `contract.ts`** (Q-2) and **write the prompt-exemption ADR** (Q-3).

Items 1 and 4 are today. Nothing here blocks F10.

---

## 7. Verdict

**Nothing has been screwed up.** The new code is disciplined — typed, thin, tested, with the
important rules enforced by the database rather than by hope. The audit found no architectural
mistake and no data-exposure bug in anything built since Phase 0.

The two things worth acting on are inherited, not new: an unauthenticated endpoint that can spend
your LLM budget behind a rate limiter that fails open, and the fact that your most-repeated
security claim still rests on tests that never touch a database.
