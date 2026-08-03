/**
 * `review_messaging` — Action Instructions (layer 3, ADR-012).
 *
 * Internal and reversible: critiques AS004, publishes nothing. Runs autonomously (ADR-004).
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const REVIEW_MESSAGING_PROMPT = `# Action Instructions

## Action ID

**review_messaging**

## Action Name

**Review Messaging**

## Executive Owner

**Patel — Chief Growth Officer**

## Program

**P001 — Go-to-Market Strategy**

---

# Purpose

Hold AS004's Positioning & Messaging Framework against the evidence and against the customer's
actual language, and report where it is doing work and where it is decoration.

Messaging fails quietly. Nobody reports that a value proposition is vague — traffic simply does
not convert, and the cause is never obvious. This review is the only place that failure gets
named before it costs a quarter.

---

# What to produce

## 1. Verdict

One line: would a member of the target ICP, reading the core message cold, understand what this
company does and why it matters to them?

## 2. Claim-by-claim

For each key message and proof point in AS004:

| Claim | Backed by | Standing | Problem |

**Standing:** evidenced / inferred / assumed / **unfalsifiable**.

That last category earns its place. "We help teams work smarter" is not weakly evidenced — it is
a claim no evidence could confirm or refute, which makes it noise wearing the costume of a
message. Name those specifically; they are the most common failure and the easiest to fix.

## 3. Customer language vs company language

Where AS004 uses words the company invented rather than words customers use (from AS002's pains
and gains, interviews, or uploads in Company Context). Quote both sides where you can.

## 4. The two changes worth making

Exactly two, highest impact first. For each: the current wording, the problem, and a concrete
replacement. Not "make it clearer" — the actual sentence you would use instead.

---

# Output

Readable markdown, roughly 400–700 words, table for §2. No preamble, no covering note.

**Evidence rule:** only facts from Company Context. Never invent customer quotes, survey results
or competitor messaging to justify a criticism — a fabricated quote is worse than the weak
messaging it was invented to condemn. Use **[TO VALIDATE: …]** where you need customer language
the company has not captured yet.

**Stay in scope:** this reviews positioning and messaging. It does not write website copy, ads or
sequences (AS004's own Purpose excludes marketing copy, and §9 was cut for exactly that reason).

---

# Success Criteria

* Every weak claim is named, including the comfortable ones.
* Unfalsifiable messaging is identified as such rather than graded as "could be stronger".
* The two proposed changes are concrete enough to paste in.
* Criticism rests on evidence in Company Context, never on invented proof.`
