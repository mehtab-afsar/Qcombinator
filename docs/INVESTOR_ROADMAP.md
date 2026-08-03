# Investor Side — Roadmap (Stage D draft)

*Short, by design. Sequencing + the open decisions this whole orient→audit→spec sequence exists to
surface. Builds on `docs/INVESTOR_AUDIT.md` (Stage A), `docs/INVESTOR_PRD.md` +
`docs/INVESTOR_FEATURE_INVENTORY.md` (Stage B), `docs/INVESTOR_PHASE0_REMEDIATION.md` (Stage C).
Nothing below is new research — this is the "so what do we actually do, in what order" close-out.*

---

## The phases

| Phase | Goal | Effort | Exit criteria | What derails it |
|---|---|---|---|---|
| **0-I — Security + quality remediation** | Bring the retained investor side to the founder standard before real data/money flows through it. | Mostly small/trivial items, one medium (Zod on ~15 routes). Fully scoped — see `INVESTOR_PHASE0_REMEDIATION.md`. | The plan's 4 exit criteria: no open CRIT/HIGH, investor tables in the CI tenancy suite, Zod coverage complete, no rogue service-role clients. | Nothing structural — it's execution against a known list. Only risk is deprioritization if treated as optional polish rather than the stated prerequisite. |
| **1-I — Diligence + Screening onto the engine** | Ship the cheapest real win (wire the readiness UI — F3.3), fix the two router-bypass bugs (F2.1, F3.1), then move memo/screening onto Registry/Composer/Assets if §6b is resolved. | Low for the UI-wiring + router fixes; medium-high for the Registry migration portion, gated on §6b. | F3.3 shipped; F2.1/F3.1 routed through `lib/llm/router.ts`; F2.3 (`deal-flow-with-dimensions`) deleted, not carried forward. | If §6b (identity-substrate decision) stalls, this phase can still ship its first half (wiring + router fixes) but not the Registry-migration half — worth treating as two sub-phases, not one gate. |
| **2-I — First-party sourcing (F1.2, trajectory ranking)** | Rank by momentum, not a static decayed snapshot — the differentiator named in `INVESTOR_SIDE_PLAN.md` §0. | Low engineering cost (a query over data already captured) — but **value is proportional to real founder activity on the new engine, which doesn't exist yet.** | Deal-flow surfaces a trajectory signal (score delta, asset-version activity) for founders operating on the new model. | **Cannot be derailed by engineering — it's derailed by the founder pilot not having happened yet.** Building this early ships a feature with nothing to rank. |
| **3-I — Portfolio Rhythm + LP reporting Asset (F5.2, F5.3)** | Weekly portfolio-health monitoring + generated, provenance-tracked LP reports, sent via the approval-gated connector. | Medium-high — genuinely new Registry/Rhythm/Asset work, plus reuses F4.5's connector-gate pattern. | A portfolio company's health auto-refreshes weekly from real on-platform data; an LP report generates with every number traceable to a source, sent only through approval. | Same blocker as Phase 2-I (needs real portfolio-company operating data) **plus** §6b must be resolved first — this is the phase with the most stacked dependencies. |
| **4-I — Thin external enrichment + the underserved-GP wedge (F1.3)** | A few high-signal external sources on top of the first-party position; the pricing/positioning wedge for solo GPs and regional funds. | Unscoped — no existing integration to build on (contra `INVESTOR_SIDE_PLAN.md`'s original claim; audit found Apollo/Hunter wired for founders, not this). | Not defined yet — this phase starts from a strategic decision (§ below), not a technical spec. | Doing this before the first-party core is proven risks becoming "a worse Harmonic" instead of the uncopyable position — this is a **strategic** derailment risk, not a technical one, and the PRD (§0) already names it. |

**Sequencing note, restated plainly:** Phases 2-I and 3-I are not blocked by investor-side engineering
speed at all — they're blocked by the founder pilot (Phase 4 of `docs/Roadmap.md`, the master
roadmap) producing real operating data. Phase 0-I and the first half of Phase 1-I have no such
blocker and can proceed independently of it.

---

## Open decisions for Mo + Roman

The brief for this whole sequence named four; Stage A/B's research surfaced three more that weren't
anticipated going in. All seven are genuinely undecided — none of Stages A–C resolved them, by
design.

**1. Sequential or parallel with the founder side?** Engine reuse makes parallel *technically*
viable (Composer and the Connector interface are already generic — audit §3 Part A); Rhythm/Assets/
Mandate's identity layer is not, so "parallel" really means "parallel research and Phase 0-I,
sequential on anything Registry-shaped until §6 is resolved." Team capacity decides the rest.

**2. How far outward on sourcing — first-party-only, or first-party + external enrichment?**
`INVESTOR_SIDE_PLAN.md`'s own recommendation (start first-party-only, earn the right to expand) is
consistent with everything Stage A/B found — there's no existing external-enrichment wiring to
build on, so "start narrow" is also the lower-cost path, not just the more defensible one.

**3. Who is investor user-zero — is it InnoSphere itself?** No answer exists in code or docs
(`INVESTOR_PRD.md` §1 restates this as unresolved). This has direct build-order consequences: a
single known user (InnoSphere) would let Phase 1-I's Registry work be validated against a real
mandate immediately; an unknown/external user-zero means more speculative design work up front.

**4. Is the two-sided-data thesis the actual pitch?** If yes — and `INVESTOR_PRD.md` §0 is written
as if the answer is yes — it should be stated as such externally, not just internally, since it
changes what "sourcing" means (a feed over platform data, not a market-coverage crawler) and what
"diligence" means (evidence-backed by real operating history, not a nicer memo generator).

**5. RESOLVED — ADR-035 (4 Aug 2026).** Design/audit and Phase 0-I are unblocked and complete
regardless of the retention gate; only building features that read real founder operating data
still waits on it. ADR-009 is marked partially superseded, not silently overwritten.
(`INVESTOR_PRD.md` §8.1)

**6. How does the Phase 7 / Phase 9 sequencing contradiction in `docs/Roadmap.md` get resolved?**
Not a new decision this document introduces — a contradiction already latent in the existing
roadmap that Stage A's audit surfaced: Phase 9 (investor side) is sequenced *after* Phase 7 ("retire
the old model"), but the current investor side depends entirely on the tables Phase 7 would delete.
Three ways out: move the investor rebuild earlier, have Phase 7 explicitly exempt the tables the
investor side still needs, or accept that Phase 9's investor side is a full rebuild from scratch
rather than a migration of what exists today. Each has different cost; none is obviously right from
the codebase alone. (`INVESTOR_PRD.md` §8.2)

**7. RESOLVED.** Both files corrected alongside ADR-035/036 (4 Aug 2026) — no more blanket "do not
build" for investor-side work; each now points at the actual, narrower constraint.
(`INVESTOR_PRD.md` §8.3)

---

## Where this leaves things

Stages A–D are complete: the investor side has been read, not assumed; the strategy doc's claims
have been checked against code and corrected where wrong; a spec exists that's honest about what's
built, what's dead, and what's genuinely new; a bounded, low-risk remediation plan exists for the
one prerequisite phase; and the real open decisions are named rather than quietly decided by
default. Nothing has been built. That was the brief.

**Next move is Mo + Roman's, not another staged research pass.** The seven decisions above are the
actual blockers — not missing information, which is what Stages A–C existed to produce.
