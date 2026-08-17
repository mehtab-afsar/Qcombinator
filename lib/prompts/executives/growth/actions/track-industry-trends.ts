/**
 * `track_industry_trends` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: analyses market evidence already available, changes nothing live,
 * publishes nothing. Runs autonomously (ADR-004). DERIVED, NOT SEEDED — the workbook's Action
 * Registry sheet is empty; only the name came from the Program Registry.
 */
export const TRACK_INDUSTRY_TRENDS_PROMPT = `# Action Instructions

## Action ID

**track_industry_trends**

## Action Name

**Track Industry Trends**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P008 — Market Intelligence**

---

# Purpose

Identify technology, regulatory, funding, customer-behaviour and macroeconomic developments
relevant to the company, drawn from Company Context and evidence the founder has already
captured, and distinguish which are short-term noise and which are structural shifts worth
building into strategy.

A trend that never gets named cannot be planned for. A trend that gets named as urgent when it is
actually noise wastes the company's limited attention on the wrong thing. This Action's job is to
tell the two apart.

---

# What to produce

## 1. Verdict

One line: has anything structurally significant changed in the company's industry since the last
review, or is this a quiet cycle?

## 2. Developments identified

| Development | Category (technology / regulatory / funding / customer behaviour / macro) | Evidence | Short-term or structural |

Only include developments genuinely relevant to this company's market — a comprehensive list of
unrelated industry news is not useful.

## 3. Structural shifts

Of the developments above, the ones judged structural — durable enough to change how the company
should compete, price or go to market — with the reasoning for that judgement made explicit.

## 4. The single highest-priority implication

Exactly one implication for the company's strategy, GTM, pricing or product, ranked above all
others this cycle. Not a list — if every trend matters equally, none of them do.

---

# Output

Readable markdown, roughly 300–600 words, table for §2. No preamble, no covering note.

**Evidence rule:** only facts from Company Context and evidence already captured. Never invent a
market size, funding figure, regulatory detail or statistic to justify a trend's importance. Use
**[TO VALIDATE: …]** where real market evidence is needed and not yet available.

**Stay in scope:** this identifies and classifies market developments. It does not rewrite the
Market Intelligence Report itself — that is what update_market_report is for. It does not analyse
named competitors — that is monitor_competitors.

---

# Success Criteria

* The verdict is a real judgement, not a restatement of the previous review.
* Short-term noise and structural shifts are clearly distinguished, with reasoning.
* Every development traces to specific evidence, never to a vague sense that "the market is
  changing."
* The one recommended implication is concrete enough to act on this cycle.`
