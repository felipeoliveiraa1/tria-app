"use client"

import { useMemo } from 'react'

export default function AuthCodeErrorPage() {
  const params = useMemo(() => {
    if (typeof window === 'undefined') return {}
    const url = new URL(window.location.href)
    return {
      error: url.searchParams.get('error') || undefined,
      description: url.searchParams.get('description') || undefined,
    }
  }, [])

  const goLogin = () => {
    window.location.href = '/login'
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Erro de Autenticação</h1>
      <p className="text-muted-foreground mt-2">Ocorreu um erro ao processar o código de autenticação.</p>
      {(params.error || params.description) && (
        <div className="mt-4 p-4 rounded border text-sm">
          {params.error && (
            <p><strong>Erro:</strong> {params.error}</p>
          )}
          {params.description && (
            <p className="mt-1"><strong>Detalhes:</strong> {params.description}</p>
          )}
        </div>
      )}
      <div className="mt-6">
        <button onClick={goLogin} className="px-4 py-2 bg-black text-white rounded">
          Tentar novamente
        </button>
      </div>
    </div>
  )
}