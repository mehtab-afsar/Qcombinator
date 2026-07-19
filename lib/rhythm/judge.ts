/**
 * F10 — judgement: generate one Asset's content for a Program run.
 *
 * This is the piece F11 deferred ("the LLM generation of Asset content is F10's job"). It
 * mirrors lib/mandate/generate.ts and lib/briefings/generate.ts: compose the Program's Asset
 * package via F06 → run the LLM (with a timeout, and one retry on a transient failure) → parse
 * per the Asset's outputSchema → persist a new version (authored_by='program').
 *
 * Mandate integrity is enforced BY THE COMPOSER: passing the contract's activePrograms makes
 * composePrompt reject a Program not in the contract, and the Registry rejects an Asset that
 * doesn't belong to the Program. Nothing here calls the score signal (ADR-005).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { routedText } from '@/lib/llm/router'
import { composePrompt, type CompanyContext } from '@/lib/prompts/compose'
import { getAsset, type AssetId, type ExecutiveId, type ProgramId } from '@/lib/registry'
import { persistAssetVersion, type AssetVersion } from '@/lib/assets/versioning'
import { log } from '@/lib/logger'
import type { ProgramInstance } from '@/lib/mandate/contract'

const TIMEOUT_MS = 60_000

export class JudgementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'JudgementError'
  }
}

export interface JudgeArgs {
  founderId: string
  program: ProgramInstance
  assetId: AssetId
  executionId: string
  contractId: string | null
  activePrograms: ProgramId[]
  context: CompanyContext
}

/** An Asset's content is the whole output: raw markdown, or the JSON it emitted. */
function parseAssetContent(raw: string, schema: 'markdown' | 'json'): unknown {
  if (schema === 'markdown') {
    const text = raw.trim()
    if (!text) throw new JudgementError('the model returned an empty asset')
    return text
  }
  const fences = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
  const body = (fences.length ? fences[fences.length - 1][1] : raw).trim()
  try {
    return JSON.parse(body)
  } catch {
    throw new JudgementError('the model returned an asset that was not valid JSON')
  }
}

async function callLLM(text: string): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      routedText('reasoning', [{ role: 'user', content: text }], { maxTokens: 3_000, temperature: 0.3 }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS) }),
    ])
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Generate and persist a new version of one Asset. Service-role client required.
 *
 * @throws JudgementError on generation/parse failure (after one retry). The caller records the
 *         failed stage and blocks the dependent Briefing — it never rolls back other Assets.
 */
export async function generateAssetContent(
  admin: SupabaseClient,
  args: JudgeArgs,
): Promise<AssetVersion> {
  const asset = getAsset(args.assetId)

  const pkg = composePrompt({
    executiveId: args.program.owner as ExecutiveId,
    programId: args.program.templateId,
    assetId: args.assetId,
    activePrograms: args.activePrograms, // Composer enforces mandate integrity
    context: args.context,
    executionId: args.executionId,
  })

  let raw: string
  try {
    raw = await callLLM(pkg.text)
  } catch (first) {
    // Retry once — "retry technical operations within limits" (UC-10 step 5).
    log.warn('asset judgement retrying', { assetId: args.assetId, err: (first as Error)?.message })
    try {
      raw = await callLLM(pkg.text)
    } catch (second) {
      throw new JudgementError(`Judgement failed for ${args.assetId}: ${(second as Error)?.message}`)
    }
  }

  const content = parseAssetContent(raw, asset.outputSchema)

  return persistAssetVersion(admin, {
    founderId: args.founderId,
    assetId: args.assetId,
    authoredBy: 'program',
    content,
    programTemplateId: args.program.templateId,
    programId: args.program.id,
    executionId: args.executionId,
    updateReason: 'Operating Rhythm cycle',
  })
}

export { parseAssetContent }
