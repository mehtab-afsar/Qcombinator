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
import { routedCall, type UsageContext } from '@/lib/llm/router'
import { log } from '@/lib/logger'
import type { ActionPayload } from './payload'
import { recordAttempt, type ActionLogEntry } from './log'
import { storePayload } from './payload-vault'
import { parseModelLeads, upsertLeads } from '@/lib/entities/leads'

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

async function callLLM(text: string, usageContext?: UsageContext): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    const response = await Promise.race([
      routedCall({
        taskClass: 'reasoning',
        messages: [{ role: 'user', content: text }],
        overrides: { maxTokens: MAX_TOKENS, temperature: 0.3 },
        usageContext,
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
 * Every recipient's email must appear in the Company Context this generation actually saw. The
 * prompt (layer 3 + `ACTION_FORMAT_RULE`'s recipient rule in `composer/execution.ts`) already
 * tells the model this; this is the code-level check that it was followed — ROADMAP_STATUS.md's
 * "largest unmitigated risk in Story 3": a prompt is not a control, and a plausible-looking
 * invented address is exactly what a founder skimming the payload to approve it would miss.
 *
 * All-or-nothing, same as `assertRecipientsAllowed` in `lib/connectors/allowlist.ts`: refusing
 * the whole generation is louder and safer than silently dropping the one bad recipient.
 */
function assertRecipientsInContext(payload: ActionPayload, companyContextText: string): void {
  const contextEmails = new Set(
    (companyContextText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [])
      .map(e => e.toLowerCase()),
  )
  const invented = (payload.recipients ?? [])
    .map(r => r.email.toLowerCase())
    .filter(email => !contextEmails.has(email))
  if (invented.length > 0) {
    throw new ActionGenerationError(
      `${invented.length} recipient(s) do not appear in Company Context — refusing to prepare a payload with an address the founder never gave us`,
    )
  }
}

/**
 * Turn an Action's structured output into real records, when it declares it produces any.
 *
 * ⚠️ THE SPINE (docs/AGI_ACTIONS_PRD.md, slice 1). Every Action already emits its fenced JSON
 * into `payload`; until this existed, the structure was discarded and only `payload.body` prose
 * survived. This is the one place that changes.
 *
 * Never throws. A malformed block writes zero and logs — the Action's analysis genuinely
 * succeeded, and failing here would fail the entire Program stage (lib/rhythm/run.ts). The count
 * is returned so it can land in the Action's own `result`, making "0 leads" visible to the
 * founder instead of silent.
 */
async function writeProducedEntities(
  admin: SupabaseClient,
  action: ReturnType<typeof getAction>,
  payload: ActionPayload,
  args: GenerateActionArgs,
): Promise<number | undefined> {
  if (action.produces !== 'lead') return undefined
  const leads = parseModelLeads(payload)
  if (leads === null) {
    log.warn('action declares produces:lead but emitted no leads block', { actionId: args.actionId })
    return 0
  }
  return upsertLeads(admin, args.founderId, leads, {
    programId: args.program.id,
    executionId: args.executionId,
  })
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

  const usageContext: UsageContext = {
    founderId: args.founderId,
    programId: args.program.id,
    actionId: args.actionId,
    executionId: args.executionId,
  }

  let raw: string
  try {
    raw = await callLLM(pkg.text, usageContext)
  } catch (first) {
    // Truncation is deterministic — the same prompt hits the same cap, so retrying just doubles
    // the spend. Only transient faults earn the one retry (the judge.ts lesson).
    if (first instanceof ActionGenerationError) {
      throw new ActionGenerationError(`Action '${args.actionId}' failed: ${first.message}`)
    }
    log.warn('action generation retrying', { actionId: args.actionId, err: (first as Error)?.message })
    try {
      raw = await callLLM(pkg.text, usageContext)
    } catch (second) {
      throw new ActionGenerationError(`Action '${args.actionId}' failed: ${(second as Error)?.message}`)
    }
  }

  const payload = parseActionPayload(raw, reachesOutside) ?? { body: raw }
  if (reachesOutside) {
    assertRecipientsUsable(payload)
    const companyContextText = pkg.layers.find(l => l.name === 'company_context')!.text
    assertRecipientsInContext(payload, companyContextText)
  }

  // ── THE GATE ────────────────────────────────────────────────────────────────────
  // Irreversible → recorded and STOPPED. No execution path is reachable from here; the founder
  // approves through a separate route, and execution re-checks everything at that point.
  if (irreversible) {
    // The real content (recipients/subject/body) has nowhere else to live — action_log itself
    // only ever stores a hash + redacted metadata, by design (CLAUDE.md §3, no PII in logs).
    // Without this, there would be nothing for the founder to review before approving, and
    // nothing for execution to actually send. See lib/actions/payload-vault.ts.
    const payloadRef = await storePayload(admin, args.founderId, payload)
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
      payloadRef,
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

  // The spine: an Action that declares `produces` turns its structured output into real rows
  // before the attempt is recorded, so the count can be part of the record.
  const entitiesWritten = await writeProducedEntities(admin, action, payload, args)

  return recordAttempt(admin, {
    founderId: args.founderId,
    actionId: args.actionId,
    irreversible: false,
    status: 'executed',
    programId: args.program.id,
    executionId: args.executionId,
    payload,
    result: {
      kind: 'internal_analysis',
      completed: true,
      summary: payload.body ?? raw,
      ...(entitiesWritten !== undefined ? { entitiesWritten } : {}),
    },
  })
}
