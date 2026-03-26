import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Sliding-window rate limiter (in-memory, per Vercel instance) ─────────────
// Catches runaway clients per serverless instance. For cross-instance limits, add Upstash Redis.
const RL_WINDOW_MS = 60_000
const rateLimitStore = new Map<string, number[]>()

const RATE_LIMIT_RULES: [string, number][] = [
  ['/api/agents/chat',      12],
  ['/api/agents/generate',   5],
  ['/api/qscore/calculate',  5],
  ['/api/agents/research',  10],
  ['/api/qscore/actions',    6],
  ['/api/analyze-pitch',     8],
]

function getRateLimit(pathname: string): number | null {
  for (const [prefix, limit] of RATE_LIMIT_RULES) {
    if (pathname === prefix || pathname.startsWith(prefix + '?') || pathname.startsWith(prefix + '/')) return limit
  }
  return null
}

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now()
  const windowStart = now - RL_WINDOW_MS
  const hits = (rateLimitStore.get(key) ?? []).filter(ts => ts > windowStart)
  if (hits.length >= limit) return false
  hits.push(now)
  rateLimitStore.set(key, hits)
  if (rateLimitStore.size > 5000) {
    for (const [k, v] of rateLimitStore) {
      if (v.every(ts => ts < windowStart)) rateLimitStore.delete(k)
    }
  }
  return true
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
const PUBLIC_PREFIXES = ['/s/', '/apply/', '/_next/', '/favicon.ico']

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))) return true
  if (PUBLIC_PATHS.includes(pathname)) return true
  return false
}

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith('/founder/') || pathname.startsWith('/investor/')
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Rate limiting on expensive AI/compute API routes ──────────────────────
  const rateLimit = getRateLimit(pathname)
  if (rateLimit !== null) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? request.headers.get('x-real-ip')
      ?? 'unknown'
    const key = `${ip}:${pathname}`
    if (!checkRateLimit(key, rateLimit)) {
      return NextResponse.json(
        { error: 'Too many requests — please wait a moment and try again.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
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
    return response
  }

  if (!user && isProtectedRoute(pathname)) {
    // Redirect to login, preserving the intended destination for post-login redirect
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
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
