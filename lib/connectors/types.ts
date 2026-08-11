/**
 * F13 — the Connector interface. ONE interface, every provider (CLAUDE.md §0.2).
 *
 * The test this exists to pass is in the Story 3 DoD: **"a second provider needs no new route."**
 * Adding a CRM or a calendar should be a new adapter module plus one registry line — never a
 * route, a schema change, or a branch in the approval flow. That is the Registry lesson applied
 * to the outside world: capability is config, not code paths.
 *
 * Gmail is the FIRST implementation, not a special case. If anything here reads as
 * Gmail-specific, it is in the wrong file.
 */

/** A grant with its credential already resolved. Adapters never touch the vault themselves. */
export interface ResolvedGrant {
  grantId: string
  founderId: string
  provider: string
  /**
   * The live credential.
   *
   * ⚠️ Never log this, never put it in an error, never return it in a result. Adapters receive
   * it, use it, and drop it — the resolution happens in one place so there is one place to audit.
   */
  accessToken: string
  accountEmail: string | null
  scopes: string[]
}

/** What a connector was asked to do. Providers interpret their own payload shape. */
export interface ConnectorRequest {
  /**
   * A caller-generated, deterministic id derived from the payload hash.
   *
   * This is how an ambiguous failure becomes answerable: the adapter attaches it to the outgoing
   * message so the same request can be RECOGNISED at the provider later. Without it, a timeout
   * leaves "did it send?" permanently unanswerable and every retry risks a duplicate.
   */
  idempotencyKey: string
  recipients: ReadonlyArray<{ email: string; name?: string }>
  subject: string
  body: string
  /**
   * A provider-specific destination for connectors that aren't recipient-shaped (Slack: a
   * channel id). Deliberately NOT folded into `recipients` — a channel is not a person's
   * address, and `allowlist.ts`'s `assertRecipientsAllowed` treats `.email` as a real one.
   */
  channel?: string
}

export type ConnectorOutcome =
  | { status: 'sent'; providerId: string }
  /** The provider refused. Deterministic — retrying the same request will fail the same way. */
  | { status: 'rejected'; reason: string }
  /**
   * We do not know. A timeout, a dropped connection — the request may or may not have landed.
   *
   * Deliberately NOT collapsed into 'rejected'. Recording a failure we cannot prove is a lie the
   * audit log would carry forever, and it invites a retry that double-sends.
   */
  | { status: 'unknown'; reason: string }

/**
 * One provider.
 *
 * `reconcile` is what makes `unknown` recoverable rather than terminal: given the idempotency
 * key, ask the provider whether the request actually landed. A provider that cannot answer that
 * question should return null, and the outcome stays `unknown` — visible to the founder as
 * "we could not confirm this", which is honest and actionable.
 */
export interface Connector {
  readonly provider: string
  /** Scopes this connector needs — least privilege, named in one place so a widening is visible. */
  readonly scopes: readonly string[]
  send(grant: ResolvedGrant, request: ConnectorRequest): Promise<ConnectorOutcome>
  /** Did this request land? null = the provider could not tell us. */
  reconcile(grant: ResolvedGrant, idempotencyKey: string): Promise<boolean | null>
  /** Tell the provider to forget us. Called BEFORE the local grant is marked revoked. */
  revoke(grant: ResolvedGrant): Promise<void>
  /**
   * Optional — most connectors don't implement this. Called once, best-effort, right after a
   * NEW grant is recorded (never on every resolve). For a connector whose whole point is a
   * one-time or periodic sync rather than an approval-gated send (Stripe: pull revenue metrics
   * the moment access is granted), this is the generic hook that avoids a per-provider branch in
   * the callback route — the route calls it the same way for every provider; connectors that
   * don't need it simply don't define it.
   */
  onConnected?(grant: ResolvedGrant): Promise<void>
}

export class ConnectorError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ConnectorError'
    this.code = code
  }
}
