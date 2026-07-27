# Claude Code prompt — add the circuit breaker, then prove the chunking works

> The chunked rhythm engine landed in `a1a9c5d`. Two things from the agreed design are missing,
> and one of them spends money if it goes wrong. Do Stage A, stop, then Stage B.

---

## Context

`runNextStep` + the self-triggering `/api/rhythm/step` chain are built. I verified the step route
returns its response before doing the Claude call and hands off via `after()` — good, that's the
part that matters. But:

1. **There is no circuit breaker.** I grepped: no max-step count, no runaway guard. A self-
   triggering chain with a bug in its "what's next" logic is an infinite loop, and **every
   iteration is a paid Claude call.** This must exist before the chain runs against the real model.
2. **The chunking has never been run against the real AI.** `TRIAL_OUTPUT.md` on disk is still the
   old 8.2-minute single-call run. So "the 8-minute problem is fixed" is true in code and unproven
   in reality — the exact gap that has misled us repeatedly on this project.

---

## Stage A — the circuit breaker (do first, it protects Stage B)

Add a hard stop to the run state machine so a buggy or stalled chain cannot loop forever or bill
forever:

- **Max steps per run.** Compute the ceiling from the run itself — `(assets + 1) per active
  program) + a small margin`. Persist a step counter on `operating_rhythm_runs` (reuse the
  existing `stages` jsonb or add one integer column, your call — additive, idempotent migration if
  a column). Each step increments it. Exceed the ceiling → mark the run `failed` with a clear
  reason (`'step_limit_exceeded'`), stop the chain, log loudly. Do **not** self-schedule again.
- **Retry cap per step.** A step that fails (timeout, transient error) may be retried a bounded
  number of times, not infinitely. **A timed-out Claude call was still billed by Anthropic** — an
  uncapped retry loop leaks money silently. After the cap, the step is `failed` and the run stops.
- Tests:
  - a run that would exceed the step ceiling is stopped and marked `failed`, not looped;
  - a step retried past its cap stops the chain rather than retrying forever;
  - a normal run (5 assets + briefing) completes **well under** the ceiling — the breaker never
    fires in the happy path (if it does, the ceiling is wrong).

**Do not change** the response-before-work ordering, the `after()` hand-off, the idempotency
behaviour (the `asset_versions` unique index), or anything in `runCycle` the existing tests rely on.

**Stop. Show me the diff and the new tests. Wait for "go".**

---

## Stage B — the trial that proves it (after I approve Stage A)

Run **one real-AI trial (~$2)** exercising the actual chained path — not the synchronous
`runCycle` wrapper, the real `/step` chain end to end. Write it to a **new** file
(`TRIAL_OUTPUT_CHUNKED.md`) so the old 8.2-minute baseline is preserved for comparison.

Report, plainly:

1. **The number that actually matters: the wall-clock time of the FIRST invocation** — how long
   the first `/step` call is alive before it returns. This is what a serverless timeout kills. If
   it's ~60–90s, the chunking works. If it's still minutes, the chain is cascading and the fix is
   decorative — say so.
2. **Per-step wall time** for all 5 assets + the briefing. Flag any single step that ran close to
   or past 60s — that tells us whether Hobby (if that's the tier) would occasionally time a step
   out and lean on the retry.
3. **Total end-to-end time** vs the 8.2-minute baseline.
4. **Correctness:** the chained run's final state is identical to what the old single-call run
   produced — same 5 assets persisted, same one briefing, `done: true`, exactly-one-current still
   holds. The chain must not have changed *what* gets produced, only *how* it's executed.
5. **The circuit breaker did not fire** in a normal run.
6. Anything you could not verify from where you sit — say it plainly.

Then one sentence: **based on the first-invocation number, does this survive a 60s cap, a 300s
cap (Pro), or does it still need the plan upgrade?** That answers the question that's been open.

---

## Out of scope
Story 3 · FU-003 · the density/verbosity question from the rightsizing trial · a founder-facing
progress UI · a real queue (QStash) · the old model. Just the breaker and the proof.

## How to report
Say what you verified and name what you didn't. The whole point of Stage B is to replace a
"probably works" with a measured number. Don't report "it works" — report the wall-clock time and
let the number speak.
