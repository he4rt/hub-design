import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './badge.css'

type BadgeProps = ComponentProps<'span'> & {
  /**
   * `tag` describes (stack, level, filter); `success`, `warning`, `info` and `neutral` tell a state;
   * `comp` is only for a competency; `count` is the count pill of navigation and headers.
   */
  variant?: 'tag' | 'success' | 'warning' | 'info' | 'neutral' | 'comp' | 'count'
  /** Monospace text, only for GitHub references such as `he4rt/loja#31`. */
  mono?: boolean
}

/** Status chip and tag of the design system: Radix has no badge primitive. */
export function Badge({ variant = 'tag', mono = false, className, ...props }: BadgeProps) {
  return <span data-variant={variant} data-mono={mono || undefined} className={cn('ui-badge', className)} {...props} />
}
