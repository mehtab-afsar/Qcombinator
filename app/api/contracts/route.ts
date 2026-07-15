/**
 * GET  /api/contracts — the current mandate, its Programs, and history.
 * POST /api/contracts — generate a draft, or confirm one.
 *
 * ⚠️ THERE IS NO PATCH, AND THERE MUST NEVER BE ONE. Contracts are immutable
 * (ADR-003): a change is a new epoch via POST /api/contracts/new-epoch, never an
 * edit. The database enforces this too (a trigger rejects content edits), because
 * a rule this important should not rest on the absence of a route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { FF_NEW_EXECUTIVE_MODEL } from '@/lib/feature-flags'
import {
  confirmContract,
  ContractError,
  createDraft,
  getContractHistory,
  getCurrentContract,
  getProgramsForContract,
} from '@/lib/mandate/contract'
import { log } from '@/lib/logger'

const bodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('draft') }),
  z.object({ action: z.literal('confirm'), contractId: z.string().uuid() }),
])

function flagOff(): NextResponse | null {
  if (FF_NEW_EXECUTIVE_MODEL) return null
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

export async function GET(): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    // User-scoped client: RLS is the tenancy boundary, so the database enforces
    // isolation rather than this route remembering to.
    const supabase = await createClient()
    const contract = await getCurrentContract(supabase, auth.user.id)
    const [history, programs] = await Promise.all([
      getContractHistory(supabase, auth.user.id),
      contract ? getProgramsForContract(supabase, contract.id) : Promise.resolve([]),
    ])

    return NextResponse.json({ contract, programs, history })
  } catch (err) {
    log.error('GET /api/contracts', { err })
    return NextResponse.json({ error: 'Failed to load mandate' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = flagOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()

    if (parsed.data.action === 'draft') {
      const contract = await createDraft(supabase, auth.user.id)
      return NextResponse.json({ contract }, { status: 201 })
    }

    // Confirming is the moment the mandate becomes real and Programs start
    // running. Atomic in Postgres — see confirm_executive_contract.
    const result = await confirmContract(supabase, auth.user.id, parsed.data.contractId)
    return NextResponse.json(result, { status: 200 })
  } catch (err) {
    // ContractError is expected disagreement — an incomplete strategy, a lost
    // race, confirming something already confirmed. The founder should read it,
    // not have it buried in a 500.
    if (err instanceof ContractError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    log.error('POST /api/contracts', { err })
    return NextResponse.json({ error: 'Failed to update mandate' }, { status: 500 })
  }
}
