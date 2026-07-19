# How to test what's built — Phase 0 + Story 1 + F11

*Follow in order. Level 1 needs nothing. Level 2 needs the flag on. Level 3 is the security
check. ~20 minutes total. Snapshot: 19 Jul 2026.*

---

## Level 1 — the tests (2 min, touches nothing)

```bash
cd ~/Desktop/Qcombinator
npm test
```

**Expect:** ~411 passing, 0 failing.

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

Empty at first ("This asset has no versions yet") — correct. No Program has run, because the
weekly engine is F10 and isn't built.

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

## What you can't test yet, and why

| Thing | Why not |
|---|---|
| Programs writing Assets on their own | Needs **F10**, the weekly engine — not built |
| A weekly briefing | Needs **F12** — not built |
| Sending a real email | Needs **Story 3** connectors — not built |
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
