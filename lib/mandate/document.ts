/**
 * Splits S002's generated Executive Contract document into sections, and picks the
 * ones worth showing a founder as the "why" behind their mandate — Objectives,
 * Pathway, Risks — rather than just the 4-field JSON summary
 * (priorities/successMetrics/responsibilities/activePrograms) that's all the
 * founder currently sees.
 *
 * Verified live (7 Aug 2026) against 9 real S002 generations: the model never once
 * used a "Step N — Title" prefix (the previous version of this file assumed one and
 * matched zero real headings, silently). It reliably titles its top-level sections
 * close to this prompt's own step names ("Executive Objectives", "Recommended
 * Strategic Pathway", "Executive Risks", lib/prompts/executives/ceo/s002.ts), but
 * varies the heading LEVEL (`#` or `##`) and sometimes prefixes an extra outer
 * heading — so this matches on level (1-2 `#`s) and keyword only, never on exact
 * text or a fixed prefix.
 *
 * Best-effort text matching against a model's free-form output — degrade to `[]`
 * on anything unexpected, never throw. A founder must never see a raw error over
 * a cosmetic reasoning panel, and `document` is already nullable (a deterministic
 * fallback draft has no LLM reasoning to show at all).
 */

export interface DocumentSection {
  heading: string
  body: string
}

// Any top-level heading (1-2 `#`s). Step 8's own restatement ("### Mission", etc.)
// is deliberately `###`+ in the prompt template and so falls beneath this — but the
// model doesn't always honour that depth, which is what CONTRACT_RESTATEMENT_RE
// below is for: a belt-and-suspenders cutoff on heading TEXT, not just depth.
const HEADING_RE = /^#{1,2}\s+(.+)$/gm

export function splitDocumentSections(document: string | null | undefined): DocumentSection[] {
  if (!document || typeof document !== 'string') return []
  try {
    const matches = [...document.matchAll(HEADING_RE)]
    if (matches.length === 0) return []

    const sections: DocumentSection[] = []
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      const start = (match.index ?? 0) + match[0].length
      const end = i + 1 < matches.length ? (matches[i + 1].index ?? document.length) : document.length
      const heading = match[1].trim()
      const body = document.slice(start, end).trim()
      if (heading && body) sections.push({ heading, body })
    }
    return sections
  } catch {
    return []
  }
}

/**
 * Which of the three reasoning sections a heading names, or null for everything else.
 *
 * Ordered, and the order is a decision rather than an accident: a heading matching two keywords
 * ("Objectives and Risks") resolves to the first. Exported because lib/mandate/document-structure.ts
 * needs the same classification to pick a renderer, and two copies of this list would drift.
 */
const REASONING_KINDS = [
  ['objectives', 'objective'],
  ['pathway', 'pathway'],
  ['risks', 'risk'],
] as const

export type ReasoningKind = (typeof REASONING_KINDS)[number][0]

export function classifySection(heading: string): ReasoningKind | null {
  const lower = (heading ?? '').toLowerCase()
  return REASONING_KINDS.find(([, keyword]) => lower.includes(keyword))?.[0] ?? null
}

// Step 8's compact restatement ("# Executive Contract" → Mission/Priorities/Pathway/
// Assets/Metrics/Commitment) is already what the 4 extracted JSON fields summarise.
// Its own "Strategic Pathway" sub-heading would otherwise duplicate Step 3's real
// reasoning with a one-line echo — cut everything from this heading onward first.
const CONTRACT_RESTATEMENT_RE = /^executive contract$/i

/** Objectives, Pathway, Risks — the reasoning behind the mandate, not the mandate itself. */
export function pickReasoningSections(document: string | null | undefined): DocumentSection[] {
  const sections = splitDocumentSections(document)
  const cutoff = sections.findIndex(s => CONTRACT_RESTATEMENT_RE.test(s.heading))
  const candidates = cutoff === -1 ? sections : sections.slice(0, cutoff)
  return candidates.filter(s => classifySection(s.heading) !== null)
}
