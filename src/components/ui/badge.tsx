import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import './badge.css'

type BadgeProps = ComponentProps<'span'> & {
  variant?: 'outline' | 'soft'
  /** Status pill; overrides the variant's colors. */
  tone?: 'neutral' | 'primary' | 'success' | 'warning' | 'danger'
  /** Monospace text, for code references such as `repo@3f9c2a1`. */
  mono?: boolean
}

/** Short inline label: Radix has no badge primitive. */
export function Badge({ variant = 'outline', tone, mono = false, className, ...props }: BadgeProps) {
  return (
    <span
      data-variant={variant}
      data-tone={tone}
      data-mono={mono || undefined}
      className={cn('ui-badge', className)}
      {...props}
    />
  )
}
