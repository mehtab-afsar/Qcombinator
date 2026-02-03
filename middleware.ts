import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // If Supabase not configured, skip auth checks (development mode)
  if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-supabase-url-here') {
    console.warn('⚠️  Supabase not configured - skipping auth middleware')
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refreshing the auth token
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect founder routes - require authentication
  // But allow public access to onboarding and assessment
  const publicFounderRoutes = ['/founder/onboarding', '/founder/assessment']
  const isPublicFounderRoute = publicFounderRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (request.nextUrl.pathname.startsWith('/founder') && !isPublicFounderRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/founder/onboarding'
      return NextResponse.redirect(url)
    }

    // Q-Score gate for marketplace - require score >= 65
    if (request.nextUrl.pathname === '/founder/matching') {
      const { data: qScore } = await supabase
        .from('qscore_history')
        .select('overall_score')
        .eq('user_id', user.id)
        .order('calculated_at', { ascending: false })
        .limit(1)
        .single()

      if (!qScore || qScore.overall_score < 65) {
        const url = request.nextUrl.clone()
        url.pathname = '/founder/improve-qscore'
        return NextResponse.redirect(url)
      }
    }
  }

  // Protect investor routes - allow public access to onboarding
  const publicInvestorRoutes = ['/investor/onboarding']
  const isPublicInvestorRoute = publicInvestorRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (request.nextUrl.pathname.startsWith('/investor') && !isPublicInvestorRoute) {
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/investor/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
