/**
 * Registry names for founder-facing display, degrading to the raw id rather than throwing on an
 * unknown asset/action — a Registry change must never 500 a view holding a stale id (same
 * reasoning as `programOrNull` in lib/rhythm/progress.ts). Single source (CLAUDE.md "one of
 * each") — was two private copies (lib/rhythm/progress.ts) before lib/activity/log.ts needed
 * the same lookup.
 */

import { getAsset, getAction } from '@/lib/registry'

export function assetLabel(assetId: string): string {
  try {
    return getAsset(assetId).name
  } catch {
    return assetId
  }
}

export function actionLabel(actionId: string): string {
  try {
    return getAction(actionId).name
  } catch {
    return actionId
  }
}
