/**
 * Next.js instrumentation hook — runs once at server startup.
 * Initialises Sentry and validates required environment variables.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')

    try {
      const { validateRequiredEnv } = await import('./lib/env')
      validateRequiredEnv()
    } catch (error) {
      console.error('[instrumentation] Failed to validate environment variables:', error)
      throw error
    }
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

