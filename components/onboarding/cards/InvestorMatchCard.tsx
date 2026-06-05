'use client'

import { Target, ArrowRight } from 'lucide-react'
import { ink, muted } from '@/lib/constants/colors'

interface InvestorMatchCardProps {
  matchCount?: number
  onAction?: () => void
  isClickable?: boolean
}

export function InvestorMatchCard({ matchCount = 0, onAction, isClickable = true }: InvestorMatchCardProps) {
  return (
    <button
      onClick={onAction}
      disabled={!isClickable}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '20px 16px',
        borderRadius: 12,
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.2)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        }
      }}
      onMouseLeave={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,0,0,0.1)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = 'none'
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: 'rgba(168,85,247,0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Target size={18} color="#a855f7" />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0 }}>Investor matches</h3>
          </div>
        </div>
        {isClickable && <ArrowRight size={16} color={muted} />}
      </div>
      <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.5 }}>
        {matchCount > 0
          ? `${matchCount} investor${matchCount === 1 ? '' : 's'} match${matchCount === 1 ? 'es' : ''} your profile. Complete your Q-Score to appear in their deal flow.`
          : 'Complete your Q-Score profile to see investors interested in your startup.'}
      </p>
    </button>
  )
}
