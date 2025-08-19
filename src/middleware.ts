import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  try {
    // Evitar chamadas ao Supabase no Edge Middleware
    const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))
    if (hasSbCookie && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return res
  } catch (error) {
    console.log('Middleware - Erro geral:', error)
    return res
  }
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/login', 
    '/register',
    '/((?!auth/callback|_next/static|_next/image|favicon.ico).*)',
  ],
}
