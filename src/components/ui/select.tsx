import React from 'react'

interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  children?: React.ReactNode
  className?: string
}

export const Select: React.FC<SelectProps> = ({ value, onValueChange, disabled, children, className='' }) => {
  return (
    <select value={value} onChange={(e)=>onValueChange?.(e.target.value)} disabled={disabled} className={`border rounded p-2 ${className}`}>
      {children}
    </select>
  )
}

export const SelectTrigger: React.FC<{children?: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <div className={`inline-flex items-center justify-between rounded-md border px-3 py-2 ${className}`}>{children}</div>
)
export const SelectContent: React.FC<{children?: React.ReactNode, className?: string}> = ({ children, className='' }) => (
  <div className={className}>{children}</div>
)
export const SelectItem: React.FC<{children?: React.ReactNode, value: string, className?: string}> = ({ children, value }) => (
  <option value={value}>{children}</option>
)
export const SelectValue: React.FC<{placeholder?: string}> = ({ placeholder }) => (
  <span className="text-muted-foreground">{placeholder}</span>
)
