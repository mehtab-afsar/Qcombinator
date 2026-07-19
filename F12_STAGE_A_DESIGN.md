# F12 — Executive Briefings · Stage A (Design, no code)

*Per `prompts/STORY_2_F12.md`. Design only — no code, nothing touches any database. Approve with
"go" and I build the generator (Stage B).*

> **Status honesty:** the **store half** of F12 is already built and live in production
> (`executive_briefings`, RLS, append-only, dedupe, the read route, the F09 panel). This design
> covers the **half I under-delivered**: the **generator** (via F06), the two edge cases, the F04
> surface, and provenance. Points already satisfied are marked ✅; the rest is what Stage B builds.

---

## 1. Schema (mostly shipped; two additive provenance changes)

Shipped (`20260715000007`): `id, founder_id, program_id, execution_id, contract_id, verdict,
body jsonb, created_at`. ✅ append-only, ✅ dedupe `(program_id, execution_id)`, ✅ RLS SELECT-own.

**To add — a small additive migration `20260715000008`:**
- `executive_id text` — the owning Executive (provenance the spec asks for; derivable via
  `getProgram(program_id).owner`, but stored so a briefing is self-describing, like F11's
  `asset_versions.executive_id`).
- **Asset-version links stay in `body`, not a new column.** The briefing body carries
  `changedAssets: [{ assetId, versionId, name }]` — the specific `asset_versions` rows this
  briefing describes. The F09/F04 panels link each `assetId` → `/founder/assets/[assetId]`
  (ADR-007: briefings point to Assets, never replace them). A jsonb field is enough and keeps the
  link shape flexible while F10 settles the body; no schema column needed.

## 2. The execution reference ✅ (already consistent with F11)
`execution_id` is a bare `uuid`, no FK; the real FK to `operating_rhythm_runs` lands in F10. No
deviation from F11.

## 3. Database-enforced invariants ✅
"One briefing per (program, execution)" is the partial unique index `(program_id, execution_id)`
— a re-run raises `23505`, surfaced as a typed idempotency error. Verified at runtime already.

## 4. Immutability ✅
Decided: briefings are immutable **and** un-deletable (append-only) — a briefing is a record of
what was said at a point in time. Enforced by the trigger rejecting UPDATE and DELETE. Verified.

## 5. RLS ✅
Founder-scoped SELECT-own; **no** permissive `using(true)`; **no** DELETE policy; writes
server-side only. Verified.

## 6. Grant model on any function ✅ (n/a — there is no function)
The write path is a plain service-role insert (a single insert is atomic), so **no `plpgsql`
function exists** — nothing is exposed as an RPC, nothing to revoke. The generator (below) runs
in application code (`routedText`), not in the database. So F11's revoke-the-RPC lesson simply
doesn't apply here — stated up front, as your spec asks, rather than discovered.

## 7. How generation works, and how it's tested without F10 — **the core of Stage B**

Mirrors F08b (`lib/mandate/generate.ts`): compose via F06 → `routedText` with a timeout → parse a
document + a fenced JSON tail → validate → persist. Two new pieces:

**(a) A new Composer entry point — `composeBriefingPrompt` in `lib/prompts/compose.ts`.** A third
entry point beside `composePrompt` and `composeMandatePrompt` (ADR-023 pattern: one Composer,
several entry points). Layers: **Executive System Prompt** (the program's owner) + **Program
Prompt** + **Company Context** (the program's current Assets from F11 + "what changed this cycle")
+ a **briefing-structure** instruction + a **JSON tail** (verdict + body). Because the structure
lives *in the Composer* (a constant like the existing `CONTRACT_JSON_TAIL`), this satisfies your
"**no inline prompts**" rule — no prompt string is written into a route or service.

**(b) The generator — `lib/briefings/generate.ts`.** `generateBriefing(admin, context, args)`:
gathers the program's current Assets (`getCurrentAsset` per `program.assets`, F11), calls
`composeBriefingPrompt`, runs `routedText('reasoning', …)` with a 60s timeout, splits
document/JSON, validates the verdict + body, and persists via the existing `persistBriefing`.
Returns the `Briefing`.

> **⚠️ Conflict surfaced (your Stage A item 10).** Your spec says generate "using the **Program's
> briefing structure**." **That structure does not exist** — `ProgramTemplate` (`lib/registry/
> types.ts`) has no briefing field, and there is no per-program briefing prompt in the workbook.
> **Recommendation: a *generic* briefing structure defined in the Composer**, parameterised by the
> program's `objective`, `successMetric`, and its current Assets — the smallest thing that works
> (CLAUDE.md §7), and it needs no per-program seeding across 29 programs. If a program ever needs a
> bespoke structure, add a `briefingRef` to the Registry later, exactly like `AssetDef.
> instructionsRef`. I'll build generic-now unless you'd rather I add the Registry field.

**Testing without F10:** `routedText` is mocked (as F08b's tests do) — Stage B tests assert
compose→parse→persist produces one briefing with a verdict; the no-change and failure paths
(below); retrieval order; and that the body links to the Asset versions. The real LLM call is
exercised when F10 wires it live; I'll say so plainly rather than claim it "works" end-to-end.

## 8. The two edge cases — designed, not bolted on

- **No material change → a short "no-change" briefing, never silence.** When the run wrote no new
  Asset versions (F10 tells the generator, or it checks for asset versions carrying this
  `execution_id`), the generator writes a **deterministic** short briefing — verdict "No material
  change this cycle." with a one-line body — **without an LLM call** (cheap and honest). Silence is
  never an option; a "nothing changed" briefing is still a briefing.
- **Generation fails → stage `failed`, Assets stay persisted.** `generateBriefing` throws
  `BriefingGenerationError` on LLM/timeout/parse failure and **writes no briefing row** — so a
  broken briefing never lands, and the Asset versions F11 already committed for that run are
  untouched (they are separate, earlier DB writes). **Clarification surfaced:** "stage `failed`"
  belongs to the **run record** (`operating_rhythm_runs`, F10) — the briefing table has no status
  column, and shouldn't (a failed briefing is an *absent* briefing, not a row marked failed). F12's
  job is only to fail safely; F10 records the failed stage. A Stage B test proves failure persists
  no briefing and leaves a pre-existing Asset row intact.

## 9. Where briefings surface
- **F09 Command View** ✅ — `BriefingsPanel` already renders latest + history (built). Stage B adds
  the `changedAssets` → Asset links.
- **F04 Dashboard** — to build: a **minimal, flag-gated** "latest briefing" card on
  `app/founder/dashboard/page.tsx`. Guarded by `FF_NEW_EXECUTIVE_MODEL` + "has briefings", so it
  renders **nothing** in production today (flag off) — the live dashboard is unaffected. No
  approve/dismiss/acknowledge control anywhere (ADR-002).

## 10. Conflicts found (surfaced, not resolved silently)
1. **No "Program's briefing structure" exists** (§7) → recommend a generic structure in the
   Composer; per-program `briefingRef` deferred.
2. **"Stage failed" has no home on the briefing** (§8) → it belongs on F10's run record; the
   briefing table stays status-free.
3. **My original F12 under-scoped generation into F10** — this design corrects that; nothing
   shipped needs undoing (all additive).

---

## What Stage B will build
- `supabase/migrations/20260715000008_briefing_provenance.sql` — add `executive_id` (additive).
- `lib/prompts/compose.ts` — `composeBriefingPrompt` + a briefing-structure constant + JSON tail.
- `lib/briefings/generate.ts` — `generateBriefing` (F06 → LLM → validate → persist); no-change +
  failure paths; `BriefingGenerationError`.
- Tests (mocked LLM): verdict produced · no-change short briefing · failure persists nothing &
  leaves Assets intact · retrieval order · body links to Asset versions · no score signal.
- Local dry-run; **stop before prod**.

## Stage C (after B)
Asset links on F09; the flag-gated F04 dashboard card; no approval control (asserted).

## Stage D
Runtime verification (real DB, mocked LLM); `SCHEMA_DRIFT` + `DecisionLog` (ADR) already updated
for the store — extend for the generator; completion report naming what's verified vs not (the
live LLM call is F10).
