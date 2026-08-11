'use client'

/**
 * F09 Activation — decides Activation vs the Command View.
 *
 * The activation check itself (is the founder's latest run this mandate's just-triggered first
 * run?) lives in useActivationCheck.ts, shared with the per-executive cockpit page — this
 * component just decides what to render for each state.
 *
 * Composed in place of the direct <CommandView> render in app/founder/executive/page.tsx.
 */

import { useState } from 'react'
import { ActivationScreen } from './ActivationScreen'
import { CommandView } from './CommandView'
import { bg } from '@/lib/constants/colors'
import { useActivationCheck } from '../lib/useActivationCheck'
import type { Contract, ProgramInstance } from '../types/executive.types'

export function ActivationGate({
  contract, programs, onChangeDirection, busy,
}: {
  contract: Contract
  programs: ProgramInstance[]
  onChangeDirection: () => void
  busy: boolean
}) {
  const [forceSettled, setForceSettled] = useState(false)
  const checked = useActivationCheck(contract)
  const state = forceSettled ? 'settled' : checked

  if (state === 'loading') return null // avoids a flash between the two views

  if (state === 'activation') {
    return (
      <div style={{ background: bg, borderRadius: 12, padding: '8px 0' }}>
        <ActivationScreen onComplete={() => setForceSettled(true)} />
      </div>
    )
  }

  return (
    <CommandView
      contract={contract}
      programs={programs}
      busy={busy}
      onChangeDirection={onChangeDirection}
    />
  )
}
