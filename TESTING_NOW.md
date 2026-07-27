# How to test what's built — Phase 0 + Story 1 + Story 2 (F11, F12, F10)

*Follow in order. Level 1 needs nothing. Level 2 needs the flag on. Level 3 is the security
check. ~25 minutes total. Snapshot: 27 Jul 2026.*

---

## Level 1 — the tests (2 min, touches nothing)

```bash
cd ~/Desktop/Qcombinator
npm test
```

**Expect:** ~530 passing, 0 failing. (2 skip unless a local database is running — see Level 2b.)

This is the highest-value check and the one to re-run after every change. If something here
goes red, stop and read it — it means a rule you locked in has been broken.

Worth knowing what's *not* proven here: these are unit tests. They don't prove a second real
user is blocked from your data — that's Level 3.

---

## Level 2 — walk the flow yourself (15 min)

### Turn the new model on, locally only

In `.env.local`:

```
NEW_EXECUTIVE_MODEL=true
```

Then:

```bash
npm run dev
```

> With the flag **off**, every new-model route returns **404** (not 403 — the route
> "doesn't exist"). If you see 404s, the flag isn't on. Never set this in production.

### The walk

**1 · Strategy — http://localhost:3000/founder/strategy**

Write a mission, a few priorities, goals. Save.

*Check:* edit and save again → the first version is **kept**, not overwritten. Nothing is ever
destroyed in this system; that's the design.

**2 · Contract — confirm your mandate**

The AI drafts an Executive Contract from your Strategy. Read it — this is F06 (the Composer)
and F05 (the Registry) doing their job: the draft is validated against the Registry before it
reaches you.

Confirm it. **This is the only sign-off in the entire product.**

*Check:* try to change a confirmed contract. It should refuse — a database trigger physically
blocks edits. A change creates a **new epoch** instead. If you can edit one in place, that's a
serious bug, tell me.

**3 · Command View — http://localhost:3000/founder/executive**

You should see your mandate and the active Programs (P001 GTM).

*Check:* there is **no "approve this week's work" button** — and there never should be. If one
appears later, the gate the PRD deliberately removed has been rebuilt.

**4 · Assets — http://localhost:3000/founder/assets/AS001**

Empty at first ("This asset has no versions yet") — correct, until a cycle has run (Level 2b).

Type some content and save. This is the interesting part: **you're exercising the exact write
path a Program will use**, just with `authored_by='founder'`.

*Check, in order:*
- Save → becomes **version 1**, current.
- Edit and save again → **version 2** is current, **version 1 still in history**.
- **Restore** version 1 → creates a **version 3** (a copy of v1). It does *not* rewind to v1.
  History only ever grows.
- Open two browser tabs, edit in both, save both quickly → one wins, the other gets a clean
  error (409). You should **never** see two current versions or zero.

That last one is the concurrency guarantee. It's the thing most likely to be subtly wrong, and
the database is what enforces it.

---

## Level 3 — the security check (5 min)

F11's write function is deliberately **not callable by a logged-in user** — otherwise someone
could skip validation and forge who authored a version. Confirm the lock holds.

In the **Supabase SQL editor**:

```sql
-- Should return FALSE for both.
select has_function_privilege('authenticated',
  'persist_asset_version(uuid,text,uuid,uuid,jsonb,text,text,text,jsonb,text)', 'execute');
select has_function_privilege('anon',
  'persist_asset_version(uuid,text,uuid,uuid,jsonb,text,text,text,jsonb,text)', 'execute');
```

*(If the signature errors, run `\df persist_asset_version` or check the migration for the exact
argument list.)*

**Expect `false`, `false`.** If either says `true`, the validation gate is bypassable — tell me.

---

## Level 2b — the Operating Rhythm (F10 + F12), the part that actually costs money

*Needs the flag on, a local database, and `INTERNAL_RUN_SECRET` set — without that last one the
chain does step 1 and then stalls (which is itself worth seeing once; see the last check).*

**5 · The cycle — http://localhost:3000/founder/executive**

With a confirmed mandate you'll see **"This week's cycle"** with a **Run now** button.

⚠️ **This spends real money** (~$2 for P001's five documents plus a briefing) and takes ~8
minutes. Each step is one Claude call of ~90 seconds.

*Check, in order:*

- **It returns immediately**, not after 8 minutes. The cycle runs as chained background steps.
- **The step list ticks over** — one document at a time, "2 of 6", earlier ones showing a tick.
  If it sits on step 1 forever, the chain isn't self-triggering: check `INTERNAL_RUN_SECRET`.
- **Run now again mid-cycle** → the button is hidden while running. Calling the API directly
  returns **409**, not a second run. *One cycle per week per founder is the idempotency
  guarantee — if you ever get two runs for one week, that's a serious bug, tell me.*
- When it finishes, **Assets have new versions** and a **briefing appears below** naming only
  documents that genuinely exist. A briefing claiming a document you can't open is a
  provenance bug (this has happened before — it's why the briefing reads from the database
  rather than from the model's memory).
- **Run now again after it completes** → 409 again. The week is spent.

**6 · The honest no-change week (ADR-028)**

Run a cycle, change nothing, then force a second cycle with a different `cycleKey`
(dev only: `POST /api/rhythm/run {"cycleKey":"test-2"}`).

*Expect:* assets read **"no change needed"** rather than a tick, **no Claude spend on assets**,
and a short briefing saying nothing material changed. *If it regenerates all five documents,
ADR-028's skip has regressed and every cycle is billing you for model variance.*

**7 · The safety limit (ADR-030) — no spend needed**

In the database, set a run's `step_count` above its ceiling (12 for a P001-only contract) and
trigger a step. *Expect:* the run goes `failed` with `failure_reason = 'step_limit_exceeded'`,
the panel says **"Stopped by the safety limit"**, and **Run now does not restart it** (409). A
fuse that resets itself is not a fuse — if it restarts, the protection is gone.

---

## What you can't test yet, and why

| Thing | Why not |
|---|---|
| Sending a real email | Needs **Story 3** connectors — not built |
| The weekly cron firing on its own | Needs `CRON_SECRET` in production — deliberately unset |
| Cross-tenant isolation, automatically | CI has no database (**FU-003**) — see below |

That last one is the real gap. The live test that proves founder B can't read founder A's data
exists, but runs with `continue-on-error: true` — it can fail without failing CI. It can't be
made blocking until CI has a database, and CI can't have one until the migrations replay from
empty (**FU-003**).

**To check it manually meanwhile:** create two accounts (`scripts/create-dev-accounts.ts`),
write an Asset as founder A, then log in as founder B and open the same Asset URL. B must see
nothing. Do this once before the October pilot at minimum.

---

## If something breaks

Note **which level** it failed at — that alone usually locates it:

- **Level 1** → logic bug, a locked rule broken. Read the test name; it says what was violated.
- **Level 2** → wiring/UI. The flag being off is the most common cause (everything 404s).
- **Level 3** → a permission was granted that shouldn't be. Highest priority of the three.
