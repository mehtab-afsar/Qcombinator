/**
 * F07 "The Unveiling" — survives a tab reload/remount mid-review of "The direction," so a
 * founder who switches tabs partway through doesn't come back to a flow that restarted from
 * scratch. Same pattern as CommandView.tsx's firstLandingOnThisContract: storage, not a DB
 * write, wrapped in try/catch so a disabled/private-mode browser never crashes the page over
 * what's purely a convenience.
 *
 * sessionStorage, not localStorage, on purpose: the Unveiling is explicitly "one continuous
 * descent," not a multi-day draft — a genuinely new browser session should regenerate a fresh
 * proposal rather than resurrect a possibly-stale one days later. sessionStorage's own lifetime
 * gives that for free.
 *
 * Deliberately not scoped per founder id — see the plan this shipped under for why (a narrow,
 * low-harm shared-device edge case, not worth a synchronous-auth timing race to close).
 */

import type { StreamedProposal } from '../hooks/useStreamedProposal'

const KEY = 'unveiling-draft'

export function loadUnveilingDraft(): StreamedProposal | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { candidate?: StreamedProposal }
    return parsed?.candidate ?? null
  } catch {
    return null
  }
}

export function saveUnveilingDraft(candidate: StreamedProposal): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ candidate }))
  } catch {
    /* disabled/private storage — this was only ever a convenience */
  }
}

export function clearUnveilingDraft(): void {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}
