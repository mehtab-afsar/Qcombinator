import type { Executive } from '../types'

/**
 * CEO / Chief of Staff.
 *
 * Workbook Executive Registry gives this executive **two** rows, one per
 * function:
 *   A002 | CEO / Q Score Agent | Strategy            | S001
 *        | CEO / Q Score Agent | Executive Contract  | S002
 *
 * ⚠️ PRD §7.1 has a single `systemPromptRef`. Set to 'S001'; **S002 is not lost**
 * — it is the Executive-Contract generation prompt, and F08 resolves it when the
 * Contract flow is built. Recorded here so the second ref is not forgotten.
 *
 * **The CEO is not a separate architectural layer (ADR-013).** It owns the
 * S001/S002 prompts, but mandate generation runs through the same Prompt Composer
 * and Execution Engine as every other Program. There is no bespoke CEO pipeline —
 * that would fork the engine, which is exactly what this rewrite removes.
 */
export const CEO: Executive = {
  id: 'ceo',
  name: 'CEO / Chief of Staff',
  motto: 'I turn the score into a mandate.',
  domains: ['Strategy', 'Executive Contract', 'Q-Score interpretation', 'Quarterly Planning'],

  /**
   * Empty by design. S001 (Strategy Session) and S002 (Executive Contract) are
   * the mandate flow — features F07 and F08 — not Programs the Rhythm executes.
   * The CEO's own Programs (Quarterly Planning et al.) come later; Starthere §5 is
   * explicit that the CEO stays minimal until one arm works end to end.
   */
  programs: [],

  /** S001 = Strategy Session. S002 (Executive Contract) is F08's — see above. */
  systemPromptRef: 'S001',

  inheritsFrom: ['sage'],
}
