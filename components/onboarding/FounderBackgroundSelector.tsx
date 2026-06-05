'use client'

import { ink, muted, bdr, green } from '@/lib/constants/colors'

export type FounderBackground = 'technical' | 'domain-expert' | 'serial-entrepreneur' | 'prior-customers'

interface BackgroundOption {
  id: FounderBackground
  label: string
  description: string
}

const BACKGROUND_OPTIONS: BackgroundOption[] = [
  {
    id: 'technical',
    label: 'Technical Founder',
    description: 'I have engineering / technical expertise',
  },
  {
    id: 'domain-expert',
    label: 'Domain Expert',
    description: 'I have deep expertise in this industry / market',
  },
  {
    id: 'serial-entrepreneur',
    label: 'Serial Entrepreneur',
    description: 'I have built and exited a company before',
  },
  {
    id: 'prior-customers',
    label: 'Prior Customers',
    description: 'I already have customers / revenue',
  },
]

interface FounderBackgroundSelectorProps {
  value: FounderBackground[]
  onChange: (value: FounderBackground[]) => void
}

export function FounderBackgroundSelector({
  value,
  onChange,
}: FounderBackgroundSelectorProps) {
  function handleToggle(id: FounderBackground) {
    const newValue = value.includes(id)
      ? value.filter(v => v !== id)
      : [...value, id]
    onChange(newValue)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {BACKGROUND_OPTIONS.map(option => {
        const isChecked = value.includes(option.id)
        return (
          <button
            key={option.id}
            onClick={() => handleToggle(option.id)}
            style={{
              padding: '14px 16px',
              borderRadius: 10,
              border: `1.5px solid ${isChecked ? green : bdr}`,
              background: isChecked ? `${green}08` : '#fff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.borderColor = isChecked
                ? green
                : bdr
              ;(e.currentTarget as HTMLElement).style.background = isChecked
                ? `${green}12`
                : `${ink}05`
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.borderColor = isChecked
                ? green
                : bdr
              ;(e.currentTarget as HTMLElement).style.background = isChecked
                ? `${green}08`
                : '#fff'
            }}
          >
            {/* Checkbox */}
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: `1.5px solid ${isChecked ? green : bdr}`,
                background: isChecked ? green : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
                transition: 'all 0.15s',
              }}
            >
              {isChecked && (
                <svg
                  width="12"
                  height="10"
                  viewBox="0 0 12 10"
                  fill="none"
                  style={{ marginBottom: 1 }}
                >
                  <path
                    d="M1 5.5L4.5 9L11 1"
                    stroke="#fff"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>

            {/* Label + description */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: ink,
                  marginBottom: 2,
                }}
              >
                {option.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: muted,
                  lineHeight: 1.4,
                }}
              >
                {option.description}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
