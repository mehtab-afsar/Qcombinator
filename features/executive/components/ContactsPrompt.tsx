'use client'

/**
 * P005's outreach can't address anyone without a real contact somewhere — see
 * lib/contacts/context.ts. Shown only on P005; every other Program has no use for it.
 */

import Link from 'next/link'
import { Users, ArrowRight } from 'lucide-react'
import { blue, ink, alpha } from '@/lib/constants/colors'

export function ContactsPrompt() {
  return (
    <Link
      href="/founder/contacts"
      style={{
        display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none',
        padding: '12px 16px', borderRadius: 8, background: alpha(blue, 0.06),
        border: `1px solid ${alpha(blue, 0.2)}`,
      }}
    >
      <Users size={16} color={blue} style={{ flexShrink: 0 }} />
      <span style={{ color: ink, fontSize: 13.5, flex: 1 }}>
        Add real contacts so outreach here has someone legitimate to reach out to.
      </span>
      <ArrowRight size={14} color={blue} />
    </Link>
  )
}
