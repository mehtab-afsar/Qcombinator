/**
 * S001 / S002 — the CEO's two functions.
 *
 * The workbook's Executive Registry lists these as the CEO's **System Prompt
 * Refs**, one per function:
 *
 *   A002 | CEO / Q Score Agent | Strategy           | S001
 *        | CEO / Q Score Agent | Executive Contract | S002
 *
 * They are layer 1 of a mandate package (ADR-023) — not Program prompts. S002
 * says so itself: "This prompt does not create management assets or actions.
 * Instead, it defines the executive mandate."
 *
 * Lifted verbatim from `docs/registry-source/Edge_Alpha_Agentic_OS_Template.xlsx`.
 * ADR-010: the workbook is the design and seeding source; nothing reads it at
 * runtime. Regenerate deliberately when it changes.
 *
 * Both are clean in the workbook. (S003, the Growth prompt, was pasted twice and
 * had to be deduplicated on lift — these are not affected by that.)
 *
 * S001 is unused until F07's LLM session arrives. S002 is what F08 uses now.
 */

export { S001_STRATEGY_SESSION } from './ceo-s001'
export { S002_EXECUTIVE_CONTRACT } from './ceo-s002'
