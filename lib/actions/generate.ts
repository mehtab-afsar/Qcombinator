/**
 * F14 — generate one Action: compose → call the model → parse the payload → decide.
 *
 * **The decision is the point of this module.** An Action that reaches outside the product is
 * never executed here. It is recorded `pending_approval` and stops. Only a reversible, internal
 * Action runs — and in Stage C even that execution is stubbed, so nothing external can happen.
 *
 * The gate reads `ActionDef.irreversible` from the code Registry, which is enforced at import
 * time (`lib/registry/index.ts` refuses to boot if an Action declares a connector without it).
 * The gate does NOT read the model's opinion: the Program Prompt has an `# Autonomous Actions`
 * section whose approval rules contradict ADR-004, and letting a language model decide what
 * needs approval is exactly the failure this design exists to prevent.
 *
 * Mirrors `lib/rhythm/judge.ts` (compose → call → parse → persist) so the two read alike.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getAction, type ActionId, type ProgramId } from '@/lib/registry'
import type { ProgramInstance } from '@/lib/mandate/contract'
import { composePrompt, type CompanyContext } from '@/lib/prompts/compose'
import { routedCall } from '@/lib/llm/router'
import { log } from '@/lib/logger'
import type { ActionPayload } from './payload'
import { recordAttempt, type ActionLogEntry } from './log'

/** One Claude call. Actions produce short payloads, not 2,000-word documents. */
const TIMEOUT_MS = 90_000
const MAX_TOKENS = 3_000

export class ActionGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionGenerationError'
  }
}

export interface GenerateActionArgs {
  founderId: string
  program: ProgramInstance
  actionId: ActionId
  executionId: string
  activePrograms: ProgramId[]
  context: CompanyContext
}

async function callLLM(text: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const response = await Promise.race([
      routedCall({
        taskClass: 'reasoning',
        messages: [{ role: 'user', content: text }],
        overrides: { maxTokens: MAX_TOKENS, temperature: 0.3 },
      }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS) }),
    ])
    // A truncated payload is worse here than in an asset: a cut-off recipient list or a
    // half-written body could still look plausible enough to approve.
    if (response.stopReason === 'max_tokens') {
      throw new ActionGenerationError('the model hit the token cap — the payload would be truncated')
    }
    return response.text
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Pull the fenced JSON payload out of the model's response.
 *
 * Connector actions must emit one; internal actions need not. An internal Action's output is its
 * prose analysis, so a missing block is normal there and an error here would fail work that
 * succeeded.
 */
export function parseActionPayload(raw: string, required: boolean): ActionPayload | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)
  if (!fenced) {
    if (required) throw new ActionGenerationError('the model returned no JSON payload block')
    return null
  }
  try {
    const parsed = JSON.parse(fenced[1].trim()) as ActionPayload
    if (!parsed || typeof parsed !== 'object') throw new Error('not an object')
    return parsed
  } catch {
    throw new ActionGenerationError('the payload block was not valid JSON')
  }
}

/**
 * Every recipient must carry an address. A malformed entry is refused rather than filtered:
 * silently dropping one would send to fewer people than the founder approved, and the count is
 * the thing they check.
 */
function assertRecipientsUsable(payload: ActionPayload): void {
  for (const r of payload.recipients ?? []) {
    if (!r || typeof r.email !== 'string' || !r.email.includes('@')) {
      throw new ActionGenerationError('a recipient is missing a usable email address')
    }
  }
}

/**
 * Generate one Action and record the attempt. Service-role client required.
 *
 * @returns the `action_log` entry — `pending_approval` for anything irreversible, `executed` for
 *          a reversible internal Action.
 * @throws ActionGenerationError on generation/parse failure. The caller records the failed stage;
 *         it never rolls back Actions that already succeeded.
 */
export async function generateAction(
  admin: SupabaseClient,
  args: GenerateActionArgs,
): Promise<ActionLogEntry> {
  const action = getAction(args.actionId)
  // Irreversibility comes from the Registry, resolved BEFORE the model is called, so nothing the
  // model returns can influence whether this needs approval.
  const irreversible = action.irreversible
  const reachesOutside = Boolean(action.connector)

  const pkg = composePrompt({
    executiveId: args.program.owner as Parameters<typeof composePrompt>[0]['executiveId'],
    programId: args.program.templateId,
    actionId: args.actionId,
    activePrograms: args.activePrograms,
    context: args.context,
    executionId: args.executionId,
  })

  let raw: string
  try {
    raw = await callLLM(pkg.text)
  } catch (first) {
    // Truncation is deterministic — the same prompt hits the same cap, so retrying just doubles
    // the spend. Only transient faults earn the one retry (the judge.ts lesson).
    if (first instanceof ActionGenerationError) {
      throw new ActionGenerationError(`Action '${args.actionId}' failed: ${first.message}`)
    }
    log.warn('action generation retrying', { actionId: args.actionId, err: (first as Error)?.message })
    try {
      raw = await callLLM(pkg.text)
    } catch (second) {
      throw new ActionGenerationError(`Action '${args.actionId}' failed: ${(second as Error)?.message}`)
    }
  }

  const payload = parseActionPayload(raw, reachesOutside) ?? { body: raw }
  if (reachesOutside) assertRecipientsUsable(payload)

  // ── THE GATE ────────────────────────────────────────────────────────────────────
  // Irreversible → recorded and STOPPED. No execution path is reachable from here; the founder
  // approves through a separate route, and execution re-checks everything at that point.
  if (irreversible) {
    log.info('action prepared, awaiting approval', {
      actionId: args.actionId, programId: args.program.templateId, provider: action.connector,
    })
    return recordAttempt(admin, {
      founderId: args.founderId,
      actionId: args.actionId,
      irreversible: true,
      status: 'pending_approval',
      programId: args.program.id,
      executionId: args.executionId,
      provider: action.connector ?? null,
      payload,
    })
  }

  // Reversible and internal: no approval, per ADR-002/ADR-004 — gates exist only at the
  // Connector boundary. In Stage C there is no execution to do; the analysis IS the output, and
  // it is recorded as executed because it genuinely completed.
  //
  // `summary` carries the model's actual prose (the same category of content already stored in
  // full for Assets and Briefings — never a recipient/subject/body, which stays redacted by
  // payloadMetadata inside recordAttempt; that rule is untouched, see action-gate.test.ts). Falls
  // back to `raw` because an internal action need not emit a fenced JSON block (parseActionPayload
  // returns null and `payload` becomes `{ body: raw }` above) — but if it did, `payload.body`
  // takes priority as the more deliberately-produced field.
  return recordAttempt(admin, {
    founderId: args.founderId,
    actionId: args.actionId,
    irreversible: false,
    status: 'executed',
    programId: args.program.id,
    executionId: args.executionId,
    payload,
    result: { kind: 'internal_analysis', completed: true, summary: payload.body ?? raw },
  })
}
