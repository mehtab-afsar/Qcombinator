'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error.digest ?? '', error)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F9F7F2',
        fontFamily: 'system-ui, sans-serif',
        gap: 16,
        padding: 24,
        textAlign: 'center',
      }}>
        <p style={{ fontSize: 10, color: '#8A867C', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 600, margin: 0 }}>
          Critical error
        </p>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: '#18160F', margin: 0 }}>
          The application crashed unexpectedly
        </h2>
        {error.digest && (
          <p style={{ fontSize: 11, color: '#8A867C', fontFamily: 'monospace', margin: 0 }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            marginTop: 8,
            padding: '9px 24px',
            background: '#18160F',
            color: '#F9F7F2',
            border: 'none',
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Reload app
        </button>
      </body>
    </html>
  )
}
