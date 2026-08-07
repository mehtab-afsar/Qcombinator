/**
 * F13 — provider id → Connector.
 *
 * **This map is the whole answer to "a second provider needs no new route."** Adding a CRM or a
 * calendar is a new adapter module plus one line here. Nothing else moves: not the routes, not
 * the schema, not the approval flow, not the audit log.
 *
 * If a future change adds a `switch (provider)` anywhere above this file, it has forked what
 * this map exists to keep single (CLAUDE.md §0.2).
 */

import { gmailConnector } from './gmail'
import { slackConnector } from './slack'
import { gmailReadConnector } from './gmail-read'
import { ConnectorError, type Connector } from './types'

const CONNECTORS: Readonly<Record<string, Connector>> = {
  gmail: gmailConnector,
  slack: slackConnector,
  gmail_read: gmailReadConnector,
}

/**
 * @throws ConnectorError for an unknown provider — never a silent no-op. A grant naming a
 *         provider we cannot serve must fail loudly: the alternative is an Action that appears
 *         to send and quietly does nothing.
 */
export function getConnector(provider: string): Connector {
  const connector = CONNECTORS[provider]
  if (!connector) {
    throw new ConnectorError('unknown_provider', `No connector is registered for '${provider}'.`)
  }
  return connector
}

/** Every provider this build can serve. Used by the UI to offer connections. */
export function listConnectors(): Connector[] {
  return Object.values(CONNECTORS)
}
