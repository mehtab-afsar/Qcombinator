# Where We Are — Project Status Snapshot

*A temporary, plain-English map of everything done so far, how it works, and what to expect
next. Written for Mo (not an engineer). This is a scratch document — safe to delete anytime;
it duplicates nothing that git doesn't already record. Snapshot date: 19 Jul 2026.*

---

## The one-minute version

Edge Alpha is being rebuilt — quietly, underneath the running product — from a "Q-Score + AI
advisers" tool into a **Founder Operating System**: you set your direction once, and an AI
executive team runs your company's programs to it.

The rebuild uses the **strangler pattern**: the old product keeps working and untouched while
the new one is built beside it, hidden behind an **off switch** (`FF_NEW_EXECUTIVE_MODEL`). The
old is deleted only once the new reaches parity — much later. So **nothing we've built is
visible to your real users yet**, on purpose.

So far: **the foundations were made safe (Phase 0)**, **the Mandate was built (Story 1)**, and
**the versioned Asset memory was built (Story 2 / F11)**. All three are live in the database and
tested, all behind the off switch.

---

## Two worlds running side by side

| | **The live product (old model)** | **The new model (being built)** |
|---|---|---|
| Who sees it | Your real users, today | Nobody yet — behind the off switch |
| What it is | Q-Score, Profile Builder, 11 CXO AI advisers, investor matching | Strategy → Mandate → Programs → Assets → (later) a weekly rhythm |
| Status | Frozen — we never edit it | Under active construction |
| Where | `features/agents/**`, `app/api/agents/**`, `features/qscore/**` | `lib/registry`, `lib/prompts`, `lib/mandate`, `lib/assets`, `app/founder/{strategy,executive,assets}` |

**What a real user experiences today** (unchanged by any of our work): sign up → a getting-started
guide → build their profile in a chat-based assessment → get a Q-Score (0–100) → chat with AI
CXO advisers who generate documents → once their score ≥ 65, browse and connect with investors.

---

## What's been done, and how

### ✅ Phase 0 — Ground Clearing (make the foundations safe first)

*Why: before building on the old codebase, we checked it was actually healthy. It wasn't — in one
specific, important way.*

- **The biggest find: the automated safety checks had never run.** The system meant to run the
  tests on every change was watching branches that don't exist, so it silently did nothing for
  months. Tests were failing invisibly; billing had no tests at all. **Fixed** — the checks now
  run on every change (test suite went from *silently broken* to green).
- **Closed a real security hole:** four database tables had security "enabled but not enforced" —
  any logged-in user could read every other founder's private data (MRR, burn, runway). Fixed.
- **Decoupled the Q-Score:** locked in that the new model never touches the Q-Score (it's a
  separate diagnostic), with a test that fails if anyone breaks that rule.
- Plus: billing hardening, an on/off flag for all new work, and "frozen" markers on the old code.

*Recorded in `PHASE0_AUDIT.md`.*

### ✅ Story 1 — The Mandate (the founder sets direction)

*Why: this is the root of the whole new model. No mandate, nothing runs.*

The flow: **you write your Strategy → the AI drafts an "Executive Contract" from it → you confirm
it once → that activates your Programs.** Built as six features (F05–F09): the Registry (one code
list of all executives/programs/assets), the Prompt Composer (one place that assembles every AI
prompt), Strategy, the Contract, real AI generation, and the Command View screen.

The clever part is that the rules **can't be broken, even by a future bug**:
- A contract, once confirmed, is **immutable** — a database trigger physically rejects edits. A
  change starts a new "epoch," never an edit.
- Confirming is **all-or-nothing** — you can never end up with a confirmed mandate that secretly
  activates nothing.
- Security is founder-scoped from day one.

*Live in production, behind the flag. Tables: `strategy_sessions`, `executive_contracts`,
`programs`.*

### ✅ Story 2 / F11 — Asset Persistence & Versioning (just finished)

*Why: the store the Programs write their work into — the company's versioned memory.*

Every time a Program produces a Management Asset (e.g. an ICP profile), it's saved as a new
**immutable version**; the old ones are kept forever. **You can also edit any Asset directly**,
which instantly creates a new current version — no approval (that's the product decision).

How it's kept safe:
- **Exactly one "current" version** per Asset, enforced by the database.
- **Versions can't be edited** once written — only retired. Restoring an old one writes a *new*
  version; history is never rewound.
- **The write path is locked server-side.** A subtle review catch: the save function was callable
  directly in a way that skipped our validation (letting someone forge who authored a version).
  Now the table is read-only to users and all writes go through a server-side gate — so the "who
  wrote this" trail can't be forged.

*Live in production, behind the flag. Table: `asset_versions`. Verified against a real database:
8/8 runtime behaviours pass (one-current, immutability, dedupe, restore, and both halves of the
security lock).*

---

## What to expect

- **Users see no change.** Everything above is behind `FF_NEW_EXECUTIVE_MODEL` (off). The
  strategy/executive/asset pages exist but return "not switched on yet" and aren't linked in the
  app. This is deliberate — we ship dark and flip it on only when the whole loop is ready.
- **To preview it yourself:** the flag can be turned on in a local/staging environment to walk
  the strategy → mandate → asset flow. It's not ready for real users because the loop isn't
  complete (no weekly rhythm yet — that's F10).
- **The database is ahead of what's switched on.** `asset_versions` and the Story 1 tables are
  live and empty, waiting for the engine that will fill them.

---

## Health snapshot (verified)

| Check | State |
|---|---|
| Test suite | **411 passing** |
| Typecheck | Clean for all shipped code |
| Production database | Story 1 + F11 tables live and correct |
| Migrations | Idempotent + guarded by tests; **but can't rebuild from scratch** (see FU-003) |
| Old product | Untouched, unaffected |

*Note: `app/investor/dashboard/page.tsx` has typecheck errors — that's your in-progress UI work,
not the new model.*

---

## Open items

**Engineering follow-ups** (in `FOLLOWUPS.md`, none urgent):
- **FU-001** — lock down one more database function (`confirm_executive_contract`) the same way we
  locked F11's. Low severity.
- **FU-002** — optionally strengthen Story 1's strategy save to the same crash-proof pattern F11 uses.
- **FU-003** — the migrations can't rebuild the database from empty (an old ordering bug). Doesn't
  affect deploys, but worth fixing before a new engineer joins or CI gets a database.

**Things only you can do** (in `missingwork.md`): mostly API keys / accounts / Vercel settings —
several block Story 3 (Connectors) or block charging users. Worth a read before Story 3.

---

## The road ahead (Story 2 continues, then Story 3)

Build order: **F11 ✅ → F12 → F10.**

- **F12 — Executive Briefings:** the weekly summary the founder reads (`executive_briefings`).
- **F10 — The Operating Rhythm engine:** the heartbeat that, each cycle, runs every active
  Program, writes new Asset versions (via F11), and publishes a Briefing (via F12). This is where
  the deferred "which run produced this Asset" database link finally lands (`operating_rhythm_runs`).
- **Story 3 — Connectors & Actions:** the safe boundary where the system does *irreversible*
  external things (send, publish, spend) — requiring your approval each time. Needs a human
  security review before it ships.

**Once F10 + F12 land, the core loop is complete** — and *that's* when turning the flag on for a
pilot becomes the real conversation (the go/no-go is week-4 retention, not features shipped).

---

## One-line takeaway

The foundations are safe and tested, the first two pieces of the new model (the Mandate and the
Asset memory) are built and live behind a flag, your real product was never put at risk, and the
next step is the weekly engine (F12 then F10) that brings the two together.
