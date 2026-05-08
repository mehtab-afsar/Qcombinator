'use client'

import { Card, CardContent } from '@/components/ui/card'
import { ink, muted, green, amber, red, blue } from '../../shared/constants/colors'

const sectionHead: React.CSSProperties = {
  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.14em', color: muted, marginBottom: 10,
}

const pill = (color: string) => ({
  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
  fontSize: 10, fontWeight: 600, background: `${color}18`, color,
})

// Normalize 0-100 axis values to a percentage position within the chart
function toPercent(v: number | undefined): number {
  if (v === undefined || isNaN(Number(v))) return 50
  return Math.max(2, Math.min(96, Number(v)))
}

const PLAYER_COLORS = [amber, red, '#7C3AED', '#0891B2', '#DB2777', '#D97706']

export function MarketMapRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    axes?: { x?: string; y?: string }
    players?: { name: string; x?: number; y?: number; funding?: string; description?: string; weakness?: string }[]
    ourPosition?: { x?: number; y?: number; rationale?: string }
    whitespace?: { area: string; opportunity?: string }[]
    summary?: string
  }

  const players = d.players ?? []
  const ourPos = d.ourPosition

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Positioning chart */}
      <Card><CardContent className="pt-4 pb-4">
        <p style={sectionHead}>Competitive Positioning Map</p>

        {/* Axis labels */}
        <div style={{ position: 'relative' as const }}>
          {/* Y axis label */}
          {d.axes?.y && (
            <div style={{
              position: 'absolute' as const, left: -8, top: '50%', transform: 'translateX(-50%) rotate(-90deg) translateY(-50%)',
              fontSize: 9, color: muted, fontWeight: 600, textTransform: 'uppercase' as const,
              letterSpacing: '0.08em', whiteSpace: 'nowrap' as const, transformOrigin: 'center center',
            }}>
              {d.axes.y}
            </div>
          )}

          {/* Chart container */}
          <div style={{
            position: 'relative' as const,
            width: '100%', height: 260,
            background: '#fafafa',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            marginLeft: 12,
            overflow: 'hidden',
          }}>
            {/* Grid lines */}
            <div style={{ position: 'absolute' as const, left: '50%', top: 0, bottom: 0, width: 1, background: '#e5e7eb' }} />
            <div style={{ position: 'absolute' as const, top: '50%', left: 0, right: 0, height: 1, background: '#e5e7eb' }} />

            {/* Quadrant labels */}
            <span style={{ position: 'absolute' as const, top: 6, left: 6, fontSize: 8, color: '#d1d5db' }}>High Y / Low X</span>
            <span style={{ position: 'absolute' as const, top: 6, right: 6, fontSize: 8, color: '#d1d5db' }}>High Y / High X</span>
            <span style={{ position: 'absolute' as const, bottom: 6, left: 6, fontSize: 8, color: '#d1d5db' }}>Low Y / Low X</span>
            <span style={{ position: 'absolute' as const, bottom: 6, right: 6, fontSize: 8, color: '#d1d5db' }}>Low Y / High X</span>

            {/* Competitor dots */}
            {players.map((player, i) => {
              const xPct = toPercent(player.x)
              const yPct = 100 - toPercent(player.y) // invert y so high=top
              const dotColor = PLAYER_COLORS[i % PLAYER_COLORS.length]
              return (
                <div key={i} style={{
                  position: 'absolute' as const,
                  left: `${xPct}%`,
                  top: `${yPct}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 2,
                }}>
                  <div title={player.description} style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: dotColor,
                    boxShadow: `0 0 0 3px ${dotColor}30`,
                  }} />
                  <span style={{
                    position: 'absolute' as const,
                    top: -14, left: '50%', transform: 'translateX(-50%)',
                    fontSize: 9, fontWeight: 700, color: dotColor,
                    whiteSpace: 'nowrap' as const,
                    background: '#fafafa', paddingInline: 2,
                  }}>
                    {player.name}
                  </span>
                </div>
              )
            })}

            {/* Our position — highlighted star */}
            {ourPos && (
              <div style={{
                position: 'absolute' as const,
                left: `${toPercent(ourPos.x)}%`,
                top: `${100 - toPercent(ourPos.y)}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 3,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: blue,
                  boxShadow: `0 0 0 4px ${blue}40`,
                  border: '2px solid #fff',
                }} />
                <span style={{
                  position: 'absolute' as const,
                  bottom: -14, left: '50%', transform: 'translateX(-50%)',
                  fontSize: 9, fontWeight: 800, color: blue,
                  whiteSpace: 'nowrap' as const,
                  background: '#fafafa', paddingInline: 2,
                }}>
                  US
                </span>
              </div>
            )}
          </div>

          {/* X axis label */}
          {d.axes?.x && (
            <p style={{ textAlign: 'center' as const, fontSize: 9, color: muted, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: 6, marginLeft: 12 }}>
              {d.axes.x}
            </p>
          )}
        </div>

        {/* Legend */}
        {players.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, marginTop: 10 }}>
            {players.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: PLAYER_COLORS[i % PLAYER_COLORS.length] }} />
                <span style={{ fontSize: 10, color: muted }}>{p.name}</span>
              </div>
            ))}
            {ourPos && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: blue, border: '1px solid white', boxShadow: `0 0 0 2px ${blue}50` }} />
                <span style={{ fontSize: 10, color: blue, fontWeight: 700 }}>Us</span>
              </div>
            )}
          </div>
        )}
      </CardContent></Card>

      {/* Our position rationale */}
      {ourPos?.rationale && (
        <div style={{ padding: '10px 14px', background: `${blue}08`, border: `1px solid ${blue}25`, borderRadius: 10 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: blue, marginBottom: 4 }}>Our Position</p>
          <p style={{ fontSize: 12, color: ink, lineHeight: 1.6 }}>{ourPos.rationale}</p>
        </div>
      )}

      {/* Players detail */}
      {players.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Players</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {players.map((player, i) => {
              const dotColor = PLAYER_COLORS[i % PLAYER_COLORS.length]
              return (
                <div key={i} style={{ borderLeft: `3px solid ${dotColor}`, paddingLeft: 10 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 2 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: ink }}>{player.name}</p>
                    {player.funding && <span style={pill(dotColor)}>{player.funding}</span>}
                  </div>
                  {player.description && <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: player.weakness ? 3 : 0 }}>{player.description}</p>}
                  {player.weakness && <p style={{ fontSize: 11, color: amber }}>Weakness: {player.weakness}</p>}
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Whitespace */}
      {d.whitespace && d.whitespace.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Whitespace Opportunities</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.whitespace.map((ws, i) => (
              <div key={i} style={{ padding: '8px 10px', background: `${green}08`, border: `1px solid ${green}25`, borderRadius: 8 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: green, marginBottom: ws.opportunity ? 3 : 0 }}>{ws.area}</p>
                {ws.opportunity && <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{ws.opportunity}</p>}
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Summary</p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.summary}</p>
        </CardContent></Card>
      )}

    </div>
  )
}
