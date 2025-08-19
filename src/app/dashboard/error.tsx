"use client"
import { useEffect } from "react"

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error)
  }, [error])

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-semibold">Ocorreu um erro no Dashboard</h2>
      <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md overflow-auto">
        {error.message}
        {error.stack ? "\n\n" + error.stack : null}
      </pre>
      <button onClick={() => reset()} className="px-4 py-2 rounded-md border">
        Tentar novamente
      </button>
    </div>
  )
}


