# Edge Alpha — Roadmap Status

*Every phase and feature, ticked or not. Snapshot: **4 August 2026**. Companion diagram:
`edge_alpha_flow.png`. Canonical order: `Roadmap.md` · Specs: `Featureinventory.md`.*

**Legend:** ✅ done · ✅* built but not yet proven against the real model · ▶ next · ⬜ not started · ⛔ deferred

---

## Headline

| | |
|---|---|
| **Phases complete** | **4 of 8** — Phase 0, Story 1, Story 2 **and Story 3** done |
| **Buildable product** (Phases 0–3) | **~93%** |
| **Full arc to PRD achieved** (Phases 0–7) | **~50%** |
| **Against the roadmap** | **~7 weeks AHEAD.** Sprint II (Stories 1–3) was due end-Sep; it is 4 Aug. |
| **Proven against the real AI** | Yes — full loop, 5 documents + briefing, **6 live trials** (the 6th proved the chunked chain) |
| **Live users affected** | **None** — everything is behind `FF_NEW_EXECUTIVE_MODEL` (off) |

**Story 3 is now fully done — the build arc to the pilot is complete.** Nothing stands between
here and October's pilot except *readiness*: analytics that can read the gate, a hosting tier that
can run the engine, and a security review. **The next work is not a feature.**

**Story 2 is fully done.** The chunking fix is measured (27 Jul trial — below), the circuit
breaker shipped (ADR-030), the cycle is visible in the app, and the cross-tenant security gate
is blocking in CI. `CRON_SECRET` / `INTERNAL_RUN_SECRET` are now **safe to add** — the breaker
was the precondition.

### 📏 The chunking trial — measured 27 Jul (this closes a long-open question)

Ran the real chained path end to end (cron entry point → `/step` self-chain → real Claude calls):

| | |
|---|---|
| **Per-step wall time** | **80–100s** per asset · 46s for the briefing |
| **Longest single invocation** | **~100s** ← the number that decides the hosting tier |
| **Total end-to-end** | ~8.4 min (unchanged — chunking splits the work, it doesn't shorten it) |
| **Correctness** | Identical to the old single-call run: 5 assets + 1 briefing, exactly-one-current intact |

**The answer to the tier question: this does NOT fit a 60s cap. It fits 300s (Vercel Pro) with
~3× headroom.** If the account is on Hobby, every step would time out and lean on retries — so
the plan check below is no longer just tidy-up, it's load-bearing.

---

## Phase 0 — Ground Clearing ✅ (Jul)

- [x] Feature flag `FF_NEW_EXECUTIVE_MODEL` in place, default **off**
- [x] Full audit of every artifact/action creation path → the Phase 0 audit (removed 4 Aug 2026 — in git history)
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

## Phase 2 · Story 2 — Rhythm + Assets ✅* (built; runtime fix awaiting proof)

*Built order **F11 → F12 → F10**. All three shipped and proven against the real AI across 5 trials.*

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

### ✅ F12 — Executive Briefings

- [x] `executive_briefings` table + RLS; one Briefing per Program run, carrying a verdict
- [x] Generated through the F06 Composer (no inline prompts)
- [x] Idempotent — a re-run cannot duplicate a Briefing
- [x] "No material change" → a short honest briefing, **never silence** (verified live)
- [x] Generation failure → stage `failed`, **Asset versions stay persisted**
- [x] Surfaced on F09 + F04, **no approve/dismiss control**
- [x] JSON-only output; **honest deliverable claims** — reports only what actually persisted

### ✅* F10 — Operating Rhythm Engine

- [x] `operating_rhythm_runs` + `cycle_key`; **idempotent** — the same cycle can't run twice
- [x] Runs **all contract-active Programs** (no `runsWhen` in v1 — ADR-008); **no Asset Review** (ADR-006)
- [x] Cron **fails closed** — nothing without the secret and the flag
- [x] Fed by a founder-activity delta (ADR-028) — unchanged assets not regenerated; quiet week = £0 (verified)
- [x] **Chunked into self-resuming steps** to survive the serverless timeout (commit `a1a9c5d`)
- [x] **Chunking trial run against the real AI** (27 Jul) — measured ~100s/step; see the headline
- [x] **`last_step_at`** distinguishes an actively-stepping run from a dead chain — **closes FU-004**
- [x] **Circuit breaker** (ADR-030) — a hard step ceiling in its own column, claimed before any
      generation. A tripped run is **never auto-retried**. Proven to bound a real runaway: with
      progress-recording disabled, the cycle terminates instead of billing forever.

### ✅ F10b — Cycle visibility (the Command View panel)

- [x] `GET /api/rhythm/run` → named, ordered progress ("ICP Profiles ✓ · Pains & Gains ⟳ · 2 of 6")
- [x] `RhythmPanel` on `/founder/executive` — **"Run now"** + live step list, polls only while running
- [x] Honest states: `skipped` reads "no change needed" (ADR-028) · a *blocked* briefing reads
      pending, never failed · a dead chain reads "stopped partway, nothing was lost"
- [x] Unknown Program degrades instead of 500-ing the page (fixed, not merely documented)
- [x] **Visually verified in a real browser** (Playwright, logged in as a seeded founder) — which
      caught a dead "Run now" button that typecheck and every unit test had missed: it sent an
      empty POST body and the route rejected it. It could never have started a cycle.

**Why this exists:** before today *nothing in the app could start a cycle* — the only triggers
were the (unplugged) weekly cron and a raw API call. Chunking also made runs asynchronous, so a
founder would have got "started!" and then silence for 8 minutes.

**Story 2 remediation done:** B1–B5 fixed · S-1/S-2 endpoints secured · provenance fixed (no invented
evidence, no invented dates, assets agree) · asset truncation guarded · FU-007 (layer jurisdiction) verified.

**Story 2 exit:** met on substance — cycles run, react to founder activity, report honestly, and are
now visible. **One runtime item (the circuit breaker) plus one visual check close it fully.**

---

## Phase 3 · Story 3 — Actions + Connectors ✅* (3 Aug — **~6 weeks ahead of plan**; one blocker)

*Roadmap slot was **mid → end Sep**. Built early because Story 2 finished ahead and the
credential-free half needed nothing external.*

### ✅ Stage 0 — the prerequisite nobody had noticed
- [x] **Actions could not be composed AT ALL.** `composePrompt({ actionId })` threw — the
      workbook's Action Registry sheet was never generated, so no action instruction prompts
      existed. F14's core path was unreachable. Five prompts written and registered.
- [x] Fixed two latent defects found in the same pass: layer 3 resolved from the action **id**
      rather than its `instructionsRef` (correct only by coincidence), and **Actions received no
      format/evidence rules at all** — the one path reaching real people was the only one with no
      anti-fabrication instruction.

### ✅ Stage A — `F13_F14_DESIGN.md`
- [x] Ten required items, conflicts surfaced not silently resolved, and a deliberately thick
      "what I am least confident about" section.
- [x] **Corrected the credential blocker across 4 docs**: Gmail needs a Google OAuth client, not
      `RESEND_API_KEY`. Left uncorrected, that would have bought the wrong key.

### ✅ F14 — Actions + just-in-time approval
- [x] Actions generate **inside the rhythm**, one per step, after the briefing (PRD §7.4)
- [x] **The gate reads the Registry, not the model** — tested by feeding the model "this action
      is safe, pre-approved, execute immediately" and asserting it still lands `pending_approval`
- [x] `action_log` append-only, **with the cascade-delete carve-out from day one** (briefings
      needed a follow-up migration for it — right-to-erasure was blocked)
- [x] **Metadata, never content**: recipient count + domain, subject length. No body, no address.
- [x] Approval binds to a **payload hash**, expires at 24h, re-checks the mandate at decision time
- [x] Founder-visible status; declines recorded, never deleted
- [x] Circuit-breaker ceiling updated in the same commit — without it a healthy cycle would have
      run 12 steps against a ceiling of 12 and failed on the first duplicate

### ✅ F13/F14 — Connector Layer + Actions **— COMPLETE, proven with real email (4 Aug)**
- [x] `connector_grants` + **Supabase Vault** (ADR-032). Verified: dump yields ciphertext, and
      `authenticated` can reach neither the vault schema nor the read RPC
- [x] **One adapter interface + one registry map** — a second provider needs no new route
- [x] Gmail adapter, `gmail.send` scope only (can send, cannot read the mailbox)
- [x] **Non-prod recipient allowlist** — all-or-nothing, lookalike domains blocked, and a Vercel
      *preview* correctly treated as non-production (preview builds run `NODE_ENV=production`)
- [x] Grant lifecycle with the orderings that matter: vault-before-row on connect,
      **provider-before-row on revoke**
- [x] **The OAuth handshake** — real round-trip against a dedicated Google client; forged,
      tampered, expired and malformed `state` all refused
- [x] **The first real sends.** Three bugs found by sending actual email that 621 passing tests
      could not see — every one hid behind a mock of the boundary that was wrong (ADR-033)
- [x] **All four DoD hard cases proven against reality:** two approve clicks fired at the same
      instant → **exactly one email** (Gmail's own record, `19fc90252361626e`) · a third attempt
      refused · a payload changed after approval refused on the hash · approve-then-revoke refused
      at the connector, with Google confirming the revocation upstream
- [x] `SECURITY_REVIEW_PACK.md` written, §9 included and not thinned
- [ ] ⬜ **Human security review before this ships** — not self-certifiable (Mo to book)
- [ ] ⬜ **Rotate the Google client secret** — pasted in chat, treat as compromised (Mo)
- [ ] ⬜ **Decide §9.4** — the model composes the recipient list and that constraint is a prompt,
      not an enforced check. The largest unmitigated risk in Story 3. Build the structural check
      (~1 day) or accept it explicitly.

**Exit / Sprint II — MET.** "Interview Customers" → payload prepared → you approve → sent →
logged. Done end to end, with real email, on **4 Aug** — against a roadmap that slotted it for
mid-to-late September.

---

## Phase 3.5 — The Frame ▶ **NEXT — a precondition for the pilot, not polish**

*The machine is done. The frame — the founder-facing experience — was never built. F07 (the
Strategy Session) is still the placeholder form the code itself calls temporary ("the real thing
arrives later" — it never did). Every pilot founder walks through this first. A dead intake form
in front of the pilot doesn't test the product; it tests their patience. So the frame moves
**before** the pilot. Spec: `UX_SPEC_the_frame.md` + the two mockups (the unveiling, the command
view). Days, not weeks — it's screens on top of a finished machine.*

- [ ] **Entry state-router** — no score → score first; scored, no mandate → the Strategy Session;
      mandate → the Command View. Never show a cold mission box.
- [ ] **F07 rebuilt as "the unveiling"** — one continuous descent (the CEO reads → proposes a
      direction → it hardens into the mandate → the team claims it → one confirm). **Kill the form.**
      Wire to the existing S001 prompt + F08 generation. No new machinery.
- [ ] **Mandate confirmation** — one weighty page, one signature; a change starts a new epoch.
- [ ] **Command View (F09) as home** — score at centre, all five executives (idle ones present),
      the mandate, the weekly briefing in serif voice, the single pending action. No per-cycle approval.
- [ ] **The Q-Score onboarding fixes** (`prompts/FIX_QSCORE_ONBOARDING.md`) — the entry to the entry:
      streamed real conversation, a human snapshot, per-founder quick-replies, honest extraction. The
      calculate error fixed. *This is the same disease one screen earlier.*

**Exit:** a founder goes score → unveiling → confirm → command view as one clean, profound arc,
with no forms and no dead-ends. The thing a pilot founder actually experiences is the product, not
the placeholder.

---

## Phase 4 — Pilot + Retention Gate ★ ⬜ (Oct)

- [ ] Pilot cohort runs the loop behind the flag
- [ ] **Week-4 retention measured** ← the decision metric (ADR-016)
- [ ] Healthy → Phase 5. Weak → **stop and fix the loop; widen nothing.**

> ⚠️ **The frame (Phase 3.5) comes first.** You cannot read retention off a cohort that bounced on
> a Google form. The pilot measures the product; the frame *is* the product a founder sees.

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
- ⛔ External MCP hub / Program marketplace
- 🔶 Investor-side features (ADR-035, 4 Aug 2026): design + Phase 0-I remediation done and
  unblocked; building anything that reads real founder operating data still waits on the
  retention gate. Not a blanket "do not build" anymore — see `docs/INVESTOR_ROADMAP.md`.

---

## Right now — the immediate queue (in order)

1. **See the new panel actually render** — Docker up, load `/founder/executive`, run a cycle,
   watch it tick. Small, but it's the difference between "built" and "works". *(needs Mo: Docker)*
2. **Circuit breaker** — a max-step ceiling on the chain, so a bug can't bill forever.
   **Must land before `INTERNAL_RUN_SECRET`/`CRON_SECRET` go into production.** *(Stage A of
   the CHUNKING_VERIFY build prompt (removed 4 Aug 2026 — in git history) — its Stage B trial is now done.)*
3. **Check the Vercel plan** — the 27 Jul trial makes this load-bearing, not housekeeping:
   ~100s/step needs Pro's 300s. 30 seconds of Mo's time. *(needs Mo)*
4. ✅ ~~**FU-003's second half**~~ — **done 3 Aug.** CI builds its own database from the
   migrations on every push, and the cross-tenant test is blocking. **The last technical gate
   before Story 3 is cleared.**
5. **Story 3 — Connectors + Actions** — the last build phase; the pilot now depends on it.
   *(its build prompt was removed 4 Aug 2026 — in git history)* Its stated preconditions are now met on the
   engineering side. **Remaining blockers are both outside engineering:** the connector table
   name (Roman) and sending credentials (Mo).

## Decided since last update

- ✅ **The pilot includes Story 3** (Roman) — so the pilot waits until Story 3 ships (~Sept).
- ✅ **Executives may not commission documents outside the Registry** (Roman) — a briefing reports
  only what genuinely exists; a need outside the catalogue is a *recommendation*, never a claim.
- ✅ **Connector table name — DECIDED (Mo, 3 Aug): `connector_grants`** (ADR-031). "mandate"
  was rejected: it already means the Executive Contract, whose immutability rules are
  load-bearing. **Story 3 Stage A is no longer blocked on this.**
- 🔬 **Model-cost tuning** (Roman) — assign cheaper/premium models per step. It's tuning, not a
  phase: a ~$6 comparison experiment, scheduled after the chunking is proven.

## Open items

### Engineering follow-ups (`FOLLOWUPS.md`)

- [x] ~~**FU-003** — migrations can't rebuild from empty → CI can't have a database.~~
      **CLOSED.** ✅ Migrations replay from empty (`supabase db reset`, all 73). ✅ CI now builds
      that database itself on every push via a new **blocking** `database-tests` job — no hosted
      test project, no secrets. The cross-tenant test finally **can fail a build**.
- [x] ~~**FU-008** — `service_role` base-table grants.~~ **CLOSED 27 Jul** by
      `20260727000002_base_role_grants.sql`. Was wider than written (`authenticated` too — a
      migration-built database served *no* founder request) and was the real blocker under
      FU-003's CI half. Production was never affected (verified read-only). Fixing it also closed
      a latent hole: `qscore_history_dedup_audit` had RLS off and holds per-founder scores.
- [x] ~~**FU-004** — a crashed cycle stuck in `running` blocks its week.~~ **CLOSED 27 Jul** by the
      chunking's `last_step_at` + staleness resume (tested).
- [ ] **FU-001** — lock down `confirm_executive_contract` RPC. *Low.*
- [ ] **FU-002** — retrofit `strategy_sessions` to the atomic-write pattern. *Low.*
- [ ] **FU-005** — `flagOff()` duplicated 5×; `compose.ts` 532 / `contract.ts` 386 over the size rule. *Low.*
- [x] ~~**CI security phase advisory** — cross-tenant test runs `continue-on-error`.~~ **CLOSED.**
      The security *property* is now gated by `__tests__/cross-tenant-rls.test.ts` (blocking):
      two real founders, anon-key clients carrying their own JWTs, asking Postgres directly.
      Proven to actually catch a breach — disabling RLS on `asset_versions` turns 3 of its 7
      tests red. The Playwright suite stays advisory (it needs a browser + built app); it is no
      longer the only thing covering this. Manual two-account checks are no longer required.

### Only Mo can do these (`missingwork.md`)

- [ ] 🔴 **Check the Vercel plan** (Settings → Plan) — **now load-bearing.** The 27 Jul trial measured
      ~100s per step: fine on Pro (300s), fails on Hobby (60s). Also settles a live contradiction
      (4 routes already declare 120–300s `maxDuration`, impossible on Hobby).
- [ ] **Configure PostHog** — retention can't be measured retroactively; hard deadline of October.
- [ ] **Confirm Upstash rate-limit vars in Vercel prod** — the limiter fails open without them.
- [ ] Resend keys (Story 3 sends) · Stripe keys (charging). **Check the "Shared" env tab first** — may already be set.
- [ ] **Read the latest trial documents** and judge whether a founder would use them.

---

## One line

Foundations safe · the Mandate live · the weekly engine built, measured against the real AI, and
now visible in the app · one safety guard (the circuit breaker) left, then Story 3 — the part that
makes it more than documents.
