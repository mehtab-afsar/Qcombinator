/**
 * What every Composer entry point shares.
 *
 * Kept deliberately tiny. The three entry points (execution, mandate, briefing) assemble
 * different layer sets on purpose — see ADR-023 — so the shared surface is formatting, not
 * assembly. Resist growing a "generic package builder" here: the layer sets differ because the
 * DOMAIN differs, and collapsing them would hide that.
 */

/** Separates layers in the rendered package. Every entry point joins with exactly this. */
export const SEPARATOR = '\n\n---\n\n'
