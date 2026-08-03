# Investor Side — PRD (Stage B draft)

*The canonical investor spec, written to the same standard as `EDGE_ALPHA_PRD.md`. Draft for Mo +
Roman, 4 Aug 2026. Built directly on `docs/INVESTOR_AUDIT.md` (Stage A) — every claim here should
trace to that audit or to new design decisions made explicitly in this document, not to
`INVESTOR_SIDE_PLAN.md`'s original (partially corrected) claims.*

**Status: draft, unresolved conflicts included on purpose.** See §8 before reading this as
approved direction — this document supersedes ADR-009 and the Roadmap's Phase 7/9 sequencing in
several places, and those conflicts are surfaced, not resolved, per the brief for this stage.

---

## 0. The two-sided-data thesis (from line one, as it should shape everything below)

**Founders operate their company on Edge Alpha. That operating exhaust — real GTM assets, real
weekly progress, real actions taken — is data no external crawler can ever see, because it only
exists because the founder chose to build here.** An investor product fed by that first-party
operating data is structurally uncopyable by Harmonic, Specter, or Tracxn, whose moat is *years of
crawled* signal. Edge Alpha's investor side does not compete on crawl depth. It competes on being
the best place to evaluate and back founders who are *already operating* on the platform, with
evidence a data room can't fake, then extends outward from that position — never the reverse.

Every design decision below is graded against one question: **does this feature depend on the
two-sided position, or would it work identically if Edge Alpha only had a founder database?**
Features that fail this test (generic CRM, generic thesis scoring) are built competently but kept
thin. Features that pass it (evidence-backed diligence, trajectory-based sourcing, live portfolio
health) are where the product should lean hardest.

---

## 1. The user

**An investor** — VC, angel, or solo GP — evaluating and backing founders. Two sub-cases the audit
surfaces as still-open (INVESTOR_SIDE_PLAN.md §7, unresolved, restated here):

- **Is InnoSphere itself user zero?** No answer found in code or docs; this is a product decision
  for Mo + Roman, not something Stage A/B can determine from the codebase.
- **The underserved-GP wedge** (solo GPs, regional/sector funds priced out of enterprise tooling)
  is named as a strategic entry point in the plan doc but has no product surface built toward it
  yet — worth an explicit decision before Stage C prioritizes anything for it.

Today's actual investor, per the audit, signs up via `/investor/onboarding`, gets a
`investor_profiles` row plus a mirrored `demo_investors` directory entry (now correctly
RLS-scoped — see `docs/INVESTOR_AUDIT.md` §2, C-1, fixed 4 Aug 2026), and lands in a dashboard
built around Q-Score-ranked deal flow.

## 2. The core loop

The loop that exists today, verified in the audit:

**Sourcing (Q-Score-ranked inbound) → Screening (thesis weights) → Diligence (memo/chat) → CRM
(pipeline/watchlist/connect/message) → [no portfolio-monitoring loop; no LP loop].**

The loop this PRD proposes, once the two-sided thesis is applied:

**Sourcing (trajectory-ranked, first-party) → Screening (explainable thesis-fit) → Diligence
(evidence-backed by the founder's actual operating history) → CRM (thin, connector-gated outreach)
→ Portfolio (weekly Rhythm health) → LP reporting (versioned Asset, no-invented-evidence).**

The only genuinely new *loop-level* step is the last two — portfolio monitoring and LP reporting
don't exist today at all (audit §1, Vertical 5). Everything else is rebuild-in-place, not new
loop shape.

## 3. Explicitly NOT being built

Stated plainly so it can be cited back:

- **No web/GitHub/filings crawler.** Sourcing does not chase Harmonic/Specter/Tracxn on data
  depth. Any external enrichment is a *few* high-signal sources added later (§6), never the core.
- **CRM stays thin, permanently — not just for v1.** No relationship-graph depth, no
  Affinity/Attio-style interaction scoring, no email-thread mining. Pipeline + watchlist +
  messages + a connector-gated outreach action is the ceiling, not a stepping stone to more.
- **No general-market sourcing.** The product does not attempt to represent every startup in a
  sector — only founders operating on Edge Alpha, plus (later, thin) enrichment on top of them.
- **No LP-facing self-serve portal in v1.** LP reporting (§7, Vertical 5) is an investor-generated,
  investor-sent Asset — not a separate LP login/dashboard product.
- **No investor-side chat/adviser persona surface.** CLAUDE.md §0.4 already forbids resurrecting an
  adviser-chat surface on the founder side; the same rule applies here by extension — diligence
  chat (`startup/[id]/chat`) is a scoped Q&A tool over one founder's data, not a persistent adviser.

## 4. What's genuinely strong today (carried forward from the audit, restated as product fact)

- Diligence memo + chat are real and usable today (model-hardcoding aside — a Stage C fix, not a
  product gap).
- The 4-agent readiness synthesis is backend-complete and well-engineered; it needs a UI, not a
  rebuild (audit §1, Vertical 3; §4).
- RLS discipline is otherwise sound (one gap, now fixed).
- Portfolio-companies tracking (import/invite/bulk-invite) is substantial, not a stub.

## 5. What's actually missing (the honest gap, restated as product fact)

- Sourcing ranks on a static, decayed Q-Score snapshot — no trajectory signal, despite the data to
  compute one (`qscore_history`) already existing (audit §5).
- LP reporting doesn't exist — not "thin," genuinely absent; the two tables that looked like
  evidence of it (`investor_updates`, `portfolio_views`) are dead, founder-side schema (audit §1,
  Vertical 5).
- Portfolio health has no live monitoring loop — it's a static list today.
- `deal-flow-with-dimensions` is dead, silently-broken code that should be deleted, not extended
  (audit §1, Vertical 2; §2, M-1).

---

## 6. Data model

### 6a. What exists today (verified, owned by the current investor side)

| Table | Purpose | RLS |
|---|---|---|
| `investor_profiles` | Investor identity, thesis, criteria | owner-scoped |
| `demo_investors` | Founder-facing investor directory (mirrors real profiles) | owner-write, `authenticated`-read (fixed 4 Aug 2026) |
| `investor_pipeline` | CRM stage tracking | owner-scoped |
| `investor_watchlist` | Score-threshold watch | owner-scoped |
| `investor_portfolio_companies` | Investor's own portfolio roster | owner-scoped |
| `investor_parameter_weights` | Thesis-scoring weights | owner-scoped |
| `investor_configs`, `investor_team_members`, `investor_team_invites` | Config, multi-seat | owner/role-scoped |
| `connection_requests`, `messages` | Shared with founder side; keyed by real `investor_id` **or** `demo_investor_id` | app-enforced ownership (RLS can't OR across the two FK types — verified correct pattern, audit §2) |

**What the current investor side reads but does not own** (the entanglement the audit calls the
single strongest piece of evidence that this is a rebuild, not an extension — audit §3 Part B):
`founder_profiles` (incl. `startup_profile_data`), `qscore_history`, `agent_artifacts` (read **and
written** — the memo route persists generated memos here), `profile_builder_data`. Two features
(deal-flow ranking, the founder deep-dive page) cannot function without these tables today.

### 6b. The identity-substrate decision (new — the design gap the audit found, not yet resolved)

The founder engine's Rhythm/Assets/Mandate/Actions layers hard-key `founder_id` as a literal
foreign key to `founder_profiles(user_id)`, replicated across `strategy_sessions`,
`executive_contracts`, `asset_versions`, `action_log` (audit §3 Part A). Before any investor
Executive/Program/Asset/Action work can begin, **one of these two must be chosen — this PRD does
not choose for Mo/Roman:**

- **(a) Owner-type-agnostic identity layer.** Migrate the five core tables to a generic
  `owner_id` + `owner_type: 'founder' | 'investor'` shape (or an `owners` table both
  `founder_profiles` and `investor_profiles` reference), with matching RLS rewrites on each. One
  schema, one engine, higher migration cost up front.
- **(b) Parallel investor-flavored tables.** `investor_strategy_sessions`,
  `investor_executive_contracts`, etc., mirroring the founder shape with `investor_id` FKs. Lower
  migration risk (founder tables untouched), but duplicates the Rhythm/Mandate/Assets *logic* (not
  just schema) unless that logic is also parameterized on which table set to hit — meaning it isn't
  actually free of rework either.

Recommendation for Stage C to evaluate, not adopt here: (a) is more consistent with "one Composer,
one engine" (CLAUDE.md prime directive #2), but the effort should be sized before committing —
this PRD flags the decision as a blocking prerequisite, not the decision itself.

### 6c. New tables/columns this PRD implies (design sketch, not migration-ready)

- **LP reports** as a new `AssetDef` (`AS0xx`, `outputSchema: 'markdown'`) — persisted via the
  existing `asset_versions` mechanism (or its investor-equivalent per §6b), never a bespoke table.
  No new persistence primitive needed; this is exactly the kind of reuse the engine is for.
- **Portfolio-health snapshots** — either a new Rhythm cycle output (no new table, just a Program
  whose Asset is "this cycle's portfolio health") or, if a queryable history is wanted, a
  `portfolio_health_snapshots` table analogous to `founder_metric_snapshots`. Sizing this is a
  Stage C task.
- **No new sourcing-ingestion table is needed for the first-party signal work** (§5, §7 Vertical 1)
  — it's a read/aggregation over `qscore_history` + `asset_versions` + `agent_artifacts`, not new
  storage.

---

## 7. Engine mapping — which verticals become Registry entries, which sit outside it

| Vertical | Registry mapping | Notes |
|---|---|---|
| **1. Sourcing** | **Outside the engine — a feed, not a Program.** Ranks/surfaces founders; doesn't operate on behalf of an investor in the Rhythm sense. | Confirmed correct per `INVESTOR_SIDE_PLAN.md` §2's own framing — the audit found nothing to contradict this. |
| **2. Screening** | **Program** (`P0xx "Screen Inbound"`), owned by a new **Executive** (see below), producing an **Asset** (`AS0xx "Thesis-Fit Reasoning"`, markdown, versioned) per founder-thesis pair. | Needs the identity-substrate decision (§6b) resolved first — this is the first genuinely engine-shaped investor feature. |
| **3. Diligence** | **Program** (`P0xx "Run Diligence"`) → **Asset** (`AS0xx "Investment Memo"`, replacing today's `agent_artifacts`-backed memo) + the readiness synthesis becomes an **Action or Asset**, not left as an orphaned route. | Highest-value migration target — the backend logic (4-agent synthesis, memo generation) is reusable near-verbatim; only the persistence layer changes. |
| **4. CRM** | **Action**s only (`outreach` = `irreversible: true`, `connector: 'gmail'`, reusing the Story 3 approval gate exactly as `INVESTOR_SIDE_PLAN.md` §3 Vertical 4 proposes) — pipeline/watchlist/messages stay as plain app state, not Registry entries. | Confirmed low-moat, correctly scoped thin per the plan doc; the audit found no reason to expand this. |
| **5. Portfolio/LP** | **Program** (`P0xx "Monitor Portfolio"`) running as a **weekly Rhythm cycle**, producing two **Asset**s: a portfolio-health snapshot and, on demand, an **LP Report Asset** (no-invented-evidence rules apply — CLAUDE.md's existing provenance rules, not new ones). | The clearest "reuse pays off" case — Rhythm's cycle-key idempotency and Assets' versioning solve LP-reporting's hardest requirement (never fabricate a number) for free. |

**The Executive question (audit §3 Part A, the sharpest unresolved point):** `ExecutiveId` is a
closed union of exactly five founder-function roles. This PRD does not propose a specific new
Executive id (e.g. `'investor'`) because that decision is entangled with §6b — if (b) parallel
tables is chosen, a same-shaped-but-separate Executive registry might be cleaner than extending the
closed union at all. **Flagged as a Stage C architecture decision, not decided here.**

---

## 8. Conflicts this PRD surfaces

Originally written up as "surfaced, not resolved — Mo + Roman decide." Two of the four have since
been decided (ADR-035, ADR-036, 4 Aug 2026); marked below. The other two remain genuinely open.

1. **RESOLVED — ADR-035.** Mo decided: design/audit work and Phase 0-I remediation are unblocked
   and complete regardless of the retention gate; only *building* features that read real founder
   operating data still waits on it (unchanged from ADR-009's substance, just scoped narrower).
   `CLAUDE.md` §1 and `docs/ROADMAP_STATUS.md` have been corrected accordingly.

2. **`docs/Roadmap.md` / `docs/ROADMAP_STATUS.md` sequence investor-side work at Phase 9 —
   explicitly *after* Phase 7 ("Retire the old model," Q1 2027, "THIS is the cleaning... happens
   last, not first").** But the audit (§3 Part B) found the *current* investor side depends
   entirely on the exact old-model tables Phase 7 would delete (`agent_artifacts`, `qscore_history`,
   `profile_builder_data`). **This is an internal contradiction in the existing roadmap, not
   something this PRD introduces:** as sequenced, by the time Phase 9 (investor side) is reached,
   Phase 7 will already have removed the tables the current investor code needs to run. Either the
   investor side must be rebuilt onto the new engine *before* Phase 7 (contradicting "Phase 9 is
   after Phase 7"), or Phase 7 must explicitly exempt the old-model tables the investor side still
   needs, or the investor rebuild timeline needs to move earlier in the master sheet. **Flagged for
   Mo + Roman to resequence; not resolved here.**

3. **RESOLVED — ADR-036.** ADR-034's adviser-layer deletion never applied to investor code; this
   is now recorded explicitly rather than left ambiguous for a future session to misread.

4. **Naming collision, minor but worth fixing:** `INVESTOR_SIDE_PLAN.md`'s "Phase 0-I / 1-I / 2-I..."
   numbering and `docs/Roadmap.md`'s "Phase 0–10" numbering are two independent schemes that will
   read as sequential to a future reader. Recommend renaming the investor phases (e.g. "Investor
   Stage I/II/III") before Stage D's roadmap doc is written, to avoid a false "Phase 1-I comes after
   Phase 1" reading.

---

## Summary for Stage C

The PRD's practical output for Phase 0-I planning: **fix Phase 0-I (security remediation, C-1 done,
H-1/H-2/H-3 open) regardless of how the four conflicts in §8 resolve** — it's independent of any
architectural or sequencing decision. Everything past that (the identity-substrate decision in §6b,
the Executive-registry question in §7, and the four conflicts in §8) needs Mo + Roman's input before
Stage C can turn this into an executable remediation plan with real dates.
