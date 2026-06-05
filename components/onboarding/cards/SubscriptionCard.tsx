'use client'

import { Zap, ArrowRight } from 'lucide-react'
import { ink, muted } from '@/lib/constants/colors'

interface SubscriptionCardProps {
  currentTier?: 'free' | 'premium'
  onAction?: () => void
  isClickable?: boolean
}

export function SubscriptionCard({ currentTier = 'free', onAction, isClickable = true }: SubscriptionCardProps) {
  const isPremium = currentTier === 'premium'

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
        background: isPremium ? '#f0f9ff' : '#fff',
        border: `1px solid ${isPremium ? '#0ea5e9' : 'rgba(0,0,0,0.1)'}`,
        cursor: isClickable ? 'pointer' : 'default',
        textAlign: 'left',
        transition: 'all 0.2s',
      }}
      onMouseEnter={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.borderColor = isPremium ? '#0ea5e9' : 'rgba(0,0,0,0.2)'
          ;(e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'
        }
      }}
      onMouseLeave={e => {
        if (isClickable) {
          (e.currentTarget as HTMLElement).style.borderColor = isPremium ? '#0ea5e9' : 'rgba(0,0,0,0.1)'
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
              background: isPremium ? 'rgba(14,165,233,0.15)' : 'rgba(229,231,235,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Zap size={18} color={isPremium ? '#0ea5e9' : '#6b7280'} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: ink, margin: 0 }}>
              {isPremium ? 'Premium Active' : 'Unlock Premium'}
            </h3>
          </div>
        </div>
        {isClickable && <ArrowRight size={16} color={muted} />}
      </div>
      <p style={{ fontSize: 13, color: muted, margin: 0, lineHeight: 1.5 }}>
        {isPremium
          ? 'You have unlimited agent chats and investor connections.'
          : '$29/month • Unlimited agent chats, Q-Score updates, and investor connections'}
      </p>
    </button>
  )
}
