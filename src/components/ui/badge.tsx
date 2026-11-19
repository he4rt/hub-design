import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './badge.css'

type BadgeProps = ComponentProps<'span'> & {
  /** `outline` and `soft` label things; `success`, `warning` and `danger` tell a status. */
  variant?: 'outline' | 'soft' | 'success' | 'warning' | 'danger'
  /** Monospace text, for code references such as `repo@3f9c2a1`. */
  mono?: boolean
}

/** Short inline label: Radix has no badge primitive. */
export function Badge({ variant = 'outline', mono = false, className, ...props }: BadgeProps) {
  return <span data-variant={variant} data-mono={mono || undefined} className={cn('ui-badge', className)} {...props} />
}
