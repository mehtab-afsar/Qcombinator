/**
 * F12 — generate a briefing by running the program's briefing structure through F06.
 *
 * Mirrors lib/mandate/generate.ts (the mandate's LLM path): compose via the Composer →
 * routedText with a timeout → parse a document + a fenced JSON tail → persist. The model
 * writes the narrative; the DATABASE supplies the authoritative Asset links.
 *
 * Called by the rhythm (F10), once per contract-active Program per cycle. Nothing here calls
 * the score signal (ADR-005). Model access is via lib/llm/router — never a hardcoded model.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { routedText } from '@/lib/llm/router'
import { composeBriefingPrompt, type CompanyContext } from '@/lib/prompts/compose'
import { getAsset, getProgram, type AssetId, type ProgramId } from '@/lib/registry'
import { getCurrentAsset, getAssetVersionsForExecution } from '@/lib/assets/versioning'
import { persistBriefing, type Briefing } from './briefings'
import { log } from '@/lib/logger'

// Briefing generation reads all current assets in-context; 60s proved too tight in the first
// real-AI trial (same finding as the asset judge). Sized for the workload.
const TIMEOUT_MS = 120_000

export class BriefingGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BriefingGenerationError'
  }
}

export interface GenerateBriefingArgs {
  founderId: string
  /**
   * The Registry ProgramId (e.g. 'P001') — used for the Registry lookup and the Composer.
   * Deliberately NOT called `programId`: that name previously got confused with the DB row
   * UUID and made every briefing throw (B1). Keep the two ids named apart.
   */
  templateId: ProgramId
  /** The `programs` table row UUID — written to the `program_id` column. */
  programRowId: string
  /** The rhythm run producing this briefing. */
  executionId: string
  contractId?: string | null
  /** Base company context (companyName, strategy, contract, qScore, newInformation). */
  context: CompanyContext
}

interface ParsedBriefing {
  verdict: string
  summary: string
  sections: Array<{ heading: string; detail: string }>
}

/** Pull the fenced JSON tail out of the response and validate the verdict (F08b's pattern). */
function parseBriefing(raw: string): ParsedBriefing {
  const fences = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)```/g)]
  if (fences.length === 0) {
    throw new BriefingGenerationError('The briefing came back without its machine-readable summary.')
  }
  let json: unknown
  try {
    json = JSON.parse(fences[fences.length - 1][1].trim())
  } catch {
    throw new BriefingGenerationError('The briefing summary was not valid JSON.')
  }
  if (typeof json !== 'object' || json === null) {
    throw new BriefingGenerationError('The briefing summary was not an object.')
  }
  const obj = json as Record<string, unknown>

  const verdict = typeof obj.verdict === 'string' ? obj.verdict.trim() : ''
  if (!verdict) throw new BriefingGenerationError('The briefing had no verdict.')

  const summary = typeof obj.summary === 'string' ? obj.summary.trim() : ''
  const sections = Array.isArray(obj.sections)
    ? obj.sections
        .filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null)
        .map(s => ({ heading: String(s.heading ?? ''), detail: String(s.detail ?? '') }))
        .filter(s => s.heading && s.detail)
    : []

  return { verdict, summary, sections }
}

const assetContentToString = (content: unknown): string =>
  typeof content === 'string' ? content : JSON.stringify(content)

const safeAssetName = (assetId: string): string => {
  try { return getAsset(assetId).name } catch { return assetId }
}

/**
 * Generate and persist a briefing for one Program run.
 *
 * MUST be given a service-role client — briefings are written server-side (the table is
 * read-only for authenticated). The caller must have verified `args.founderId` owns the program.
 *
 * @throws BriefingGenerationError on LLM/timeout/parse failure — and writes NO briefing, so the
 *         run's Asset versions (committed earlier by F11) stay intact. F10 records the failed
 *         stage on the run; the briefing table has no "failed" row.
 */
export async function generateBriefing(
  admin: SupabaseClient,
  args: GenerateBriefingArgs,
): Promise<Briefing> {
  const program = getProgram(args.templateId) // Registry lookup — needs 'P001', not a UUID
  const executiveId = program.owner

  // What changed this run — the authoritative set F11 wrote.
  const changed = await getAssetVersionsForExecution(admin, args.founderId, args.executionId)

  // Edge case: no material change → a short, deterministic briefing. Never silence, no LLM call.
  if (changed.length === 0) {
    return persistBriefing(admin, {
      founderId: args.founderId,
      programId: args.programRowId, // the DB column takes the UUID
      executionId: args.executionId,
      contractId: args.contractId,
      executiveId,
      verdict: 'No material change this cycle.',
      body: { summary: 'Nothing needed updating this cycle — your assets are current.', sections: [], changedAssets: [] },
    })
  }

  // Gather the program's current Assets for the model to reason from.
  const currentAssets: Partial<Record<AssetId, string>> = {}
  for (const assetId of program.assets) {
    const version = await getCurrentAsset(admin, args.founderId, assetId)
    if (version) currentAssets[assetId] = assetContentToString(version.content)
  }

  const pkg = composeBriefingPrompt({
    programId: args.templateId, // the Composer takes the Registry id
    executionId: args.executionId,
    context: { ...args.context, currentAssets },
    // The DATABASE's list of what this run persisted — the briefing may claim nothing
    // beyond it as delivered (run 4 claimed eight documents that never existed).
    persistedAssets: changed.map(v => ({ id: v.assetId, name: safeAssetName(v.assetId) })),
  })

  let raw: string
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    raw = await Promise.race([
      // 4k, not 2k: the model writes the prose briefing BEFORE the fenced JSON tail, and the
      // first real-AI trial showed 2k gets exhausted mid-prose — the tail never arrives and
      // parsing fails. The cap must cover prose + tail.
      routedText('reasoning', [{ role: 'user', content: pkg.text }], { maxTokens: 4_000, temperature: 0.3 }),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS) }),
    ])
  } catch (err) {
    log.warn('briefing generation failed', { executionId: args.executionId, err: (err as Error)?.message })
    throw new BriefingGenerationError('Could not generate the briefing right now.')
  } finally {
    clearTimeout(timer)
  }

  const parsed = parseBriefing(raw)

  // Asset links come from the DATABASE, not the model — provenance you can trust.
  const changedAssets = changed.map(v => ({ assetId: v.assetId, versionId: v.id, name: safeAssetName(v.assetId) }))

  return persistBriefing(admin, {
    founderId: args.founderId,
    programId: args.programRowId, // the DB column takes the UUID
    executionId: args.executionId,
    contractId: args.contractId,
    executiveId,
    verdict: parsed.verdict,
    body: { summary: parsed.summary, sections: parsed.sections, changedAssets },
  })
}

export { parseBriefing }
