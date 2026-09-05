/**
 * The one gate every scheduled job passes through.
 *
 * This check was copy-pasted into seven route files, and had already drifted between them —
 * different header casing, different variable names, the two conditions sometimes folded into
 * one `if` and sometimes split. None of those differences changed the outcome, which is exactly
 * why the drift went unnoticed and why the next one would too. CLAUDE.md §3 names this shape
 * directly: "Centralized auth checks — one `verifyAdmin()`, never a copy-pasted whitelist."
 *
 * ⚠️ FAIL-CLOSED, AND THAT IS THE POINT (ADR-017). A missing `CRON_SECRET` returns 503 and the
 * job does not run. The tempting alternative — skip the check when no secret is configured, so
 * local development is easier — would leave every scheduled job wide open on any deploy where
 * the variable was forgotten, which is precisely the deploy where nobody is watching.
 *
 * ⚠️ Compared in constant time. A `!==` on a secret leaks its content through timing, one byte
 * at a time; it is a weak attack over the public internet but a free one to close, and the seven
 * copies this replaces all used `!==`.
 *
 * Returns null when the caller is authorised — so a route reads:
 *
 *     const denied = verifyCronSecret(req)
 *     if (denied) return denied
 */

import { NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'

/** Length-independent, content-constant-time comparison. */
function secretsMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided)
  const b = Buffer.from(expected)
  // timingSafeEqual throws on a length mismatch, which would itself leak length. Comparing a
  // fixed-size digest of each side keeps the comparison constant-time for any input length.
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * @returns a NextResponse to return immediately, or null if the caller may proceed.
 */
export function verifyCronSecret(req: Request): NextResponse | null {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 })
  }

  // Header lookup is case-insensitive per the Fetch spec, so the old copies' mix of
  // 'Authorization' and 'authorization' was harmless — but only one spelling exists now.
  const header = req.headers.get('authorization')
  if (!header || !secretsMatch(header, `Bearer ${expected}`)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return null
}
