# Claude Code prompt — Story 2 remediation (B1–B5) + a decision paper on B8

> Paste this whole file as your next message. **Staged**: A → stop → B → stop → C → stop → D.
> Nothing here changes what Story 2 is *for*; it makes what's built actually work.

---

## Context

Read first: your own Story 2 analysis (the B1–B8 findings), `CLAUDE.md`, `FOLLOWUPS.md`,
`DecisionLog.md` (ADR-008 on `runsWhen`, ADR-009 on the deferred Outcome Loop).

Everything is behind `FF_NEW_EXECUTIVE_MODEL` (off), so no user is affected. Do not treat that
as licence to move fast — this is the code a pilot will run on.

**Out of scope for this task:** B6 and B7 (they only bite with a second Program), FU-001/002/003,
and anything in the old model. Do not fold them in.

---

## Stage A — B1 and B2, plus the test that should have caught B1

### B1 — Briefings are 100% broken

`generateBriefing` overloads one `programId` for two incompatible things: the Registry lookup
(needs `'P001'`) and the database column (needs a UUID). The engine passes the UUID, so the
Registry lookup throws every cycle and no briefing is ever produced.
(`lib/briefings/generate.ts:97`, `lib/rhythm/run.ts:128`.)

Fix it by passing **both** identifiers explicitly, with names that make confusing them impossible
(`templateId` vs `programRowId`, or similar). If the same ambiguity exists anywhere else in the
new model, fix it there too and say where.

### The test that matters more than the fix

Your own diagnosis: *"the tests mocked this exact seam, so the two halves were never run
together."* That is the fourth time on this project a green signal has failed to touch the thing
it appeared to certify — CI watching branches that don't exist, a corrupt file silently killing
typecheck, RLS tests that parse SQL text rather than test access, and now this.

So: **add one end-to-end test for Story 2 that mocks nothing except the LLM call itself.** Real
modules, real database (local/shadow), running rhythm → program → asset persistence → briefing
generation → run record, and asserting a briefing actually exists at the end.

Not a regression test for B1. A test that would have caught B1 *without anyone knowing B1
existed*. If a seam can only be crossed by mocking both sides, it isn't tested.

### B2 — a founder can drain the AI budget

`app/api/rhythm/run/route.ts:20` accepts a client-supplied `cycleKey`, bypassing the once-a-week
guard, and the route has no rate limit. Each cycle costs several paid LLM calls.

- Derive `cycleKey` **server-side** in production. If a client-supplied key is useful for testing,
  gate it on a non-production environment explicitly — not on a flag that could ship on.
- Add the route to the rate limiter in `middleware.ts`.
- **Note the wider rule while you're there:** the rate limiter fails open when Upstash isn't
  configured (`middleware.ts` returns `null` and the check is skipped). A rate limit is therefore
  not sufficient protection on its own for a paid path — say in your report whether the fix holds
  if Upstash is absent.

**Stop. Show me the diff, the new end-to-end test, and its output. Wait for "go".**

---

## Stage B — B3, B4, B5 (pilot quality)

- **B3 — sanitise model output before persisting** (`lib/rhythm/judge.ts:42`). Strip code fences
  and conversational preamble ("Here's your updated ICP: …") so the saved Asset is the artefact,
  not the chat. All five pilot Assets are this format. Do it in one place, and test with realistic
  messy output — fenced, prefixed, and clean.
- **B4 — honest per-step status** (`lib/rhythm/run.ts:106,137`). A failed step must read `failed`,
  not `pending`. The founder-visible detail currently contradicts the run status. Test the failure
  path, not just the happy path.
- **B5 — a failed cycle must be retryable** (`lib/rhythm/runs.ts` + both rhythm routes). Today a
  failed week is blocked until the next week, stranding half-written Assets. Allow a re-run when
  the existing run for that `cycle_key` is `failed` — **without** weakening the idempotency
  guarantee for successful runs. State clearly how you keep both properties, and test:
  success → blocked · failure → retry allowed · retry succeeding → still exactly one successful run.

**Stop. Show me. Wait for "go".**

---

## Stage C — verify, then report

- Full suite green; typecheck and production build clean.
- **Runtime verification against a real database**, listing each behaviour checked and its result.
  Name explicitly anything you could not verify from where you sit.
- Update `FOLLOWUPS.md`; add any new ADR to `DecisionLog.md`.
- Confirm B6/B7 are still open and untouched.

---

## Stage D — B8: a decision paper, NOT an implementation

**Do not write code for this stage.** B8 is Mo's decision; your job is to make it a well-posed one.

The finding: every cycle regenerates Assets from identical inputs — same strategy, same contract,
same prior Assets. Nothing new enters, so "weekly regeneration" is the model rewriting the same
document. Two consequences you should state plainly in the paper:

1. **Story 2's exit criterion is "AS001–AS005 measurably improve across ≥2 cycles."** With no new
   inputs, any difference between cycles is model variance, not improvement. Say whether you agree
   the criterion is currently unmeetable as written.
2. **October's gate is week-4 retention.** Assess honestly whether a founder has a reason to
   return to a briefing derived from unchanged inputs.

Then write up the options, each with: what feeds a cycle, effort, what it changes about what the
pilot proves, and which ADRs it touches.

- **Option 1 — feed from signals that already exist.** Founder Asset edits (ADR-007 already makes
  these the current version), new Company Builder uploads/artefacts, Q-Score changes,
  `founder_metric_snapshots`. Inventory what is genuinely available today and how fresh it is.
- **Option 2 — event-driven rather than calendar-driven.** Run when something changed. Note this
  reopens ADR-008 (`runsWhen` was explicitly deferred) and say what that costs.
- **Option 3 — change what the pilot claims.** Position it as "the system maintains your company's
  documents as your thinking evolves" rather than "an AI executive team runs your company."
  Cheapest; honest; a weaker claim. Say what it means for the October read.

Give a recommendation with reasoning. Note where the deferred Outcome Loop (ADR-009) would have
been the natural feed, and whether any part of it needs pulling forward.

**Deliverable: `B8_DECISION.md`. No code.**

---

## Definition of done

- [ ] B1 fixed; the ambiguous identifier renamed so the mistake can't recur.
- [ ] **An unmocked end-to-end Story 2 test exists and passes** — real modules, real database,
      only the LLM call stubbed.
- [ ] B2 fixed server-side, rate-limited, and honest about the fail-open caveat.
- [ ] B3, B4, B5 fixed with tests covering the failure paths, not only the happy paths.
- [ ] Full suite green; types and production build clean; behind the flag; old model untouched.
- [ ] `B8_DECISION.md` written, with a recommendation and no code.
- [ ] B6, B7, FU-001/002/003 untouched.

## How to report

Say what you verified and name what you didn't. The most useful thing in your Story 2 analysis was
admitting B1 was yours and explaining *why* the tests missed it. Keep doing that.
