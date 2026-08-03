'use client'

/**
 * The one shared Button — the primitive that never existed anywhere in this app.
 *
 * The design-consistency audit (4 Aug 2026) found at least 7 independently hand-rolled button
 * implementations across the app (app/founder/executive, onboarding, settings, ConnectorsPanel,
 * ActionsPanel, RhythmPanel, investor/onboarding), disagreeing on radius (8 / 12 / pill), padding,
 * and font-size for what is conceptually the same primary action. This is the fix: one component,
 * reused, not a smaller-but-still-eighth reinvention.
 *
 * Small on purpose — three variants, four sizes from the existing `btn` token scale, a loading
 * state (absorbed from settings' SaveButton, which already had exactly this pattern). No
 * `asChild`/polymorphism/compound-component machinery; this app doesn't need it.
 */

import { Loader2 } from 'lucide-react'
import { ink, bg, bdr, muted, red } from '@/lib/constants/colors'
import { btn, duration } from '@/features/shared/tokens'

export type ButtonVariant = 'primary' | 'secondary' | 'danger'
export type ButtonSize = keyof typeof btn

export interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: ButtonVariant
  size?: ButtonSize
  /** Disables the button and swaps its label/icon for a spinner — the SaveButton pattern. */
  loading?: boolean
  disabled?: boolean
  type?: 'button' | 'submit'
  icon?: React.ReactNode
  style?: React.CSSProperties
}

const VARIANT_STYLE: Record<ButtonVariant, { bg: string; color: string; border?: string }> = {
  // ink-on-cream is this app's established "primary" pairing (SaveButton, EmptyState's CTA).
  primary:   { bg: ink,           color: bg },
  // bordered/transparent — OutlineButton's pattern (ConnectorsPanel's disconnect, etc).
  secondary: { bg: 'transparent', color: ink, border: bdr },
  // solid red — settings' delete-account treatment, the one genuinely destructive action.
  // NOT for "decline"/"dismiss" style refusals that aren't destructive — use secondary for those.
  // `bg` (not raw white) for the text, same "light text on a filled background" pairing primary
  // uses — the real delete-account button used a raw #fff here; standardized to one token instead
  // of two different "light text" values existing side by side.
  danger:    { bg: red, color: bg },
}

export function Button({
  children, onClick, variant = 'primary', size = 'md', loading = false, disabled = false,
  type = 'button', icon, style,
}: ButtonProps) {
  const v = VARIANT_STYLE[variant]
  const s = btn[size]
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        padding: s.padding,
        fontSize: s.fontSize,
        fontWeight: 500,
        borderRadius: s.borderRadius,
        border: v.border ? `1px solid ${v.border}` : 'none',
        background: loading ? bdr : v.bg,
        color: loading ? muted : v.color,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        transition: `opacity ${duration.fast}, border-color ${duration.fast}`,
        opacity: disabled && !loading ? 0.5 : 1,
        ...style,
      }}
      onMouseEnter={e => {
        if (variant === 'secondary' && !isDisabled) (e.currentTarget as HTMLButtonElement).style.borderColor = ink
      }}
      onMouseLeave={e => {
        if (variant === 'secondary' && !isDisabled) (e.currentTarget as HTMLButtonElement).style.borderColor = bdr
      }}
    >
      {loading
        ? <Loader2 size={s.fontSize} style={{ animation: 'spin 1s linear infinite' }} />
        : icon}
      {children}
    </button>
  )
}
