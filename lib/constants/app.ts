export const APP_NAME     = 'Edge Alpha'
export const APP_TAGLINE  = 'AI-Powered Startup OS'
export const APP_DOMAIN   = 'edgealpha.vc'
export const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? `https://${APP_DOMAIN}`
// EMAIL_FROM_OVERRIDE is local-dev-only (set in .env.local, never in production) — lets a
// developer's own Resend key send from a domain it actually has verified, without touching
// what production sends from.
export const APP_EMAIL_FROM = `${APP_NAME} <${process.env.EMAIL_FROM_OVERRIDE ?? `noreply@${APP_DOMAIN}`}>`
