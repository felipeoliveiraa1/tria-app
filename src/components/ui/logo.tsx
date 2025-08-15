import React from 'react'

export const Logo: React.FC<{className?: string}> = ({ className='' }) => (
  <div className={`font-bold ${className}`}>TRIA</div>
)
