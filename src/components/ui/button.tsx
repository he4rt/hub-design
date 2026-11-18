import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Slot } from 'radix-ui'
import './button.css'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  /** Disables the button and shows a spinner without changing its size or label. */
  loading?: boolean
  /** Render the child element (such as a router Link) with button styles. */
  asChild?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  asChild = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot.Root data-variant={variant} data-size={size} className={cn('ui-button', className)} {...props}>
        {children}
      </Slot.Root>
    )
  }

  return (
    <button
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn('ui-button', className)}
      {...props}
    >
      {loading && <span className="ui-button__spinner" aria-hidden />}
      {children}
    </button>
  )
}
