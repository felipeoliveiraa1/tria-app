import React, { forwardRef } from 'react'

interface ScrollAreaProps {
  className?: string
  children: React.ReactNode
}

export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className = '', children }, ref) => {
    return (
      <div 
        ref={ref}
        className={`overflow-auto ${className}`}
        style={{ scrollbarWidth: 'thin' }}
      >
        {children}
      </div>
    )
  }
)

ScrollArea.displayName = 'ScrollArea'
