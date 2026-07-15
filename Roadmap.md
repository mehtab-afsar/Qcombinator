# Edge Alpha — Delivery Roadmap

*The "when" for `EDGE_ALPHA_PRD.md`. Organised by the three Stories and the three Products. Target: **Stories 1–3 complete by end of September 2026 ("Sprint II")**. Anchored at July 2026.*

---

## Assumptions (change these and the dates move)

- **Team:** ~2 engineers + product/design part-time. This is the biggest lever — more capacity compresses everything.
- **Cadence:** weekly sprints; everything ships behind `NEW_EXECUTIVE_MODEL` (default off).
- **"Done" =** merged, tested, behind the flag, demoable — not "code written."
- **Effort scale:** S ≈ 1–3 days · M ≈ 3–6 days · L ≈ 1–2 weeks (one engineer's focused time).
- **No blocking decisions.** Both prior open questions are resolved (PRD §14). Phase 0 can start now.

**Headline:** Phase 0 (~3 wks) → Story 1 (~3 wks) → Story 2 (~4 wks) → Story 3 (~3 wks) ≈ **end of September**. Pilot + retention gate follows in October.

---

## Timeline at a glance

```
2026        Jul          Aug          Sep          Oct          Nov+
──────────────────────────────────────────────────────────────────────
Phase 0  ██████
Story 1        ████████
Story 2                ████████████
Story 3                            ████████
  ── Sprint II ends ──────────────────────┤ (end Sep)
Pilot + RETENTION GATE ★                        ██████
Deferred layers (see below)                              ████████████
```

**★ Retention gate (Oct):** if the pilot cohort doesn't return in week 4, we stop and fix. We do **not** start the deferred layers.

---

## Phase 0 — clear the ground · ~2–3 weeks (Jul)

*Nothing new-facing ships. Make the base safe.*

| Task | Effort | Exit criteria |
|---|---|---|
| Audit + close every artifact/action creation path outside the mandate | M | Written list; no side doors |
| Single-source the score-boost signal **and decouple it from Asset creation** | M | Creating an Asset never moves the Q-Score |
| Add the billing integration test (checkout → webhook → DB) | M | Test passes; the known-broken flow is guarded |
| Type the Supabase admin client at billing/webhook call sites | S | No `any` there |
| Settle action-vs-cadence naming (→ **ADR-020**: Action is the genus, `kind:'oneoff'\|'recurring'`; a cadence is a *frequency*, not an entity); add `NEW_EXECUTIVE_MODEL` flag | S | Names fixed; flag exists (off) |
| Freeze old agent routes | — | Agreed; strangler target stops moving |
| CI: advisory phases blocking · E2E on prod build · Node 20+ | M | Green CI means safe to ship |

**Exit:** base instrumented, billing guarded, flag in place, old model frozen, Q-Score decoupled.

---

## Story 1 — Mandate · ~3 weeks (late Jul → mid Aug)
### Products: Registry + Prompt Composer

| Task | Effort |
|---|---|
| `lib/registry/**` — types + loader, **generic for all Executives/Programs**; seed from the workbook (all entries; P001 complete) | L |
| `lib/prompts/compose.ts` — 4-layer assembly (Executive System Prompt + Program Prompt + Asset/Action Instructions + Company Context) | M |
| Composer validation + runtime errors (the P001-with-S004 case must fail) | M |
| `strategy_sessions` + `executive_contracts` tables (immutable, versioned, epoch) + RLS | M |
| `POST /api/strategy` · `POST /api/contracts` (confirm → activates Programs) · `POST /api/contracts/new-epoch` | M |
| `/founder/executive` command view (mandate · active Programs · Briefings placeholder) | M |

**Exit (S1):** one current Strategy + one confirmed Contract + active Programs. A change issues a **new epoch**; history preserved. Invalid prompt packages are blocked with the correct runtime error.

---

## Story 2 — Rhythm + Assets · ~4 weeks (mid Aug → mid Sep)
### Products: Asset Persistence & Versioning + Operating Rhythm

| Task | Effort |
|---|---|
| `asset_versions` table + `lib/assets/versioning.ts` — immutable, provenance, exactly-one-current, sequential | L |
| Persistence validation (the P003-output→AS001 case must fail) | M |
| Founder Asset pages + `PUT /api/assets/:id` — **edit → new immutable current version**, no approval | M |
| `executive_briefings` table + Briefing generation per Program run | M |
| `lib/rhythm/run.ts` + `operating_rhythm_runs` — **idempotent**, runs **all contract-active Programs**, **no Asset Review** | L |
| Vercel Cron trigger + `POST /api/rhythm/run` (manual for testing) | S |
| Mandate-integrity guard + unit tests | M |

**Exit (S2):** cycles run; **AS001–AS005 created and measurably improved across ≥2 cycles**; a Briefing per run; the founder can edit an Asset and the next cycle uses it; the same cycle can't run twice; no Program runs outside the Contract. **No external execution yet.**

---

## Story 3 — Actions + Connectors · ~3 weeks (mid → end Sep)

| Task | Effort |
|---|---|
| `connector_connections` vault + Gmail OAuth (`POST /api/connectors/gmail/oauth`) — **not** `/api/connections`, that route is taken by founder→investor intros | L |
| Connector adapter interface (prefer MCP client) | M |
| Action generation from Programs; `action_log` (immutable) | M |
| **Just-in-time approval on irreversible** at the Connector boundary + approval UI | M |
| Founder-visible status: prepared Action · payload · target system · execution status · result · failure/retry | M |
| Recurring cadences via extended `scheduled_actions` | S |

**Exit (S3 / Sprint II):** P001's **Interview Customers** Action → payload prepared → **founder approves** → sent via Gmail → logged. Nothing irreversible sends without approval.

*Contingency:* if Gmail OAuth slips, reuse the existing outreach/Resend send path to keep the milestone — do real OAuth in October.

---

## October — Pilot + Retention Gate ★

Run the loop with a small pilot cohort behind the flag. Measure activation and — the decision metric — **week-4 retention**. Fix the top friction (budgeted, not slack).
**Gate:** healthy → proceed to the deferred layers. Weak → **stop and fix the loop**; widen nothing.

---

## After Sprint II — deferred, in this order

1. **More Programs / Executives** — the runtime already supports them; it's Registry entries + prompts.
2. **More Connectors** (CRM, calendar, analytics).
3. **Event-aware rhythm (`runsWhen`)** — cost optimisation once volume justifies it.
4. **Outcome Loop** — outcomes as evidence for Q-Score reassessment (never automatic).
5. **Evidence Pack** — reporting derived from Assets, Briefings, Actions, results.
6. **Investor-side features** — the marketplace and any investor-facing score thesis.

**None of these are in the current core.** Building them early is the named scope-creep risk (PRD §13.7).

---

## Workstreams (who's in which lane)

- **Backend/platform (critical path):** Registry → Composer → Mandate → Versioning → Rhythm → Connectors. Roughly one milestone every 2–3 weeks.
- **Frontend/product:** command view → Asset pages/editing → approval UI. Runs ~1 milestone behind, designing ahead.
- **QA/DevEx:** Phase 0 CI + billing test; the mandate/versioning/idempotency/composer unit tests; the full-loop E2E each Story.

## What could slow this down

- **Connector/OAuth reliability** — the classic time sink. Mitigation: the Story-3 contingency above.
- **The Rhythm engine** (idempotency, partial failures, retries) — genuinely hard; give it the buffer, not the connector.
- **Cost of running all contract-active Programs weekly** — keep the active set small during the pilot; `runsWhen` is deferred.
- **Team size** — every date assumes ~2 engineers. This is the dial to turn.
- **Weak retention** — treated as a first-class outcome (★), not something to route around.

**Buffer:** each phase carries ~15% slack; plan against the ranges, not the low ends.

---

## One line

Harden the base (3 wks) → mandate (Story 1) → rhythm + versioned assets (Story 2) → actions through connectors (Story 3) = **Sprint II by end September** → pilot and **only widen if founders come back**.
