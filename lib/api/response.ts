import { NextResponse } from 'next/server'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'

/**
 * The new model's route guard (ADR-014). Off by default, and the route must appear not to
 * exist — 404, never 403: a 403 tells an unauthenticated caller that something is there.
 *
 * Single-sourced deliberately. CODEBASE_AUDIT.md Q-1 found this same three-line guard
 * copy-pasted into five routes and warned it "grows one copy per feature… exactly the mechanism
 * that produced 173 routes". By the time it was fixed there were eight. It is a security-
 * relevant guard, so N copies means N places to get it wrong.
 *
 * @returns a 404 response when the new model is off, or null to continue.
 */
export function newModelOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

/** Standardised error response: { error, code } */
export function apiErr(message: string, status = 400) {
  return NextResponse.json({ error: message, code: status }, { status })
}

/** Standardised success response for new routes: { data } */
export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export type ApiOk<T>  = { data: T }
export type ApiErr    = { error: string; code: number }
export type ApiResult<T> = ApiOk<T> | ApiErr
