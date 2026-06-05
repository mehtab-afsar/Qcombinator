'use client'

import { Calendar, ChevronRight, Check } from 'lucide-react'
import { bg, bdr, ink, muted, green, amber } from '@/lib/constants/colors'

interface SubscriptionStatusCardProps {
  tier: 'free' | 'premium' | 'pro'
  renewalDate?: string
  usage?: {
    feature: string
    current: number
    limit: number | null
  }[]
  onManage?: () => void
  onViewInvoices?: () => void
}

const TIER_DISPLAY: Record<string, { label: string; color: string }> = {
  free: { label: 'Free', color: muted },
  premium: { label: 'Premium', color: green },
  pro: { label: 'Pro', color: green },
}

export function SubscriptionStatusCard({
  tier,
  renewalDate,
  usage = [],
  onManage,
  onViewInvoices,
}: SubscriptionStatusCardProps) {
  const tierDisplay = TIER_DISPLAY[tier] || TIER_DISPLAY.free
  const isActive = tier !== 'free'

  const formattedRenewalDate = renewalDate
    ? new Date(renewalDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null

  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${bdr}`,
        borderRadius: 16,
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isActive ? green : muted,
              }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isActive ? green : muted,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}
            >
              {tierDisplay.label} {isActive ? 'Active' : 'Plan'}
            </span>
          </div>
          {formattedRenewalDate && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: muted,
              }}
            >
              <Calendar size={13} />
              Renews {formattedRenewalDate}
            </div>
          )}
        </div>

        {tier === 'free' && (
          <button
            onClick={onManage}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: `1px solid ${bdr}`,
              background: 'white',
              fontSize: 12,
              fontWeight: 600,
              color: ink,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            Upgrade <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Usage meters */}
      {usage.length > 0 && (
        <div
          style={{
            borderTop: `1px solid ${bdr}`,
            paddingTop: 20,
            marginTop: 20,
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: muted,
              margin: '0 0 12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}
          >
            Usage this month
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {usage.map(item => {
              const percentage =
                item.limit && item.limit > 0
                  ? Math.min(100, (item.current / item.limit) * 100)
                  : 0
              const isUnlimited = item.limit === null
              const isWarning = percentage >= 80 && percentage < 100
              const isMaxed = percentage >= 100

              return (
                <div key={item.feature}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 500, color: ink }}>
                      {item.feature}
                    </span>
                    {isUnlimited ? (
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: green,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={13} /> Unlimited
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          color: muted,
                        }}
                      >
                        {item.current} / {item.limit}
                      </span>
                    )}
                  </div>

                  {!isUnlimited && (
                    <div
                      style={{
                        height: 6,
                        borderRadius: 999,
                        background: `${ink}12`,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${percentage}%`,
                          background: isMaxed ? '#DC2626' : isWarning ? amber : green,
                          transition: 'width 0.2s',
                        }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginTop: 20,
          paddingTop: 20,
          borderTop: `1px solid ${bdr}`,
          flexWrap: 'wrap',
        }}
      >
        {isActive && (
          <button
            onClick={onManage}
            style={{
              flex: 1,
              minWidth: 140,
              padding: '10px 14px',
              borderRadius: 8,
              border: `1px solid ${bdr}`,
              background: 'white',
              fontSize: 13,
              fontWeight: 600,
              color: ink,
              cursor: 'pointer',
            }}
          >
            Manage subscription
          </button>
        )}
        <button
          onClick={onViewInvoices}
          style={{
            flex: 1,
            minWidth: 140,
            padding: '10px 14px',
            borderRadius: 8,
            border: `1px solid ${bdr}`,
            background: 'white',
            fontSize: 13,
            fontWeight: 600,
            color: ink,
            cursor: 'pointer',
          }}
        >
          View invoices
        </button>
      </div>
    </div>
  )
}
