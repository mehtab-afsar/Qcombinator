import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Edge Alpha — AI-Powered Startup OS'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          background: '#18160F',
          padding: '72px 80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 13,
              background: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#fff', fontWeight: 900, fontSize: 14, letterSpacing: '0.05em' }}>EA</span>
          </div>
          <span style={{ color: '#F9F7F2', fontWeight: 600, fontSize: 24, letterSpacing: '-0.02em' }}>
            Edge Alpha
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(37, 99, 235, 0.4)',
              borderRadius: 999,
              padding: '6px 20px',
              marginBottom: 8,
            }}
          >
            <span style={{ color: '#60A5FA', fontSize: 15, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              AI-Powered Startup OS
            </span>
          </div>
          <h1
            style={{
              color: '#F9F7F2',
              fontSize: 72,
              fontWeight: 300,
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              margin: 0,
            }}
          >
            Your startup&apos;s
            <br />
            <span style={{ color: '#2563EB', fontWeight: 600 }}>unfair advantage.</span>
          </h1>
          <p style={{ color: '#8A867C', fontSize: 22, margin: 0, lineHeight: 1.5, maxWidth: 700 }}>
            Q-Score · 9 AI Agents · Investor Matching
          </p>
        </div>

        {/* Bottom row — stats */}
        <div style={{ display: 'flex', gap: 48 }}>
          {[
            { label: 'Q-Score', value: '6 Dimensions' },
            { label: 'AI Agents', value: '9 Advisors' },
            { label: 'Coverage', value: 'Full Stack' },
          ].map((stat) => (
            <div key={stat.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ color: '#F9F7F2', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em' }}>
                {stat.value}
              </span>
              <span style={{ color: '#8A867C', fontSize: 14, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
