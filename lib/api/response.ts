import { NextResponse } from 'next/server'

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
