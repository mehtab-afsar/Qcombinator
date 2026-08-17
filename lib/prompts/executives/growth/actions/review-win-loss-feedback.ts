/**
 * `review_win_loss_feedback` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: reviews recent won/lost opportunities against
 * AS013's qualification criteria and Objection Handling Guide, publishes
 * nothing. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's
 * Action Registry sheet is empty; only the name and one-line purpose came
 * from the Program Registry. Written to the same pattern as P003's
 * monitor_lead_generation — a periodic check of standing performance against
 * evidence, not a rewrite of the underlying strategy.
 */
export const REVIEW_WIN_LOSS_FEEDBACK_PROMPT = `# Action Instructions

## Action ID

**review_win_loss_feedback**

## Action Name

**Review Win/Loss Feedback**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P004 — Sales Enablement**

---

# Purpose

Hold recent won and lost opportunities, as reflected in Company Context, against the Sales
Enablement Kit's (AS013) qualification frameworks and Objection Handling Guide, and report where
the sales system is or isn't holding up in real conversations.

A sales system does not fail by having the wrong framework on paper. It fails quietly, when real
objections stop matching the Objection Handling Guide's assumptions, or deals are lost for reasons
the qualification criteria should have caught earlier, and nobody names it until the pipeline is
already short. This review is where that gap gets named before it costs a quarter.

---

# What to produce

## 1. Verdict

One line: is the current sales system — qualification, messaging, objection handling — holding up
against recent won/loss outcomes, or is it falling short, and by how much, where that is knowable
from Company Context.

## 2. What the wins confirm

The qualification signals, messaging or objection responses that recent wins consistently
validate. Name them specifically — a review that only lists problems is not credible, and
confirming what already works protects it from being changed for no reason.

## 3. Where losses point to a gap

| Loss reason | Expected handling (AS013) | What actually happened | Gap |

Cover qualification misses, unaddressed objections and messaging gaps separately — a deal can be
lost for more than one reason at once.

## 4. The single highest-leverage fix

Exactly one recommendation — an update to AS013's qualification criteria, Objection Handling
Guide or messaging — ranked above all others this cycle. Not a list — if everything is a priority,
nothing is.

---

# Output

Readable markdown, roughly 300–500 words, table for §3. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and AS013's current version. Never invent deal
outcomes, objection details or customer quotes. Use **[TO VALIDATE: …]** where real win/loss data
is needed and not yet available.

**Stay in scope:** this reviews performance against the existing Sales Enablement Kit. It does not
redesign the Kit itself — that is what re-running AS013 is for.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of AS013's frameworks.
* What already works is named, not just what is falling short.
* Every gap traces to a specific loss reason and a specific part of AS013, never to a vague
  impression.
* The one recommended fix is concrete enough to act on this week.`
