/**
 * Typed, validated access to environment variables.
 * Import this module instead of reading process.env directly so missing vars
 * surface as early as possible with a clear error message.
 */

function requireEnv(key: string): string {
  const v = process.env[key]
  if (!v) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
      `Check your .env.local file or deployment environment.`
    )
  }
  return v
}

function optionalEnv(key: string, fallback = ''): string {
  return process.env[key] ?? fallback
}

export const env = {
  // Supabase
  get supabaseUrl()        { return requireEnv('NEXT_PUBLIC_SUPABASE_URL') },
  get supabaseAnonKey()    { return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') },
  get supabaseServiceKey() { return requireEnv('SUPABASE_SERVICE_ROLE_KEY') },

  // AI
  get openrouterKey()      { return requireEnv('OPENROUTER_API_KEY') },
  get anthropicKey()       { return optionalEnv('ANTHROPIC_API_KEY') },

  // Stripe
  get stripeSecretKey()    { return optionalEnv('STRIPE_SECRET_KEY') },
  get stripeWebhookSecret(){ return optionalEnv('STRIPE_WEBHOOK_SECRET') },

  // App
  get appUrl()             { return optionalEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000') },

  // Resend
  get resendApiKey()       { return optionalEnv('RESEND_API_KEY') },
}

/**
 * Call at server startup (e.g. in instrumentation.ts) to validate all
 * required vars are present before the first request is served.
 */
export function validateRequiredEnv(): void {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENROUTER_API_KEY',
  ]
  const missing = required.filter(k => !process.env[k])
  if (missing.length > 0) {
    throw new Error(
      `[env] Server cannot start — missing required environment variables:\n` +
      missing.map(k => `  • ${k}`).join('\n')
    )
  }
}
