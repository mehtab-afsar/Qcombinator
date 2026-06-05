/**
 * FounderMatchCard Component
 * Displays a founder with their personalized match score and dimension breakdown
 */

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Avatar } from '@/features/shared/components/Avatar'
import { surf, bdr, ink, muted, blue, amber, green } from '@/lib/constants/colors'

interface MatchScoreBreakdown {
  qscore: number
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
}

interface FounderMatchCardProps {
  id: string
  name: string
  companyName: string
  logoUrl?: string | null
  avatarUrl?: string | null
  industry: string
  stage: string
  qScore: number
  matchScore: number
  breakdown?: MatchScoreBreakdown
  href: string
  showTooltip?: boolean
}

const DIMENSION_LABELS = {
  qscore: 'Overall',
  p1: 'Market Readiness',
  p2: 'Market Potential',
  p3: 'IP & Defensibility',
  p4: 'Founder & Team',
  p5: 'Structural Impact',
  p6: 'Financials',
}

function getScoreColor(score: number): string {
  if (score >= 80) return green
  if (score >= 60) return blue
  if (score >= 40) return amber
  return '#999'
}

export function FounderMatchCard({
  name,
  companyName,
  logoUrl,
  industry,
  stage,
  qScore,
  matchScore,
  breakdown,
  href,
}: FounderMatchCardProps) {
  const [showDetails, setShowDetails] = React.useState(false)

  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div
        style={{
          background: '#fff',
          border: `1px solid ${bdr}`,
          borderRadius: 12,
          padding: 16,
          cursor: 'pointer',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = blue;
          (e.currentTarget as HTMLElement).style.boxShadow = `0 0 0 2px ${blue}20`;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = bdr;
          (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        }}
      >
        {/* Logo */}
        <div style={{ flexShrink: 0 }}>
          <Avatar
            url={logoUrl}
            name={companyName}
            size={64}
            radius={10}
            fontSize={20}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <div style={{ minWidth: 0 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: ink, margin: '0 0 2px', wordBreak: 'break-word' }}>
                {companyName}
              </h3>
              <p style={{ fontSize: 11, color: muted, margin: 0 }}>
                {name}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              {/* Personalized Match Score Badge */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
                onMouseEnter={() => setShowDetails(true)}
                onMouseLeave={() => setShowDetails(false)}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: `${getScoreColor(matchScore)}20`,
                    border: `2px solid ${getScoreColor(matchScore)}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  title={`${matchScore}% match for your criteria`}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: getScoreColor(matchScore), lineHeight: 1 }}>
                    {Math.round(matchScore)}
                  </span>
                  <span style={{ fontSize: 8, color: getScoreColor(matchScore), fontWeight: 600 }}>
                    match
                  </span>

                  {/* Tooltip */}
                  {showDetails && breakdown && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: '-240px',
                        background: '#fff',
                        border: `1px solid ${bdr}`,
                        borderRadius: 10,
                        padding: 12,
                        minWidth: 220,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                        zIndex: 10,
                        pointerEvents: 'none',
                      }}
                    >
                      <p style={{ fontSize: 10, fontWeight: 700, color: muted, textTransform: 'uppercase', margin: '0 0 6px' }}>
                        Dimension Scores
                      </p>
                      {Object.entries(breakdown)
                        .filter(([key]) => key !== 'qscore')
                        .map(([key, value]) => (
                          <div key={key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: muted }}>
                              {DIMENSION_LABELS[key as keyof typeof DIMENSION_LABELS] || key}
                            </span>
                            <strong style={{ color: getScoreColor(value as number) }}>
                              {Math.round(value as number)}
                            </strong>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details row */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
            {/* Industry badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: blue,
                background: `${blue}15`,
                border: `1px solid ${blue}30`,
                borderRadius: 6,
                padding: '2px 6px',
                textTransform: 'capitalize',
              }}
            >
              {industry}
            </span>

            {/* Stage badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: '#666',
                background: surf,
                border: `1px solid ${bdr}`,
                borderRadius: 6,
                padding: '2px 6px',
                textTransform: 'capitalize',
              }}
            >
              {stage.replace(/-/g, ' ')}
            </span>

            {/* Q-Score badge */}
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: 10,
                fontWeight: 600,
                color: getScoreColor(qScore),
                background: `${getScoreColor(qScore)}15`,
                border: `1px solid ${getScoreColor(qScore)}30`,
                borderRadius: 6,
                padding: '2px 6px',
              }}
            >
              Q-Score: {Math.round(qScore)}
            </span>
          </div>

          {/* Match score explanation */}
          <p style={{ fontSize: 10, color: muted, margin: 0 }}>
            Score weighted by your custom preferences
          </p>
        </div>

        {/* Chevron */}
        <ChevronRight style={{ width: 16, height: 16, color: muted, flexShrink: 0, marginTop: 2 }} />
      </div>
    </Link>
  )
}

// Import React for the component (fix the import at top of file)
import React from 'react'
