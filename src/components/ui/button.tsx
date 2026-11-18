import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { Slot } from 'radix-ui'
import './button.css'

type ButtonProps = ComponentProps<'button'> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  /** Render the child element (such as a router Link) with button styles. */
  asChild?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  asChild = false,
  className,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-variant={variant}
      data-size={size}
      className={cn('ui-button', className)}
      {...props}
    />
  )
}
