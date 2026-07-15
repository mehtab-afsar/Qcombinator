# ⛔ FROZEN — do not add or edit routes in this folder

**Rule:** CLAUDE.md §0.4 · **Decision:** ADR-014 (strangler migration) · **Spec:** `EDGE_ALPHA_PRD.md` §11

**173 route files live here — 63% of the entire 275-route API surface.** That is the problem the Executive model exists to solve. Capability grew by cloning a route per agent; the replacement grows by adding a **Registry entry** (CLAUDE.md §0.1: *config over code*).

## The rule

> About to copy-paste a route in here? **Stop.** That is the 170-route mess. Use the Registry.

New work goes in `lib/registry/**` with generic routes (`/api/programs/[id]/actions/[actionId]`), behind `FF_NEW_EXECUTIVE_MODEL` (`lib/feature-flags.ts`, default off).

**Do not delete this folder.** It is the live product. Deletion happens **last**, after the new model reaches parity (ADR-014).

## The one exception

**Security guards may be fixed in place (ADR-017)** — *only* to restore an invariant CLAUDE.md §3 already mandates, minimal diff, one ADR entry per use.

Applied once: `atlas/weekly-scan/route.ts:210`. Its cron guard read `if (cronSecret && ...)`, which **fails open** — with `CRON_SECRET` unset the route was fully public and could spend paid Tavily budget across up to 500 founders. Now `if (!cronSecret || ...)`. Five of the six `CRON_SECRET` consumers already failed closed; this was an oversight, not a design choice.

## Things a well-meaning person might "fix" — don't

- **The Q-Score boost fires from here, and that is correct.** Five call sites across four files (`chat:616,809` · `generate:434` · `generate/run:270` · `process-delegation:197`). ADR-005 decouples the score for the **new** model only. **A change here is a regression, not progress.**
- **`x-user-id` is written but read by nobody.** `schedule/run:81,94` and `tool-runner.ts:259` send it; **zero readers exist**. It looks exactly like a bug worth fixing. **It is load-bearing.** It is the sole reason the bulk-outreach path 401s instead of firing — and there is no working approval gate behind it (the queue write violates a NOT NULL constraint, and approving executes nothing). "Fixing" it switches on unattended bulk email to third parties. See `PHASE0_AUDIT.md` §6, finding #7.
- **The drain cron hits GET, not POST.** `vercel.json` → `schedule/run` GET is a health check; the drain logic is in POST and never runs. Same trap as above: wiring it activates the same ungated path.

## Read first

`PHASE0_AUDIT.md` — every artifact/action creation path with file:line, what it writes, whether it moves the score, and whether it can fire unattended. It is the parity checklist for the new model.

**Reconciliation:** of the 173 files here, **6** create artifacts; **167** do not — the per-agent routes mostly return computed JSON without persisting. Any claim that "170 routes create artifacts" is wrong by ~28×.
