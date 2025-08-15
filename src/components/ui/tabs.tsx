import React from 'react'

export const Tabs: React.FC<{children: React.ReactNode, className?: string, defaultValue?: string, value?: string, onValueChange?: (v:string)=>void}> = ({ children, className='' }) => (
  <div className={className}>{children}</div>
)
export const TabsList: React.FC<{children: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <div className={`inline-flex items-center rounded-md bg-muted p-1 text-muted-foreground ${className}`}>{children}</div>
)
export const TabsTrigger: React.FC<{children: React.ReactNode, value: string, onClick?: ()=>void, className?: string}> = ({ children, onClick, className='' }) => (
  <button onClick={onClick} className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1 text-sm font-medium ring-offset-background transition-all hover:bg-background hover:text-foreground ${className}`}>{children}</button>
)
export const TabsContent: React.FC<{children: React.ReactNode, className?: string, value?: string}> = ({ children, className='' }) => (
  <div className={className}>{children}</div>
)
