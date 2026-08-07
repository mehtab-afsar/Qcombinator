'use client'

/**
 * A generic breadcrumb trail — no page-specific logic. First use: CANVAS_SPEC §3's "clearly
 * 'inside' Patel (breadcrumb / back-to-team)" on the executive cockpit, but this takes plain
 * `items` so any page can reuse it instead of growing its own back-link convention.
 */

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { muted, ink } from '@/lib/constants/colors'

export interface BreadcrumbItem {
  label: string
  /** Omitted on the last item — the current page is never a link to itself. */
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, marginBottom: 12 }}>
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {i > 0 && <ChevronRight size={12} color={muted} />}
          {item.href ? (
            <Link href={item.href} style={{ color: muted, textDecoration: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline' }}
              onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none' }}
            >
              {item.label}
            </Link>
          ) : (
            <span style={{ color: ink, fontWeight: 500 }}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
