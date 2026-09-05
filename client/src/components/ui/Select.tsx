import { forwardRef, type SelectHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-9 rounded-lg border border-border bg-surface px-2.5 text-sm text-text transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/40',
        className,
      )}
      {...props}
    />
  ),
)
Select.displayName = 'Select'
