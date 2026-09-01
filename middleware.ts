import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { isEmailConfirmed } from '@/lib/auth/email-confirmed'
import { log } from '@/lib/logger'

// ─── Sliding-window rate limiter (Upstash Redis, cross-instance) ─────────────
const RATE_LIMIT_RULES: Record<string, { requests: number; window: string }> = {
  '/api/agents/chat':         { requests: 12, window: '1 m'  },
  '/api/agents/generate':     { requests: 5,  window: '1 m'  },
  '/api/qscore/calculate':    { requests: 5,  window: '1 m'  },
  '/api/agents/research':     { requests: 10, window: '1 m'  },
  '/api/qscore/actions':      { requests: 6,  window: '1 m'  },
  '/api/rhythm/run':          { requests: 3,  window: '60 m' }, // a cycle is several paid LLM calls
  '/api/profile-builder/submit': { requests: 5, window: '1 m' },
  '/api/profile-builder/reset':  { requests: 5, window: '1 m' },

  '/api/auth/signup':         { requests: 5,  window: '60 m' },
  '/api/auth/reset-password': { requests: 3,  window: '15 m' },

  '/api/leverage-check/submit':     { requests: 8,  window: '1 m' }, // public, anonymous, LLM-cost-driven
  '/api/leverage-check/link-email': { requests: 10, window: '1 m' }, // public, anonymous, DB write only

  // An uncached lookup is ~11 Tavily calls + one LLM extraction call, roughly 8-10x
  // leverage-check/submit's cost — scaled down proportionally from its 8/min. Not tighter than
  // 3/min because the domain-keyed 30-day cache already makes repeat-same-domain abuse free; this
  // limit's real job is bounding distinct-domain scripted abuse.
  '/api/qscore-lite/submit':        { requests: 3,  window: '1 m' },
  '/api/qscore-lite/link-email':    { requests: 10, window: '1 m' }, // public, anonymous, DB write only
}

let _redis: Redis | null = null
let _redisUnavailable = false
const _limiters = new Map<string, Ratelimit>()

function getRedis(): Redis | null {
  if (_redisUnavailable) return null
  if (!_redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) { _redisUnavailable = true; return null }
    try { _redis = new Redis({ url, token }) } catch { _redisUnavailable = true; return null }
  }
  return _redis
}

function getLimiter(rule: { requests: number; window: string }): Ratelimit | null {
  const redis = getRedis()
  if (!redis) return null
  const key = `${rule.requests}:${rule.window}`
  if (!_limiters.has(key)) {
    _limiters.set(key, new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(rule.requests, rule.window as Parameters<typeof Ratelimit.slidingWindow>[1]),
    }))
  }
  return _limiters.get(key)!
}

function matchRateLimit(pathname: string): { rule: { requests: number; window: string }; windowSecs: number } | null {
  for (const [prefix, rule] of Object.entries(RATE_LIMIT_RULES)) {
    if (pathname === prefix || pathname.startsWith(prefix + '?') || pathname.startsWith(prefix + '/')) {
      const [qty, unit] = rule.window.split(' ')
      const windowSecs = parseInt(qty) * (unit === 'm' ? 60 : unit === 'h' ? 3600 : 1)
      return { rule, windowSecs }
    }
  }
  return null
}

/**
 * Next.js Middleware — Server-side route protection.
 *
 * Runs before every request (except static assets). Protects:
 *  - /founder/*  → requires auth (except /founder/onboarding, /founder/profile-builder)
 *  - /investor/* → requires auth (except /investor/onboarding)
 *
 * Public routes (no auth required):
 *  - /login, /signup, /
 *  - /founder/onboarding (new users signing up)
 *  - /founder/join, /investor/join (invite links — must work for a logged-out invitee)
 *  - /leverage-check, /qscore-lite (public anonymous tools — no session check needed)
 *  - /investor/onboarding
 *  - /api/*  (API routes handle their own auth)
 *  - /s/*    (public PMF survey pages)
 *  - /apply/* (public job application pages)
 *
 * ⚠️ An authenticated founder or investor is ALSO blocked from every /founder/** or /investor/**
 * page (redirected to /founder/verify-email or /investor/verify-email) until Supabase's own
 * user.email_confirmed_at is set (see lib/auth/email-confirmed.ts). This is real for
 * email/password sign-ups — /api/auth/signup and /api/auth/investor-signup leave it null until
 * the link in Supabase's confirmation email is clicked. A Google sign-up never sees this: Google
 * already verified the address, so Supabase marks it confirmed at account creation.
 */

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/founder/onboarding',
  '/founder/profile-builder',
  '/investor/onboarding',
  '/leverage-check',
  '/qscore-lite',
]

// Requires auth, but exempt from the email-confirmation gate below — an unconfirmed founder or
// investor must be able to REACH their own gate page, or the gate has no way out.
const CONFIRMATION_GATE_EXEMPT = ['/founder/verify-email', '/investor/verify-email']

// Prefixes that are always public (no session refresh needed)
const PUBLIC_PREFIXES = ['/s/', '/apply/', '/pitch/', '/q/', '/founder/join', '/investor/join', '/_next/', '/favicon.ico']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true
  if (PUBLIC_PATHS.includes(pathname)) return true
  return false
}

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/founder/') || pathname.startsWith('/investor/') || pathname === '/feed'
}

// ─── Bounded network calls — one slow dependency must not freeze every request ────────────────
//
// Middleware runs in front of nearly every request (see `matcher` below). Each of the four
// network calls below used to have no timeout of its own — when Supabase or Upstash had a slow
// moment, the request just hung until Vercel's own platform limit killed it
// (MIDDLEWARE_INVOCATION_TIMEOUT), taking down every request site-wide at once, not just the
// affected one. A TIMED_OUT sentinel (not a fabricated fallback value) lets each call site tell
// "timed out, we don't actually know" apart from "genuinely resolved to no session" — that
// distinction is what lets a real founder avoid being bounced to /login over a one-off blip,
// while a genuine "not logged in" still redirects exactly as before. Scoped to hangs only: a
// call that quickly rejects/errors is a different, separately-reviewable problem.
const NETWORK_TIMEOUT_MS = 5_000
const TIMED_OUT = Symbol('timed-out')

// PromiseLike, not Promise — Supabase's query builder is thenable but not a true Promise
// instance (no .catch/.finally), so it fails a strict Promise<T> parameter type even though
// `await` and Promise.race both accept it fine at runtime.
async function withTimeout<T>(promise: PromiseLike<T>, ms = NETWORK_TIMEOUT_MS): Promise<T | typeof TIMED_OUT> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<typeof TIMED_OUT>(resolve => { timer = setTimeout(() => resolve(TIMED_OUT), ms) })
  const result = await Promise.race([promise, timeout])
  clearTimeout(timer!)
  return result
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting on API routes (AI/compute + auth endpoints) ────────────
  // rlHeaders is populated when a rate-limited route is allowed; it's applied
  // to the response below so clients can self-throttle before hitting 429.
  // Falls back gracefully when UPSTASH_REDIS_REST_URL is not configured.
  let rlHeaders: Record<string, string> | null = null
  const rateMatch = matchRateLimit(pathname)
  if (rateMatch !== null) {
    const limiter = getLimiter(rateMatch.rule)
    if (limiter) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        ?? request.headers.get('x-real-ip')
        ?? 'unknown'
      const rlResult = await withTimeout(limiter.limit(`${ip}:${pathname}`))
      if (rlResult === TIMED_OUT) {
        // Same graceful degradation as Upstash not being configured at all — skip throttling
        // for this one request rather than hang the whole site on a slow Redis call.
        log.warn('rate limit check timed out — allowing the request through', { route: pathname })
      } else {
        const resetSecs = Math.ceil((rlResult.reset - Date.now()) / 1000)
        if (!rlResult.success) {
          return NextResponse.json(
            { error: 'Too many requests — please wait a moment and try again.' },
            { status: 429, headers: {
              'Retry-After':           String(Math.max(resetSecs, 1)),
              'X-RateLimit-Limit':     String(rateMatch.rule.requests),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset':     String(Math.ceil(rlResult.reset / 1000)),
            }}
          )
        }
        rlHeaders = {
          'X-RateLimit-Limit':     String(rateMatch.rule.requests),
          'X-RateLimit-Remaining': String(rlResult.remaining),
          'X-RateLimit-Reset':     String(Math.ceil(rlResult.reset / 1000)),
        }
      }
    }
  }

  // ── CSRF: verify Origin header on state-changing API requests ─────────────
  // The Origin header is only present on cross-origin requests and on same-origin
  // requests for non-GET/HEAD methods in modern browsers. We only block when the
  // header IS present and does NOT match, to avoid false positives on server-to-server
  // calls (which omit Origin entirely).
  if (pathname.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    const origin = request.headers.get('origin')
    const host = request.headers.get('host')
    if (origin && host) {
      try {
        const originHost = new URL(origin).host
        if (originHost !== host) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
      } catch {
        // Malformed Origin header — reject the request
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  // Pass through static/public routes immediately — no Supabase call needed
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase is not configured, pass through
  if (
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl === 'your-supabase-url-here' ||
    supabaseUrl === 'https://your-project.supabase.co'
  ) {
    return NextResponse.next()
  }

  // Create a response to pass to Supabase (so it can write refreshed session cookies)
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Forward set-cookie to the response
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request: { headers: request.headers } })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  })

  // getUser() is preferred over getSession() — validates the JWT against Supabase
  const userResult = await withTimeout(supabase.auth.getUser())
  const authTimedOut = userResult === TIMED_OUT
  if (authTimedOut) log.warn('auth check timed out in middleware', { route: pathname })
  // On a timeout we don't know who this is — never treat that the same as a genuine "no
  // session" (that would bounce a real founder to /login over a one-off blip). `user` is only
  // null here for a genuine unauthenticated request; authTimedOut carries the "unknown" case.
  const user = authTimedOut ? null : userResult.data.user

  // For API routes: session has been refreshed (cookies updated), let the route
  // handle its own auth — do NOT redirect
  if (pathname.startsWith('/api/')) {
    if (rlHeaders) {
      Object.entries(rlHeaders).forEach(([k, v]) => response.headers.set(k, v))
    }
    return response
  }

  if (!user && !authTimedOut && isProtectedRoute(pathname)) {
    // Redirect to login, preserving the intended destination for post-login redirect.
    // Must include the query string, not just pathname — e.g. /founder/join?teamToken=...
    // would otherwise arrive back with the invite token silently dropped.
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  // Access + email-confirmation check. Uses a short-lived cookie (5 min) to skip the DB lookup
  // on repeat navigations.
  //
  // One person can legitimately hold BOTH a founder_profiles row and an investor_profiles row
  // (e.g. a founder who also angel-invests) — access to each side is gated purely on whether
  // that side's row exists, never on the other side's presence. founder_profiles.role is NOT
  // used as an access gate: it used to be ("role !== 'founder' → bounce to investor dashboard"),
  // which meant the moment someone completed investor onboarding, this gate permanently locked
  // them out of the founder side with no way back — the actual mechanism behind a prior bug
  // where completing investor onboarding orphaned a founder's own account. role stays on the
  // row as an informational "primary/default" hint only (e.g. which dashboard to land on after
  // a plain login) — never as a lock.
  //
  // ⚠️ This runs on every /founder/** and /investor/** page, not just the dashboard root. It has
  // to: the whole point of the confirmation gate is that an unconfirmed founder gets NO founder
  // page, not just a blocked dashboard — and the investor side needs the same full-path coverage
  // so a founder-only session can't reach investor pages just by knowing the URL.
  if (user) {
    if (pathname === '/founder' || pathname.startsWith('/founder/')) {
      const cachedRole = request.cookies.get('role_verified')?.value
      if (cachedRole !== 'founder' && !CONFIRMATION_GATE_EXEMPT.includes(pathname)) {
        const fpResult = await withTimeout(
          supabase.from('founder_profiles').select('user_id, onboarding_completed').eq('user_id', user.id).maybeSingle()
        )
        if (fpResult === TIMED_OUT) {
          // Don't guess — skip the gate for this one request rather than wrongly bounce a real,
          // fully-set-up founder to onboarding. Not setting role_verified means the very next
          // request re-checks once the dependency recovers, instead of caching a skipped check.
          log.warn('founder_profiles lookup timed out in middleware', { userId: user.id })
        } else {
          const { data: fp } = fpResult
          if (!fp) {
            // No founder profile — send them to create one, regardless of whether they also
            // have an investor profile (dual-role is allowed; it isn't assumed).
            return NextResponse.redirect(new URL('/founder/onboarding', request.url))
          }
          if (!fp.onboarding_completed) {
            // A row exists but onboarding was never finished — e.g. a Google sign-up's stub
            // row (created on first OAuth callback so they aren't orphaned mid-flow). Row
            // presence alone used to be treated as "done," which let an incomplete founder
            // straight into the dashboard on any later visit. Existence is not completion.
            return NextResponse.redirect(new URL('/founder/onboarding', request.url))
          }
          if (!isEmailConfirmed(user)) {
            // A Google sign-up never lands here — Supabase marks it confirmed at creation, since
            // Google already verified the address. Only an unconfirmed email/password sign-up
            // is blocked.
            return NextResponse.redirect(new URL('/founder/verify-email', request.url))
          }
          response.cookies.set('role_verified', 'founder', {
            maxAge: 300, httpOnly: true, sameSite: 'strict', path: '/',
          })
        }
      }
    } else if (pathname === '/investor' || pathname.startsWith('/investor/')) {
      const cachedRole = request.cookies.get('role_verified')?.value
      if (cachedRole !== 'investor' && !CONFIRMATION_GATE_EXEMPT.includes(pathname)) {
        const ipResult = await withTimeout(
          supabase.from('investor_profiles').select('user_id').eq('user_id', user.id).maybeSingle()
        )
        if (ipResult === TIMED_OUT) {
          log.warn('investor_profiles lookup timed out in middleware', { userId: user.id })
        } else {
          const { data: ip } = ipResult
          if (!ip) {
            return NextResponse.redirect(new URL('/investor/onboarding', request.url))
          }
          if (!isEmailConfirmed(user)) {
            return NextResponse.redirect(new URL('/investor/verify-email', request.url))
          }
          response.cookies.set('role_verified', 'investor', {
            maxAge: 300, httpOnly: true, sameSite: 'strict', path: '/',
          })
        }
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Public file extensions (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
