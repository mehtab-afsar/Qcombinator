# B8 — What feeds a weekly cycle? A decision paper

> **DECIDED (Mo, 20 Jul 2026): Option 1 + the regeneration-skip fix — recorded as ADR-028,**
> with two amendments: the skip is an explicit amendment to ADR-008 (asset-level regeneration
> conditional, Program-level scheduling unconditional), and the passive-founder consequence is
> flagged as an open pilot question (all digest signals require founder action). Built the same
> day. This paper is retained as the decision record.

*For Mo. No code was written for this. The finding: every Operating-Rhythm cycle regenerates
Assets from identical inputs — same Strategy, same Contract, same prior Assets. Nothing new
enters, so "weekly regeneration" is the model rewriting the same document. This paper makes that
a well-posed decision. 20 Jul 2026.*

---

## 1. The two consequences, stated plainly

### The Story 2 exit criterion is currently unmeetable — yes, I agree

The criterion is *"AS001–AS005 measurably improve across ≥2 cycles."* Cycle 1 is genuinely
meaningful: assets go from nothing (or founder drafts) to program-generated documents. But from
cycle 2 onward, with zero new inputs, any difference between versions is **model variance at
temperature 0.3, not improvement**. There is nothing for improvement to be *about*. As written,
the criterion cannot be met by the current engine — not because the engine is broken, but because
improvement requires new information and none is supplied.

**A subtlety that makes it worse, found while writing this:** the engine regenerates every asset
**unconditionally** each cycle (`run.ts` loops all of `program.assets` regardless of whether
anything changed). So the carefully-built "no material change → short honest briefing" path is
**unreachable in practice** — every cycle rewrites every asset, so every briefing reports
"changes" that are actually noise. The founder wouldn't see "nothing changed this week"; they'd
see fake change weekly. That is more corrosive to trust than silence.

### Week-4 retention — honestly, no

October's gate is week-4 retention. Ask the question concretely: a founder confirms their mandate
in week 1 and reads a genuinely useful first briefing. In weeks 2–4 they receive briefings
"reporting" on documents that were rewritten from unchanged inputs. By week 3 a smart founder
notices the ICP is the same idea in different words. There is no reason to return, and worse, a
reason to distrust. **A founder has no durable reason to come back to a briefing derived from
unchanged inputs.** Retention would measure novelty decay, not product value.

---

## 2. The options

### Option 1 — Feed the cycle from signals that already exist ✅ recommended

**What feeds a cycle:** a `newInformation` digest built from deltas since the last completed run:

| Signal | Table | Available today? | Freshness in practice |
|---|---|---|---|
| Founder Asset edits (ADR-007) | `asset_versions` (`authored_by='founder'`) | **Yes — live, new-model** | The best signal: a founder edit is an explicit statement of changed thinking, already versioned with timestamps |
| Company Builder uploads / artefacts | `agent_artifacts`, profile-builder uploads | Yes (old model, live and exercised) | Fresh whenever the founder uploads evidence — decks, contracts, screenshots |
| Q-Score changes | `qscore_history` | Yes | Changes on recalculation (free tier: 2/month) — coarse but meaningful |
| Metric snapshots | `founder_metric_snapshots` | Yes (table live; RLS fixed in Phase 0) | Only as fresh as the founder's metric updates |
| A new mandate epoch | `executive_contracts` | Yes — already picked up naturally | Rare, high-signal |

**How:** `buildContext` (in `lib/rhythm/run.ts`) computes "what's new since the last completed
run" from these tables and passes it as `context.newInformation` — the Composer already renders
that field ("New Information This Cycle"); it is simply never populated today. Pair it with the
obvious hygiene fix: **skip regenerating an asset when there is no new input** (an input-hash or
since-last-run check), which makes the no-change briefing real and honest instead of unreachable.

**Effort:** small-to-medium — one focused feature (a delta-reader + the skip check), no schema
change, no new tables, ~a day or two of work plus tests.

**What it changes about what the pilot proves:** cycles genuinely react to founder activity. The
exit criterion becomes meetable **conditionally**: assets improve when founders supply signal
(edit an asset, upload evidence, update metrics). That's the honest shape of the product anyway —
an executive team that reacts to what happens, not one that hallucinates progress. I'd restate
the criterion as: *"cycle N+1's assets demonstrably incorporate founder-provided signal from week
N."* Measurable, honest, and it directly serves the retention question — the briefing now tells
the founder something they didn't already know.

**ADRs touched:** none reopened. ADR-007 (founder edits are first-class) is *used as designed*;
ADR-008 stays intact (the rhythm still runs all contract-active Programs on the calendar — what
changes is the *content* fed in, and whether an unchanged asset is rewritten, not *whether the
Program runs*). The skip check operates inside the cycle, below the level ADR-008 governs.

### Option 2 — Event-driven rather than calendar-driven

Run a cycle when something changes (an upload, an edit, a metric move) instead of weekly.

**What it costs:** this **reopens ADR-008**, which explicitly deferred `runsWhen`/event-skipping
out of v1 for simplicity and predictability. Concretely: scheduling complexity (debouncing a
burst of edits, quiet-period handling), a fuzzier idempotency story (what is `cycle_key` for an
event-triggered run?), an unpredictable spend profile, and the loss of the founder-facing
promise "your team reports every Monday" — a rhythm founders can anticipate is itself product
value. **Effort:** medium-large. **What the pilot proves:** responsiveness — but Option 1
already delivers the substance of that (the Monday cycle *reacts to* the week's events) without
any of the machinery. Not recommended for v1; revisit at scale exactly as ADR-008 already says.

### Option 3 — Change what the pilot claims

Keep the engine as-is; reposition from *"an AI executive team runs your company"* to *"the system
maintains your company's documents as your thinking evolves."*

**Effort:** near zero (copy + positioning only). **Honesty:** high — it stops claiming what the
engine doesn't do. **What it costs:** it's a materially weaker claim, and it makes the October
read *measure the wrong product*. Retention against "document maintenance" tells you whether
founders like tidy documents — not whether the Founder-OS thesis (ADR-001) holds. If the pilot
succeeds, you've validated a feature, not the company. Worth adopting **as interim honest copy**
while Option 1 is built, but not as the answer.

---

## 3. Recommendation

**Option 1, plus the regeneration-skip hygiene fix — and do not reopen ADR-008 (Option 2).**

Reasoning: Option 1 is the only choice that makes the exit criterion meetable *and* gives a
founder a real reason to return in week 4, at roughly two days of effort, without reopening any
locked decision. The founder-edit signal (ADR-007) was *designed* to be consumed this way — the
current engine simply never reads it. Option 2 buys little that Option 1 doesn't, at much higher
cost and an ADR reopening. Option 3 is honest but proves the wrong thing; use its framing only
as interim copy.

**Sequencing note — the Outcome Loop (ADR-009):** the deferred Outcome Loop would have been the
*richest* feed (real-world results of Actions flowing back as evidence). Nothing here requires
pulling it forward: Option 1's signals are sufficient for the pilot. But when Story 3 lands,
**Action outcomes should join the `newInformation` digest** (an Action executed → its result is
next cycle's input) — that is the natural, minimal slice of the Outcome Loop, and it can be noted
in Story 3's design rather than built now.

**If Option 1 is adopted, the one-line decision to record as an ADR:** *"A cycle's judgement is
fed by a delta digest of founder activity since the last completed run (asset edits, uploads,
Q-Score changes, metric updates); an asset with no new relevant input is not regenerated, and the
no-change briefing says so."*

---

*Decision is yours. No code has been written for any option.*
