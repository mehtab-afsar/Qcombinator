'use client'

import { bg, bdr, ink, blue } from '@/lib/constants/colors'

interface TextInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  autoFocus?: boolean
  maxLength?: number
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export function TextInput({
  value, onChange, placeholder,
  type = 'text', autoFocus = false, maxLength, onKeyDown,
}: TextInputProps) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      autoFocus={autoFocus}
      maxLength={maxLength}
      onKeyDown={onKeyDown}
      autoComplete={type === 'email' ? 'email' : type === 'password' ? 'new-password' : 'off'}
      style={{
        width: '100%', padding: '11px 14px', borderRadius: 8,
        border: `1.5px solid ${bdr}`, background: bg,
        fontSize: 14, color: ink, outline: 'none', fontFamily: 'inherit',
        boxSizing: 'border-box', transition: 'border-color 0.15s',
      }}
      onFocus={e => { e.currentTarget.style.borderColor = blue }}
      onBlur={e => { e.currentTarget.style.borderColor = bdr }}
    />
  )
}
