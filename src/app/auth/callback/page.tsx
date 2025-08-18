"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    let unsub: { data: { subscription: { unsubscribe: () => void } } } | null = null

    const run = async () => {
      try {
        // 1) Se já houver sessão, redireciona
        const { data: sessionData } = await supabase.auth.getSession()
        if (sessionData.session) {
          router.replace('/dashboard')
          return
        }

        // 2) Ouvir evento de autenticação (caso a sessão seja criada em background)
        unsub = supabase.auth.onAuthStateChange((_event, session) => {
          if (session) {
            router.replace('/dashboard')
          }
        }) as any

        // 3) Tentar realizar o exchange do código (PKCE)
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (exchangeError) {
          console.error('Callback - exchange falhou:', exchangeError)
          const url = new URL('/auth/auth-code-error', window.location.origin)
          url.searchParams.set('error', exchangeError.name || 'exchange_failed')
          url.searchParams.set('description', exchangeError.message || 'Falha ao trocar código por sessão')
          router.replace(url.toString())
          return
        }

        // 4) Pequeno atraso para aguardar a sessão
        setTimeout(async () => {
          const { data: check } = await supabase.auth.getSession()
          if (!check.session) {
            // Verificar erros na URL
            const url = new URL(window.location.href)
            const oauthError = url.searchParams.get('error') || url.searchParams.get('error_description')
            if (oauthError) {
              console.error('Callback - erro OAuth na URL:', oauthError)
            }
            const errUrl = new URL('/auth/auth-code-error', window.location.origin)
            if (oauthError) {
              errUrl.searchParams.set('error', 'oauth_error')
              errUrl.searchParams.set('description', oauthError)
            }
            router.replace(errUrl.toString())
          }
        }, 1500)
      } catch (err) {
        console.error('Callback - erro inesperado:', err)
        router.replace('/auth/auth-code-error')
      }
    }

    run()

    return () => {
      try {
        unsub?.data?.subscription?.unsubscribe()
      } catch {}
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p>Finalizando login...</p>
      </div>
    </div>
  )
}


