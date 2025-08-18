"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const finalizeOAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error) {
          console.error('Callback - erro ao obter sessão:', error)
        }

        // Se a sessão já existe, apenas seguir para o dashboard
        if (data.session) {
          router.replace('/dashboard')
          return
        }

        // Para PKCE, o Supabase processa automaticamente via detectSessionInUrl
        // Forçamos uma verificação de URL atual para capturar o código
        const { data: exchangeData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(window.location.href)
        if (exchangeError) {
          console.error('Callback - erro ao trocar código por sessão:', exchangeError)
          router.replace('/auth/auth-code-error')
          return
        }

        if (exchangeData?.session) {
          router.replace('/dashboard')
        } else {
          router.replace('/login')
        }
      } catch (err) {
        console.error('Callback - erro inesperado:', err)
        router.replace('/auth/auth-code-error')
      }
    }

    finalizeOAuth()
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


