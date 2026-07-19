# Edge Alpha — Roadmap Status

*Every phase and feature, ticked or not. Snapshot: **19 July 2026**. Companion diagram:
`edge_alpha_flow.png`. Canonical order: `Roadmap.md` · Specs: `Featureinventory.md`.*

**Legend:** ✅ done · ▶ in progress / next · ⬜ not started · ⛔ deferred, do not build

---

## Headline

| | |
|---|---|
| **Phases complete** | 2 of 8 (Phase 0, Phase 1) |
| **Buildable product** (Phases 0–3) | **~55%** |
| **Full arc to PRD achieved** (Phases 0–7) | **~30%** |
| **Tests** | 411 passing |
| **Live users affected** | **None** — everything is behind `FF_NEW_EXECUTIVE_MODEL` (off) |

---

## Phase 0 — Ground Clearing ✅ (Jul)

- [x] Feature flag `FF_NEW_EXECUTIVE_MODEL` in place, default **off**
- [x] Full audit of every artifact/action creation path → `PHASE0_AUDIT.md`
- [x] Q-Score decoupled — the new model provably cannot move it (invariant test)
- [x] 6 stale Q-Score tests fixed (the engine was right, the tests were old)
- [x] Action-vs-cadence naming settled (ADR-020)
- [x] Billing hardened — integration test added; plan limits single-sourced
- [x] Supabase admin client typed at billing/webhook → **caught 2 live bugs**
- [x] **CI made to actually run** — it had been watching branches that don't exist
- [x] **Cross-tenant data leak closed** — 4 tables had RLS enabled but not enforced
- [x] Fail-open cron endpoint closed (ADR-017)
- [x] FROZEN markers on the old model
- [x] Recorded that 2 "proven" engine modules have never executed (ADR-019)

**Exit met:** base instrumented, billing guarded, flag in, old model frozen, score decoupled.

---

## Phase 1 · Story 1 — The Mandate ✅ (Jul)

*The founder sets direction; it becomes a signed, immutable mandate that activates Programs.*

- [x] **F05 — Registry** · `lib/registry/**` · 5 executives, P001 GTM, AS001–AS005, 5 actions
- [x] **F06 — Prompt Composer** · `lib/prompts/compose.ts` · 4-layer, validated, no inline prompts
- [x] **F07 — Strategy Session (S001)** · `strategy_sessions`, versioned
- [x] **F08a — Executive Contract (S002)** · `executive_contracts` + `programs`, immutable by trigger, epoch-on-change
- [x] **F08b — Real generation** · S002 calls the LLM, validated against the Registry
- [x] **F09 — Executive Command View** · `/founder/executive`
- [x] Exactly-one-current enforced **by the database**, not app code
- [x] Confirming is atomic — no "confirmed but activates nothing" state
- [x] Version vs epoch distinction settled (ADR-022)
- [x] Migrations applied to the live database (8 blockers found and fixed)
- [x] Q-Score duplicate rows deduped with full audit trail (8 removed, 51 clean, 0 remaining)

**Exit met:** a founder can set a Strategy, receive and confirm a Contract, and see active
Programs. A change creates a new epoch; history intact.

---

## Phase 2 · Story 2 — Rhythm + Assets ▶ (Jul → mid Sep)

*Build order **F11 → F12 → F10**. The order matters: the engine has nothing to write into
without the store, and nothing to report without briefings.*

### ✅ F11 — Asset Persistence & Versioning

- [x] `asset_versions` table · immutable versions · full provenance
- [x] Exactly one `is_current` per Asset — DB-enforced, holds under concurrency
- [x] Content immutable once written; only retirement permitted (trigger)
- [x] Dedupe — the same run cannot write the same Asset twice
- [x] Seven-check validation gate (incl. the P003→AS001 block)
- [x] Founder editing — `PUT /api/assets/:id` → new current version, `authored_by='founder'`, **no approval**
- [x] Restore = a *new* version; history never rewound
- [x] Write function **revoked from `authenticated`** so the gate can't be bypassed and authorship can't be forged
- [x] RLS founder-scoped, no permissive policy, no DELETE policy
- [x] **8/8 runtime behaviours verified against a real database**

### ▶ F12 — Executive Briefings — NEXT

- [ ] `executive_briefings` table + RLS
- [ ] One Briefing per Program run, carrying a verdict
- [ ] Generated through the F06 Composer (no inline prompts)
- [ ] Idempotent — a re-run cannot duplicate a Briefing
- [ ] "No material change" → a short briefing, **never silence**
- [ ] Generation failure → stage `failed`, **Asset versions stay persisted**
- [ ] Surfaced on F09 + F04, linking through to the underlying Assets
- [ ] **No approve / acknowledge / dismiss control anywhere**

### ⬜ F10 — Operating Rhythm Engine

- [ ] `operating_rhythm_runs` + `cycle_key`
- [ ] **Idempotent** — the same cycle can never run twice
- [ ] Runs **all contract-active Programs** (no `runsWhen` in v1 — ADR-008)
- [ ] **No Asset Review stage** (ADR-006)
- [ ] Vercel Cron trigger + manual `POST /api/rhythm/run` for testing
- [ ] The deferred execution FK from F11 finally lands here

**Story 2 exit:** AS001–AS005 measurably improve across ≥2 cycles · the same cycle can't run
twice · a founder edit is used next cycle. **No external sends.**

---

## Phase 3 · Story 3 — Actions + Connectors ⬜ (mid → end Sep)

- [ ] **F13 — Connector Layer** · `connector_connections` vault · Gmail OAuth · `token_ref` to a secrets manager, never plaintext
- [ ] **F14 — Actions + just-in-time approval** · `action_log` (append-only) · approval at the Connector boundary on anything irreversible
- [ ] Founder-visible action status: payload · target · result · failure/retry
- [ ] **Human security review before this ships**
- [ ] Namespace decision confirmed (`connector_connections`, not `connections`) — *pending Roman*

**Exit / Sprint II:** "Interview Customers" → payload prepared → you approve → sent → logged.

---

## Phase 4 — Pilot + Retention Gate ★ ⬜ (Oct)

- [ ] Pilot cohort runs the loop behind the flag
- [ ] **Week-4 retention measured** ← the decision metric (ADR-016)
- [ ] Healthy → Phase 5. Weak → **stop and fix the loop; widen nothing.**

> ⚠️ **PostHog is not configured.** Retention cannot be measured retroactively. If analytics
> isn't capturing before the rhythm runs, you arrive at this gate unable to read the answer.

---

## Phases 5–7 — to "PRD achieved" ⬜

- [ ] **Phase 5 — Broaden** (Nov–Dec): more Programs, Executives, Connectors → reach parity
- [ ] **Phase 6 — Migrate** (Dec–Jan): all founders on the new model; flip the flag on
- [ ] **Phase 7 — Retire the old model** (Q1 2027): **delete the 173 routes + 11 personas.**
      🎯 *This is "the cleaning" — it happens last, not first.*

## Beyond the PRD ⛔ — do not build early

- ⛔ `runsWhen` event-aware rhythm (cost optimisation, ADR-008)
- ⛔ Outcome Loop · ⛔ Evidence Pack (ADR-009)
- ⛔ Investor-side features · ⛔ external MCP hub / Program marketplace

---

## Open items

### Engineering follow-ups (`FOLLOWUPS.md`)

- [ ] **FU-001** — lock down `confirm_executive_contract` as F11's function was. *Low.*
- [ ] **FU-002** — optionally move Story 1's strategy save to F11's crash-proof pattern. *Low.*
- [ ] **FU-003** — **migrations can't rebuild the database from empty.** *Medium — and it is the
      root blocker for the item below. Schedule between F12 and F10.*
- [ ] **CI security phase is advisory** — the live cross-tenant test runs with
      `continue-on-error: true`, so it can fail without failing CI. Blocked by FU-003 (CI has no
      database). Until then, **verify cross-tenant isolation by hand** with two accounts.

### Only Mo can do these (`missingwork.md`)

- [ ] **Configure PostHog** ← highest value, smallest effort, hard deadline of October
- [ ] Resend API key (blocks Story 3 sends)
- [ ] Stripe keys (blocks charging)
- [ ] Check Vercel plan — Story 2 adds a sixth cron job; Hobby limits how many run

---

## One line

Foundations safe and tested · the Mandate live · the Asset memory live · next the Briefings,
then the weekly engine that ties them together — and the old product untouched throughout.
