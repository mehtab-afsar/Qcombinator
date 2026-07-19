# Story 2 — Full Analysis: what's built, where, what it does, and what's wrong

*A complete, honest review of everything built this session, from two adversarial code reviews plus
the build record. Written for Mo (not an engineer). Temporary analysis doc — safe to delete.
Snapshot: 20 Jul 2026.*

---

## 0. The honest headline

Story 2 is **built, tested (448 tests), and live in production behind the off-switch** — and the
**security and structure are genuinely solid** (both reviewers confirmed, not rubber-stamped: RLS,
tenancy, the cron's safety, no leaked prompts or hardcoded models). **But the review found one real
ship-blocker I introduced, and a handful of pilot-quality issues.** None of them affect anyone
today — it's all behind the flag, so no real user can reach it. They matter the day you turn the
flag on for a pilot.

**One-line verdict:** the foundation is sound; the *weekly cycle itself* has bugs that must be
fixed before it runs against the real AI model. Good thing we looked before flipping the switch.

---

## 1. What we built — the map (where it's stored, what it does)

### The database (6 new tables, all live in production, all behind the flag)
| Table | Migration file | What it holds |
|---|---|---|
| `strategy_sessions` | `20260715000001` | The founder's direction (mission, priorities, goals). Versioned. |
| `executive_contracts` | `20260715000002` | The Mandate. Immutable once confirmed. |
| `programs` | `20260715000002` | The Programs a confirmed mandate activates (e.g. P001 GTM). |
| `asset_versions` | `20260715000006` | Versioned "company memory" — the living documents. |
| `executive_briefings` | `20260715000007/08` | The weekly readouts (verdict + body). |
| `operating_rhythm_runs` | `20260715000009` | One record per weekly cycle; idempotency + audit. |

### The code (all under `lib/**` and `app/api/**`, behind the `NEW_EXECUTIVE_MODEL` flag)
| Piece | Where | What it does |
|---|---|---|
| Registry | `lib/registry/**` | The single code list of Executives / Programs / Assets. |
| Composer | `lib/prompts/compose.ts` | Assembles every AI prompt in a fixed, validated order. |
| Mandate | `lib/mandate/{strategy,contract,generate}.ts` | Strategy → Contract → confirm. |
| Assets | `lib/assets/{versioning,validation}.ts` | Save/read versioned assets; the validation gate. |
| Briefings | `lib/briefings/{briefings,generate}.ts` | Store + generate the weekly readout via the Composer. |
| **Rhythm** | `lib/rhythm/{run,judge,runs,cycle-key}.ts` | **The weekly engine**: run each Program → update Assets → publish a Briefing. |
| Routes | `app/api/{strategy,contracts,assets,briefings,rhythm}/**` | Thin API endpoints. |
| Cron | `app/api/cron/rhythm/route.ts` + `vercel.json` | The weekly trigger (doubly inert — see §4). |
| Founder UI | `app/founder/{strategy,executive,assets}/**`, `features/executive/**` | The screens. |

### Where the design decisions are recorded
`DecisionLog.md` (ADRs 022–026), `SCHEMA_DRIFT.md` (what's in the DB vs the spec),
`F10_DESIGN.md` / `F11_STAGE_A_DESIGN.md` / `F12_STAGE_A_DESIGN.md`, `FOLLOWUPS.md`.

---

## 2. What it does — the user journey

### Today's live product (unchanged, what real users actually see)
Sign up → getting-started guide → build profile in a chat assessment → get a **Q-Score** → chat
with **11 CXO AI advisers** who generate documents → at Q-Score ≥ 65, **match with investors**.
*None of Story 1/2 is visible here — it's all behind the flag.*

### The new loop we built (invisible until the flag is on)
```
1. Founder writes their Strategy          → /founder/strategy      (mission, priorities, goals)
2. AI drafts an Executive Contract        → /founder/executive     (from the strategy)
3. Founder confirms it ONCE               → activates Programs (e.g. P001 GTM)
        │
        ▼  every week (the Operating Rhythm — F10)
4. For each active Program:
     • regenerate its Assets   (AI judgement → new versions)   → /founder/assets/[id]
     • publish a Briefing      (verdict + what changed)        → BriefingsPanel on /founder/executive
     • record the run          (idempotent — never twice/week)
5. Founder reads the Briefing, opens any Asset, edits it directly (creates a new version, no approval)
```
The founder sets direction once; the system runs the company's programs weekly and reports back.
**No external actions** (sending, publishing, spending) — that's Story 3.

---

## 3. 🔴🟠 The findings — bugs, prioritized

### 🔴 SHIP-BLOCKERS (fix before turning the flag on for any pilot)

**B1 — Briefings are 100% broken (I introduced this).**
`generateBriefing` uses one `programId` value for two incompatible things: looking up the Program
in the Registry (which needs `'P001'`) *and* the database column (which needs a UUID). The weekly
engine passes the UUID, so the Registry lookup throws **every time** — so every cycle fails and
**no briefing is ever produced.** It slipped through because the tests mocked this exact seam, so
the two halves were never run together. *Fix: pass both ids (small, ~10-line change), and add a
test that runs the engine and the generator together for real.* — `lib/briefings/generate.ts:97`,
`lib/rhythm/run.ts:128`.

**B2 — A founder could drain your AI budget.**
The manual "run a cycle" endpoint lets the caller pass their own `cycleKey`, which bypasses the
"once per week" limit — so a founder could trigger unlimited full cycles (each = several paid AI
calls), and the route has no rate limit. *Fix: ignore the client's `cycleKey` in production (derive
the week server-side) and add this route to the rate limiter.* — `app/api/rhythm/run/route.ts:20`,
`middleware.ts`.

### 🟠 PILOT-QUALITY ISSUES (would make the pilot look bad or behave wrong)

**B3 — Asset content is stored exactly as the AI returns it, with no cleanup.**
If the model wraps its answer in chatter ("Here's your updated ICP: …") or code fences, that junk
becomes the saved asset. All five pilot assets are this format, so it's a real quality risk. *Fix:
strip fences/preamble before saving.* — `lib/rhythm/judge.ts:42`.

**B4 — The per-step status shown to the founder is wrong on failure.**
When a step fails, the record says "pending" (looks like "not started") instead of "failed." The
overall run is correctly marked failed, but the detail the UI shows lies. *Fix: mark the failing
step "failed".* — `lib/rhythm/run.ts:106,137`.

**B5 — A failed week can't be retried.**
Once a cycle fails (which, given B1, is *always* right now), the "once per week" rule blocks any
re-run that week — leaving half-written assets and no recovery until next week. *Fix: allow
re-running when the existing run is failed.* — `lib/rhythm/runs.ts`, both rhythm routes.

### 🟡 SCALE-ONLY (harmless for the one-program P001 pilot; fix before a 2nd Program)

**B6 — Two Programs sharing one Asset collide** — all Programs in a cycle share one run id, and an
Asset can only be written once per run, so a shared Asset (AS004 is designed to be shared) written
by two Programs fails the second one. `lib/rhythm/run.ts:112`.
**B7 — Each Program's briefing lists *every* Program's changes** — the "what changed" isn't scoped
per Program. `lib/briefings/generate.ts:101`.

### 🔵 DESIGN GAP (worth a product decision)

**B8 — The weekly cycle has no *new* information to reason from.** Every week regenerates the assets
from the *identical* inputs (same strategy, same contract, same prior assets). Nothing fresh is fed
in, so "weekly regeneration" is really just the AI re-writing the same thing. The whole point of a
rhythm is to react to what's new (new metrics, uploads, Q-Score changes). *This needs a decision:
what feeds each cycle?* — `lib/rhythm/run.ts:44`.

### ⚪ Minor / housekeeping
- Company name isn't passed into the prompts (minor quality). — `lib/rhythm/run.ts:44`
- The stray trial script at the repo root — **already deleted** during this analysis.
- Pre-existing (not ours): `app/founder/dashboard/page.tsx` is 1,910 lines (the old product).

---

## 4. ✅ What's genuinely solid (both reviewers confirmed)

- **Security / access control:** all six new tables are read-only for logged-in users; every write
  goes through the trusted server path; no permissive "everyone" policies; the sensitive DB function
  is locked to the service role. A founder can only ever touch their own rows (identity comes from
  the verified session, never the client). **No cross-tenant hole, no spoofing vector.**
- **The cron is genuinely safe.** It does nothing unless *both* the secret is set (fails closed —
  503 if missing) *and* the flag is on. Adding it to the schedule spends nothing today.
- **The routes are correct** — hidden (404) when the flag's off, authenticated, input-validated,
  right client for reads vs writes, sensible error codes.
- **The live dashboard is untouched** — the new briefing card renders nothing while the flag is off.
- **Code quality is clean** — no inline prompts, no hardcoded AI models, no `any` types, no stray
  logging in the new libraries, every new file under ~160 lines, all AI calls time-limited with a
  retry.
- **The once-a-week idempotency and the asset "exactly one current version" guarantees are correct.**

---

## 5. Recommended next steps

1. **Fix B1 + B2 first** — the ship-blockers. Small, well-understood changes. B1 especially, plus a
   test that runs the engine end-to-end (not mocked) so this class of bug can't hide again.
2. **Then B3–B5** — the pilot-quality trio (asset cleanup, honest statuses, retry).
3. **Decide B8** — what actually feeds a weekly cycle. This is a *product* question, not just code.
4. **Then** run the local trial (Docker) to see real AI output, and only after that consider a flag-on
   pilot. B6/B7 can wait until a second Program is added.

**Nothing here is on fire** — it's all behind the flag, no user is affected, and the hard parts
(security, structure, the database) are right. The bugs are in the newest, least-exercised code (the
weekly engine), which is exactly where you'd expect them, and exactly why this review was worth doing
before turning anything on.
