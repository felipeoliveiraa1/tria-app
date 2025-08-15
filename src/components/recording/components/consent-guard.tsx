import React from 'react'

interface ConsentGuardProps {
  consented?: boolean
  children: React.ReactNode
}

export const ConsentGuard: React.FC<ConsentGuardProps> = ({ consented = true, children }) => {
  if (!consented) {
    return (
      <div className="p-4 border rounded-md text-sm text-muted-foreground">
        Permissão não concedida para gravação/transcrição.
      </div>
    )
  }
  return <>{children}</>
}
