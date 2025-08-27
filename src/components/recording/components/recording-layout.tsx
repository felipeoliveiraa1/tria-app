import { ReactNode } from "react"

interface RecordingLayoutProps {
  children: ReactNode
  topActions?: ReactNode
  consentGuard?: ReactNode
}

export function RecordingLayout({ children, topActions, consentGuard }: RecordingLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header com ações superiores */}
      {topActions && (
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="max-w-7xl mx-auto px-6 py-4">
            {topActions}
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Guarda de consentimento */}
        {consentGuard && (
          <div className="mb-6">
            {consentGuard}
          </div>
        )}

        {/* Grid de duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
          {children}
        </div>
      </div>
    </div>
  )
}
