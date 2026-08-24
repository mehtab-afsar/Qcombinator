/**
 * POST /api/contracts/activate-program — turn on one more Registry Program directly.
 *
 * The structured counterpart to /api/contracts/new-epoch: that route redrafts the whole mandate
 * through the LLM and hopes it includes the Program a founder wants; this route just adds it,
 * deterministically, as its own new epoch (lib/mandate/contract.ts::activateProgram — see its own
 * docstring for why this can never be an in-place edit, ADR-003).
 *
 * Thin: validate → call lib → return (CLAUDE.md §2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { verifyAuth } from '@/lib/auth/verify'
import { parseBody } from '@/lib/api/validate'
import { newModelOff } from '@/lib/api/response'
import { ContractError, activateProgram } from '@/lib/mandate/contract'
import { ProgramNotFoundError, type ProgramId } from '@/lib/registry'
import { log } from '@/lib/logger'

const bodySchema = z.object({ programId: z.string().min(1) })

export async function POST(req: NextRequest): Promise<NextResponse> {
  const off = newModelOff()
  if (off) return off

  try {
    const auth = await verifyAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const parsed = await parseBody(req, bodySchema)
    if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })

    const supabase = await createClient()
    const result = await activateProgram(supabase, auth.user.id, parsed.data.programId as ProgramId)

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    if (err instanceof ContractError || err instanceof ProgramNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    log.error('POST /api/contracts/activate-program', { err })
    return NextResponse.json({ error: 'Failed to activate that program' }, { status: 500 })
  }
}
