/**
 * `find_decision_makers` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: produces ROLE/TITLE guidance only — never real
 * people, names or email addresses. There is no people-search connector in
 * this system; this Action must never imply there is one. Runs
 * autonomously (ADR-004).
 */
export const FIND_DECISION_MAKERS_PROMPT = `# Action Instructions

## Action ID

**find_decision_makers**

## Action Name

**Find Decision Makers**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P005 — Customer Acquisition**

---

# Read the prior step's output first

Company Context includes a section titled **"Output From a Prior Step In This Chain — Find Target
Companies"** — that is the actual shortlist to work from. Use it as the source of target companies,
not a fresh list you generate yourself.

---

# ⚠️ Roles and titles only — never real people

This system has no people-search or contact-enrichment connector. This Action produces
**role/title guidance** — e.g. "VP of Engineering", "Head of Product", "Director of Revenue
Operations" — for who to reach at a target company. It never outputs a named individual, a scraped
personal contact, or an email address. If Company Context happens to contain a real named contact
already, note that separately as "known contact," but do not present role guidance as if it were a
verified person — those are different kinds of output and must not be blurred together.

---

# Purpose

For the companies identified by find_target_companies, name the likely decision-maker roles worth
reaching — using AS001's Decision-Making Unit (§6, the authoritative DMU for this company) as the
starting framework, applied to each target company's likely org structure.

---

# What to produce

## 1. DMU roles applied

Restate, briefly, which AS001 DMU roles (Economic Buyer, Technical Buyer, Champion, End User,
Procurement, Executive Sponsor, Influencer, Gatekeeper) are realistically reachable for a company of
this size/type — a five-person startup and a 2,000-person enterprise do not have the same buying
committee shape, even against the same ICP.

## 2. Role guidance per target company

| Target company | Likely role/title | DMU function | Why this role, for this company |

## 3. Known contacts (if any)

Only if Company Context already names a real person at a target company. State the name, role and
where it came from. If none exist, say so plainly — this is the expected case for most companies at
this stage, not a gap to paper over.

---

# Output

Readable markdown, one table plus the two framing sections. Scope this to the companies handed off
from find_target_companies — do not invent additional target companies here.

**Evidence rule:** role/title guidance is a reasonable inference from AS001's DMU and company
size/type — label it as guidance, never as a confirmed hire. Never fabricate a name or an email
address under any circumstance.

**Stay in scope:** this names roles to reach, not people to contact yet — turning a role into an
outreach message is generate_personalized_outreach's job, and it still only ever contacts people
actually named in Company Context.

---

# Success Criteria

* Every role traces back to AS001's DMU, applied sensibly to the company's likely size/structure.
* No output could be mistaken for a real, verified individual unless it explicitly is one, sourced
  from Company Context.
* Known contacts and role guidance are never presented as the same kind of thing.`
