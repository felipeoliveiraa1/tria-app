import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // Temporariamente desabilitado para desenvolvimento
  console.log('Middleware - Temporariamente desabilitado para desenvolvimento')
  return NextResponse.next()
  
  // Código original comentado temporariamente
  /*
  const res = NextResponse.next()
  
  try {
    // Criar cliente Supabase no middleware
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            res.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            res.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )
    
    // Verificar sessão do usuário
    const {
      data: { session },
      error
    } = await supabase.auth.getSession()

    if (error) {
      console.log('Middleware - Erro ao verificar sessão:', error.message)
      // Em caso de erro, permitir acesso para evitar loops
      return res
    }

    // Se não estiver autenticado e tentar acessar o dashboard, redireciona para login
    if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
      console.log('Middleware - Usuário não autenticado, redirecionando para login')
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Se estiver autenticado e tentar acessar login/register, redireciona para dashboard
    if (session && (req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/register')) {
      console.log('Middleware - Usuário autenticado, redirecionando para dashboard')
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    return res
  } catch (error) {
    console.log('Middleware - Erro geral:', error)
    // Em caso de erro, permitir acesso para evitar loops
    return res
  }
  */
}

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/login', 
    '/register',
    '/((?!auth/callback|_next/static|_next/image|favicon.ico).*)',
  ],
}
