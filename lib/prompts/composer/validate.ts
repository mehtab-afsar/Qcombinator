/**
 * Composer validation — every rule from PRD §7.2, checked against the Registry.
 *
 * Structure, not language. No LLM, no heuristics: either the relationship exists in the
 * Registry or it doesn't. Runs BEFORE any prompt text is fetched, so an invalid package costs
 * nothing.
 */

import {
  getAsset,
  getExecutive,
  getProgram,
  listProgramsForAsset,
} from '@/lib/registry'
import {
  PromptValidationError,
  type ComposeInput,
  type FailedRule,
} from '../types'

function fail(
  executionId: string,
  failedRule: FailedRule,
  conflictingComponent: string,
  affectedEntity: string,
  message: string,
): never {
  throw new PromptValidationError({
    executionId,
    failedRule,
    conflictingComponent,
    affectedEntity,
    message,
  })
}

/**
 * @throws PromptValidationError when the package is invalid — blocked, never sent.
 */
export function validate(input: ComposeInput, executionId: string): void {
  const { executiveId, programId, assetId, actionId, activePrograms } = input

  // Unknown ids throw from the Registry itself (ExecutiveNotFoundError etc).
  getExecutive(executiveId)
  const program = getProgram(programId)

  // THE S004 RULE (PRD §7.2's worked example): "executing P001 with the CTO
  // system prompt S004 is invalid — the Registry defines P001 under the Growth
  // executive (S003)". Ownership is the check; the prompt text never enters into
  // it, which is why this fails before a single character is loaded.
  if (program.owner !== executiveId) {
    fail(
      executionId,
      'executive_does_not_own_program',
      `executive:${executiveId}`,
      `program:${programId}`,
      `Executive '${executiveId}' does not own program '${programId}' — the Registry ` +
        `defines '${programId}' under '${program.owner}'`,
    )
  }

  // Mandate integrity: "the prompt requests no capability outside the Executive
  // Contract". Only checked when the caller supplies the Contract's active set —
  // absence means "not yet knowable", not "allowed".
  if (activePrograms && !activePrograms.includes(programId)) {
    fail(
      executionId,
      'program_not_in_contract',
      `program:${programId}`,
      `contract:[${activePrograms.join(', ')}]`,
      `Program '${programId}' is not active in the current Executive Contract`,
    )
  }

  if (assetId && actionId) {
    fail(
      executionId,
      'asset_and_action_both_requested',
      `asset:${assetId}`,
      `action:${actionId}`,
      'An execution package produces an Asset or performs an Action, never both',
    )
  }

  if (!assetId && !actionId) {
    fail(
      executionId,
      'no_asset_or_action_requested',
      'instructions',
      `program:${programId}`,
      'Layer 3 requires either an assetId or an actionId',
    )
  }

  if (assetId) {
    getAsset(assetId)
    // Owner OR sharedWith — AS004 is owned by P001 and legitimately maintained by
    // P002. Checking `asset.program` alone would block real work (see F05).
    const owners = listProgramsForAsset(assetId)
    if (!owners.includes(programId)) {
      fail(
        executionId,
        'asset_not_in_program',
        `asset:${assetId}`,
        `program:${programId}`,
        `Asset '${assetId}' does not belong to program '${programId}' — the Registry ` +
          `defines it under ${owners.join(', ')}`,
      )
    }
  }

  if (actionId && !program.actions.includes(actionId)) {
    fail(
      executionId,
      'action_not_in_program',
      `action:${actionId}`,
      `program:${programId}`,
      `Action '${actionId}' does not belong to program '${programId}'`,
    )
  }
}
