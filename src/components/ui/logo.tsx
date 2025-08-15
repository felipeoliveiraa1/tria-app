import React from 'react'
import Image from 'next/image'

export const Logo: React.FC<{ className?: string; width?: number; height?: number }> = ({ className = '', width = 120, height = 28 }) => (
  <Image
    src="/logo-tria.png"
    alt="TRIA"
    width={width}
    height={height}
    priority
    className={className}
  />
)
