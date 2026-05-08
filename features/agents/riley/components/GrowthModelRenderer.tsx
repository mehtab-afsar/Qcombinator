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

const CHANNEL_STATUS_COLOR: Record<string, string> = {
  Scale: green, Optimize: blue, Pause: red, Test: amber,
}

const PRIORITY_COLOR: Record<string, string> = {
  high: red, medium: amber, low: green,
}

const EFFORT_COLOR: Record<string, string> = {
  high: red, medium: amber, low: green,
}

export function GrowthModelRenderer({ data }: { data: Record<string, unknown> }) {
  const d = data as {
    title?: string
    summary?: string
    currentState?: {
      momGrowthRate?: string
      primaryGrowthChannel?: string
      cac?: string
      ltv?: string
      ltvCacRatio?: string
      viralCoefficient?: string
    }
    growthBottleneck?: {
      bottleneck?: string
      evidence?: string
      impact?: string
    }
    channelAnalysis?: {
      channel: string
      status: string
      cac: string
      volume: string
      assessment: string
      recommendation: string
    }[]
    experimentRoadmap?: {
      experiment: string
      hypothesis: string
      channel: string
      duration: string
      successMetric: string
      effort: string
      priority: string
    }[]
    ninetyDayPlan?: {
      month1?: string
      month2?: string
      month3?: string
    }
    recommendation?: string
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary */}
      {d.summary && (
        <Card><CardContent className="pt-3 pb-3">
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.6 }}>{d.summary}</p>
        </CardContent></Card>
      )}

      {/* Current State — Big MoM Number */}
      {d.currentState && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Current Growth State</p>
          {d.currentState.momGrowthRate && (
            <div style={{ textAlign: 'center', padding: '12px 0 16px', borderBottom: `1px solid ${muted}20`, marginBottom: 14 }}>
              <p style={{ fontSize: 48, fontWeight: 800, color: green, lineHeight: 1 }}>{d.currentState.momGrowthRate}</p>
              <p style={{ fontSize: 11, color: muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>MoM Growth Rate</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {d.currentState.cac && (
              <div style={{ padding: '8px 10px', background: `${red}08`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: red }}>{d.currentState.cac}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>CAC</p>
              </div>
            )}
            {d.currentState.ltv && (
              <div style={{ padding: '8px 10px', background: `${green}08`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: green }}>{d.currentState.ltv}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>LTV</p>
              </div>
            )}
            {d.currentState.ltvCacRatio && (
              <div style={{ padding: '8px 10px', background: `${blue}08`, borderRadius: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 18, fontWeight: 700, color: blue }}>{d.currentState.ltvCacRatio}</p>
                <p style={{ fontSize: 10, color: muted, marginTop: 2 }}>LTV:CAC</p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {d.currentState.primaryGrowthChannel && (
              <span style={pill(blue)}>Primary: {d.currentState.primaryGrowthChannel}</span>
            )}
            {d.currentState.viralCoefficient && (
              <span style={pill(amber)}>Viral K={d.currentState.viralCoefficient}</span>
            )}
          </div>
        </CardContent></Card>
      )}

      {/* Growth Bottleneck — Prominent Callout */}
      {d.growthBottleneck && (
        <div style={{ padding: '14px 16px', background: `${red}0C`, border: `2px solid ${red}30`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: red, marginBottom: 8 }}>
            Bottleneck Identified
          </p>
          {d.growthBottleneck.bottleneck && (
            <p style={{ fontSize: 15, fontWeight: 700, color: ink, marginBottom: 8 }}>{d.growthBottleneck.bottleneck}</p>
          )}
          {d.growthBottleneck.evidence && (
            <p style={{ fontSize: 12, color: muted, marginBottom: 6, lineHeight: 1.5 }}>Evidence: {d.growthBottleneck.evidence}</p>
          )}
          {d.growthBottleneck.impact && (
            <p style={{ fontSize: 12, color: red, lineHeight: 1.5 }}>Impact: {d.growthBottleneck.impact}</p>
          )}
        </div>
      )}

      {/* Channel Analysis */}
      {d.channelAnalysis && d.channelAnalysis.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Channel Analysis</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.channelAnalysis.map((ch, i) => {
              const statusColor = CHANNEL_STATUS_COLOR[ch.recommendation] ?? muted
              return (
                <div key={i} style={{ padding: '10px 12px', background: `${statusColor}08`, border: `1px solid ${statusColor}25`, borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: ink, flex: 1 }}>{ch.channel}</p>
                    <span style={pill(statusColor)}>{ch.recommendation}</span>
                    <span style={{ ...pill(muted), fontSize: 9 }}>{ch.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
                    <p style={{ fontSize: 11, color: muted }}>CAC: <span style={{ color: ink, fontWeight: 600 }}>{ch.cac}</span></p>
                    <p style={{ fontSize: 11, color: muted }}>Volume: <span style={{ color: ink, fontWeight: 600 }}>{ch.volume}</span></p>
                  </div>
                  <p style={{ fontSize: 11, color: muted, lineHeight: 1.5 }}>{ch.assessment}</p>
                </div>
              )
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Experiment Roadmap */}
      {d.experimentRoadmap && d.experimentRoadmap.length > 0 && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>Experiment Roadmap</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {d.experimentRoadmap.map((exp, i) => (
              <div key={i} style={{ padding: '10px 12px', border: `1px solid ${muted}20`, borderRadius: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: PRIORITY_COLOR[exp.priority] ?? muted, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: ink, flex: 1 }}>{exp.experiment}</p>
                  <span style={pill(EFFORT_COLOR[exp.effort] ?? muted)}>{exp.effort} effort</span>
                </div>
                <p style={{ fontSize: 11, color: muted, lineHeight: 1.5, marginBottom: 6 }}>{exp.hypothesis}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span style={pill(blue)}>{exp.channel}</span>
                  <span style={{ ...pill(muted) }}>{exp.duration}</span>
                  <span style={{ fontSize: 10, color: muted, alignSelf: 'center' }}>Win: {exp.successMetric}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>
      )}

      {/* 90-Day Plan */}
      {d.ninetyDayPlan && (
        <Card><CardContent className="pt-4 pb-4">
          <p style={sectionHead}>90-Day Plan</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {(['month1', 'month2', 'month3'] as const).map((m, i) => {
              const monthColors = [blue, amber, green]
              const color = monthColors[i]
              return d.ninetyDayPlan![m] ? (
                <div key={m} style={{ padding: '10px 12px', background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 10 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Month {i + 1}</p>
                  <p style={{ fontSize: 11, color: ink, lineHeight: 1.5 }}>{d.ninetyDayPlan![m]}</p>
                </div>
              ) : null
            })}
          </div>
        </CardContent></Card>
      )}

      {/* Recommendation CTA */}
      {d.recommendation && (
        <div style={{ padding: '14px 16px', background: `${green}0C`, border: `2px solid ${green}30`, borderRadius: 12 }}>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: green, marginBottom: 8 }}>
            Riley&apos;s Recommendation
          </p>
          <p style={{ fontSize: 13, color: ink, lineHeight: 1.7 }}>{d.recommendation}</p>
        </div>
      )}
    </div>
  )
}
