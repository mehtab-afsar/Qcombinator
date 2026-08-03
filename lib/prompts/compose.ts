/**
 * The Prompt Composer — Product 1 (PRD §7.2).
 *
 * ONE Composer assembles every package for every Executive and every Program: resolve Registry
 * entries from ids → validate → assemble layers in a fixed order → emit one structured package.
 * Pure functions. No I/O, no DB, no LLM — Company Context is passed in.
 *
 * This file is the public surface and nothing else. The implementation lives in `./composer/`,
 * split along the seam the architecture already has — **several entry points, not several
 * Composers** (ADR-023):
 *
 *   composer/execution.ts       entry 1 · four layers · an Asset or an Action
 *   composer/mandate.ts         entry 2 · two layers  · S001 Strategy / S002 Contract
 *   composer/briefing.ts        entry 3 · three layers · the cycle's Briefing (F12)
 *   composer/company-context.ts layer 4 · shared by all three; founder data, fenced
 *   composer/validate.ts        PRD §7.2's rules, checked against the Registry
 *   composer/shared.ts          the layer separator
 *
 * Each entry point keeps its own preamble and output contract beside it, because those texts
 * are the hard-won part — every rule in them was written after a real trial produced something
 * wrong (letter-shaped assets, truncated documents, invented customers, phantom deliverables).
 * Read one file and you get that entry point's whole story.
 *
 * Importers are unaffected by the split: `@/lib/prompts/compose` still exports exactly what it
 * always did.
 *
 * NOTE: `lib/agents/compose-system-prompt.ts` is the OLD 3-part assembler. It is frozen and
 * dies with the old model — do not extend it, do not import it (CLAUDE.md §0.2: one Composer).
 */

import type { ActionId, AssetId, ExecutiveId, ProgramId } from '@/lib/registry'

export { composePrompt } from './composer/execution'
export { composeMandatePrompt, type ComposeMandateInput, type MandateKind } from './composer/mandate'
export { composeBriefingPrompt, type ComposeBriefingInput } from './composer/briefing'
export { renderCompanyContext } from './composer/company-context'

export * from './types'
export { PromptNotFoundError } from './registry'
export type { ActionId, AssetId, ExecutiveId, ProgramId }
