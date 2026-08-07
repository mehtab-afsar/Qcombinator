/**
 * `prioritize_channels` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: ranks channels, spends nothing, commits nothing. Runs autonomously
 * (ADR-004). DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const PRIORITIZE_CHANNELS_PROMPT = `# Action Instructions

## Action ID

**prioritize_channels**

## Action Name

**Prioritize Channels**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# Purpose

Turn AS005's Channel Strategy into a **decision**: given this company's evidence, constraints and
founder capacity right now, which one or two channels should get effort this quarter — and which
should explicitly not.

AS005 maps the landscape. This Action commits to a direction within it. A ranking that says
"test everything" has decided nothing.

---

# What to produce

## 1. The recommendation

The **one** channel to concentrate on, in a sentence, with the reason. If a credible second
exists, name it as a secondary — never more than two.

## 2. The ranking

| Rank | Channel | Why it ranks here | Evidence standing | Effort to first signal |

**Evidence standing:** evidenced / inferred / assumed — the same discipline AS005 uses. Rank on
what is known, not on what is fashionable.

**Effort to first signal:** how long until this channel produces evidence it is working or not.
A channel that takes a quarter to read is a worse bet than one that answers in two weeks, even
at a lower ceiling — early-stage companies buy information, not just customers.

## 3. What we are deliberately NOT doing

Name the channels being set aside this quarter and why. This is the half of prioritisation that
gets skipped, and it is the half that makes it real — an unranked channel quietly stays on the
list forever.

## 4. What would change this

The observation that would make you re-rank. State it as a trigger the founder can watch for.

---

# Output

Readable markdown, roughly 400–700 words, table for §2. No preamble.

**Constraints:** this company's actual constraints govern — founder time, budget, existing
assets, sales cycle. A channel requiring a content library or a sales team that does not exist
is not "ranked lower", it is **not available**, and should be named as such.

**Evidence rule:** only facts from Company Context. Never invent CAC figures, conversion rates,
benchmarks or competitor results. Industry reasoning is welcome **when labelled as an estimate**;
a fabricated number that reads as measured is the worst outcome, because a founder may budget
against it. Use **[TO VALIDATE: …]** where a real number is needed.

---

# Success Criteria

* A founder finishes knowing what to do on Monday.
* The recommendation follows from the evidence rather than from channel fashion.
* Setting channels aside is explicit, not implied.
* No invented metric is presented as measured.`
