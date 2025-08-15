import * as React from 'react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', onCheckedChange, onChange, ...props }, ref) => (
    <input
      type="checkbox"
      ref={ref}
      className={`h-4 w-4 rounded border border-input text-primary focus:ring-2 focus:ring-ring ${className}`}
      onChange={(e) => {
        onCheckedChange?.(e.currentTarget.checked)
        onChange?.(e)
      }}
      {...props}
    />
  )
)

Checkbox.displayName = 'Checkbox'
