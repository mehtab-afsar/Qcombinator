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

const TREND_ICON: Record<string, string> = { up: '↑', down: '↓', flat: '→' }
const TREND_COLOR: Record<string, string> = { up: green, down: red, flat: muted }

const DECISION_COLOR: Record<string, string> = {
  ship: green, kill: red, iterate: amber, 'ship it': green, 'kill it': red,
}

export function GrowthReportRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    headline?: string
    metrics?: {
      momGrowthRate?: string
      newCustomers?: string
      totalCustomers?: string
      cac?: string
      cacByChannel?: Record<string, string>
      viralCoefficient?: string
      topFunnelVolume?: string
      activationRate?: string
      funnelConversion?: string
    }
    channelPerformance?: {
      channel: string
      trend: string
      insight: string
      action: string
    }[]
    experimentsRunning?: string[]
    lastWeekExperiment?: {
      experiment?: string
      result?: string
      decision?: string
    }
    nextWeekFocus?: string
    alerts?: string[]
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Headline — Big Text */}
      {d.headline && (
        <div style={{ padding: '14px 16px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 12 }}>
          <p style={{ fontSize: 18, fontWeight: 800, color: ink, lineHeight: 1.4 }}>{d.headline}</p>
        </div>
      )}

      {/* Alerts — Red if any */}
      {d.alerts && d.alerts.length > 0 && (
        <div style={{ padding: '12px 14px', background: `${red}0C`, border: `2px solid ${red}35`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: red, marginBottom: 8 }}>Alerts</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {d.alerts.map((alert, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: red, fontSize: 14, lineHeight: 1.3, flexShrink: 0 }}>!</span>
                <p style={{ fontSize: 12, color: red, fontWeight: 600, lineHeight: 1.5 }}>{alert}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Core Metrics Stats Grid */}
      {d.metrics && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Core Metrics</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 10 }}>
            {d.metrics.momGrowthRate && (
              <div style={{ padding: '10px 12px', background: `${green}10`, border: `1px solid ${green}25`, borderRadius: 10 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: green }}>{d.metrics.momGrowthRate}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>MoM Growth</p>
              </div>
            )}
            {d.metrics.newCustomers && (
              <div style={{ padding: '10px 12px', background: `${blue}08`, border: `1px solid ${blue}20`, borderRadius: 10 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: blue }}>{d.metrics.newCustomers}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>New Customers</p>
              </div>
            )}
            {d.metrics.totalCustomers && (
              <div style={{ padding: '10px 12px', background: `${muted}08`, border: `1px solid ${muted}20`, borderRadius: 10 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: ink }}>{d.metrics.totalCustomers}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Total Customers</p>
              </div>
            )}
            {d.metrics.cac && (
              <div style={{ padding: '10px 12px', background: `${amber}08`, border: `1px solid ${amber}20`, borderRadius: 10 }}>
                <p style={{ fontSize: 22, fontWeight: 800, color: amber }}>{d.metrics.cac}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>Blended CAC</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {d.metrics.viralCoefficient && <span style={pill(green)}>Viral K: {d.metrics.viralCoefficient}</span>}
            {d.metrics.activationRate && <span style={pill(blue)}>Activation: {d.metrics.activationRate}</span>}
            {d.metrics.topFunnelVolume && <span style={pill(muted)}>Top Funnel: {d.metrics.topFunnelVolume}</span>}
          </div>
        </CardContent></Card>
      )}

      {/* CAC by Channel — Comparative List */}
      {d.metrics?.cacByChannel && Object.keys(d.metrics.cacByChannel).length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>CAC by Channel</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(d.metrics.cacByChannel).map(([ch, cac], i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <p style={{ fontSize: 12, color: ink, flex: 1, fontWeight: 500 }}>{ch}</p>
                <div style={{ flex: 2, height: 6, background: `${muted}20`, borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, (i + 1) * 20)}%`, height: '100%', background: blue, borderRadius: 3 }} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, color: ink, minWidth: 48, textAlign: 'right' }}>{cac}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Funnel Conversion — Text-Based Funnel */}
      {d.metrics?.funnelConversion && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Funnel Conversion</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
            {['Visitor', 'Lead', 'Trial', 'Customer'].map((stage, i) => (
              <div key={i} style={{
                width: `${100 - i * 16}%`,
                padding: '6px 0',
                background: i === 3 ? `${green}18` : `${blue}${['18', '12', '0C', '08'][i]}`,
                borderRadius: 6,
                textAlign: 'center',
                fontSize: 11,
                fontWeight: 600,
                color: i === 3 ? green : ink,
              }}>
                {stage}
              </div>
            ))}
            <p style={{ fontSize: 11, color: muted, marginTop: 4 }}>Overall: {d.metrics.funnelConversion}</p>
          </div>
        </CardContent></Card>
      )}

      {/* Channel Performance — Trend Arrows */}
      {d.channelPerformance && d.channelPerformance.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Channel Performance</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.channelPerformance.map((ch, i) => {
              const trendKey = ch.trend?.toLowerCase()
              const trendColor = TREND_COLOR[trendKey] ?? muted
              const trendIcon = TREND_ICON[trendKey] ?? '→'
              return (
                <div key={i} style={{ padding: '10px 12px', border: `1px solid ${muted}20`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 18, fontWeight: 800, color: trendColor, lineHeight: 1 }}>{trendIcon}</span>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, flex: 1 }}>{ch.channel}</p>
                    <span style={pill(trendColor)}>{ch.trend}</span>
                  </div>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 4 }}>{ch.insight}</p>
                  <p style={{ fontSize: 11, color: blue, fontWeight: 600 }}>Action: {ch.action}</p>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Experiments Running */}
      {d.experimentsRunning && d.experimentsRunning.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Experiments Running</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {d.experimentsRunning.map((exp, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: 999, background: amber, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: ink, lineHeight: 1.5 }}>{exp}</p>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* Last Week's Experiment — Ship/Kill/Iterate Badge */}
      {d.lastWeekExperiment && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Last Week&apos;s Experiment</p>
          {d.lastWeekExperiment.experiment && (
            <p style={{ fontSize: 13, fontWeight: 700, color: ink, marginBottom: 8 }}>{d.lastWeekExperiment.experiment}</p>
          )}
          {d.lastWeekExperiment.result && (
            <p style={{ fontSize: 12, color: muted, lineHeight: 1.6, marginBottom: 10 }}>{d.lastWeekExperiment.result}</p>
          )}
          {d.lastWeekExperiment.decision && (
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', borderRadius: 8, background: `${DECISION_COLOR[d.lastWeekExperiment.decision.toLowerCase()] ?? muted}15`, border: `2px solid ${DECISION_COLOR[d.lastWeekExperiment.decision.toLowerCase()] ?? muted}40` }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: DECISION_COLOR[d.lastWeekExperiment.decision.toLowerCase()] ?? ink, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {d.lastWeekExperiment.decision}
              </p>
            </div>
          )}
        </CardContent></Card>
      )}

      {/* Next Week Focus — Bold CTA */}
      {d.nextWeekFocus && (
        <div style={{ padding: '14px 16px', background: `${green}0C`, border: `2px solid ${green}30`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: green, marginBottom: 8 }}>Next Week Focus</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: ink, lineHeight: 1.5 }}>{d.nextWeekFocus}</p>
        </div>
      )}
    </div>
  )
}
