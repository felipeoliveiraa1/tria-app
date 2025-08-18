import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            res.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // Heurística: se o Supabase ainda não conseguiu carregar a sessão,
    // mas os cookies sb-* estão presentes, permitimos a navegação
    // para evitar bloqueio indevido após o callback.
    const hasSbCookie = req.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.endsWith('-auth-token'))

    if (error) {
      console.log('Middleware - Erro ao verificar sessão:', error.message)
      return res
    }

    if (!session && !hasSbCookie && req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
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
