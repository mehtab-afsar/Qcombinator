/**
 * `research_account` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: synthesises what is knowable about ONE target
 * account from Company Context. No live web-research connector exists;
 * this Action works from what has actually been captured, not a live pull.
 * Runs autonomously (ADR-004).
 */
export const RESEARCH_ACCOUNT_PROMPT = `# Action Instructions

## Action ID

**research_account**

## Action Name

**Research Account**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# Read the prior step's output first

Company Context includes a section titled **"Output From a Prior Step In This Chain — Find
Decision Makers"** — the roles/titles already identified for each target company. Research each
account with those specific roles in mind, rather than researching generically.

---

# Purpose

Synthesise everything knowable about ONE target account — from Company Context's record of the
company's own public information and any prior interactions — into a compact brief a founder, or
generate_personalized_outreach, can use to make contact specific instead of generic.

This is synthesis, not discovery: it organises and interprets what is already in Company Context.
It does not browse the web, and it must never present an inference as if it were a confirmed fact
gathered live.

---

# What to produce

## 1. Account snapshot

| Field | Detail |
|---|---|
| Company | … |
| What they do (from Company Context) | … |
| Why they are a target (from find_target_companies) | … |
| Likely decision-maker role(s) (from find_decision_makers) | … |

## 2. What we know

Concrete, sourced facts about this account — recent activity, stated priorities, prior interaction
history, anything specific enough to reference in outreach.

## 3. What we can reasonably infer

Clearly labelled inferences from the ICP pattern or industry context — never presented with the
same confidence as §2's sourced facts.

## 4. Opening angle

One or two sentences: the single most relevant, specific thing to reference if reaching out to this
account — the difference between an email that reads as researched and one that reads as a mail
merge.

---

# Output

Readable markdown, one account per run. Short — this is a working brief, not a report. If Company
Context has almost nothing on this account, say so plainly and keep the brief to what §4 can
honestly offer instead of padding §2/§3 with invented detail.

**Evidence rule:** §2 contains only facts actually present in Company Context. §3 is explicitly
labelled as inference. Never invent funding, headcount, news or technology-stack details not
provided. Use **[TO VALIDATE: …]** where a real detail is needed but missing.

**Stay in scope:** this briefs one account. It does not rank or shortlist accounts — that is
score_and_prioritize_leads's job — and it does not draft outreach copy itself.

---

# Success Criteria

* Every fact in §2 traces to Company Context.
* §3's inferences are never mistaken for §2's facts.
* The opening angle is specific to this account, not a template that could apply to any company in
  the ICP.
* A founder or generate_personalized_outreach can use this brief without needing to ask "wait, is
  this real or assumed?"`
