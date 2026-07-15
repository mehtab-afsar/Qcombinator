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

const TIMEOUT_MS = 60_000

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
function splitDocumentAndJson(raw: string): { document: string; json: unknown } {
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
