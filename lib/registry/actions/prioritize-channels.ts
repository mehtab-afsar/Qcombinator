import type { ActionDef } from '../types'

/**
 * prioritize_channels — rank acquisition channels by commercial return.
 *
 * Internal analysis; produces judgement, spends nothing, sends nothing.
 * Reversible, so no approval (ADR-002, ADR-004).
 *
 * DERIVED, NOT SEEDED — the workbook's Action Registry sheet is empty.
 */
export const PRIORITIZE_CHANNELS: ActionDef = {
  id: 'prioritize_channels',
  name: 'Prioritize Channels',
  kind: 'oneoff',
  irreversible: false,
  instructionsRef: 'prioritize_channels',
}
