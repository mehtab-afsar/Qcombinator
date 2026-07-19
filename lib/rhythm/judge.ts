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
import { routedCall } from '@/lib/llm/router'
import { composePrompt, type CompanyContext } from '@/lib/prompts/compose'
import { getAsset, type AssetId, type ExecutiveId, type ProgramId } from '@/lib/registry'
import { persistAssetVersion, type AssetVersion } from '@/lib/assets/versioning'
import { log } from '@/lib/logger'
import type { ProgramInstance } from '@/lib/mandate/contract'

// Asset generation sends a large package (the program prompt alone is ~1,000 lines) and asks
// for up to 3,000 tokens back — legitimately 60-120s. The first real-AI trial proved 60s
// times out every call. Sized for the workload, not for optimism.
const TIMEOUT_MS = 180_000

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

/**
 * B3 — the saved Asset must be the artefact, not the chat.
 *
 * Models sometimes wrap the document in a code fence, or lead with prose ("Here's your
 * updated ICP: …"). Both would otherwise be persisted verbatim as the authoritative Asset.
 * Sanitise conservatively: unwrap a fence that encloses the WHOLE document, then drop a
 * short conversational lead-in when the document proper (a markdown heading) follows.
 * Over-stripping is worse than a stray line, so anything ambiguous is left alone.
 */
function sanitiseMarkdown(raw: string): string {
  let text = raw.trim()

  // 1. Drop a short chatty preamble before the document proper (which starts at a markdown
  //    heading or a code fence). Handles "Here's your updated ICP:\n\n# ICP …" and the same
  //    in front of a fenced document.
  const docStart = text.search(/^(#{1,6}\s|```)/m)
  if (docStart > 0) {
    const lead = text.slice(0, docStart).trim()
    const chatty =
      /^(here('s| is| are)?|below( is)?|i('ve| have)|sure|certainly|of course|as requested|this is|updated)/i.test(lead)
      || /:$/.test(lead)
    if (lead.length <= 300 && chatty) text = text.slice(docStart).trim()
  }

  // 2. Unwrap a fence that encloses the entire remaining document.
  const fence = text.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n?```$/)
  if (fence) text = fence[1].trim()

  return text
}

/** An Asset's content is the whole output: sanitised markdown, or the JSON it emitted. */
function parseAssetContent(raw: string, schema: 'markdown' | 'json'): unknown {
  if (schema === 'markdown') {
    const text = sanitiseMarkdown(raw)
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
    const response = await Promise.race([
      // 6k is a BACKSTOP — the Composer's length rule (~1,500-2,000 words) is what shapes
      // the document. Trial run 2: a 3k cap truncated all five assets mid-sentence.
      routedCall({
        taskClass: 'reasoning',
        messages: [{ role: 'user', content: text }],
        overrides: { maxTokens: 6_000, temperature: 0.3 },
      }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS) }),
    ])
    // A truncated document must NEVER be persisted as an authoritative asset version. The
    // stage fails loudly instead (B4), and B5's retry makes the week recoverable.
    if (response.stopReason === 'max_tokens') {
      throw new JudgementError('the model hit the token cap — the asset would be truncated')
    }
    return response.text
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
    // Truncation is NOT transient — the same prompt hits the same cap. Retrying it just
    // doubles the spend on a doomed call (run 3 proved it). Fail immediately; only
    // technical faults (timeout, network) earn the one retry (UC-10 step 5).
    if (first instanceof JudgementError) {
      throw new JudgementError(`Judgement failed for ${args.assetId}: ${first.message}`)
    }
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
