import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// ─── Sliding-window rate limiter (Upstash Redis, cross-instance) ─────────────
const RATE_LIMIT_RULES: Record<string, { requests: number; window: string }> = {
  '/api/agents/chat':         { requests: 12, window: '1 m'  },
  '/api/agents/generate':     { requests: 5,  window: '1 m'  },
  '/api/qscore/calculate':    { requests: 5,  window: '1 m'  },
  '/api/agents/research':     { requests: 10, window: '1 m'  },
  '/api/qscore/actions':      { requests: 6,  window: '1 m'  },
  '/api/analyze-pitch':       { requests: 8,  window: '1 m'  },
  '/api/auth/signup':         { requests: 5,  window: '60 m' },
  '/api/auth/reset-password': { requests: 3,  window: '15 m' },
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
 *  - /founder/*  → requires auth (except /founder/onboarding)
 *  - /investor/* → requires auth (except /investor/onboarding)
 *
 * Public routes (no auth required):
 *  - /login, /signup, /
 *  - /founder/onboarding (new users signing up)
 *  - /investor/onboarding
 *  - /api/*  (API routes handle their own auth)
 *  - /s/*    (public PMF survey pages)
 *  - /apply/* (public job application pages)
 */

// Routes that don't require authentication
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/founder/onboarding',
  '/founder/profile-builder',
  '/investor/onboarding',
]

// Prefixes that are always public (no session refresh needed)
const PUBLIC_PREFIXES = ['/s/', '/apply/', '/pitch/', '/_next/', '/favicon.ico']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true
  if (PUBLIC_PATHS.includes(pathname)) return true
  return false
}

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/founder/') || pathname.startsWith('/investor/') || pathname === '/feed'
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
      const rlResult = await limiter.limit(`${ip}:${pathname}`)
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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // For API routes: session has been refreshed (cookies updated), let the route
  // handle its own auth — do NOT redirect
  if (pathname.startsWith('/api/')) {
    if (rlHeaders) {
      Object.entries(rlHeaders).forEach(([k, v]) => response.headers.set(k, v))
    }
    return response
  }

  if (!user && isProtectedRoute(pathname)) {
    // Redirect to login, preserving the intended destination for post-login redirect
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Role-based redirect — only on root dashboard pages to keep middleware fast
  if (user) {
    if (pathname === '/founder/dashboard' || pathname === '/founder') {
      const { data: fp } = await supabase
        .from('founder_profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!fp || fp.role !== 'founder') {
        return NextResponse.redirect(new URL('/investor/dashboard', request.url))
      }
    } else if (pathname === '/investor/dashboard' || pathname === '/investor') {
      const { data: ip } = await supabase
        .from('investor_profiles')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (!ip) {
        return NextResponse.redirect(new URL('/investor/onboarding', request.url))
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
