import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isAuthPage = path.startsWith('/login') || path === '/'
  const isEmployeeRoute = path.startsWith('/employee')
  const isManagerRoute = path.startsWith('/manager')
  const isAdminRoute = path.startsWith('/admin')

  // Not logged in, trying to access protected route -> login
  if (!user && (isEmployeeRoute || isManagerRoute || isAdminRoute)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // If logged in, we need their role for routing
  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    const role = profile?.role

    // Redirect away from login page if already logged in
    if (isAuthPage && role) {
      const url = request.nextUrl.clone()
      if (role === 'employee') url.pathname = '/employee/goals'
      else if (role === 'manager') url.pathname = '/manager'
      else if (role === 'admin') url.pathname = '/admin'
      return NextResponse.redirect(url)
    }

    // Role-based route protection
    if (isEmployeeRoute && role !== 'employee') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin' : '/manager'
      return NextResponse.redirect(url)
    }
    
    if (isManagerRoute && role !== 'manager') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'admin' ? '/admin' : '/employee/goals'
      return NextResponse.redirect(url)
    }

    if (isAdminRoute && role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = role === 'manager' ? '/manager' : '/employee/goals'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
