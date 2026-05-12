'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9F7F2',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: '0 24px' }}>
        <div style={{
          fontSize: 72,
          fontWeight: 700,
          color: '#E2DDD5',
          lineHeight: 1,
          marginBottom: 16,
        }}>404</div>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: '#18160F', margin: '0 0 12px' }}>
          Page not found
        </h1>
        <p style={{ fontSize: 15, color: '#8A867C', margin: '0 0 32px', lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-block',
            background: '#18160F',
            color: '#F9F7F2',
            padding: '10px 24px',
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            textDecoration: 'none',
          }}
        >
          Go back home
        </Link>
      </div>
    </div>
  )
}
