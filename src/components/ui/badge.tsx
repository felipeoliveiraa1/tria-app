import React from 'react'

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'outline'
  className?: string
  children: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className = '', 
  children 
}) => {
  const baseClasses = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/80',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'text-foreground border border-input bg-background hover:bg-accent hover:text-accent-foreground'
  }
  
  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  return (
    <div className={classes}>
      {children}
    </div>
  )
}
