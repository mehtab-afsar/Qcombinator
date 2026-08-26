/**
 * Turns S002's reasoning sections into something renderable as a document rather than as a
 * transcript. A founder was seeing literal `**Why it matters:**` and `---` on screen, because
 * the body was markdown put through `whiteSpace: 'pre-wrap'`.
 *
 * ⚠️ THE GOVERNING CONSTRAINT, and the reason this is written the way it is: the prompt
 * (lib/prompts/executives/ceo/s002.ts) prescribes the SECTION NAMES and nothing whatsoever about
 * a section's internal layout. Every label, every emphasis style, the numbering, and — the part
 * that bites — WHICH sub-fields appear at all are the model's invention, and they vary run to
 * run. One captured generation has objectives carrying only *Why it matters* and *Priority* in
 * single asterisks; a founder's live mandate has all four fields in double asterisks. A layout
 * that reserves a row per field ships blank labels against the first of those.
 *
 * So: parse opportunistically, render only what is actually there, and treat failure to parse as
 * an ORDINARY OUTCOME rather than an error. `kind: 'raw'` is always a valid answer — the caller
 * renders it through the same markdown component every Asset already uses, so a section that
 * doesn't fit a known shape still reads properly. Degradation is per section, never
 * all-or-nothing: a document can have structured objectives and prose pathway at once, and one
 * of the captured fixtures does exactly that.
 *
 * Pure, no React, no IO. Never throws.
 */

import { classifySection, pickReasoningSections, type DocumentSection } from './document'

export type Priority = 'high' | 'medium' | 'low'

/** Canonical labels. The model's own wording is normalised onto these; anything that maps to
 *  none of them is dropped, so a stray `*Note:*` never renders as a mystery row. */
export type FieldLabel = 'Why it matters' | 'Impact' | 'Success'

export interface LabelledField {
  label: FieldLabel
  /** The model's sentence, verbatim minus its label and emphasis. */
  text: string
}

export interface ParsedObjective {
  /** '01', '02' — POSITIONAL. The model's own numbering is absent as often as not, and restarts
   *  when it is present, so it is never trusted as an ordinal. */
  ordinal: string
  title: string
  /** null when nothing recognisable was stated. Never defaulted: inventing "Medium" would put a
   *  commitment in the founder's mandate that the model never made. */
  priority: Priority | null
  /** Only the fields actually present, in canonical order. Routinely fewer than three. */
  fields: LabelledField[]
}

export interface ParsedPathway {
  name: string
  why: string | null
  outcomes: string | null
  alternatives: string | null
}

export interface ParsedRisk {
  kind: 'strategic' | 'execution' | 'assumption'
  /** The model sometimes names a risk inline ("**Strategic Risk: adoption lags**"). Often not. */
  title: string | null
  body: string
}

export type StructuredSection =
  | { kind: 'objectives'; heading: string; objectives: ParsedObjective[] }
  | { kind: 'pathway'; heading: string; pathway: ParsedPathway }
  | { kind: 'risks'; heading: string; risks: ParsedRisk[] }
  | { kind: 'raw'; heading: string; body: string }

// ─── Shared text helpers ────────────────────────────────────────────────────

/** Strips surrounding `**`/`*`/`__`/`_` and a trailing colon, whatever combination is used. */
function stripEmphasis(text: string): string {
  return text
    .replace(/^[\s*_]+/, '')
    .replace(/[\s*_]+$/, '')
    .replace(/\s*:\s*$/, '')
    .trim()
}

/**
 * A `Label: value` line in any of the shapes seen in the wild — `*L:*  v`, `**L:** v`, `**L**: v`,
 * `- **L:** v`, `L: v` — returning the raw label and whatever followed it (possibly empty, since
 * the value often sits on the NEXT line).
 */
const LABEL_RE = /^\s*[-*+]?\s*(?:\*{1,2}|_{1,2})?\s*([A-Za-z][A-Za-z' ]{2,40}?)\s*(?:\*{1,2}|_{1,2})?\s*:\s*(?:\*{1,2}|_{1,2})?\s*(.*)$/

interface RawLabel { label: string; value: string }

function matchLabel(line: string): RawLabel | null {
  const m = LABEL_RE.exec(line)
  if (!m) return null
  return { label: m[1].trim().toLowerCase(), value: stripTrailingEmphasis(m[2]) }
}

/** A value may carry the closing `**` of its own label's emphasis run. */
function stripTrailingEmphasis(text: string): string {
  return text.replace(/[\s*_]+$/, '').trim()
}

/**
 * The model's label → ours. `alternativ`/`not selected` is checked FIRST and deliberately:
 * "Why alternatives were not selected" contains "why", so an order that tested `why` earlier
 * would file the rejected-options paragraph as the rationale for the chosen pathway.
 */
function canonicalField(label: string): FieldLabel | 'priority' | null {
  if (/alternativ|not selected|rejected/.test(label)) return null // pathway-only; never an objective row
  if (/priorit/.test(label)) return 'priority'
  if (/impact|outcome/.test(label)) return 'Impact'
  if (/success|criteri|metric/.test(label)) return 'Success'
  if (/matter|^why/.test(label)) return 'Why it matters'
  return null
}

const FIELD_ORDER: FieldLabel[] = ['Why it matters', 'Impact', 'Success']

/** Longest a parsed objective title may be before it is treated as mis-parsed prose. The real
 *  ones run to a few words; a numbered paragraph splits just as cleanly and yields a sentence. */
const TITLE_MAX = 80

function parsePriority(text: string): Priority | null {
  const m = /\b(high|medium|med|low)\b/i.exec(text)
  if (!m) return null
  const word = m[1].toLowerCase()
  return word === 'med' ? 'medium' : (word as Priority)
}

/**
 * Split a section body into repeating blocks. Tries each detector in turn and takes the first
 * that finds more than one — the shapes are mutually exclusive in practice, and requiring two
 * means a body with no repeating structure falls through to `[]` and then to raw rendering.
 */
function splitBlocks(body: string): string[] {
  const detectors: RegExp[] = [
    /^#{3,4}\s+.+$/gm, // ### 1. Title
    /^\*\*\s*\d+[.)]?\s*.+?\*\*\s*$/gm, // **1. Title**  ← both captured fixtures
    /^\*\*[^*]+\*\*\s*$/gm, // **Title**  (risks, and untitled objectives)
    /^\s*\d+[.)]\s+.+$/gm, // 1. Title
  ]
  for (const re of detectors) {
    const starts = [...body.matchAll(re)].map(m => m.index ?? 0)
    if (starts.length < 2) continue
    return starts.map((start, i) => body.slice(start, starts[i + 1] ?? body.length).trim()).filter(Boolean)
  }
  return []
}

/** A block's first line, cleaned of emphasis, numbering and any trailing inline priority. */
function blockTitle(block: string): string {
  const first = block.split('\n')[0] ?? ''
  return stripEmphasis(first.replace(/^#{1,6}\s*/, ''))
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\s*[-—–]\s*priority\s*:?\s*(high|medium|low)\s*$/i, '')
    .trim()
}

// ─── Objectives ─────────────────────────────────────────────────────────────

export function parseObjectives(body: string): ParsedObjective[] {
  const blocks = splitBlocks(body)
  if (blocks.length < 2) return [] // the prompt asks for 3-5; one "block" means the split missed

  return blocks.map((block, i) => {
    const found = new Map<FieldLabel, string>()
    let priority = parsePriority(block.split('\n')[0] ?? '')
    const lines = block.split('\n').slice(1)

    for (let j = 0; j < lines.length; j++) {
      const matched = matchLabel(lines[j])
      if (!matched) continue
      const canonical = canonicalField(matched.label)
      if (canonical === null) continue
      // The value routinely sits on the following line, the label alone on its own.
      const value = matched.value || stripEmphasis(lines[j + 1] ?? '')
      if (canonical === 'priority') priority = priority ?? parsePriority(value)
      else if (value && !found.has(canonical)) found.set(canonical, value)
    }

    return {
      ordinal: String(i + 1).padStart(2, '0'),
      title: blockTitle(block),
      priority,
      fields: FIELD_ORDER.filter(l => found.has(l)).map(label => ({ label, text: found.get(label)! })),
    }
  })
}

// ─── Pathway ────────────────────────────────────────────────────────────────

export function parsePathway(body: string): ParsedPathway | null {
  const lines = body.split('\n')
  const nameLine = lines.find(l => l.trim() && !matchLabel(l))
  const name = nameLine ? stripEmphasis(nameLine) : ''
  if (!name) return null

  const slots: Record<'why' | 'outcomes' | 'alternatives', string | null> = {
    why: null, outcomes: null, alternatives: null,
  }

  for (let i = 0; i < lines.length; i++) {
    const matched = matchLabel(lines[i])
    if (!matched) continue
    // Same precedence trap as canonicalField, and it matters more here: both real labels
    // begin with "Why".
    const slot = /alternativ|not selected|rejected/.test(matched.label) ? 'alternatives'
      : /outcome|expect|result/.test(matched.label) ? 'outcomes'
        : /why|rationale|because/.test(matched.label) ? 'why'
          : null
    if (!slot || slots[slot]) continue
    const value = matched.value || stripEmphasis(lines[i + 1] ?? '')
    if (value) slots[slot] = value
  }

  return { name, ...slots }
}

// ─── Risks ──────────────────────────────────────────────────────────────────

const RISK_KINDS: ReadonlyArray<[ParsedRisk['kind'], RegExp]> = [
  ['strategic', /strategic/i],
  ['execution', /execution|delivery|operational/i],
  ['assumption', /assumption|assume/i],
]

function riskKind(text: string): ParsedRisk['kind'] | null {
  return RISK_KINDS.find(([, re]) => re.test(text))?.[0] ?? null
}

export function parseRisks(body: string): ParsedRisk[] {
  const blocks = splitBlocks(body)

  if (blocks.length >= 2) {
    // A block whose heading names no kind is dropped rather than guessed at — that is how a
    // trailing "Management should monitor these weekly." paragraph avoids becoming a risk.
    return blocks.flatMap(block => {
      const [first, ...rest] = block.split('\n')
      const kind = riskKind(first)
      if (!kind) return []
      const title = stripEmphasis(first).replace(/^(strategic|execution|operational|critical)\s*\w*\s*:?\s*/i, '').trim()
      const text = rest.join('\n').trim()
      if (!text) return []
      return [{ kind, title: title || null, body: text }]
    })
  }

  // One unstructured paragraph: "Strategic risk: X. Execution risk: Y. Critical assumption: Z."
  // Sentence-level scan, keeping only the sentences that actually name a kind.
  return body.split(/(?<=\.)\s+/).flatMap(sentence => {
    const kind = riskKind(sentence.slice(0, 40))
    const text = sentence.trim()
    return kind && text ? [{ kind, title: null, body: text }] : []
  })
}

// ─── Assembly ───────────────────────────────────────────────────────────────

/** Raw is not a failure — it is the honest answer for a section with no repeating structure. */
function raw(section: DocumentSection): StructuredSection {
  return { kind: 'raw', heading: section.heading, body: section.body }
}

export function structureSection(section: DocumentSection): StructuredSection {
  try {
    switch (classifySection(section.heading)) {
      case 'objectives': {
        const objectives = parseObjectives(section.body)
        // Fewer than two means the block split found no repeating structure (the prompt asks
        // for 3-5). An over-long "title" means it found the wrong one: a numbered line of prose
        // splits cleanly but yields a whole sentence where a name belongs — real titles run to
        // a few words ("Prove Commercial Model", "Define Business Model & Unit Economics").
        // Either way the markdown reads better than the mis-parse.
        if (objectives.length < 2) return raw(section)
        if (objectives.some(o => !o.title || o.title.length > TITLE_MAX)) return raw(section)
        return { kind: 'objectives', heading: section.heading, objectives }
      }
      case 'pathway': {
        const pathway = parsePathway(section.body)
        // A bare name with no reasoning under it reads worse structured than as prose.
        if (!pathway || (!pathway.why && !pathway.outcomes && !pathway.alternatives)) return raw(section)
        return { kind: 'pathway', heading: section.heading, pathway }
      }
      case 'risks': {
        const risks = parseRisks(section.body)
        if (risks.length === 0 || risks.some(r => !r.body)) return raw(section)
        return { kind: 'risks', heading: section.heading, risks }
      }
      default:
        return raw(section)
    }
  } catch {
    return raw(section)
  }
}

/** The one function the UI calls. */
export function structureReasoning(document: string | null | undefined): StructuredSection[] {
  try {
    return pickReasoningSections(document).map(structureSection)
  } catch {
    return []
  }
}
