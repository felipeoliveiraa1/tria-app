"use client"
import { useEffect } from "react"

export default function PatientError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error("Patient page error:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-xl w-full text-center space-y-4">
        <h2 className="text-2xl font-semibold">Ocorreu um erro ao carregar a ficha</h2>
        <p className="text-sm text-muted-foreground">Tente atualizar a página. Se persistir, volte ao dashboard e selecione a consulta novamente.</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => reset()} className="px-4 py-2 rounded-md border">Tentar novamente</button>
        </div>
      </div>
    </div>
  )
}


