/**
 * F08b — generate an Executive Contract by actually running S002.
 *
 * ⚠️ THE FIRST LLM CALL IN THE NEW MODEL. Everything before this was
 * deterministic. Three consequences worth stating rather than discovering:
 *
 *  1. It costs money and takes seconds. `createDraft` is no longer free.
 *  2. It can return nonsense. Everything it produces is validated against the
 *     Registry before it reaches the database — the model proposes, the Registry
 *     disposes.
 *  3. It can fail. A draft must still be possible when Anthropic is down, so the
 *     deterministic builder stays as a fallback rather than being deleted.
 *
 * Model access goes through lib/llm/router.ts. Never hardcode a model
 * (CLAUDE.md §2).
 */

import { routedText } from '@/lib/llm/router'
import { composeMandatePrompt, type CompanyContext } from '@/lib/prompts/compose'
import { getProgram, listPrograms, ProgramNotFoundError, type ExecutiveId, type ProgramId } from '@/lib/registry'
import { log } from '@/lib/logger'
import type { ContractDraft } from './contract'

/** Executives a generated mandate may name. Mirrors PRD §7.1's roster. */
const EXECUTIVE_IDS: readonly string[] = ['ceo', 'growth', 'product', 'operations', 'finance']

// Was 60s — a live Stage-1 verification run (F07 spine) measured a real S002 generation at
// ~77s under normal conditions, well past the old ceiling. That's not a stall; it's what this
// call actually takes. The old value meant S002 was silently falling back to a non-AI,
// deterministic draft on completely ordinary runs, with nothing telling the founder it had
// happened — the mandate they saw wasn't the one the model wrote. Raised to match the ceiling
// already used for S001's streamed generation (STREAM_TIMEOUT_MS in
// app/api/strategy/propose/route.ts) so both halves of "the mandate hardens" beat are held to
// the same real-world bar.
const TIMEOUT_MS = 150_000

export class MandateGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MandateGenerationError'
  }
}

export interface GeneratedMandate extends ContractDraft {
  /** S002's full document — the founder-facing record (F08b). */
  document: string
}

/**
 * Pull the fenced JSON tail out of the response, and keep the document.
 *
 * The model is asked to end with exactly one fenced block. Matching the LAST one
 * matters: S002's own prompt contains a fenced block (its Output Structure
 * diagram), and the model may echo it. The tail is what we asked for last.
 */
export function splitDocumentAndJson(raw: string): { document: string; json: unknown } {
  const fences = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
  if (fences.length === 0) {
    throw new MandateGenerationError('The mandate came back without its machine-readable summary.')
  }

  const last = fences[fences.length - 1]
  const document = raw.slice(0, last.index).trim()

  try {
    return { document, json: JSON.parse(last[1].trim()) }
  } catch {
    throw new MandateGenerationError('The mandate summary was not valid JSON.')
  }
}

const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []

/**
 * Validate what the model proposed against the Registry.
 *
 * ⚠️ THE MODEL PROPOSES, THE REGISTRY DISPOSES. An LLM will happily invent
 * 'P042 — Customer Delight'. If that reached the database, the Rhythm would try
 * to run a Program that does not exist — at 3am, for one founder, weeks later.
 * Nothing generated is trusted; everything is checked.
 */
function validateGenerated(json: unknown): ContractDraft {
  if (typeof json !== 'object' || json === null) {
    throw new MandateGenerationError('The mandate summary was not an object.')
  }
  const raw = json as Record<string, unknown>

  const priorities = asStrings(raw.priorities)
  const successMetrics = asStrings(raw.successMetrics)
  const activePrograms = asStrings(raw.activePrograms)

  if (priorities.length === 0) {
    throw new MandateGenerationError('The mandate named no priorities.')
  }
  if (successMetrics.length === 0) {
    throw new MandateGenerationError('The mandate named no success metrics.')
  }
  if (activePrograms.length === 0) {
    // A mandate that activates nothing is not a mandate.
    throw new MandateGenerationError('The mandate activated no programs.')
  }

  for (const id of activePrograms) {
    try {
      getProgram(id)
    } catch (err) {
      if (err instanceof ProgramNotFoundError) {
        throw new MandateGenerationError(
          `The mandate tried to activate '${id}', which is not a real program.`,
        )
      }
      throw err
    }
  }

  const responsibilities = Array.isArray(raw.responsibilities)
    ? raw.responsibilities
        .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
        .map(r => ({ executive: String(r.executive ?? ''), mandate: String(r.mandate ?? '') }))
        .filter(r => EXECUTIVE_IDS.includes(r.executive) && r.mandate.length > 0)
    : []

  if (responsibilities.length === 0) {
    throw new MandateGenerationError('The mandate assigned responsibility to no executive.')
  }

  return {
    priorities,
    successMetrics,
    responsibilities: responsibilities as Array<{ executive: ExecutiveId; mandate: string }>,
    activePrograms: activePrograms as ProgramId[],
  }
}

/**
 * Tell the model which Programs actually exist.
 *
 * Without this it is guessing at what it may activate, and the JSON tail's rule
 * ("only IDs that appear in Company Context") has nothing to point at. Only
 * seeded Programs are listed — the Registry is the source of truth (ADR-010).
 */
function programCatalogue(): string {
  return listPrograms()
    .map(p => `- ${p.id} (${p.handle}) — ${p.name}. Owner: ${p.owner}. ${p.objective}`)
    .join('\n')
}

/**
 * Run S002 and return a validated mandate.
 *
 * @throws MandateGenerationError — the caller decides whether to fall back.
 */
export async function generateMandate(context: CompanyContext): Promise<GeneratedMandate> {
  const pkg = composeMandatePrompt({
    kind: 'contract',
    structuredTail: 'contract',
    context: {
      ...context,
      newInformation: [
        context.newInformation,
        '## Programs available to activate',
        '',
        programCatalogue(),
      ].filter(Boolean).join('\n\n'),
    },
  })

  let raw: string
  // The timer MUST be cleared. Promise.race abandons the loser, it does not
  // cancel it: an uncleared 60s timer keeps the event loop alive after the call
  // returns — which on serverless keeps the whole lambda alive. Jest catches this
  // as "did not exit one second after the test run".
  //
  // NOTE: lib/profile-builder/reconciliation-engine.ts:140 has the same leak.
  // Out of scope here; worth fixing when that file is next touched.
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    raw = await Promise.race([
      routedText('reasoning', [{ role: 'user', content: pkg.text }], { maxTokens: 4_000, temperature: 0.2 }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    // The LLM layer has no failover (Anthropic-only, an accepted risk). Surface
    // it so the caller can fall back rather than leaving the founder stuck.
    log.warn('S002 generation failed', { executionId: pkg.executionId, err: (err as Error)?.message })
    throw new MandateGenerationError('Could not draft your mandate right now.')
  } finally {
    clearTimeout(timer)
  }

  const { document, json } = splitDocumentAndJson(raw)
  const draft = validateGenerated(json)

  log.info('S002 generated a mandate', {
    executionId: pkg.executionId,
    programs: draft.activePrograms,
    documentChars: document.length,
  })

  return { ...draft, document }
}

// ─── F07b — generate a Strategy proposal by actually running S001 ────────────
//
// The founder's own complaint, verbatim: a blank mission/priorities/goals form asks
// them to do the executive team's job before the team exists. S001's prompt is
// already written (lib/prompts/knowledge/ceo-s001.ts) and the Composer already has
// an entry point for it (MANDATE_PROMPT_REF.strategy = 'S001') — nothing called it
// with kind: 'strategy' until this function. Same shape as generateMandate: one
// call, validated before it reaches the founder, a document plus the structured
// fields the founder can then edit and save via the EXISTING /api/strategy POST.
//
// Unlike a Contract, there is no deterministic fallback here — a "deterministic
// strategy" isn't a coherent idea the way a deterministic Contract (built from the
// founder's own already-submitted Strategy) is. If this fails, the caller falls
// back to the plain editable form that always existed — no founder is ever fully
// blocked from setting their direction.

export interface GeneratedStrategy {
  /** The unveiling's Layer 1 text — 2-4 sentences, written and streamed BEFORE the
   *  full document (see STRATEGY_READ_DELIMITER in lib/prompts/composer/mandate.ts). */
  read: string
  mission: string
  priorities: string[]
  goals: string[]
  /** S001's full document — the founder-facing read (F07). */
  document: string
}

export function validateGeneratedStrategy(json: unknown): Omit<GeneratedStrategy, 'document'> {
  if (typeof json !== 'object' || json === null) {
    throw new MandateGenerationError('The session summary was not an object.')
  }
  const raw = json as Record<string, unknown>

  const read = typeof raw.read === 'string' ? raw.read.trim() : ''
  const mission = typeof raw.mission === 'string' ? raw.mission.trim() : ''
  const priorities = asStrings(raw.priorities)
  const goals = asStrings(raw.goals)

  if (!read) {
    throw new MandateGenerationError('The session did not produce a read of your Q-Score.')
  }
  if (!mission) {
    throw new MandateGenerationError('The session did not produce a direction.')
  }
  if (priorities.length === 0) {
    throw new MandateGenerationError('The session named no priorities.')
  }

  return { read, mission, priorities, goals }
}

/**
 * Run S001 and return a validated strategy proposal.
 *
 * @param reshape "Nudge this" — a short revision instead of a fresh session. See
 *   ComposeMandateInput.reshape for why this is cheaper and stays in Morgan's voice.
 * @throws MandateGenerationError — the caller falls back to a blank form.
 */
export async function generateStrategyProposal(
  context: CompanyContext,
  reshape?: { previous: { mission: string; priorities: string[]; goals: string[] }; note: string },
): Promise<GeneratedStrategy> {
  const pkg = composeMandatePrompt({ kind: 'strategy', structuredTail: 'strategy', context, reshape })

  let raw: string
  // Same leak-avoidance as generateMandate above — the timer MUST be cleared.
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    raw = await Promise.race([
      // A reshape only needs a short revision, not the six-step document — cheaper
      // and faster with a lower cap, matching the "one tap, one short sentence" bar.
      routedText('reasoning', [{ role: 'user', content: pkg.text }], {
        maxTokens: reshape ? 1_200 : 6_000,
        temperature: 0.2,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    log.warn('S001 generation failed', { executionId: pkg.executionId, err: (err as Error)?.message })
    throw new MandateGenerationError('Could not draft your direction right now.')
  } finally {
    clearTimeout(timer)
  }

  const { document, json } = splitDocumentAndJson(raw)
  const fields = validateGeneratedStrategy(json)

  log.info('S001 generated a strategy proposal', {
    executionId: pkg.executionId,
    documentChars: document.length,
    reshaped: Boolean(reshape),
  })

  return { ...fields, document }
}
