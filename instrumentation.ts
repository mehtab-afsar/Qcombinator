/**
 * Next.js instrumentation hook — runs once at server startup.
 * Validates all required environment variables before the first request is served.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      const { validateRequiredEnv } = await import('./lib/env')
      validateRequiredEnv()
    } catch (error) {
      console.error('[instrumentation] Failed to validate environment variables:', error)
      throw error
    }
  }
}
