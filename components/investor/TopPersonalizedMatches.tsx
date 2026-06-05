/**
 * TopPersonalizedMatches Component
 * Shows top ranked founders based on investor's custom config
 */

'use client'

import { usePersonalizedMatching } from '@/features/investor/hooks/usePersonalizedMatching'
import { FounderMatchCard } from '@/components/ui/FounderMatchCard'
import type { FounderProfile } from '@/lib/services/deal-matching.service'
import { bdr, muted, blue, alpha } from '@/lib/constants/colors'
import { AlertCircle } from 'lucide-react'

interface TopPersonalizedMatchesProps {
  founders: FounderProfile[]
  limit?: number
}

export function TopPersonalizedMatches({
  founders,
  limit = 6,
}: TopPersonalizedMatchesProps) {
  const { config, rankedMatches, loading, error } = usePersonalizedMatching(founders)

  if (error) {
    return (
      <div style={{ padding: 16, background: '#FEF2F2', borderRadius: 12, border: '1px solid #FECACA' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: '#DC2626', margin: 0 }}>
              Failed to load matches
            </p>
            <p style={{ fontSize: 11, color: '#7F1D1D', margin: '2px 0 0' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 120,
              background: '#F0EDE6',
              borderRadius: 12,
              border: `1px solid ${bdr}`,
              animation: 'pulse 2s infinite',
            }}
          />
        ))}
      </div>
    )
  }

  const topMatches = rankedMatches.slice(0, limit)

  if (topMatches.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', borderRadius: 12, border: `1px solid ${bdr}` }}>
        <p style={{ fontSize: 13, color: muted, margin: 0 }}>
          No founders match your current criteria
        </p>
        <p style={{ fontSize: 11, color: muted, margin: '4px 0 0' }}>
          Try adjusting your preferences
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
      {/* Config info banner */}
      <div
        style={{
          padding: 12,
          background: alpha(blue, 0.07),
          border: `1px solid ${alpha(blue, 0.2)}`,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 600, color: blue, margin: 0 }}>
            ✨ Personalized ranking
          </p>
          <p style={{ fontSize: 10, color: muted, margin: '2px 0 0' }}>
            {config?.investorType === 'angel'
              ? 'Weighted by founder & team strength'
              : config?.investorType === 'seed-vc'
                ? 'Weighted by Q-Score and market potential'
                : config?.investorType === 'growth-vc'
                  ? 'Weighted by financials and execution'
                  : 'Weighted by strategic fit'}
          </p>
        </div>
        <a
          href="/investor/settings/preferences"
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: blue,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Customize →
        </a>
      </div>

      {/* Founder cards */}
      {topMatches.map(({ founder, matchScore }) => (
        <FounderMatchCard
          key={founder.id}
          id={founder.id}
          name="Founder Name"
          companyName={founder.stage}
          logoUrl={undefined}
          avatarUrl={undefined}
          industry={founder.industry}
          stage={founder.stage}
          qScore={founder.qscore.overall}
          matchScore={matchScore}
          breakdown={{ ...founder.qscore, qscore: founder.qscore.overall }}
          href={`/investor/deal-flow/${founder.id}`}
        />
      ))}

      {/* Footer note */}
      {topMatches.length > 0 && (
        <div style={{ paddingTop: 8 }}>
          <p style={{ fontSize: 10, color: muted, textAlign: 'center', margin: 0 }}>
            Showing {topMatches.length} of {rankedMatches.length} matches
          </p>
        </div>
      )}
    </div>
  )
}
