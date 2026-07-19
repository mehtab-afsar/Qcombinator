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
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
      {BACKGROUND_OPTIONS.map(option => {
        const isChecked = value.includes(option.id)
        return (
          <button
            key={option.id}
            onClick={() => handleToggle(option.id)}
            style={{
              position: 'relative',
              padding: '11px 12px',
              borderRadius: 12,
              border: `1.5px solid ${isChecked ? green : bdr}`,
              background: isChecked ? `${green}08` : '#fff',
              boxShadow: isChecked ? `0 0 0 3px ${green}1a` : 'none',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
              display: 'flex',
              flexDirection: 'column',
              gap: 3,
              height: '100%',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLElement).style.background = isChecked
                ? `${green}12`
                : `${ink}05`
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLElement).style.background = isChecked
                ? `${green}08`
                : '#fff'
            }}
          >
            {/* Check badge (top-right) when selected — signals multi-select */}
            {isChecked && (
              <div
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: green,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                  <path
                    d="M1 5.5L4.5 9L11 1"
                    stroke="#fff"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 600, color: ink, lineHeight: 1.2, paddingRight: isChecked ? 18 : 0 }}>
              {option.label}
            </div>
            <div style={{ fontSize: 11.5, color: muted, lineHeight: 1.35 }}>
              {option.description}
            </div>
          </button>
        )
      })}
    </div>
  )
}
