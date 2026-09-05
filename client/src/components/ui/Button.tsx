import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/cn'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-on-accent hover:opacity-90',
        outline: 'border border-border bg-surface text-text hover:border-border-strong',
        ghost: 'bg-transparent text-muted hover:bg-surface-2 hover:text-text',
        danger: 'bg-transparent text-danger hover:bg-danger/10',
        subtle: 'bg-surface-2 text-muted hover:text-text',
      },
      size: {
        default: 'h-10 px-4',
        sm: 'h-8 px-3 text-xs',
        icon: 'h-9 w-9',
        'icon-sm': 'h-7 w-7',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

/**
 * `type` es "button" salvo que se pida otra cosa: el defecto de HTML es
 * "submit", así que el día que uno de estos entre en un <form> enviaría el
 * formulario sin que nadie lo hubiera pedido.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
