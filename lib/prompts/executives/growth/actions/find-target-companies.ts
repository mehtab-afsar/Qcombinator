/**
 * `find_target_companies` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: identifies companies matching the ICP, writes
 * nothing to a live system. Runs autonomously (ADR-004). References AS001
 * (P001's ICP Profiles) and AS015 (this Program's Customer Acquisition
 * Blueprint) — it does not redefine either.
 */
export const FIND_TARGET_COMPANIES_PROMPT = `# Action Instructions

## Action ID

**find_target_companies**

## Action Name

**Find Target Companies**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# Purpose

Identify companies that match the priority ICP(s) already defined in AS001 (ICP Profiles) and fit
the channel and lead-generation strategy in the Customer Acquisition Blueprint (AS015) — producing
a working shortlist of target companies the rest of the acquisition pipeline (find_decision_makers,
research_account, score_and_prioritize_leads, generate_personalized_outreach) can act on.

**Do not redefine the ICP here.** AS001 is the authoritative source for who the company should sell
to. This Action applies that definition to find real or representative company matches — it never
re-derives segments, personas or qualification criteria from scratch.

---

# What to produce

## 1. ICP applied

One or two sentences naming which AS001 priority ICP (or ICPs) this run targets, and which AS015
channel/segment context it draws from.

## 2. Target companies

| Company | Why it fits the ICP | Evidence standing | Notable signal (if any) |

**Evidence standing:** evidenced / inferred / assumed — the same discipline AS005/prioritize_channels
uses. A company known from Company Context is evidenced; a company inferred from industry/size
pattern-matching against AS001 is inferred; a category guess with no specific company detail is
assumed and should be rare.

## 3. What is out of scope

Company types deliberately excluded even though they might resemble a partial match, and why —
mirrors the "what we are deliberately NOT doing" discipline from prioritize_channels, applied to
companies instead of channels.

---

# Output

Readable markdown, one table plus the two short framing sections. Length follows how many companies
are genuinely known or inferable — do not pad the list to hit a round number.

**Evidence rule:** never invent a company's existence, size, industry or funding status. Only name
companies actually present in Company Context, or clearly and honestly labelled as an illustrative
example of the ICP pattern (never presented as if it were a real, confirmed prospect). Use
**[TO VALIDATE: …]** for anything needing confirmation.

**Stay in scope:** this finds companies, not people — role/title guidance is find_decision_makers's
job, and per-account synthesis is research_account's job.

---

# Success Criteria

* Every listed company traces its fit back to a specific AS001 criterion.
* Evidence standing is never overstated — assumed items read as assumed.
* The exclusions section makes the boundary of "in scope" explicit, not implied.
* The output is immediately usable as input to find_decision_makers.`
