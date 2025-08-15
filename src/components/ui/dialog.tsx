import React from 'react'
import { Button } from './button'

export const Dialog: React.FC<{open: boolean, onOpenChange?: (open:boolean)=>void, children: React.ReactNode}> = ({ open, children }) => {
  if (!open) return null
  return <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">{children}</div>
}
export const DialogContent: React.FC<{className?: string, children: React.ReactNode}> = ({ children, className='' }) => (
  <div className={`bg-background rounded-lg p-6 w-full max-w-lg ${className}`}>{children}</div>
)
export const DialogHeader: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <div className={`mb-4 ${className}`}>{children}</div>
)
export const DialogTitle: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>
)
export const DialogDescription: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <p className={`text-sm text-muted-foreground ${className}`}>{children}</p>
)
export const DialogFooter: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <div className={`mt-4 flex justify-end space-x-2 ${className}`}>{children}</div>
)
export { Button }
